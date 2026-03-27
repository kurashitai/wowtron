import fs from 'node:fs';
import path from 'node:path';

type TalentSpellNameCacheRecord = {
  spellId: number;
  name: string;
  source: 'local_wcl' | 'blizzard_api';
  resolvedAt: string;
};

type TalentSpellNameCachePayload = {
  generatedAt?: string;
  totalResolved?: number;
  spells?: Record<string, TalentSpellNameCacheRecord>;
};

export type ObservedTalentToken = {
  raw: string;
  nodeId?: number;
  spellId?: number;
  rank?: number;
};

const CACHE_PATH = path.join(process.cwd(), 'data', 'talent-spell-name-cache.json');
let cachedPayload: TalentSpellNameCachePayload | null | undefined;

export function parseObservedTalentToken(token: string): ObservedTalentToken | null {
  if (!token.startsWith('tree:')) return null;

  const match = token.match(/^tree:(\d+)(?::spell:(\d+))?(?::rank:(\d+))?$/);
  if (!match) return null;

  return {
    raw: token,
    nodeId: match[1] ? Number(match[1]) : undefined,
    spellId: match[2] ? Number(match[2]) : undefined,
    rank: match[3] ? Number(match[3]) : undefined,
  };
}

export function isObservedTreeToken(token: string) {
  return token.startsWith('tree:');
}

function loadCachePayload(): TalentSpellNameCachePayload {
  if (cachedPayload) return cachedPayload;
  if (cachedPayload === null) return { spells: {} };

  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    cachedPayload = JSON.parse(raw) as TalentSpellNameCachePayload;
    return cachedPayload || { spells: {} };
  } catch {
    cachedPayload = null;
    return { spells: {} };
  }
}

export function getTalentSpellName(spellId?: number): string | null {
  if (!spellId) return null;
  const payload = loadCachePayload();
  const record = payload.spells?.[String(spellId)];
  return record?.name || null;
}

export function getObservedTalentDisplayName(token: string): string {
  const parsed = parseObservedTalentToken(token);
  if (!parsed?.spellId) return token;

  const cachedName = getTalentSpellName(parsed.spellId);
  if (cachedName) return cachedName;

  return `Spell ${parsed.spellId}`;
}

export function summarizeBuildLabel(spec: string, talents: string[] = [], limit = 3) {
  const normalized = Array.from(new Set((talents || []).map((value) => value.trim()).filter(Boolean)));
  if (normalized.length === 0) {
    return `${spec} baseline`;
  }

  const observedTreeOnly = normalized.every((token) => isObservedTreeToken(token));
  if (observedTreeOnly) {
    const resolvedLabels = normalized
      .map((token) => {
        const parsed = parseObservedTalentToken(token);
        if (!parsed?.spellId) return null;
        return getTalentSpellName(parsed.spellId);
      })
      .filter((value): value is string => Boolean(value));

    if (resolvedLabels.length === 0) {
      return `${spec} observed tree (${normalized.length} nodes captured)`;
    }

    const preview = Array.from(new Set(resolvedLabels)).slice(0, limit);
    const extraCount = Math.max(0, normalized.length - preview.length);
    return `${spec} observed tree: ${preview.join(' / ')}${extraCount > 0 ? ` +${extraCount} more` : ''}`;
  }

  return normalized.slice(0, limit).join(' / ');
}

export function countNamedObservedTalents(talents: string[] = []) {
  return (talents || []).filter((token) => {
    const parsed = parseObservedTalentToken(token);
    return Boolean(parsed?.spellId && getTalentSpellName(parsed.spellId));
  }).length;
}
