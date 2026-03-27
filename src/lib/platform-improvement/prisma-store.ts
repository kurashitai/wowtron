import { db } from '@/lib/db';
import type {
  AnalyzerHealthSnapshotRecord,
  AnalyzerRunRecord,
  CalibrationReviewRecord,
  CoverageRollupRecord,
  FightPhaseRecord,
  FightPlayerRecord,
  FightRecord,
  ImprovementBacklogRecord,
  OutputQualityReviewRecord,
  RawLogArtifactRecord,
  ReviewCadenceSnapshotRecord,
  RulepackGapRecord,
} from './types';

type DynamicModel = {
  upsert?: (args: any) => Promise<unknown>;
  deleteMany?: (args: any) => Promise<unknown>;
  createMany?: (args: any) => Promise<unknown>;
};

function isUnknownArgumentError(error: unknown) {
  return error instanceof Error && error.message.includes('Unknown argument');
}

function getClient() {
  if (!db) return null;
  return db as unknown as Record<string, DynamicModel>;
}

function shouldUseDbStore() {
  return process.env.PLATFORM_STORE_MODE === 'db' || process.env.PLATFORM_STORE_MODE === 'hybrid';
}

export async function persistRawLogArtifactToDb(record: RawLogArtifactRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.rawLogArtifact;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { cacheKey: record.cacheKey },
    update: record,
    create: record,
  });
  return true;
}

export async function persistFightBundleToDb(
  fight: FightRecord,
  players: FightPlayerRecord[],
  phases: FightPhaseRecord[]
) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const fightModel = client?.fightRecord;
  const playerModel = client?.fightPlayerRecord;
  const phaseModel = client?.fightPhaseRecord;
  if (!fightModel?.upsert || !playerModel?.deleteMany || !playerModel?.createMany || !phaseModel?.deleteMany || !phaseModel?.createMany) {
    return false;
  }

  await fightModel.upsert({
    where: { key: fight.key },
    update: fight,
    create: fight,
  });
  await playerModel.deleteMany({ where: { fightKey: fight.key } });
  if (players.length > 0) {
    try {
      await playerModel.createMany({ data: players });
    } catch (error) {
      if (!isUnknownArgumentError(error)) {
        throw error;
      }

      // Some long-lived dev runtimes may still hold an older Prisma model shape.
      // Fall back to the stable player payload instead of failing the whole fight ingest.
      const stablePlayers = players.map(({ talents, buildSignature, buildSource, region, ...player }) => player);
      await playerModel.createMany({ data: stablePlayers });
    }
  }
  await phaseModel.deleteMany({ where: { fightKey: fight.key } });
  if (phases.length > 0) {
    await phaseModel.createMany({ data: phases });
  }
  return true;
}

export async function persistAnalyzerRunToDb(record: AnalyzerRunRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.analyzerRun;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}

export async function persistCoverageRollupToDb(record: CoverageRollupRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.coverageRollup;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}

export async function persistCalibrationReviewToDb(record: CalibrationReviewRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.calibrationReview;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}

export async function persistRulepackGapToDb(record: RulepackGapRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.rulepackGap;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}

export async function persistOutputQualityReviewToDb(record: OutputQualityReviewRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.outputQualityReview;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}

export async function persistAnalyzerHealthSnapshotToDb(record: AnalyzerHealthSnapshotRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.analyzerHealthSnapshot;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}

export async function persistImprovementBacklogToDb(record: ImprovementBacklogRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.improvementBacklogItem;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}

export async function persistReviewCadenceSnapshotToDb(record: ReviewCadenceSnapshotRecord) {
  if (!shouldUseDbStore()) return false;
  const client = getClient();
  const model = client?.reviewCadenceSnapshot;
  if (!model?.upsert) return false;
  await model.upsert({
    where: { key: record.key },
    update: record,
    create: record,
  });
  return true;
}
