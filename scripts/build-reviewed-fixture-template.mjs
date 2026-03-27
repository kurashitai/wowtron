import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const inputPath = args.input || 'data/midnight-fixture-candidates.json';
const outputPath = args.output || 'data/midnight-reviewed-fixtures.json';

const candidateFile = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const candidates = candidateFile.candidates || [];

const reviewedFixtures = candidates.map((candidate, index) => ({
  id: candidate.id,
  bossName: candidate.bossName,
  code: candidate.code,
  fightId: candidate.fightId,
  guildName: candidate.guildName,
  type: candidate.type,
  reviewPriority: index + 1,
  status: 'needs_review',
  expectedTopSummaryIncludes: [],
  expectedCauseChainIncludes: [],
  expectedOwners: [],
  bannedSummaryIncludes: [],
  reviewerNotes: candidate.type === 'kill_reference'
    ? 'Describe what success looked like and what the analyzer should avoid overblaming.'
    : 'Describe the real wipe cause, the right owner, and what the analyzer should have highlighted.',
}));

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: reviewedFixtures.length,
      fixtures: reviewedFixtures,
    },
    null,
    2
  )
);

console.log(JSON.stringify({ output: outputPath, count: reviewedFixtures.length }, null, 2));
