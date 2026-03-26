import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

type ProfileSnapshot = {
  capturedAt: string;
  identity: {
    itemLevel: number | null;
    guild: string | null;
    spec: string | null;
  };
  mythicPlus: {
    score: number | null;
    risk: string;
  };
};

const HISTORY_ROOT = path.join(process.cwd(), '.wowtron-cache', 'player-history');
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
const SUPABASE_TABLE = process.env.SUPABASE_PLAYER_SNAPSHOTS_TABLE?.trim() || 'player_profile_snapshots';

function hasSupabase(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function insertSupabaseSnapshot(region: string, realm: string, name: string, snapshot: ProfileSnapshot) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      region,
      realm: realm.toLowerCase(),
      name: name.toLowerCase(),
      captured_at: snapshot.capturedAt,
      identity: snapshot.identity,
      mythic_plus: snapshot.mythicPlus,
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase insert failed: ${await response.text()}`);
  }
}

async function readSupabaseHistory(region: string, realm: string, name: string): Promise<ProfileSnapshot[]> {
  const query = new URLSearchParams({
    region: `eq.${region}`,
    realm: `eq.${realm.toLowerCase()}`,
    name: `eq.${name.toLowerCase()}`,
    order: 'captured_at.desc',
    limit: '100',
    select: 'captured_at,identity,mythic_plus',
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?${query.toString()}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase read failed: ${await response.text()}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) return [];

  return rows.map((row: any) => ({
    capturedAt: row.captured_at,
    identity: row.identity || { itemLevel: null, guild: null, spec: null },
    mythicPlus: row.mythic_plus || { score: null, risk: 'unknown' },
  }));
}

function getHistoryFile(region: string, realm: string, name: string): string {
  const key = `${region}-${realm}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, '_');
  return path.join(HISTORY_ROOT, `${key}.json`);
}

export async function appendProfileSnapshot(
  region: string,
  realm: string,
  name: string,
  snapshot: ProfileSnapshot
) {
  if (hasSupabase()) {
    await insertSupabaseSnapshot(region, realm, name, snapshot);
    return;
  }

  const filePath = getHistoryFile(region, realm, name);
  await mkdir(path.dirname(filePath), { recursive: true });

  let history: ProfileSnapshot[] = [];
  try {
    const raw = await readFile(filePath, 'utf-8');
    history = JSON.parse(raw);
  } catch {
    history = [];
  }

  history.push(snapshot);
  const trimmed = history.slice(-100);
  await writeFile(filePath, JSON.stringify(trimmed), 'utf-8');
}

export async function getProfileHistory(region: string, realm: string, name: string): Promise<ProfileSnapshot[]> {
  if (hasSupabase()) {
    return readSupabaseHistory(region, realm, name);
  }

  const filePath = getHistoryFile(region, realm, name);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function checkSupabaseConnection() {
  if (!hasSupabase()) {
    return { ok: false, reason: 'Supabase env vars not configured' };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      }
    );

    if (!response.ok) {
      return { ok: false, reason: await response.text() };
    }

    return { ok: true, reason: 'Supabase connection is healthy' };
  } catch (error: any) {
    return { ok: false, reason: error?.message || 'Unknown Supabase error' };
  }
}
