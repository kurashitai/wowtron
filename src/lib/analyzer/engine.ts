// ============================================
// WIPE ANALYZER ENGINE
// ============================================
// Pure rule-based analysis - NO AI needed
// Cross-references: WCL combat data + Blizzard boss data

import {
  FightReport,
  PlayerPerformance,
  AnalysisResult,
  AnalyzedDeath,
  Issue,
  PerformanceIssue,
  RaidBuff,
  CooldownIssue,
  Player,
} from '../types';
import { findBossByName, NERUB_AR_PALACE_BOSSES } from '../blizzard-api';

// ============================================
// RAID BUFFS - What buffs a raid should have
// ============================================

const REQUIRED_RAID_BUFFS = [
  { name: 'Bloodlust', icon: 'spell_nature_bloodlust', classes: ['Shaman', 'Mage', 'Hunter'], specs: ['Evoker'], impact: '+30% haste for 40s' },
  { name: 'Power Word: Fortitude', icon: 'spell_holy_wordfortitude', classes: ['Priest'], impact: '+10% stamina' },
  { name: 'Battle Shout', icon: 'ability_warrior_battleshout', classes: ['Warrior'], impact: '+10% attack power' },
  { name: 'Arcane Intellect', icon: 'spell_holy_magicalsentry', classes: ['Mage'], impact: '+10% intellect' },
  { name: 'Mark of the Wild', icon: 'spell_nature_regeneration', classes: ['Druid'], impact: '+5% all stats' },
  { name: 'Chaos Brand', icon: 'ability_demonhunter_chaosbrand', classes: ['Demon Hunter'], impact: '+5% magic damage' },
  { name: 'Mystic Touch', icon: 'ability_monk_mystictouch', classes: ['Monk'], impact: '+5% physical damage' },
  { name: 'Skyfury Totem', icon: 'ability_shaman_thunderstorm', classes: ['Shaman'], impact: '+20% crit damage' },
];

// ============================================
// EXPECTED DPS BY SPEC (approximate, Mythic level)
// ============================================

const EXPECTED_DPS: Record<string, number> = {
  // Melee
  'Outlaw': 850000,
  'Assassination': 920000,
  'Subtlety': 880000,
  'Havoc': 950000,
  'Vengeance': 350000,
  'Frost DK': 820000,
  'Unholy': 890000,
  'Blood': 320000,
  'Frost Mage': 860000,
  'Fire': 920000,
  'Arcane': 840000,
  'Windwalker': 870000,
  'Brewmaster': 300000,
  'Retribution': 880000,
  'Protection Paladin': 340000,
  'Enhancement': 890000,
  'Feral': 820000,
  'Guardian': 290000,
  'Survival': 860000,
  'Beast Mastery': 880000,
  'Marksmanship': 900000,
  'Arms': 910000,
  'Fury': 940000,
  'Protection Warrior': 350000,
  // Ranged
  'Balance': 870000,
  'Shadow': 850000,
  'Elemental': 860000,
  'Affliction': 880000,
  'Demonology': 900000,
  'Destruction': 890000,
  'Devastation': 920000,
  'Augmentation': 400000, // Support DPS
};

// ============================================
// CONSUMABLE DPS ESTIMATES
// ============================================

const FLASK_DPS = 50000; // ~50-80K DPS from flask
const FOOD_DPS = 25000;  // ~25-40K DPS from food
const POTION_DPS = 80000; // ~80K for duration
const RUNE_DPS = 30000;  // ~30K from rune

// ============================================
// MAIN ANALYZER FUNCTION
// ============================================

export function analyzeFight(
  fight: FightReport,
  performance: Map<number, PlayerPerformance>
): AnalysisResult {
  // Find boss data
  const bossData = findBossByName(fight.bossName);
  
  // Analyze deaths
  const deaths = analyzeDeaths(fight.deaths, bossData, fight.duration);
  
  // Analyze performance
  const perfResult = analyzePerformance(fight, performance);
  
  // Analyze consumables
  const consumables = analyzeConsumables(performance);
  
  // Analyze raid buffs
  const raidBuffs = analyzeRaidBuffs(fight.players, performance);
  
  // Analyze cooldowns (simplified)
  const cooldowns = analyzeCooldowns(fight, performance);
  
  // Calculate kill potential
  const killPotential = assessKillPotential(
    fight,
    deaths,
    perfResult,
    consumables
  );
  
  // Generate summary issues
  const issues = generateIssues(
    fight,
    deaths,
    perfResult,
    consumables,
    raidBuffs,
    cooldowns
  );

  return {
    summary: {
      killPotential: killPotential.canKill,
      whyWiped: killPotential.reasons,
      keyIssues: issues.slice(0, 5),
    },
    deaths,
    performance: perfResult,
    consumables,
    raidBuffs,
    cooldowns,
  };
}

// ============================================
// DEATH ANALYSIS
// ============================================

function analyzeDeaths(
  deaths: FightReport['deaths'],
  bossData: any,
  duration: number
): { avoidable: AnalyzedDeath[]; unavoidable: AnalyzedDeath[] } {
  const avoidable: AnalyzedDeath[] = [];
  const unavoidable: AnalyzedDeath[] = [];

  for (const death of deaths) {
    // Find ability info
    let abilityInfo: { isAvoidable?: boolean; tip?: string } | null = null;
    const bossAbilities: Array<{ id: number; name: string; isAvoidable?: boolean; tip?: string }> =
      Array.isArray(bossData?.abilities) ? bossData.abilities : [];

    if (bossAbilities.length > 0) {
      abilityInfo = bossAbilities.find((a) =>
        a.name === death.abilityName || a.id === death.abilityId
      ) || null;
    }

    const phase = getPhaseAtTime(death.fightTime, bossData, duration);
    
    // Determine if avoidable
    const isAvoidable = abilityInfo?.isAvoidable ?? guessIfAvoidable(death.abilityName);
    
    const analyzed: AnalyzedDeath = {
      player: death.playerName,
      ability: death.abilityName,
      abilityId: death.abilityId,
      time: death.fightTime,
      avoidable: isAvoidable,
      phase,
      tip: abilityInfo?.tip || getTipForAbility(death.abilityName),
      impact: death.fightTime > duration * 0.5 ? 'high' : death.fightTime > duration * 0.25 ? 'medium' : 'low',
    };

    if (isAvoidable) {
      avoidable.push(analyzed);
    } else {
      unavoidable.push(analyzed);
    }
  }

  return { avoidable, unavoidable };
}

// ============================================
// PERFORMANCE ANALYSIS
// ============================================

function analyzePerformance(
  fight: FightReport,
  performance: Map<number, PlayerPerformance>
): AnalysisResult['performance'] {
  const lowPerformers: PerformanceIssue[] = [];
  let totalDPS = 0;
  let totalHPS = 0;

  for (const [id, perf] of performance) {
    totalDPS += perf.dps;
    totalHPS += perf.hps;

    // Check if underperforming
    const expected = EXPECTED_DPS[perf.player.spec] || EXPECTED_DPS[perf.player.class] || 700000;
    
    if (perf.dps < expected * 0.85 && perf.player.role === 'dps') {
      const reason = diagnoseLowDPS(perf);
      lowPerformers.push({
        player: perf.player.name,
        class: perf.player.class,
        expectedDPS: expected,
        actualDPS: perf.dps,
        gap: expected - perf.dps,
        reason,
      });
    }
  }

  // Sort by gap (biggest issues first)
  lowPerformers.sort((a, b) => b.gap - a.gap);

  return {
    raidDPS: totalDPS,
    raidHPS: totalHPS,
    lowPerformers: lowPerformers.slice(0, 5),
  };
}

function diagnoseLowDPS(perf: PlayerPerformance): string {
  const reasons: string[] = [];
  
  if (!perf.consumables.flask) reasons.push('no flask');
  if (!perf.consumables.food) reasons.push('no food');
  if (perf.consumables.potionCount < 2) reasons.push(`only ${perf.consumables.potionCount} potion(s)`);
  if (!perf.consumables.rune) reasons.push('no augment rune');
  if (perf.activeTime < 90) reasons.push(`only ${perf.activeTime}% active`);
  
  return reasons.length > 0 ? reasons.join(', ') : 'unknown - check rotation';
}

// ============================================
// CONSUMABLES ANALYSIS
// ============================================

function analyzeConsumables(
  performance: Map<number, PlayerPerformance>
): AnalysisResult['consumables'] {
  const missingFlask: string[] = [];
  const missingFood: string[] = [];
  const missingPotion: string[] = [];
  const missingRune: string[] = [];
  let estimatedDPSLoss = 0;

  for (const [id, perf] of performance) {
    if (!perf.consumables.flask) {
      missingFlask.push(perf.player.name);
      estimatedDPSLoss += FLASK_DPS;
    }
    if (!perf.consumables.food) {
      missingFood.push(perf.player.name);
      estimatedDPSLoss += FOOD_DPS;
    }
    if (perf.consumables.potionCount < 2) {
      missingPotion.push(perf.player.name);
      estimatedDPSLoss += POTION_DPS * (2 - perf.consumables.potionCount);
    }
    if (!perf.consumables.rune) {
      missingRune.push(perf.player.name);
      estimatedDPSLoss += RUNE_DPS;
    }
  }

  return {
    missingFlask,
    missingFood,
    missingPotion,
    missingRune,
    estimatedDPSLoss,
  };
}

// ============================================
// RAID BUFFS ANALYSIS
// ============================================

function analyzeRaidBuffs(
  players: Player[],
  performance: Map<number, PlayerPerformance>
): RaidBuff[] {
  const presentClasses = new Set(players.map(p => p.class));
  const presentSpecs = new Set(players.map(p => p.spec));
  
  const buffs: RaidBuff[] = [];

  for (const buff of REQUIRED_RAID_BUFFS) {
    const hasClass = buff.classes.some(c => presentClasses.has(c));
    const hasSpec = buff.specs?.some(s => presentSpecs.has(s)) ?? false;
    const present = hasClass || hasSpec;
    
    let source = '';
    if (present) {
      const provider = players.find(p => 
        buff.classes.includes(p.class) || buff.specs?.includes(p.spec)
      );
      source = provider?.name || '';
    }

    buffs.push({
      name: buff.name,
      icon: buff.icon,
      present,
      source: present ? source : undefined,
      missingImpact: buff.impact,
    });
  }

  return buffs;
}

// ============================================
// COOLDOWN ANALYSIS (Simplified)
// ============================================

function analyzeCooldowns(
  fight: FightReport,
  performance: Map<number, PlayerPerformance>
): AnalysisResult['cooldowns'] {
  // This would require more detailed event data
  // For now, return empty - can be enhanced later
  return {
    defensives: [],
    raidCooldowns: [],
  };
}

// ============================================
// KILL POTENTIAL ASSESSMENT
// ============================================

function assessKillPotential(
  fight: FightReport,
  deaths: { avoidable: AnalyzedDeath[]; unavoidable: AnalyzedDeath[] },
  perf: AnalysisResult['performance'],
  consumables: AnalysisResult['consumables']
): { canKill: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let canKill = true;

  // Check deaths
  const lateDeaths = deaths.avoidable.filter(d => d.impact === 'high');
  if (lateDeaths.length > 0) {
    reasons.push(`${lateDeaths.length} mortes evitáveis no final da luta`);
    canKill = false;
  }

  // Check if near kill
  if (!fight.kill && fight.bossHP && fight.bossHP > 20) {
    reasons.push(`Boss estava em ${fight.bossHP}% HP`);
    canKill = false;
  }

  // Check DPS gap
  const dpsGap = perf.lowPerformers.reduce((sum, p) => sum + p.gap, 0);
  if (dpsGap > 500000) {
    reasons.push(`~${formatNumber(dpsGap)} DPS perdido por jogadores abaixo da média`);
  }

  // Check consumables impact
  if (consumables.estimatedDPSLoss > 300000) {
    reasons.push(`~${formatNumber(consumables.estimatedDPSLoss)} DPS perdido por consumables faltando`);
  }

  if (reasons.length === 0) {
    reasons.push('Close! Pequenos ajustes devem resolver');
  }

  return { canKill, reasons };
}

// ============================================
// ISSUE GENERATION
// ============================================

function generateIssues(
  fight: FightReport,
  deaths: { avoidable: AnalyzedDeath[]; unavoidable: AnalyzedDeath[] },
  perf: AnalysisResult['performance'],
  consumables: AnalysisResult['consumables'],
  raidBuffs: RaidBuff[],
  cooldowns: AnalysisResult['cooldowns']
): Issue[] {
  const issues: Issue[] = [];

  // Critical: Avoidable deaths
  for (const death of deaths.avoidable) {
    issues.push({
      type: 'death',
      severity: death.impact === 'high' ? 'critical' : 'warning',
      message: `${death.player} morreu para ${death.ability} (${death.phase})`,
      details: `Morte evitável aos ${formatTime(death.time)}`,
      player: death.player,
      suggestion: death.tip,
    });
  }

  // Warning: Missing consumables
  if (consumables.missingFlask.length > 0) {
    issues.push({
      type: 'consumable',
      severity: 'warning',
      message: `${consumables.missingFlask.length} players sem flask`,
      details: consumables.missingFlask.join(', '),
      suggestion: 'Flasks são ~50-80K DPS cada',
    });
  }

  if (consumables.missingPotion.length > 0) {
    issues.push({
      type: 'consumable',
      severity: 'warning',
      message: `${consumables.missingPotion.length} players não usaram 2 potions`,
      details: consumables.missingPotion.join(', '),
      suggestion: 'Potions são ~80K DPS cada uso',
    });
  }

  // Warning: Missing raid buffs
  const missingBuffs = raidBuffs.filter(b => !b.present);
  for (const buff of missingBuffs) {
    issues.push({
      type: 'buff',
      severity: 'info',
      message: `${buff.name} não está disponível`,
      details: `Impacto: ${buff.missingImpact}`,
      suggestion: `Considere trazer um ${buff.name.includes('Shout') ? 'Warrior' : buff.name.includes('Fortitude') ? 'Priest' : buff.name.includes('Intellect') ? 'Mage' : buff.name.includes('Mark') ? 'Druid' : 'player apropriado'}`,
    });
  }

  // Info: Low performers
  for (const low of perf.lowPerformers.slice(0, 3)) {
    issues.push({
      type: 'dps',
      severity: 'info',
      message: `${low.player} está ${formatNumber(low.gap)} abaixo do esperado`,
      details: `Esperado: ~${formatNumber(low.expectedDPS)} | Atual: ${formatNumber(low.actualDPS)}`,
      player: low.player,
      suggestion: `Causa provável: ${low.reason}`,
    });
  }

  return issues;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPhaseAtTime(time: number, bossData: any, duration: number): string {
  if (!bossData?.phases || bossData.phases.length === 0) {
    return 'Unknown Phase';
  }

  const percent = (time / duration) * 100;
  
  for (let i = bossData.phases.length - 1; i >= 0; i--) {
    const phase = bossData.phases[i];
    if (percent >= (phase.percentage || (i / bossData.phases.length) * 100)) {
      return phase.name;
    }
  }

  return bossData.phases[0].name;
}

function guessIfAvoidable(abilityName: string): boolean {
  const avoidableKeywords = [
    'pool', 'ground', 'void', 'zone', 'circle', 'beam', 'wave',
    'spray', 'spew', 'eruption', 'explosion', 'torrent', 'rain',
    'fire', 'flame', 'ice', 'frost', 'poison', 'acid', 'shadow',
    'cudgel', 'smash', 'slam', 'swipe', 'cleave',
  ];
  
  const lower = abilityName.toLowerCase();
  return avoidableKeywords.some(kw => lower.includes(kw));
}

function getTipForAbility(abilityName: string): string {
  // Generic tips based on ability name patterns
  const lower = abilityName.toLowerCase();
  
  if (lower.includes('pool') || lower.includes('ground') || lower.includes('zone')) {
    return 'Saia da área no chão rapidamente';
  }
  if (lower.includes('beam') || lower.includes('laser')) {
    return 'Não fique na linha do beam';
  }
  if (lower.includes('spread') || lower.includes('distance')) {
    return 'Espalhe-se dos outros players';
  }
  if (lower.includes('stack') || lower.includes('soak')) {
    return 'Junte-se com o grupo para dar soak';
  }
  if (lower.includes('interrupt') || lower.includes('cast')) {
    return 'Interrompa o cast';
  }
  if (lower.includes('move') || lower.includes('run')) {
    return 'Mova-se para longe';
  }
  if (lower.includes('tank') || lower.includes('swap')) {
    return 'Tank swap necessário';
  }
  
  return 'Verifique a mecânica desta ability';
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// PULL COMPARISON
// ============================================

export function comparePulls(
  fight1: FightReport,
  perf1: Map<number, PlayerPerformance>,
  fight2: FightReport,
  perf2: Map<number, PlayerPerformance>
): AnalysisResult['comparison'] {
  const improvements: string[] = [];
  const regressions: string[] = [];

  // Duration difference
  const durationDiff = fight2.duration - fight1.duration;
  if (durationDiff > 0) {
    improvements.push(`+${durationDiff}s de vida`);
  } else if (durationDiff < 0) {
    regressions.push(`${durationDiff}s a menos de vida`);
  }

  // Deaths difference
  const deathsDiff = fight1.deaths.length - fight2.deaths.length;
  if (deathsDiff > 0) {
    improvements.push(`${deathsDiff} morte(s) a menos`);
  } else if (deathsDiff < 0) {
    regressions.push(`${Math.abs(deathsDiff)} morte(s) a mais`);
  }

  // DPS comparison
  const dps1 = Array.from(perf1.values()).reduce((sum, p) => sum + p.dps, 0);
  const dps2 = Array.from(perf2.values()).reduce((sum, p) => sum + p.dps, 0);
  const dpsDiff = dps2 - dps1;

  if (dpsDiff > 100000) {
    improvements.push(`+${formatNumber(dpsDiff)} raid DPS`);
  } else if (dpsDiff < -100000) {
    regressions.push(`${formatNumber(Math.abs(dpsDiff))} a menos de raid DPS`);
  }

  // Boss HP improvement
  if (fight1.bossHP !== undefined && fight2.bossHP !== undefined) {
    const hpDiff = fight1.bossHP - fight2.bossHP;
    if (hpDiff > 5) {
      improvements.push(`Boss foi de ${fight1.bossHP}% para ${fight2.bossHP}% HP`);
    }
  }

  return {
    pull1: `Pull #${fight1.id}`,
    pull2: `Pull #${fight2.id}`,
    durationDiff,
    deathsDiff,
    dpsDiff,
    improvements,
    regressions,
  };
}

// ============================================
// PROGRESS TRACKING
// ============================================

export function analyzeProgress(
  pulls: { bossHP: number; duration: number; deaths: number; timestamp: number }[]
): { trend: 'improving' | 'stagnant' | 'regressing'; pullsToKill: number } {
  if (pulls.length < 3) {
    return { trend: 'improving', pullsToKill: 5 };
  }

  // Compare last 3 pulls to previous 3
  const recent = pulls.slice(-3);
  const previous = pulls.slice(-6, -3);

  const recentAvgHP = recent.reduce((s, p) => s + p.bossHP, 0) / recent.length;
  const previousAvgHP = previous.length > 0 
    ? previous.reduce((s, p) => s + p.bossHP, 0) / previous.length 
    : 100;

  let trend: 'improving' | 'stagnant' | 'regressing' = 'stagnant';
  
  if (recentAvgHP < previousAvgHP - 5) {
    trend = 'improving';
  } else if (recentAvgHP > previousAvgHP + 5) {
    trend = 'regressing';
  }

  // Estimate pulls to kill based on progress rate
  const bestHP = Math.min(...pulls.map(p => p.bossHP));
  const avgImprovement = (previousAvgHP - recentAvgHP) / 3;
  
  let pullsToKill = 5;
  if (avgImprovement > 0) {
    pullsToKill = Math.ceil(bestHP / avgImprovement);
    pullsToKill = Math.min(Math.max(pullsToKill, 1), 20);
  }

  return { trend, pullsToKill };
}
