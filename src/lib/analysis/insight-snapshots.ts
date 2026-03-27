import type { AnalysisResultLike, FightLike } from './insight-snapshots.types';
import type { InsightSnapshot } from './log-insight-types';

const STORAGE_PREFIX = 'wowtron:insight-snapshot:';
const STORAGE_INDEX = 'wowtron:insight-snapshot:index';
const MAX_SNAPSHOTS = 40;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readIndex(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_INDEX);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(keys: string[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_INDEX, JSON.stringify(keys));
}

export function buildInsightSnapshot(fight: FightLike, analysis: AnalysisResultLike, reportCode?: string): InsightSnapshot {
  return {
    key: `${fight.bossName.toLowerCase()}::${fight.id}`,
    fightId: fight.id,
    bossName: fight.bossName,
    difficulty: fight.difficulty,
    reportCode,
    recordedAt: new Date().toISOString(),
    kill: fight.kill,
    bossHP: fight.bossHP,
    duration: fight.duration,
    briefInsights: analysis.briefInsights || [],
    deltaInsights: analysis.deltaInsights || [],
    playerCoaching: analysis.playerCoaching || [],
    assignmentAssessments: analysis.assignmentAssessments || [],
    phaseSuccessCriteria: analysis.phaseSuccessCriteria || [],
    causeChains: analysis.causeChains || [],
    phaseReadiness: analysis.phaseReadiness || [],
    commandView: analysis.commandView,
    assignmentPlanOverview: analysis.assignmentPlanOverview,
    avgReliability: analysis.players && analysis.players.length > 0
      ? Math.floor(analysis.players.reduce((sum, player) => sum + (player.reliabilityScore || 0), 0) / analysis.players.length)
      : undefined,
    killProbability: analysis.killProbability,
    totalDeaths: (analysis.deaths?.avoidable?.length || 0) + (analysis.deaths?.unavoidable?.length || 0),
    avoidableDeaths: analysis.deaths?.avoidable?.length || 0,
    players: (analysis.players || []).map((player) => ({
      name: player.name,
      role: player.role,
      className: player.class,
      spec: player.spec,
      talents: player.talents || [],
      reliabilityScore: player.reliabilityScore || 0,
      activeTime: player.activeTime || 0,
      deaths: player.deaths || 0,
    })),
  };
}

export function persistInsightSnapshot(snapshot: InsightSnapshot) {
  if (!canUseStorage()) return;
  const index = readIndex().filter((key) => key !== snapshot.key);
  index.unshift(snapshot.key);
  const trimmed = index.slice(0, MAX_SNAPSHOTS);
  writeIndex(trimmed);
  window.localStorage.setItem(`${STORAGE_PREFIX}${snapshot.key}`, JSON.stringify(snapshot));

  const overflow = index.slice(MAX_SNAPSHOTS);
  overflow.forEach((key) => window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`));
}

export function loadInsightSnapshots(bossName?: string): InsightSnapshot[] {
  if (!canUseStorage()) return [];
  return readIndex()
    .map((key) => {
      try {
        const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        return raw ? (JSON.parse(raw) as InsightSnapshot) : null;
      } catch {
        return null;
      }
    })
    .filter((snapshot): snapshot is InsightSnapshot => Boolean(snapshot))
    .filter((snapshot) => !bossName || snapshot.bossName === bossName);
}

export function loadInsightSnapshotsForReport(reportCode: string, bossName?: string): InsightSnapshot[] {
  return loadInsightSnapshots(bossName).filter((snapshot) => snapshot.reportCode === reportCode);
}

export function exportInsightSnapshots(bossName?: string) {
  return {
    exportedAt: new Date().toISOString(),
    count: loadInsightSnapshots(bossName).length,
    snapshots: loadInsightSnapshots(bossName),
  };
}
