import fsp from 'node:fs/promises';
import path from 'node:path';

const healthPath = path.join(process.cwd(), 'data', 'midnight-build-significance-health.json');
const reportsPath = path.join(process.cwd(), 'data', 'public-midnight-report-codes.json');
const outputPath = path.join(process.cwd(), 'data', 'midnight-build-enrichment-queue.json');

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, 'utf8'));
}

function normalizeBossName(value) {
  return String(value || '').trim().toLowerCase();
}

function buildPriorityScore(item) {
  let score = 0;

  const recommendation = String(item.recommendation || '').toLowerCase();
  if (recommendation.includes('named talent labels are still missing')) score += 80;
  if (recommendation.includes('no stored talent-tagged pulls yet')) score += 40;
  if (normalizeBossName(item.bossName).includes('alleria')) score += 35;
  if (normalizeBossName(item.bossName).includes('chimaerus')) score += 30;
  score += Math.min(20, Number(item.killRecords || 0) * 3);
  score += Math.min(20, Number(item.talentTaggedRecords || 0) * 4);
  score += Math.min(10, Number(item.totalRecords || 0));

  return score;
}

async function main() {
  const health = await readJson(healthPath);
  const reportsPayload = await readJson(reportsPath);
  const reports = Array.isArray(reportsPayload?.reports) ? reportsPayload.reports : [];
  const bossSpecs = Array.isArray(health?.bossSpecs) ? health.bossSpecs : [];

  const candidateBosses = bossSpecs
    .filter((item) => {
      const recommendation = String(item?.recommendation || '');
      return (
        recommendation.includes('named talent labels are still missing') ||
        recommendation.includes('No stored talent-tagged pulls yet.')
      );
    })
    .sort((a, b) => buildPriorityScore(b) - buildPriorityScore(a))
    .slice(0, 20);

  const queue = [];
  const seen = new Set();

  for (const item of candidateBosses) {
    const bossName = String(item.bossName || '');
    const matchedReports = reports
      .filter((report) =>
        Array.isArray(report?.matchedBosses) &&
        report.matchedBosses.some((boss) => normalizeBossName(boss) === normalizeBossName(bossName))
      )
      .slice(0, 5);

    for (const report of matchedReports) {
      const key = `${bossName}::${report.code}`;
      if (seen.has(key)) continue;
      seen.add(key);

      queue.push({
        key,
        bossName,
        spec: item.spec,
        role: item.role,
        reportCode: report.code,
        reportTitle: report.title,
        guildName: report.guildName,
        guildServerRegion: report.guildServerRegion,
        matchedBosses: report.matchedBosses,
        reason: item.recommendation,
        currentTalentTaggedRecords: item.talentTaggedRecords,
        currentKillRecords: item.killRecords,
        priorityScore: buildPriorityScore(item),
      });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceSummary: {
      bossSpecPairs: Array.isArray(health?.bossSpecs) ? health.bossSpecs.length : 0,
      collectionPriorities: Array.isArray(health?.collectionPriorities) ? health.collectionPriorities.length : 0,
      publicReports: reports.length,
    },
    queue,
  };

  await fsp.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath,
        queueSize: queue.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
