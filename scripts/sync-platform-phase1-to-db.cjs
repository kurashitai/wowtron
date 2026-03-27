const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

if (typeof process.loadEnvFile === 'function') {
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
}

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function loadJson(filePath) {
  return fsp.readFile(filePath, 'utf8').then((raw) => JSON.parse(raw));
}

async function syncCoverage() {
  const summaryPath = path.join(process.cwd(), 'data', 'midnight-public-coverage.json');
  const data = await loadJson(summaryPath);

  await prisma.coverageRollup.upsert({
    where: { key: 'midnight_public__summary' },
    update: {
      scope: 'midnight_public',
      zone: 'Midnight',
      payload: data,
      generatedAt: new Date(data.generatedAt),
    },
    create: {
      key: 'midnight_public__summary',
      scope: 'midnight_public',
      zone: 'Midnight',
      payload: data,
      generatedAt: new Date(data.generatedAt),
    },
  });

  for (const boss of data.bosses || []) {
    const key = `midnight_public__${boss.bossName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await prisma.coverageRollup.upsert({
      where: { key },
      update: {
        scope: 'midnight_public',
        bossName: boss.bossName,
        zone: 'Midnight',
        payload: boss,
        generatedAt: new Date(data.generatedAt),
      },
      create: {
        key,
        scope: 'midnight_public',
        bossName: boss.bossName,
        zone: 'Midnight',
        payload: boss,
        generatedAt: new Date(data.generatedAt),
      },
    });
  }

  return (data.bosses || []).length + 1;
}

async function syncReviews() {
  const filePath = path.join(process.cwd(), 'data', 'midnight-calibration-review-register.json');
  const data = await loadJson(filePath);

  for (const review of data.reviews || []) {
    await prisma.calibrationReview.upsert({
      where: { key: review.key },
      update: {
        bossName: review.bossName,
        reportCode: review.reportCode,
        fightId: review.fightId,
        fixtureType: review.fixtureType,
        expected: review.expected,
        actual: review.actual ?? undefined,
        passed: typeof review.passed === 'boolean' ? review.passed : null,
        failureReason: review.failureReason ?? null,
        tags: review.tags ?? [],
        reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : null,
        source: review.source,
      },
      create: {
        key: review.key,
        bossName: review.bossName,
        reportCode: review.reportCode,
        fightId: review.fightId,
        fixtureType: review.fixtureType,
        expected: review.expected,
        actual: review.actual ?? undefined,
        passed: typeof review.passed === 'boolean' ? review.passed : null,
        failureReason: review.failureReason ?? null,
        tags: review.tags ?? [],
        reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : null,
        source: review.source,
      },
    });
  }

  return (data.reviews || []).length;
}

async function syncRulepackGaps() {
  const filePath = path.join(process.cwd(), 'data', 'midnight-rulepack-gap-register.json');
  const data = await loadJson(filePath);

  for (const boss of data.bosses || []) {
    const key = boss.bossName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    await prisma.rulepackGap.upsert({
      where: { key },
      update: {
        bossName: boss.bossName,
        phaseName: boss.phaseName ?? null,
        status: boss.status,
        payload: boss.payload,
        updatedAt: new Date(boss.updatedAt),
      },
      create: {
        key,
        bossName: boss.bossName,
        phaseName: boss.phaseName ?? null,
        status: boss.status,
        payload: boss.payload,
        updatedAt: new Date(boss.updatedAt),
      },
    });
  }

  return (data.bosses || []).length;
}

async function syncOutputQuality() {
  const filePath = path.join(process.cwd(), 'data', 'midnight-output-quality-review.json');
  if (!fs.existsSync(filePath)) return 0;
  const data = await loadJson(filePath);

  for (const review of data.reviews || []) {
    await prisma.outputQualityReview.upsert({
      where: { key: review.key },
      update: {
        bossName: review.bossName ?? null,
        reportCode: review.reportCode ?? null,
        fightId: review.fightId ?? null,
        source: review.source,
        payload: review.payload,
        reviewedAt: new Date(review.reviewedAt),
      },
      create: {
        key: review.key,
        bossName: review.bossName ?? null,
        reportCode: review.reportCode ?? null,
        fightId: review.fightId ?? null,
        source: review.source,
        payload: review.payload,
        reviewedAt: new Date(review.reviewedAt),
      },
    });
  }

  return (data.reviews || []).length;
}

async function syncAnalyzerHealth() {
  const filePath = path.join(process.cwd(), 'data', 'midnight-analyzer-health.json');
  if (!fs.existsSync(filePath)) return 0;
  const data = await loadJson(filePath);

  await prisma.analyzerHealthSnapshot.upsert({
    where: { key: 'midnight_analyzer_health' },
    update: {
      scope: 'midnight_analyzer_health',
      payload: data,
      generatedAt: new Date(data.generatedAt),
    },
    create: {
      key: 'midnight_analyzer_health',
      scope: 'midnight_analyzer_health',
      payload: data,
      generatedAt: new Date(data.generatedAt),
    },
  });

  return 1;
}

async function syncImprovementBacklog() {
  const filePath = path.join(process.cwd(), 'data', 'midnight-priority-backlog.json');
  if (!fs.existsSync(filePath)) return 0;
  const data = await loadJson(filePath);

  for (const item of data.items || []) {
    await prisma.improvementBacklogItem.upsert({
      where: { key: item.key },
      update: {
        category: item.category,
        status: item.status,
        priorityScore: item.priorityScore,
        bossName: item.bossName ?? null,
        title: item.title,
        rationale: item.rationale,
        payload: item.payload,
        generatedAt: new Date(item.generatedAt),
      },
      create: {
        key: item.key,
        category: item.category,
        status: item.status,
        priorityScore: item.priorityScore,
        bossName: item.bossName ?? null,
        title: item.title,
        rationale: item.rationale,
        payload: item.payload,
        generatedAt: new Date(item.generatedAt),
      },
    });
  }

  return (data.items || []).length;
}

async function syncReviewCadence() {
  const filePath = path.join(process.cwd(), 'data', 'midnight-review-cadence.json');
  if (!fs.existsSync(filePath)) return 0;
  const data = await loadJson(filePath);

  await prisma.reviewCadenceSnapshot.upsert({
    where: { key: 'midnight_review_cadence' },
    update: {
      scope: 'midnight_review_cadence',
      payload: data,
      generatedAt: new Date(data.generatedAt),
    },
    create: {
      key: 'midnight_review_cadence',
      scope: 'midnight_review_cadence',
      payload: data,
      generatedAt: new Date(data.generatedAt),
    },
  });

  return 1;
}

async function main() {
  try {
    const coverageCount = await syncCoverage();
    const reviewCount = await syncReviews();
    const gapCount = await syncRulepackGaps();
    const outputQualityCount = await syncOutputQuality();
    const analyzerHealthCount = await syncAnalyzerHealth();
    const improvementBacklogCount = await syncImprovementBacklog();
    const reviewCadenceCount = await syncReviewCadence();

    console.log(
      JSON.stringify(
        {
          ok: true,
          coverageCount,
          reviewCount,
          gapCount,
          outputQualityCount,
          analyzerHealthCount,
          improvementBacklogCount,
          reviewCadenceCount,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
