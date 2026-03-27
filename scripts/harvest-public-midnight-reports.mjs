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

const configPath = args.config || 'data/public-midnight-guilds.example.json';
const outputPath = args.output || 'data/public-midnight-report-codes.json';
const cacheRoot = path.join(process.cwd(), '.wowtron-cache', 'public-midnight');
const reportCacheTtlMs = Number(args.reportCacheTtlMs || 1000 * 60 * 60 * 24 * 30);
const listCacheTtlMs = Number(args.listCacheTtlMs || 1000 * 60 * 60 * 12);

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
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Unknown WCL GraphQL error');
  }
  return data.data;
}

const REPORTS_QUERY = `
  query(
    $guildName: String,
    $guildServerSlug: String,
    $guildServerRegion: String,
    $zoneID: Int,
    $gameZoneID: Int,
    $startTime: Float,
    $endTime: Float,
    $page: Int,
    $limit: Int
  ) {
    reportData {
      reports(
        guildName: $guildName,
        guildServerSlug: $guildServerSlug,
        guildServerRegion: $guildServerRegion,
        zoneID: $zoneID,
        gameZoneID: $gameZoneID,
        startTime: $startTime,
        endTime: $endTime,
        page: $page,
        limit: $limit
      ) {
        data {
          code
          title
          startTime
          endTime
        }
        total
        per_page
        current_page
        last_page
        has_more_pages
      }
    }
  }
`;

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const token = await getToken();
const results = [];
const midnightBosses = new Set([
  'Imperator Averzian',
  'Vorasius',
  'Fallen-King Salhadaar',
  'Vaelgor & Ezzorak',
  'Lightblinded Vanguard',
  'Crown of the Cosmos',
  'Chimaerus the Undreamt God',
  "Belo'ren, Child of Al'ar",
  'Midnight Falls',
  'Alleria',
  'Alleria Windrunner',
]);

async function fetchReportFights(code) {
  const cached = await readCache('report-fights', code, reportCacheTtlMs);
  if (Array.isArray(cached) && cached.length > 0 && typeof cached[0] === 'object') {
    return cached;
  }
  if (Array.isArray(cached) && cached.length > 0 && typeof cached[0] === 'string') {
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

  const data = await wclQuery(token, `
    query($code: String!) {
      reportData {
        report(code: $code) {
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

  const fights = (data?.reportData?.report?.fights || [])
    .filter((fight) => fight?.name)
    .map((fight) => ({
      id: fight.id ?? null,
      name: fight.name,
      difficulty: fight.difficulty ?? null,
      kill: typeof fight.kill === 'boolean' ? fight.kill : null,
      bossPercentage: fight.bossPercentage ?? null,
      fightPercentage: fight.fightPercentage ?? null,
      startTime: fight.startTime ?? null,
      endTime: fight.endTime ?? null,
    }));
  await writeCache('report-fights', code, fights);
  return fights;
}

for (const source of config.sources || []) {
  let page = 1;
  const limit = source.limit || 25;
  const maxPages = source.maxPages || 1;

  while (true) {
    const listCacheKey = JSON.stringify({
      guildName: source.guildName,
      guildServerSlug: source.guildServerSlug,
      guildServerRegion: source.guildServerRegion,
      zoneID: source.zoneID ?? null,
      gameZoneID: source.gameZoneID ?? null,
      startTime: source.startTime ?? null,
      endTime: source.endTime ?? null,
      page,
      limit,
    });

    let data = await readCache('report-lists', listCacheKey, listCacheTtlMs);
    if (!data) {
      data = await wclQuery(token, REPORTS_QUERY, {
        guildName: source.guildName,
        guildServerSlug: source.guildServerSlug,
        guildServerRegion: source.guildServerRegion,
        zoneID: source.zoneID ?? null,
        gameZoneID: source.gameZoneID ?? null,
        startTime: source.startTime ?? null,
        endTime: source.endTime ?? null,
        page,
        limit,
      });
      await writeCache('report-lists', listCacheKey, data);
    }

    const pageData = data.reportData.reports;
    const reports = pageData?.data || [];

    for (const report of reports) {
      const fights = await fetchReportFights(report.code);
      const matchedBosses = Array.from(
        new Set(
          fights
            .map((fight) => fight?.name)
            .filter((bossName) => midnightBosses.has(bossName))
        )
      );
      if (matchedBosses.length === 0) continue;

      results.push({
        guildName: source.guildName,
        guildServerSlug: source.guildServerSlug,
        guildServerRegion: source.guildServerRegion,
        zoneID: source.zoneID ?? null,
        gameZoneID: source.gameZoneID ?? null,
        code: report.code,
        title: report.title,
        startTime: report.startTime,
        endTime: report.endTime,
        matchedBosses,
      });
    }

    if (!pageData?.has_more_pages || page >= maxPages) break;
    page += 1;
  }
}

const unique = Array.from(
  new Map(results.map((item) => [item.code, item])).values()
);

await fs.mkdir('data', { recursive: true });
await fs.writeFile(outputPath, JSON.stringify({ count: unique.length, reports: unique }, null, 2));

console.log(JSON.stringify({ count: unique.length, output: outputPath }, null, 2));
