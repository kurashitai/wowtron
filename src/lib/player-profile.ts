import { getCachedValue, setCachedValue } from '@/lib/wcl-cache';
import { appendProfileSnapshot, getProfileHistory } from '@/lib/player-profile-store';

type RaiderIOProfile = {
  name: string;
  race: string;
  class: string;
  active_spec_name: string;
  thumbnail_url?: string;
  gear?: { item_level_equipped?: number };
  guild?: { name: string };
  mythic_plus_scores_by_season?: Array<{
    scores: { all: number; dps?: number; healer?: number; tank?: number };
  }>;
  mythic_plus_best_runs?: Array<{
    dungeon: string;
    mythic_level: number;
    clear_time_ms: number;
    num_keystone_upgrades: number;
  }>;
  raid_progression?: Record<string, { summary: string }>;
};

type BlizzardEquipment = {
  equipped_items?: Array<{
    slot?: { type: string; name: string };
    item?: { id: number; name: string };
    level?: { value: number };
    enchantments?: Array<{ enchantment_id: number; source_item?: { name: string } }>;
    sockets?: Array<{ item?: { id: number; name: string } }>;
  }>;
};

async function getBlizzardToken(): Promise<string | null> {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch('https://oauth.battle.net/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function fetchRaiderIO(region: string, realm: string, name: string): Promise<RaiderIOProfile | null> {
  const url = new URL('https://raider.io/api/v1/characters/profile');
  url.searchParams.set('region', region);
  url.searchParams.set('realm', realm);
  url.searchParams.set('name', name);
  url.searchParams.set('fields', 'gear,mythic_plus_scores_by_season:current,mythic_plus_best_runs,raid_progression,guild');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchBlizzardCharacter(region: string, realm: string, name: string, token: string) {
  const host = `${region}.api.blizzard.com`;
  const normalizedRealm = realm.toLowerCase().replace(/\s+/g, '-');
  const normalizedName = name.toLowerCase();
  const base = `https://${host}/profile/wow/character/${normalizedRealm}/${normalizedName}`;

  const [characterRes, equipmentRes, specializationRes] = await Promise.allSettled([
    fetch(`${base}?namespace=profile-${region}&locale=en_US`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${base}/equipment?namespace=profile-${region}&locale=en_US`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${base}/specializations?namespace=profile-${region}&locale=en_US`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const parseJson = async (res: PromiseSettledResult<Response>) => {
    if (res.status !== 'fulfilled' || !res.value.ok) return null;
    return res.value.json();
  };

  return {
    character: await parseJson(characterRes),
    equipment: await parseJson(equipmentRes),
    specializations: await parseJson(specializationRes),
  };
}

export async function getPlayerProfile(region: string, realm: string, name: string) {
  const cacheKey = `${region}:${realm.toLowerCase()}:${name.toLowerCase()}`;
  const cached = await getCachedValue<any>('player_profile', cacheKey, 6 * 60 * 60 * 1000);
  if (cached) {
    const history = await getProfileHistory(region, realm, name);
    return { ...cached, historyMeta: { snapshots: history.length }, cached: true };
  }

  const [raiderIO, blizzardToken] = await Promise.all([
    fetchRaiderIO(region, realm, name),
    getBlizzardToken(),
  ]);

  let blizzardData: any = null;
  if (blizzardToken) {
    blizzardData = await fetchBlizzardCharacter(region, realm, name, blizzardToken);
  }

  const equipment = (blizzardData?.equipment as BlizzardEquipment | null)?.equipped_items || [];
  const embellishedCount = equipment.filter((item) => (item.enchantments || []).length > 0).length;
  const gemsCount = equipment.reduce((sum, item) => sum + (item.sockets?.length || 0), 0);

  const bestRuns = raiderIO?.mythic_plus_best_runs || [];
  const mplusDeathsRisk = bestRuns.length === 0 ? 'unknown' : bestRuns.some((r) => r.num_keystone_upgrades === 0) ? 'medium' : 'low';

  const payload = {
    cached: false,
    identity: {
      region,
      realm,
      name,
      guild: raiderIO?.guild?.name || blizzardData?.character?.guild?.name || null,
      class: raiderIO?.class || blizzardData?.character?.character_class?.name || null,
      spec: raiderIO?.active_spec_name || null,
      itemLevel: raiderIO?.gear?.item_level_equipped || blizzardData?.character?.equipped_item_level || null,
      thumbnailUrl: raiderIO?.thumbnail_url || null,
    },
    gear: {
      items: equipment.map((item) => ({
        slot: item.slot?.name || item.slot?.type || 'Unknown',
        itemId: item.item?.id || null,
        itemName: item.item?.name || 'Unknown',
        itemLevel: item.level?.value || null,
        gems: (item.sockets || []).map((socket) => socket.item?.name).filter(Boolean),
        enchantments: (item.enchantments || []).map((enchant) => enchant.source_item?.name || `Enchant ${enchant.enchantment_id}`),
      })),
      summary: {
        embellishedCount,
        gemsCount,
      },
    },
    talents: {
      active: blizzardData?.specializations?.active_specialization?.name || null,
      loadout: blizzardData?.specializations?.specializations || [],
    },
    mythicPlus: {
      score: raiderIO?.mythic_plus_scores_by_season?.[0]?.scores?.all || null,
      bestRuns,
      risk: mplusDeathsRisk,
    },
    history: {
      raidPulls: [],
      recentRuns: bestRuns.slice(0, 10),
    },
    affiliations: {
      raidProgression: raiderIO?.raid_progression || {},
    },
  };

  await setCachedValue('player_profile', cacheKey, payload);
  return payload;
}

export async function triggerPlayerSync(region: string, realm: string, name: string) {
  const syncKey = `${region}:${realm.toLowerCase()}:${name.toLowerCase()}`;
  await setCachedValue('player_sync_status', syncKey, {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  });

  try {
    const profile = await getPlayerProfile(region, realm, name);
    await appendProfileSnapshot(region, realm, name, {
      capturedAt: new Date().toISOString(),
      identity: {
        itemLevel: profile.identity?.itemLevel || null,
        guild: profile.identity?.guild || null,
        spec: profile.identity?.spec || null,
      },
      mythicPlus: {
        score: profile.mythicPlus?.score || null,
        risk: profile.mythicPlus?.risk || 'unknown',
      },
    });

    const history = await getProfileHistory(region, realm, name);
    await setCachedValue('player_sync_status', syncKey, {
      status: 'completed',
      startedAt: null,
      finishedAt: new Date().toISOString(),
      error: null,
      snapshots: history.length,
    });
  } catch (error: any) {
    await setCachedValue('player_sync_status', syncKey, {
      status: 'failed',
      startedAt: null,
      finishedAt: new Date().toISOString(),
      error: error?.message || 'Unknown sync error',
    });
  }
}

export async function getPlayerSyncStatus(region: string, realm: string, name: string) {
  const syncKey = `${region}:${realm.toLowerCase()}:${name.toLowerCase()}`;
  const history = await getProfileHistory(region, realm, name);
  return (
    await getCachedValue<any>('player_sync_status', syncKey, 24 * 60 * 60 * 1000)
  ) || {
    status: 'idle',
    startedAt: null,
    finishedAt: null,
    error: null,
    snapshots: history.length,
  };
}
