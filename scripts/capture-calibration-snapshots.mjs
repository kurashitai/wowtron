import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const fixturesPath = args.fixtures || 'data/midnight-reviewed-fixtures.json';
const outputPath = args.output || 'data/midnight-calibration-snapshots.json';
const baseUrl = args.baseUrl || 'http://localhost:3000';

async function fetchCalibrationSnapshot(baseUrlValue, code, fightId) {
  const url = new URL('/api/calibration', baseUrlValue);
  url.searchParams.set('action', 'snapshot');
  url.searchParams.set('code', code);
  url.searchParams.set('fightId', String(fightId));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch calibration snapshot for ${code}:${fightId} - ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.snapshot) {
    throw new Error(`Calibration snapshot missing for ${code}:${fightId}`);
  }

  return payload.snapshot;
}

const fixturesFile = JSON.parse(await fs.readFile(fixturesPath, 'utf8'));
const fixtures = fixturesFile.fixtures || [];

const snapshots = [];
const failures = [];

for (const fixture of fixtures) {
  try {
    const snapshot = await fetchCalibrationSnapshot(baseUrl, fixture.code, fixture.fightId);
    snapshots.push(snapshot);
  } catch (error) {
    failures.push({
      fixtureId: fixture.id,
      bossName: fixture.bossName,
      code: fixture.code,
      fightId: fixture.fightId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const payload = {
  exportedAt: new Date().toISOString(),
  count: snapshots.length,
  snapshots,
  failures,
};

await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ output: outputPath, count: snapshots.length, failureCount: failures.length }, null, 2));
