// ============================================
// CORE TYPES - WoWtron Guild Intelligence
// ============================================

// Player info
export interface Player {
  id: number;
  name: string;
  class: string;
  spec: string;
  role: 'tank' | 'healer' | 'dps';
  server?: string;
  itemLevel?: number;
}

// Death event from WCL
export interface DeathEvent {
  playerId: number;
  playerName: string;
  abilityId: number;
  abilityName: string;
  timestamp: number;
  fightTime: number; // seconds into fight
  amount: number;
}

// Combat event (damage, heal, cast, etc.)
export interface CombatEvent {
  timestamp: number;
  type: 'damage' | 'heal' | 'cast' | 'buff' | 'death';
  sourceId: number;
  sourceName: string;
  targetId?: number;
  targetName?: string;
  abilityId?: number;
  abilityName?: string;
  amount?: number;
}

// Boss ability from Blizzard API
export interface BossAbility {
  id: number;
  name: string;
  icon: string;
  description?: string;
  cooldown?: number;
  isAvoidable: boolean;
  isPeriodic: boolean;
  school?: string; // fire, frost, nature, etc.
  tip?: string;
}

// Boss info from Blizzard Journal API
export interface BossData {
  id: number;
  name: string;
  slug: string;
  zone: string;
  zoneId: number;
  instanceType: 'raid' | 'dungeon';
  journalId: number;
  phases: BossPhase[];
  abilities: BossAbility[];
}

// Boss phase
export interface BossPhase {
  id: number;
  name: string;
  description?: string;
  percentage?: number; // boss HP threshold
}

// Fight report from WCL
export interface FightReport {
  id: number;
  reportCode: string;
  bossName: string;
  bossId?: number;
  zone: string;
  difficulty: 'LFR' | 'Normal' | 'Heroic' | 'Mythic';
  duration: number; // seconds
  startTime: number; // timestamp
  endTime: number;
  kill: boolean;
  bossHP?: number; // percentage at end
  players: Player[];
  deaths: DeathEvent[];
  events: CombatEvent[];
}

// Player performance summary
export interface PlayerPerformance {
  player: Player;
  dps: number;
  hps: number;
  dtps: number;
  totalDamage: number;
  totalHealing: number;
  activeTime: number; // percentage
  deaths: number;
  consumables: ConsumableUsage;
  cooldowns: CooldownUsage[];
}

// Consumable tracking
export interface ConsumableUsage {
  flask: boolean;
  flaskId?: number;
  food: boolean;
  foodId?: number;
  potionCount: number;
  potionIds: number[];
  rune: boolean;
  augment: boolean;
}

// Cooldown tracking
export interface CooldownUsage {
  abilityId: number;
  abilityName: string;
  icon: string;
  expectedUses: number;
  actualUses: number;
  timestamps: number[];
}

// Raid buff status
export interface RaidBuff {
  name: string;
  icon: string;
  present: boolean;
  source?: string;
  missingImpact: string;
}

// Analysis result - the core output
export interface AnalysisResult {
  // Quick summary
  summary: {
    killPotential: boolean;
    whyWiped: string[];
    keyIssues: Issue[];
  };

  // Deaths analysis
  deaths: {
    avoidable: AnalyzedDeath[];
    unavoidable: AnalyzedDeath[];
  };

  // DPS/HPS analysis
  performance: {
    raidDPS: number;
    raidHPS: number;
    requiredDPS?: number;
    dpsGap?: number;
    lowPerformers: PerformanceIssue[];
  };

  // Consumables
  consumables: {
    missingFlask: string[];
    missingFood: string[];
    missingPotion: string[];
    missingRune: string[];
    estimatedDPSLoss: number;
  };

  // Raid buffs
  raidBuffs: RaidBuff[];

  // Cooldowns
  cooldowns: {
    defensives: CooldownIssue[];
   raidCooldowns: CooldownIssue[];
  };

  // Progress (if multiple pulls)
  progress?: {
    bestPull: number; // best boss HP %
    currentPull: number;
    improvement: string;
    pullsToKill: number;
  };

  // Comparison (if comparing pulls)
  comparison?: PullComparison;
}

// Analyzed death with tips
export interface AnalyzedDeath {
  player: string;
  ability: string;
  abilityId: number;
  time: number;
  avoidable: boolean;
  phase: string;
  tip: string;
  impact: 'high' | 'medium' | 'low'; // did it cost the kill?
}

// Issue found
export interface Issue {
  type: 'death' | 'dps' | 'consumable' | 'buff' | 'cooldown' | 'mechanic';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
  player?: string;
  suggestion: string;
}

// Performance issue
export interface PerformanceIssue {
  player: string;
  class: string;
  expectedDPS: number;
  actualDPS: number;
  gap: number;
  reason: string;
}

// Cooldown issue
export interface CooldownIssue {
  player: string;
  ability: string;
  expected: number;
  actual: number;
  missed: number;
  impact: string;
}

// Pull comparison
export interface PullComparison {
  pull1: string; // label
  pull2: string;
  durationDiff: number;
  deathsDiff: number;
  dpsDiff: number;
  improvements: string[];
  regressions: string[];
}

// Report data (list of fights)
export interface ReportData {
  code: string;
  title: string;
  owner: string;
  zone: string;
  startTime: number;
  fights: {
    id: number;
    bossName: string;
    difficulty: string;
    duration: number;
    kill: boolean;
  }[];
}

// Progress tracking for a boss
export interface BossProgress {
  bossName: string;
  pulls: {
    pullNumber: number;
    reportCode: string;
    fightId: number;
    timestamp: number;
    bossHP: number;
    duration: number;
    deaths: number;
    kill: boolean;
  }[];
  bestPull: number;
  totalPulls: number;
  trend: 'improving' | 'stagnant' | 'regressing';
}
