import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const inputPath = args.input || 'data/midnight-calibration-corpus.json';
const outputPath = args.output || 'data/midnight-fixture-candidates.json';

const corpus = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const pulls = corpus.pulls || [];

const byBoss = pulls.reduce((map, pull) => {
  const entry = map.get(pull.bossName) || [];
  entry.push(pull);
  map.set(pull.bossName, entry);
  return map;
}, new Map());

const candidates = [];
const coverageReferences = [];

for (const [bossName, bossPulls] of byBoss.entries()) {
  const completePulls = bossPulls.filter((pull) => pull.dataSource !== 'report_fights_cache');
  const partialPulls = bossPulls.filter((pull) => pull.dataSource === 'report_fights_cache');

  if (completePulls.length === 0) {
    const sample = partialPulls[0];
    if (sample) {
      coverageReferences.push({
        id: `${bossName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sample.code}-${sample.fightId}`,
        bossName,
        code: sample.code,
        fightId: sample.fightId,
        guildName: sample.guildName,
        difficulty: sample.difficulty ?? null,
        dataSource: sample.dataSource,
        type: 'coverage_reference',
        reviewStatus: 'waiting_full_pull',
        notes: 'This boss is covered by local cache, but still needs a full WCL pull summary before it can become a real calibration fixture.',
      });
    }
    continue;
  }

  const wipes = completePulls.filter((pull) => !pull.kill).sort((a, b) => a.bossHPPercent - b.bossHPPercent || b.durationSec - a.durationSec);
  const kills = completePulls.filter((pull) => pull.kill).sort((a, b) => b.durationSec - a.durationSec);
  const longestWipe = [...wipes].sort((a, b) => b.durationSec - a.durationSec)[0];
  const bestWipe = wipes[0];
  const firstKill = kills[0];

  const selected = [bestWipe, longestWipe, firstKill].filter(Boolean);
  const deduped = Array.from(new Map(selected.map((pull) => [`${pull.code}:${pull.fightId}`, pull])).values());

  for (const pull of deduped) {
    candidates.push({
      id: `${bossName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${pull.code}-${pull.fightId}`,
      bossName,
      code: pull.code,
      fightId: pull.fightId,
      guildName: pull.guildName,
      difficulty: pull.difficulty ?? null,
      type: pull.kill ? 'kill_reference' : 'wipe_reference',
      durationSec: pull.durationSec,
      bossHPPercent: pull.bossHPPercent,
      dataSource: pull.dataSource,
      reviewStatus: 'pending',
      expectedTopSummaryIncludes: [],
      expectedCauseChainIncludes: [],
      expectedOwners: [],
      bannedSummaryIncludes: [],
      notes: pull.kill
        ? 'Use this as a success reference for what a stable kill pull looks like.'
        : 'Use this as a wipe reference and fill the expected diagnosis after manual review.',
    });
  }
}

await fs.writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: candidates.length,
  coverageCount: coverageReferences.length,
  candidates,
  coverageReferences,
}, null, 2));

console.log(JSON.stringify({
  output: outputPath,
  count: candidates.length,
  coverageCount: coverageReferences.length,
}, null, 2));
