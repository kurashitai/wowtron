// ============================================
// PULL COMPARISON ENGINE
// ============================================
// Compara dois pulls lado a lado para identificar
// o que mudou entre eles

import { FightData, PlayerStats } from '../combat-logs';
import { BossData } from '../boss-data-midnight';

// ============================================
// TYPES
// ============================================

export interface PullComparisonResult {
  pull1: PullSummary;
  pull2: PullSummary;
  
  // Diferenças
  durationDiff: number; // seconds
  bossHPDiff: number; // percentage
  raidDPSDiff: number;
  
  // Improvements (good changes)
  improvements: ComparisonChange[];
  
  // Regressions (bad changes)
  regressions: ComparisonChange[];
  
  // Player changes
  playerChanges: PlayerComparison[];
  
  // Key insight
  keyInsight: string;
  
  // What to focus on
  focusAreas: string[];
}

export interface PullSummary {
  pullNumber: number;
  reportCode: string;
  fightId: number;
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
}

export interface ComparisonChange {
  category: 'death' | 'dps' | 'cd' | 'mechanic' | 'phase';
  description: string;
  impact: 'high' | 'medium' | 'low';
  player?: string;
  time?: number;
}

export interface PlayerComparison {
  playerName: string;
  class: string;
  
  // DPS comparison
  dps1: number;
  dps2: number;
  dpsDiff: number;
  dpsDiffPercent: number;
  
  // Death comparison
  died1: boolean;
  died2: boolean;
  deathTime1?: number;
  deathTime2?: number;
  
  // Potion comparison
  potions1: number;
  potions2: number;
  
  // Assessment
  improved: boolean;
  reason?: string;
}

// ============================================
// MAIN COMPARISON FUNCTION
// ============================================

export function comparePulls(
  fight1: FightData,
  fight2: FightData,
  bossData?: BossData
): PullComparisonResult {
  // Create summaries
  const pull1 = createPullSummary(fight1);
  const pull2 = createPullSummary(fight2);
  
  // Calculate differences
  const durationDiff = pull2.duration - pull1.duration;
  const bossHPDiff = pull1.bossHP - pull2.bossHP; // Lower HP is better
  const raidDPSDiff = pull2.raidDPS - pull1.raidDPS;
  
  // Compare players
  const playerChanges = comparePlayers(fight1, fight2);
  
  // Find improvements
  const improvements = findImprovements(pull1, pull2, playerChanges, bossData);
  
  // Find regressions
  const regressions = findRegressions(pull1, pull2, playerChanges, bossData);
  
  // Generate key insight
  const keyInsight = generateKeyInsight(improvements, regressions, pull1, pull2);
  
  // Generate focus areas
  const focusAreas = generateFocusAreas(regressions, playerChanges);

  return {
    pull1,
    pull2,
    durationDiff,
    bossHPDiff,
    raidDPSDiff,
    improvements,
    regressions,
    playerChanges,
    keyInsight,
    focusAreas
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createPullSummary(fight: FightData): PullSummary {
  return {
    pullNumber: fight.id,
    reportCode: fight.reportId || '',
    fightId: fight.id,
    duration: fight.duration,
    bossHP: fight.bossHPPercent ?? (fight.kill ? 0 : 100),
    kill: fight.kill,
    deaths: fight.players
      .filter(p => p.deaths > 0)
      .flatMap(p => p.deathEvents.map(d => ({
        player: p.name,
        class: p.class,
        ability: d.ability,
        time: d.time,
        phase: getPhaseAtTime(d.time, fight.duration)
      }))),
    raidDPS: fight.summary.raidDPS,
    raidHPS: fight.summary.raidHPS,
    timestamp: fight.startTime
  };
}

function getPhaseAtTime(time: number, duration: number): string {
  const percent = (time / duration) * 100;
  if (percent < 25) return 'P1';
  if (percent < 50) return 'P2';
  if (percent < 75) return 'P3';
  return 'P4';
}

function comparePlayers(fight1: FightData, fight2: FightData): PlayerComparison[] {
  const comparisons: PlayerComparison[] = [];
  
  // Create player maps for easy lookup
  const players1 = new Map(fight1.players.map(p => [p.name, p]));
  const players2 = new Map(fight2.players.map(p => [p.name, p]));
  
  // Find all unique players
  const allPlayers = new Set([...players1.keys(), ...players2.keys()]);
  
  for (const playerName of allPlayers) {
    const p1 = players1.get(playerName);
    const p2 = players2.get(playerName);
    
    if (!p1 || !p2) continue; // Skip if player not in both fights
    
    const dpsDiff = (p2.dps || 0) - (p1.dps || 0);
    const dpsDiffPercent = p1.dps ? (dpsDiff / p1.dps) * 100 : 0;
    
    const died1 = (p1.deaths || 0) > 0;
    const died2 = (p2.deaths || 0) > 0;
    
    let improved = true;
    let reason: string | undefined;
    
    // Determine if player improved
    if (died2 && !died1) {
      improved = false;
      reason = 'Morreu neste pull';
    } else if (!died2 && died1) {
      improved = true;
      reason = 'Sobreviveu (morreu no pull anterior)';
    } else if (dpsDiffPercent > 5) {
      improved = true;
      reason = `+${Math.round(dpsDiffPercent)}% DPS`;
    } else if (dpsDiffPercent < -5) {
      improved = false;
      reason = `${Math.round(dpsDiffPercent)}% DPS`;
    }
    
    comparisons.push({
      playerName,
      class: p1.class,
      dps1: p1.dps || 0,
      dps2: p2.dps || 0,
      dpsDiff,
      dpsDiffPercent,
      died1,
      died2,
      deathTime1: p1.deathEvents[0]?.time,
      deathTime2: p2.deathEvents[0]?.time,
      potions1: 0, // Would need actual data
      potions2: 0,
      improved,
      reason
    });
  }
  
  return comparisons;
}

function findImprovements(
  pull1: PullSummary,
  pull2: PullSummary,
  playerChanges: PlayerComparison[],
  bossData?: BossData
): ComparisonChange[] {
  const improvements: ComparisonChange[] = [];
  
  // Boss HP improvement
  if (pull1.bossHP - pull2.bossHP > 5) {
    improvements.push({
      category: 'phase',
      description: `Boss foi de ${pull1.bossHP}% para ${pull2.bossHP}% HP`,
      impact: 'high'
    });
  }
  
  // Raid DPS improvement
  if (pull2.raidDPS - pull1.raidDPS > 100000) {
    improvements.push({
      category: 'dps',
      description: `Raid DPS: +${formatNumber(pull2.raidDPS - pull1.raidDPS)}`,
      impact: 'medium'
    });
  }
  
  // Players who survived (died in pull1, survived in pull2)
  const survivors = playerChanges.filter(p => p.died1 && !p.died2);
  for (const survivor of survivors) {
    improvements.push({
      category: 'death',
      description: `${survivor.playerName} sobreviveu (morreu em ${formatTime(survivor.deathTime1 || 0)} no pull anterior)`,
      impact: survivor.class === 'Tank' || survivor.class === 'Healer' ? 'high' : 'medium',
      player: survivor.playerName
    });
  }
  
  // Players with significant DPS increase
  const dpsGains = playerChanges.filter(p => p.dpsDiffPercent > 10);
  for (const gain of dpsGains) {
    improvements.push({
      category: 'dps',
      description: `${gain.playerName}: +${formatNumber(gain.dpsDiff)} DPS (${Math.round(gain.dpsDiffPercent)}%)`,
      impact: gain.dpsDiff > 50000 ? 'high' : 'medium',
      player: gain.playerName
    });
  }
  
  // Less deaths overall
  if (pull1.deaths.length > pull2.deaths.length) {
    improvements.push({
      category: 'death',
      description: `${pull1.deaths.length - pull2.deaths.length} morte(s) a menos`,
      impact: pull1.deaths.length - pull2.deaths.length >= 2 ? 'high' : 'medium'
    });
  }
  
  return improvements;
}

function findRegressions(
  pull1: PullSummary,
  pull2: PullSummary,
  playerChanges: PlayerComparison[],
  bossData?: BossData
): ComparisonChange[] {
  const regressions: ComparisonChange[] = [];
  
  // Boss HP regression (got worse)
  if (pull2.bossHP - pull1.bossHP > 5) {
    regressions.push({
      category: 'phase',
      description: `Boss piorou: ${pull1.bossHP}% → ${pull2.bossHP}% HP`,
      impact: 'high'
    });
  }
  
  // Raid DPS regression
  if (pull1.raidDPS - pull2.raidDPS > 100000) {
    regressions.push({
      category: 'dps',
      description: `Raid DPS: -${formatNumber(pull1.raidDPS - pull2.raidDPS)}`,
      impact: 'medium'
    });
  }
  
  // Players who died (survived in pull1, died in pull2)
  const newDeaths = playerChanges.filter(p => !p.died1 && p.died2);
  for (const death of newDeaths) {
    regressions.push({
      category: 'death',
      description: `${death.playerName} morreu aos ${formatTime(death.deathTime2 || 0)}`,
      impact: death.class === 'Tank' || death.class === 'Healer' ? 'high' : 'medium',
      player: death.playerName,
      time: death.deathTime2
    });
  }
  
  // Players with significant DPS decrease
  const dpsLosses = playerChanges.filter(p => p.dpsDiffPercent < -10);
  for (const loss of dpsLosses) {
    regressions.push({
      category: 'dps',
      description: `${loss.playerName}: ${formatNumber(loss.dpsDiff)} DPS (${Math.round(loss.dpsDiffPercent)}%)`,
      impact: loss.dpsDiff < -50000 ? 'high' : 'medium',
      player: loss.playerName
    });
  }
  
  // More deaths overall
  if (pull2.deaths.length > pull1.deaths.length) {
    regressions.push({
      category: 'death',
      description: `${pull2.deaths.length - pull1.deaths.length} morte(s) a mais`,
      impact: pull2.deaths.length - pull1.deaths.length >= 2 ? 'high' : 'medium'
    });
  }
  
  // Duration shorter but not a kill (probably early wipe)
  if (pull2.duration < pull1.duration - 30 && !pull2.kill) {
    regressions.push({
      category: 'phase',
      description: `Pull foi ${pull1.duration - pull2.duration}s mais curto (wipe precoce)`,
      impact: 'high'
    });
  }
  
  return regressions;
}

function generateKeyInsight(
  improvements: ComparisonChange[],
  regressions: ComparisonChange[],
  pull1: PullSummary,
  pull2: PullSummary
): string {
  // Find the most impactful change
  
  // If pull2 was a kill and pull1 wasn't
  if (pull2.kill && !pull1.kill) {
    const keyImprovement = improvements.find(i => i.category === 'death' && i.impact === 'high');
    if (keyImprovement) {
      return `🎉 KILL! Principal fator: ${keyImprovement.description}`;
    }
    return '🎉 KILL! Combinação de melhorias levou ao kill.';
  }
  
  // If there were critical regressions
  const criticalRegressions = regressions.filter(r => r.impact === 'high');
  if (criticalRegressions.length > 0) {
    return `❌ Piora significativa: ${criticalRegressions[0].description}`;
  }
  
  // If there were significant improvements
  const highImprovements = improvements.filter(i => i.impact === 'high');
  if (highImprovements.length > 0) {
    return `✅ Progresso: ${highImprovements[0].description}`;
  }
  
  // General assessment
  if (improvements.length > regressions.length) {
    return '📈 Pull mostrou progresso geral. Continue assim!';
  } else if (regressions.length > improvements.length) {
    return '📉 Pull foi pior que o anterior. Revise o que mudou.';
  }
  
  return '➡️ Pull similar ao anterior. Pequenos ajustes necessários.';
}

function generateFocusAreas(
  regressions: ComparisonChange[],
  playerChanges: PlayerComparison[]
): string[] {
  const areas: string[] = [];
  
  // Death-related focus
  const deathRegressions = regressions.filter(r => r.category === 'death');
  if (deathRegressions.length > 0) {
    const players = deathRegressions.map(r => r.player).filter(Boolean);
    if (players.length > 0) {
      areas.push(`Manter ${players.join(', ')} vivo(s)`);
    }
  }
  
  // DPS-related focus
  const dpsRegressions = regressions.filter(r => r.category === 'dps');
  if (dpsRegressions.length > 0) {
    areas.push('Investigar queda de DPS');
  }
  
  // Players who need attention
  const strugglingPlayers = playerChanges.filter(p => !p.improved);
  if (strugglingPlayers.length > 0 && strugglingPlayers.length <= 3) {
    areas.push(`Ajudar ${strugglingPlayers.map(p => p.playerName).join(', ')}`);
  }
  
  return areas;
}

// ============================================
// FORMATTING HELPER
// ============================================

export function formatPullComparison(result: PullComparisonResult): string {
  const lines: string[] = [];
  
  lines.push(`📊 COMPARAÇÃO: Pull #${result.pull1.pullNumber} vs Pull #${result.pull2.pullNumber}`);
  lines.push(``);
  
  // Improvements
  if (result.improvements.length > 0) {
    lines.push(`✅ Melhorias:`);
    result.improvements.slice(0, 5).forEach(i => {
      lines.push(`• ${i.description}`);
    });
    lines.push(``);
  }
  
  // Regressions
  if (result.regressions.length > 0) {
    lines.push(`❌ Regressões:`);
    result.regressions.slice(0, 5).forEach(r => {
      lines.push(`• ${r.description}`);
    });
    lines.push(``);
  }
  
  // Key insight
  lines.push(`💡 Insight Principal:`);
  lines.push(result.keyInsight);
  lines.push(``);
  
  // Focus areas
  if (result.focusAreas.length > 0) {
    lines.push(`🎯 Foco para o próximo pull:`);
    result.focusAreas.forEach(a => lines.push(`• ${a}`));
  }
  
  return lines.join('\n');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
