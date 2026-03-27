import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const snapshotsPath = args.snapshots || 'data/midnight-calibration-snapshots.json';
const calibrationPath = args.calibration || 'data/midnight-calibration-results.json';
const outputPath = args.output || 'data/midnight-output-quality-review.json';
const platformDir = path.join(process.cwd(), 'data', 'platform-improvement', 'output-quality-reviews');

const snapshots = JSON.parse(await fs.readFile(snapshotsPath, 'utf8')).snapshots || [];
const calibration = JSON.parse(await fs.readFile(calibrationPath, 'utf8')).results || [];

const calibrationByFight = new Map(
  calibration.map((item) => [`${item.reportCode || item.code}:${item.fightId}:${item.bossName}`, item])
);

const reviews = snapshots.map((snapshot) => {
  const key = `${snapshot.reportCode}:${snapshot.fightId}:${snapshot.bossName}`;
  const result = calibrationByFight.get(key);
  const topInsight = snapshot.briefInsights?.[0];
  const commandBlocker = snapshot.commandView?.biggestBlocker;
  const causeChainCount = snapshot.causeChains?.length || 0;
  const actionabilitySignals = [
    Boolean(topInsight?.recommendation),
    Boolean(commandBlocker?.reason),
    Boolean(snapshot.assignmentPlanOverview?.recommendation),
  ].filter(Boolean).length;

  const payload = {
    biggestBlockerBelievable: Boolean(commandBlocker?.summary) && Boolean(commandBlocker?.owner),
    nextWipeBelievable: Boolean(snapshot.commandView?.mostLikelyNextWipe?.summary),
    topActionsActionable: actionabilitySignals >= 2,
    causeChainUseful: causeChainCount > 0,
    bossMemoryReady: Boolean(snapshot.phaseReadiness?.length),
    reliabilityHighlightsReady: Boolean(snapshot.players?.length),
    calibrationPassed: result?.passed ?? null,
    calibrationScore: result?.score ?? null,
    findings: result?.findings || [],
    topInsightSummary: topInsight?.summary || null,
  };

  return {
    key: `${snapshot.reportCode}__${snapshot.fightId}__${snapshot.bossName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    bossName: snapshot.bossName,
    reportCode: snapshot.reportCode,
    fightId: snapshot.fightId,
    source: 'heuristic_review',
    payload,
    reviewedAt: new Date().toISOString(),
  };
});

const summary = {
  total: reviews.length,
  believableBlockerRate: reviews.filter((review) => review.payload.biggestBlockerBelievable).length,
  believableNextWipeRate: reviews.filter((review) => review.payload.nextWipeBelievable).length,
  actionableRate: reviews.filter((review) => review.payload.topActionsActionable).length,
  causeChainUsefulRate: reviews.filter((review) => review.payload.causeChainUseful).length,
  memoryReadyRate: reviews.filter((review) => review.payload.bossMemoryReady).length,
  reliabilityReadyRate: reviews.filter((review) => review.payload.reliabilityHighlightsReady).length,
};

const payload = {
  generatedAt: new Date().toISOString(),
  summary,
  reviews,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
await fs.mkdir(platformDir, { recursive: true });
for (const review of reviews) {
  await fs.writeFile(path.join(platformDir, `${review.key}.json`), JSON.stringify(review, null, 2));
}

console.log(JSON.stringify({ output: outputPath, count: reviews.length }, null, 2));
