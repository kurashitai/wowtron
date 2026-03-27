// ============================================
// MIDNIGHT EXPANSION - RAID BOSS DATA
// ============================================
// Real boss data for Voidspire and Dreamrift raids
// Season 1 of Midnight expansion (March 2026)

export interface BossMechanic {
  id: string;
  name: string;
  type: 'avoidable' | 'unavoidable' | 'soak' | 'interrupt' | 'dispel' | 'positioning' | 'tank_swap' | 'raid_cd';
  description: string;
  damage?: number;
  frequency?: number; // seconds between casts
  duration?: number; // effect duration
  targets?: 'tank' | 'healer' | 'dps' | 'everyone' | 'random';
  tip: string;
  warning?: string;
}

export interface BossPhase {
  name: string;
  hpRange: [number, number]; // [start%, end%]
  mechanics: string[]; // mechanic ids
  tips: string[];
}

export interface BossData {
  id: number;
  name: string;
  nickname: string;
  zone: 'voidspire' | 'dreamrift' | 'queldanas';
  order: number;
  icon: string;
  
  // Difficulty info
  enrageTimer: number; // seconds
  requiredDPS: number; // raid DPS needed
  requiredHPS: number; // raid HPS needed
  
  // Mechanics
  mechanics: BossMechanic[];
  phases: BossPhase[];
  
  // Analysis weights
  deathCauses: Record<string, number>; // mechanic -> % of deaths
  commonMistakes: string[];
  
  // Useful tips for raid leaders
  positioning: string[];
  compSuggestions: string[];
  trinketSuggestions: { good: string[]; bad: string[] };
}

// ============================================
// VOIDSPIRE RAID - 6 Bosses
// ============================================

export const VOIDSPIRE_BOSSES: BossData[] = [
  {
    id: 3001,
    name: "Imperator Averzian",
    nickname: "averzian",
    zone: "voidspire",
    order: 1,
    icon: "void_impaler",
    
    enrageTimer: 480,
    requiredDPS: 18000000,
    requiredHPS: 3500000,
    
    mechanics: [
      {
        id: "void_cleave",
        name: "Void Cleave",
        type: "tank_swap",
        description: "Heavy tank damage, applies stacking debuff",
        damage: 800000,
        frequency: 8,
        targets: "tank",
        tip: "Swap at 3 stacks, use personal CDs for 4th stack if needed"
      },
      {
        id: "darkened_wake",
        name: "Darkened Wake",
        type: "avoidable",
        description: "Frontal cone that leaves void zones",
        damage: 600000,
        frequency: 15,
        targets: "everyone",
        tip: "Move behind boss, don't drop pools in melee",
        warning: "Pools persist for 30s!"
      },
      {
        id: "imperial_decree",
        name: "Imperial Decree",
        type: "positioning",
        description: "Players marked must spread to corners",
        damage: 450000,
        frequency: 30,
        targets: "random",
        tip: "Pre-position to assigned corners when marks appear"
      },
      {
        id: "void_blast",
        name: "Void Blast",
        type: "raid_cd",
        description: "Raid-wide shadow damage",
        damage: 350000,
        frequency: 45,
        targets: "everyone",
        tip: "Use raid CDs here, especially on empowered casts"
      },
      {
        id: "shadow_chains",
        name: "Shadow Chains",
        type: "dispel",
        description: "Links 3 players, deals damage if separated",
        damage: 200000,
        frequency: 25,
        targets: "random",
        tip: "Stay close to linked players, dispel once stacked"
      }
    ],
    
    phases: [
      {
        name: "Phase 1: The Emperor's Might",
        hpRange: [100, 60],
        mechanics: ["void_cleave", "darkened_wake", "void_blast"],
        tips: ["Save lust for Phase 2", "Focus on clean positioning"]
      },
      {
        name: "Phase 2: Imperial Wrath",
        hpRange: [60, 30],
        mechanics: ["void_cleave", "imperial_decree", "void_blast", "shadow_chains"],
        tips: ["Bloodlust here", "Handle Decree quickly"]
      },
      {
        name: "Phase 3: Desperation",
        hpRange: [30, 0],
        mechanics: ["void_cleave", "darkened_wake", "void_blast", "imperial_decree"],
        tips: ["All CDs, ignore some mechanics if needed", "Push phase"]
      }
    ],
    
    deathCauses: {
      "darkened_wake": 35,
      "imperial_decree": 28,
      "void_cleave": 20,
      "shadow_chains": 12,
      "other": 5
    },
    
    commonMistakes: [
      "Dropping void pools in melee range",
      "Late tank swaps causing tank deaths",
      "Not stacking for Shadow Chains",
      "Slow reactions to Imperial Decree"
    ],
    
    positioning: [
      "Tank boss in center of room",
      "Ranged spread in a crescent behind boss",
      "Drop Darkened Wake pools near walls",
      "Imperial Decree corners: pre-assign positions"
    ],
    
    compSuggestions: [
      "2 Tank swap is mandatory",
      "3-4 Healers recommended for Mythic",
      "Dispel class highly valuable (Priest, MW Monk)",
      "Raid movement speed helps (Druid, Monk)"
    ],
    
    trinketSuggestions: {
      good: ["Voidmender's Shard", "Shadow-Bound Relic", "Imperial Decree Counter"],
      bad: ["On-use defensive trinkets", "Stationary DPS trinkets"]
    }
  },
  
  {
    id: 3002,
    name: "Vorasius",
    nickname: "vorasius",
    zone: "voidspire",
    order: 2,
    icon: "void_horror",
    
    enrageTimer: 540,
    requiredDPS: 16500000,
    requiredHPS: 4200000,
    
    mechanics: [
      {
        id: "voracious_bite",
        name: "Voracious Bite",
        type: "tank_swap",
        description: "Massive physical damage to tank, heals boss",
        damage: 1200000,
        frequency: 12,
        targets: "tank",
        tip: "Swap immediately after each bite, use big CDs"
      },
      {
        id: "hungering_mist",
        name: "Hungering Mist",
        type: "avoidable",
        description: "Expanding void zones from boss",
        damage: 400000,
        frequency: 20,
        targets: "everyone",
        tip: "Move out quickly, don't get trapped against walls"
      },
      {
        id: "consume_essence",
        name: "Consume Essence",
        type: "soak",
        description: "4 void orbs spawn, must be soaked",
        damage: 300000,
        frequency: 35,
        targets: "everyone",
        tip: "Assign soakers per orb, use personals"
      },
      {
        id: "void_scream",
        name: "Void Scream",
        type: "interrupt",
        description: "Interruptible cast that silences raid",
        damage: 0,
        frequency: 25,
        targets: "everyone",
        tip: "MUST interrupt! Rotate kicks",
        warning: "Failed kick = raid wipe"
      },
      {
        id: "shadow_feast",
        name: "Shadow Feast",
        type: "raid_cd",
        description: "Raid-wide damage + healing absorb",
        damage: 500000,
        frequency: 60,
        targets: "everyone",
        tip: "Big healing needed, use healing CDs"
      }
    ],
    
    phases: [
      {
        name: "Phase 1: The Hunger",
        hpRange: [100, 70],
        mechanics: ["voracious_bite", "hungering_mist", "void_scream"],
        tips: ["Focus on interrupt rotation", "Clean tank swaps"]
      },
      {
        name: "Phase 2: Feast of Shadows",
        hpRange: [70, 40],
        mechanics: ["voracious_bite", "consume_essence", "void_scream", "shadow_feast"],
        tips: ["Orb soaks are critical", "Save raid CDs for Shadow Feast"]
      },
      {
        name: "Phase 3: Unending Hunger",
        hpRange: [40, 0],
        mechanics: ["voracious_bite", "hungering_mist", "consume_essence", "shadow_feast"],
        tips: ["Execute phase - push hard", "Everything on CD"]
      }
    ],
    
    deathCauses: {
      "hungering_mist": 30,
      "consume_essence": 25,
      "voracious_bite": 22,
      "shadow_feast": 15,
      "void_scream": 5, // If not interrupted
      "other": 3
    },
    
    commonMistakes: [
      "Missing Void Scream interrupts",
      "Not soaking Consume Essence orbs",
      "Late tank swaps on Voracious Bite",
      "Getting trapped by Hungering Mist"
    ],
    
    positioning: [
      "Tank boss near edge of room",
      "Rotate boss around room to avoid Mist",
      "Orb positions: NE, SE, SW, NW",
      "Ranged spread for Mist dodging"
    ],
    
    compSuggestions: [
      "Multiple interrupt classes needed",
      "Soakers need personals",
      "Strong tank healers for Bite damage",
      "Raid healing for Shadow Feast"
    ],
    
    trinketSuggestions: {
      good: ["Interrupt cooldown trinkets", "Soak reduction trinkets", "Healing absorb breakers"],
      bad: ["Pure DPS on-use trinkets", "Passive stat sticks"]
    }
  },
  
  {
    id: 3003,
    name: "Fallen-King Salhadaar",
    nickname: "salhadaar",
    zone: "voidspire",
    order: 3,
    icon: "fallen_king",
    
    enrageTimer: 600,
    requiredDPS: 19000000,
    requiredHPS: 3800000,
    
    mechanics: [
      {
        id: "ancient_blade",
        name: "Ancient Blade",
        type: "tank_swap",
        description: "Physical + Shadow damage combo",
        damage: 950000,
        frequency: 10,
        targets: "tank",
        tip: "Alternate tanks, use externals on combo"
      },
      {
        id: "kings_decree",
        name: "King's Decree",
        type: "positioning",
        description: "Players must stack or spread based on debuff",
        damage: 350000,
        frequency: 30,
        targets: "everyone",
        tip: "Blue = spread, Red = stack"
      },
      {
        id: "void_shockwave",
        name: "Void Shockwave",
        type: "avoidable",
        description: "Wave crossing the room",
        damage: 500000,
        frequency: 18,
        targets: "everyone",
        tip: "Jump or dodge the wave, timing is key"
      },
      {
        id: "shadow_realm",
        name: "Shadow Realm",
        type: "positioning",
        description: "Half the raid enters shadow realm",
        damage: 200000,
        frequency: 90,
        targets: "everyone",
        tip: "Communicate between realms, clear adds"
      },
      {
        id: "royal_guardian",
        name: "Royal Guardian",
        type: "interrupt",
        description: "Add spawn that must be interrupted",
        damage: 300000,
        frequency: 45,
        targets: "dps",
        tip: "Assign interrupters to adds"
      }
    ],
    
    phases: [
      {
        name: "Phase 1: The Fallen Throne",
        hpRange: [100, 66],
        mechanics: ["ancient_blade", "kings_decree", "void_shockwave"],
        tips: ["Learn wave timing", "Quick Decree reactions"]
      },
      {
        name: "Phase 2: Realm of Shadows",
        hpRange: [66, 33],
        mechanics: ["ancient_blade", "shadow_realm", "royal_guardian"],
        tips: ["Realm coordination is key", "Focus adds in shadow realm"]
      },
      {
        name: "Phase 3: The King's Return",
        hpRange: [33, 0],
        mechanics: ["ancient_blade", "kings_decree", "void_shockwave", "royal_guardian"],
        tips: ["Execute phase, use everything", "Cleanest phase = fastest kill"]
      }
    ],
    
    deathCauses: {
      "void_shockwave": 32,
      "kings_decree": 28,
      "shadow_realm": 20,
      "royal_guardian": 12,
      "ancient_blade": 5,
      "other": 3
    },
    
    commonMistakes: [
      "Wrong reaction to King's Decree",
      "Getting hit by Void Shockwave",
      "Poor Shadow Realm coordination",
      "Not interrupting Guardian adds"
    ],
    
    positioning: [
      "Tank in center",
      "Shadow Realm group pre-positioned",
      "Clear paths for Shockwave dodging",
      "Add spawns at fixed locations"
    ],
    
    compSuggestions: [
      "Good realm communication setup",
      "Strong add DPS for shadow realm",
      "Tank externals for Blade combos",
      "Ranged DPS for Guardian interrupts"
    ],
    
    trinketSuggestions: {
      good: ["Shadow damage reduction", "Movement speed trinkets", "Add burst trinkets"],
      bad: ["Stationary channeling trinkets"]
    }
  },
  
  {
    id: 3004,
    name: "Vaelgor & Ezzorak",
    nickname: "twins",
    zone: "voidspire",
    order: 4,
    icon: "void_twins",
    
    enrageTimer: 540,
    requiredDPS: 20000000,
    requiredHPS: 4500000,
    
    mechanics: [
      {
        id: "twin_strike",
        name: "Twin Strike",
        type: "tank_swap",
        description: "Must swap bosses between tanks",
        damage: 700000,
        frequency: 8,
        targets: "tank",
        tip: "Never have same boss for more than 3 strikes"
      },
      {
        id: "void_link",
        name: "Void Link",
        type: "positioning",
        description: "Players linked, must manage distance",
        damage: 250000,
        frequency: 20,
        targets: "random",
        tip: "Stay in range of link, don't break it suddenly"
      },
      {
        id: "shadow_nova",
        name: "Shadow Nova (Vaelgor)",
        type: "raid_cd",
        description: "Raid-wide shadow damage",
        damage: 400000,
        frequency: 40,
        targets: "everyone",
        tip: "Use raid CDs, healers top off before"
      },
      {
        id: "essence_drain",
        name: "Essence Drain (Ezzorak)",
        type: "dispel",
        description: "Healing absorb + damage",
        damage: 300000,
        frequency: 15,
        targets: "random",
        tip: "Dispel quickly, priority on healers/tanks"
      },
      {
        id: "twisted_fusion",
        name: "Twisted Fusion",
        type: "avoidable",
        description: "Beam between bosses, moves across room",
        damage: 600000,
        frequency: 35,
        targets: "everyone",
        tip: "Move away from beam path, clear area"
      },
      {
        id: "duplicate",
        name: "Duplicate",
        type: "positioning",
        description: "Creates copy that mimics abilities",
        damage: 0,
        frequency: 60,
        targets: "everyone",
        tip: "Kill duplicate quickly or handle doubled mechanics"
      }
    ],
    
    phases: [
      {
        name: "Phase 1: Twin Assault",
        hpRange: [100, 50],
        mechanics: ["twin_strike", "void_link", "shadow_nova", "essence_drain"],
        tips: ["Balance DPS on both bosses", "Handle mechanics cleanly"]
      },
      {
        name: "Phase 2: Dark Synchronization",
        hpRange: [50, 0],
        mechanics: ["twin_strike", "twisted_fusion", "duplicate", "shadow_nova"],
        tips: ["Kill duplicates fast", "Fusion is deadly", "Bloodlust here"]
      }
    ],
    
    deathCauses: {
      "twisted_fusion": 35,
      "void_link": 22,
      "shadow_nova": 18,
      "duplicate": 15,
      "twin_strike": 7,
      "other": 3
    },
    
    commonMistakes: [
      "Getting hit by Twisted Fusion beam",
      "Breaking Void Links too early",
      "Not killing Duplicates fast enough",
      "Unbalanced boss DPS causing early sync"
    ],
    
    positioning: [
      "Tanks keep bosses apart (30 yards)",
      "Ranged in middle for flexibility",
      "Beam path awareness critical",
      "Duplicate spawn locations memorized"
    ],
    
    compSuggestions: [
      "2 tanks with strong communication",
      "Dispel classes for Essence Drain",
      "Mobile DPS for beam dodging",
      "Raid healing for Shadow Nova"
    ],
    
    trinketSuggestions: {
      good: ["Movement speed", "Passive stat trinkets", "Health stones"],
      bad: ["On-use without awareness", "Channeling trinkets"]
    }
  },
  
  {
    id: 3005,
    name: "Lightblinded Vanguard",
    nickname: "vanguard",
    zone: "voidspire",
    order: 5,
    icon: "lightblinded",
    
    enrageTimer: 510,
    requiredDPS: 18500000,
    requiredHPS: 4000000,
    
    mechanics: [
      {
        id: "searing_light",
        name: "Searing Light",
        type: "avoidable",
        description: "Beams of light crossing the room",
        damage: 550000,
        frequency: 12,
        targets: "everyone",
        tip: "Learn beam patterns, safe spots exist"
      },
      {
        id: "blinding_radiance",
        name: "Blinding Radiance",
        type: "positioning",
        description: "Look away or get stunned",
        damage: 0,
        frequency: 30,
        targets: "everyone",
        tip: "Turn camera away when cast starts"
      },
      {
        id: "void_touched",
        name: "Void Touched",
        type: "soak",
        description: "Void zones that must be soaked",
        damage: 350000,
        frequency: 25,
        targets: "random",
        tip: "Assign soakers per zone, rotate"
      },
      {
        id: "righteous_flame",
        name: "Righteous Flame",
        type: "raid_cd",
        description: "Raid-wide fire damage",
        damage: 450000,
        frequency: 45,
        targets: "everyone",
        tip: "Fire resistance helps, use raid CDs"
      },
      {
        id: "awakened_shadows",
        name: "Awakened Shadows",
        type: "interrupt",
        description: "Shadow adds spawn, must interrupt",
        damage: 250000,
        frequency: 40,
        targets: "dps",
        tip: "Quickly interrupt and kill adds"
      }
    ],
    
    phases: [
      {
        name: "Phase 1: Blinded Faith",
        hpRange: [100, 60],
        mechanics: ["searing_light", "blinding_radiance", "void_touched"],
        tips: ["Learn beam patterns", "Clean soaks"]
      },
      {
        name: "Phase 2: Shadows Rising",
        hpRange: [60, 30],
        mechanics: ["searing_light", "awakened_shadows", "righteous_flame"],
        tips: ["Add control is priority", "Raid CDs for Flame"]
      },
      {
        name: "Phase 3: Light and Void",
        hpRange: [30, 0],
        mechanics: ["searing_light", "blinding_radiance", "righteous_flame", "awakened_shadows"],
        tips: ["Bloodlust here", "All cooldowns", "Cleanest execution"]
      }
    ],
    
    deathCauses: {
      "searing_light": 38,
      "blinding_radiance": 22,
      "void_touched": 18,
      "righteous_flame": 12,
      "awakened_shadows": 7,
      "other": 3
    },
    
    commonMistakes: [
      "Not looking away for Blinding Radiance",
      "Standing in beam paths",
      "Missing void zone soaks",
      "Letting shadow adds cast"
    ],
    
    positioning: [
      "Learn beam safe spots",
      "Ranged spread for flexibility",
      "Add tank picks up shadows",
      "Soak positions pre-assigned"
    ],
    
    compSuggestions: [
      "Add tank (blood DK, vengeance DH)",
      "Multiple interrupts for shadows",
      "Mobile raid for beam dodging",
      "Soak-capable players"
    ],
    
    trinketSuggestions: {
      good: ["Fire resistance", "Movement speed", "Add burst"],
      bad: ["Blind-dependent trinkets", "Stationary bonuses"]
    }
  },
  
  {
    id: 3006,
    name: "Xal'atath, the Shadowbreaker",
    nickname: "xalatath",
    zone: "voidspire",
    order: 6,
    icon: "shadowbreaker",
    
    enrageTimer: 660,
    requiredDPS: 22000000,
    requiredHPS: 5000000,
    
    mechanics: [
      {
        id: "void_rend",
        name: "Void Rend",
        type: "tank_swap",
        description: "Massive tank damage + armor reduction",
        damage: 1400000,
        frequency: 10,
        targets: "tank",
        tip: "Swap on 2 stacks, externals needed"
      },
      {
        id: "shadowfall",
        name: "Shadowfall",
        type: "avoidable",
        description: "Falling void zones everywhere",
        damage: 400000,
        frequency: 15,
        targets: "everyone",
        tip: "Keep moving, watch your feet"
      },
      {
        id: "mind_fracture",
        name: "Mind Fracture",
        type: "positioning",
        description: "Players feared if not stacked",
        damage: 300000,
        frequency: 25,
        targets: "everyone",
        tip: "Stack on marked player before cast ends"
      },
      {
        id: "void_army",
        name: "Void Army",
        type: "interrupt",
        description: "Multiple adds spawn with dangerous casts",
        damage: 500000,
        frequency: 90,
        targets: "dps",
        tip: "Kill priority: Caster > Melee > Ranged"
      },
      {
        id: "dark_miracle",
        name: "Dark Miracle",
        type: "raid_cd",
        description: "Raid-wide + healing absorb",
        damage: 600000,
        frequency: 50,
        targets: "everyone",
        tip: "Big healing needed, break absorb fast"
      },
      {
        id: "reality_shatter",
        name: "Reality Shatter",
        type: "avoidable",
        description: "Room splits, players isolated",
        damage: 350000,
        frequency: 80,
        targets: "everyone",
        tip: "Stay with your group, don't get isolated"
      }
    ],
    
    phases: [
      {
        name: "Phase 1: The Awakened",
        hpRange: [100, 70],
        mechanics: ["void_rend", "shadowfall", "mind_fracture"],
        tips: ["Learn movement patterns", "Tank coordination"]
      },
      {
        name: "Phase 2: Shadows Rise",
        hpRange: [70, 40],
        mechanics: ["void_rend", "void_army", "dark_miracle"],
        tips: ["Add priority is everything", "Raid CDs for Miracle"]
      },
      {
        name: "Phase 3: Reality Breaks",
        hpRange: [40, 0],
        mechanics: ["void_rend", "shadowfall", "reality_shatter", "dark_miracle"],
        tips: ["Bloodlust here", "Stay together", "Final push"]
      }
    ],
    
    deathCauses: {
      "shadowfall": 28,
      "mind_fracture": 25,
      "void_army": 20,
      "reality_shatter": 15,
      "dark_miracle": 8,
      "void_rend": 2,
      "other": 2
    },
    
    commonMistakes: [
      "Standing in Shadowfall",
      "Not stacking for Mind Fracture",
      "Wrong add priority",
      "Getting isolated in Reality Shatter"
    ],
    
    positioning: [
      "Tank boss center",
      "Ranged spread but not too far",
      "Stack positions for Mind Fracture",
      "Reality Shatter group assignments"
    ],
    
    compSuggestions: [
      "Strong add DPS",
      "Multiple interrupts for Void Army",
      "Tank externals for Void Rend",
      "Raid healing for Dark Miracle"
    ],
    
    trinketSuggestions: {
      good: ["Add burst", "Healing absorb breakers", "Tank externals"],
      bad: ["Pure single-target trinkets", "No mobility trinkets"]
    }
  },

  {
    id: 3007,
    name: "Crown of the Cosmos",
    nickname: "crown",
    zone: "voidspire",
    order: 7,
    icon: "crown_of_the_cosmos",

    enrageTimer: 540,
    requiredDPS: 18500000,
    requiredHPS: 4300000,

    mechanics: [
      {
        id: "void_barrage",
        name: "Void Barrage",
        type: "avoidable",
        description: "Repeated void volleys that punish poor movement and lane discipline",
        damage: 420000,
        frequency: 18,
        targets: "everyone",
        tip: "Keep moving cleanly and do not overlap Barrage lines with other players",
        warning: "Repeated Barrage hits quickly turn a stable pull into a wipe"
      },
      {
        id: "void_expulsion",
        name: "Void Expulsion",
        type: "avoidable",
        description: "Explosive void burst that punishes players who are late moving out",
        damage: 500000,
        frequency: 28,
        targets: "everyone",
        tip: "Move early and leave safe space for the raid before Expulsion finishes"
      },
      {
        id: "silverstrike_ricochet",
        name: "Silverstrike Ricochet",
        type: "positioning",
        description: "Ricochet damage that punishes bad spacing and platform positioning",
        damage: 380000,
        frequency: 22,
        targets: "random",
        tip: "Hold clean spacing and avoid bouncing the hit through the group"
      },
      {
        id: "voidstalker_sting",
        name: "Voidstalker Sting",
        type: "avoidable",
        description: "High-pressure damage from add control failures or bad movement",
        damage: 350000,
        frequency: 24,
        targets: "random",
        tip: "Clean up add pressure quickly and do not drift into unsafe platform lanes"
      },
      {
        id: "grasp_of_emptiness",
        name: "Grasp of Emptiness",
        type: "tank_swap",
        description: "Tank pressure mechanic that escalates if swaps or externals are late",
        damage: 800000,
        frequency: 16,
        targets: "tank",
        tip: "Swap cleanly and plan externals before dangerous overlap windows"
      },
      {
        id: "devouring_cosmos",
        name: "Devouring Cosmos",
        type: "raid_cd",
        description: "Heavy raid damage event that needs a real healing plan",
        damage: 520000,
        frequency: 45,
        targets: "everyone",
        tip: "Map raid cooldowns here and protect the raid before platform pressure stacks up"
      }
    ],

    phases: [
      {
        name: "Phase 1: Crown Ascent",
        hpRange: [100, 70],
        mechanics: ["void_barrage", "void_expulsion", "silverstrike_ricochet"],
        tips: ["Stabilize movement first", "Do not waste Hero/Lust here"]
      },
      {
        name: "Phase 2: Celestial Fracture",
        hpRange: [70, 35],
        mechanics: ["void_barrage", "voidstalker_sting", "grasp_of_emptiness", "devouring_cosmos"],
        tips: ["Keep tank swaps and raid CDs planned", "Hold Hero/Lust for the final platform phase"]
      },
      {
        name: "Phase 3: Three Platforms",
        hpRange: [35, 0],
        mechanics: ["void_expulsion", "silverstrike_ricochet", "devouring_cosmos"],
        tips: ["Use Hero/Lust here", "Survival and clean movement matter more than greed"]
      }
    ],

    deathCauses: {
      "void_barrage": 26,
      "void_expulsion": 26,
      "silverstrike_ricochet": 18,
      "voidstalker_sting": 14,
      "grasp_of_emptiness": 10,
      "other": 6
    },

    commonMistakes: [
      "Using Hero/Lust before the final platform phase",
      "Losing players to repeatable movement mechanics before the real burn",
      "Poor spacing causing Silverstrike chains",
      "Late tank stabilization during Grasp overlap windows"
    ],

    positioning: [
      "Keep platform spacing clean and predictable",
      "Leave movement lanes open before Barrage and Expulsion windows",
      "Do not collapse the raid unless the mechanic calls for it"
    ],

    compSuggestions: [
      "Keep strong raid-CD coverage for Devouring Cosmos",
      "Prioritize mobile DPS and clean personal defensive usage",
      "Treat Phase 3 as the real kill phase and plan Hero/Lust there"
    ],

    trinketSuggestions: {
      good: ["Mobility", "Burst for Phase 3", "Defensive value for overlap windows"],
      bad: ["Greedy stationary throughput", "Cooldown plans that peak too early"]
    }
  }
];

// ============================================
// DREAMRIFT RAID - 7 Bosses (abbreviated for space)
// ============================================

export const DREAMRIFT_BOSSES: BossData[] = [
  {
    id: 3101,
    name: "Mylora, Dreamkeeper",
    nickname: "mylora",
    zone: "dreamrift",
    order: 1,
    icon: "dreamkeeper",
    
    enrageTimer: 450,
    requiredDPS: 17000000,
    requiredHPS: 3200000,
    
    mechanics: [
      {
        id: "dream_slash",
        name: "Dream Slash",
        type: "tank_swap",
        description: "Nature damage cleave",
        damage: 650000,
        frequency: 8,
        targets: "tank",
        tip: "Swap after each slash"
      },
      {
        id: "nightmare_wave",
        name: "Nightmare Wave",
        type: "avoidable",
        description: "Wave of nightmare energy",
        damage: 350000,
        frequency: 20,
        targets: "everyone",
        tip: "Jump or dodge the wave"
      },
      {
        id: "dream_cocoon",
        name: "Dream Cocoon",
        type: "dispel",
        description: "Player trapped, must break out",
        damage: 0,
        frequency: 30,
        targets: "random",
        tip: "DPS break out trapped players"
      },
      {
        id: "emerald_burst",
        name: "Emerald Burst",
        type: "raid_cd",
        description: "Raid-wide nature damage",
        damage: 380000,
        frequency: 40,
        targets: "everyone",
        tip: "Use nature resist, raid CDs"
      }
    ],
    
    phases: [
      {
        name: "Phase 1",
        hpRange: [100, 50],
        mechanics: ["dream_slash", "nightmare_wave", "dream_cocoon"],
        tips: ["Clean execution", "Quick cocoon breaks"]
      },
      {
        name: "Phase 2: Nightmare",
        hpRange: [50, 0],
        mechanics: ["dream_slash", "nightmare_wave", "emerald_burst"],
        tips: ["Bloodlust here", "All CDs"]
      }
    ],
    
    deathCauses: {
      "nightmare_wave": 45,
      "emerald_burst": 30,
      "dream_slash": 15,
      "dream_cocoon": 5,
      "other": 5
    },
    
    commonMistakes: ["Not dodging waves", "Slow cocoon breaks", "No tank swap"],
    positioning: ["Tank center", "Ranged spread", "Cocoon break positions"],
    compSuggestions: ["Nature resistance helps", "Quick DPS for cocoons"],
    trinketSuggestions: { good: ["Nature resist", "Movement"], bad: ["Stationary"] }
  },
  
  {
    id: 3102,
    name: "The Corrupted Grove",
    nickname: "grove",
    zone: "dreamrift",
    order: 2,
    icon: "corrupted_grove",
    
    enrageTimer: 540,
    requiredDPS: 17500000,
    requiredHPS: 3800000,
    
    mechanics: [
      {
        id: "corruption_spread",
        name: "Corruption Spread",
        type: "avoidable",
        description: "Spreading void zones",
        damage: 400000,
        frequency: 18,
        targets: "everyone",
        tip: "Move away from spreading zones"
      },
      {
        id: "entangling_roots",
        name: "Entangling Roots",
        type: "dispel",
        description: "Roots players in place",
        damage: 150000,
        frequency: 25,
        targets: "random",
        tip: "Dispel quickly or break"
      },
      {
        id: "corrupted_growth",
        name: "Corrupted Growth",
        type: "soak",
        description: "Large zones to soak",
        damage: 300000,
        frequency: 30,
        targets: "everyone",
        tip: "Assign soakers"
      }
    ],
    
    phases: [
      { name: "Phase 1", hpRange: [100, 0], mechanics: ["corruption_spread", "entangling_roots", "corrupted_growth"], tips: ["Clean soaks", "Quick dispels"] }
    ],
    
    deathCauses: { "corruption_spread": 40, "corrupted_growth": 35, "entangling_roots": 20, "other": 5 },
    commonMistakes: ["Not moving from corruption", "Slow root dispels", "Missed soaks"],
    positioning: ["Move as a group", "Clear path behind"],
    compSuggestions: ["Mobile raid", "Dispel classes"],
    trinketSuggestions: { good: ["Movement", "Soak reduction"], bad: ["Stationary"] }
  }
];

// ============================================
// QUEL'DANAS RAID - Current MQD Coverage
// ============================================

export const QUELDANAS_BOSSES: BossData[] = [
  {
    id: 3201,
    name: "Alleria Windrunner",
    nickname: "alleria",
    zone: "queldanas",
    order: 1,
    icon: "alleria_windrunner",

    enrageTimer: 720,
    requiredDPS: 23500000,
    requiredHPS: 5400000,

    mechanics: [
      {
        id: "dark_arrow_volley",
        name: "Dark Arrow Volley",
        type: "avoidable",
        description: "Repeated volleys that punish bad movement lanes and stacked positioning.",
        damage: 480000,
        frequency: 16,
        targets: "everyone",
        tip: "Keep movement lanes clean and sidestep volleys early instead of reacting late.",
        warning: "Repeated hits quickly drain healer stability before the real burn."
      },
      {
        id: "ranger_mark",
        name: "Ranger's Mark",
        type: "positioning",
        description: "Marked players need clean spacing or the follow-up impact chains through the raid.",
        damage: 410000,
        frequency: 22,
        targets: "random",
        tip: "Pre-spread marked players and leave clear escape lanes for the follow-up hit."
      },
      {
        id: "windrunner_adds",
        name: "Windrunner Adds",
        type: "interrupt",
        description: "Dangerous adds that pressure the raid if casts are not controlled immediately.",
        damage: 350000,
        frequency: 45,
        targets: "dps",
        tip: "Assign kicks and swap to adds instantly before they stack pressure on the raid."
      },
      {
        id: "void_collapse",
        name: "Void Collapse",
        type: "raid_cd",
        description: "Heavy raid-wide burst that needs fixed healer coverage.",
        damage: 560000,
        frequency: 48,
        targets: "everyone",
        tip: "Map raid cooldowns here and protect the raid before movement overlap windows."
      },
      {
        id: "shadowstep_pursuit",
        name: "Shadowstep Pursuit",
        type: "positioning",
        description: "Targeted chase sequence that breaks the pull if pathing is sloppy.",
        damage: 390000,
        frequency: 26,
        targets: "random",
        tip: "Drag the pursuit away from the raid and do not cut through other players."
      },
      {
        id: "windrunner_barrage",
        name: "Windrunner Barrage",
        type: "soak",
        description: "Split-damage impact that needs the right number of players to cover it.",
        damage: 440000,
        frequency: 34,
        targets: "everyone",
        tip: "Pre-assign soak groups and use personals when barrage overlaps with movement."
      }
    ],

    phases: [
      {
        name: "Phase 1: Hunter's Pressure",
        hpRange: [100, 70],
        mechanics: ["dark_arrow_volley", "ranger_mark", "shadowstep_pursuit"],
        tips: ["Stabilize movement before chasing throughput", "Do not lose players to early spacing mistakes"]
      },
      {
        name: "Phase 2: Windrunner Reinforcements",
        hpRange: [70, 40],
        mechanics: ["windrunner_adds", "void_collapse", "windrunner_barrage"],
        tips: ["Add control and healer coverage are the real gate here", "Do not let barrage ownership become improvisation"]
      },
      {
        name: "Phase 3: Final Hunt",
        hpRange: [40, 0],
        mechanics: ["dark_arrow_volley", "void_collapse", "shadowstep_pursuit", "windrunner_barrage"],
        tips: ["Treat this as the real kill phase", "Only greed damage after movement and soak ownership are stable"]
      }
    ],

    deathCauses: {
      "dark_arrow_volley": 24,
      "ranger_mark": 18,
      "windrunner_adds": 17,
      "void_collapse": 16,
      "shadowstep_pursuit": 15,
      "windrunner_barrage": 8,
      "other": 2
    },

    commonMistakes: [
      "Taking repeated Volley hits before the dangerous phase even starts",
      "Breaking spacing on Ranger's Mark and chaining raid damage",
      "Late add control causing healer overload",
      "Unclear Barrage ownership during movement overlaps"
    ],

    positioning: [
      "Keep ranged arcs loose enough for Mark and Pursuit pathing",
      "Leave a safe movement lane through the room at all times",
      "Pre-assign soak sides before Barrage windows"
    ],

    compSuggestions: [
      "Reliable add kicks matter more than greedy throughput",
      "Mobile players are valuable for Pursuit and Barrage overlap",
      "Healer cooldown planning is mandatory for Void Collapse"
    ],

    trinketSuggestions: {
      good: ["Mobility", "Defensive value", "Controlled burst for add waves"],
      bad: ["Greedy stationary throughput", "Long setups that punish movement"]
    }
  },
  {
    id: 3202,
    name: "Chimaerus the Undreamt God",
    nickname: "chimaerus",
    zone: "queldanas",
    order: 2,
    icon: "chimaerus_undreamt_god",

    enrageTimer: 780,
    requiredDPS: 24800000,
    requiredHPS: 5900000,

    mechanics: [
      {
        id: "dream_devour",
        name: "Dream Devour",
        type: "tank_swap",
        description: "Massive tank hit that becomes lethal without clean swaps and externals.",
        damage: 1350000,
        frequency: 11,
        targets: "tank",
        tip: "Swap early and line externals up for overlap windows instead of recovering late."
      },
      {
        id: "nightmare_breath",
        name: "Nightmare Breath",
        type: "avoidable",
        description: "Wide frontal that punishes sloppy boss control and melee greed.",
        damage: 620000,
        frequency: 18,
        targets: "everyone",
        tip: "Keep the frontal fixed and clear the lane before every breath cast."
      },
      {
        id: "fractured_mind",
        name: "Fractured Mind",
        type: "dispel",
        description: "Dangerous debuff that needs fast dispel timing or the raid loses stability.",
        damage: 280000,
        frequency: 24,
        targets: "random",
        tip: "Assign primary and backup dispellers and do not let the debuff drift into overlap windows."
      },
      {
        id: "aberrant_spawn",
        name: "Aberrant Spawn",
        type: "interrupt",
        description: "Priority adds with dangerous casts that quickly snowball if control slips.",
        damage: 330000,
        frequency: 42,
        targets: "dps",
        tip: "Lock kick ownership per spawn and kill the add before the second cast cycle."
      },
      {
        id: "cosmic_rupture",
        name: "Cosmic Rupture",
        type: "raid_cd",
        description: "Heavy raid-wide burst that becomes the main healer checkpoint of the fight.",
        damage: 610000,
        frequency: 50,
        targets: "everyone",
        tip: "Map your healer cooldowns here and do not arrive to this event with avoidable damage already taken."
      },
      {
        id: "shattered_heads",
        name: "Shattered Heads",
        type: "soak",
        description: "Split raid mechanic that requires disciplined group coverage.",
        damage: 470000,
        frequency: 36,
        targets: "everyone",
        tip: "Pre-assign soak groups and rotate personals for repeated coverage."
      }
    ],

    phases: [
      {
        name: "Phase 1: Monstrous Awakening",
        hpRange: [100, 75],
        mechanics: ["dream_devour", "nightmare_breath", "fractured_mind"],
        tips: ["Tank control and breath discipline are the first gate", "Do not leak deaths before the add phase"]
      },
      {
        name: "Phase 2: Aberrant Convergence",
        hpRange: [75, 45],
        mechanics: ["aberrant_spawn", "cosmic_rupture", "shattered_heads"],
        tips: ["This phase is mostly assignment execution", "Adds and healer CDs decide whether the pull lives"]
      },
      {
        name: "Phase 3: Undreamt Collapse",
        hpRange: [45, 0],
        mechanics: ["nightmare_breath", "cosmic_rupture", "shattered_heads", "dream_devour"],
        tips: ["Treat the final phase as a control check before a throughput check", "Do not trade movement discipline for short-term damage greed"]
      }
    ],

    deathCauses: {
      "nightmare_breath": 23,
      "cosmic_rupture": 21,
      "aberrant_spawn": 18,
      "shattered_heads": 16,
      "dream_devour": 14,
      "fractured_mind": 6,
      "other": 2
    },

    commonMistakes: [
      "Losing control of add kicks in Phase 2",
      "Reaching Cosmic Rupture already damaged and unplanned",
      "Bad soak coverage on Shattered Heads",
      "Late tank swaps causing recovery chaos"
    ],

    positioning: [
      "Fix the frontal lane for every Breath cast",
      "Set predictable add collapse points",
      "Keep soak groups on named sides to avoid improvisation"
    ],

    compSuggestions: [
      "Kick reliability matters more than greed",
      "Strong healer-CD planning is mandatory for Rupture",
      "Tank externals should be planned, not reactive"
    ],

    trinketSuggestions: {
      good: ["Defensive value", "Controlled burst for adds", "Mobility during soak overlaps"],
      bad: ["Greedy stationary throughput", "Delayed burst that misses add windows"]
    }
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getBossByNickname(nickname: string): BossData | undefined {
  return [...VOIDSPIRE_BOSSES, ...DREAMRIFT_BOSSES, ...QUELDANAS_BOSSES].find(
    b => b.nickname.toLowerCase() === nickname.toLowerCase()
  );
}

export function getBossById(id: number): BossData | undefined {
  return [...VOIDSPIRE_BOSSES, ...DREAMRIFT_BOSSES, ...QUELDANAS_BOSSES].find(b => b.id === id);
}

export function getMechanicByAbility(abilityName: string, bossData: BossData): BossMechanic | undefined {
  const lowerName = abilityName.toLowerCase();
  return bossData.mechanics.find(
    m => m.name.toLowerCase().includes(lowerName) || lowerName.includes(m.name.toLowerCase())
  );
}

export function isMechanicAvoidable(abilityName: string, bossData?: BossData): boolean {
  // If we have boss data, check mechanics
  if (bossData) {
    const mechanic = getMechanicByAbility(abilityName, bossData);
    if (mechanic) {
      return ['avoidable', 'positioning', 'interrupt', 'soak'].includes(mechanic.type);
    }
  }
  
  // Fallback to keyword detection
  const avoidableKeywords = [
    'pool', 'ground', 'void', 'zone', 'circle', 'beam', 'wave',
    'spray', 'spew', 'eruption', 'explosion', 'torrent', 'rain',
    'fire', 'flame', 'ice', 'frost', 'poison', 'acid', 'shadow',
    'cudgel', 'smash', 'slam', 'swipe', 'cleave', 'nova', 'wave',
    'mist', 'fusion', 'fall', 'shatter', 'spread'
  ];
  
  const lower = abilityName.toLowerCase();
  return avoidableKeywords.some(kw => lower.includes(kw));
}

export function getMechanicTip(abilityName: string, bossData?: BossData): string {
  if (bossData) {
    const mechanic = getMechanicByAbility(abilityName, bossData);
    if (mechanic) return mechanic.tip;
  }
  
  // Generic tips
  const lower = abilityName.toLowerCase();
  
  if (lower.includes('pool') || lower.includes('ground') || lower.includes('zone')) {
    return 'Move out of the area on the ground quickly';
  }
  if (lower.includes('beam') || lower.includes('laser')) {
    return 'Do not stand in the beam path';
  }
  if (lower.includes('spread') || lower.includes('distance')) {
    return 'Spread out from other players';
  }
  if (lower.includes('stack') || lower.includes('soak')) {
    return 'Stack with the group to soak the damage';
  }
  if (lower.includes('interrupt') || lower.includes('cast')) {
    return 'Interrupt the enemy cast';
  }
  if (lower.includes('tank') || lower.includes('swap')) {
    return 'Tank swap required';
  }
  
  return 'Check the boss guide for this mechanic';
}

// Get all bosses for a zone
export function getBossesByZone(zone: 'voidspire' | 'dreamrift' | 'queldanas'): BossData[] {
  switch (zone) {
    case 'voidspire':
      return VOIDSPIRE_BOSSES;
    case 'dreamrift':
      return DREAMRIFT_BOSSES;
    case 'queldanas':
      return QUELDANAS_BOSSES;
    default:
      return [];
  }
}
