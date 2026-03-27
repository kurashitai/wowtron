import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const bosses = (args.bosses || 'Alleria Windrunner,Chimaerus the Undreamt God')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const corpusPath = args.input || 'data/midnight-calibration-corpus.json';
const outputPath = args.output || 'data/mqd-hydration-report.json';
const baseUrl = args.baseUrl || 'http://localhost:3000';
const perBossLimit = Math.max(1, Number(args.perBossLimit || 5));
const delayMs = Math.max(0, Number(args.delayMs || 750));
const knownLocalPath = 'data/platform-improvement/fight-records';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortPulls(a, b) {
  if ((b.durationSec || 0) !== (a.durationSec || 0)) return (b.durationSec || 0) - (a.durationSec || 0);
  if ((a.bossHPPercent ?? 100) !== (b.bossHPPercent ?? 100)) return (a.bossHPPercent ?? 100) - (b.bossHPPercent ?? 100);
  return String(a.code).localeCompare(String(b.code));
}

async function readKnownFightKeys() {
  try {
    const files = await fs.readdir(knownLocalPath);
    return new Set(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace(/\.json$/i, ''))
    );
  } catch {
    return new Set();
  }
}

const corpus = JSON.parse(await fs.readFile(corpusPath, 'utf8'));
const knownFightKeys = await readKnownFightKeys();

const candidates = bosses.flatMap((bossName) => {
  const pulls = (corpus.pulls || [])
    .filter((pull) => pull.bossName === bossName)
    .filter((pull) => pull.fightId != null)
    .filter((pull) => !knownFightKeys.has(`${pull.code}__${pull.fightId}`))
    .sort(sortPulls);

  const deduped = Array.from(
    new Map(
      pulls.map((pull) => [`${pull.code}:${pull.fightId}`, pull])
    ).values()
  );

  return deduped.slice(0, perBossLimit);
});

const results = [];

for (const candidate of candidates) {
  const url = new URL('/api/wcl', baseUrl);
  url.searchParams.set('action', 'fight');
  url.searchParams.set('code', String(candidate.code));
  url.searchParams.set('fightId', String(candidate.fightId));
  url.searchParams.set('refresh', 'true');

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      results.push({
        bossName: candidate.bossName,
        code: candidate.code,
        fightId: candidate.fightId,
        status: 'failed',
        httpStatus: response.status,
        error: text.slice(0, 500),
      });
    } else {
      const payload = await response.json();
      const fight = payload.fight || {};
      results.push({
        bossName: candidate.bossName,
        code: candidate.code,
        fightId: candidate.fightId,
        status: 'hydrated',
        difficulty: fight.difficulty || null,
        duration: fight.duration || 0,
        kill: Boolean(fight.kill),
        bossHPPercent: fight.bossHPPercent ?? null,
        players: Array.isArray(fight.players) ? fight.players.length : 0,
        timelineEvents: Array.isArray(fight.timeline) ? fight.timeline.length : 0,
      });
    }
  } catch (error) {
    results.push({
      bossName: candidate.bossName,
      code: candidate.code,
      fightId: candidate.fightId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  if (delayMs > 0) {
    await sleep(delayMs);
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  bosses,
  requested: candidates.length,
  hydrated: results.filter((item) => item.status === 'hydrated').length,
  failed: results.filter((item) => item.status === 'failed').length,
  results,
};

await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ output: outputPath, requested: candidates.length, hydrated: payload.hydrated, failed: payload.failed }, null, 2));
