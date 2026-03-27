import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

if (typeof process.loadEnvFile === 'function') {
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
}

const fightPlayerDir = path.join(process.cwd(), 'data', 'platform-improvement', 'fight-player-records');
const rawArtifactDir = path.join(process.cwd(), '.wowtron-cache', 'platform-improvement', 'raw-artifacts', 'wcl_fight_bundle');
const outputPath = path.join(process.cwd(), 'data', 'talent-spell-name-cache.json');
const unresolvedPath = path.join(process.cwd(), 'data', 'talent-spell-name-unresolved.json');

function parseObservedTalentToken(token) {
  if (typeof token !== 'string' || !token.startsWith('tree:')) return null;
  const match = token.match(/^tree:(\d+)(?::spell:(\d+))?(?::rank:(\d+))?$/);
  if (!match) return null;
  return {
    nodeId: match[1] ? Number(match[1]) : undefined,
    spellId: match[2] ? Number(match[2]) : undefined,
    rank: match[3] ? Number(match[3]) : undefined,
  };
}

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, 'utf8'));
}

async function getBlizzardToken() {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return payload.access_token || null;
}

async function fetchSpellNameFromBlizzard(token, spellId) {
  if (!token) return null;

  try {
    const response = await fetch(`https://us.api.blizzard.com/data/wow/spell/${spellId}?namespace=static-us&locale=en_US`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;
    const payload = await response.json();
    return typeof payload?.name === 'string' ? payload.name : null;
  } catch {
    return null;
  }
}

function collectLocalSpellNames(rawPayload) {
  const map = new Map();
  const reportAbilities = rawPayload?.payload?.report?.masterData?.abilities;
  if (Array.isArray(reportAbilities)) {
    for (const ability of reportAbilities) {
      if (typeof ability?.gameID === 'number' && typeof ability?.name === 'string') {
        map.set(ability.gameID, ability.name);
      }
    }
  }

  const tableSets = [
    rawPayload?.payload?.damageDone?.entries,
    rawPayload?.payload?.healingDone?.entries,
    rawPayload?.payload?.damageTaken?.entries,
  ];

  for (const entries of tableSets) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!Array.isArray(entry?.abilities)) continue;
      for (const ability of entry.abilities) {
        if (typeof ability?.gameID === 'number' && typeof ability?.name === 'string') {
          map.set(ability.gameID, ability.name);
        }
      }
    }
  }

  return map;
}

async function main() {
  const existing = fs.existsSync(outputPath) ? await readJson(outputPath) : { spells: {} };
  const spells = new Map(Object.entries(existing.spells || {}).map(([key, value]) => [Number(key), value]));
  const blizzardConfigured = Boolean(process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET);

  const playerFiles = fs.existsSync(fightPlayerDir) ? (await fsp.readdir(fightPlayerDir)).filter((file) => file.endsWith('.json')) : [];
  const targetSpellIds = new Set();
  for (const file of playerFiles) {
    const payload = await readJson(path.join(fightPlayerDir, file));
    for (const token of Array.isArray(payload?.talents) ? payload.talents : []) {
      const parsed = parseObservedTalentToken(token);
      if (parsed?.spellId) targetSpellIds.add(parsed.spellId);
    }
  }

  const localSpellNames = new Map();
  const rawFiles = fs.existsSync(rawArtifactDir) ? (await fsp.readdir(rawArtifactDir)).filter((file) => file.endsWith('.json')) : [];
  for (const file of rawFiles) {
    const payload = await readJson(path.join(rawArtifactDir, file));
    const localMap = collectLocalSpellNames(payload);
    for (const [spellId, name] of localMap.entries()) {
      if (!localSpellNames.has(spellId)) {
        localSpellNames.set(spellId, name);
      }
    }
  }

  for (const spellId of targetSpellIds) {
    if (spells.has(spellId)) continue;
    const localName = localSpellNames.get(spellId);
    if (localName) {
      spells.set(spellId, {
        spellId,
        name: localName,
        source: 'local_wcl',
        resolvedAt: new Date().toISOString(),
      });
    }
  }

  const unresolvedIds = Array.from(targetSpellIds).filter((spellId) => !spells.has(spellId));
  const blizzardToken = unresolvedIds.length > 0 ? await getBlizzardToken() : null;

  let blizzardResolvedCount = 0;
  let localResolvedCount = 0;

  if (blizzardToken) {
    for (const spellId of unresolvedIds) {
      const name = await fetchSpellNameFromBlizzard(blizzardToken, spellId);
      if (!name) continue;
      spells.set(spellId, {
        spellId,
        name,
        source: 'blizzard_api',
        resolvedAt: new Date().toISOString(),
      });
      blizzardResolvedCount += 1;
    }
  }

  for (const value of spells.values()) {
    if (value.source === 'local_wcl') localResolvedCount += 1;
  }

  const unresolved = Array.from(targetSpellIds).filter((spellId) => !spells.has(spellId)).sort((a, b) => a - b);
  const payload = {
    generatedAt: new Date().toISOString(),
    totalResolved: spells.size,
    unresolvedCount: unresolved.length,
    blizzardConfigured,
    localResolvedCount,
    blizzardResolvedCount,
    spells: Object.fromEntries(Array.from(spells.entries()).sort((a, b) => a[0] - b[0])),
  };

  await fsp.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  await fsp.writeFile(unresolvedPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    unresolvedSpellIds: unresolved,
  }, null, 2), 'utf8');

  console.log(JSON.stringify({
    ok: true,
    outputPath,
    unresolvedPath,
    targetSpellIds: targetSpellIds.size,
    resolvedCount: spells.size,
    unresolvedCount: unresolved.length,
    blizzardConfigured,
    localResolvedCount,
    blizzardResolvedCount,
    usedBlizzard: Boolean(blizzardToken),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
