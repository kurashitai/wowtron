import { getBossByNickname, getBossesByZone, getMechanicByAbility, getMechanicTip, type BossData } from '@/lib/boss-data-midnight';
import { resolveBossMechanic, type BossContext } from '@/lib/boss-context';
import type { AssignmentPlan } from './log-insight-types';

const ALL_MIDNIGHT_BOSSES = [
  ...getBossesByZone('voidspire'),
  ...getBossesByZone('dreamrift'),
  ...getBossesByZone('queldanas'),
];

export const EMPTY_ASSIGNMENT_PLAN: AssignmentPlan = {
  interrupts: '',
  soaks: '',
  dispels: '',
  raidCooldowns: '',
  tankAssignments: '',
  notes: '',
};

export function resolveBossData(bossName: string): BossData | undefined {
  const normalized = bossName.toLowerCase();
  const nicknameMatch = getBossByNickname(normalized.split(' ')[0]);
  if (nicknameMatch) return nicknameMatch;

  return ALL_MIDNIGHT_BOSSES.find((boss) => {
    const bossLower = boss.name.toLowerCase();
    return normalized === bossLower || normalized.includes(bossLower) || bossLower.includes(normalized);
  });
}

export function mechanicTipFromContext(abilityName: string, bossContext?: BossContext, bossData?: BossData) {
  const contextMechanic = resolveBossMechanic(abilityName, bossContext);
  if (contextMechanic?.tip) return contextMechanic.tip;
  if (bossData) return getMechanicTip(abilityName, bossData);
  return getTipForAbility(abilityName);
}

export function getExpectedMechanicOccurrences(
  mechanic: { frequency?: number },
  phaseWindow: { start: number; end: number }
) {
  if (!mechanic.frequency || mechanic.frequency <= 0) return 0;
  const phaseDuration = Math.max(0, phaseWindow.end - phaseWindow.start);
  return Math.max(1, Math.floor(phaseDuration / mechanic.frequency));
}

export function normalizePlanLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractPlanOwners(value: string) {
  const tokens = value
    .split(/[\n,:;>|/\-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      tokens.filter((token) =>
        /^[A-Za-z][A-Za-z' -]{1,23}$/.test(token) &&
        !['phase', 'kick', 'kicks', 'interrupt', 'interrupts', 'soak', 'soaks', 'dispel', 'dispels', 'raid', 'cd', 'cooldown', 'cooldowns', 'tank', 'swap', 'externals', 'notes'].includes(token.toLowerCase())
      )
    )
  );
}

export function guessIfAvoidable(abilityName: string): boolean {
  const avoidableKeywords = ['pool', 'ground', 'void', 'zone', 'circle', 'beam', 'wave', 'spray', 'spew', 'eruption', 'explosion', 'torrent', 'rain', 'fire', 'flame', 'ice', 'frost', 'poison', 'acid', 'shadow', 'cudgel', 'smash', 'slam', 'swipe', 'cleave'];
  const lower = abilityName.toLowerCase();
  return avoidableKeywords.some((kw) => lower.includes(kw));
}

export function getPhaseAtTime(time: number, duration: number): string {
  const percent = (time / duration) * 100;
  if (percent < 25) return 'Early';
  if (percent < 50) return 'Mid';
  if (percent < 75) return 'Late';
  return 'Final';
}

export function getExpectedDPS(spec: string): number {
  const dps: Record<string, number> = {
    Fury: 180000,
    Arms: 175000,
    Frost: 170000,
    Unholy: 175000,
    Retribution: 165000,
    Enhancement: 170000,
    Outlaw: 175000,
    Fire: 180000,
    'Frost Mage': 170000,
    Arcane: 175000,
    'Beast Mastery': 160000,
    Marksmanship: 170000,
    Survival: 165000,
    Balance: 165000,
    Feral: 170000,
    Shadow: 165000,
    Affliction: 160000,
    Destruction: 170000,
    Demonology: 165000,
    Havoc: 175000,
    Windwalker: 170000,
  };
  return dps[spec] || 150000;
}

export function diagnoseLowDPS(player: { activeTime?: number; potionUsed?: boolean; flaskUsed?: boolean; deaths?: number }): string {
  if ((player.activeTime || 0) < 90) return `Low activity: ${player.activeTime}%`;
  if (!player.potionUsed) return 'No potion used';
  if (!player.flaskUsed) return 'No flask';
  if ((player.deaths || 0) > 0) return 'Died during fight';
  return 'Check rotation/gear';
}

function getTipForAbility(abilityName: string): string {
  const tips: Record<string, string> = {
    'Void Eruption': 'Move away from the raid before the explosion',
    'Acid Rain': 'Spread to avoid splash damage',
    'Shadow Cleave': 'Boss frontal - stay behind the boss',
    'Fire Breath': 'Side-step the cone attack',
    'Ground Slam': 'Move away from ground effects',
  };
  return tips[abilityName] || 'Review positioning and timing';
}

export { getTipForAbility };
