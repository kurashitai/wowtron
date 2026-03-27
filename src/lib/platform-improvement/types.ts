export type PlatformArtifactType =
  | 'wcl_report'
  | 'wcl_fight_bundle'
  | 'wcl_report_payload'
  | 'wcl_fight_payload'
  | 'analyzer_snapshot'
  | 'calibration_snapshot';

export type PlatformArtifactSource =
  | 'wcl_api'
  | 'wcl_cache'
  | 'client_analysis'
  | 'calibration_api'
  | 'public_corpus_job';

export interface RawLogArtifactRecord {
  key: string;
  artifactType: PlatformArtifactType;
  source: PlatformArtifactSource;
  cacheKey: string;
  reportCode?: string;
  fightId?: number;
  bossName?: string;
  contentHash: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
  capturedAt: string;
  expiresAt?: string;
}

export interface FightRecord {
  key: string;
  reportCode: string;
  fightId: number;
  bossName: string;
  zone: string;
  difficulty: string;
  kill: boolean;
  bossHPPercent?: number;
  durationSec: number;
  startTime?: number;
  endTime?: number;
  source: PlatformArtifactSource;
  capturedAt: string;
  composition: {
    tanks: number;
    healers: number;
    dps: number;
    total: number;
    bloodlust: boolean;
    brez: number;
  };
  summary: {
    raidDPS: number;
    raidHPS: number;
    raidDTPS: number;
    totalDamage: number;
    totalHealing: number;
    totalDamageTaken: number;
    deaths: number;
    bloodlusts: number;
    dispels: number;
    interrupts: number;
  };
  bossContextSource?: string;
  dataQuality?: {
    playerCount: number;
    deaths: number;
    timelineEvents: number;
    combatEvents: number;
    hasPlayerDetails: boolean;
    hasBossContext: boolean;
  };
}

export interface FightPlayerRecord {
  key: string;
  fightKey: string;
  actorId?: number;
  name: string;
  role: 'tank' | 'healer' | 'dps';
  className: string;
  spec: string;
  region?: string;
  talents?: string[];
  buildSignature?: string;
  buildSource?: 'talent_profile' | 'wcl_talent_tree' | 'spec_fallback' | 'profile_snapshot';
  itemLevel: number;
  server?: string;
  dps: number;
  hps: number;
  dtps: number;
  activeTime: number;
  deaths: number;
  rankPercent: number;
  reliabilityScore?: number;
  avoidableDamageTaken?: number;
}

export interface FightPhaseRecord {
  key: string;
  fightKey: string;
  ordinal: number;
  name: string;
  startTime: number;
  endTime: number;
}

export interface SnapshotQualityRecord {
  hasCommandView: boolean;
  hasPhaseReadiness: boolean;
  hasAssignmentPlanOverview: boolean;
  hasCauseChain: boolean;
  hasRoleCoaching: boolean;
  hasReliabilityEntries: boolean;
}

export interface AnalyzerRunRecord {
  key: string;
  fightKey: string;
  reportCode: string;
  fightId: number;
  bossName: string;
  source: PlatformArtifactSource;
  analyzerVersion: string;
  recordedAt: string;
  summaryText?: string;
  topOwner?: string;
  topPhase?: string;
  snapshotQuality: SnapshotQualityRecord;
  snapshot: unknown;
  analysis: unknown;
}

export interface CoverageRollupRecord {
  key: string;
  scope: 'midnight_public';
  bossName?: string;
  zone?: string;
  payload: Record<string, unknown>;
  generatedAt: string;
}

export interface CalibrationReviewRecord {
  key: string;
  bossName: string;
  reportCode: string;
  fightId: number;
  fixtureType: string;
  expected: Record<string, unknown>;
  actual?: Record<string, unknown>;
  passed?: boolean;
  failureReason?: string;
  tags?: string[];
  reviewedAt?: string;
  source: 'reviewed_fixture' | 'live_pull_review';
}

export interface RulepackGapRecord {
  key: string;
  bossName: string;
  phaseName?: string;
  status: 'needs_data' | 'ready_for_rules' | 'in_progress' | 'stable';
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface OutputQualityReviewRecord {
  key: string;
  bossName?: string;
  reportCode?: string;
  fightId?: number;
  source: 'reviewed_fixture' | 'heuristic_review';
  payload: Record<string, unknown>;
  reviewedAt: string;
}

export interface AnalyzerHealthSnapshotRecord {
  key: string;
  scope: 'midnight_analyzer_health';
  payload: Record<string, unknown>;
  generatedAt: string;
}

export interface ImprovementBacklogRecord {
  key: string;
  category: 'rulepack_depth' | 'coverage_quality' | 'fixture_expansion' | 'output_quality' | 'phase_success_depth';
  status: 'queued' | 'in_progress' | 'blocked' | 'done';
  priorityScore: number;
  bossName?: string;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  generatedAt: string;
}

export interface ReviewCadenceSnapshotRecord {
  key: string;
  scope: 'midnight_review_cadence';
  payload: Record<string, unknown>;
  generatedAt: string;
}
