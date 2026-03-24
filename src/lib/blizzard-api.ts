// ============================================
// BLIZZARD API CLIENT
// ============================================
// Fetches: Boss data, Spells, Items, Icons
// Rate limit: 36,000 requests/hour (free)

interface BlizzardToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

// OAuth token
async function getBlizzardToken(clientId?: string, clientSecret?: string): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const id = clientId || process.env.BLIZZARD_CLIENT_ID;
  const secret = clientSecret || process.env.BLIZZARD_CLIENT_SECRET;

  if (!id || !secret) return null;

  try {
    const response = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: id,
        client_secret: secret,
      }),
    });

    if (!response.ok) return null;

    const data: BlizzardToken = await response.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };
    return data.access_token;
  } catch {
    return null;
  }
}

// Blizzard API request
async function blizzardFetch(
  endpoint: string,
  namespace: string = 'static-us',
  locale: string = 'en_US'
): Promise<any | null> {
  const token = await getBlizzardToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `https://us.api.blizzard.com${endpoint}?namespace=${namespace}&locale=${locale}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Get spell info (for ability details)
export async function getSpell(spellId: number) {
  return blizzardFetch(`/data/wow/spell/${spellId}`);
}

// Get spell media (icon)
export async function getSpellMedia(spellId: number) {
  return blizzardFetch(`/data/wow/media/spell/${spellId}`);
}

// Get item info
export async function getItem(itemId: number) {
  return blizzardFetch(`/data/wow/item/${itemId}`);
}

// Get journal encounter (boss data)
export async function getJournalEncounter(journalId: number) {
  return blizzardFetch(`/data/wow/journal-encounter/${journalId}`);
}

// Get all journal encounters for a zone
export async function getJournalZone(zoneId: number) {
  return blizzardFetch(`/data/wow/journal-zone/${zoneId}`);
}

// ============================================
// STATIC BOSS DATA (Fallback when no API)
// ============================================
// Pre-populated with current tier bosses
// Nerub-ar Palace (Zone ID: 1500)

export const NERUB_AR_PALACE_BOSSES = {
  2902: {
    id: 2902,
    name: 'Ulgrax the Devourer',
    slug: 'ulgrax',
    journalId: 2419,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: 'Phase 1: The Feast', percentage: 100 },
      { id: 2, name: 'Phase 2: Digestive Tract', percentage: 50 },
    ],
    abilities: [
      { id: 434601, name: 'Spew Foul Bile', icon: 'spell_shadow_plaguecloud', isAvoidable: true, isPeriodic: false, tip: 'Move away from other players when targeted' },
      { id: 434607, name: "Stalker's Netting", icon: 'inv_misc_web_01', isAvoidable: true, isPeriodic: false, tip: 'Dodge the web projectiles' },
      { id: 434610, name: 'Churning Ground', icon: 'spell_nature_groundingtotem', isAvoidable: true, isPeriodic: true, tip: 'Move out of the ground effect immediately' },
      { id: 434615, name: 'Digestive Acid', icon: 'spell_nature_acid_01', isAvoidable: false, isPeriodic: true, tip: 'Heal through - unavoidable raid damage' },
    ],
  },
  2903: {
    id: 2903,
    name: 'The Bloodbound Horror',
    slug: 'bloodbound',
    journalId: 2420,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: 'Phase 1: Manifest Horror', percentage: 100 },
      { id: 2, name: 'Phase 2: Bindings of Blood', percentage: 50 },
    ],
    abilities: [
      { id: 434800, name: 'Goresplatter', icon: 'ability_rogue_bloodyeye', isAvoidable: true, isPeriodic: false, tip: 'Move away when targeted - creates blood pool' },
      { id: 434805, name: 'Blood Curdle', icon: 'spell_shadow_bloodboil', isAvoidable: true, isPeriodic: false, tip: 'Spread 8 yards from other players' },
      { id: 434810, name: 'Sanguine Residue', icon: 'spell_shadow_lifedrain', isAvoidable: true, isPeriodic: true, tip: 'Move out of blood pools on ground' },
      { id: 434815, name: 'Fetid Rupture', icon: 'spell_shadow_corpseexplode', isAvoidable: true, isPeriodic: false, tip: 'Soak the exploding adds or they explode for massive damage' },
    ],
  },
  2904: {
    id: 2904,
    name: 'Sikran, Captain of the Sureki',
    slug: 'sikran',
    journalId: 2421,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: 'Phase 1', percentage: 100 },
      { id: 2, name: 'Phase 2: Execute', percentage: 30 },
    ],
    abilities: [
      { id: 435000, name: 'Phase Lunge', icon: 'ability_warrior_charge', isAvoidable: true, isPeriodic: false, tip: 'Tank swap after each lunge' },
      { id: 435005, name: 'Shattering Sweep', icon: 'ability_warrior_bladestorm', isAvoidable: true, isPeriodic: false, tip: 'Move behind the boss or get hit for massive damage' },
      { id: 435010, name: 'Cosmic Shards', icon: 'spell_arcane_starfire', isAvoidable: true, isPeriodic: false, tip: 'Dodge the falling shards' },
      { id: 435015, name: 'Decimate', icon: 'ability_warrior_decisivestrike', isAvoidable: false, isPeriodic: false, tip: 'Unavoidable tank buster - use defensive cooldowns' },
    ],
  },
  2905: {
    id: 2905,
    name: "Rasha'nan",
    slug: 'rashanan',
    journalId: 2422,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: 'Phase 1: Spinneret Stride', percentage: 100 },
      { id: 2, name: 'Phase 2: Erosive Spray', percentage: 70 },
      { id: 3, name: 'Phase 3: Infested Spawn', percentage: 40 },
    ],
    abilities: [
      { id: 435200, name: 'Erosive Spray', icon: 'ability_creature_poison_02', isAvoidable: true, isPeriodic: true, tip: 'Move out of the cone' },
      { id: 435205, name: "Spinneret's Strands", icon: 'inv_misc_web_01', isAvoidable: true, isPeriodic: false, tip: 'Break the webs or get stunned' },
      { id: 435210, name: 'Poison Bolt', icon: 'spell_nature_corrosivebreath', isAvoidable: false, isPeriodic: false, tip: 'Unavoidable - heal through the DoT' },
      { id: 435215, name: 'Infested Spawn', icon: 'ability_creature_scattershot', isAvoidable: true, isPeriodic: false, tip: 'Kill the adds quickly before they overwhelm' },
    ],
  },
  2906: {
    id: 2906,
    name: "Bloodtwister Ovi'nax",
    slug: 'ovinax',
    journalId: 2423,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: 'Phase 1: Mutation', percentage: 100 },
      { id: 2, name: 'Phase 2: Absorption', percentage: 66 },
      { id: 3, name: 'Phase 3: Volatile Concoction', percentage: 33 },
    ],
    abilities: [
      { id: 435400, name: 'Volatile Concoction', icon: 'spell_nature_acid_01', isAvoidable: true, isPeriodic: false, tip: 'Dodge the thrown vials' },
      { id: 435405, name: 'Sticky Web', icon: 'inv_misc_web_01', isAvoidable: true, isPeriodic: false, tip: 'Break free from webs quickly' },
      { id: 435410, name: 'Genetic Modification', icon: 'spell_shadow_unstableaffliction_3', isAvoidable: false, isPeriodic: true, tip: 'Dispelled by specific mechanics' },
      { id: 435415, name: 'Sanguine Absorption', icon: 'spell_shadow_lifedrain', isAvoidable: false, isPeriodic: true, tip: 'Heal through the damage' },
    ],
  },
  2907: {
    id: 2907,
    name: "Nexus-Princess Ky'veza",
    slug: 'kyveza',
    journalId: 2424,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: "Phase 1: Assassin's Dance", percentage: 100 },
      { id: 2, name: "Phase 2: Queen's Decree", percentage: 50 },
    ],
    abilities: [
      { id: 435600, name: 'Assassination', icon: 'ability_rogue_shadowstrikes', isAvoidable: true, isPeriodic: false, tip: 'Dodge the assassination marks' },
      { id: 435605, name: "Queen's Decree", icon: 'spell_shadow_deathpact', isAvoidable: false, isPeriodic: false, tip: 'Follow the decree mechanic or die' },
      { id: 435610, name: 'Void Edge', icon: 'spell_shadow_shadowfury', isAvoidable: true, isPeriodic: false, tip: 'Move out of the void zones' },
      { id: 435615, name: 'Nexus Gale', icon: 'spell_nature_cyclone', isAvoidable: true, isPeriodic: true, tip: 'Move against the wind' },
    ],
  },
  2908: {
    id: 2908,
    name: 'The Silken Court',
    slug: 'silken',
    journalId: 2425,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: 'Phase 1: Twin Emperors', percentage: 100 },
      { id: 2, name: 'Phase 2: United Front', percentage: 50 },
    ],
    abilities: [
      { id: 435800, name: 'Web Bomb', icon: 'inv_misc_web_01', isAvoidable: true, isPeriodic: false, tip: 'Move away from web bomb impact' },
      { id: 435805, name: 'Silk Barrage', icon: 'ability_creature_poison_01', isAvoidable: true, isPeriodic: true, tip: 'Dodge the silk waves' },
      { id: 435810, name: 'Imperial Decree', icon: 'spell_shadow_deathpact', isAvoidable: false, isPeriodic: false, tip: 'Follow the decree or die' },
      { id: 435815, name: 'Entangling Webs', icon: 'spell_nature_thorns', isAvoidable: true, isPeriodic: false, tip: 'Break webs by moving' },
    ],
  },
  2909: {
    id: 2909,
    name: 'Queen Ansurek',
    slug: 'ansurek',
    journalId: 2426,
    zone: 'Nerub-ar Palace',
    zoneId: 1500,
    instanceType: 'raid' as const,
    phases: [
      { id: 1, name: 'Phase 1: The Queens Court', percentage: 100 },
      { id: 2, name: 'Phase 2: Royal Decree', percentage: 70 },
      { id: 3, name: 'Phase 3: Desperate Measures', percentage: 40 },
      { id: 4, name: 'Phase 4: The Final Stand', percentage: 15 },
    ],
    abilities: [
      { id: 436000, name: 'Royal Decree', icon: 'spell_shadow_deathpact', isAvoidable: false, isPeriodic: false, tip: 'Follow the decree mechanic precisely' },
      { id: 436005, name: 'Reactive Toxin', icon: 'ability_creature_poison_02', isAvoidable: true, isPeriodic: true, tip: 'Move to designated areas to drop toxins' },
      { id: 436010, name: 'Acidic Retch', icon: 'spell_nature_acid_01', isAvoidable: true, isPeriodic: false, tip: 'Dodge the acid pools' },
      { id: 436015, name: 'Liquefy', icon: 'spell_shadow_corpseexplode', isAvoidable: true, isPeriodic: false, tip: 'Soak the liquified adds' },
      { id: 436020, name: 'Abyssal Infusion', icon: 'spell_shadow_shadowbolt', isAvoidable: false, isPeriodic: true, tip: 'Heal through the damage' },
      { id: 436025, name: "Queen's Wrath", icon: 'spell_shadow_twilight', isAvoidable: true, isPeriodic: true, tip: 'Move away from the wrath zones' },
    ],
  },
};

// Get boss data (API first, fallback to static)
export async function getBossData(bossId: number): Promise<any> {
  // Try static data first (faster, more reliable)
  const staticBoss = NERUB_AR_PALACE_BOSSES[bossId as keyof typeof NERUB_AR_PALACE_BOSSES];
  if (staticBoss) return staticBoss;

  // Try Blizzard API
  const journalData = await getJournalEncounter(bossId);
  if (journalData) {
    // Transform API data to our format
    return {
      id: bossId,
      name: journalData.name,
      slug: journalData.name.toLowerCase().replace(/[^a-z]/g, ''),
      journalId: bossId,
      zone: journalData.zone?.name || 'Unknown',
      zoneId: journalData.zone?.id || 0,
      instanceType: 'raid' as const,
      phases: journalData.phases?.map((p: any, i: number) => ({
        id: i + 1,
        name: p.name || `Phase ${i + 1}`,
      })) || [],
      abilities: [], // Would need to fetch spell details
    };
  }

  return null;
}

// Search for boss by name
export function findBossByName(name: string): any | null {
  const searchName = name.toLowerCase();
  for (const boss of Object.values(NERUB_AR_PALACE_BOSSES)) {
    if (boss.name.toLowerCase().includes(searchName) || searchName.includes(boss.slug)) {
      return boss;
    }
  }
  return null;
}

// ============================================
// CONSUMABLE IDS (for checking flask/potion usage)
// ============================================

export const FLASK_IDS = {
  // Dragonflight
  'Phial of Tepid Versatility': 191382,
  'Phial of Glacial Fury': 191384,
  'Phial of Elemental Chaos': 191385,
  'Iced Phial of Corrupting Rage': 191386,
  'Phial of Charged Isolation': 191387,
  'Phial of Still Air': 191388,
  'Steaming Phial of Finesse': 191389,
  'Phial of Bubbling Spirits': 191390,
  'Phial of Ambidexterity': 191391,
};

export const POTION_IDS = {
  // Power potions
  'Potion of Unbridled Fury': 191381,
  'Potion of Frozen Focus': 191373,
  'Potion of Chilled Clarity': 191367,
  'Elemental Potion of Power': 191303,
  'Elemental Potion of Ultimate Power': 191381,
};

export const FOOD_IDS = {
  // High tier foods
  'Fated Fortune Cookie': 197792,
  'Great Cerulean Sea': 197791,
  'Revival Catalyst': 197790,
};

export const RUNE_IDS = {
  'Dragonscale Augment Rune': 198490,
  'Veiled Augment Rune': 194817,
};

// Check if spell ID is a flask
export function isFlask(spellId: number): boolean {
  return Object.values(FLASK_IDS).includes(spellId);
}

// Check if spell ID is a potion
export function isPotion(spellId: number): boolean {
  return Object.values(POTION_IDS).includes(spellId);
}

// Check if spell ID is food
export function isFood(spellId: number): boolean {
  return Object.values(FOOD_IDS).includes(spellId);
}

// Check if spell ID is augment rune
export function isRune(spellId: number): boolean {
  return Object.values(RUNE_IDS).includes(spellId);
}
