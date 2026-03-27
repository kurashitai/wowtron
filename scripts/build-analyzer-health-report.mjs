import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const calibrationPath = args.calibration || 'data/midnight-calibration-results.json';
const coveragePath = args.coverage || 'data/midnight-public-coverage.json';
const gapsPath = args.gaps || 'data/midnight-rulepack-gap-register.json';
const outputQualityPath = args.outputQuality || 'data/midnight-output-quality-review.json';
const runsDir = args.runsDir || 'data/platform-improvement/analyzer-runs';
const outputPath = args.output || 'data/midnight-analyzer-health.json';
const platformDir = path.join(process.cwd(), 'data', 'platform-improvement', 'analyzer-health-snapshots');

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function collectTopThemes(results) {
  const counts = new Map();
  for (const result of results) {
    for (const finding of result.findings || []) {
      const key = String(finding).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

const calibration = JSON.parse(await fs.readFile(calibrationPath, 'utf8'));
const coverage = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
const gaps = JSON.parse(await fs.readFile(gapsPath, 'utf8'));
const outputQuality = JSON.parse(await fs.readFile(outputQualityPath, 'utf8'));
const runFiles = await fs.readdir(runsDir);
const runs = await Promise.all(
  runFiles
    .filter((file) => file.endsWith('.json'))
    .map((file) => fs.readFile(path.join(runsDir, file), 'utf8').then((raw) => JSON.parse(raw)))
);

const calibrationSummary = calibration.summary || {};
const passRate = calibrationSummary.total ? (calibrationSummary.passed / calibrationSummary.total) * 100 : 0;
const averageScore = calibrationSummary.averageScore || average((calibration.results || []).map((result) => result.score || 0));
const topFailureThemes = collectTopThemes((calibration.results || []).filter((result) => !result.passed));

const snapshotQuality = {
  totalRuns: runs.length,
  commandViewRate: runs.filter((run) => run.snapshotQuality?.hasCommandView).length,
  phaseReadinessRate: runs.filter((run) => run.snapshotQuality?.hasPhaseReadiness).length,
  planOverviewRate: runs.filter((run) => run.snapshotQuality?.hasAssignmentPlanOverview).length,
  causeChainRate: runs.filter((run) => run.snapshotQuality?.hasCauseChain).length,
  coachingRate: runs.filter((run) => run.snapshotQuality?.hasRoleCoaching).length,
  reliabilityRate: runs.filter((run) => run.snapshotQuality?.hasReliabilityEntries).length,
};

const bossHealth = (coverage.bosses || []).map((boss) => {
  const gap = (gaps.bosses || []).find((item) => item.bossName === boss.bossName);
  const relatedRuns = runs.filter((run) => run.bossName === boss.bossName);
  const relatedCalibration = (calibration.results || []).filter((result) => result.bossName === boss.bossName);
  const relatedOutput = (outputQuality.reviews || []).filter((review) => review.bossName === boss.bossName);
  return {
    bossName: boss.bossName,
    coveragePulls: boss.totalPulls,
    kills: boss.kills,
    goodAssignmentSignal: boss.goodAssignmentSignal,
    poorDataQuality: boss.poorDataQuality,
    gapStatus: gap?.status || 'needs_data',
    calibrationPassRate:
      relatedCalibration.length > 0
        ? Math.round((relatedCalibration.filter((result) => result.passed).length / relatedCalibration.length) * 100)
        : 0,
    averageCalibrationScore: Math.round(average(relatedCalibration.map((result) => result.score || 0))),
    analyzerRuns: relatedRuns.length,
    outputActionableRate:
      relatedOutput.length > 0
        ? Math.round((relatedOutput.filter((review) => review.payload?.topActionsActionable).length / relatedOutput.length) * 100)
        : 0,
    nextPriority: gap?.payload?.nextPriority || 'Collect more reviewed examples and stabilize the rule pack.',
  };
});

const priorities = bossHealth
  .slice()
  .sort((a, b) => {
    if (a.gapStatus === b.gapStatus) {
      return (a.averageCalibrationScore || 0) - (b.averageCalibrationScore || 0);
    }
    const order = ['needs_data', 'ready_for_rules', 'in_progress', 'stable'];
    return order.indexOf(a.gapStatus) - order.indexOf(b.gapStatus);
  })
  .slice(0, 5);

const payload = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalFixtures: calibrationSummary.total || 0,
    passedFixtures: calibrationSummary.passed || 0,
    failedFixtures: calibrationSummary.failed || 0,
    fixturePassRate: Math.round(passRate * 10) / 10,
    averageCalibrationScore: Math.round(averageScore * 10) / 10,
    reviewedPulls: outputQuality.reviews?.length || 0,
    coverageBosses: coverage.bosses?.length || 0,
    analyzerRuns: runs.length,
  },
  snapshotQuality,
  topFailureThemes,
  priorities,
  bossHealth,
  outputQualitySummary: outputQuality.summary || {},
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
await fs.mkdir(platformDir, { recursive: true });
await fs.writeFile(
  path.join(platformDir, 'midnight_analyzer_health.json'),
  JSON.stringify(
    {
      key: 'midnight_analyzer_health',
      scope: 'midnight_analyzer_health',
      payload,
      generatedAt: payload.generatedAt,
    },
    null,
    2
  )
);

console.log(JSON.stringify({ output: outputPath, bossCount: bossHealth.length, runCount: runs.length }, null, 2));
