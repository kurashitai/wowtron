import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const clientId = process.env.WCL_CLIENT_ID;
const clientSecret = process.env.WCL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing WCL_CLIENT_ID or WCL_CLIENT_SECRET');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const inputPath = args.input || 'data/public-midnight-report-codes.json';
const outputPath = args.output || 'data/midnight-calibration-corpus.json';
const queuePath = args.queue || 'data/midnight-training-queue.json';
const cacheRoot = path.join(process.cwd(), '.wowtron-cache', 'public-midnight');
const localFightRecordDir = path.join(process.cwd(), 'data', 'platform-improvement', 'fight-records');
const reportCacheTtlMs = Number(args.reportCacheTtlMs || 1000 * 60 * 60 * 24 * 30);
const maxReports = Math.max(1, Number(args.maxReports || 5));

const midnightBosses = new Set([
  'Imperator Averzian',
  'Vorasius',
  'Fallen-King Salhadaar',
  'Vaelgor & Ezzorak',
  'Lightblinded Vanguard',
  'Crown of the Cosmos',
  'Chimaerus the Undreamt God',
  "Belo''ren, Child of Al''ar",
  'Midnight Falls',
  'Alleria',
  'Alleria Windrunner',
]);

function getCacheFile(namespace, key) {
  const hash = createHash('sha256').update(key).digest('hex');
  return path.join(cacheRoot, namespace, `${hash}.json`);
}

async function readCache(namespace, key, maxAgeMs) {
  try {
    const filePath = getCacheFile(namespace, key);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.createdAt || !('value' in parsed)) return null;
    if (parsed.value == null) return null;
    if (Date.now() - parsed.createdAt > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

async function writeCache(namespace, key, value) {
  const filePath = getCacheFile(namespace, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify({ createdAt: Date.now(), value }, null, 2));
}

async function getToken() {
  const response = await fetch('https://www.warcraftlogs.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function wclQuery(token, query, variables) {
  const response = await fetch('https://www.warcraftlogs.com/api/v2/client', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();
  if (response.status === 429 || data?.status === 429) {
    const error = new Error('WCL_RATE_LIMIT');
    error.code = 'WCL_RATE_LIMIT';
    throw error;
  }
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Unknown WCL GraphQL error');
  }
  return data.data;
}

async function fetchReportSummary(token, code) {
  const cached = await readCache('report-summary', code, reportCacheTtlMs);
  if (cached) return cached;

  const data = await wclQuery(token, `
    query($code: String!) {
      reportData {
        report(code: $code) {
          title
          fights {
            id
            name
            difficulty
            kill
            bossPercentage
            fightPercentage
            startTime
            endTime
          }
        }
      }
    }
  `, { code });

  const report = data?.reportData?.report;
  await writeCache('report-summary', code, report);
  return report;
}

async function readCachedReportFights(code) {
  const cached = await readCache('report-fights', code, Number.MAX_SAFE_INTEGER);
  if (!Array.isArray(cached)) return null;
  if (cached.length === 0) return [];
  if (typeof cached[0] === 'object') return cached;
  if (typeof cached[0] === 'string') {
    return cached.map((name, index) => ({
      id: -1 * (index + 1),
      name,
      difficulty: null,
      kill: null,
      bossPercentage: null,
      fightPercentage: null,
      startTime: null,
      endTime: null,
    }));
  }
  return null;
}

function normalizeFight(reportMeta, reportTitle, fight) {
  if (!fight?.name || !midnightBosses.has(fight.name)) return null;
  const durationSec =
    typeof fight.startTime === 'number' && typeof fight.endTime === 'number'
      ? Math.max(0, Math.floor((fight.endTime - fight.startTime) / 1000))
      : 0;
  const rawBossPercentage = fight.bossPercentage ?? fight.fightPercentage;
  const bossHPPercent = fight.kill
    ? 0
    : rawBossPercentage == null
      ? 100
      : Math.round((rawBossPercentage / 100) * 100) / 100;

  return {
    code: reportMeta.code,
    reportTitle: reportTitle || reportMeta.title,
    guildName: reportMeta.guildName,
    guildServerSlug: reportMeta.guildServerSlug,
    guildServerRegion: reportMeta.guildServerRegion,
    fightId: fight.id ?? null,
    bossName: fight.name,
    difficulty: fight.difficulty ?? null,
    kill: Boolean(fight.kill),
    durationSec,
    bossHPPercent,
    matchedBosses: reportMeta.matchedBosses || [],
    dataSource:
      typeof fight.id === 'number' && fight.id > 0 && typeof fight.kill === 'boolean'
        ? 'report_summary'
        : 'report_fights_cache',
  };
}

function dedupePulls(items) {
  const qualityWeight = {
    fight_record: 3,
    report_summary: 2,
    report_fights_cache: 1,
  };

  return Array.from(
    items.reduce((map, pull) => {
      const fightPart = pull.fightId == null ? 'unknown' : String(pull.fightId);
      const key = `${pull.code}:${fightPart}:${pull.bossName}:${pull.durationSec}:${pull.kill}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, pull);
        return map;
      }

      const existingWeight = qualityWeight[existing.dataSource] || 0;
      const nextWeight = qualityWeight[pull.dataSource] || 0;
      if (nextWeight >= existingWeight) {
        map.set(key, pull);
      }
      return map;
    }, new Map()).values()
  );
}

async function readLocalFightRecords() {
  try {
    const files = await fs.readdir(localFightRecordDir);
    const records = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          const raw = JSON.parse(await fs.readFile(path.join(localFightRecordDir, file), 'utf8'));
          if (!raw?.bossName || !midnightBosses.has(raw.bossName)) return null;
          return {
            code: raw.reportCode,
            reportTitle: raw.reportCode,
            guildName: 'local-fight-record',
            guildServerSlug: undefined,
            guildServerRegion: undefined,
            fightId: raw.fightId ?? null,
            bossName: raw.bossName,
            difficulty: raw.difficulty ?? null,
            kill: Boolean(raw.kill),
            durationSec: Number(raw.durationSec || 0),
            bossHPPercent: typeof raw.bossHPPercent === 'number' ? raw.bossHPPercent : 100,
            matchedBosses: [raw.bossName],
            dataSource: 'fight_record',
          };
        })
    );
    return records.filter(Boolean);
  } catch {
    return [];
  }
}

const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const token = await getToken();
let existingCorpus = null;
try {
  existingCorpus = JSON.parse(await fs.readFile(outputPath, 'utf8'));
} catch {
  existingCorpus = null;
}

const pulls = existingCorpus?.pulls || [];
const processedCodes = new Set((existingCorpus?.pulls || []).map((pull) => pull.code));
const pendingCodes = [];
const queueData = JSON.parse(await fs.readFile(queuePath, 'utf8'));
const queue = queueData.queue || [];
const localFightRecords = await readLocalFightRecords();
pulls.push(...localFightRecords);
const pendingByCode = input.reports.filter((reportMeta) => !processedCodes.has(reportMeta.code));
const selectedReports = pendingByCode.slice(0, maxReports);

for (const reportMeta of selectedReports) {
  try {
    let report = null;
    let usedCachedFallback = false;
    try {
      report = await fetchReportSummary(token, reportMeta.code);
    } catch (error) {
      if (error?.code === 'WCL_RATE_LIMIT') {
        const cachedFights = await readCachedReportFights(reportMeta.code);
        if (Array.isArray(cachedFights) && cachedFights.length > 0) {
          report = {
            title: reportMeta.title,
            fights: cachedFights,
          };
          usedCachedFallback = true;
        } else {
          pendingCodes.push({ code: reportMeta.code, reason: 'rate_limited' });
          break;
        }
      } else {
        throw error;
      }
    }

    if (!report?.fights) {
      pendingCodes.push({ code: reportMeta.code, reason: 'missing_fights' });
      continue;
    }

    const normalized = report.fights
      .map((fight) => normalizeFight(reportMeta, report?.title, fight))
      .filter(Boolean);

    pulls.push(...normalized);
    processedCodes.add(reportMeta.code);
    if (usedCachedFallback) {
      pendingCodes.push({ code: reportMeta.code, reason: 'cached_partial' });
    }
  } catch (error) {
    pendingCodes.push({ code: reportMeta.code, reason: 'unknown_error' });
  }
}

const dedupedPulls = dedupePulls(pulls);

const queueWithStatuses = queue.map((entry) => {
  const matchingPulls = dedupedPulls.filter(
    (pull) => pull.code === entry.code && pull.bossName === entry.bossName
  );
  const partial = matchingPulls.some((pull) => pull.dataSource === 'report_fights_cache');
  const status = matchingPulls.length === 0
    ? 'pending_fetch'
    : partial
      ? 'cached_partial'
      : 'ready_for_fixture';

  return {
    ...entry,
    status,
    notes:
      status === 'ready_for_fixture'
        ? 'Pulls extracted into the local calibration corpus.'
        : status === 'cached_partial'
          ? 'Boss exists in local cache, but full pull summary is still pending when rate limit clears.'
          : entry.notes,
  };
});

const byBoss = Object.fromEntries(
  Array.from(
    dedupedPulls.reduce((map, pull) => {
      const entry = map.get(pull.bossName) || [];
      entry.push(pull);
      map.set(pull.bossName, entry);
      return map;
    }, new Map()).entries()
  ).map(([bossName, bossPulls]) => [
    bossName,
    {
      totalPulls: bossPulls.length,
      kills: bossPulls.filter((pull) => pull.kill).length,
      wipes: bossPulls.filter((pull) => !pull.kill).length,
      bestWipeHP: bossPulls.filter((pull) => !pull.kill).reduce((best, pull) => Math.min(best, pull.bossHPPercent), 100),
      longestPullSec: bossPulls.reduce((best, pull) => Math.max(best, pull.durationSec), 0),
    },
  ])
);

const corpus = {
  generatedAt: new Date().toISOString(),
  reportCount: new Set(dedupedPulls.map((pull) => pull.code)).size,
  pullCount: dedupedPulls.length,
  completePullCount: dedupedPulls.filter((pull) => pull.dataSource === 'report_summary').length,
  cachedPartialPullCount: dedupedPulls.filter((pull) => pull.dataSource === 'report_fights_cache').length,
  processedCodes: Array.from(processedCodes),
  pendingCodes,
  bosses: byBoss,
  pulls: dedupedPulls,
};

await fs.writeFile(outputPath, JSON.stringify(corpus, null, 2));
await fs.writeFile(
  queuePath,
  JSON.stringify(
    {
      ...queueData,
      generatedAt: new Date().toISOString(),
      count: queueWithStatuses.length,
      queue: queueWithStatuses,
    },
    null,
    2
  )
);
console.log(JSON.stringify({
  output: outputPath,
  queue: queuePath,
  reportCount: corpus.reportCount,
  pullCount: corpus.pullCount,
  completePullCount: corpus.completePullCount,
  cachedPartialPullCount: corpus.cachedPartialPullCount,
  pendingCount: pendingCodes.length,
}, null, 2));

