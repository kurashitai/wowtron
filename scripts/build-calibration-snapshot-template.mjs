import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const fixturesPath = args.fixtures || 'data/midnight-reviewed-fixtures.json';
const outputPath = args.output || 'data/midnight-calibration-snapshots.json';

const fixturesFile = JSON.parse(await fs.readFile(fixturesPath, 'utf8'));
const fixtures = fixturesFile.fixtures || [];

const template = {
  exportedAt: new Date().toISOString(),
  count: 0,
  snapshots: [],
  neededSnapshots: fixtures.map((fixture) => ({
    bossName: fixture.bossName,
    code: fixture.code,
    fightId: fixture.fightId,
    fixtureId: fixture.id,
    status: 'capture_from_wowtron',
  })),
};

await fs.writeFile(outputPath, JSON.stringify(template, null, 2));
console.log(JSON.stringify({ output: outputPath, neededCount: template.neededSnapshots.length }, null, 2));
