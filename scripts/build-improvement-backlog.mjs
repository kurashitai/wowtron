import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const healthPath = args.health || 'data/midnight-analyzer-health.json';
const gapsPath = args.gaps || 'data/midnight-rulepack-gap-register.json';
const outputQualityPath = args.outputQuality || 'data/midnight-output-quality-review.json';
const outputPath = args.output || 'data/midnight-priority-backlog.json';

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const health = JSON.parse(await fs.readFile(healthPath, 'utf8'));
const gaps = JSON.parse(await fs.readFile(gapsPath, 'utf8'));
const outputQuality = JSON.parse(await fs.readFile(outputQualityPath, 'utf8'));

const gapByBoss = new Map((gaps.bosses || []).map((entry) => [entry.bossName, entry]));
const actionableRateByBoss = new Map();
for (const review of outputQuality.reviews || []) {
  const boss = review.bossName;
  if (!boss) continue;
  const bucket = actionableRateByBoss.get(boss) || { total: 0, actionable: 0 };
  bucket.total += 1;
  if (review.payload?.topActionsActionable) bucket.actionable += 1;
  actionableRateByBoss.set(boss, bucket);
}

const items = [];

for (const boss of health.bossHealth || []) {
  const gap = gapByBoss.get(boss.bossName);
  const actionability = actionableRateByBoss.get(boss.bossName) || { total: 0, actionable: 0 };
  const actionabilityRate = actionability.total > 0 ? Math.round((actionability.actionable / actionability.total) * 100) : 0;
  const poorQualityPenalty = Number(boss.poorDataQuality || 0);
  const calibrationPenalty = Math.max(0, 100 - Number(boss.averageCalibrationScore || 0));
  const gapPenalty =
    boss.gapStatus === 'needs_data'
      ? 50
      : boss.gapStatus === 'ready_for_rules'
        ? 35
        : boss.gapStatus === 'in_progress'
          ? 20
          : 5;

  const baseScore = gapPenalty + calibrationPenalty + poorQualityPenalty + Math.max(0, 100 - actionabilityRate);

  if (boss.gapStatus !== 'stable') {
    items.push({
      key: `${slugify(boss.bossName)}__rulepack_depth`,
      category: 'rulepack_depth',
      status: 'queued',
      priorityScore: baseScore + Number(boss.coveragePulls || 0),
      bossName: boss.bossName,
      title: `Deepen ${boss.bossName} rulepack`,
      rationale: boss.nextPriority,
      payload: {
        gapStatus: boss.gapStatus,
        coveragePulls: boss.coveragePulls,
        calibrationScore: boss.averageCalibrationScore,
        goodAssignmentSignal: boss.goodAssignmentSignal,
      },
      generatedAt: new Date().toISOString(),
    });
  }

  if (Number(boss.poorDataQuality || 0) > Number(boss.goodAssignmentSignal || 0)) {
    items.push({
      key: `${slugify(boss.bossName)}__coverage_quality`,
      category: 'coverage_quality',
      status: 'queued',
      priorityScore: baseScore + 15,
      bossName: boss.bossName,
      title: `Improve ${boss.bossName} public coverage quality`,
      rationale: 'Public pulls for this boss still have too much partial or weak-quality data compared with useful assignment signal.',
      payload: {
        poorDataQuality: boss.poorDataQuality,
        goodAssignmentSignal: boss.goodAssignmentSignal,
        kills: boss.kills,
      },
      generatedAt: new Date().toISOString(),
    });
  }

  if (Number(boss.averageCalibrationScore || 0) < 95) {
    items.push({
      key: `${slugify(boss.bossName)}__phase_success_depth`,
      category: 'phase_success_depth',
      status: 'queued',
      priorityScore: baseScore + 10,
      bossName: boss.bossName,
      title: `Tighten ${boss.bossName} phase success criteria`,
      rationale: 'Calibration is passing, but the score says the phase-level diagnosis still leaves precision on the table.',
      payload: {
        calibrationScore: boss.averageCalibrationScore,
        calibrationPassRate: boss.calibrationPassRate,
      },
      generatedAt: new Date().toISOString(),
    });
  }
}

items.push({
  key: 'fixture_expansion__midnight',
  category: 'fixture_expansion',
  status: 'queued',
  priorityScore: 160,
  title: 'Expand reviewed fixtures beyond the current Midnight core',
  rationale: 'The analyzer is stable on the current fixture set, so the next gain comes from adding more reviewed pulls and deeper phase bands.',
  payload: {
    currentFixtures: health.summary?.totalFixtures || 0,
    target: 20,
  },
  generatedAt: new Date().toISOString(),
});

items.push({
  key: 'output_quality__cross_session',
  category: 'output_quality',
  status: 'queued',
  priorityScore: 120,
  title: 'Add human-reviewed output quality samples for session-level summaries',
  rationale: 'Heuristic output quality checks are useful, but the next step is comparing them against explicit officer/RL review.',
  payload: {
    currentHeuristicReviews: outputQuality.summary?.total || 0,
  },
  generatedAt: new Date().toISOString(),
});

const backlog = items.sort((a, b) => b.priorityScore - a.priorityScore);

const payload = {
  generatedAt: new Date().toISOString(),
  count: backlog.length,
  highestPriority: backlog[0] || null,
  items: backlog,
};

await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ output: outputPath, count: backlog.length }, null, 2));
