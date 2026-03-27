// ============================================
// ANALYSIS MODULE INDEX
// ============================================
// Exporta todas as funcionalidades de análise de raid

// Death Cascade Analysis
export {
  analyzeDeathCascade,
  formatCascadeTree,
  type DeathEvent,
  type DeathCascade,
  type DeathNode
} from './wipe-analysis';

// Cooldown Analysis
export {
  analyzeCooldownUsage,
  formatCooldownAnalysis,
  RAID_COOLDOWNS,
  PERSONAL_COOLDOWNS,
  type CooldownUsage,
  type DamageSpike,
  type CooldownGap,
  type CooldownAnalysisResult
} from './cooldown-analysis';

// Pull Comparison
export {
  comparePulls,
  formatPullComparison,
  type PullComparisonResult,
  type PullSummary,
  type ComparisonChange,
  type PlayerComparison
} from './pull-comparison';

// Insight contracts and supporting engines
export type {
  BriefInsight,
  AssignmentAssessment,
  AssignmentPlan,
  InsightSnapshot,
  PhaseSuccessCriterion,
} from './log-insight-types';
export { getBossRulePackInsight } from './boss-rule-engine';
export { buildInsightSnapshot, loadInsightSnapshots, loadInsightSnapshotsForReport, persistInsightSnapshot, exportInsightSnapshots } from './insight-snapshots';
export { calibrateSnapshot, calibrateSnapshots, type CalibrationFixture, type CalibrationResult } from './calibration';
export { analyzeLogFight, type AnalyzeLogFightParams, type AnalysisResult as LogAnalysisResult, type FightData as LogAnalysisFightData } from './log-analysis-engine';
export {
  buildBossMemory,
  buildPlayerReliabilityTrends,
  buildSessionReview,
  buildSessionCommandCenter,
  buildNightComparison,
  buildGuildBossKnowledge,
  buildPlayerBossCoachingMemory,
  buildSessionRecap,
} from './progression-memory';
export {
  diagnoseLowDPS,
  EMPTY_ASSIGNMENT_PLAN,
  extractPlanOwners,
  getExpectedDPS,
  getExpectedMechanicOccurrences,
  getPhaseAtTime,
  guessIfAvoidable,
  mechanicTipFromContext,
  normalizePlanLines,
  resolveBossData,
} from './log-analysis-helpers';

// ============================================
// COMBINED ANALYSIS FUNCTION
// ============================================

import { FightData } from '../combat-logs';
import { BossData } from '../boss-data-midnight';
import { analyzeDeathCascade, DeathEvent, DeathCascade } from './wipe-analysis';
import { analyzeCooldownUsage, CooldownAnalysisResult } from './cooldown-analysis';
import { comparePulls, PullComparisonResult } from './pull-comparison';

export interface FullAnalysisResult {
  // Death cascade analysis
  deathCascade: DeathCascade | null;
  
  // Cooldown analysis
  cooldownAnalysis: CooldownAnalysisResult | null;
  
  // Overall score
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Top recommendations
  recommendations: string[];
  
  // Quick stats
  stats: {
    deaths: number;
    avoidableDeaths: number;
    raidDPS: number;
    raidHPS: number;
    duration: number;
    kill: boolean;
    bossHP: number;
  };
}

/**
 * Runs all analyses on a single fight
 */
export function analyzeFight(
  fight: FightData,
  bossData?: BossData,
  dtpsTimeline?: number[]
): FullAnalysisResult {
  // Extract death events
  const deaths: DeathEvent[] = fight.players
    .filter(p => p.deaths > 0)
    .flatMap(p => p.deathEvents.map(d => ({
      playerId: p.id,
      playerName: p.name,
      time: d.time,
      ability: d.ability,
      abilityId: 0,
      damage: d.damage,
      hpRemaining: 0
    })));
  
  // Run death cascade analysis
  const deathCascade = analyzeDeathCascade(deaths, fight, bossData);
  
  // Run cooldown analysis
  const cooldownAnalysis = dtpsTimeline 
    ? analyzeCooldownUsage(fight, dtpsTimeline, bossData)
    : null;
  
  // Calculate overall score
  const { score, grade } = calculateOverallScore(fight, deathCascade, cooldownAnalysis);
  
  // Generate recommendations
  const recommendations = generateRecommendations(fight, deathCascade, cooldownAnalysis);
  
  // Build stats
  const stats = {
    deaths: fight.summary.deaths,
    avoidableDeaths: deaths.filter(d => {
      // Check if death ability matches avoidable mechanics
      if (bossData) {
        const mechanic = bossData.mechanics.find(m => 
          m.name.toLowerCase().includes(d.ability.toLowerCase())
        );
        return mechanic?.type === 'avoidable' || mechanic?.type === 'positioning';
      }
      return false;
    }).length,
    raidDPS: fight.summary.raidDPS,
    raidHPS: fight.summary.raidHPS,
    duration: fight.duration,
    kill: fight.kill,
    bossHP: fight.bossHPPercent ?? 100
  };
  
  return {
    deathCascade,
    cooldownAnalysis,
    overallScore: score,
    grade,
    recommendations,
    stats
  };
}

function calculateOverallScore(
  fight: FightData,
  deathCascade: DeathCascade | null,
  cooldownAnalysis: CooldownAnalysisResult | null
): { score: number; grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F' } {
  let score = 100;
  
  // Penalize deaths
  const deathCount = fight.summary.deaths;
  score -= deathCount * 10;
  
  // Penalize avoidable deaths more
  if (deathCascade) {
    if (deathCascade.impact === 'critical') score -= 20;
    else if (deathCascade.impact === 'high') score -= 10;
  }
  
  // Factor in cooldown usage
  if (cooldownAnalysis) {
    score = score * 0.6 + cooldownAnalysis.overallScore * 0.4;
  }
  
  // Bonus for kill
  if (fight.kill) {
    score = Math.max(score, 70); // Minimum 70 for kills
  }
  
  // Cap score
  score = Math.max(0, Math.min(100, score));
  
  // Determine grade
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 95) grade = 'S';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';
  
  return { score: Math.round(score), grade };
}

function generateRecommendations(
  fight: FightData,
  deathCascade: DeathCascade | null,
  cooldownAnalysis: CooldownAnalysisResult | null
): string[] {
  const recommendations: string[] = [];
  
  // Death-related recommendations
  if (deathCascade) {
    recommendations.push(deathCascade.recommendation);
    
    if (!deathCascade.recoveryPossible) {
      recommendations.push('Wipe era inevitável após morte crítica. Foque em previnir esta morte.');
    }
  }
  
  // Cooldown recommendations
  if (cooldownAnalysis) {
    recommendations.push(...cooldownAnalysis.recommendations.slice(0, 2));
  }
  
  // DPS check recommendations
  if (!fight.kill && fight.bossHPPercent && fight.bossHPPercent > 20) {
    const dpsNeeded = Math.round(
      (10000000000 * (fight.bossHPPercent / 100)) / (fight.duration * (100 - fight.bossHPPercent) / 100)
    );
    recommendations.push(`DPS check: Precisa de ~${(dpsNeeded / 1000000).toFixed(1)}M mais raid DPS`);
  }
  
  // Remove duplicates and limit
  return [...new Set(recommendations)].slice(0, 5);
}

/**
 * Compare two fights for pull comparison
 */
export function compareTwoPulls(
  fight1: FightData,
  fight2: FightData,
  bossData?: BossData
): PullComparisonResult {
  return comparePulls(fight1, fight2, bossData);
}
