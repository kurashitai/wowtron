import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (typeof process.loadEnvFile === 'function') {
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function avg(values = []) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function safeTalents(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

async function main() {
  try {
    let buildSourceProbe = null;
    try {
      buildSourceProbe = JSON.parse(
        await fsp.readFile(path.join(process.cwd(), 'data', 'wcl-build-source-probe.json'), 'utf8')
      );
    } catch {
      buildSourceProbe = null;
    }

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        fr."bossName",
        fpr."className",
        fpr."spec",
        fpr."role",
        fpr."talents",
        fpr."buildSource",
        fpr."rankPercent",
        fpr."activeTime",
        fpr."reliabilityScore",
        fr."kill"
      FROM "fight_player_records" fpr
      INNER JOIN "fight_records" fr ON fr."key" = fpr."fightKey"
      WHERE fr."zone" = 'VS / DR / MQD'
    `);

    const normalized = rows.map((row) => ({
      bossName: row.bossName,
      className: row.className,
      spec: row.spec,
      role: row.role,
      talents: safeTalents(row.talents),
      buildSource: row.buildSource || (safeTalents(row.talents).length > 0 ? 'talent_profile' : 'spec_fallback'),
      rankPercent: Number(row.rankPercent || 0),
      activeTime: Number(row.activeTime || 0),
      reliabilityScore: Number(row.reliabilityScore || 0),
      kill: Boolean(row.kill),
    }));

    const totalRecords = normalized.length;
    const talentTaggedRecords = normalized.filter((row) => row.talents.length > 0).length;
    const killRecords = normalized.filter((row) => row.kill).length;

    const grouped = new Map();
    for (const row of normalized) {
      const key = `${row.bossName}__${row.spec}`;
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    }

    const bossSpecs = Array.from(grouped.entries())
      .map(([key, records]) => {
        const [bossName, spec] = key.split('__');
        const killSample = records.filter((record) => record.kill);
        const talentCoverage = records.filter((record) => record.talents.length > 0);
        const readyForTalentMode = talentCoverage.length >= 8 && killSample.length >= 4;
        const mode = readyForTalentMode ? 'talent_ready' : records.length >= 6 ? 'beta_fallback' : 'insufficient';
        const weakestReason =
          mode === 'talent_ready'
            ? 'Enough talent-tagged history to trust cautious talent comparisons.'
            : talentCoverage.length === 0
              ? 'No stored talent-tagged pulls yet.'
              : killSample.length < 4
                ? 'Too few kill samples for this spec.'
                : 'Spec fallback still safer than talent mode for now.';

        return {
          bossName,
          spec,
          className: records[0]?.className || 'Unknown',
          role: records[0]?.role || 'dps',
          totalRecords: records.length,
          killRecords: killSample.length,
          talentTaggedRecords: talentCoverage.length,
          averageRankPercent: avg(records.map((record) => record.rankPercent)),
          averageActiveTime: avg(records.map((record) => record.activeTime)),
          averageReliability: avg(records.map((record) => record.reliabilityScore)),
          mode,
          recommendation: weakestReason,
        };
      })
      .sort((a, b) => {
        const modeWeight = { insufficient: 3, beta_fallback: 2, talent_ready: 1 };
        if (modeWeight[a.mode] !== modeWeight[b.mode]) return modeWeight[a.mode] - modeWeight[b.mode];
        return b.totalRecords - a.totalRecords;
      });

    const summary = {
      totalRecords,
      killRecords,
      talentTaggedRecords,
      talentCoverageRate: totalRecords > 0 ? Math.round((talentTaggedRecords / totalRecords) * 100) : 0,
      bossSpecPairs: bossSpecs.length,
      talentReadyPairs: bossSpecs.filter((item) => item.mode === 'talent_ready').length,
      betaFallbackPairs: bossSpecs.filter((item) => item.mode === 'beta_fallback').length,
      insufficientPairs: bossSpecs.filter((item) => item.mode === 'insufficient').length,
      sourceBlocker:
        talentTaggedRecords === 0
          ? buildSourceProbe?.recommendation ||
            'No talent-tagged pulls are reaching the platform yet. This is a source/query gap, not just a corpus-size gap.'
          : undefined,
      nextAction:
        talentTaggedRecords === 0
          ? buildSourceProbe?.summary?.bundlesWithSpecCoverage > 0
            ? 'Role/spec identity is arriving, but WCL build detail is still empty. Add another enrichment source or a dedicated build query before forcing talent-mode comparisons.'
            : 'Change or enrich the WCL ingestion path so player builds arrive with real talent data.'
          : 'Keep collecting talent-tagged pulls until more boss/spec pairs move into talent-ready mode.',
      sourceEvidence: buildSourceProbe?.summary || undefined,
    };

    const collectionPriorities = bossSpecs
      .filter((item) => item.mode !== 'talent_ready')
      .slice(0, 12)
      .map((item) => ({
        key: `${item.bossName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}__${item.spec.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        bossName: item.bossName,
        spec: item.spec,
        role: item.role,
        title: `Collect more ${item.spec} build data on ${item.bossName}`,
        rationale: item.recommendation,
        target: item.mode === 'insufficient' ? 8 : 12,
        currentTalentTaggedRecords: item.talentTaggedRecords,
        currentKillRecords: item.killRecords,
      }));

    const payload = {
      generatedAt: new Date().toISOString(),
      summary,
      bossSpecs,
      collectionPriorities,
    };

    const outPath = path.join(process.cwd(), 'data', 'midnight-build-significance-health.json');
    await fsp.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(JSON.stringify({
      ok: true,
      outPath,
      totalRecords,
      talentTaggedRecords,
      bossSpecPairs: bossSpecs.length,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
