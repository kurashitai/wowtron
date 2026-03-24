// ============================================
// ENHANCED ANALYSIS ENGINE
// ============================================
// Provides deeper insights for raid leaders
// 100% script-based, no AI

import { FightData, PlayerStats } from './combat-logs';
import { BossData, getBossByNickname, isMechanicAvoidable, getMechanicTip } from './boss-data-midnight';

// ============================================
// TYPES
// ============================================

export interface PullComparison {
  bossName: string;
  pulls: PullData[];
  bestPull: PullData;
  improvement: {
    durationDiff: number;
    bossHPDiff: number;
    deathDiff: number;
    dpsDiff: number;
  };
  trend: 'improving' | 'stagnant' | 'regressing';
  pullsToKill: number;
}

export interface PullData {
  pullNumber: number;
  duration: number;
  bossHP: number;
  kill: boolean;
  deaths: DeathSummary[];
  raidDPS: number;
  raidHPS: number;
  timestamp: number;
}

export interface DeathSummary {
  player: string;
  class: string;
  ability: string;
  time: number;
  phase: string;
  avoidable: boolean;
  impact: 'high' | 'medium' | 'low';
}

export interface PhaseAnalysis {
  phaseName: string;
  duration: number;
  deaths: number;
  raidDPS: number;
  mechanicsHit: MechanicHit[];
  issues: string[];
  tips: string[];
}

export interface MechanicHit {
  mechanic: string;
  players: string[];
  hits: number;
  damage: number;
  deaths: number;
  tip: string;
}

export interface CooldownUsage {
  player: string;
  ability: string;
  casts: number;
  expectedCasts: number;
  efficiency: number;
  timing: number[]; // seconds when used
}

export interface RaidEfficiency {
  overall: number;
  dps: number;
  survival: number;
  mechanics: number;
  consumables: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    category: string;
    score: number;
    max: number;
    issues: string[];
  }[];
}

export interface PlayerInsight {
  player: string;
  class: string;
  spec: string;
  role: 'tank' | 'healer' | 'dps';
  parsePercent: number;
  dps: number;
  hps: number;
  dtps: number;
  deaths: number;
  avoidableDamage: number;
  activeTime: number;
  consumableScore: number;
  grade: string;
  issues: string[];
  recommendations: string[];
}

export interface BossInsight {
  boss: string;
  difficulty: string;
  kill: boolean;
  duration: number;
  enrageTimer: number;
  raidDPS: number;
  requiredDPS: number;
  dpsCheck: {
    met: boolean;
    margin: number;
    suggestion: string;
  };
  healingIntensity: 'low' | 'medium' | 'high' | 'extreme';
  movementRequired: 'low' | 'medium' | 'high';
  difficultyRating: number;
  keyMechanics: {
    name: string;
    deaths: number;
    tip: string;
  }[];
}

// ============================================
// MAIN ANALYSIS FUNCTIONS
// ============================================

export function analyzePulls(
  fights: FightData[],
  bossName: string
): PullComparison {
  const bossPulls = fights.filter(f => f.bossName === bossName);
  
  if (bossPulls.length === 0) {
    throw new Error(`No pulls found for ${bossName}`);
  }
  
  const pulls: PullData[] = bossPulls.map((fight, index) => ({
    pullNumber: index + 1,
    duration: fight.duration,
    bossHP: fight.bossHPPercent,
    kill: fight.kill,
    deaths: fight.players
      .filter(p => p.deaths > 0)
      .map(p => ({
        player: p.name,
        class: p.class,
        ability: p.deathEvents[0]?.ability || 'Unknown',
        time: p.deathEvents[0]?.time || 0,
        phase: getPhaseAtTime(p.deathEvents[0]?.time || 0, fight.duration),
        avoidable: true,
        impact: getDeathImpact(p.deathEvents[0]?.time || 0, fight.duration)
      })),
    raidDPS: fight.summary.raidDPS,
    raidHPS: fight.summary.raidHPS,
    timestamp: fight.startTime
  }));
  
  // Find best pull (lowest HP or kill)
  const bestPull = pulls.reduce((best, pull) => {
    if (pull.kill) return pull;
    if (!best.kill && pull.bossHP < best.bossHP) return pull;
    return best;
  });
  
  // Calculate improvement
  const firstPull = pulls[0];
  const lastPull = pulls[pulls.length - 1];
  
  const improvement = {
    durationDiff: lastPull.duration - firstPull.duration,
    bossHPDiff: firstPull.bossHP - lastPull.bossHP,
    deathDiff: firstPull.deaths.length - lastPull.deaths.length,
    dpsDiff: lastPull.raidDPS - firstPull.raidDPS
  };
  
  // Calculate trend
  let trend: 'improving' | 'stagnant' | 'regressing' = 'stagnant';
  if (pulls.length >= 3) {
    const recent = pulls.slice(-3);
    const previous = pulls.slice(-6, -3);
    
    if (previous.length > 0) {
      const recentAvgHP = recent.reduce((s, p) => s + p.bossHP, 0) / recent.length;
      const previousAvgHP = previous.reduce((s, p) => s + p.bossHP, 0) / previous.length;
      
      if (recentAvgHP < previousAvgHP - 5) trend = 'improving';
      else if (recentAvgHP > previousAvgHP + 5) trend = 'regressing';
    }
  }
  
  // Estimate pulls to kill
  let pullsToKill = 5;
  if (!bestPull.kill && pulls.length >= 3) {
    const hpProgress = pulls.map(p => p.bossHP);
    const avgImprovement = hpProgress.slice(1).reduce((sum, hp, i) => {
      return sum + (hpProgress[i] - hp);
    }, 0) / (hpProgress.length - 1);
    
    if (avgImprovement > 0) {
      pullsToKill = Math.min(20, Math.max(1, Math.ceil(bestPull.bossHP / avgImprovement)));
    }
  } else if (bestPull.kill) {
    pullsToKill = 0;
  }
  
  return {
    bossName,
    pulls,
    bestPull,
    improvement,
    trend,
    pullsToKill
  };
}

export function analyzePhasePerformance(
  fight: FightData,
  bossData?: BossData
): PhaseAnalysis[] {
  const phases: PhaseAnalysis[] = [];
  const boss = bossData || getBossByNickname(fight.bossName.split(' ')[0]);
  
  if (!boss || boss.phases.length === 0) {
    // Single phase analysis
    return [{
      phaseName: 'Full Fight',
      duration: fight.duration,
      deaths: fight.players.reduce((s, p) => s + p.deaths, 0),
      raidDPS: fight.summary.raidDPS,
      mechanicsHit: [],
      issues: [],
      tips: []
    }];
  }
  
  // Analyze each phase
  for (let i = 0; i < boss.phases.length; i++) {
    const phase = boss.phases[i];
    const phaseStart = Math.floor((fight.duration / boss.phases.length) * i);
    const phaseEnd = Math.floor((fight.duration / boss.phases.length) * (i + 1));
    const phaseDuration = phaseEnd - phaseStart;
    
    // Find deaths in this phase
    const phaseDeaths = fight.players
      .filter(p => p.deaths > 0)
      .flatMap(p => p.deathEvents.filter(d => d.time >= phaseStart && d.time < phaseEnd));
    
    // Calculate phase DPS
    const phasePlayers = fight.players.map(p => {
      const phaseDPS = p.dpsTimeline
        .slice(phaseStart, phaseEnd)
        .reduce((s, d) => s + d, 0) / Math.max(1, phaseDuration);
      return phaseDPS;
    });
    const phaseDPS = phasePlayers.reduce((s, d) => s + d, 0);
    
    // Identify mechanics hit
    const mechanicsHit: MechanicHit[] = [];
    for (const mechanic of phase.mechanics) {
      const mechanicData = boss.mechanics.find(m => m.id === mechanic || m.name === mechanic);
      if (mechanicData) {
        const hits = phaseDeaths.filter(d => 
          d.ability?.toLowerCase().includes(mechanicData.name.toLowerCase())
        );
        
        if (hits.length > 0) {
          mechanicsHit.push({
            mechanic: mechanicData.name,
            players: hits.map(h => fight.players.find(p => p.deathEvents.includes(h))?.name || 'Unknown'),
            hits: hits.length,
            damage: mechanicData.damage || 0,
            deaths: hits.length,
            tip: mechanicData.tip
          });
        }
      }
    }
    
    // Generate issues and tips
    const issues: string[] = [];
    const tips: string[] = [];
    
    if (phaseDeaths.length > 0) {
      issues.push(`${phaseDeaths.length} death(s) in this phase`);
    }
    
    if (phaseDPS < fight.summary.raidDPS * 0.9) {
      issues.push('DPS dropped significantly in this phase');
      tips.push('Save cooldowns for this phase');
    }
    
    tips.push(...phase.tips);
    
    phases.push({
      phaseName: phase.name,
      duration: phaseDuration,
      deaths: phaseDeaths.length,
      raidDPS: phaseDPS,
      mechanicsHit,
      issues,
      tips
    });
  }
  
  return phases;
}

export function calculateRaidEfficiency(
  fight: FightData,
  bossData?: BossData
): RaidEfficiency {
  const boss = bossData || getBossByNickname(fight.bossName.split(' ')[0]);
  
  // Calculate DPS Score (0-100)
  const requiredDPS = boss?.requiredDPS || fight.summary.raidDPS;
  const dpsScore = Math.min(100, Math.floor((fight.summary.raidDPS / requiredDPS) * 85));
  
  // Calculate Survival Score (0-100)
  const totalDeaths = fight.players.reduce((s, p) => s + p.deaths, 0);
  const expectedDeaths = fight.kill ? 0 : 2;
  const survivalScore = Math.max(0, 100 - (totalDeaths - expectedDeaths) * 15);
  
  // Calculate Mechanics Score (0-100)
  const avoidableDeaths = fight.players
    .flatMap(p => p.deathEvents)
    .filter(d => isMechanicAvoidable(d.ability, boss));
  const mechanicsScore = Math.max(0, 100 - avoidableDeaths.length * 20);
  
  // Calculate Consumables Score (0-100)
  const missingConsumables = fight.players
    .filter(p => !p.flaskUsed || !p.foodUsed || !p.potionUsed)
    .length;
  const consumablesScore = Math.max(0, 100 - missingConsumables * 10);
  
  // Overall Score
  const overall = Math.floor(
    dpsScore * 0.35 +
    survivalScore * 0.30 +
    mechanicsScore * 0.25 +
    consumablesScore * 0.10
  );
  
  // Grade
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  if (overall >= 95) grade = 'S';
  else if (overall >= 85) grade = 'A';
  else if (overall >= 70) grade = 'B';
  else if (overall >= 55) grade = 'C';
  else if (overall >= 40) grade = 'D';
  else grade = 'F';
  
  // Breakdown
  const breakdown = [
    {
      category: 'DPS',
      score: dpsScore,
      max: 100,
      issues: dpsScore < 80 ? ['Below required DPS'] : []
    },
    {
      category: 'Survival',
      score: survivalScore,
      max: 100,
      issues: totalDeaths > expectedDeaths ? [`${totalDeaths} deaths (expected: ${expectedDeaths})`] : []
    },
    {
      category: 'Mechanics',
      score: mechanicsScore,
      max: 100,
      issues: avoidableDeaths.length > 0 ? [`${avoidableDeaths.length} avoidable deaths`] : []
    },
    {
      category: 'Consumables',
      score: consumablesScore,
      max: 100,
      issues: missingConsumables > 0 ? [`${missingConsumables} missing consumables`] : []
    }
  ];
  
  return {
    overall,
    dps: dpsScore,
    survival: survivalScore,
    mechanics: mechanicsScore,
    consumables: consumablesScore,
    grade,
    breakdown
  };
}

export function analyzePlayerPerformance(
  player: PlayerStats,
  fight: FightData,
  bossData?: BossData
): PlayerInsight {
  const boss = bossData || getBossByNickname(fight.bossName.split(' ')[0]);
  
  // Calculate consumable score
  const consumableScore = (
    (player.flaskUsed ? 25 : 0) +
    (player.foodUsed ? 25 : 0) +
    (player.potionUsed ? 30 : 0) +
    (player.runeUsed ? 20 : 0)
  );
  
  // Calculate grade
  let grade = 'C';
  if (player.rankPercent >= 95) grade = 'S';
  else if (player.rankPercent >= 85) grade = 'A';
  else if (player.rankPercent >= 70) grade = 'B';
  else if (player.rankPercent >= 50) grade = 'C';
  else if (player.rankPercent >= 25) grade = 'D';
  else grade = 'F';
  
  // Identify issues
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  if (player.rankPercent < 50) {
    issues.push(`Low parse: ${player.rankPercent}%`);
    recommendations.push('Review rotation and cooldown usage');
  }
  
  if (player.deaths > 0) {
    issues.push(`Died ${player.deaths} time(s)`);
    const avoidableDeath = player.deathEvents.find(d => 
      isMechanicAvoidable(d.ability, boss)
    );
    if (avoidableDeath) {
      recommendations.push(getMechanicTip(avoidableDeath.ability, boss));
    }
  }
  
  if (consumableScore < 100) {
    issues.push('Missing consumables');
    if (!player.flaskUsed) recommendations.push('Use flask for ~50-80K DPS');
    if (!player.foodUsed) recommendations.push('Use food for ~25-40K DPS');
    if (!player.potionUsed) recommendations.push('Use potions for ~80K DPS each');
  }
  
  if (player.activeTime < 90) {
    issues.push(`Low activity: ${player.activeTime}%`);
    recommendations.push('Reduce downtime, stay in combat');
  }
  
  if (player.avoidableDamagePercent > 15) {
    issues.push(`High avoidable damage: ${player.avoidableDamagePercent}%`);
    recommendations.push('Focus on mechanics, not DPS during movement');
  }
  
  return {
    player: player.name,
    class: player.class,
    spec: player.spec,
    role: player.role,
    parsePercent: player.rankPercent,
    dps: player.dps,
    hps: player.hps,
    dtps: player.dtps,
    deaths: player.deaths,
    avoidableDamage: player.avoidableDamageTaken,
    activeTime: player.activeTime,
    consumableScore,
    grade,
    issues,
    recommendations
  };
}

export function analyzeBossPerformance(
  fight: FightData,
  bossData?: BossData
): BossInsight {
  const boss = bossData || getBossByNickname(fight.bossName.split(' ')[0]);
  
  // DPS check
  const requiredDPS = boss?.requiredDPS || fight.summary.raidDPS * 0.9;
  const dpsMet = fight.summary.raidDPS >= requiredDPS;
  const margin = fight.summary.raidDPS - requiredDPS;
  
  let dpsSuggestion = '';
  if (!dpsMet) {
    dpsSuggestion = `Need ${(requiredDPS - fight.summary.raidDPS) / 1000000}M more raid DPS`;
  } else if (margin < requiredDPS * 0.1) {
    dpsSuggestion = 'DPS tight - optimize everything';
  } else {
    dpsSuggestion = 'DPS comfortable';
  }
  
  // Healing intensity
  const hpsPerHealer = fight.summary.raidHPS / Math.max(1, fight.composition.healers);
  let healingIntensity: 'low' | 'medium' | 'high' | 'extreme';
  if (hpsPerHealer < 200000) healingIntensity = 'low';
  else if (hpsPerHealer < 300000) healingIntensity = 'medium';
  else if (hpsPerHealer < 400000) healingIntensity = 'high';
  else healingIntensity = 'extreme';
  
  // Movement requirement (based on mechanics)
  const movementRequired: 'low' | 'medium' | 'high' = 
    (boss?.mechanics.filter(m => m.type === 'avoidable' || m.type === 'positioning').length || 0) >= 4
      ? 'high'
      : (boss?.mechanics.length || 0) >= 3 ? 'medium' : 'low';
  
  // Key mechanics causing deaths
  const keyMechanics = (boss?.mechanics || [])
    .map(m => ({
      name: m.name,
      deaths: fight.players
        .filter(p => p.deathEvents.some(d => 
          d.ability?.toLowerCase().includes(m.name.toLowerCase())
        ))
        .length,
      tip: m.tip
    }))
    .filter(m => m.deaths > 0)
    .sort((a, b) => b.deaths - a.deaths);
  
  return {
    boss: fight.bossName,
    difficulty: fight.difficulty,
    kill: fight.kill,
    duration: fight.duration,
    enrageTimer: boss?.enrageTimer || 600,
    raidDPS: fight.summary.raidDPS,
    requiredDPS,
    dpsCheck: {
      met: dpsMet,
      margin,
      suggestion: dpsSuggestion
    },
    healingIntensity,
    movementRequired,
    difficultyRating: boss?.mechanics.length || 3,
    keyMechanics
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPhaseAtTime(time: number, duration: number): string {
  const percent = (time / duration) * 100;
  
  if (percent < 25) return 'Early Phase';
  if (percent < 50) return 'Mid Phase';
  if (percent < 75) return 'Late Phase';
  return 'Final Phase';
}

function getDeathImpact(time: number, duration: number): 'high' | 'medium' | 'low' {
  const percent = (time / duration) * 100;
  
  if (percent > 70) return 'high';
  if (percent > 40) return 'medium';
  return 'low';
}

// ============================================
// DISCORD-FORMATTED OUTPUT
// ============================================

export function formatDiscordSummary(
  fight: FightData,
  efficiency: RaidEfficiency,
  bossInsight: BossInsight
): string {
  const lines: string[] = [];
  
  lines.push(`**${fight.bossName}** - ${fight.difficulty}`);
  lines.push(`Duration: ${formatTime(fight.duration)} | Grade: **${efficiency.grade}** (${efficiency.overall}%)`);
  lines.push('');
  
  if (fight.kill) {
    lines.push('✅ **BOSS KILLED!**');
  } else {
    lines.push(`❌ **WIPE** at ${fight.bossHPPercent}% HP`);
  }
  
  lines.push('');
  lines.push('**Performance:**');
  lines.push(`• DPS: ${formatNumber(fight.summary.raidDPS)} (${bossInsight.dpsCheck.suggestion})`);
  lines.push(`• Deaths: ${fight.summary.deaths}`);
  lines.push(`• Avoidable Deaths: ${efficiency.breakdown.find(b => b.category === 'Mechanics')?.issues[0] || 'None'}`);
  
  if (efficiency.breakdown.some(b => b.issues.length > 0)) {
    lines.push('');
    lines.push('**Issues:**');
    for (const cat of efficiency.breakdown) {
      if (cat.issues.length > 0) {
        lines.push(`• ${cat.category}: ${cat.issues.join(', ')}`);
      }
    }
  }
  
  lines.push('');
  lines.push('_Analyzed by WoWtron_');
  
  return lines.join('\n');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
