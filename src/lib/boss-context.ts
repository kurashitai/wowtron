import { findBossByName, getBossData } from './blizzard-api';
import {
  getBossByNickname,
  getBossesByZone,
  getMechanicByAbility,
  type BossData as MidnightBossData,
  type BossMechanic,
} from './boss-data-midnight';

export interface ResolvedBossMechanic {
  id: string;
  name: string;
  type: 'avoidable' | 'unavoidable' | 'soak' | 'interrupt' | 'dispel' | 'positioning' | 'tank_swap' | 'raid_cd' | 'unknown';
  tip?: string;
  warning?: string;
  targets?: string;
}

export interface BossContext {
  source: 'midnight-static' | 'blizzard-static' | 'blizzard-api' | 'unresolved';
  bossName: string;
  canonicalName: string;
  zone?: string;
  journalId?: number;
  phases: { name: string; tips: string[] }[];
  mechanics: ResolvedBossMechanic[];
  commonMistakes: string[];
  compSuggestions: string[];
}

const ALL_MIDNIGHT_BOSSES = [
  ...getBossesByZone('voidspire'),
  ...getBossesByZone('dreamrift'),
  ...getBossesByZone('queldanas'),
];

function resolveMidnightBoss(bossName: string): MidnightBossData | undefined {
  const normalized = bossName.toLowerCase();
  const nicknameMatch = getBossByNickname(normalized.split(' ')[0]);
  if (nicknameMatch) return nicknameMatch;

  return ALL_MIDNIGHT_BOSSES.find((boss) => {
    const bossLower = boss.name.toLowerCase();
    return normalized === bossLower || normalized.includes(bossLower) || bossLower.includes(normalized);
  });
}

function fromMidnightBoss(boss: MidnightBossData): BossContext {
  return {
    source: 'midnight-static',
    bossName: boss.name,
    canonicalName: boss.name,
    zone: boss.zone,
    journalId: boss.id,
    phases: boss.phases.map((phase) => ({
      name: phase.name,
      tips: phase.tips,
    })),
    mechanics: boss.mechanics.map((mechanic) => ({
      id: mechanic.id,
      name: mechanic.name,
      type: mechanic.type,
      tip: mechanic.tip,
      warning: mechanic.warning,
      targets: mechanic.targets,
    })),
    commonMistakes: boss.commonMistakes,
    compSuggestions: boss.compSuggestions,
  };
}

function fromBlizzardStaticBoss(boss: any): BossContext {
  return {
    source: 'blizzard-static',
    bossName: boss.name,
    canonicalName: boss.name,
    zone: boss.zone,
    journalId: boss.journalId,
    phases: (boss.phases || []).map((phase: any) => ({
      name: phase.name,
      tips: [],
    })),
    mechanics: (boss.abilities || []).map((ability: any) => ({
      id: String(ability.id),
      name: ability.name,
      type: ability.isAvoidable ? 'avoidable' : 'unavoidable',
      tip: ability.tip,
    })),
    commonMistakes: [],
    compSuggestions: [],
  };
}

function fromBlizzardApiBoss(bossName: string, journalBoss: any): BossContext {
  return {
    source: 'blizzard-api',
    bossName,
    canonicalName: journalBoss.name || bossName,
    zone: journalBoss.zone || 'unknown',
    journalId: journalBoss.journalId || journalBoss.id,
    phases: (journalBoss.phases || []).map((phase: any) => ({
      name: phase.name,
      tips: [],
    })),
    mechanics: (journalBoss.abilities || []).map((ability: any) => ({
      id: String(ability.id),
      name: ability.name,
      type: ability.isAvoidable ? 'avoidable' : 'unavoidable',
      tip: ability.tip,
    })),
    commonMistakes: [],
    compSuggestions: [],
  };
}

export async function resolveBossContext(bossName: string): Promise<BossContext> {
  const midnightBoss = resolveMidnightBoss(bossName);
  if (midnightBoss) {
    return fromMidnightBoss(midnightBoss);
  }

  const blizzardStatic = findBossByName(bossName);
  if (blizzardStatic) {
    const apiBoss = await getBossData(blizzardStatic.journalId || blizzardStatic.id);
    if (apiBoss) {
      return fromBlizzardApiBoss(bossName, apiBoss);
    }
    return fromBlizzardStaticBoss(blizzardStatic);
  }

  return {
    source: 'unresolved',
    bossName,
    canonicalName: bossName,
    phases: [],
    mechanics: [],
    commonMistakes: [],
    compSuggestions: [],
  };
}

export function resolveBossMechanic(abilityName: string, bossContext?: BossContext): ResolvedBossMechanic | undefined {
  if (!bossContext) return undefined;
  const lower = abilityName.toLowerCase();
  return bossContext.mechanics.find((mechanic) =>
    mechanic.name.toLowerCase().includes(lower) || lower.includes(mechanic.name.toLowerCase())
  );
}
