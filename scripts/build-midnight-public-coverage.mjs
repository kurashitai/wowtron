import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const inputPath = args.input || 'data/midnight-calibration-corpus.json';
const outputPath = args.output || 'data/midnight-public-coverage.json';
const platformDir = path.join(process.cwd(), 'data', 'platform-improvement', 'coverage-rollups');

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getPhaseBand(pull) {
  if (pull.kill) return 'kill';
  const hp = typeof pull.bossHPPercent === 'number' ? pull.bossHPPercent : 100;
  if (hp > 70) return 'first_phase_wipe';
  if (hp > 30) return 'late_phase_wipe';
  return 'final_phase_wipe';
}

function hasGoodAssignmentSignal(pull) {
  return pull.dataSource === 'report_summary' && (pull.kill || pull.durationSec >= 180);
}

function hasPoorDataQuality(pull) {
  return pull.dataSource !== 'report_summary' || pull.fightId == null;
}

const corpus = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const bossMap = new Map();

for (const pull of corpus.pulls || []) {
  const existing = bossMap.get(pull.bossName) || {
    bossName: pull.bossName,
    zone: 'Midnight',
    totalReports: 0,
    totalPulls: 0,
    wipes: 0,
    kills: 0,
    firstPhaseWipes: 0,
    latePhaseWipes: 0,
    finalPhaseWipes: 0,
    goodAssignmentSignal: 0,
    poorDataQuality: 0,
    bestWipeHP: 100,
    longestPullSec: 0,
    reportCodes: new Set(),
  };

  existing.totalPulls += 1;
  existing.reportCodes.add(pull.code);
  existing.longestPullSec = Math.max(existing.longestPullSec, pull.durationSec || 0);

  if (pull.kill) {
    existing.kills += 1;
  } else {
    existing.wipes += 1;
    existing.bestWipeHP = Math.min(existing.bestWipeHP, pull.bossHPPercent ?? 100);
  }

  switch (getPhaseBand(pull)) {
    case 'first_phase_wipe':
      existing.firstPhaseWipes += 1;
      break;
    case 'late_phase_wipe':
      existing.latePhaseWipes += 1;
      break;
    case 'final_phase_wipe':
      existing.finalPhaseWipes += 1;
      break;
    default:
      break;
  }

  if (hasGoodAssignmentSignal(pull)) {
    existing.goodAssignmentSignal += 1;
  }
  if (hasPoorDataQuality(pull)) {
    existing.poorDataQuality += 1;
  }

  bossMap.set(pull.bossName, existing);
}

const bosses = Array.from(bossMap.values())
  .map((entry) => ({
    ...entry,
    totalReports: entry.reportCodes.size,
    reportCodes: Array.from(entry.reportCodes),
  }))
  .sort((a, b) => b.totalPulls - a.totalPulls);

const payload = {
  generatedAt: new Date().toISOString(),
  source: inputPath,
  bossCount: bosses.length,
  reportCount: corpus.reportCount || new Set((corpus.pulls || []).map((pull) => pull.code)).size,
  pullCount: corpus.pullCount || (corpus.pulls || []).length,
  bosses,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
await fs.mkdir(platformDir, { recursive: true });
await fs.writeFile(
  path.join(platformDir, 'midnight_public__summary.json'),
  JSON.stringify(
    {
      key: 'midnight_public__summary',
      scope: 'midnight_public',
      zone: 'Midnight',
      payload,
      generatedAt: payload.generatedAt,
    },
    null,
    2
  )
);

for (const boss of bosses) {
  await fs.writeFile(
    path.join(platformDir, `midnight_public__${slugify(boss.bossName)}.json`),
    JSON.stringify(
      {
        key: `midnight_public__${slugify(boss.bossName)}`,
        scope: 'midnight_public',
        bossName: boss.bossName,
        zone: 'Midnight',
        payload: boss,
        generatedAt: payload.generatedAt,
      },
      null,
      2
    )
  );
}

console.log(JSON.stringify({ output: outputPath, bossCount: bosses.length, pullCount: payload.pullCount }, null, 2));
