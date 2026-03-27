import { getMechanicByAbility, type BossData } from '@/lib/boss-data-midnight';
import { resolveBossMechanic, type BossContext } from '@/lib/boss-context';
import { getBossPhaseCriterionOverride, getBossRulePackCauseChain, getBossRulePackInsight } from '@/lib/analysis/boss-rule-engine';
import {
  diagnoseLowDPS,
  EMPTY_ASSIGNMENT_PLAN,
  extractPlanOwners,
  getExpectedDPS,
  getExpectedMechanicOccurrences,
  getPhaseAtTime,
  guessIfAvoidable,
  getTipForAbility,
  mechanicTipFromContext,
  normalizePlanLines,
  resolveBossData,
} from './log-analysis-helpers';
import type {
  AssignmentAssessment,
  AssignmentPlan,
  AssignmentPlanOverview,
  BriefInsight,
  CommandDecision,
  PhaseReadiness,
  PhaseSuccessCriterion,
} from './log-insight-types';

export interface AnalyzeLogFightParams {
  fight: any;
  historicalFights?: any[];
  assignmentPlanInput?: AssignmentPlan;
  reportFights?: any[];
}
export interface AnalysisResult {
  summary: {
    killPotential: boolean;
    whyWiped: string[];
    keyIssues: Issue[];
    fightEfficiency?: {
      actualTime: number;
      optimalTime: number;
      timeSaved: number;
      dpsLoss: number;
    };
  };
  deaths: {
    avoidable: AnalyzedDeath[];
    unavoidable: AnalyzedDeath[];
  };
  performance: {
    raidDPS: number;
    raidHPS: number;
    requiredDPS: number;
    dpsGap: number;
    lowPerformers: PerformanceIssue[];
  };
  players: PlayerStats[];
  consumables: {
    missingFlask: string[];
    missingFood: string[];
    missingPotion: string[];
    missingRune: string[];
    estimatedDPSLoss: number;
  };
  raidBuffs: RaidBuff[];
  cooldowns: {
    defensives: CooldownIssue[];
    raidCooldowns: CooldownIssue[];
  };
  talents: TalentUsage[];
  raidEfficiency?: {
    overall: number;
    dps: number;
    survival: number;
    mechanics: number;
    consumables: number;
    grade: string;
  };
  bossInsight?: {
    dpsCheckMet: boolean;
    healingIntensity: string;
    movementRequired: string;
    keyMechanics: { name: string; deaths: number; tip: string }[];
  };
  // NEW: Valuable insights
  deathCascade?: DeathCascadeAnalysis;
  causeChains?: string[];
  causeChainDetails?: {
    id: string;
    owner: string;
    phase: string;
    steps: {
      label: 'first_failure' | 'immediate_consequence' | 'failed_recovery' | 'wipe_conversion';
      text: string;
    }[];
  }[];
  cooldownGaps?: CooldownGapAnalysis[];
  burstWindows?: BurstWindowAnalysis[];
  nextPullActions?: NextPullAction[];
  pullDelta?: PullDelta;
  wipeCause?: {
    primary: 'mechanics' | 'throughput' | 'cooldown_gap' | 'mixed';
    details: string;
  };
  repeatedMistakes?: RepeatedMistake[];
  phaseCausality?: {
    phase: string;
    start: number;
    end: number;
    deaths: number;
    avoidableDeaths: number;
    dominantCause: 'mechanics' | 'throughput' | 'cooldown_gap' | 'stable';
  }[];
  phaseSuccessCriteria?: PhaseSuccessCriterion[];
  pullTrend?: {
    sampleSize: number;
    avgDeathsPrev: number;
    avgAvoidablePrev: number;
    avgDurationPrev: number;
    currentDeaths: number;
    currentAvoidableDeaths: number;
    currentDuration: number;
  };
  roleScores?: {
    tanks: number;
    healers: number;
    dps: number;
  };
  mechanicScores?: {
    mechanic: string;
    severity: 'critical' | 'warning';
    events: number;
    score: number;
  }[];
  regressionAlerts?: string[];
  bestPullChanges?: string[];
  categoryDelta?: {
    mechanics: number;
    cooldowns: number;
    throughput: number;
  };
  cooldownPlanner?: {
    at: number;
    phase: string;
    action: string;
    owner: string;
    reason: string;
  }[];
  assignmentAssessments?: AssignmentAssessment[];
  assignmentPlanOverview?: AssignmentPlanOverview;
  assignmentBreaks?: {
    owner: string;
    failure: string;
    count: number;
  }[];
  killProbability?: number;
  bossProgression?: {
    pullId: number;
    hpRemaining: number;
    duration: number;
    kill: boolean;
  }[];
  internalBenchmark?: {
    rank: number;
    total: number;
    percentile: number;
    scope: 'same_difficulty' | 'mixed_difficulty';
    difficulty?: string;
  };
  briefInsights?: BriefInsight[];
  deltaInsights?: BriefInsight[];
  playerCoaching?: BriefInsight[];
  phaseReadiness?: PhaseReadiness[];
  commandView?: CommandDecision;
}

interface NextPullAction {
  priority: 1 | 2 | 3;
  title: string;
  owner: string;
  reason: string;
}

interface PullDelta {
  comparedPullId: number;
  bossHPDelta: number;
  durationDelta: number;
  deathsDelta?: number;
  trend: 'better' | 'worse' | 'same';
  scope?: 'same_difficulty' | 'mixed_difficulty';
  comparedDifficulty?: string;
}

interface RepeatedMistake {
  player: string;
  ability: string;
  count: number;
}

// NEW: Death Cascade Analysis
interface DeathCascadeAnalysis {
  rootDeath: {
    player: string;
    role: string;
    ability: string;
    time: number;
    impact: 'critical' | 'high' | 'medium';
  };
  chainDeaths: {
    player: string;
    role: string;
    ability: string;
    time: number;
    causedByRoot: boolean;
  }[];
  timeToWipe: number;
  recoveryPossible: boolean;
  recommendation: string;
}

// NEW: Cooldown Gap Analysis
interface CooldownGapAnalysis {
  time: number;
  duration: number;
  damageTaken: number;
  availableCds: string[];
  severity: 'critical' | 'warning';
}

// NEW: Burst Window Analysis
interface BurstWindowAnalysis {
  name: string;
  startTime: number;
  duration: number;
  playersWithoutCDs: string[];
  efficiency: number;
}

interface PlayerStats {
  name: string;
  class: string;
  spec: string;
  role: 'tank' | 'healer' | 'dps';
  dps: number;
  hps: number;
  rankPercent: number;
  itemLevel: number;
  flaskUsed: boolean;
  foodUsed: boolean;
  potionUsed: boolean;
  runeUsed: boolean;
  activeTime: number;
  deaths: number;
  talents?: string[];
  avoidableDamageTaken?: number;
  dtps?: number;
  reliabilityScore?: number;
  improvementFocus?: string;
  server?: string;
}

interface TalentUsage {
  playerId: string;
  playerName: string;
  talentId: number;
  talentName: string;
  usageRate: number;
  recommendation: string;
}

interface Issue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
  player?: string;
  suggestion: string;
}

interface AnalyzedDeath {
  player: string;
  ability: string;
  time: number;
  avoidable: boolean;
  phase: string;
  tip: string;
  impact: string;
}

interface PerformanceIssue {
  player: string;
  class: string;
  expectedDPS: number;
  actualDPS: number;
  gap: number;
  reason: string;
}

interface RaidBuff {
  name: string;
  present: boolean;
  source?: string;
  missingImpact: string;
}

interface CooldownIssue {
  player: string;
  ability: string;
  expected: number;
  actual: number;
}

export interface FightData {
  id: number;
  bossName: string;
  difficulty: string;
  duration: number;
  kill: boolean;
  bossHP?: number;
}

// Format helpers
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
};
export function analyzeLogFight({ fight, historicalFights = [], assignmentPlanInput = EMPTY_ASSIGNMENT_PLAN, reportFights = [] }: AnalyzeLogFightParams): AnalysisResult {
    const players = fight.players || [];
    const bossContext = fight.bossContext as BossContext | undefined;
    const bossData = resolveBossData(fight.bossName || '');
    const fightDuration = Math.max(1, Number(fight.duration || 1));
    const timelineDeaths = fight.timeline?.filter((e: any) => e.type === 'death') || [];
    const directDeaths = Array.isArray(fight.deaths) ? fight.deaths : [];
    const deaths = timelineDeaths.length > 0 ? timelineDeaths : directDeaths;
    const currentReportFight = reportFights?.find((f) => f.id === fight.id);
    const currentDifficulty = String(fight.difficulty || currentReportFight?.difficulty || 'Unknown');
    const sameBossHistory = historicalFights
      .filter((f: any) => f?.bossName === fight.bossName && f?.id !== fight.id)
      .sort((a: any, b: any) => b.id - a.id);
    const previousSameBossPulls = reportFights
      ?.filter((f) => f.bossName === fight.bossName && f.id !== fight.id) || [];
    const sameDifficultyHistory = sameBossHistory.filter((f: any) => String(f?.difficulty || 'Unknown') === currentDifficulty);
    const sameDifficultyReportPulls = previousSameBossPulls.filter((f: any) => String(f?.difficulty || 'Unknown') === currentDifficulty);
    const comparedPoolScope: 'same_difficulty' | 'mixed_difficulty' =
      sameDifficultyHistory.length > 0 || sameDifficultyReportPulls.length > 0 ? 'same_difficulty' : 'mixed_difficulty';
    const comparedPull = [
      ...(comparedPoolScope === 'same_difficulty' ? sameDifficultyHistory : sameBossHistory),
      ...(comparedPoolScope === 'same_difficulty' ? sameDifficultyReportPulls : previousSameBossPulls),
    ]
      .sort((a: any, b: any) => {
        const aHp = a.kill ? 0 : (a.bossHPPercent ?? 100);
        const bHp = b.kill ? 0 : (b.bossHPPercent ?? 100);
        if (aHp !== bHp) return aHp - bHp;
        if ((a.duration ?? 0) !== (b.duration ?? 0)) return (a.duration ?? 0) - (b.duration ?? 0);
        return (b.id ?? 0) - (a.id ?? 0);
      })[0];
    
    // Check if we have any valid player data
    const hasValidPlayerData = players.some((p: any) => 
      (p.dps > 0) || (p.hps > 0) || (p.totalDamage > 0) || (p.totalHealing > 0)
    );
    
    // If no valid data, return early with appropriate indicators
    if (!hasValidPlayerData && players.length > 0) {
      console.warn('[ANALYSIS] No valid player data found - returning N/A state');
    }
    
    const playerStats: PlayerStats[] = players.map((player: any) => {
      const derivedDps = Number(player.dps || 0) > 0
        ? Number(player.dps)
        : Math.round(Number(player.totalDamage || 0) / fightDuration);
      const derivedHps = Number(player.hps || 0) > 0
        ? Number(player.hps)
        : Math.round(Number(player.totalHealing || 0) / fightDuration);
      const normalizedActiveTime = Number(player.activeTime || 0) > 1
        ? Number(player.activeTime)
        : Math.round(Number(player.activeTime || 0) * 100);
      const missingConsumablesPenalty = (player.flaskUsed ? 0 : 5) + (player.foodUsed ? 0 : 5) + (player.potionUsed ? 0 : 5) + (player.runeUsed ? 0 : 3);
      const reliabilityScore = Math.max(
        0,
        Math.min(
          100,
          100
          - ((player.deaths || 0) * 20)
          - Math.max(0, 95 - (normalizedActiveTime || 95))
          - missingConsumablesPenalty
          - Math.min(20, Math.floor((player.avoidableDamagePercent || player.avoidableDamageTaken || 0) / 5))
        )
      );

      return {
      name: player.name,
      class: player.class,
      spec: player.spec,
      role: player.role,
      dps: derivedDps,
      hps: derivedHps,
      rankPercent: player.rankPercent || 0,
      itemLevel: player.itemLevel || 480,
      server: player.server || 'unknown',
      flaskUsed: player.flaskUsed ?? true,
      foodUsed: player.foodUsed ?? true,
      potionUsed: player.potionUsed ?? true,
      runeUsed: player.runeUsed ?? false,
      activeTime: normalizedActiveTime || 95,
      deaths: player.deaths || 0,
      dtps: player.dtps || 0,
      avoidableDamageTaken: player.avoidableDamageTaken || player.avoidableDamagePercent || 0,
      reliabilityScore,
      improvementFocus: diagnoseLowDPS(player),
      };
    });

    const avoidableDeaths: AnalyzedDeath[] = [];
    const unavoidableDeaths: AnalyzedDeath[] = [];
    
    deaths.forEach((death: any) => {
      const abilityName = death.ability || 'Unknown';
      const contextMechanic = resolveBossMechanic(abilityName, bossContext);
      const isAvoidable = contextMechanic
        ? ['avoidable', 'positioning', 'interrupt', 'soak'].includes(contextMechanic.type)
        : bossData
          ? ['avoidable', 'positioning', 'interrupt', 'soak'].includes(getMechanicByAbility(abilityName, bossData)?.type || '')
          : guessIfAvoidable(abilityName);
      const analyzed: AnalyzedDeath = {
        player: death.target || 'Unknown',
        ability: abilityName,
        time: death.time,
        avoidable: isAvoidable,
        phase: getPhaseAtTime(death.time, fight.duration),
        tip: mechanicTipFromContext(abilityName, bossContext, bossData),
        impact: death.time > fight.duration * 0.7 ? 'high' : death.time > fight.duration * 0.4 ? 'medium' : 'low',
      };
      if (isAvoidable) avoidableDeaths.push(analyzed);
      else unavoidableDeaths.push(analyzed);
    });

    const repeatedMistakesMap = new Map<string, { occurrences: number; pulls: Set<number | string> }>();
    const registerAvoidableDeath = (player: string, ability: string, pullId: number | string) => {
      const key = `${player}::${ability}`;
      const entry = repeatedMistakesMap.get(key) || { occurrences: 0, pulls: new Set<number | string>() };
      entry.occurrences += 1;
      entry.pulls.add(pullId);
      repeatedMistakesMap.set(key, entry);
    };

    avoidableDeaths.forEach((death) => {
      registerAvoidableDeath(death.player, death.ability, fight.id);
    });

    historicalFights
      .filter((f: any) => f?.bossName === fight.bossName)
      .slice(0, 5)
      .forEach((historicalFight: any) => {
        const historicalDeaths = (historicalFight.timeline || []).filter((e: any) => e.type === 'death');
        historicalDeaths.forEach((death: any) => {
          const ability = death.ability || 'Unknown';
          const player = death.target || death.playerName || 'Unknown';
          if (guessIfAvoidable(ability)) {
            registerAvoidableDeath(player, ability, historicalFight.id ?? 'unknown');
          }
        });
      });

    const repeatedMistakes: RepeatedMistake[] = Array.from(repeatedMistakesMap.entries())
      .filter(([, value]) => value.pulls.size >= 2)
      .map(([key, value]) => {
        const [player, ability] = key.split('::');
        return { player, ability, count: value.occurrences };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // NEW: Generate Death Cascade Analysis
    const deathCascade = generateDeathCascade(deaths, players, fight);

    const dpsPlayersSorted = [...playerStats]
      .filter((p) => p.role === 'dps')
      .sort((a, b) => b.dps - a.dps);
    dpsPlayersSorted.forEach((p, idx) => {
      if (!p.rankPercent || p.rankPercent <= 0) {
        p.rankPercent = Math.round((1 - idx / Math.max(1, dpsPlayersSorted.length - 1)) * 100);
      }
    });

    const lowPerformers: PerformanceIssue[] = [];
    let totalDPS = 0;
    let totalHPS = 0;
    
    players.forEach((player: any) => {
      const effectiveDps = Number(player.dps || 0) > 0
        ? Number(player.dps)
        : Math.round(Number(player.totalDamage || 0) / fightDuration);
      const effectiveHps = Number(player.hps || 0) > 0
        ? Number(player.hps)
        : Math.round(Number(player.totalHealing || 0) / fightDuration);
      totalDPS += effectiveDps;
      totalHPS += effectiveHps;
      const expectedDPS = getExpectedDPS(player.spec || player.class);
      if (effectiveDps < expectedDPS * 0.8 && player.role === 'dps') {
        lowPerformers.push({
          player: player.name,
          class: player.class,
          expectedDPS,
          actualDPS: effectiveDps,
          gap: expectedDPS - effectiveDps,
          reason: diagnoseLowDPS(player),
        });
      }
    });

    const missingFlask: string[] = [];
    const missingFood: string[] = [];
    const missingPotion: string[] = [];
    const missingRune: string[] = [];
    let estimatedDPSLoss = 0;

    players.forEach((player: any) => {
      if (!player.flaskUsed) { missingFlask.push(player.name); estimatedDPSLoss += 50000; }
      if (!player.foodUsed) { missingFood.push(player.name); estimatedDPSLoss += 25000; }
      if (!player.potionUsed) { missingPotion.push(player.name); estimatedDPSLoss += 80000; }
      if (!player.runeUsed) { missingRune.push(player.name); estimatedDPSLoss += 30000; }
    });

    const presentClasses = new Set(players.map((p: any) => p.class));
    const raidBuffs: RaidBuff[] = [
      { name: 'Bloodlust', present: presentClasses.has('Shaman') || presentClasses.has('Mage') || presentClasses.has('Evoker'), source: players.find((p: any) => ['Shaman', 'Mage', 'Evoker'].includes(p.class))?.name, missingImpact: '+30% haste' },
      { name: 'Fortitude', present: presentClasses.has('Priest'), source: players.find((p: any) => p.class === 'Priest')?.name, missingImpact: '+10% stamina' },
      { name: 'Battle Shout', present: presentClasses.has('Warrior'), source: players.find((p: any) => p.class === 'Warrior')?.name, missingImpact: '+10% AP' },
      { name: 'Arcane Intellect', present: presentClasses.has('Mage'), source: players.find((p: any) => p.class === 'Mage')?.name, missingImpact: '+10% intellect' },
      { name: 'Mark of the Wild', present: presentClasses.has('Druid'), source: players.find((p: any) => p.class === 'Druid')?.name, missingImpact: '+5% stats' },
      { name: 'Chaos Brand', present: presentClasses.has('Demon Hunter'), source: players.find((p: any) => p.class === 'Demon Hunter')?.name, missingImpact: '+5% magic dmg' },
      { name: 'Mystic Touch', present: presentClasses.has('Monk'), source: players.find((p: any) => p.class === 'Monk')?.name, missingImpact: '+5% phys dmg' },
    ];

    const expectedRaidDps = Math.max(
      1,
      players
        .filter((p: any) => p.role === 'dps')
        .reduce((sum: number, p: any) => sum + getExpectedDPS(p.spec || p.class), 0)
    );
    const optimalTime = expectedRaidDps > 0 ? Math.floor((expectedRaidDps * fightDuration) / Math.max(1, totalDPS)) : fightDuration;
    const timeSaved = fight.duration - optimalTime;

    const whyWiped: string[] = [];
    let fightEfficiency: { actualTime: number; optimalTime: number; timeSaved: number; dpsLoss: number } | undefined;

    if (!fight.kill) {
      if (deathCascade && deathCascade.rootDeath) {
        whyWiped.push(`${deathCascade.rootDeath.player} died early at ${formatTime(deathCascade.rootDeath.time)}, starting the collapse.`);
      }
      if (fight.bossHPPercent && fight.bossHPPercent > 20) whyWiped.push(`Boss still had ${fight.bossHPPercent}% HP remaining.`);
      if (estimatedDPSLoss > 300000) whyWiped.push(`Roughly ${formatNumber(estimatedDPSLoss)} DPS was lost to prep gaps.`);
      if (lowPerformers.length > 2) whyWiped.push(`${lowPerformers.length} players were below the expected output.`);
      if (whyWiped.length === 0) whyWiped.push('The pull was close. Small execution fixes should convert it.');
    } else {
      fightEfficiency = {
        actualTime: fight.duration,
        optimalTime: Math.max(30, optimalTime),
        timeSaved: Math.max(0, timeSaved),
        dpsLoss: estimatedDPSLoss,
      };
    }

    // Calculate DPS score - based on how much of required DPS was met
    // A good raid should meet or exceed required DPS
    const dpsRatio = totalDPS / expectedRaidDps;
    const dpsScore = Math.min(100, Math.max(0, Math.floor(dpsRatio * 100)));
    
    // Survival score - based on deaths (0 deaths = 100, each death reduces)
    const totalDeaths = deaths.length;
    const survivalScore = Math.max(0, 100 - totalDeaths * 10);
    
    // Mechanics score - based on avoidable deaths (each avoidable death reduces more)
    const mechanicsScore = Math.max(0, 100 - avoidableDeaths.length * 15);
    
    // Consumables score - based on how many players are missing consumables
    const missingConsumablesCount = missingFlask.length + missingFood.length + missingPotion.length + missingRune.length;
    const consumablesScore = Math.max(0, 100 - (missingConsumablesCount * 3));
    
    // Overall score - weighted average
    const overallScore = Math.floor(dpsScore * 0.35 + survivalScore * 0.30 + mechanicsScore * 0.25 + consumablesScore * 0.10);
    const averageReliability = playerStats.length > 0
      ? Math.floor(playerStats.reduce((sum, p) => sum + (p.reliabilityScore || 0), 0) / playerStats.length)
      : 0;
    
    // Grade based on overall score
    let grade = 'C';
    if (overallScore >= 95) grade = 'S';
    else if (overallScore >= 85) grade = 'A';
    else if (overallScore >= 70) grade = 'B';
    else if (overallScore >= 55) grade = 'C';
    else if (overallScore >= 40) grade = 'D';
    else grade = 'F';

    const keyIssues: Issue[] = [];
    avoidableDeaths.slice(0, 3).forEach((death) => {
      keyIssues.push({
        type: 'death',
        severity: death.impact === 'high' ? 'critical' : 'warning',
        message: `${death.player} died to ${death.ability}`,
        details: `At ${formatTime(death.time)} (${death.phase})`,
        player: death.player,
        suggestion: death.tip,
      });
    });

    // NEW: Generate Cooldown Gap Analysis
    const cooldownGaps = generateCooldownGaps(fight, players);

    // NEW: Generate Burst Window Analysis
    const burstWindows = generateBurstWindows(fight, players);

    const comparedPullDeaths = (comparedPull as any)?.summary?.deaths;
    const currentDeaths = fight.summary?.deaths;
    const pullDelta: PullDelta | undefined = comparedPull && currentReportFight ? {
      comparedPullId: comparedPull.id,
      bossHPDelta: (comparedPull.bossHPPercent ?? 100) - (currentReportFight.bossHPPercent ?? 100),
      durationDelta: currentReportFight.duration - comparedPull.duration,
      deathsDelta: typeof currentDeaths === 'number' && typeof comparedPullDeaths === 'number'
        ? currentDeaths - comparedPullDeaths
        : undefined,
      trend: (currentReportFight.bossHPPercent ?? 100) < (comparedPull.bossHPPercent ?? 100) ? 'better'
        : (currentReportFight.bossHPPercent ?? 100) > (comparedPull.bossHPPercent ?? 100) ? 'worse'
        : 'same',
      scope: comparedPoolScope,
      comparedDifficulty: comparedPull?.difficulty,
    } : undefined;

    const wipeCause: AnalysisResult['wipeCause'] = (() => {
      if (fight.kill) return { primary: 'mixed', details: 'The pull ended in a kill.' };
      if (cooldownGaps.length >= 2) return { primary: 'cooldown_gap', details: 'High-damage events landed without reliable raid-cooldown coverage.' };
      if (avoidableDeaths.length >= Math.max(2, deaths.length * 0.5)) return { primary: 'mechanics', details: 'Avoidable mechanics are driving too many deaths.' };
      if (lowPerformers.length >= 3 || (fight.bossHPPercent ?? 100) > 20) return { primary: 'throughput', details: 'Effective damage and healing stayed below what the checkpoint required.' };
      return { primary: 'mixed', details: 'The wipe came from a mix of execution, throughput, and timing issues.' };
    })();

    const topAvoidableAbility = (() => {
      const abilityCounts = new Map<string, { count: number; players: Set<string> }>();
      avoidableDeaths.forEach((death) => {
        const key = death.ability || 'Unknown mechanic';
        const entry = abilityCounts.get(key) || { count: 0, players: new Set<string>() };
        entry.count += 1;
        entry.players.add(death.player);
        abilityCounts.set(key, entry);
      });
      return Array.from(abilityCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)[0];
    })();

    const healerNames = playerStats
      .filter((p) => p.role === 'healer')
      .map((p) => p.name)
      .slice(0, 2);

    const topThroughputPlayers = lowPerformers
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2)
      .map((p) => p.player);

    const nextPullActions: NextPullAction[] = [
      {
        priority: 1,
        title: topAvoidableAbility
          ? `Fix mechanic: ${topAvoidableAbility[0]}`
          : 'Stabilize the early pull with zero avoidable deaths',
        owner: topAvoidableAbility
          ? Array.from(topAvoidableAbility[1].players).slice(0, 3).join(', ')
          : 'Raid',
        reason: topAvoidableAbility
          ? `${topAvoidableAbility[1].count} avoidable deaths were tied to this mechanic.`
          : 'No single mechanic dominated the wipe, so consistency is the next gain.',
      },
      {
        priority: 2,
        title: cooldownGaps.length > 0
          ? `Cover the raid-CD gap at ${formatTime(cooldownGaps[0].time)}`
          : 'Align raid healing CDs with the biggest damage events',
        owner: healerNames.length > 0 ? healerNames.join(', ') : 'Healers + RL',
        reason: cooldownGaps.length > 0
          ? `${cooldownGaps.length} uncovered raid-CD windows were detected.`
          : 'This prevents raid HP from collapsing in dangerous windows.',
      },
      {
        priority: 3,
        title: topThroughputPlayers.length > 0
          ? `Clean up throughput for ${topThroughputPlayers.join(' + ')}`
          : 'Optimize uptime and burst windows',
        owner: topThroughputPlayers.length > 0 ? topThroughputPlayers.join(', ') : 'DPS Core',
        reason: lowPerformers.length > 0
          ? `Estimated total gap of ${formatNumber(lowPerformers.slice(0, 2).reduce((sum, p) => sum + p.gap, 0))} DPS across the main underperformers.`
          : 'This is the next incremental gain toward a kill.',
      },
    ];

    const explicitPhases = (fight.timeline || [])
      .filter((e: any) => e.type === 'phase' && typeof e.time === 'number')
      .sort((a: any, b: any) => a.time - b.time);

    const phaseBoundaries = explicitPhases.length > 0
      ? explicitPhases.map((phaseEvent: any, index: number) => ({
          label: phaseEvent.description || `P${index + 1}`,
          start: phaseEvent.time,
          end: explicitPhases[index + 1]?.time ?? fight.duration,
        }))
      : bossData?.phases && bossData.phases.length > 0
        ? bossData.phases.map((phase, index) => ({
            label: phase.name,
            start: Math.floor((fight.duration / bossData.phases.length) * index),
            end: Math.floor((fight.duration / bossData.phases.length) * (index + 1)) || fight.duration,
          }))
        : [
            { label: 'P1', start: 0, end: Math.floor(fight.duration / 3) },
            { label: 'P2', start: Math.floor(fight.duration / 3), end: Math.floor((fight.duration * 2) / 3) },
            { label: 'P3', start: Math.floor((fight.duration * 2) / 3), end: fight.duration },
          ];

    const phaseCausality = phaseBoundaries.map((phase) => {
      const phaseDeaths = deaths.filter((d: any) => (d.time || 0) >= phase.start && (d.time || 0) < phase.end);
      const phaseAvoidable = phaseDeaths.filter((d: any) => guessIfAvoidable(String(d.ability || 'Unknown')));
      const phaseGaps = cooldownGaps.filter((g) => g.time >= phase.start && g.time < phase.end);
      const dominantCause: 'mechanics' | 'throughput' | 'cooldown_gap' | 'stable' =
        phaseAvoidable.length >= 2
          ? 'mechanics'
          : phaseGaps.length > 0
            ? 'cooldown_gap'
            : (phaseDeaths.length > 0 && lowPerformers.length >= 2)
              ? 'throughput'
              : 'stable';

      return {
        phase: phase.label,
        start: phase.start,
        end: phase.end,
        deaths: phaseDeaths.length,
        avoidableDeaths: phaseAvoidable.length,
        dominantCause,
      };
    });

    const lastFiveSameBoss = sameBossHistory.slice(0, 5);
    const historicalMetrics = lastFiveSameBoss.map((f: any) => {
      const timelineDeaths = (f.timeline || []).filter((e: any) => e.type === 'death');
      const directDeaths = Array.isArray(f.deaths) ? f.deaths : [];
      const fDeaths = timelineDeaths.length > 0 ? timelineDeaths : directDeaths;
      const fAvoidable = fDeaths.filter((d: any) => guessIfAvoidable(String(d.ability || 'Unknown')));
      return {
        deaths: Number(f.summary?.deaths ?? fDeaths.length ?? 0),
        avoidable: fAvoidable.length,
        duration: Number(f.duration || 0),
        hasTimeline: timelineDeaths.length > 0,
      };
    });

    const historicalMetricsWithSignal = historicalMetrics.filter((m) =>
      m.deaths > 0 || m.avoidable > 0 || m.duration > 0 || m.hasTimeline
    );

    const pullTrend = historicalMetricsWithSignal.length > 0
      ? {
          sampleSize: historicalMetricsWithSignal.length,
          avgDeathsPrev: Math.round((historicalMetricsWithSignal.reduce((s, m) => s + m.deaths, 0) / historicalMetricsWithSignal.length) * 10) / 10,
          avgAvoidablePrev: Math.round((historicalMetricsWithSignal.reduce((s, m) => s + m.avoidable, 0) / historicalMetricsWithSignal.length) * 10) / 10,
          avgDurationPrev: Math.round(historicalMetricsWithSignal.reduce((s, m) => s + m.duration, 0) / historicalMetricsWithSignal.length),
          currentDeaths: Number(fight.summary?.deaths || deaths.length || 0),
          currentAvoidableDeaths: avoidableDeaths.length,
          currentDuration: Number(fight.duration || 0),
        }
      : undefined;

    const scoreRoleGroup = (role: 'tank' | 'healer' | 'dps') => {
      const rolePlayers = playerStats.filter((p) => p.role === role);
      if (rolePlayers.length === 0) return 0;
      const avgReliability = rolePlayers.reduce((s, p) => s + (p.reliabilityScore || 0), 0) / rolePlayers.length;
      const deathsPenalty = rolePlayers.reduce((s, p) => s + (p.deaths || 0), 0) * 6;
      return Math.max(0, Math.min(100, Math.round(avgReliability - deathsPenalty)));
    };

    const roleScoresRaw = {
      tanks: scoreRoleGroup('tank'),
      healers: scoreRoleGroup('healer'),
      dps: scoreRoleGroup('dps'),
    };
    const roleScores = Object.values(roleScoresRaw).some((score) => score > 0)
      ? roleScoresRaw
      : undefined;

    const dominantPhase = phaseCausality
      .slice()
      .sort((a, b) => {
        const scoreA = a.avoidableDeaths * 3 + a.deaths * 2 + (a.dominantCause !== 'stable' ? 1 : 0);
        const scoreB = b.avoidableDeaths * 3 + b.deaths * 2 + (b.dominantCause !== 'stable' ? 1 : 0);
        return scoreB - scoreA;
      })[0];

    const phaseLabelFor = (time?: number) => {
      if (typeof time !== 'number') return dominantPhase?.phase || 'Full Fight';
      const explicit = phaseCausality.find((phase) => time >= phase.start && time < phase.end);
      return explicit?.phase || dominantPhase?.phase || 'Full Fight';
    };

    const getPhaseWindow = (phaseName: string) =>
      phaseBoundaries.find((phase) => phase.label === phaseName) || phaseBoundaries[0] || { label: 'Full Fight', start: 0, end: fight.duration };

    const getPhaseBossMechanics = (phaseName: string) => {
      const phase = bossData?.phases.find((entry) => entry.name === phaseName);
      if (!phase || !bossData) return [];
      return phase.mechanics
        .map((mechanicId) => bossData.mechanics.find((mechanic) => mechanic.id === mechanicId))
        .filter(Boolean) as BossData['mechanics'];
    };

    const mechanicScores = (() => {
      const map = new Map<string, number>();
      avoidableDeaths.forEach((death) => {
        map.set(death.ability, (map.get(death.ability) || 0) + 1);
      });
      const interruptCount = (fight.timeline || []).filter((e: any) => e.type === 'interrupt').length;
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([mechanic, events]) => ({
          mechanic,
          events,
          severity: events >= 3 ? 'critical' as const : 'warning' as const,
          score: Math.max(0, 100 - events * 18),
        }))
        .concat([
          {
            mechanic: 'Interrupts',
            events: interruptCount,
            severity: interruptCount === 0 ? 'critical' as const : 'warning' as const,
            score: Math.min(100, interruptCount * 10),
          },
        ]);
    })();

    const regressionAlerts = (() => {
      if (historicalMetrics.length < 3) return [];
      const recent3 = historicalMetrics.slice(0, 3);
      const avgRecentDeaths = recent3.reduce((s, m) => s + m.deaths, 0) / recent3.length;
      const avgRecentAvoidable = recent3.reduce((s, m) => s + m.avoidable, 0) / recent3.length;
      const alerts: string[] = [];
      if ((fight.summary?.deaths || deaths.length) > avgRecentDeaths + 1) {
        alerts.push(`Death regression: current ${(fight.summary?.deaths || deaths.length)} vs recent average ${avgRecentDeaths.toFixed(1)}.`);
      }
      if (avoidableDeaths.length > avgRecentAvoidable + 1) {
        alerts.push(`Mechanic regression: current avoidable deaths ${avoidableDeaths.length} vs recent average ${avgRecentAvoidable.toFixed(1)}.`);
      }
      if (!fight.kill && (fight.bossHPPercent ?? 100) > 20 && historicalFights.some((f: any) => f?.bossName === fight.bossName && f?.kill)) {
        alerts.push('A previous kill exists on this boss, but the current pull regressed to a high-HP wipe.');
      }
      return alerts.slice(0, 3);
    })();

    const bestPullChanges = (() => {
      const comparisonPool = !fight.kill
        ? sameBossHistory.filter((f: any) => !f.kill)
        : sameBossHistory;
      const bestFight = comparisonPool
        .slice()
        .sort((a: any, b: any) => {
          const aHp = a.kill ? 0 : (a.bossHPPercent ?? 100);
          const bHp = b.kill ? 0 : (b.bossHPPercent ?? 100);
          if (aHp !== bHp) return aHp - bHp;
          return (a.duration ?? 0) - (b.duration ?? 0);
        })[0];

      if (!bestFight) return [];

      const bestDeaths = Number(bestFight.summary?.deaths || (bestFight.timeline || []).filter((e: any) => e.type === 'death').length || 0);
      const currentDeathsCount = Number(fight.summary?.deaths || deaths.length || 0);
      const bestAvoidable = (bestFight.timeline || [])
        .filter((e: any) => e.type === 'death' && guessIfAvoidable(e.ability || 'Unknown')).length;

      const changes: string[] = [];
      if (currentDeathsCount > bestDeaths) {
        changes.push(`+${currentDeathsCount - bestDeaths} deaths vs best pull (#${bestFight.id}).`);
      } else if (currentDeathsCount < bestDeaths) {
        changes.push(`-${bestDeaths - currentDeathsCount} deaths vs best pull (#${bestFight.id}).`);
      }

      if (avoidableDeaths.length > bestAvoidable) {
        changes.push(`+${avoidableDeaths.length - bestAvoidable} avoidable deaths vs best pull.`);
      } else if (avoidableDeaths.length < bestAvoidable) {
        changes.push(`-${bestAvoidable - avoidableDeaths.length} avoidable deaths vs best pull.`);
      }

      if ((fight.duration || 0) > (bestFight.duration || 0)) {
        changes.push(`This pull was ${fight.duration - bestFight.duration}s slower than the best pull.`);
      } else if ((fight.duration || 0) < (bestFight.duration || 0)) {
        changes.push(`This pull was ${bestFight.duration - fight.duration}s faster than the best pull.`);
      }

      return changes.slice(0, 4);
    })();

    const categoryDelta = (() => {
      if (!comparedPull) return undefined;
      const comparisonTimelineDeaths = (comparedPull.timeline || []).filter((e: any) => e.type === 'death');
      const comparisonDeaths = comparisonTimelineDeaths.length > 0 ? comparisonTimelineDeaths : (Array.isArray(comparedPull.deaths) ? comparedPull.deaths : []);
      const comparisonAvoidable = comparisonDeaths.filter((d: any) => guessIfAvoidable(String(d.ability || 'Unknown'))).length;
      const comparisonCooldowns = generateCooldownGaps(comparedPull, comparedPull.players || []).length;
      const comparisonLowPerformers = (comparedPull.players || []).filter((player: any) => {
        const effectiveDps = Number(player.dps || 0) > 0
          ? Number(player.dps)
          : Math.round(Number(player.totalDamage || 0) / Math.max(1, Number(comparedPull.duration || 1)));
        return player.role === 'dps' && effectiveDps < getExpectedDPS(player.spec || player.class) * 0.8;
      }).length;

      return {
        mechanics: avoidableDeaths.length - comparisonAvoidable,
        cooldowns: cooldownGaps.length - comparisonCooldowns,
        throughput: lowPerformers.length - comparisonLowPerformers,
      };
    })();

    const cooldownPlanner = (() => {
      const entries = cooldownGaps
        .slice(0, 5)
        .map((gap) => {
          const phase = phaseCausality.find((p) => gap.time >= p.start && gap.time < p.end);
          return {
            at: gap.time,
            phase: phase?.phase || 'Unknown',
            action: gap.severity === 'critical' ? 'Use a major raid defensive' : 'Cover this event with a healing CD',
            owner: healerNames.length > 0 ? healerNames.join(', ') : 'Healers + RL',
            reason: `${Math.round(gap.damageTaken / 1000)}k damage landed without coverage.`,
          };
        });
      return entries;
    })();

    const phaseSuccessCriteria = (() => {
      return phaseBoundaries.map((phase) => {
        const phaseDeaths = deaths.filter((d: any) => (d.time || 0) >= phase.start && (d.time || 0) < phase.end);
        const phaseAvoidable = phaseDeaths.filter((d: any) => guessIfAvoidable(String(d.ability || 'Unknown')));
        const phaseGaps = cooldownGaps.filter((g) => g.time >= phase.start && g.time < phase.end);
        const phaseMechanics = getPhaseBossMechanics(phase.label);
        const criticalMechanics = phaseMechanics.filter((mechanic) => ['raid_cd', 'interrupt', 'soak'].includes(mechanic.type));
        const baselineStatus: 'met' | 'at_risk' | 'missed' =
          phaseAvoidable.length >= 2 || phaseGaps.length >= 2
            ? 'missed'
            : phaseAvoidable.length === 1 || phaseGaps.length === 1 || phaseDeaths.length > 0 || (criticalMechanics.length > 0 && (phaseAvoidable.length > 0 || phaseGaps.length > 0))
              ? 'at_risk'
              : 'met';
        const baselineSummary = baselineStatus === 'met'
          ? `${phase.label} met the minimum execution bar.`
          : baselineStatus === 'at_risk'
            ? `${phase.label} is close, but still leaks execution.`
            : `${phase.label} is below the minimum progression bar.`;
        const baselineEvidence = baselineStatus === 'met'
          ? `No major avoidable failures or raid-CD gaps were detected. ${phaseMechanics.length > 0 ? `Key mechanics covered: ${phaseMechanics.slice(0, 3).map((mechanic) => mechanic.name).join(', ')}.` : ''}`.trim()
          : `Deaths: ${phaseDeaths.length}, avoidable: ${phaseAvoidable.length}, raid-CD gaps: ${phaseGaps.length}.${phaseMechanics.length > 0 ? ` Key mechanics in this phase: ${phaseMechanics.slice(0, 3).map((mechanic) => mechanic.name).join(', ')}.` : ''}`;
        const bossOverride = getBossPhaseCriterionOverride({
          bossData,
          phaseName: phase.label,
          phaseDeaths: phaseDeaths.length,
          phaseAvoidable: phaseAvoidable.length,
          phaseGaps: phaseGaps.length,
          phaseMechanics,
          assignmentAssessments: [],
          fightKill: fight.kill,
        });
        const status = bossOverride?.status || baselineStatus;
        const summary = bossOverride?.summary || baselineSummary;
        const evidence = bossOverride?.evidence || baselineEvidence;

        return {
          phase: phase.label,
          status,
          summary,
          evidence,
        };
      });
    })();

    const phaseReadiness = (() => {
      return phaseSuccessCriteria.map((phaseCriterion) => {
        const phaseSignal = phaseCausality.find((phase) => phase.phase === phaseCriterion.phase);
        const phaseMechanics = getPhaseBossMechanics(phaseCriterion.phase);
        const bossOverride = getBossPhaseCriterionOverride({
          bossData,
          phaseName: phaseCriterion.phase,
          phaseDeaths: phaseSignal?.deaths || 0,
          phaseAvoidable: phaseSignal?.avoidableDeaths || 0,
          phaseGaps: cooldownGaps.filter((gap) => gap.time >= (phaseSignal?.start || 0) && gap.time < (phaseSignal?.end || fight.duration)).length,
          phaseMechanics,
          assignmentAssessments: [],
          fightKill: fight.kill,
        });
        const status: PhaseReadiness['status'] =
          phaseCriterion.status === 'met'
            ? 'ready'
            : phaseCriterion.status === 'at_risk'
              ? 'close'
              : 'not_ready';
        const blocker = bossOverride?.blocker || (phaseSignal
          ? phaseSignal.dominantCause === 'cooldown_gap'
            ? 'Raid cooldown timing is still the main risk.'
            : phaseSignal.dominantCause === 'throughput'
              ? 'The raid still needs more stable output here.'
              : phaseSignal.dominantCause === 'mechanics'
                ? 'Repeated mechanic failures are still breaking this phase.'
                : 'Execution is stable enough to keep progressing.'
          : phaseCriterion.summary);
        const owner = phaseSignal?.dominantCause === 'cooldown_gap'
          ? 'Healers + RL'
          : phaseSignal?.dominantCause === 'throughput'
            ? 'DPS Core'
            : phaseSignal?.dominantCause === 'mechanics'
              ? 'Raid'
              : 'Raid';

        return {
          phase: phaseCriterion.phase,
          status,
          summary: phaseCriterion.summary,
          blocker,
          owner,
        };
      });
    })();

    const assignmentAssessments = (() => {
      const plannedInterruptOwners = extractPlanOwners(assignmentPlanInput.interrupts);
      const plannedSoakOwners = extractPlanOwners(assignmentPlanInput.soaks);
      const plannedDispelOwners = extractPlanOwners(assignmentPlanInput.dispels);
      const plannedInterruptLines = normalizePlanLines(assignmentPlanInput.interrupts);
      const plannedSoakLines = normalizePlanLines(assignmentPlanInput.soaks);
      const plannedDispelLines = normalizePlanLines(assignmentPlanInput.dispels);
      const plannedCooldownOwners = extractPlanOwners(assignmentPlanInput.raidCooldowns);
      const plannedTankOwners = extractPlanOwners(assignmentPlanInput.tankAssignments);
      const plannedCooldownLines = normalizePlanLines(assignmentPlanInput.raidCooldowns);
      const mechanics = (bossContext?.mechanics || []).filter((mechanic) =>
        ['interrupt', 'soak', 'dispel', 'raid_cd', 'tank_swap'].includes(mechanic.type)
      );
      const uniqueMechanics = Array.from(
        mechanics.reduce((map, mechanic) => {
          if (!map.has(mechanic.name)) {
            map.set(mechanic.name, mechanic);
          }
          return map;
        }, new Map<string, typeof mechanics[number]>()).values()
      );

      const teamInterrupts = players.reduce((sum: number, player: any) => sum + Number(player.interruptions || 0), 0);
      const teamDispels = players.reduce((sum: number, player: any) => sum + Number(player.dispels || 0), 0);
      const tankNames = playerStats.filter((player) => player.role === 'tank').map((player) => player.name);

      const assessments = uniqueMechanics.map((mechanic) => {
        const lowerName = mechanic.name.toLowerCase();
        const avoidableMatches = avoidableDeaths.filter((death) => death.ability.toLowerCase().includes(lowerName) || lowerName.includes(death.ability.toLowerCase()));
        const repeatedMatches = repeatedMistakes.filter((mistake) => mistake.ability.toLowerCase().includes(lowerName) || lowerName.includes(mistake.ability.toLowerCase()));
        const matchedPhase = phaseLabelFor(avoidableMatches[0]?.time);
        const failureCount = avoidableMatches.length + repeatedMatches.reduce((sum, mistake) => sum + mistake.count, 0);

        if (mechanic.type === 'interrupt') {
          const phaseWindow = getPhaseWindow(matchedPhase);
          const expectedOccurrences = getExpectedMechanicOccurrences(mechanic, phaseWindow);
          const hasPlanLine = plannedInterruptLines.some((line) => {
            const lowerLine = line.toLowerCase();
            return lowerLine.includes(lowerName) || lowerLine.includes(matchedPhase.toLowerCase());
          });
          const hasExplicitOwners = plannedInterruptOwners.length > 0;
          const assigned = hasExplicitOwners
            ? plannedInterruptOwners
            : playerStats
                .filter((player) => player.role === 'dps')
                .sort((a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0))
                .slice(0, 3)
                .map((player) => player.name);
          const missedAssigned = hasExplicitOwners ? assigned.filter((name) => {
            const player = players.find((entry: any) => entry.name === name);
            return !player || Number(player.interruptions || 0) === 0;
          }) : [];
          const status: AssignmentAssessment['status'] = failureCount > 0 || missedAssigned.length > 0
            ? 'failing'
            : teamInterrupts === 0 || !hasPlanLine || (expectedOccurrences > 1 && teamInterrupts < Math.max(1, Math.floor(expectedOccurrences / 2)))
              ? 'at_risk'
              : 'covered';
          return {
            id: `assignment-interrupt-${mechanic.id}`,
            category: 'interrupt' as const,
            status,
            owner: assigned.join(', ') || 'Assigned interrupters',
            phase: matchedPhase,
            mechanic: mechanic.name,
            evidence: failureCount > 0
              ? `${failureCount} missed or repeated interrupt-related failures tied to ${mechanic.name}.`
              : missedAssigned.length > 0
                ? `Planned interrupters with no kicks recorded: ${missedAssigned.join(', ')}.`
                : `${teamInterrupts} total interrupts recorded on this pull.${expectedOccurrences > 0 ? ` Expected roughly ${expectedOccurrences} in ${matchedPhase}.` : ''}${hasPlanLine ? '' : ' No matching interrupt line is defined in the plan.'}`,
            confidenceReasons: [
              failureCount > 0 ? `${failureCount} mechanic-linked failures were detected.` : undefined,
              missedAssigned.length > 0 ? `Planned interrupters missing execution: ${missedAssigned.join(', ')}.` : undefined,
              teamInterrupts > 0 ? `${teamInterrupts} total interrupts were logged in the pull.` : undefined,
              expectedOccurrences > 0 ? `The boss data expects roughly ${expectedOccurrences} casts in this phase.` : undefined,
              !hasPlanLine ? 'No interrupt plan line matches this mechanic or phase.' : undefined,
            ].filter(Boolean) as string[],
            recommendation: mechanic.tip || 'Assign a fixed interrupt rotation and call backup kicks before pull.',
            confidence: failureCount > 0 || missedAssigned.length > 0 ? 'high' : teamInterrupts === 0 ? 'medium' : 'low',
          };
        }

        if (mechanic.type === 'soak') {
          const phaseWindow = getPhaseWindow(matchedPhase);
          const expectedOccurrences = getExpectedMechanicOccurrences(mechanic, phaseWindow);
          const hasPlanLine = plannedSoakLines.some((line) => {
            const lowerLine = line.toLowerCase();
            return lowerLine.includes(lowerName) || lowerLine.includes(matchedPhase.toLowerCase());
          });
          const status: AssignmentAssessment['status'] = failureCount > 0
            ? 'failing'
            : (!hasPlanLine || plannedSoakOwners.length === 0) && (avoidableDeaths.length > 0 || expectedOccurrences > 0)
              ? 'at_risk'
              : 'covered';
          return {
            id: `assignment-soak-${mechanic.id}`,
            category: 'soak' as const,
            status,
            owner: plannedSoakOwners.join(', ') || 'Assigned soakers',
            phase: matchedPhase,
            mechanic: mechanic.name,
            evidence: failureCount > 0
                ? `${failureCount} soak failures linked to ${mechanic.name}.`
                : plannedSoakOwners.length === 0 || !hasPlanLine
                ? `The soak plan is incomplete for ${mechanic.name}.${expectedOccurrences > 0 ? ` Expected roughly ${expectedOccurrences} soak event(s) in ${matchedPhase}.` : ''}`
                : 'No direct soak failures were detected on this pull.',
            confidenceReasons: [
              failureCount > 0 ? `${failureCount} soak-related failures were detected.` : undefined,
              plannedSoakOwners.length === 0 ? 'No soak owners are defined in the assignment plan.' : undefined,
              plannedSoakOwners.length > 0 ? `Plan includes soakers: ${plannedSoakOwners.join(', ')}.` : undefined,
              expectedOccurrences > 0 ? `The boss data expects roughly ${expectedOccurrences} soak event(s) in this phase.` : undefined,
              !hasPlanLine ? 'No soak plan line matches this mechanic or phase.' : undefined,
            ].filter(Boolean) as string[],
            recommendation: mechanic.tip || 'Pre-assign soak groups and force personals on contact.',
            confidence: failureCount > 0 ? 'high' : plannedSoakOwners.length === 0 ? 'medium' : 'low',
          };
        }

        if (mechanic.type === 'dispel') {
          const hasPlanLine = plannedDispelLines.some((line) => {
            const lowerLine = line.toLowerCase();
            return lowerLine.includes(lowerName) || lowerLine.includes(matchedPhase.toLowerCase());
          });
          const hasExplicitOwners = plannedDispelOwners.length > 0;
          const assigned = hasExplicitOwners ? plannedDispelOwners : healerNames;
          const missedAssigned = hasExplicitOwners ? assigned.filter((name) => {
            const player = players.find((entry: any) => entry.name === name);
            return !player || Number(player.dispels || 0) === 0;
          }) : [];
          const status: AssignmentAssessment['status'] = failureCount > 0 || missedAssigned.length > 0
            ? 'failing'
            : teamDispels === 0 || !hasPlanLine
              ? 'at_risk'
              : 'covered';
          return {
            id: `assignment-dispel-${mechanic.id}`,
            category: 'dispel' as const,
            status,
            owner: assigned.join(', ') || 'Dispellers',
            phase: matchedPhase,
            mechanic: mechanic.name,
            evidence: failureCount > 0
                ? `${failureCount} dispel-related failures linked to ${mechanic.name}.`
                : missedAssigned.length > 0
                  ? `Planned dispellers with no dispels recorded: ${missedAssigned.join(', ')}.`
                : `${teamDispels} total dispels recorded on this pull.${hasPlanLine ? '' : ' No matching dispel line is defined in the plan.'}`,
            confidenceReasons: [
              failureCount > 0 ? `${failureCount} dispel-linked failures were detected.` : undefined,
              missedAssigned.length > 0 ? `Planned dispellers missing execution: ${missedAssigned.join(', ')}.` : undefined,
              teamDispels > 0 ? `${teamDispels} total dispels were logged in the pull.` : undefined,
              !hasPlanLine ? 'No dispel plan line matches this mechanic or phase.' : undefined,
            ].filter(Boolean) as string[],
            recommendation: mechanic.tip || 'Assign primary and backup dispellers before pull.',
            confidence: failureCount > 0 || missedAssigned.length > 0 ? 'high' : teamDispels === 0 ? 'medium' : 'low',
          };
        }

        if (mechanic.type === 'tank_swap') {
          const tankFailures = avoidableMatches.filter((death) => tankNames.includes(death.player)).length;
          const assigned = plannedTankOwners.length > 0 ? plannedTankOwners : tankNames;
          const status: AssignmentAssessment['status'] = tankFailures > 0
            ? 'failing'
            : assignmentPlanInput.tankAssignments.trim().length === 0
              ? 'at_risk'
              : (playerStats.filter((player) => player.role === 'tank').reduce((sum, player) => sum + player.deaths, 0) > 0 ? 'at_risk' : 'covered');
          return {
            id: `assignment-tanks-${mechanic.id}`,
            category: 'tank_swap' as const,
            status,
            owner: assigned.join(', ') || 'Tanks',
            phase: matchedPhase,
            mechanic: mechanic.name,
            evidence: tankFailures > 0
              ? `${tankFailures} tank death(s) or direct failures tied to ${mechanic.name}.`
              : assignmentPlanInput.tankAssignments.trim().length === 0
                ? 'No explicit tank swap or external plan is defined.'
                : 'No direct tank-swap failure was detected on this pull.',
            confidenceReasons: [
              tankFailures > 0 ? `${tankFailures} tank-linked failures were detected.` : undefined,
              assignmentPlanInput.tankAssignments.trim().length === 0 ? 'No explicit tank assignment plan is saved.' : undefined,
              assigned.length > 0 ? `Planned tank owners: ${assigned.join(', ')}.` : undefined,
            ].filter(Boolean) as string[],
            recommendation: mechanic.tip || 'Review swap timing and assign externals before the danger window.',
            confidence: tankFailures > 0 ? 'high' : assignmentPlanInput.tankAssignments.trim().length === 0 ? 'medium' : 'low',
          };
        }

        const phaseWindow = getPhaseWindow(matchedPhase);
        const expectedOccurrences = getExpectedMechanicOccurrences(mechanic, phaseWindow);
        const gap = cooldownGaps[0];
        const relevantPhaseNames = phaseBoundaries
          .filter((phase) => {
            const mechanics = getPhaseBossMechanics(phase.label);
            return mechanics.some((phaseMechanic) => phaseMechanic.name.toLowerCase() === lowerName || phaseMechanic.id === mechanic.id);
          })
          .map((phase) => phase.label.toLowerCase());
        const hasPlanLine = plannedCooldownLines.some((line) => {
          const lowerLine = line.toLowerCase();
          return lowerLine.includes(lowerName) || relevantPhaseNames.some((phaseName) => lowerLine.includes(phaseName));
        });
        const assigned = plannedCooldownOwners.length > 0 ? plannedCooldownOwners : healerNames;
        const status: AssignmentAssessment['status'] = cooldownGaps.length > 0
          ? (gap.severity === 'critical' || !hasPlanLine ? 'failing' : 'at_risk')
          : (fight.kill ? 'covered' : (plannedCooldownLines.length === 0 || (expectedOccurrences > 1 && plannedCooldownLines.length < expectedOccurrences) ? 'at_risk' : 'covered'));
        return {
          id: `assignment-raidcd-${mechanic.id}`,
          category: 'raid_cd' as const,
          status,
          owner: plannedCooldownOwners.length > 0 ? assigned.join(', ') : 'Healers + RL',
          phase: gap ? phaseLabelFor(gap.time) : matchedPhase,
          mechanic: mechanic.name,
          evidence: gap
            ? `${Math.round(gap.damageTaken / 1000)}k damage landed at ${formatTime(gap.time)} without full raid-cooldown coverage.${hasPlanLine ? '' : ' No matching raid-CD assignment is defined for this event.'}`
            : plannedCooldownLines.length === 0
              ? `No raid-cooldown plan is defined for this boss.${expectedOccurrences > 0 ? ` Expected roughly ${expectedOccurrences} coverage event(s) in ${matchedPhase}.` : ''}`
              : 'No critical raid-cooldown gap was detected on this pull.',
          confidenceReasons: [
            gap ? `A damage spike was detected at ${formatTime(gap.time)}.` : undefined,
            !hasPlanLine && plannedCooldownLines.length > 0 ? `No planned raid CD line matched ${mechanic.name}.` : undefined,
            plannedCooldownLines.length === 0 ? 'No raid cooldown plan is saved for this boss.' : undefined,
            expectedOccurrences > 0 ? `The boss data expects roughly ${expectedOccurrences} raid-CD windows in this phase.` : undefined,
          ].filter(Boolean) as string[],
          recommendation: mechanic.tip || 'Attach a named raid cooldown to this boss event in the pull plan.',
          confidence: gap || plannedCooldownLines.length === 0 ? 'high' : 'medium',
        };
      });

      return assessments
        .sort((a, b) => {
          const statusWeight = { failing: 3, at_risk: 2, covered: 1 };
          return statusWeight[b.status] - statusWeight[a.status];
        })
        .slice(0, 6);
    })();

    const assignmentPlanOverview = (() => {
      const categoryOrder: Array<{
        key: 'interrupt' | 'soak' | 'dispel' | 'raid_cd' | 'tank_swap';
        label: string;
        value: string;
      }> = [
        { key: 'interrupt', label: 'Interrupts', value: assignmentPlanInput.interrupts },
        { key: 'soak', label: 'Soaks', value: assignmentPlanInput.soaks },
        { key: 'dispel', label: 'Dispels', value: assignmentPlanInput.dispels },
        { key: 'raid_cd', label: 'Raid CDs', value: assignmentPlanInput.raidCooldowns },
        { key: 'tank_swap', label: 'Tank swaps', value: assignmentPlanInput.tankAssignments },
      ];
      const requiredCategories = new Set(
        (bossContext?.mechanics || [])
          .filter((mechanic) => ['interrupt', 'soak', 'dispel', 'raid_cd', 'tank_swap'].includes(mechanic.type))
          .map((mechanic) => mechanic.type as 'interrupt' | 'soak' | 'dispel' | 'raid_cd' | 'tank_swap')
      );
      const categories = categoryOrder.map((category) => {
        const assessments = assignmentAssessments.filter((assessment) => assessment.category === category.key);
        const execution: 'failing' | 'at_risk' | 'covered' | 'not_applicable' =
          assessments.some((assessment) => assessment.status === 'failing')
            ? 'failing'
            : assessments.some((assessment) => assessment.status === 'at_risk')
              ? 'at_risk'
              : assessments.some((assessment) => assessment.status === 'covered')
                ? 'covered'
                : 'not_applicable';
        const required = requiredCategories.has(category.key);
        const hasPlan = category.value.trim().length > 0;
        const summary = !required
          ? 'Not a key assignment category for this boss.'
          : !hasPlan
            ? 'No explicit plan saved.'
            : execution === 'failing'
              ? 'Planned, but execution still broke.'
              : execution === 'at_risk'
                ? 'Planned, but still not stable enough.'
                : 'Planned and covered well enough.';

        return {
          key: category.key,
          label: category.label,
          required,
          hasPlan,
          execution,
          summary,
        };
      });
      const requiredCategoryCount = categories.filter((category) => category.required).length;
      const explicitCategoryCount = categories.filter((category) => category.required && category.hasPlan).length;
      const missingCategories = categories.filter((category) => category.required && !category.hasPlan).map((category) => category.label);
      const failingCount = categories.filter((category) => category.execution === 'failing').length;
      const atRiskCount = categories.filter((category) => category.execution === 'at_risk').length;
      const status: AssignmentPlanOverview['status'] =
        requiredCategoryCount === 0
          ? 'ready'
          : explicitCategoryCount === 0
            ? 'missing'
            : explicitCategoryCount < requiredCategoryCount
              ? 'partial'
              : 'ready';
      const coverage: AssignmentPlanOverview['coverage'] =
        failingCount > 0
          ? 'weak'
          : atRiskCount > 0 || missingCategories.length > 0
            ? 'mixed'
            : 'strong';
      const summary = requiredCategoryCount === 0
        ? 'This boss does not need a heavy assignment plan.'
        : `${explicitCategoryCount}/${requiredCategoryCount} key assignment categories are explicitly planned.`;
      const recommendation = missingCategories.length > 0
        ? `Add explicit plan lines for ${missingCategories.join(', ')} before the next pull.`
        : coverage === 'weak'
          ? 'The plan exists, but execution is still failing. Tighten ownership and callouts.'
          : coverage === 'mixed'
            ? 'The plan is partly usable, but still needs clearer ownership on risky mechanics.'
            : 'The plan is in good shape. Focus on execution, not more planning.';

      return {
        status,
        coverage,
        explicitCategoryCount,
        requiredCategoryCount,
        missingCategories,
        categories,
        summary,
        recommendation,
      };
    })();

    const assignmentBreaks = (() => {
      const breaks = new Map<string, { owner: string; failure: string; count: number }>();

      const addBreak = (owner: string, failure: string) => {
        const key = `${owner}::${failure}`;
        const current = breaks.get(key) || { owner, failure, count: 0 };
        current.count += 1;
        breaks.set(key, current);
      };

      // repeated avoidable deaths = likely assignment execution break
      repeatedMistakes.forEach((m) => {
        addBreak(m.player, `Repeated failure on ${m.ability}`);
      });

      // interrupt events are expected in many fights; detect players with zero interrupts among DPS/melee
      const interrupters = new Set(
        (fight.timeline || [])
          .filter((e: any) => e.type === 'interrupt' && (e.source || e.sourceName))
          .map((e: any) => e.source || e.sourceName)
      );
      playerStats
        .filter((p) => p.role === 'dps')
        .slice(0, 8)
        .forEach((p) => {
          if (!interrupters.has(p.name)) {
            addBreak(p.name, 'No interrupts recorded on this pull');
          }
        });

      assignmentAssessments
        .filter((assessment) => assessment.status !== 'covered')
        .forEach((assessment) => {
          addBreak(assessment.owner, `${assessment.mechanic}: ${assessment.evidence}`);
        });

      return Array.from(breaks.values()).sort((a, b) => b.count - a.count).slice(0, 6);
    })();

    const killProbability = (() => {
      const hpRemaining = fight.bossHPPercent ?? (fight.kill ? 0 : 100);
      const deathPenalty = Math.min(35, (fight.summary?.deaths || deaths.length || 0) * 3);
      const avoidablePenalty = Math.min(30, avoidableDeaths.length * 4);
      const cooldownPenalty = Math.min(20, cooldownGaps.length * 5);
      const base = fight.kill ? 100 : Math.max(0, 100 - hpRemaining);
      return Math.max(0, Math.min(100, Math.round(base - deathPenalty - avoidablePenalty - cooldownPenalty + (fight.kill ? 0 : 20))));
    })();

    const bossProgression = (() => {
      if (!reportFights || !fight?.bossName) return [];
      return reportFights
        .filter((f) => f.bossName === fight.bossName)
        .sort((a, b) => a.id - b.id)
        .map((f) => ({
          pullId: f.id,
          hpRemaining: f.kill ? 0 : (f.bossHPPercent ?? 100),
          duration: f.duration,
          kill: f.kill,
        }));
    })();

    const internalBenchmark = (() => {
      if (!bossProgression.length || !currentReportFight) return undefined;
      const sameDifficultyBossProgression = bossProgression.filter((p) => {
        const sourceFight = reportFights.find((f) => f.id === p.pullId);
        return String(sourceFight?.difficulty || 'Unknown') === currentDifficulty;
      });
      const benchmarkPool = sameDifficultyBossProgression.length > 0 ? sameDifficultyBossProgression : bossProgression;
      const scope: 'same_difficulty' | 'mixed_difficulty' = sameDifficultyBossProgression.length > 0 ? 'same_difficulty' : 'mixed_difficulty';
      const sorted = [...benchmarkPool].sort((a, b) => {
        if (a.hpRemaining !== b.hpRemaining) return a.hpRemaining - b.hpRemaining;
        return a.duration - b.duration;
      });
      const idx = sorted.findIndex((p) => p.pullId === currentReportFight.id);
      if (idx === -1) return undefined;
      const rank = idx + 1;
      const total = sorted.length;
      const percentile = Math.round((1 - idx / Math.max(1, total - 1)) * 100);
      return { rank, total, percentile, scope, difficulty: currentDifficulty };
    })();

    const getMechanicOwner = (abilityName: string, fallbackPlayers: string[] = []) => {
      const mechanic = resolveBossMechanic(abilityName, bossContext) || (bossData ? getMechanicByAbility(abilityName, bossData) : undefined);
      const lower = abilityName.toLowerCase();
      const tanks = playerStats.filter((player) => player.role === 'tank').map((player) => player.name);
      const healers = playerStats.filter((player) => player.role === 'healer').map((player) => player.name);

      switch (mechanic?.type) {
        case 'tank_swap':
          return tanks.join(', ') || 'Tanks';
        case 'raid_cd':
          return healers.join(', ') || 'Healers + RL';
        case 'interrupt':
          return fallbackPlayers.join(', ') || 'Assigned interrupters';
        case 'soak':
          return fallbackPlayers.join(', ') || 'Assigned soakers';
        case 'dispel':
          return healers.join(', ') || 'Dispellers';
        case 'positioning':
          return fallbackPlayers.join(', ') || 'Raid';
        default:
          break;
      }

      if (lower.includes('cleave') || lower.includes('swap') || lower.includes('bite') || lower.includes('slam')) {
        return tanks.join(', ') || 'Tanks';
      }
      if (lower.includes('blast') || lower.includes('decree') || lower.includes('soak') || lower.includes('mist')) {
        return healers.join(', ') || 'Healers + RL';
      }
      return fallbackPlayers.join(', ') || 'Assigned players';
    };

    const getMechanicRecommendation = (abilityName: string, phaseName?: string) => {
      const mechanic = resolveBossMechanic(abilityName, bossContext) || (bossData ? getMechanicByAbility(abilityName, bossData) : undefined);
      if (mechanic?.tip) return mechanic.tip;

      const phaseTips = bossContext?.phases.find((phase) => phase.name === phaseName)?.tips
        || bossData?.phases.find((phase) => phase.name === phaseName)?.tips
        || [];
      if (phaseTips.length > 0) {
        return phaseTips[0];
      }

      const lower = abilityName.toLowerCase();
      if (lower.includes('interrupt')) return 'Tighten interrupt assignments and call the order before pull.';
      if (lower.includes('soak') || lower.includes('orb')) return 'Pre-assign soaks and make the assignment visible before pull.';
      if (lower.includes('decree') || lower.includes('mark')) return 'Use fixed positions and pre-calls instead of reactive movement.';
      if (lower.includes('blast') || lower.includes('burst')) return 'Map a raid defensive or healing cooldown to this timestamp.';
      if (lower.includes('cleave') || lower.includes('swap') || lower.includes('bite')) return 'Review tank assignment, swap timing, and external coverage.';
      return `Make ${abilityName} a named callout with clear ownership before next pull.`;
    };

    const getSeverityWeight = (severity: BriefInsight['severity']) =>
      severity === 'critical' ? 100 : severity === 'warning' ? 65 : 35;

    const getConfidenceWeight = (confidence: BriefInsight['confidence']) =>
      confidence === 'high' ? 20 : confidence === 'medium' ? 10 : 0;

    const briefInsights: BriefInsight[] = [];

    if (topAvoidableAbility) {
      const [abilityName, abilityData] = topAvoidableAbility;
      const severity: BriefInsight['severity'] = abilityData.count >= 3 ? 'critical' : 'warning';
      const confidence: BriefInsight['confidence'] = abilityData.count >= 3 ? 'high' : 'medium';
      const phaseName = phaseLabelFor(avoidableDeaths.find((death) => death.ability === abilityName)?.time);
      const mechanic = bossData ? getMechanicByAbility(abilityName, bossData) : undefined;
      briefInsights.push({
        id: `mechanics-${abilityName}`,
        kind: mechanic?.type === 'interrupt' || mechanic?.type === 'soak' || mechanic?.type === 'dispel'
          ? 'raid_assignment'
          : 'player_execution',
        severity,
        confidence,
        priorityScore: getSeverityWeight(severity) + getConfidenceWeight(confidence) + abilityData.count * 6,
        owner: getMechanicOwner(abilityName, Array.from(abilityData.players).slice(0, 3)),
        phase: phaseName,
        summary: `${abilityName} is the main repeated ${mechanic?.type || 'execution'} failure.`,
        evidence: `${abilityData.count} avoidable death(s) tied to this mechanic on this pull.${mechanic?.warning ? ` ${mechanic.warning}` : ''}`,
        confidenceReasons: [
          `${abilityData.count} avoidable deaths were linked to ${abilityName}.`,
          phaseName ? `The failures cluster in ${phaseName}.` : undefined,
          mechanic?.warning || undefined,
        ].filter(Boolean) as string[],
        recommendation: getMechanicRecommendation(abilityName, phaseName),
        category: 'mechanics',
      });
    }

    if (cooldownGaps.length > 0) {
      const gap = cooldownGaps[0];
      const severity: BriefInsight['severity'] = gap.severity === 'critical' ? 'critical' : 'warning';
      const confidence: BriefInsight['confidence'] = gap.damageTaken > 2000000 ? 'high' : 'medium';
      briefInsights.push({
        id: `cooldown-gap-${gap.time}`,
        kind: 'raid_cooldown',
        severity,
        confidence,
        priorityScore: getSeverityWeight(severity) + getConfidenceWeight(confidence) + Math.min(30, Math.round(gap.damageTaken / 250000)),
        owner: healerNames.length > 0 ? healerNames.join(', ') : 'Healers + RL',
        phase: phaseLabelFor(gap.time),
        summary: `Raid cooldown coverage is missing around ${formatTime(gap.time)}.`,
        evidence: `${Math.round(gap.damageTaken / 1000)}k damage landed during a ${gap.duration}s uncovered window.`,
        confidenceReasons: [
          `${Math.round(gap.damageTaken / 1000)}k damage landed in the uncovered window.`,
          gap.availableCds.length > 0 ? `Available CDs detected: ${gap.availableCds.slice(0, 2).join(', ')}.` : 'No available raid CDs were detected in the window.',
          `The gap lasted ${gap.duration}s.`,
        ],
        recommendation: gap.availableCds.length > 0
          ? `Assign ${gap.availableCds.slice(0, 2).join(' or ')} for this damage event.`
          : 'Assign a major raid defensive or healing cooldown for this damage event.',
        category: 'cooldowns',
      });
    }

    const topAssignmentFailure = assignmentAssessments.find((assessment) => assessment.status === 'failing')
      || (!fight.kill ? assignmentAssessments.find((assessment) => assessment.status === 'at_risk') : undefined);

    if (topAssignmentFailure) {
      const severity: BriefInsight['severity'] = topAssignmentFailure.status === 'failing' ? 'critical' : 'warning';
      const confidence: BriefInsight['confidence'] = topAssignmentFailure.confidence;
      briefInsights.push({
        id: `assignment-${topAssignmentFailure.id}`,
        kind: 'raid_assignment',
        severity,
        confidence,
        priorityScore: getSeverityWeight(severity) + getConfidenceWeight(confidence) + (topAssignmentFailure.status === 'failing' ? 24 : 12),
        owner: topAssignmentFailure.owner,
        phase: topAssignmentFailure.phase,
        summary: `${topAssignmentFailure.mechanic} needs a clearer assignment plan.`,
        evidence: topAssignmentFailure.evidence,
        confidenceReasons: topAssignmentFailure.confidenceReasons,
        recommendation: topAssignmentFailure.recommendation,
        category: topAssignmentFailure.category === 'raid_cd' ? 'cooldowns' : 'strategy',
      });
    }

    const bossRuleInsight = getBossRulePackInsight({
      bossData,
      assignmentAssessments,
      cooldownGaps,
      phaseLabelFor,
      dominantPhase,
      healerNames,
      fightKill: fight.kill,
    });

    if (bossRuleInsight) {
      briefInsights.push(bossRuleInsight);
    }

    if (lowPerformers.length > 0) {
      const throughputGap = lowPerformers.slice(0, 2);
      const severity: BriefInsight['severity'] = fight.kill ? 'info' : ((fight.bossHPPercent ?? 100) > 20 ? 'critical' : 'warning');
      const confidence: BriefInsight['confidence'] = throughputGap.length >= 2 ? 'medium' : 'low';
      const totalGap = throughputGap.reduce((sum, player) => sum + player.gap, 0);
      briefInsights.push({
        id: 'throughput-gap',
        kind: 'player_execution',
        severity,
        confidence,
        priorityScore: getSeverityWeight(severity) + getConfidenceWeight(confidence) + Math.min(25, Math.round(totalGap / 80000)),
        owner: throughputGap.map((player) => player.player).join(', ') || 'DPS Core',
        phase: dominantPhase?.phase || 'Full Fight',
        summary: 'Throughput is below the level needed for a clean progression pull.',
        evidence: `${formatNumber(totalGap)} estimated DPS gap across the biggest underperformers.`,
        confidenceReasons: [
          `${throughputGap.length} low performers are driving the gap.`,
          `${formatNumber(totalGap)} total estimated DPS is missing from the top offenders.`,
          dominantPhase?.phase ? `The throughput pressure is most relevant in ${dominantPhase.phase}.` : undefined,
        ].filter(Boolean) as string[],
        recommendation: 'Review uptime, potion usage, and burst alignment before the next pull.',
        category: 'throughput',
      });
    }

    if (!fight.kill && dominantPhase && dominantPhase.dominantCause !== 'stable') {
      const severity: BriefInsight['severity'] = dominantPhase.avoidableDeaths >= 2 ? 'critical' : 'warning';
      const confidence: BriefInsight['confidence'] = dominantPhase.deaths >= 2 ? 'high' : 'medium';
      const phaseTips = bossData?.phases.find((phase) => phase.name === dominantPhase.phase)?.tips || [];
      const commonMistake = bossContext?.commonMistakes[0] || bossData?.commonMistakes[0];
      briefInsights.push({
        id: `phase-${dominantPhase.phase}`,
        kind: 'raid_strategy',
        severity,
        confidence,
        priorityScore: getSeverityWeight(severity) + getConfidenceWeight(confidence) + dominantPhase.deaths * 8 + dominantPhase.avoidableDeaths * 10,
        owner: dominantPhase.dominantCause === 'cooldown_gap' ? (healerNames.join(', ') || 'Healers + RL') : 'Raid',
        phase: dominantPhase.phase,
        summary: `${dominantPhase.phase} is the progression breakpoint for this pull.`,
        evidence: `${dominantPhase.deaths} death(s), ${dominantPhase.avoidableDeaths} avoidable death(s), dominant cause: ${dominantPhase.dominantCause}.`,
        confidenceReasons: [
          `${dominantPhase.deaths} deaths occurred in ${dominantPhase.phase}.`,
          `${dominantPhase.avoidableDeaths} of those deaths were avoidable.`,
          `The dominant cause for the phase is ${dominantPhase.dominantCause}.`,
        ],
        recommendation: phaseTips[0] || commonMistake || `Focus raid call and assignments around ${dominantPhase.phase} before expanding to lower-impact optimizations.`,
        category: 'strategy',
      });
    }

    const normalizedBriefInsights = Array.from(
      briefInsights.reduce((map, insight) => {
        const dedupeKey = `${insight.kind}::${insight.category}::${insight.phase}`;
        const existing = map.get(dedupeKey);
        if (!existing || insight.priorityScore > existing.priorityScore) {
          map.set(dedupeKey, insight);
        }
        return map;
      }, new Map<string, BriefInsight>()).values()
    )
      .sort((a, b) => {
        return b.priorityScore - a.priorityScore;
      })
      .slice(0, 4);

    const deltaInsights: BriefInsight[] = [];
    if (pullDelta) {
      const improved = pullDelta.trend === 'better';
      const severity: BriefInsight['severity'] = improved ? 'info' : 'warning';
      const confidence: BriefInsight['confidence'] = 'high';
      deltaInsights.push({
        id: `delta-${pullDelta.comparedPullId}`,
        kind: 'raid_strategy',
        severity,
        confidence,
        priorityScore: getSeverityWeight(severity) + getConfidenceWeight(confidence) + Math.abs(pullDelta.bossHPDelta) * 2,
        owner: 'Raid',
        phase: dominantPhase?.phase || 'Full Fight',
        summary: improved
          ? `This pull improved versus Pull #${pullDelta.comparedPullId}.`
          : `This pull regressed versus Pull #${pullDelta.comparedPullId}.`,
        evidence: `HP delta ${pullDelta.bossHPDelta >= 0 ? '-' : '+'}${Math.abs(pullDelta.bossHPDelta)}%, time delta ${pullDelta.durationDelta > 0 ? '+' : ''}${pullDelta.durationDelta}s, deaths ${typeof pullDelta.deathsDelta === 'number' ? (pullDelta.deathsDelta > 0 ? '+' : '') + pullDelta.deathsDelta : 'N/A'}.`,
        confidenceReasons: [
          `Comparison pull: #${pullDelta.comparedPullId}.`,
          pullDelta.scope === 'same_difficulty'
            ? `Comparison stayed on the same difficulty (${currentDifficulty}).`
            : `No same-difficulty comparison was available, so this delta used mixed-difficulty history.`,
          `Boss HP delta: ${pullDelta.bossHPDelta >= 0 ? '-' : '+'}${Math.abs(pullDelta.bossHPDelta)}%.`,
          `Time delta: ${pullDelta.durationDelta > 0 ? '+' : ''}${pullDelta.durationDelta}s.`,
        ],
        recommendation: improved
          ? 'Keep the same plan and remove the highest-priority mistake next.'
          : 'Review what changed from the better pull before making new strategy changes.',
        category: 'strategy',
      });
    }

    if (categoryDelta) {
      const categoryMessages = [
        { key: 'mechanics' as const, label: 'Mechanics', value: categoryDelta.mechanics },
        { key: 'cooldowns' as const, label: 'Raid CDs', value: categoryDelta.cooldowns },
        { key: 'throughput' as const, label: 'Throughput', value: categoryDelta.throughput },
      ];

      categoryMessages
        .filter((item) => item.value !== 0)
        .slice(0, 3)
        .forEach((item) => {
          const improved = item.value < 0;
          const severity: BriefInsight['severity'] = improved ? 'info' : 'warning';
          deltaInsights.push({
            id: `delta-category-${item.key}`,
            kind: item.key === 'cooldowns' ? 'raid_cooldown' : item.key === 'throughput' ? 'player_execution' : 'raid_strategy',
            severity,
            confidence: 'medium',
            priorityScore: getSeverityWeight(severity) + Math.abs(item.value) * 8,
            owner: item.key === 'cooldowns' ? (healerNames.join(', ') || 'Healers + RL') : 'Raid',
            phase: dominantPhase?.phase || 'Full Fight',
            summary: improved
              ? `${item.label} improved versus the comparison pull.`
              : `${item.label} regressed versus the comparison pull.`,
            evidence: `${item.label} delta: ${item.value > 0 ? '+' : ''}${item.value}.`,
            confidenceReasons: [
              `Compared against Pull #${pullDelta?.comparedPullId}.`,
              `${item.label} delta measured from the same-boss comparison pull.`,
            ],
            recommendation: improved
              ? 'Keep the same plan in this area and clean up the next bottleneck.'
              : `Review ${item.label.toLowerCase()} changes before changing the whole strategy.`,
            category: item.key === 'throughput' ? 'throughput' : item.key === 'cooldowns' ? 'cooldowns' : 'strategy',
          });
        });
    }

    const classifyDpsArchetype = (player: PlayerStats) => {
      const meleeSpecs = new Set([
        'Fury', 'Arms', 'Frost', 'Unholy', 'Retribution', 'Enhancement', 'Outlaw', 'Assassination',
        'Subtlety', 'Havoc', 'Windwalker', 'Feral', 'Survival',
      ]);
      const rangedSpecs = new Set([
        'Fire', 'Arcane', 'Frost Mage', 'Marksmanship', 'Beast Mastery', 'Balance', 'Shadow',
        'Affliction', 'Destruction', 'Demonology', 'Elemental', 'Devastation', 'Augmentation',
      ]);
      if (meleeSpecs.has(player.spec)) return 'melee';
      if (rangedSpecs.has(player.spec)) return 'ranged';
      const meleeClasses = new Set(['Warrior', 'Rogue', 'Death Knight', 'Demon Hunter', 'Monk']);
      return meleeClasses.has(player.class) ? 'melee' : 'ranged';
    };

    const repeatedMistakeByPlayer = repeatedMistakes.reduce((map, mistake) => {
      const current = map.get(mistake.player);
      if (!current || mistake.count > current.count) {
        map.set(mistake.player, mistake);
      }
      return map;
    }, new Map<string, RepeatedMistake>());

    const playerCoaching: BriefInsight[] = [];

    const tankFailure = assignmentAssessments.find((assessment) => assessment.category === 'tank_swap' && assessment.status !== 'covered');
    const tanks = playerStats.filter((player) => player.role === 'tank');
    const tankDeaths = tanks.filter((player) => player.deaths > 0);
    if (tankFailure || tankDeaths.length > 0) {
      const mainTankIssue = tankDeaths.sort((a, b) => (b.deaths - a.deaths) || ((a.reliabilityScore || 0) - (b.reliabilityScore || 0)))[0];
      playerCoaching.push({
        id: 'coach-role-tank',
        kind: 'raid_assignment',
        severity: tankFailure || tankDeaths.length >= 2 ? 'critical' : 'warning',
        confidence: 'high',
        priorityScore: 112 + tankDeaths.length * 10,
        owner: tankFailure?.owner || mainTankIssue?.name || tanks.map((tank) => tank.name).join(', ') || 'Tanks',
        phase: tankFailure?.phase || dominantPhase?.phase || 'Full Fight',
        summary: tankFailure
          ? 'Tank swap and external timing still need cleanup.'
          : 'Tank stability is still costing the raid recoveries.',
        evidence: tankFailure
          ? tankFailure.evidence
          : `${tankDeaths.length} tank death(s) were recorded on this pull.${mainTankIssue ? ` ${mainTankIssue.name} died ${mainTankIssue.deaths} time(s).` : ''}`,
        confidenceReasons: [
          tankFailure ? 'A tank-assignment failure was detected in the pull.' : undefined,
          tankDeaths.length > 0 ? `${tankDeaths.length} tank death(s) were recorded.` : undefined,
          mainTankIssue ? `${mainTankIssue.name} reliability score: ${mainTankIssue.reliabilityScore}.` : undefined,
        ].filter(Boolean) as string[],
        recommendation: tankFailure?.recommendation || 'Clean the taunt swap, pre-call externals, and make the tank plan explicit before pull.',
        category: 'strategy',
      });
    }

    const healers = playerStats.filter((player) => player.role === 'healer');
    const weakHealer = healers
      .slice()
      .sort((a, b) => ((b.deaths - a.deaths) * 20) + ((a.activeTime || 100) - (b.activeTime || 100)))[0];
    if (cooldownGaps.length > 0 || (weakHealer && (weakHealer.deaths > 0 || weakHealer.activeTime < 90))) {
      playerCoaching.push({
        id: 'coach-role-healer',
        kind: 'raid_cooldown',
        severity: cooldownGaps.length > 0 ? 'critical' : 'warning',
        confidence: 'high',
        priorityScore: 108 + cooldownGaps.length * 10,
        owner: healerNames.join(', ') || weakHealer?.name || 'Healers + RL',
        phase: cooldownGaps[0] ? phaseLabelFor(cooldownGaps[0].time) : (dominantPhase?.phase || 'Full Fight'),
        summary: cooldownGaps.length > 0
          ? 'Healer CDs and recovery timing are still the weak link.'
          : 'Healer stability still needs cleanup before the raid can recover cleanly.',
        evidence: cooldownGaps.length > 0
          ? `${cooldownGaps.length} uncovered healing window(s) were detected.${weakHealer ? ` ${weakHealer.name} was at ${weakHealer.activeTime}% active time.` : ''}`
          : `${weakHealer?.name || 'A healer'} was at ${weakHealer?.activeTime || 0}% active time with ${weakHealer?.deaths || 0} death(s).`,
        confidenceReasons: [
          cooldownGaps.length > 0 ? `${cooldownGaps.length} raid damage window(s) landed without enough coverage.` : undefined,
          weakHealer ? `${weakHealer.name} active time: ${weakHealer.activeTime}%.` : undefined,
          weakHealer && weakHealer.deaths > 0 ? `${weakHealer.name} died ${weakHealer.deaths} time(s).` : undefined,
        ].filter(Boolean) as string[],
        recommendation: cooldownGaps.length > 0
          ? `Fix the healer CD map first${cooldownGaps[0] ? ` around ${formatTime(cooldownGaps[0].time)}` : ''}, then clean triage and positioning.`
          : 'Keep healers alive longer, reduce movement waste, and stabilize ramp timing before the next pull.',
        category: 'cooldowns',
      });
    }

    const utilityFailure = assignmentAssessments.find((assessment) =>
      ['interrupt', 'dispel'].includes(assessment.category) && assessment.status !== 'covered'
    );
    if (utilityFailure) {
      playerCoaching.push({
        id: `coach-role-utility-${utilityFailure.category}`,
        kind: 'raid_assignment',
        severity: utilityFailure.status === 'failing' ? 'critical' : 'warning',
        confidence: utilityFailure.confidence,
        priorityScore: 104 + (utilityFailure.status === 'failing' ? 20 : 8),
        owner: utilityFailure.owner,
        phase: utilityFailure.phase,
        summary: utilityFailure.category === 'interrupt'
          ? 'Utility players are still losing control of key casts.'
          : 'Dispel ownership is still too loose for this phase.',
        evidence: utilityFailure.evidence,
        confidenceReasons: utilityFailure.confidenceReasons,
        recommendation: utilityFailure.recommendation,
        category: 'strategy',
      });
    }

    const meleeCandidate = playerStats
      .filter((player) => player.role === 'dps' && classifyDpsArchetype(player) === 'melee')
      .sort((a, b) => {
        const repeatedA = repeatedMistakeByPlayer.get(a.name)?.count || 0;
        const repeatedB = repeatedMistakeByPlayer.get(b.name)?.count || 0;
        return (repeatedB * 25 + b.deaths * 15 + Math.max(0, 90 - b.activeTime)) - (repeatedA * 25 + a.deaths * 15 + Math.max(0, 90 - a.activeTime));
      })[0];
    if (meleeCandidate && ((meleeCandidate.activeTime || 0) < 89 || meleeCandidate.deaths > 0 || repeatedMistakeByPlayer.has(meleeCandidate.name))) {
      const repeated = repeatedMistakeByPlayer.get(meleeCandidate.name);
      playerCoaching.push({
        id: `coach-role-melee-${meleeCandidate.name}`,
        kind: 'player_execution',
        severity: repeated || meleeCandidate.deaths > 0 ? 'warning' : 'info',
        confidence: 'medium',
        priorityScore: 78 + (repeated?.count || 0) * 8 + meleeCandidate.deaths * 8,
        owner: meleeCandidate.name,
        phase: dominantPhase?.phase || 'Full Fight',
        summary: `${meleeCandidate.name} needs cleaner melee uptime without greedy deaths.`,
        evidence: `${meleeCandidate.activeTime}% active time, ${meleeCandidate.deaths} death(s)${repeated ? `, repeated ${repeated.ability} ${repeated.count}x` : ''}.`,
        confidenceReasons: [
          `${meleeCandidate.name} active time is ${meleeCandidate.activeTime}%.`,
          meleeCandidate.deaths > 0 ? `${meleeCandidate.name} died ${meleeCandidate.deaths} time(s).` : undefined,
          repeated ? `${repeated.ability} repeated ${repeated.count} time(s).` : undefined,
        ].filter(Boolean) as string[],
        recommendation: repeated
          ? `${getMechanicRecommendation(repeated.ability, dominantPhase?.phase || 'Full Fight')} Keep melee uptime only when the mechanic is already solved.`
          : 'Keep uptime high, but stop trading melee greed for deaths or dropped mechanics.',
        category: repeated ? 'mechanics' : 'throughput',
      });
    }

    const rangedCandidate = playerStats
      .filter((player) => player.role === 'dps' && classifyDpsArchetype(player) === 'ranged')
      .sort((a, b) => {
        const repeatedA = repeatedMistakeByPlayer.get(a.name)?.count || 0;
        const repeatedB = repeatedMistakeByPlayer.get(b.name)?.count || 0;
        return (repeatedB * 25 + b.deaths * 15 + Math.max(0, 92 - b.activeTime)) - (repeatedA * 25 + a.deaths * 15 + Math.max(0, 92 - a.activeTime));
      })[0];
    if (rangedCandidate && ((rangedCandidate.activeTime || 0) < 91 || rangedCandidate.deaths > 0 || repeatedMistakeByPlayer.has(rangedCandidate.name))) {
      const repeated = repeatedMistakeByPlayer.get(rangedCandidate.name);
      playerCoaching.push({
        id: `coach-role-ranged-${rangedCandidate.name}`,
        kind: 'player_execution',
        severity: repeated || rangedCandidate.deaths > 0 ? 'warning' : 'info',
        confidence: 'medium',
        priorityScore: 76 + (repeated?.count || 0) * 8 + rangedCandidate.deaths * 8,
        owner: rangedCandidate.name,
        phase: dominantPhase?.phase || 'Full Fight',
        summary: `${rangedCandidate.name} needs cleaner movement and uptime discipline.`,
        evidence: `${rangedCandidate.activeTime}% active time, ${rangedCandidate.deaths} death(s)${repeated ? `, repeated ${repeated.ability} ${repeated.count}x` : ''}.`,
        confidenceReasons: [
          `${rangedCandidate.name} active time is ${rangedCandidate.activeTime}%.`,
          rangedCandidate.deaths > 0 ? `${rangedCandidate.name} died ${rangedCandidate.deaths} time(s).` : undefined,
          repeated ? `${repeated.ability} repeated ${repeated.count} time(s).` : undefined,
        ].filter(Boolean) as string[],
        recommendation: repeated
          ? `${getMechanicRecommendation(repeated.ability, dominantPhase?.phase || 'Full Fight')} Keep casting lanes clean before chasing more damage.`
          : 'Move earlier, keep casting lanes cleaner, and stop losing uptime to late reactions.',
        category: repeated ? 'mechanics' : 'throughput',
      });
    }

    repeatedMistakes.slice(0, 3).forEach((mistake) => {
      const phaseName = phaseLabelFor(avoidableDeaths.find((death) => death.player === mistake.player && death.ability === mistake.ability)?.time);
      playerCoaching.push({
        id: `coach-mistake-${mistake.player}-${mistake.ability}`,
        kind: 'player_execution',
        severity: mistake.count >= 3 ? 'critical' : 'warning',
        confidence: 'high',
        priorityScore: 90 + mistake.count * 8,
        owner: mistake.player,
        phase: phaseName,
        summary: `${mistake.player} is repeating ${mistake.ability}.`,
        evidence: `${mistake.count} repeated failures across recent pulls.`,
        confidenceReasons: [
          `${mistake.count} repeated failures were found in recent pulls.`,
          phaseName ? `Most recent signal is in ${phaseName}.` : undefined,
        ].filter(Boolean) as string[],
        recommendation: getMechanicRecommendation(mistake.ability, phaseName),
        category: 'mechanics',
      });
    });

    lowPerformers.slice(0, 3).forEach((player) => {
      playerCoaching.push({
        id: `coach-throughput-${player.player}`,
        kind: 'player_execution',
        severity: player.gap > 250000 ? 'warning' : 'info',
        confidence: 'medium',
        priorityScore: 50 + Math.min(35, Math.round(player.gap / 10000)),
        owner: player.player,
        phase: dominantPhase?.phase || 'Full Fight',
        summary: `${player.player} needs a throughput cleanup.`,
        evidence: `${formatNumber(player.gap)} below the expected DPS target.`,
        confidenceReasons: [
          `${formatNumber(player.gap)} DPS below the expected target.`,
          `Current issue marker: ${player.reason}.`,
        ],
        recommendation: `Check uptime, cooldown alignment, and consumables. Current issue: ${player.reason}.`,
        category: 'throughput',
      });
    });

    const normalizedPlayerCoaching = Array.from(
      playerCoaching.reduce((map, insight) => {
        const existing = map.get(insight.owner);
        if (!existing || insight.priorityScore > existing.priorityScore) {
          map.set(insight.owner, insight);
        }
        return map;
      }, new Map<string, BriefInsight>()).values()
    )
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 6);

    const causeChainDetails = (() => {
      const chains: AnalysisResult['causeChainDetails'] = [];
      const phaseBreakpoint = phaseReadiness.find((phase) => phase.status === 'not_ready') || phaseReadiness.find((phase) => phase.status === 'close');

      if (topAssignmentFailure && !fight.kill) {
        chains.push({
          id: `chain-assignment-${topAssignmentFailure.id}`,
          owner: topAssignmentFailure.owner,
          phase: topAssignmentFailure.phase,
          steps: [
            {
              label: 'first_failure',
              text: `${topAssignmentFailure.mechanic} assignment slipped in ${topAssignmentFailure.phase}.`,
            },
            {
              label: 'immediate_consequence',
              text: deathCascade
                ? `${deathCascade.rootDeath.player} died to ${deathCascade.rootDeath.ability} at ${formatTime(deathCascade.rootDeath.time)}.`
                : topAssignmentFailure.evidence,
            },
            {
              label: 'failed_recovery',
              text: deathCascade?.chainDeaths.length
                ? `${deathCascade.chainDeaths.length} chain death(s) followed before the raid stabilized.`
                : 'The raid did not recover the failed assignment cleanly.',
            },
            {
              label: 'wipe_conversion',
              text: phaseBreakpoint
                ? `${phaseBreakpoint.phase} stayed ${phaseBreakpoint.status.replace('_', ' ')}, so the pull converted into a wipe there.`
                : 'The failed assignment snowballed into a full wipe.',
            },
          ],
        });
      }

      if (cooldownGaps.length > 0 && !fight.kill) {
        const gap = cooldownGaps[0];
        chains.push({
          id: `chain-cd-${gap.time}`,
          owner: healerNames.join(', ') || 'Healers + RL',
          phase: phaseLabelFor(gap.time),
          steps: [
            {
              label: 'first_failure',
              text: `Raid-CD coverage was missing around ${formatTime(gap.time)}.`,
            },
            {
              label: 'immediate_consequence',
              text: `${Math.round(gap.damageTaken / 1000)}k raid damage landed uncovered.`,
            },
            {
              label: 'failed_recovery',
              text: deathCascade
                ? `${deathCascade.rootDeath.player} died first and recovery tempo was lost.`
                : 'Healing recovery did not catch the damage spike in time.',
            },
            {
              label: 'wipe_conversion',
              text: phaseBreakpoint
                ? `${phaseBreakpoint.phase} never stabilized after that damage event.`
                : 'The uncovered damage event pushed the raid into wipe pressure.',
            },
          ],
        });
      }

      if (topAvoidableAbility && dominantPhase) {
        chains.push({
          id: `chain-mechanic-${topAvoidableAbility[0]}`,
          owner: 'Raid',
          phase: dominantPhase.phase,
          steps: [
            {
              label: 'first_failure',
              text: `${topAvoidableAbility[0]} repeated ${topAvoidableAbility[1].count} time(s) in ${dominantPhase.phase}.`,
            },
            {
              label: 'immediate_consequence',
              text: `Avoidable deaths stacked up on ${Array.from(topAvoidableAbility[1].players).slice(0, 3).join(', ') || 'multiple players'}.`,
            },
            {
              label: 'failed_recovery',
              text: 'The raid spent recovery resources on preventable damage instead of the main checkpoint.',
            },
            {
              label: 'wipe_conversion',
              text: `${dominantPhase.phase} became the progression breakpoint of the pull.`,
            },
          ],
        });
      }

      if (lowPerformers.length > 0 && (fight.bossHPPercent ?? 100) > 10 && !fight.kill) {
        const totalGap = lowPerformers.slice(0, 2).reduce((sum, player) => sum + player.gap, 0);
        chains.push({
          id: 'chain-throughput',
          owner: lowPerformers.slice(0, 2).map((player) => player.player).join(', ') || 'DPS Core',
          phase: dominantPhase?.phase || 'Full Fight',
          steps: [
            {
              label: 'first_failure',
              text: `Throughput missed by roughly ${formatNumber(totalGap)} DPS across the main underperformers.`,
            },
            {
              label: 'immediate_consequence',
              text: `The boss stayed above ${fight.bossHPPercent}% and another dangerous cycle had to be played.`,
            },
            {
              label: 'failed_recovery',
              text: 'The raid had to absorb extra mechanics and healing pressure instead of ending the phase.',
            },
            {
              label: 'wipe_conversion',
              text: phaseBreakpoint
                ? `${phaseBreakpoint.phase} broke before the raid could convert the pull.`
                : 'The extra cycle became the wipe window.',
            },
          ],
        });
      }

      return chains.slice(0, 4);
    })();

    const causeChains = (() => {
      const chains: string[] = [...getBossRulePackCauseChain(bossData, fight.kill)];

      causeChainDetails?.forEach((chain) => {
        chains.push(chain.steps.map((step) => step.text).join(' -> '));
      });

      return Array.from(new Set(chains)).slice(0, 4);
    })();

    const prioritizedActions = normalizedBriefInsights.slice(0, 3).map((insight, index) => ({
      priority: (index + 1) as 1 | 2 | 3,
      title: insight.summary,
      owner: insight.owner,
      reason: `${insight.evidence} ${insight.recommendation}`,
    }));

    const commandView = (() => {
      const topInsight = normalizedBriefInsights[0];
      const notReadyPhase = phaseReadiness.find((phase) => phase.status === 'not_ready');
      const closePhase = phaseReadiness.find((phase) => phase.status === 'close');
      const topGap = cooldownGaps[0];

      const biggestBlocker = (() => {
        if (topAssignmentFailure && topAssignmentFailure.status === 'failing') {
          return {
            summary: `${topAssignmentFailure.mechanic} is still breaking the pull.`,
            owner: topAssignmentFailure.owner,
            phase: topAssignmentFailure.phase,
            reason: topAssignmentFailure.evidence,
          };
        }

        if (!fight.kill && notReadyPhase) {
          return {
            summary: `${notReadyPhase.phase} is not ready yet.`,
            owner: notReadyPhase.owner,
            phase: notReadyPhase.phase,
            reason: notReadyPhase.blocker,
          };
        }

        if (topInsight) {
          return {
            summary: topInsight.summary,
            owner: topInsight.owner,
            phase: topInsight.phase,
            reason: topInsight.evidence,
          };
        }

        return undefined;
      })();

      const mostLikelyNextWipe = (() => {
        if (fight.kill) {
          const weakestPhase = closePhase || notReadyPhase;
          if (!weakestPhase) return undefined;
          return {
            summary: `${weakestPhase.phase} is the first place that slips if execution drops.`,
            owner: weakestPhase.owner,
            phase: weakestPhase.phase,
            reason: weakestPhase.blocker,
          };
        }

        if (topAssignmentFailure) {
          return {
            summary: `${topAssignmentFailure.mechanic} is the most likely repeat wipe point.`,
            owner: topAssignmentFailure.owner,
            phase: topAssignmentFailure.phase,
            reason: topAssignmentFailure.evidence,
          };
        }

        if (topGap) {
          return {
            summary: `The next wipe is most likely around the uncovered damage event at ${formatTime(topGap.time)}.`,
            owner: healerNames.join(', ') || 'Healers + RL',
            phase: phaseLabelFor(topGap.time),
            reason: `${Math.round(topGap.damageTaken / 1000)}k damage landed without full raid-CD coverage.`,
          };
        }

        if (notReadyPhase || closePhase) {
          const weakestPhase = notReadyPhase || closePhase;
          return weakestPhase ? {
            summary: `${weakestPhase.phase} is still the likely wipe point.`,
            owner: weakestPhase.owner,
            phase: weakestPhase.phase,
            reason: weakestPhase.blocker,
          } : undefined;
        }

        if (topInsight) {
          return {
            summary: topInsight.summary,
            owner: topInsight.owner,
            phase: topInsight.phase,
            reason: topInsight.recommendation,
          };
        }

        return undefined;
      })();

      return {
        biggestBlocker,
        mostLikelyNextWipe,
      };
    })();

    const hasPhaseSignal = phaseCausality.some((phase) => phase.deaths > 0 || phase.avoidableDeaths > 0 || phase.dominantCause !== 'stable');

    return {
      summary: {
        killPotential: fight.kill || (fight.bossHPPercent && fight.bossHPPercent < 10),
        whyWiped,
        keyIssues: keyIssues.slice(0, 5),
        fightEfficiency,
      },
      deaths: { avoidable: avoidableDeaths, unavoidable: unavoidableDeaths },
      performance: {
        raidDPS: totalDPS,
        raidHPS: totalHPS,
        requiredDPS: Math.floor(expectedRaidDps),
        dpsGap: lowPerformers.reduce((s, p) => s + p.gap, 0),
        lowPerformers: lowPerformers.sort((a, b) => b.gap - a.gap).slice(0, 5),
      },
      players: playerStats.sort((a, b) => b.dps - a.dps),
      consumables: { missingFlask, missingFood, missingPotion, missingRune, estimatedDPSLoss },
      raidBuffs,
      cooldowns: { defensives: [], raidCooldowns: [] },
      talents: [],
      raidEfficiency: { overall: overallScore, dps: dpsScore, survival: survivalScore, mechanics: mechanicsScore, consumables: consumablesScore, grade },
      bossInsight: {
        dpsCheckMet: totalDPS >= expectedRaidDps,
        healingIntensity: totalHPS > 2000000 ? 'high' : totalHPS > 1000000 ? 'medium' : 'low',
        movementRequired: averageReliability >= 75 ? 'controlled' : 'chaotic',
        keyMechanics: avoidableDeaths.slice(0, 3).map(d => ({ name: d.ability, deaths: 1, tip: d.tip })),
      },
      deathCascade,
      causeChains,
      causeChainDetails,
      cooldownGaps,
      burstWindows,
      nextPullActions: prioritizedActions.length > 0 ? prioritizedActions : nextPullActions,
      pullDelta,
      wipeCause,
      repeatedMistakes,
      phaseCausality: hasPhaseSignal ? phaseCausality : undefined,
      phaseSuccessCriteria,
      pullTrend,
      roleScores,
      mechanicScores,
      regressionAlerts,
      bestPullChanges,
      categoryDelta,
      cooldownPlanner,
      assignmentAssessments,
      assignmentPlanOverview,
      assignmentBreaks,
      killProbability,
      bossProgression,
      internalBenchmark,
      briefInsights: normalizedBriefInsights,
      deltaInsights,
      playerCoaching: normalizedPlayerCoaching,
      phaseReadiness,
      commandView,
    };
}

  // NEW: Generate Death Cascade Analysis
  function generateDeathCascade(deaths: any[], players: any[], fight: any): DeathCascadeAnalysis | undefined {
    if (deaths.length === 0) return undefined;

    const sortedDeaths = [...deaths].sort((a, b) => (a.time || 0) - (b.time || 0));
    const firstDeath = sortedDeaths[0];
    
    const player = players.find((p: any) => p.name === (firstDeath.target || firstDeath.playerName));
    const role = player?.role || 'dps';
    
    // Determine impact based on role and timing
    const timePercent = (firstDeath.time || 0) / fight.duration;
    let impact: 'critical' | 'high' | 'medium' = 'medium';
    
    if (role === 'tank' || timePercent < 0.3) impact = 'critical';
    else if (role === 'healer' || timePercent < 0.5) impact = 'high';

    // Find chain deaths (deaths within 15 seconds of root death)
    const chainDeaths = sortedDeaths.slice(1)
      .filter((d: any) => (d.time || 0) - (firstDeath.time || 0) <= 15)
      .map((d: any) => {
        const chainPlayer = players.find((p: any) => p.name === (d.target || d.playerName));
        return {
          player: d.target || d.playerName || 'Unknown',
          role: chainPlayer?.role || 'dps',
          ability: d.ability || 'Unknown',
          time: d.time || 0,
          causedByRoot: true,
        };
      });

    // Generate recommendation
    let recommendation = '';
    if (role === 'tank') {
      recommendation = 'Tank swap pode estar atrasado. Verifique defensives e externals.';
    } else if (role === 'healer') {
      recommendation = 'A healer died early. Positioning or defensive usage likely broke down.';
    } else {
      recommendation = `${firstDeath.target} died to ${firstDeath.ability}. ${getTipForAbility(firstDeath.ability || 'Unknown')}`;
    }

    return {
      rootDeath: {
        player: firstDeath.target || firstDeath.playerName || 'Unknown',
        role,
        ability: firstDeath.ability || 'Unknown',
        time: firstDeath.time || 0,
        impact,
      },
      chainDeaths,
      timeToWipe: fight.duration - (firstDeath.time || 0),
      recoveryPossible: chainDeaths.length < 3 && role !== 'tank',
      recommendation,
    };
}

  // NEW: Generate Cooldown Gap Analysis - Uses REAL data from fight
  function generateCooldownGaps(fight: any, players: any[]): CooldownGapAnalysis[] {
    const gaps: CooldownGapAnalysis[] = [];
    const duration = fight.duration;
    const timeline = fight.timeline || [];
    const bossAbilities = fight.bossAbilities || [];
    const raidCdPatterns = [
      'bloodlust',
      'heroism',
      'time warp',
      'tranquility',
      'healing tide',
      'divine hymn',
      'aura mastery',
      'barrier',
      'rallying cry',
      'spirit link',
      'revival',
    ];
    
    // Find damage spikes from boss abilities that hit multiple players
    bossAbilities.forEach((ability: any) => {
      // High damage abilities that should have had a CD
      if (ability.damage > 1500000 && ability.type === 'avoidable') {
        // Check timeline for when this ability was cast
        const abilityEvents = timeline.filter((e: any) => 
          e.type === 'ability' && e.description?.includes(ability.name)
        );
        
        abilityEvents.forEach((event: any) => {
          // Check if any raid CD was used within a short window of this event
          const cdEvents = timeline.filter((e: any) => {
            const text = String(e.description || e.ability || '').toLowerCase();
            const isRaidCdEvent = e.type === 'buff' || e.type === 'cast' || e.type === 'ability';
            return isRaidCdEvent &&
              raidCdPatterns.some((pattern) => text.includes(pattern)) &&
              Math.abs((e.time || 0) - event.time) <= 6;
          });
          
          if (cdEvents.length === 0) {
            gaps.push({
              time: event.time,
              duration: ability.hits > 50 ? 6 : 4,
              damageTaken: ability.damage,
              availableCds: ['Tranquility', 'Healing Tide', 'Divine Hymn', 'Aura Mastery'],
              severity: ability.damage > 2000000 ? 'critical' : 'warning',
            });
          }
        });
      }
    });
    
    // Also check DTPS timeline for spikes without CDs
    const dtpsData = players.reduce((acc: number[], p: any) => {
      if (p.dtpsTimeline) {
        p.dtpsTimeline.forEach((val: number, i: number) => {
          acc[i] = (acc[i] || 0) + val;
        });
      }
      return acc;
    }, []);
    
    if (dtpsData.length > 0) {
      const avgDtps = dtpsData.reduce((a: number, b: number) => a + b, 0) / dtpsData.length;
      const threshold = avgDtps * 1.8;
      
      for (let i = 0; i < dtpsData.length; i++) {
        if (dtpsData[i] > threshold) {
          // Found a spike - check if it's already in gaps
          const existingGap = gaps.find(g => Math.abs(g.time - i) < 10);
          if (!existingGap) {
            gaps.push({
              time: i,
              duration: 3,
              damageTaken: dtpsData[i] * 3,
              availableCds: ['Tranquility', 'Healing Tide', 'Divine Hymn'],
              severity: dtpsData[i] > avgDtps * 2.5 ? 'critical' : 'warning',
            });
          }
        }
      }
    }

    return gaps.sort((a, b) => a.time - b.time).slice(0, 5);
}

  // NEW: Generate Burst Window Analysis - Uses REAL data from fight
  function generateBurstWindows(fight: any, players: any[]): BurstWindowAnalysis[] {
    const windows: BurstWindowAnalysis[] = [];
    const duration = fight.duration;
    const timeline = fight.timeline || [];
    
    // Find bloodlust window from timeline
    const bloodlustEvent = timeline.find((e: any) => 
      e.type === 'bloodlust' || e.description?.toLowerCase().includes('bloodlust') ||
      e.description?.toLowerCase().includes('heroism') || e.description?.toLowerCase().includes('time warp')
    );
    
    if (bloodlustEvent) {
      const bloodlustTime = bloodlustEvent.time;
      const bloodlustDuration = 40;
      
      // Check which DPS had their DPS spike during bloodlust (indicates CD usage)
      const dpsPlayers = players.filter((p: any) => p.role === 'dps');
      const playersWithoutCDs: string[] = [];
      
      dpsPlayers.forEach((player: any) => {
        if (player.dpsTimeline && player.dpsTimeline.length > bloodlustTime + 10) {
          // Check if DPS during bloodlust window is significantly higher than average
          const bloodlustDPS = player.dpsTimeline.slice(bloodlustTime, bloodlustTime + 30);
          const avgBloodlustDPS = bloodlustDPS.reduce((a: number, b: number) => a + b, 0) / bloodlustDPS.length;
          const overallAvg = player.dps;
          
          // If DPS during bloodlust isn't at least 50% higher than average, they might not have used CDs
          if (avgBloodlustDPS < overallAvg * 1.3) {
            playersWithoutCDs.push(player.name);
          }
        }
      });

      windows.push({
        name: 'Bloodlust',
        startTime: bloodlustTime,
        duration: bloodlustDuration,
        playersWithoutCDs,
        efficiency: Math.max(50, 100 - (playersWithoutCDs.length * 8)),
      });
    }
    
    // Execute phase window (last 20% of fight)
    if (!fight.kill && fight.bossHPPercent && fight.bossHPPercent < 30) {
      const executeStart = Math.floor(duration * 0.8);
      
      // Calculate DPS efficiency in execute phase
      const executeDPS = players
        .filter((p: any) => p.role === 'dps' && p.dpsTimeline)
        .reduce((sum: number, p: any) => {
          const executeSlice = p.dpsTimeline.slice(executeStart);
          return sum + (executeSlice.reduce((a: number, b: number) => a + b, 0) / executeSlice.length);
        }, 0);
      
      const avgDPS = players
        .filter((p: any) => p.role === 'dps')
        .reduce((sum: number, p: any) => sum + p.dps, 0);
      
      const efficiency = avgDPS > 0 ? Math.floor((executeDPS / avgDPS) * 100) : 85;
      
      windows.push({
        name: 'Execute Phase',
        startTime: executeStart,
        duration: duration - executeStart,
        playersWithoutCDs: [],
        efficiency: Math.min(100, Math.max(50, efficiency)),
      });
    }

    return windows;
}

