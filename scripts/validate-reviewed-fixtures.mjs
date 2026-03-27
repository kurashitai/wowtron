import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const inputPath = args.input || 'data/midnight-reviewed-fixtures.json';

const file = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const fixtures = file.fixtures || [];

const findings = [];
let readyCount = 0;

for (const fixture of fixtures) {
  const missing = [];

  if (!fixture.id) missing.push('id');
  if (!fixture.bossName) missing.push('bossName');
  if (!Array.isArray(fixture.expectedTopSummaryIncludes) || fixture.expectedTopSummaryIncludes.length === 0) {
    missing.push('expectedTopSummaryIncludes');
  }

  if (!Array.isArray(fixture.expectedCauseChainIncludes)) missing.push('expectedCauseChainIncludes');
  if (!Array.isArray(fixture.expectedOwners)) missing.push('expectedOwners');
  if (!Array.isArray(fixture.bannedSummaryIncludes)) missing.push('bannedSummaryIncludes');

  const isReady = missing.length === 0;
  if (isReady) readyCount += 1;

  findings.push({
    id: fixture.id,
    bossName: fixture.bossName,
    status: isReady ? 'ready' : 'incomplete',
    missing,
  });
}

console.log(
  JSON.stringify(
    {
      input: inputPath,
      total: fixtures.length,
      readyCount,
      incompleteCount: fixtures.length - readyCount,
      findings,
    },
    null,
    2
  )
);
