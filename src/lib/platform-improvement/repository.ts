import { createHash } from 'crypto';
import type { FightData } from '@/lib/combat-logs';
import type { AnalysisResult as LogAnalysisResult } from '@/lib/analysis/log-analysis-engine';
import type { InsightSnapshot } from '@/lib/analysis/log-insight-types';
import { deriveBuildSignature } from './build-significance';
import { writeRawArtifact, writeStructuredRecord } from './file-store';
import {
  persistAnalyzerHealthSnapshotToDb,
  persistAnalyzerRunToDb,
  persistCalibrationReviewToDb,
  persistCoverageRollupToDb,
  persistFightBundleToDb,
  persistImprovementBacklogToDb,
  persistOutputQualityReviewToDb,
  persistRawLogArtifactToDb,
  persistReviewCadenceSnapshotToDb,
  persistRulepackGapToDb,
} from './prisma-store';
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
  SnapshotQualityRecord,
} from './types';

function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function getFightKey(reportCode: string, fightId: number) {
  return `${reportCode}__${fightId}`;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '"unserializable"';
  }
}

function buildSnapshotQuality(snapshot: InsightSnapshot): SnapshotQualityRecord {
  return {
    hasCommandView: Boolean(snapshot.commandView),
    hasPhaseReadiness: Boolean(snapshot.phaseReadiness && snapshot.phaseReadiness.length > 0),
    hasAssignmentPlanOverview: Boolean(snapshot.assignmentPlanOverview),
    hasCauseChain: Boolean(snapshot.causeChains && snapshot.causeChains.length > 0),
    hasRoleCoaching: Boolean(snapshot.playerCoaching && snapshot.playerCoaching.length > 0),
    hasReliabilityEntries: Boolean(snapshot.players && snapshot.players.length > 0),
  };
}

function normalizeFightRecord(fight: FightData, reportCode: string, source: RawLogArtifactRecord['source']): FightRecord {
  const bossContext = (fight as FightData & { bossContext?: { source?: string } }).bossContext;
  return {
    key: getFightKey(reportCode, fight.id),
    reportCode,
    fightId: fight.id,
    bossName: fight.bossName,
    zone: fight.zone,
    difficulty: fight.difficulty,
    kill: fight.kill,
    bossHPPercent: fight.bossHPPercent,
    durationSec: fight.duration,
    startTime: fight.startTime,
    endTime: fight.endTime,
    source,
    capturedAt: new Date().toISOString(),
    composition: fight.composition,
    summary: {
      raidDPS: fight.summary.raidDPS,
      raidHPS: fight.summary.raidHPS,
      raidDTPS: fight.summary.raidDTPS,
      totalDamage: fight.summary.totalDamage,
      totalHealing: fight.summary.totalHealing,
      totalDamageTaken: fight.summary.totalDamageTaken,
      deaths: fight.summary.deaths,
      bloodlusts: fight.summary.bloodlusts,
      dispels: fight.summary.dispels,
      interrupts: fight.summary.interrupts,
    },
    bossContextSource: bossContext?.source,
    dataQuality: {
      playerCount: fight.players.length,
      deaths: fight.summary.deaths,
      timelineEvents: fight.timeline.length,
      combatEvents: fight.combatEvents.length,
      hasPlayerDetails: Boolean(fight.playerDetails),
      hasBossContext: Boolean(bossContext),
    },
  };
}

function normalizeFightPlayers(fight: FightData, reportCode: string): FightPlayerRecord[] {
  const fightKey = getFightKey(reportCode, fight.id);
  return fight.players.map((player) => ({
    ...deriveBuildSignature(player.spec, player.talents || []),
    key: `${fightKey}__${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    fightKey,
    actorId: player.id,
    name: player.name,
    role: player.role,
    className: player.class,
    spec: player.spec,
    region: player.region,
    talents: player.talents || [],
    itemLevel: player.itemLevel,
    server: player.server,
    dps: player.dps,
    hps: player.hps,
    dtps: player.dtps,
    activeTime: player.activeTime,
    deaths: player.deaths,
    rankPercent: player.rankPercent,
    reliabilityScore: (player as typeof player & { reliabilityScore?: number }).reliabilityScore,
    avoidableDamageTaken: player.avoidableDamageTaken,
  }));
}

function normalizeFightPhases(fight: FightData, reportCode: string): FightPhaseRecord[] {
  const fightKey = getFightKey(reportCode, fight.id);
  return fight.phases.map((phase, index) => ({
    key: `${fightKey}__phase_${index + 1}`,
    fightKey,
    ordinal: index + 1,
    name: phase.name,
    startTime: phase.startTime,
    endTime: phase.endTime,
  }));
}

export async function persistRawLogArtifact(record: Omit<RawLogArtifactRecord, 'key' | 'contentHash' | 'capturedAt'>) {
  const serializedPayload = safeStringify(record.payload);
  const normalized: RawLogArtifactRecord = {
    ...record,
    key: `${record.artifactType}__${hashValue(`${record.cacheKey}:${serializedPayload}`)}`,
    contentHash: hashValue(serializedPayload),
    capturedAt: new Date().toISOString(),
  };

  await writeRawArtifact(record.artifactType, record.cacheKey, normalized);
  await persistRawLogArtifactToDb(normalized);
  return normalized;
}

export async function persistFightRecord(fight: FightData, reportCode: string, source: RawLogArtifactRecord['source']) {
  const fightRecord = normalizeFightRecord(fight, reportCode, source);
  const players = normalizeFightPlayers(fight, reportCode);
  const phases = normalizeFightPhases(fight, reportCode);

  await writeStructuredRecord('fight-records', fightRecord.key, fightRecord);
  await Promise.all(players.map((player) => writeStructuredRecord('fight-player-records', player.key, player)));
  await Promise.all(phases.map((phase) => writeStructuredRecord('fight-phase-records', phase.key, phase)));
  await persistFightBundleToDb(fightRecord, players, phases);
  return { fightRecord, players, phases };
}

export async function persistAnalyzerRun(args: {
  reportCode: string;
  fight: Pick<FightData, 'id' | 'bossName'>;
  analysis: LogAnalysisResult;
  snapshot: InsightSnapshot;
  source: RawLogArtifactRecord['source'];
}) {
  const topSummary = args.snapshot.briefInsights[0]?.summary;
  const topOwner = args.snapshot.commandView?.biggestBlocker?.owner || args.snapshot.briefInsights[0]?.owner;
  const topPhase = args.snapshot.commandView?.biggestBlocker?.phase || args.snapshot.briefInsights[0]?.phase;
  const signature = hashValue(
    safeStringify({
      commandView: args.snapshot.commandView,
      topInsights: args.snapshot.briefInsights.slice(0, 3),
      phaseReadiness: args.snapshot.phaseReadiness,
      assignmentPlanOverview: args.snapshot.assignmentPlanOverview,
      reportCode: args.reportCode,
      fightId: args.fight.id,
    })
  );
  const record: AnalyzerRunRecord = {
    key: `${getFightKey(args.reportCode, args.fight.id)}__${signature}`,
    fightKey: getFightKey(args.reportCode, args.fight.id),
    reportCode: args.reportCode,
    fightId: args.fight.id,
    bossName: args.fight.bossName,
    source: args.source,
    analyzerVersion: 'phase1-shared-engine-v1',
    recordedAt: new Date().toISOString(),
    summaryText: topSummary,
    topOwner,
    topPhase,
    snapshotQuality: buildSnapshotQuality(args.snapshot),
    snapshot: args.snapshot,
    analysis: args.analysis,
  };

  await writeStructuredRecord('analyzer-runs', record.key, record);
  await persistAnalyzerRunToDb(record);
  return record;
}

export async function persistCoverageRollup(record: CoverageRollupRecord) {
  await writeStructuredRecord('coverage-rollups', record.key, record);
  await persistCoverageRollupToDb(record);
  return record;
}

export async function persistCalibrationReview(record: CalibrationReviewRecord) {
  await writeStructuredRecord('calibration-reviews', record.key, record);
  await persistCalibrationReviewToDb(record);
  return record;
}

export async function persistRulepackGap(record: RulepackGapRecord) {
  await writeStructuredRecord('rulepack-gaps', record.key, record);
  await persistRulepackGapToDb(record);
  return record;
}

export async function persistOutputQualityReview(record: OutputQualityReviewRecord) {
  await writeStructuredRecord('output-quality-reviews', record.key, record);
  await persistOutputQualityReviewToDb(record);
  return record;
}

export async function persistAnalyzerHealthSnapshot(record: AnalyzerHealthSnapshotRecord) {
  await writeStructuredRecord('analyzer-health-snapshots', record.key, record);
  await persistAnalyzerHealthSnapshotToDb(record);
  return record;
}

export async function persistImprovementBacklog(record: ImprovementBacklogRecord) {
  await writeStructuredRecord('improvement-backlog-items', record.key, record);
  await persistImprovementBacklogToDb(record);
  return record;
}

export async function persistReviewCadenceSnapshot(record: ReviewCadenceSnapshotRecord) {
  await writeStructuredRecord('review-cadence-snapshots', record.key, record);
  await persistReviewCadenceSnapshotToDb(record);
  return record;
}
