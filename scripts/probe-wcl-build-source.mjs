import fs from 'node:fs/promises';
import path from 'node:path';

const rawArtifactDir = path.join(
  process.cwd(),
  '.wowtron-cache',
  'platform-improvement',
  'raw-artifacts',
  'wcl_fight_bundle'
);
const outputPath = path.join(process.cwd(), 'data', 'wcl-build-source-probe.json');

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countNonEmptyCombatantInfo(entries = []) {
  return safeArray(entries).filter((entry) => {
    const combatantInfo = entry?.combatantInfo;
    return combatantInfo && typeof combatantInfo === 'object' && Object.keys(combatantInfo).length > 0;
  }).length;
}

function countEntriesWithSpecs(entries = []) {
  return safeArray(entries).filter((entry) => safeArray(entry?.specs).length > 0).length;
}

function countEntriesWithTalents(entries = []) {
  return safeArray(entries).filter((entry) => safeArray(entry?.talents).length > 0).length;
}

function countEntriesWithTalentTree(entries = []) {
  return safeArray(entries).filter((entry) => safeArray(entry?.combatantInfo?.talentTree).length > 0).length;
}

function countTableTalents(tableData) {
  return safeArray(tableData?.entries).filter((entry) => safeArray(entry?.talents).length > 0).length;
}

async function main() {
  const files = (await fs.readdir(rawArtifactDir))
    .filter((file) => file.endsWith('.json'))
    .slice(-25);

  const samples = [];

  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(path.join(rawArtifactDir, file), 'utf8'));
    const payload = raw?.payload || {};
    const playerDetails = payload.playerDetails || {};
    const detailEntries = [
      ...safeArray(playerDetails.tanks),
      ...safeArray(playerDetails.healers),
      ...safeArray(playerDetails.dps),
    ];

    samples.push({
      file,
      reportCode: raw?.reportCode || null,
      fightId: raw?.fightId || null,
      bossName: raw?.bossName || null,
      playerDetailsCount: detailEntries.length,
      playerDetailsWithSpecs: countEntriesWithSpecs(detailEntries),
      playerDetailsWithTalents: countEntriesWithTalents(detailEntries),
      playerDetailsWithCombatantInfo: countNonEmptyCombatantInfo(detailEntries),
      playerDetailsWithTalentTree: countEntriesWithTalentTree(detailEntries),
      damageEntriesWithTalents: countTableTalents(payload.damageDone),
      healingEntriesWithTalents: countTableTalents(payload.healingDone),
      damageTakenEntriesWithTalents: countTableTalents(payload.damageTaken),
    });
  }

  const summary = {
    sampledBundles: samples.length,
    bundlesWithPlayerDetails: samples.filter((sample) => sample.playerDetailsCount > 0).length,
    bundlesWithSpecCoverage: samples.filter((sample) => sample.playerDetailsWithSpecs > 0).length,
    bundlesWithPlayerTalentCoverage: samples.filter((sample) => sample.playerDetailsWithTalents > 0).length,
    bundlesWithCombatantInfoCoverage: samples.filter((sample) => sample.playerDetailsWithCombatantInfo > 0).length,
    bundlesWithTalentTreeCoverage: samples.filter((sample) => sample.playerDetailsWithTalentTree > 0).length,
    bundlesWithTableTalentCoverage: samples.filter(
      (sample) =>
        sample.damageEntriesWithTalents > 0 ||
        sample.healingEntriesWithTalents > 0 ||
        sample.damageTakenEntriesWithTalents > 0
    ).length,
  };

  const recommendation =
    summary.sampledBundles === 0
      ? 'No sampled WCL fight bundles yet.'
      : summary.bundlesWithPlayerTalentCoverage === 0 &&
          summary.bundlesWithTalentTreeCoverage === 0 &&
          summary.bundlesWithCombatantInfoCoverage === 0 &&
          summary.bundlesWithTableTalentCoverage === 0
        ? 'Current WCL fight ingestion provides role/spec identity, but no usable build detail. Treat this as a source/query blocker and do not force talent-mode comparisons yet.'
        : summary.bundlesWithTalentTreeCoverage > 0
          ? 'Observed talent-tree signatures are reaching the platform. Persist them and build corpus coverage before forcing named talent swaps.'
          : 'At least some build detail is reaching the platform. Expand capture and persistence until boss/spec pairs have enough talent-tagged kills.';

  const payload = {
    generatedAt: new Date().toISOString(),
    summary,
    recommendation,
    samples,
  };

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath,
        ...summary,
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
