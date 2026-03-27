import type { InsightSnapshot, InsightSnapshotPlayer } from './log-insight-types';

export interface SessionReview {
  totalPulls: number;
  kills: number;
  wipes: number;
  bestPull?: InsightSnapshot;
  latestPull?: InsightSnapshot;
  repeatedFailure?: string;
  repeatedPhase?: string;
  biggestBlocker?: string;
  trend: 'improving' | 'stagnant' | 'regressing';
  summary: string;
  nextFocus: string;
}

export interface BossMemory {
  totalPulls: number;
  killCount: number;
  lastKillAt?: string;
  recurringBlocker?: string;
  recurringWipePhase?: string;
  recurringOwner?: string;
  summary: string;
  repeatedFailures: string[];
}

export interface PlayerReliabilityTrend {
  name: string;
  role: 'tank' | 'healer' | 'dps';
  averageReliability: number;
  trend: 'up' | 'flat' | 'down';
  averageActiveTime: number;
  totalDeaths: number;
  samples: number;
}

export interface SessionCommandCenter {
  verdict: 'extend_same_plan' | 'fix_assignments_first' | 'reset_strategy' | 'stable_kill_pattern';
  headline: string;
  rationale: string;
  tonightCalls: string[];
  coachingTargets: {
    name: string;
    role: 'tank' | 'healer' | 'dps';
    reason: string;
  }[];
  escalationRisk: string;
}

export interface NightComparison {
  currentReportCode?: string;
  previousReportCode?: string;
  summary: string;
  progressDelta: string;
  recommendation: string;
}

export interface GuildBossKnowledge {
  summary: string;
  stableKillPattern: string;
  knownBlockers: string[];
  knownFailurePhase?: string;
  knownOwnerPressure?: string;
}

export interface PlayerBossCoachingMemory {
  name: string;
  role: 'tank' | 'healer' | 'dps';
  sessions: number;
  repeatedReason: string;
  averageReliability: number;
}

export interface SessionRecap {
  oneSentenceSummary: string;
  keepDoing: string[];
  changeNow: string[];
  watchNext: string[];
  nextNightStartCall: string;
}

export interface SessionRecapBuildInput {
  playerName: string;
  summary: string;
  significancePercent: number;
  confidence: 'high' | 'medium' | 'low';
}

function getBestPullScore(snapshot: InsightSnapshot) {
  const hp = snapshot.kill ? 0 : (snapshot.bossHP ?? 100);
  const deaths = snapshot.totalDeaths ?? 0;
  return (100 - hp) * 10 - deaths * 2 + (snapshot.kill ? 2000 : 0);
}

function summarizeTrend(first?: InsightSnapshot, latest?: InsightSnapshot): 'improving' | 'stagnant' | 'regressing' {
  if (!first || !latest) return 'stagnant';
  const firstHp = first.kill ? 0 : (first.bossHP ?? 100);
  const latestHp = latest.kill ? 0 : (latest.bossHP ?? 100);
  const firstDeaths = first.totalDeaths ?? 0;
  const latestDeaths = latest.totalDeaths ?? 0;
  const hpDelta = firstHp - latestHp;
  const deathDelta = firstDeaths - latestDeaths;
  if (hpDelta >= 5 || (latest.kill && !first.kill) || (hpDelta >= 3 && deathDelta >= 1)) return 'improving';
  if (hpDelta <= -3 || deathDelta <= -3) return 'regressing';
  return 'stagnant';
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function normalizeDifficulty(value?: string) {
  return value || 'Unknown';
}

function groupSnapshotsByReport(snapshots: InsightSnapshot[]) {
  return snapshots.reduce((map, snapshot) => {
    const key = snapshot.reportCode || 'unknown';
    const current = map.get(key) || [];
    current.push(snapshot);
    map.set(key, current);
    return map;
  }, new Map<string, InsightSnapshot[]>());
}

export function buildSessionReview(snapshots: InsightSnapshot[]): SessionReview | undefined {
  if (snapshots.length === 0) return undefined;
  const ordered = [...snapshots].sort((a, b) => a.fightId - b.fightId);
  const latestPull = ordered[ordered.length - 1];
  const bestPull = [...ordered].sort((a, b) => getBestPullScore(b) - getBestPullScore(a))[0];
  const wipes = ordered.filter((snapshot) => !snapshot.kill);
  const kills = ordered.filter((snapshot) => snapshot.kill);
  const repeatedFailure = mostFrequent(wipes.map((snapshot) => snapshot.commandView?.mostLikelyNextWipe?.summary || snapshot.briefInsights[0]?.summary || ''));
  const repeatedPhase = mostFrequent(wipes.map((snapshot) => snapshot.phaseReadiness?.find((phase) => phase.status !== 'ready')?.phase || ''));
  const biggestBlocker = mostFrequent(wipes.map((snapshot) => snapshot.commandView?.biggestBlocker?.summary || snapshot.briefInsights[0]?.summary || ''));
  const trend = summarizeTrend(ordered[0], latestPull);

  const summary =
    trend === 'improving'
      ? `This session is moving forward. Best pull reached ${bestPull.kill ? 'a kill' : `${bestPull.bossHP}% boss HP`}.`
      : trend === 'regressing'
        ? 'This session is sliding backward. The latest pulls are losing ground or stability.'
        : 'This session is mostly flat. The raid is repeating the same wall without a clean breakthrough.';

  const nextFocus = biggestBlocker || repeatedFailure || 'No clear recurring blocker was found yet.';

  return {
    totalPulls: ordered.length,
    kills: kills.length,
    wipes: wipes.length,
    bestPull,
    latestPull,
    repeatedFailure,
    repeatedPhase,
    biggestBlocker,
    trend,
    summary,
    nextFocus,
  };
}

export function buildBossMemory(snapshots: InsightSnapshot[]): BossMemory | undefined {
  if (snapshots.length === 0) return undefined;
  const ordered = [...snapshots].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const recurringBlocker = mostFrequent(ordered.map((snapshot) => snapshot.commandView?.biggestBlocker?.summary || snapshot.briefInsights[0]?.summary || ''));
  const recurringWipePhase = mostFrequent(ordered.map((snapshot) => snapshot.phaseReadiness?.find((phase) => phase.status !== 'ready')?.phase || ''));
  const recurringOwner = mostFrequent(ordered.map((snapshot) => snapshot.commandView?.biggestBlocker?.owner || snapshot.briefInsights[0]?.owner || ''));
  const repeatedFailures = Array.from(new Set(
    ordered
      .filter((snapshot) => !snapshot.kill)
      .map((snapshot) => snapshot.commandView?.mostLikelyNextWipe?.summary || snapshot.briefInsights[0]?.summary || '')
      .filter(Boolean)
  )).slice(0, 4);
  const killSnapshots = ordered.filter((snapshot) => snapshot.kill);
  const lastKill = killSnapshots[killSnapshots.length - 1];
  const summary = lastKill
    ? `This boss has ${killSnapshots.length} recorded kill(s). The raid usually wipes first on ${recurringWipePhase || 'an unstable phase'} before it converts.`
    : `No recorded kill yet. The raid usually breaks first on ${recurringWipePhase || 'the same unstable phase'}.`;

  return {
    totalPulls: ordered.length,
    killCount: killSnapshots.length,
    lastKillAt: lastKill?.recordedAt,
    recurringBlocker,
    recurringWipePhase,
    recurringOwner,
    summary,
    repeatedFailures,
  };
}

export function buildPlayerReliabilityTrends(snapshots: InsightSnapshot[]): PlayerReliabilityTrend[] {
  const playerMap = new Map<string, { role: 'tank' | 'healer' | 'dps'; samples: InsightSnapshotPlayer[] }>();

  snapshots.forEach((snapshot) => {
    (snapshot.players || []).forEach((player) => {
      const current = playerMap.get(player.name) || { role: player.role, samples: [] };
      current.samples.push(player);
      current.role = player.role;
      playerMap.set(player.name, current);
    });
  });

  return Array.from(playerMap.entries())
    .map(([name, entry]) => {
      const averageReliability = Math.round(entry.samples.reduce((sum, sample) => sum + sample.reliabilityScore, 0) / entry.samples.length);
      const averageActiveTime = Math.round(entry.samples.reduce((sum, sample) => sum + sample.activeTime, 0) / entry.samples.length);
      const totalDeaths = entry.samples.reduce((sum, sample) => sum + sample.deaths, 0);
      const first = entry.samples[0]?.reliabilityScore ?? averageReliability;
      const last = entry.samples[entry.samples.length - 1]?.reliabilityScore ?? averageReliability;
      const delta = last - first;
      const trend: 'up' | 'flat' | 'down' = delta >= 5 ? 'up' : delta <= -5 ? 'down' : 'flat';

      return {
        name,
        role: entry.role,
        averageReliability,
        trend,
        averageActiveTime,
        totalDeaths,
        samples: entry.samples.length,
      };
    })
    .sort((a, b) => a.averageReliability - b.averageReliability)
    .slice(0, 8);
}

export function buildSessionCommandCenter(
  sessionReview: SessionReview | undefined,
  bossMemory: BossMemory | undefined,
  reliabilityTrends: PlayerReliabilityTrend[]
): SessionCommandCenter | undefined {
  if (!sessionReview && !bossMemory) return undefined;

  const weakestPlayers = reliabilityTrends
    .slice()
    .sort((a, b) => a.averageReliability - b.averageReliability)
    .slice(0, 3);

  const unstablePlayer = weakestPlayers[0];
  const recurringBlocker = sessionReview?.biggestBlocker || bossMemory?.recurringBlocker || 'No clear blocker yet.';
  const recurringPhase = sessionReview?.repeatedPhase || bossMemory?.recurringWipePhase || 'the current unstable phase';
  const killCount = bossMemory?.killCount || 0;
  const trend = sessionReview?.trend || 'stagnant';

  let verdict: SessionCommandCenter['verdict'] = 'fix_assignments_first';
  if (killCount > 0) {
    verdict = 'stable_kill_pattern';
  } else if (trend === 'improving' && sessionReview?.bestPull && !sessionReview.bestPull.kill && (sessionReview.bestPull.bossHP ?? 100) <= 15) {
    verdict = 'extend_same_plan';
  } else if (trend === 'regressing') {
    verdict = 'reset_strategy';
  }

  const headline =
    verdict === 'stable_kill_pattern'
      ? 'This boss already has a stable kill pattern in memory.'
      : verdict === 'extend_same_plan'
        ? 'Do not reset the whole plan. Tighten execution and push the same line.'
        : verdict === 'reset_strategy'
          ? 'The current session is slipping. Reset the plan instead of brute-forcing more pulls.'
          : 'Fix assignments and repeated execution leaks before changing damage goals.';

  const rationale =
    verdict === 'stable_kill_pattern'
      ? bossMemory?.summary || 'There is already enough successful history to copy the stable version of the fight.'
      : verdict === 'extend_same_plan'
        ? `Best pull reached ${sessionReview?.bestPull?.kill ? 'a kill' : `${sessionReview?.bestPull?.bossHP}% boss HP`}. The raid is close enough that a full reset would waste progress.`
        : verdict === 'reset_strategy'
          ? `The raid is regressing while still breaking first on ${recurringPhase}. Repeating the same call set is likely to waste more pulls.`
          : `The session keeps breaking first on ${recurringPhase}. The repeated blocker is still "${recurringBlocker}".`;

  const tonightCalls = [
    recurringBlocker,
    sessionReview?.nextFocus || 'No next focus recorded yet.',
    recurringPhase === 'the current unstable phase'
      ? 'Stabilize the first failing phase before chasing a better final burn.'
      : `Treat ${recurringPhase} as the gate. Do not move past it in planning.`,
  ].filter(Boolean).slice(0, 3);

  const coachingTargets = weakestPlayers.map((player) => ({
    name: player.name,
    role: player.role,
    reason:
      player.averageActiveTime < 85
        ? 'Active time is too low for progression pace.'
        : player.totalDeaths >= Math.max(2, player.samples)
          ? 'Deaths are still too frequent across the session.'
          : player.trend === 'down'
            ? 'Reliability is slipping across recent pulls.'
            : 'Reliability is still lower than the rest of the raid.',
  }));

  const escalationRisk =
    verdict === 'stable_kill_pattern'
      ? 'Low. The main job is preserving the clean version of the fight.'
      : unstablePlayer
        ? `${unstablePlayer.name} is currently the clearest coaching risk if nothing changes.`
        : 'The next escalation risk is still the same repeated raid-level blocker.';

  return {
    verdict,
    headline,
    rationale,
    tonightCalls,
    coachingTargets,
    escalationRisk,
  };
}

export function buildNightComparison(
  currentSessionSnapshots: InsightSnapshot[],
  allBossSnapshots: InsightSnapshot[],
  currentReportCode?: string
): NightComparison | undefined {
  if (currentSessionSnapshots.length === 0) return undefined;
  const currentBest = [...currentSessionSnapshots].sort((a, b) => getBestPullScore(b) - getBestPullScore(a))[0];
  const targetDifficulty = mostFrequent(currentSessionSnapshots.map((snapshot) => normalizeDifficulty(snapshot.difficulty)));
  const reportGroups = groupSnapshotsByReport(allBossSnapshots);
  const previousSessionsBase = Array.from(reportGroups.entries())
    .filter(([reportCode]) => reportCode !== currentReportCode)
    .map(([reportCode, snaps]) => ({
      reportCode,
      difficulty: mostFrequent(snaps.map((snapshot) => normalizeDifficulty(snapshot.difficulty))),
      best: [...snaps].sort((a, b) => getBestPullScore(b) - getBestPullScore(a))[0],
    }))
    .filter((entry) => entry.best);
  const sameDifficultySessions = targetDifficulty
    ? previousSessionsBase.filter((entry) => entry.difficulty === targetDifficulty)
    : previousSessionsBase;
  const comparisonScope = sameDifficultySessions.length > 0 ? 'same difficulty' : 'mixed difficulty';
  const previousSessions = sameDifficultySessions.length > 0 ? sameDifficultySessions : previousSessionsBase;

  if (previousSessions.length === 0) {
    return {
      currentReportCode,
      summary: 'No previous night is stored for this boss yet.',
      progressDelta: 'This report is the first recorded night for this boss.',
      recommendation: 'Keep saving sessions so WoWtron can compare full raid nights, not just pulls.',
    };
  }

  const previousBestSession = previousSessions.sort((a, b) => getBestPullScore(b.best) - getBestPullScore(a.best))[0];
  const currentHp = currentBest.kill ? 0 : (currentBest.bossHP ?? 100);
  const previousHp = previousBestSession.best.kill ? 0 : (previousBestSession.best.bossHP ?? 100);
  const hpDelta = previousHp - currentHp;
  const summary =
    hpDelta >= 5 || (currentBest.kill && !previousBestSession.best.kill)
      ? 'This night is ahead of your previous recorded baseline on this boss.'
      : hpDelta <= -5
        ? 'This night is behind the previous baseline on this boss.'
        : 'This night is roughly tied with the previous baseline on this boss.';

  return {
    currentReportCode,
    previousReportCode: previousBestSession.reportCode,
    summary: `${summary} (${comparisonScope})`,
    progressDelta: `Best pull now: ${currentBest.kill ? 'kill' : `${currentHp}%`} vs previous best: ${previousBestSession.best.kill ? 'kill' : `${previousHp}%`} (${comparisonScope}).`,
    recommendation:
      hpDelta >= 5
        ? 'Stay on the current line and convert the cleaner version of the pull.'
        : hpDelta <= -5
          ? 'Do not assume the old plan still works. Compare assignments and phase stability before more pulls.'
          : 'Treat this as a stable wall and focus on the single repeated blocker before changing comp or strategy.',
  };
}

export function buildGuildBossKnowledge(snapshots: InsightSnapshot[]): GuildBossKnowledge | undefined {
  if (snapshots.length === 0) return undefined;
  const targetDifficulty = mostFrequent(snapshots.map((snapshot) => normalizeDifficulty(snapshot.difficulty)));
  const scopedSnapshots = targetDifficulty
    ? snapshots.filter((snapshot) => normalizeDifficulty(snapshot.difficulty) === targetDifficulty)
    : snapshots;
  const recurringBlockers = Array.from(new Set(
    scopedSnapshots
      .map((snapshot) => snapshot.commandView?.biggestBlocker?.summary || snapshot.briefInsights[0]?.summary || '')
      .filter(Boolean)
  )).slice(0, 3);
  const killSnapshots = scopedSnapshots.filter((snapshot) => snapshot.kill);
  const recurringPhase = mostFrequent(
    scopedSnapshots.map((snapshot) => snapshot.phaseReadiness?.find((phase) => phase.status !== 'ready')?.phase || '')
  );
  const recurringOwner = mostFrequent(
    scopedSnapshots.map((snapshot) => snapshot.commandView?.biggestBlocker?.owner || snapshot.briefInsights[0]?.owner || '')
  );

  return {
    summary: killSnapshots.length > 0
      ? `This guild already has ${killSnapshots.length} recorded kill(s) on this boss at ${targetDifficulty}. Use the successful pattern as the baseline, not the worst wipe.`
      : `No recorded kill yet at ${targetDifficulty}. The guild is still learning this boss through the same repeated wall.`,
    stableKillPattern: killSnapshots.length > 0
      ? killSnapshots[killSnapshots.length - 1].briefInsights[0]?.summary || 'A stable kill pattern exists in the recorded history.'
      : 'No stable kill pattern exists yet.',
    knownBlockers: recurringBlockers,
    knownFailurePhase: recurringPhase,
    knownOwnerPressure: recurringOwner,
  };
}

export function buildPlayerBossCoachingMemory(snapshots: InsightSnapshot[]): PlayerBossCoachingMemory[] {
  const byPlayer = new Map<string, { role: 'tank' | 'healer' | 'dps'; reliabilities: number[]; activeTimes: number[]; deaths: number[]; reports: Set<string> }>();

  snapshots.forEach((snapshot) => {
    (snapshot.players || []).forEach((player) => {
      const existing = byPlayer.get(player.name) || {
        role: player.role,
        reliabilities: [],
        activeTimes: [],
        deaths: [],
        reports: new Set<string>(),
      };
      existing.role = player.role;
      existing.reliabilities.push(player.reliabilityScore);
      existing.activeTimes.push(player.activeTime);
      existing.deaths.push(player.deaths);
      if (snapshot.reportCode) {
        existing.reports.add(snapshot.reportCode);
      }
      byPlayer.set(player.name, existing);
    });
  });

  return Array.from(byPlayer.entries())
    .map(([name, data]) => {
      const averageReliability = Math.round(data.reliabilities.reduce((sum, value) => sum + value, 0) / Math.max(1, data.reliabilities.length));
      const averageActiveTime = Math.round(data.activeTimes.reduce((sum, value) => sum + value, 0) / Math.max(1, data.activeTimes.length));
      const totalDeaths = data.deaths.reduce((sum, value) => sum + value, 0);
      const repeatedReason =
        averageActiveTime < 85
          ? 'Low active time keeps repeating on this boss.'
          : totalDeaths >= data.deaths.length
            ? 'Deaths are repeating across multiple nights on this boss.'
            : 'Reliability stays below the rest of the raid on this boss.';

      return {
        name,
        role: data.role,
        sessions: data.reports.size,
        repeatedReason,
        averageReliability,
      };
    })
    .sort((a, b) => a.averageReliability - b.averageReliability)
    .slice(0, 5);
}

export function buildSessionRecap(args: {
  sessionReview?: SessionReview;
  sessionCommandCenter?: SessionCommandCenter;
  nightComparison?: NightComparison;
  guildBossKnowledge?: GuildBossKnowledge;
  playerBossCoachingMemory?: PlayerBossCoachingMemory[];
  buildSignals?: SessionRecapBuildInput[];
}): SessionRecap | undefined {
  const {
    sessionReview,
    sessionCommandCenter,
    nightComparison,
    guildBossKnowledge,
    playerBossCoachingMemory = [],
    buildSignals = [],
  } = args;

  if (!sessionReview && !sessionCommandCenter && !nightComparison) return undefined;

  const keepDoing = [
    sessionCommandCenter?.headline,
    nightComparison?.summary?.includes('ahead') ? nightComparison.summary : '',
    guildBossKnowledge?.stableKillPattern && !guildBossKnowledge.stableKillPattern.includes('No stable')
      ? `Copy the stored kill pattern: ${guildBossKnowledge.stableKillPattern}`
      : '',
  ].filter(Boolean).slice(0, 3);

  const changeNow = [
    sessionCommandCenter?.tonightCalls?.[0] || '',
    sessionReview?.nextFocus || '',
    playerBossCoachingMemory[0]
      ? `${playerBossCoachingMemory[0].name}: ${playerBossCoachingMemory[0].repeatedReason}`
      : '',
    buildSignals.find((signal) => signal.significancePercent >= 5 && signal.confidence !== 'low')
      ? buildSignals.find((signal) => signal.significancePercent >= 5 && signal.confidence !== 'low')!.summary
      : '',
  ].filter(Boolean).slice(0, 3);

  const watchNext = [
    sessionCommandCenter?.escalationRisk || '',
    guildBossKnowledge?.knownFailurePhase ? `Watch ${guildBossKnowledge.knownFailurePhase} first.` : '',
    nightComparison?.recommendation || '',
  ].filter(Boolean).slice(0, 3);

  const oneSentenceSummary =
    sessionCommandCenter?.headline ||
    sessionReview?.summary ||
    nightComparison?.summary ||
    'No session recap was generated yet.';

  const nextNightStartCall =
    changeNow[0] ||
    sessionReview?.nextFocus ||
    guildBossKnowledge?.knownBlockers?.[0] ||
    'Start by stabilizing the first failing phase before changing comp or damage goals.';

  return {
    oneSentenceSummary,
    keepDoing,
    changeNow,
    watchNext,
    nextNightStartCall,
  };
}
