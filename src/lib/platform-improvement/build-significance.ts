import type { FightPlayerRecord } from './types';

export interface BuildComparisonPlayerInput {
  name: string;
  role: 'tank' | 'healer' | 'dps';
  className?: string;
  spec: string;
  talents?: string[];
  rankPercent?: number;
  activeTime?: number;
  reliabilityScore?: number;
}

export interface BuildComparisonHistoricalRecord {
  name: string;
  role: string;
  className: string;
  spec: string;
  difficulty?: string;
  talents?: string[];
  buildSignature?: string;
  buildSource?: string;
  rankPercent: number;
  activeTime: number;
  deaths: number;
  reliabilityScore?: number | null;
  kill: boolean;
}

export interface BuildSignificanceInsight {
  playerName: string;
  role: 'tank' | 'healer' | 'dps';
  className?: string;
  spec: string;
  comparisonMode: 'talent' | 'spec_fallback';
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;
  killSampleSize: number;
  significancePercent: number;
  currentBuildLabel: string;
  betterBuildLabel?: string;
  summary: string;
  recommendation: string;
  note?: string;
}

export interface BuildSignificanceReport {
  bossName: string;
  generatedAt: string;
  datasetSummary: {
    totalRecords: number;
    killRecords: number;
    talentCoverageRecords: number;
    supportedSpecs: number;
    requestedDifficulty?: string;
    scope: 'same_difficulty' | 'cross_difficulty_fallback';
    comparedDifficulties: string[];
    summary: string;
  };
  insights: BuildSignificanceInsight[];
}

function uniqueStrings(values: string[] = []) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function extractTalentNames(rawTalents: unknown): string[] {
  if (!Array.isArray(rawTalents)) return [];
  return uniqueStrings(
    rawTalents.flatMap((talent) => {
      if (typeof talent === 'string') return [talent];
      if (!talent || typeof talent !== 'object') return [];
      const record = talent as Record<string, unknown>;
      const candidates = [
        typeof record.name === 'string' ? record.name : '',
        typeof record.spellName === 'string' ? record.spellName : '',
        typeof record.talentName === 'string' ? record.talentName : '',
        typeof record.displayName === 'string' ? record.displayName : '',
        record.ability && typeof record.ability === 'object' && typeof (record.ability as Record<string, unknown>).name === 'string'
          ? ((record.ability as Record<string, unknown>).name as string)
          : '',
        record.spell && typeof record.spell === 'object' && typeof (record.spell as Record<string, unknown>).name === 'string'
          ? ((record.spell as Record<string, unknown>).name as string)
          : '',
      ];
      return candidates.filter(Boolean);
    })
  );
}

export function deriveBuildSignature(spec: string, talents: string[] = []) {
  const normalizedTalents = uniqueStrings(talents);
  if (normalizedTalents.length > 0) {
    return {
      buildSignature: `talent:${spec.toLowerCase()}::${normalizedTalents.slice().sort().join('|')}`,
      buildSource: 'talent_profile' as const,
    };
  }

  return {
    buildSignature: `spec:${spec.toLowerCase()}`,
    buildSource: 'spec_fallback' as const,
  };
}

function buildLabel(spec: string, talents: string[] = []) {
  const normalizedTalents = uniqueStrings(talents);
  if (normalizedTalents.length === 0) {
    return `${spec} baseline`;
  }

  return normalizedTalents.slice(0, 3).join(' / ');
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toHistoricalRecord(record: BuildComparisonHistoricalRecord | FightPlayerRecord & { fight?: { kill?: boolean } }) {
  const talents = Array.isArray(record.talents) ? record.talents : [];
  const build = deriveBuildSignature(record.spec, talents);
  return {
    ...record,
    role: (record.role as 'tank' | 'healer' | 'dps') || 'dps',
    talents,
    buildSignature: record.buildSignature || build.buildSignature,
    buildSource: record.buildSource || build.buildSource,
    kill: 'kill' in record ? Boolean(record.kill) : Boolean(record.fight?.kill),
  };
}

function compareConfidence(mode: 'talent' | 'spec_fallback', sampleSize: number, killSampleSize: number) {
  if (mode === 'talent') {
    if (sampleSize >= 8 && killSampleSize >= 4) return 'high' as const;
    if (sampleSize >= 4 && killSampleSize >= 2) return 'medium' as const;
    return 'low' as const;
  }

  if (sampleSize >= 10 && killSampleSize >= 4) return 'medium' as const;
  return 'low' as const;
}

export function buildBuildSignificanceReport(args: {
  bossName: string;
  requestedDifficulty?: string;
  currentPlayers: BuildComparisonPlayerInput[];
  historicalRecords: BuildComparisonHistoricalRecord[];
}): BuildSignificanceReport {
  const historicalRecords = args.historicalRecords.map(toHistoricalRecord);
  const totalRecords = historicalRecords.length;
  const killRecords = historicalRecords.filter((record) => record.kill).length;
  const talentCoverageRecords = historicalRecords.filter((record) => record.buildSource === 'talent_profile' && (record.talents?.length || 0) > 0).length;
  const supportedSpecs = new Set(historicalRecords.map((record) => record.spec).filter(Boolean)).size;
  const comparedDifficulties = Array.from(new Set(historicalRecords.map((record) => record.difficulty).filter(Boolean))) as string[];
  const scope: 'same_difficulty' | 'cross_difficulty_fallback' =
    args.requestedDifficulty && comparedDifficulties.length > 0 && !comparedDifficulties.includes(args.requestedDifficulty)
      ? 'cross_difficulty_fallback'
      : 'same_difficulty';

  const insights = args.currentPlayers
    .map((player) => {
      const relevantRecords = historicalRecords.filter(
        (record) =>
          record.spec === player.spec &&
          record.role === player.role
      );

      if (relevantRecords.length < 3) {
        return {
          playerName: player.name,
          role: player.role,
          className: player.className,
          spec: player.spec,
          comparisonMode: 'spec_fallback' as const,
          confidence: 'low' as const,
          sampleSize: relevantRecords.length,
          killSampleSize: relevantRecords.filter((record) => record.kill).length,
          significancePercent: 0,
          currentBuildLabel: buildLabel(player.spec, player.talents),
          summary: `WoWtron does not have enough stored ${player.spec} samples on ${args.bossName} yet.`,
          recommendation: 'Keep collecting real boss data before making a talent-level call here.',
          note: 'This comparison is blocked by sample size, not by player performance.',
        };
      }

      const currentBuild = deriveBuildSignature(player.spec, player.talents || []);
      const specHasTalentCoverage = relevantRecords.filter((record) => record.buildSource === 'talent_profile').length >= 6;
      const comparisonMode: 'talent' | 'spec_fallback' = specHasTalentCoverage && (player.talents?.length || 0) > 0 ? 'talent' : 'spec_fallback';
      const grouped = new Map<string, BuildComparisonHistoricalRecord[]>();

      relevantRecords.forEach((record) => {
        const key = comparisonMode === 'talent'
          ? (record.buildSignature || deriveBuildSignature(record.spec, record.talents || []).buildSignature)
          : `spec:${record.spec.toLowerCase()}`;
        const bucket = grouped.get(key) || [];
        bucket.push(record);
        grouped.set(key, bucket);
      });

      const groupStats = Array.from(grouped.entries()).map(([key, records]) => {
        const kills = records.filter((record) => record.kill);
        const completionRate = Math.round((kills.length / Math.max(1, records.length)) * 100);
        const averageRank = Math.round(average(records.map((record) => record.rankPercent)));
        const averageActive = Math.round(average(records.map((record) => record.activeTime)));
        const averageReliability = Math.round(average(records.map((record) => Number(record.reliabilityScore || 0))));
        const reference = records[0];
        return {
          key,
          records,
          samples: records.length,
          kills: kills.length,
          completionRate,
          averageRank,
          averageActive,
          averageReliability,
          label: buildLabel(reference.spec, comparisonMode === 'talent' ? reference.talents || [] : []),
          talents: comparisonMode === 'talent' ? (reference.talents || []) : [],
          score: completionRate * 0.6 + averageRank * 0.2 + averageActive * 0.1 + averageReliability * 0.1,
        };
      });

      const bestGroup = groupStats
        .slice()
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.samples - a.samples;
        })[0];
      const currentGroup = groupStats.find((group) => group.key === (comparisonMode === 'talent' ? currentBuild.buildSignature : `spec:${player.spec.toLowerCase()}`));
      const currentCompletionRate = currentGroup?.completionRate ?? 0;
      const currentLabel = buildLabel(player.spec, player.talents || []);
      const significancePercent = Math.max(0, Math.round((bestGroup?.completionRate || 0) - currentCompletionRate));
      const confidence = compareConfidence(comparisonMode, bestGroup?.samples || relevantRecords.length, bestGroup?.kills || 0);

      if (!bestGroup) {
        return {
          playerName: player.name,
          role: player.role,
          className: player.className,
          spec: player.spec,
          comparisonMode,
          confidence,
          sampleSize: relevantRecords.length,
          killSampleSize: relevantRecords.filter((record) => record.kill).length,
          significancePercent: 0,
          currentBuildLabel: currentLabel,
          summary: `WoWtron found ${relevantRecords.length} ${player.spec} samples on ${args.bossName}, but no stable build baseline yet.`,
          recommendation: 'Treat this as a data-collection gap and do not force a build swap from it yet.',
        };
      }

      const currentTalents = uniqueStrings(player.talents || []);
      const betterTalents = uniqueStrings(bestGroup.talents || []);
      const removedTalent = currentTalents.find((talent) => !betterTalents.includes(talent));
      const addedTalent = betterTalents.find((talent) => !currentTalents.includes(talent));
      const exactTalentSwapText =
        comparisonMode === 'talent' && removedTalent && addedTalent
          ? `${player.name} is currently on ${removedTalent}, while the strongest stored completion build leans toward ${addedTalent}.`
          : undefined;

      if (comparisonMode === 'talent' && bestGroup.key !== currentBuild.buildSignature && significancePercent > 0) {
        return {
          playerName: player.name,
          role: player.role,
          className: player.className,
          spec: player.spec,
          comparisonMode,
          confidence,
          sampleSize: bestGroup.samples,
          killSampleSize: bestGroup.kills,
          significancePercent,
          currentBuildLabel: currentLabel,
          betterBuildLabel: bestGroup.label,
          summary: exactTalentSwapText || `${player.name}'s current build trails the strongest stored ${player.spec} completion build on ${args.bossName}.`,
          recommendation: `${bestGroup.label} converts ${significancePercent}% better in the stored corpus for this boss. Review this build before changing comp or blaming throughput.`,
          note:
            confidence === 'low'
              ? 'This is still beta. Sample size is not large enough to treat the build swap as mandatory.'
              : `Comparison uses ${bestGroup.samples} stored ${player.spec} samples on this boss.`,
        };
      }

      const currentRank = Math.round(player.rankPercent || 0);
      const currentReliability = Math.round(player.reliabilityScore || 0);
      const specGap = Math.max(
        Math.round(bestGroup.averageRank - currentRank),
        Math.round(bestGroup.averageReliability - currentReliability)
      );

      return {
        playerName: player.name,
        role: player.role,
        className: player.className,
        spec: player.spec,
        comparisonMode: 'spec_fallback',
        confidence: compareConfidence('spec_fallback', relevantRecords.length, relevantRecords.filter((record) => record.kill).length),
        sampleSize: relevantRecords.length,
        killSampleSize: relevantRecords.filter((record) => record.kill).length,
        significancePercent: Math.max(0, specGap),
        currentBuildLabel: currentLabel,
        betterBuildLabel: bestGroup.label === currentLabel ? undefined : bestGroup.label,
        summary: `Talent-level comparison is not reliable yet for ${player.spec} on ${args.bossName}. WoWtron is using the kill baseline for this spec instead.`,
        recommendation:
          specGap > 0
            ? `${player.name} is ${specGap} points behind the stored ${player.spec} kill baseline on rank/reliability. Fix execution first, then review build choices.`
            : `Current ${player.spec} performance is roughly in line with the stored kill baseline. No forced build swap is justified yet.`,
        note: 'This fallback compares spec-level success, not an exact talent tree.',
      };
    })
    .sort((a, b) => {
      if (b.significancePercent !== a.significancePercent) return b.significancePercent - a.significancePercent;
      const confidenceWeight = { high: 3, medium: 2, low: 1 };
      return confidenceWeight[b.confidence] - confidenceWeight[a.confidence];
    })
    .slice(0, 6);

  return {
    bossName: args.bossName,
    generatedAt: new Date().toISOString(),
    datasetSummary: {
      totalRecords,
      killRecords,
      talentCoverageRecords,
      supportedSpecs,
      requestedDifficulty: args.requestedDifficulty,
      scope,
      comparedDifficulties,
      summary:
        talentCoverageRecords >= 12
          ? scope === 'same_difficulty'
            ? 'WoWtron has enough talent-tagged pulls to start making cautious build comparisons on this difficulty.'
            : 'Talent-tagged pulls exist, but this comparison had to fall back across difficulties because same-difficulty history is missing.'
          : scope === 'same_difficulty'
            ? 'Talent-tagged coverage is still thin on this difficulty. Beta build calls fall back to spec-level history when needed.'
            : 'Same-difficulty build history is missing, so this beta comparison is falling back across difficulties.',
    },
    insights,
  };
}
