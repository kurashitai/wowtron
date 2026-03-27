import type {
  AssignmentAssessment,
  AssignmentPlanOverview,
  BriefInsight,
  CommandDecision,
  InsightSnapshotPlayer,
  PhaseReadiness,
  PhaseSuccessCriterion,
} from './log-insight-types';

export interface FightLike {
  id: number;
  bossName: string;
  difficulty?: string;
  duration: number;
  kill: boolean;
  bossHP?: number;
}

export interface AnalysisResultLike {
  briefInsights?: BriefInsight[];
  deltaInsights?: BriefInsight[];
  playerCoaching?: BriefInsight[];
  assignmentAssessments?: AssignmentAssessment[];
  phaseSuccessCriteria?: PhaseSuccessCriterion[];
  causeChains?: string[];
  phaseReadiness?: PhaseReadiness[];
  commandView?: CommandDecision;
  assignmentPlanOverview?: AssignmentPlanOverview;
  killProbability?: number;
  deaths?: {
    avoidable: { player: string }[];
    unavoidable: { player: string }[];
  };
  players?: InsightSnapshotPlayer[];
}
