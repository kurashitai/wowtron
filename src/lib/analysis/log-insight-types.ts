export interface BriefInsight {
  id: string;
  kind: 'player_execution' | 'raid_assignment' | 'raid_cooldown' | 'raid_strategy';
  severity: 'critical' | 'warning' | 'info';
  confidence: 'high' | 'medium' | 'low';
  priorityScore: number;
  owner: string;
  phase: string;
  summary: string;
  evidence: string;
  confidenceReasons?: string[];
  recommendation: string;
  category: 'mechanics' | 'cooldowns' | 'throughput' | 'strategy';
}

export interface AssignmentAssessment {
  id: string;
  category: 'interrupt' | 'soak' | 'dispel' | 'raid_cd' | 'tank_swap';
  status: 'failing' | 'at_risk' | 'covered';
  owner: string;
  phase: string;
  mechanic: string;
  evidence: string;
  confidenceReasons?: string[];
  recommendation: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AssignmentPlan {
  interrupts: string;
  soaks: string;
  dispels: string;
  raidCooldowns: string;
  tankAssignments: string;
  notes: string;
}

export interface PhaseSuccessCriterion {
  phase: string;
  status: 'met' | 'at_risk' | 'missed';
  summary: string;
  evidence: string;
}

export interface PhaseReadiness {
  phase: string;
  status: 'ready' | 'close' | 'not_ready';
  summary: string;
  blocker: string;
  owner: string;
}

export interface AssignmentPlanCategoryStatus {
  key: 'interrupt' | 'soak' | 'dispel' | 'raid_cd' | 'tank_swap';
  label: string;
  required: boolean;
  hasPlan: boolean;
  execution: 'failing' | 'at_risk' | 'covered' | 'not_applicable';
  summary: string;
}

export interface AssignmentPlanOverview {
  status: 'missing' | 'partial' | 'ready';
  coverage: 'weak' | 'mixed' | 'strong';
  explicitCategoryCount: number;
  requiredCategoryCount: number;
  missingCategories: string[];
  categories: AssignmentPlanCategoryStatus[];
  summary: string;
  recommendation: string;
}

export interface CommandDecision {
  mode?: 'wipe_diagnosis' | 'messy_kill' | 'clean_kill' | 'farm_ready';
  headline?: string;
  whyLabel?: string;
  biggestBlockerLabel?: string;
  mostLikelyNextWipeLabel?: string;
  nextActionsLabel?: string;
  biggestBlocker?: {
    summary: string;
    owner: string;
    phase: string;
    reason: string;
  };
  mostLikelyNextWipe?: {
    summary: string;
    owner: string;
    phase: string;
    reason: string;
  };
}

export interface InsightSnapshotPlayer {
  name: string;
  role: 'tank' | 'healer' | 'dps';
  className?: string;
  spec?: string;
  talents?: string[];
  reliabilityScore: number;
  activeTime: number;
  deaths: number;
}

export interface InsightSnapshot {
  key: string;
  fightId: number;
  bossName: string;
  difficulty?: string;
  reportCode?: string;
  recordedAt: string;
  kill: boolean;
  bossHP?: number;
  duration: number;
  briefInsights: BriefInsight[];
  deltaInsights: BriefInsight[];
  playerCoaching: BriefInsight[];
  assignmentAssessments: AssignmentAssessment[];
  phaseSuccessCriteria: PhaseSuccessCriterion[];
  causeChains: string[];
  phaseReadiness?: PhaseReadiness[];
  commandView?: CommandDecision;
  assignmentPlanOverview?: AssignmentPlanOverview;
  avgReliability?: number;
  killProbability?: number;
  totalDeaths?: number;
  avoidableDeaths?: number;
  players?: InsightSnapshotPlayer[];
}
