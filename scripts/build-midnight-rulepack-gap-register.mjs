import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const coveragePath = args.coverage || 'data/midnight-public-coverage.json';
const fixturesPath = args.fixtures || 'data/midnight-reviewed-fixtures.json';
const calibrationPath = args.calibration || 'data/midnight-calibration-results.json';
const outputPath = args.output || 'data/midnight-rulepack-gap-register.json';
const platformDir = path.join(process.cwd(), 'data', 'platform-improvement', 'rulepack-gaps');

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const bossExpectations = {
  'Imperator Averzian': {
    mechanics: ['Void Blast', 'Imperial Decree', 'Positioning'],
    assignmentTypes: ['raid_cd', 'tank_swap'],
  },
  'Vorasius': {
    mechanics: ['Void Scream', 'Consume Essence', 'Shadow Feast'],
    assignmentTypes: ['interrupt', 'soak', 'raid_cd'],
  },
  'Fallen-King Salhadaar': {
    mechanics: ['Royal Collapse', 'Tank handling', 'Raid movement'],
    assignmentTypes: ['tank_swap', 'raid_cd'],
  },
  'Vaelgor & Ezzorak': {
    mechanics: ['Duplicate control', 'Twisted Fusion', 'Shadow Nova'],
    assignmentTypes: ['raid_cd', 'assignment'],
  },
  'Lightblinded Vanguard': {
    mechanics: ['Void Touched', 'Righteous Flame', 'Beam discipline'],
    assignmentTypes: ['soak', 'raid_cd'],
  },
  'Crown of the Cosmos': {
    mechanics: ['Devouring Cosmos', 'Spacing', 'Final platform discipline'],
    assignmentTypes: ['raid_cd', 'movement'],
  },
  'Alleria Windrunner': {
    mechanics: ['Windrunner Adds', 'Void Collapse', 'Barrage ownership'],
    assignmentTypes: ['interrupt', 'soak', 'raid_cd'],
  },
  'Chimaerus the Undreamt God': {
    mechanics: ['Aberrant Spawn', 'Cosmic Rupture', 'Shattered Heads'],
    assignmentTypes: ['interrupt', 'soak', 'raid_cd', 'tank_swap'],
  },
  'Mylora, Dreamkeeper': {
    mechanics: ['Emerald Burst', 'Movement discipline'],
    assignmentTypes: ['raid_cd'],
  },
  'The Corrupted Grove': {
    mechanics: ['Corruption control', 'Add handling'],
    assignmentTypes: ['raid_cd', 'utility'],
  },
};

const coverage = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
const reviewedFixtures = JSON.parse(await fs.readFile(fixturesPath, 'utf8')).fixtures || [];
const calibration = JSON.parse(await fs.readFile(calibrationPath, 'utf8'));
const resultByBoss = new Map(
  (calibration.results || []).map((result) => [result.bossName, result])
);

const register = (coverage.bosses || []).map((boss) => {
  const expected = bossExpectations[boss.bossName] || { mechanics: [], assignmentTypes: [] };
  const fixtures = reviewedFixtures.filter((fixture) => fixture.bossName === boss.bossName);
  const calibrationResult = resultByBoss.get(boss.bossName);
  const failedFindings = calibrationResult?.findings || [];

  let status = 'needs_data';
  if (boss.totalPulls >= 8) status = 'ready_for_rules';
  if (fixtures.length >= 2) status = 'in_progress';
  if (fixtures.length >= 2 && calibrationResult?.passed) status = 'stable';

  return {
    bossName: boss.bossName,
    status,
    payload: {
      coverage: {
        totalPulls: boss.totalPulls,
        kills: boss.kills,
        wipes: boss.wipes,
        bestWipeHP: boss.bestWipeHP,
        goodAssignmentSignal: boss.goodAssignmentSignal,
        poorDataQuality: boss.poorDataQuality,
      },
      reviewedFixtureCount: fixtures.length,
      expectedMechanics: expected.mechanics,
      expectedAssignmentTypes: expected.assignmentTypes,
      calibration: calibrationResult
        ? {
            passed: calibrationResult.passed,
            score: calibrationResult.score,
            findings: failedFindings,
          }
        : null,
      nextPriority:
        boss.poorDataQuality > boss.goodAssignmentSignal
          ? 'Improve public coverage quality before adding deeper rules.'
          : status === 'stable'
            ? 'Maintain and expand with phase-specific false-positive suppressors.'
            : 'Deepen encounter-specific rule checks and success criteria.',
    },
    updatedAt: new Date().toISOString(),
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  source: {
    coveragePath,
    fixturesPath,
    calibrationPath,
  },
  count: register.length,
  bosses: register,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
await fs.mkdir(platformDir, { recursive: true });
for (const boss of register) {
  await fs.writeFile(
    path.join(platformDir, `${slugify(boss.bossName)}.json`),
    JSON.stringify(
      {
        key: slugify(boss.bossName),
        bossName: boss.bossName,
        status: boss.status,
        payload: boss.payload,
        updatedAt: boss.updatedAt,
      },
      null,
      2
    )
  );
}

console.log(JSON.stringify({ output: outputPath, count: register.length }, null, 2));
