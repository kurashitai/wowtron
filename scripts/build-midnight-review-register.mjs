import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const fixturesPath = args.fixtures || 'data/midnight-reviewed-fixtures.json';
const calibrationPath = args.calibration || 'data/midnight-calibration-results.json';
const outputPath = args.output || 'data/midnight-calibration-review-register.json';
const platformDir = path.join(process.cwd(), 'data', 'platform-improvement', 'calibration-reviews');

const fixturesData = JSON.parse(await fs.readFile(fixturesPath, 'utf8'));
const calibrationData = JSON.parse(await fs.readFile(calibrationPath, 'utf8'));
const results = calibrationData.results || [];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const reviews = (fixturesData.fixtures || []).map((fixture) => {
  const result = results.find(
    (item) =>
      item.reportCode === fixture.code &&
      item.fightId === fixture.fightId &&
      item.bossName === fixture.bossName
  );

  return {
    key: `${fixture.code}__${fixture.fightId}__${slugify(fixture.bossName)}`,
    bossName: fixture.bossName,
    reportCode: fixture.code,
    fightId: fixture.fightId,
    fixtureType: fixture.type,
    expected: {
      expectedTopSummaryIncludes: fixture.expectedTopSummaryIncludes || [],
      expectedCauseChainIncludes: fixture.expectedCauseChainIncludes || [],
      expectedOwners: fixture.expectedOwners || [],
      bannedSummaryIncludes: fixture.bannedSummaryIncludes || [],
      reviewerNotes: fixture.reviewerNotes || '',
    },
    actual: result
      ? {
          score: result.score,
          findings: result.findings || [],
        }
      : undefined,
    passed: result?.passed,
    failureReason: result?.passed ? undefined : (result?.findings || []).join(' | '),
    tags: result?.passed ? ['reviewed_fixture', 'passing'] : ['reviewed_fixture', 'needs_attention'],
    reviewedAt: fixturesData.generatedAt || calibrationData.generatedAt || new Date().toISOString(),
    source: 'reviewed_fixture',
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  count: reviews.length,
  passed: reviews.filter((review) => review.passed).length,
  failed: reviews.filter((review) => review.passed === false).length,
  reviews,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
await fs.mkdir(platformDir, { recursive: true });
for (const review of reviews) {
  await fs.writeFile(path.join(platformDir, `${review.key}.json`), JSON.stringify(review, null, 2));
}

console.log(JSON.stringify({ output: outputPath, count: reviews.length }, null, 2));
