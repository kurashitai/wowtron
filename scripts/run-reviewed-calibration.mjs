import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const fixturesPath = args.fixtures || 'data/midnight-reviewed-fixtures.json';
const snapshotsPath = args.snapshots || 'data/midnight-calibration-snapshots.json';
const outputPath = args.output || 'data/midnight-calibration-results.json';

function containsAny(haystacks, needles) {
  const lowerHaystacks = haystacks.map((value) => String(value).toLowerCase());
  return needles.some((needle) =>
    lowerHaystacks.some((value) => value.includes(String(needle).toLowerCase()))
  );
}

function normalizeMatchValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function calibrateSnapshot(snapshot, fixture) {
  const findings = [];
  let score = 100;

  const topSummaries = (snapshot.briefInsights || []).slice(0, 3).map((insight) => insight.summary);
  const causeChains = snapshot.causeChains || [];
  const owners = (snapshot.briefInsights || []).slice(0, 3).map((insight) => insight.owner);

  if (!containsAny(topSummaries, fixture.expectedTopSummaryIncludes || [])) {
    score -= 40;
    findings.push('Top brief insights missed the expected diagnosis.');
  }

  if ((fixture.expectedCauseChainIncludes || []).length > 0 && !containsAny(causeChains, fixture.expectedCauseChainIncludes)) {
    score -= 25;
    findings.push('Cause chain did not include the expected wipe story.');
  }

  if ((fixture.expectedOwners || []).length > 0 && !containsAny(owners, fixture.expectedOwners)) {
    score -= 20;
    findings.push('Top insights did not identify the expected owner.');
  }

  if ((fixture.bannedSummaryIncludes || []).length > 0 && containsAny(topSummaries, fixture.bannedSummaryIncludes)) {
    score -= 20;
    findings.push('Top insights included a banned or misleading summary.');
  }

  return {
    fixtureId: fixture.id,
    bossName: fixture.bossName,
    code: fixture.code,
    fightId: fixture.fightId,
    score: Math.max(0, score),
    passed: score >= 70,
    findings,
  };
}

const fixturesFile = JSON.parse(await fs.readFile(fixturesPath, 'utf8'));
const snapshotsFile = JSON.parse(await fs.readFile(snapshotsPath, 'utf8'));

const fixtures = (fixturesFile.fixtures || []).filter((fixture) => fixture.status !== 'needs_review');
const snapshots = snapshotsFile.snapshots || [];

const results = fixtures.map((fixture) => {
  const fixtureBossName = normalizeMatchValue(fixture.bossName);
  const fixtureFightId = normalizeMatchValue(fixture.fightId);
  const fixtureCode = normalizeMatchValue(fixture.code ?? fixture.reportCode);

  const snapshot = snapshots.find(
    (item) =>
      normalizeMatchValue(item.bossName) === fixtureBossName &&
      normalizeMatchValue(item.fightId) === fixtureFightId &&
      normalizeMatchValue(item.reportCode ?? item.code) === fixtureCode
  );

  if (!snapshot) {
    return {
      fixtureId: fixture.id,
      bossName: fixture.bossName,
      code: fixture.code,
      fightId: fixture.fightId,
      score: 0,
      passed: false,
      findings: ['No matching snapshot found for this reviewed fixture.'],
    };
  }

  return calibrateSnapshot(snapshot, fixture);
});

const summary = {
  generatedAt: new Date().toISOString(),
  fixturesPath,
  snapshotsPath,
  total: results.length,
  passed: results.filter((item) => item.passed).length,
  failed: results.filter((item) => !item.passed).length,
  averageScore: results.length > 0
    ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length)
    : 0,
};

const groupedFailures = results
  .filter((result) => !result.passed)
  .map((result) => ({
    bossName: result.bossName,
    fightId: result.fightId,
    code: result.code,
    findings: result.findings,
  }));

const payload = {
  summary,
  results,
  groupedFailures,
};

await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ output: outputPath, ...summary }, null, 2));
