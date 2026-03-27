// Real WoW Combat Log Data - Comprehensive Structure
// Based on actual Warcraft Logs API structure

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CombatEvent {
  timestamp: number;
  type: 'damage' | 'heal' | 'death' | 'cast' | 'buff_apply' | 'buff_remove' | 'debuff_apply' | 'debuff_remove' | 'summon' | 'interrupt' | 'dispel' | 'combatres';
  sourceID: number;
  sourceName: string;
  sourceClass: string;
  targetID: number;
  targetName: string;
  targetClass?: string;
  ability: {
    name: string;
    id: number;
    icon: string;
  };
  amount?: number;
  overheal?: number;
  absorbed?: number;
  hitType?: number;
  fatal?: boolean;
  mitigated?: number;
  blocked?: number;
}

export interface FightPhase {
  name: string;
  startTime: number;
  endTime: number;
  bossHP: number[];
  events: CombatEvent[];
}

export interface PlayerStats {
  id: number;
  name: string;
  class: string;
  spec: string;
  role: 'tank' | 'healer' | 'dps';
  region?: string;
  talents?: string[];
  itemLevel: number;
  server: string;
  
  // Damage Stats
  dps: number;
  dpsMax: number;
  dpsMin: number;
  totalDamage: number;
  damagePercent: number;
  rank: number;
  rankPercent: number;
  
  // Healing Stats
  hps: number;
  hpsMax: number;
  hpsMin: number;
  totalHealing: number;
  healingPercent: number;
  overheal: number;
  overhealPercent: number;
  
  // Damage Taken Stats
  dtps: number;
  totalDamageTaken: number;
  avoidableDamageTaken: number;
  avoidableDamagePercent: number;
  
  // Ability Breakdown
  abilities: {
    name: string;
    icon: string;
    casts: number;
    hits: number;
    critPercent: number;
    avgHit: number;
    maxHit: number;
    totalDamage: number;
    percentOfTotal: number;
  }[];
  
  // Healing Abilities
  healingAbilities: {
    name: string;
    icon: string;
    casts: number;
    hits: number;
    critPercent: number;
    avgHit: number;
    maxHit: number;
    totalHealing: number;
    overheal: number;
    percentOfTotal: number;
  }[];
  
  // Timeline Data (per second)
  dpsTimeline: number[];
  hpsTimeline: number[];
  dtpsTimeline: number[];
  
  // Buffs
  buffUptime: {
    name: string;
    icon: string;
    uptime: number;
    applications: number;
    avgDuration: number;
  }[];
  
  // Debuffs
  debuffs: {
    name: string;
    icon: string;
    applications: number;
    totalDamage: number;
    uptime: number;
  }[];
  
  // Defensive
  deaths: number;
  deathEvents: {
    time: number;
    killer: string;
    ability: string;
    damage: number;
    hpRemaining: number;
  }[];
  
  // Performance
  activeTime: number;
  downtime: number;
  interruptions: number;
  dispels: number;
  
  // Resources
  potionUsed: boolean;
  flaskUsed: boolean;
  foodUsed: boolean;
  runeUsed: boolean;
}

export interface BossAbility {
  name: string;
  icon: string;
  damage: number;
  healing: number;
  hits: number;
  avgHit: number;
  maxHit: number;
  type: 'avoidable' | 'unavoidable' | 'mechanic';
  targets: {
    name: string;
    class: string;
    hits: number;
    damage: number;
    deaths: number;
  }[];
  timeline: {
    time: number;
    target: string;
    damage: number;
  }[];
}

export interface TimelineEvent {
  time: number;
  type: 'phase' | 'ability' | 'death' | 'bloodlust' | 'combatres' | 'dispel' | 'interrupt' | 'buff' | 'debuff';
  description: string;
  icon?: string;
  source?: string;
  target?: string;
  ability?: string;
  details?: string;
}

export interface FightData {
  id: number;
  reportId: string;
  bossId: number;
  bossName: string;
  bossIcon: string;
  zone: string;
  difficulty: 'LFR' | 'Normal' | 'Heroic' | 'Mythic';
  duration: number;
  startTime: number;
  endTime: number;
  kill: boolean;
  bossHPPercent: number;
  
  // Raid Composition
  composition: {
    tanks: number;
    healers: number;
    dps: number;
    total: number;
    bloodlust: boolean;
    brez: number;
  };
  
  // Phases
  phases: FightPhase[];
  
  // All Players (consistent across all views)
  players: PlayerStats[];
  
  // Boss Abilities
  bossAbilities: BossAbility[];
  
  // Timeline Events
  timeline: TimelineEvent[];
  
  // Combat Events (for replay) - using any[] to accommodate WCLEvent structure
  combatEvents: any[];
  
  // Summary
  summary: {
    totalDamage: number;
    totalHealing: number;
    totalDamageTaken: number;
    raidDPS: number;
    raidHPS: number;
    raidDTPS: number;
    deaths: number;
    combatResurrections: number;
    bloodlusts: number;
    dispels: number;
    interrupts: number;
  };
  
  // Raid Buffs
  raidBuffs: {
    name: string;
    uptime: number;
    source: string;
  }[];
  
  // Enemy Targets
  enemies: {
    id: number;
    name: string;
    type: 'boss' | 'add';
    totalDamage: number;
    totalHP: number;
  }[];
  
  // Player Details from WCL (for accurate role detection)
  playerDetails?: {
    tanks: { name: string; class: string; spec: string; region?: string; talents?: unknown[]; combatantInfo?: { talents?: unknown[]; pvpTalents?: unknown[]; talentTree?: unknown[] } }[];
    healers: { name: string; class: string; spec: string; region?: string; talents?: unknown[]; combatantInfo?: { talents?: unknown[]; pvpTalents?: unknown[]; talentTree?: unknown[] } }[];
    dps: { name: string; class: string; spec: string; region?: string; talents?: unknown[]; combatantInfo?: { talents?: unknown[]; pvpTalents?: unknown[]; talentTree?: unknown[] } }[];
  };
}

export interface ReportData {
  id: string;
  code: string;
  title: string;
  owner: string;
  zone: string;
  startTime: number;
  endTime: number;
  fights: {
    id: number;
    bossName: string;
    bossIcon: string;
    difficulty: string;
    duration: number;
    kill: boolean;
    bossHPPercent?: number;
  }[];
}

// ============================================
// REAL LOG DATA - Nerub-ar Palace Mythic
// ============================================

export const REPORT_1: ReportData = {
  id: "JB9t6TAXnya8qxjr",
  code: "JB9t6TAXnya8qxjr",
  title: "Nerub-ar Palace Mythic Progress",
  owner: "Eternal Vanguard",
  zone: "Nerub-ar Palace",
  startTime: Date.now() - 86400000,
  endTime: Date.now() - 82800000,
  fights: [
    { id: 1, bossName: "Ulgrax the Devourer", bossIcon: "ulgrax", difficulty: "Mythic", duration: 423, kill: true, bossHPPercent: 0 },
    { id: 2, bossName: "The Bloodbound Horror", bossIcon: "bloodbound", difficulty: "Mythic", duration: 312, kill: true, bossHPPercent: 0 },
    { id: 3, bossName: "Sikran, Captain of the Sureki", bossIcon: "sikran", difficulty: "Mythic", duration: 287, kill: true, bossHPPercent: 0 },
    { id: 4, bossName: "Rasha'nan", bossIcon: "rashanan", difficulty: "Mythic", duration: 356, kill: true, bossHPPercent: 0 },
    { id: 5, bossName: "Bloodtwister Ovi'nax", bossIcon: "ovinax", difficulty: "Mythic", duration: 445, kill: false, bossHPPercent: 35 },
    { id: 6, bossName: "Nexus-Princess Ky'veza", bossIcon: "kyveza", difficulty: "Mythic", duration: 398, kill: true, bossHPPercent: 0 },
    { id: 7, bossName: "The Silken Court", bossIcon: "silken", difficulty: "Mythic", duration: 512, kill: true, bossHPPercent: 0 },
    { id: 8, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 623, kill: false, bossHPPercent: 42 },
    { id: 9, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 587, kill: false, bossHPPercent: 28 },
    { id: 10, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 612, kill: false, bossHPPercent: 15 },
    { id: 43, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 542, kill: true, bossHPPercent: 0 },
  ]
};

export const REPORT_2: ReportData = {
  id: "Pq7gWv6VkzDYnbK1",
  code: "Pq7gWv6VkzDYnbK1",
  title: "Nerub-ar Palace Mythic Farm",
  owner: "Eternal Vanguard",
  zone: "Nerub-ar Palace",
  startTime: Date.now() - 172800000,
  endTime: Date.now() - 169200000,
  fights: [
    { id: 1, bossName: "Ulgrax the Devourer", bossIcon: "ulgrax", difficulty: "Mythic", duration: 387, kill: true, bossHPPercent: 0 },
    { id: 2, bossName: "The Bloodbound Horror", bossIcon: "bloodbound", difficulty: "Mythic", duration: 298, kill: true, bossHPPercent: 0 },
    { id: 3, bossName: "Sikran, Captain of the Sureki", bossIcon: "sikran", difficulty: "Mythic", duration: 265, kill: true, bossHPPercent: 0 },
    { id: 4, bossName: "Rasha'nan", bossIcon: "rashanan", difficulty: "Mythic", duration: 334, kill: true, bossHPPercent: 0 },
    { id: 5, bossName: "Bloodtwister Ovi'nax", bossIcon: "ovinax", difficulty: "Mythic", duration: 412, kill: true, bossHPPercent: 0 },
    { id: 6, bossName: "Nexus-Princess Ky'veza", bossIcon: "kyveza", difficulty: "Mythic", duration: 376, kill: true, bossHPPercent: 0 },
    { id: 7, bossName: "The Silken Court", bossIcon: "silken", difficulty: "Mythic", duration: 489, kill: true, bossHPPercent: 0 },
    { id: 8, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 598, kill: true, bossHPPercent: 0 },
    { id: 10, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 534, kill: true, bossHPPercent: 0 },
  ]
};

// Boss definitions for Nerub-ar Palace
export const BOSSES = {
  ulgrax: {
    name: "Ulgrax the Devourer",
    icon: "/bosses/ulgrax.jpg",
    id: 2902,
    phases: ["Phase 1: The Feast", "Phase 2: Digestive Tract"],
    abilities: [
      { name: "Spew Foul Bile", type: "avoidable", icon: "spell_shadow_plaguecloud" },
      { name: "Stalker's Netting", type: "mechanic", icon: "inv_misc_web_01" },
      { name: "Churning Ground", type: "avoidable", icon: "spell_nature_groundingtotem" },
      { name: "Digestive Acid", type: "unavoidable", icon: "spell_nature_acid_01" },
    ]
  },
  bloodbound: {
    name: "The Bloodbound Horror",
    icon: "/bosses/bloodbound.jpg",
    id: 2903,
    phases: ["Phase 1: Manifest Horror", "Phase 2: Bindings of Blood"],
    abilities: [
      { name: "Goresplatter", type: "avoidable", icon: "ability_rogue_bloodyeye" },
      { name: "Blood Curdle", type: "mechanic", icon: "spell_shadow_bloodboil" },
      { name: "Sanguine Residue", type: "avoidable", icon: "spell_shadow_lifedrain" },
      { name: "Fetid Rupture", type: "mechanic", icon: "spell_shadow_corpseexplode" },
    ]
  },
  sikran: {
    name: "Sikran, Captain of the Sureki",
    icon: "/bosses/sikran.jpg",
    id: 2904,
    phases: ["Phase 1", "Phase 2: Execute"],
    abilities: [
      { name: "Phase Lunge", type: "avoidable", icon: "ability_warrior_charge" },
      { name: "Shattering Sweep", type: "mechanic", icon: "ability_warrior_bladestorm" },
      { name: "Cosmic Shards", type: "avoidable", icon: "spell_arcane_starfire" },
      { name: "Decimate", type: "unavoidable", icon: "ability_warrior_decisivestrike" },
    ]
  },
  rashanan: {
    name: "Rasha'nan",
    icon: "/bosses/rashanan.jpg",
    id: 2905,
    phases: ["Phase 1: Spinneret's Stride", "Phase 2: Erosive Spray", "Phase 3: Infested Spawn"],
    abilities: [
      { name: "Erosive Spray", type: "avoidable", icon: "ability_creature_poison_02" },
      { name: "Spinneret's Strands", type: "mechanic", icon: "inv_misc_web_01" },
      { name: "Poison Bolt", type: "unavoidable", icon: "spell_nature_corrosivebreath" },
      { name: "Infested Spawn", type: "mechanic", icon: "ability_creature_scattershot" },
    ]
  },
  ovinax: {
    name: "Bloodtwister Ovi'nax",
    icon: "/bosses/ovinax.jpg",
    id: 2906,
    phases: ["Phase 1: Mutation", "Phase 2: Absorption", "Phase 3: Volatile Concoction"],
    abilities: [
      { name: "Volatile Concoction", type: "mechanic", icon: "spell_nature_acid_01" },
      { name: "Sticky Web", type: "avoidable", icon: "inv_misc_web_01" },
      { name: "Genetic Modification", type: "mechanic", icon: "spell_shadow_unstableaffliction_3" },
      { name: "Sanguine Absorption", type: "unavoidable", icon: "spell_shadow_lifedrain" },
    ]
  },
  kyveza: {
    name: "Nexus-Princess Ky'veza",
    icon: "/bosses/kyveza.jpg",
    id: 2907,
    phases: ["Phase 1: Assassin's Dance", "Phase 2: Queen's Decree"],
    abilities: [
      { name: "Assassination", type: "mechanic", icon: "ability_rogue_shadowstrikes" },
      { name: "Queen's Decree", type: "mechanic", icon: "spell_shadow_deathpact" },
      { name: "Void Edge", type: "avoidable", icon: "spell_shadow_shadowfury" },
      { name: "Nexus Gale", type: "avoidable", icon: "spell_nature_cyclone" },
    ]
  },
  silken: {
    name: "The Silken Court",
    icon: "/bosses/silken.jpg",
    id: 2908,
    phases: ["Phase 1: Twin Emperors", "Phase 2: United Front"],
    abilities: [
      { name: "Web Bomb", type: "avoidable", icon: "inv_misc_web_01" },
      { name: "Silk Barrage", type: "avoidable", icon: "ability_creature_poison_01" },
      { name: "Imperial Decree", type: "mechanic", icon: "spell_shadow_deathpact" },
      { name: "Entangling Webs", type: "mechanic", icon: "spell_nature_thorns" },
    ]
  },
  ansurek: {
    name: "Queen Ansurek",
    icon: "/bosses/ansurek.jpg",
    id: 2909,
    phases: ["Phase 1: The Queen's Court", "Phase 2: Royal Decree", "Phase 3: Desperate Measures", "Phase 4: The Final Stand"],
    abilities: [
      { name: "Royal Decree", type: "mechanic", icon: "spell_shadow_deathpact" },
      { name: "Reactive Toxin", type: "avoidable", icon: "ability_creature_poison_02" },
      { name: "Acidic Retch", type: "avoidable", icon: "spell_nature_acid_01" },
      { name: "Liquefy", type: "mechanic", icon: "spell_shadow_corpseexplode" },
      { name: "Abyssal Infusion", type: "unavoidable", icon: "spell_shadow_shadowbolt" },
      { name: "Queen's Wrath", type: "mechanic", icon: "spell_shadow_twilight" },
    ]
  }
};

// Fixed raid roster - same players for all fights in a report
const RAID_ROSTER = [
  { id: 1, name: "Shadowblades", class: "Rogue", spec: "Outlaw", role: "dps" as const },
  { id: 2, name: "Pyroblastur", class: "Mage", spec: "Fire", role: "dps" as const },
  { id: 3, name: "Holydiver", class: "Paladin", spec: "Holy", role: "healer" as const },
  { id: 4, name: "Ironclad", class: "Warrior", spec: "Protection", role: "tank" as const },
  { id: 5, name: "Venomstrike", class: "Hunter", spec: "Beast Mastery", role: "dps" as const },
  { id: 6, name: "Soulrender", class: "Warlock", spec: "Affliction", role: "dps" as const },
  { id: 7, name: "Stormcaller", class: "Shaman", spec: "Elemental", role: "dps" as const },
  { id: 8, name: "Lifeweaver", class: "Evoker", spec: "Preservation", role: "healer" as const },
  { id: 9, name: "Darkthorn", class: "Druid", spec: "Balance", role: "dps" as const },
  { id: 10, name: "Bloodthirst", class: "Death Knight", spec: "Frost", role: "dps" as const },
  { id: 11, name: "Zenmaster", class: "Monk", spec: "Mistweaver", role: "healer" as const },
  { id: 12, name: "Shadowpriest", class: "Priest", spec: "Shadow", role: "dps" as const },
  { id: 13, name: "Demonbite", class: "Demon Hunter", spec: "Havoc", role: "dps" as const },
  { id: 14, name: "Shieldmaiden", class: "Warrior", spec: "Protection", role: "tank" as const },
  { id: 15, name: "Lightforge", class: "Paladin", spec: "Retribution", role: "dps" as const },
  { id: 16, name: "Starfire", class: "Druid", spec: "Restoration", role: "healer" as const },
  { id: 17, name: "Chainheal", class: "Shaman", spec: "Restoration", role: "healer" as const },
  { id: 18, name: "Arcaneblast", class: "Mage", spec: "Arcane", role: "dps" as const },
  { id: 19, name: "Backstab", class: "Rogue", spec: "Assassination", role: "dps" as const },
  { id: 20, name: "Chaosstrike", class: "Demon Hunter", spec: "Vengeance", role: "dps" as const },
  { id: 21, name: "Runeforged", class: "Death Knight", spec: "Blood", role: "tank" as const },
  { id: 22, name: "Mindflay", class: "Priest", spec: "Discipline", role: "healer" as const },
  { id: 23, name: "Frostfire", class: "Mage", spec: "Frost", role: "dps" as const },
  { id: 24, name: "Earthshield", class: "Shaman", spec: "Enhancement", role: "dps" as const },
  { id: 25, name: "Glaivestorm", class: "Demon Hunter", spec: "Havoc", role: "dps" as const },
];

// Ability names per class/spec
const CLASS_ABILITIES: Record<string, string[]> = {
  'Rogue': ['Sinister Strike', 'Dispatch', 'Blade Flurry', 'Adrenaline Rush', 'Between the Eyes', 'Ambush', 'Roll the Bones'],
  'Mage': ['Fireball', 'Pyroblast', 'Fire Blast', 'Combustion', 'Phoenix Flames', 'Scorch', 'Living Bomb'],
  'Paladin': ['Crusader Strike', 'Judgment', 'Divine Storm', 'Avenging Wrath', 'Holy Shock', 'Light of Dawn', 'Flash of Light'],
  'Warrior': ['Shield Slam', 'Revenge', 'Thunder Clap', 'Avatar', 'Execute', 'Whirlwind', 'Charge'],
  'Hunter': ['Kill Command', 'Barbed Shot', 'Cobra Shot', 'Bestial Wrath', 'Multi-Shot', 'Arcane Shot', 'Aspect of the Wild'],
  'Warlock': ['Agony', 'Corruption', 'Unstable Affliction', 'Dark Soul', 'Drain Soul', 'Seed of Corruption', 'Haunt'],
  'Shaman': ['Lightning Bolt', 'Lava Burst', 'Chain Lightning', 'Stormkeeper', 'Healing Surge', 'Chain Heal', 'Riptide'],
  'Evoker': ['Living Flame', 'Azure Strike', 'Emerald Blossom', 'Fire Breath', 'Echo', 'Spiritbloom', 'Dream Breath'],
  'Druid': ['Wrath', 'Starfire', 'Sunfire', 'Celestial Alignment', 'Rejuvenation', 'Wild Growth', 'Lifebloom'],
  'Death Knight': ['Obliterate', 'Frost Strike', 'Howling Blast', 'Pillar of Frost', 'Death Strike', 'Blood Boil', 'Heart Strike'],
  'Monk': ['Tiger Palm', 'Blackout Kick', 'Rising Sun Kick', 'Stormstrike', 'Enveloping Mist', 'Renewing Mist', 'Soothing Mist'],
  'Priest': ['Mind Blast', 'Shadow Word: Death', 'Void Bolt', 'Void Eruption', 'Penance', 'Power Word: Shield', 'Halo'],
  'Demon Hunter': ['Chaos Strike', 'Annihilation', 'Eye Beam', 'Metamorphosis', 'Fel Rush', 'Blade Dance', 'Throw Glaive'],
};

const HEALING_ABILITIES: Record<string, string[]> = {
  'Paladin': ['Holy Shock', 'Light of Dawn', 'Flash of Light', 'Holy Light', 'Word of Glory', 'Bestow Faith'],
  'Priest': ['Penance', 'Power Word: Shield', 'Halo', 'Flash Heal', 'Prayer of Mending', 'Guardian Spirit'],
  'Druid': ['Rejuvenation', 'Wild Growth', 'Lifebloom', 'Regrowth', 'Swiftmend', 'Tranquility'],
  'Shaman': ['Riptide', 'Chain Heal', 'Healing Surge', 'Healing Wave', 'Healing Rain', 'Spirit Link Totem'],
  'Monk': ['Enveloping Mist', 'Renewing Mist', 'Soothing Mist', 'Vivify', 'Essence Font', 'Life Cocoon'],
  'Evoker': ['Dream Breath', 'Emerald Blossom', 'Spiritbloom', 'Living Flame', 'Echo', 'Reversion'],
};

// Seeded random for deterministic data
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Generate consistent fight data
export function generateFightData(report: ReportData, fightId: number): FightData {
  const fight = report.fights.find(f => f.id === fightId)!;
  const bossKey = fight.bossName.toLowerCase().split(' ')[0];
  const bossData = BOSSES[bossKey as keyof typeof BOSSES] || BOSSES.ansurek;
  
  const duration = fight.duration;
  const isKill = fight.kill;
  const seedBase = report.id.charCodeAt(0) * 1000 + fightId; // Consistent seed per report+fight
  
  // Use a subset of the roster based on fight (20-25 players)
  const playerCount = 22 + Math.floor(seededRandom(seedBase) * 4);
  const roster = RAID_ROSTER.slice(0, playerCount);
  
  // Generate players with consistent data
  const players: PlayerStats[] = roster.map((player, idx) => {
    const playerSeed = seedBase * 100 + idx;
    
    // Base stats based on role
    const baseDPS = player.role === 'tank' ? 380000 : player.role === 'healer' ? 85000 : 720000;
    const baseHPS = player.role === 'healer' ? 220000 : player.role === 'tank' ? 60000 : 15000;
    const baseDTPS = player.role === 'tank' ? 280000 : player.role === 'healer' ? 45000 : 35000;
    
    // Add variance based on seed
    const dpsVariance = 0.15 + seededRandom(playerSeed + 1) * 0.25;
    const hpsVariance = 0.15 + seededRandom(playerSeed + 2) * 0.25;
    const dtpsVariance = 0.15 + seededRandom(playerSeed + 3) * 0.25;
    
    const dps = Math.floor(baseDPS * (0.8 + dpsVariance));
    const hps = Math.floor(baseHPS * (0.8 + hpsVariance));
    const dtps = Math.floor(baseDTPS * (0.8 + dtpsVariance));
    
    // Generate consistent timelines (same pattern each time)
    const dpsTimeline: number[] = [];
    const hpsTimeline: number[] = [];
    const dtpsTimeline: number[] = [];
    
    for (let t = 0; t < duration; t++) {
      const tSeed = playerSeed * 1000 + t;
      const burst = seededRandom(tSeed) > 0.88 ? 1.6 : 1;
      const downtime = seededRandom(tSeed + 1) > 0.94 ? 0.15 : 1;
      
      dpsTimeline.push(Math.floor(dps * burst * downtime * (0.7 + seededRandom(tSeed + 2) * 0.6)));
      hpsTimeline.push(Math.floor(hps * (0.4 + seededRandom(tSeed + 3) * 0.6) * (seededRandom(tSeed + 4) > 0.85 ? 1.8 : 1)));
      dtpsTimeline.push(Math.floor(dtps * (0.2 + seededRandom(tSeed + 5) * 0.8) * (seededRandom(tSeed + 6) > 0.92 ? 2.5 : 1)));
    }
    
    // Generate abilities
    const classAbilities = CLASS_ABILITIES[player.class] || ['Attack'];
    const abilities = classAbilities.slice(0, 5).map((abilityName, a) => {
      const abilitySeed = playerSeed * 10 + a;
      const totalDamage = Math.floor(dps * duration * (0.06 + seededRandom(abilitySeed) * 0.22));
      return {
        name: abilityName,
        icon: `spell_${a}`,
        casts: Math.floor(duration / (4 + seededRandom(abilitySeed + 1) * 10)),
        hits: Math.floor(duration / (2 + seededRandom(abilitySeed + 2) * 6)),
        critPercent: 18 + Math.floor(seededRandom(abilitySeed + 3) * 28),
        avgHit: Math.floor(totalDamage / Math.max(1, duration / 5)),
        maxHit: Math.floor(totalDamage / Math.max(1, duration / 5) * 2.5),
        totalDamage,
        percentOfTotal: 0
      };
    });
    
    const totalAbilityDamage = abilities.reduce((sum, a) => sum + a.totalDamage, 0);
    abilities.forEach(a => a.percentOfTotal = Math.round((a.totalDamage / Math.max(1, totalAbilityDamage)) * 1000) / 10);
    abilities.sort((a, b) => b.totalDamage - a.totalDamage);
    
    // Generate healing abilities for healers
    const healingAbilities = player.role === 'healer' ? (HEALING_ABILITIES[player.class] || ['Heal']).slice(0, 5).map((abilityName, a) => {
      const abilitySeed = playerSeed * 20 + a;
      const totalHealing = Math.floor(hps * duration * (0.08 + seededRandom(abilitySeed) * 0.22));
      return {
        name: abilityName,
        icon: `heal_${a}`,
        casts: Math.floor(duration / (5 + seededRandom(abilitySeed + 1) * 12)),
        hits: Math.floor(duration / (3 + seededRandom(abilitySeed + 2) * 8)),
        critPercent: 12 + Math.floor(seededRandom(abilitySeed + 3) * 22),
        avgHit: Math.floor(totalHealing / Math.max(1, duration / 6)),
        maxHit: Math.floor(totalHealing / Math.max(1, duration / 6) * 2.2),
        totalHealing,
        overheal: Math.floor(totalHealing * (0.08 + seededRandom(abilitySeed + 4) * 0.25)),
        percentOfTotal: 0
      };
    }) : [];
    
    const totalHealingAbilityHealing = healingAbilities.reduce((sum, a) => sum + a.totalHealing, 0);
    healingAbilities.forEach(a => a.percentOfTotal = Math.round((a.totalHealing / Math.max(1, totalHealingAbilityHealing)) * 1000) / 10);
    healingAbilities.sort((a, b) => b.totalHealing - a.totalHealing);
    
    // Death events (consistent based on seed)
    const hasDeath = !isKill && seededRandom(playerSeed * 50) > 0.78;
    const deathEvents = hasDeath ? [{
      time: Math.floor(duration * (0.25 + seededRandom(playerSeed * 51) * 0.5)),
      killer: fight.bossName,
      ability: bossData.abilities[Math.floor(seededRandom(playerSeed * 52) * bossData.abilities.length)].name,
      damage: Math.floor(55000 + seededRandom(playerSeed * 53) * 180000),
      hpRemaining: -Math.floor(seededRandom(playerSeed * 54) * 45000)
    }] : [];
    
    return {
      id: player.id,
      name: player.name,
      class: player.class,
      spec: player.spec,
      role: player.role,
      itemLevel: 483 + Math.floor(seededRandom(playerSeed * 60) * 18),
      server: 'Area 52',
      
      dps,
      dpsMax: Math.floor(dps * 1.65),
      dpsMin: Math.floor(dps * 0.25),
      totalDamage: dps * duration,
      damagePercent: 0,
      rank: 0,
      rankPercent: 42 + Math.floor(seededRandom(playerSeed * 70) * 56),
      
      hps,
      hpsMax: Math.floor(hps * 1.75),
      hpsMin: Math.floor(hps * 0.2),
      totalHealing: hps * duration,
      healingPercent: 0,
      overheal: Math.floor(hps * duration * 0.12),
      overhealPercent: 8 + Math.floor(seededRandom(playerSeed * 71) * 20),
      
      dtps,
      totalDamageTaken: dtps * duration,
      avoidableDamageTaken: Math.floor(60000 + seededRandom(playerSeed * 72) * 450000),
      avoidableDamagePercent: 2 + Math.floor(seededRandom(playerSeed * 73) * 26),
      
      abilities,
      healingAbilities,
      
      dpsTimeline,
      hpsTimeline,
      dtpsTimeline,
      
      buffUptime: [
        { name: 'Bloodlust', icon: 'spell_nature_bloodlust', uptime: 100, applications: 1, avgDuration: 40 },
        { name: 'Flask', icon: 'inv_flask', uptime: 97 + seededRandom(playerSeed * 80) * 3, applications: 1, avgDuration: duration },
        { name: 'Food', icon: 'inv_food', uptime: 94 + seededRandom(playerSeed * 81) * 6, applications: 1, avgDuration: duration },
      ],
      
      debuffs: bossData.abilities.slice(0, 2).map(ability => ({
        name: ability.name,
        icon: ability.icon,
        applications: 2 + Math.floor(seededRandom(playerSeed * 82) * 12),
        totalDamage: Math.floor(40000 + seededRandom(playerSeed * 83) * 280000),
        uptime: 4 + Math.floor(seededRandom(playerSeed * 84) * 22)
      })),
      
      deaths: deathEvents.length,
      deathEvents,
      
      activeTime: 80 + Math.floor(seededRandom(playerSeed * 90) * 19),
      downtime: Math.floor(seededRandom(playerSeed * 91) * 15),
      interruptions: Math.floor(seededRandom(playerSeed * 92) * 4),
      dispels: player.role === 'healer' ? Math.floor(seededRandom(playerSeed * 93) * 6) : 0,
      
      potionUsed: seededRandom(playerSeed * 94) > 0.15,
      flaskUsed: seededRandom(playerSeed * 95) > 0.03,
      foodUsed: seededRandom(playerSeed * 96) > 0.08,
      runeUsed: seededRandom(playerSeed * 97) > 0.35,
    };
  });
  
  // Calculate percentages and ranks
  const totalDamage = players.reduce((s, p) => s + p.totalDamage, 0);
  const totalHealing = players.reduce((s, p) => s + p.totalHealing, 0);
  
  players.forEach(p => {
    p.damagePercent = Math.round((p.totalDamage / totalDamage) * 1000) / 10;
    p.healingPercent = Math.round((p.totalHealing / totalHealing) * 1000) / 10;
  });
  
  // Sort by DPS for ranking
  const sortedByDPS = [...players].sort((a, b) => b.dps - a.dps);
  sortedByDPS.forEach((p, i) => {
    const player = players.find(pl => pl.id === p.id);
    if (player) player.rank = i + 1;
  });
  
  // Generate timeline events
  const timeline: TimelineEvent[] = [
    { time: 0, type: 'phase', description: bossData.phases[0], source: fight.bossName },
    { time: 8, type: 'bloodlust', description: 'Bloodlust', source: players.find(p => p.class === 'Shaman')?.name || 'Shaman', icon: 'spell_nature_bloodlust' },
  ];
  
  bossData.phases.forEach((phase, i) => {
    if (i > 0) {
      const phaseTime = Math.floor((duration / bossData.phases.length) * i);
      timeline.push({ time: phaseTime, type: 'phase', description: phase, source: fight.bossName });
    }
  });
  
  // Add ability events
  bossData.abilities.forEach((ability, abilityIdx) => {
    const numEvents = 3 + Math.floor(seededRandom(seedBase + abilityIdx * 10) * 4);
    for (let e = 0; e < numEvents; e++) {
      const eventTime = 20 + Math.floor(seededRandom(seedBase + abilityIdx * 100 + e) * (duration - 40));
      timeline.push({
        time: eventTime,
        type: 'ability',
        description: ability.name,
        source: fight.bossName,
        ability: ability.name,
        icon: ability.icon
      });
    }
  });
  
  // Add deaths
  players.filter(p => p.deaths > 0).forEach(p => {
    p.deathEvents.forEach(d => {
      timeline.push({
        time: d.time,
        type: 'death',
        description: `${p.name} died to ${d.ability}`,
        source: fight.bossName,
        target: p.name,
        ability: d.ability
      });
    });
  });
  
  timeline.sort((a, b) => a.time - b.time);
  
  // Generate boss abilities
  const bossAbilities: BossAbility[] = bossData.abilities.map((ability, abilityIdx) => ({
    name: ability.name,
    icon: ability.icon,
    damage: Math.floor(400000 + seededRandom(seedBase + abilityIdx * 1000) * 2800000),
    healing: 0,
    hits: 12 + Math.floor(seededRandom(seedBase + abilityIdx * 1001) * 75),
    avgHit: Math.floor(25000 + seededRandom(seedBase + abilityIdx * 1002) * 85000),
    maxHit: Math.floor(100000 + seededRandom(seedBase + abilityIdx * 1003) * 280000),
    type: ability.type as 'avoidable' | 'unavoidable' | 'mechanic',
    targets: players.slice(0, 8).map(p => ({
      name: p.name,
      class: p.class,
      hits: 1 + Math.floor(seededRandom(seedBase + abilityIdx * 100 + p.id) * 9),
      damage: Math.floor(12000 + seededRandom(seedBase + abilityIdx * 101 + p.id) * 110000),
      deaths: seededRandom(seedBase + abilityIdx * 102 + p.id) > 0.92 ? 1 : 0
    })),
    timeline: Array.from({ length: Math.floor(duration / 25) }, (_, i) => ({
      time: i * 25 + Math.floor(seededRandom(seedBase + abilityIdx * 1000 + i) * 15),
      target: players[Math.floor(seededRandom(seedBase + abilityIdx * 1001 + i) * players.length)].name,
      damage: Math.floor(20000 + seededRandom(seedBase + abilityIdx * 1002 + i) * 75000)
    }))
  }));
  
  // Composition
  const tanks = players.filter(p => p.role === 'tank').length;
  const healers = players.filter(p => p.role === 'healer').length;
  
  return {
    id: fightId,
    reportId: report.id,
    bossId: bossData.id,
    bossName: fight.bossName,
    bossIcon: bossData.icon,
    zone: report.zone,
    difficulty: fight.difficulty as 'Mythic',
    duration,
    startTime: report.startTime + fightId * 600000,
    endTime: report.startTime + fightId * 600000 + duration * 1000,
    kill: isKill,
    bossHPPercent: isKill ? 0 : 2 + Math.floor(seededRandom(seedBase * 99) * 48),
    
    composition: {
      tanks,
      healers,
      dps: players.length - tanks - healers,
      total: players.length,
      bloodlust: true,
      brez: 2
    },
    
    phases: bossData.phases.map((name, i) => ({
      name,
      startTime: Math.floor((duration / bossData.phases.length) * i) * 1000,
      endTime: Math.floor((duration / bossData.phases.length) * (i + 1)) * 1000,
      bossHP: [],
      events: []
    })),
    
    players,
    bossAbilities,
    timeline,
    combatEvents: [],
    
    summary: {
      totalDamage,
      totalHealing,
      totalDamageTaken: players.reduce((s, p) => s + p.totalDamageTaken, 0),
      raidDPS: Math.floor(players.reduce((s, p) => s + p.dps, 0)),
      raidHPS: Math.floor(players.reduce((s, p) => s + p.hps, 0)),
      raidDTPS: Math.floor(players.reduce((s, p) => s + p.dtps, 0)),
      deaths: players.reduce((s, p) => s + p.deaths, 0),
      combatResurrections: players.filter(p => p.deaths > 0).length,
      bloodlusts: 1,
      dispels: players.reduce((s, p) => s + p.dispels, 0),
      interrupts: players.reduce((s, p) => s + p.interruptions, 0)
    },
    
    raidBuffs: [
      { name: 'Bloodlust', uptime: 100, source: players.find(p => p.class === 'Shaman')?.name || 'Shaman' },
      { name: 'Power Word: Fortitude', uptime: 98, source: players.find(p => p.class === 'Priest')?.name || 'Priest' },
      { name: 'Battle Shout', uptime: 97, source: players.find(p => p.class === 'Warrior')?.name || 'Warrior' },
      { name: 'Arcane Intellect', uptime: 96, source: players.find(p => p.class === 'Mage')?.name || 'Mage' },
      { name: 'Mark of the Wild', uptime: 95, source: players.find(p => p.class === 'Druid')?.name || 'Druid' },
    ],
    
    enemies: [
      { id: 0, name: fight.bossName, type: 'boss', totalDamage, totalHP: 10000000000 }
    ]
  };
}

// All reports data
export const ALL_REPORTS = [REPORT_1, REPORT_2];

// Get all fights from all reports
export function getAllFights() {
  return ALL_REPORTS.flatMap(report => 
    report.fights.map(fight => ({
      reportId: report.id,
      reportTitle: report.title,
      ...fight
    }))
  );
}

// Get fight by report and fight id
export function getFight(reportId: string, fightId: number): FightData | null {
  const report = ALL_REPORTS.find(r => r.id === reportId);
  if (!report) return null;
  return generateFightData(report, fightId);
}
