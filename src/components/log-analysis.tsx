'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Skull, AlertTriangle, CheckCircle, XCircle, Clock, Users, Zap,
  Loader2, Send, ChevronRight, TrendingUp,
  TrendingDown, Minus, Flame, Target, Shield, Heart, Activity,
  BarChart3, Timer, RefreshCw, ChevronDown, ChevronUp,
  Star, Swords, ShieldAlert, AlertCircle, Sparkles, Gauge,
  Trophy, Medal, Award, Crown, Flame as Fire, Info,
  ArrowRight, GitBranch, Clock4, ShieldCheck, Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getClassColor } from '@/lib/wow-data';
import { buildInsightSnapshot, exportInsightSnapshots, loadInsightSnapshots, loadInsightSnapshotsForReport, persistInsightSnapshot } from '@/lib/analysis/insight-snapshots';
import {
  buildBossMemory,
  buildGuildBossKnowledge,
  buildNightComparison,
  buildPlayerBossCoachingMemory,
  buildPlayerReliabilityTrends,
  buildSessionRecap,
  buildSessionCommandCenter,
  buildSessionReview,
} from '@/lib/analysis/progression-memory';
import { analyzeLogFight } from '@/lib/analysis/log-analysis-engine';
import {
  EMPTY_ASSIGNMENT_PLAN,
} from '@/lib/analysis/log-analysis-helpers';
import type {
  AssignmentAssessment,
  AssignmentPlan,
  AssignmentPlanOverview,
  BriefInsight,
  CommandDecision,
  InsightSnapshot,
  PhaseReadiness,
  PhaseSuccessCriterion,
} from '@/lib/analysis/log-insight-types';
import { Phase2Analysis } from './phase2-analysis';

// Types
interface ReportData {
  code: string;
  title: string;
  owner: string;
  zone: string;
  startTime: number;
  fights: {
    id: number;
    bossName: string;
    difficulty: string;
    duration: number;
    kill: boolean;
    bossHPPercent?: number;
  }[];
}

interface AnalysisResult {
  summary: {
    killPotential: boolean;
    whyWiped: string[];
    outcomeNarrativeLabel?: string;
    keyIssues: Issue[];
    fightEfficiency?: {
      actualTime: number;
      optimalTime: number;
      timeSaved: number;
      dpsLoss: number;
    };
  };
  deaths: {
    avoidable: AnalyzedDeath[];
    unavoidable: AnalyzedDeath[];
  };
  performance: {
    raidDPS: number;
    raidHPS: number;
    requiredDPS: number;
    dpsGap: number;
    lowPerformers: PerformanceIssue[];
  };
  players: PlayerStats[];
  consumables: {
    missingFlask: string[];
    missingFood: string[];
    missingPotion: string[];
    missingRune: string[];
    estimatedDPSLoss: number;
  };
  raidBuffs: RaidBuff[];
  cooldowns: {
    defensives: CooldownIssue[];
    raidCooldowns: CooldownIssue[];
  };
  talents: TalentUsage[];
  raidEfficiency?: {
    overall: number;
    dps: number;
    survival: number;
    mechanics: number;
    consumables: number;
    grade: string;
  };
  bossInsight?: {
    dpsCheckMet: boolean;
    healingIntensity: string;
    movementRequired: string;
    keyMechanics: { name: string; deaths: number; tip: string }[];
  };
  // NEW: Valuable insights
  deathCascade?: DeathCascadeAnalysis;
  causeChains?: string[];
  causeChainDetails?: {
    id: string;
    owner: string;
    phase: string;
    steps: {
      label: 'first_failure' | 'immediate_consequence' | 'failed_recovery' | 'wipe_conversion';
      text: string;
    }[];
  }[];
  cooldownGaps?: CooldownGapAnalysis[];
  burstWindows?: BurstWindowAnalysis[];
  nextPullActions?: NextPullAction[];
  pullDelta?: PullDelta;
  wipeCause?: {
    primary: 'mechanics' | 'throughput' | 'cooldown_gap' | 'mixed';
    details: string;
  };
  repeatedMistakes?: RepeatedMistake[];
  phaseCausality?: {
    phase: string;
    start: number;
    end: number;
    deaths: number;
    avoidableDeaths: number;
    dominantCause: 'mechanics' | 'throughput' | 'cooldown_gap' | 'stable';
  }[];
  phaseSuccessCriteria?: PhaseSuccessCriterion[];
  pullTrend?: {
    sampleSize: number;
    avgDeathsPrev: number;
    avgAvoidablePrev: number;
    avgDurationPrev: number;
    currentDeaths: number;
    currentAvoidableDeaths: number;
    currentDuration: number;
  };
  roleScores?: {
    tanks: number;
    healers: number;
    dps: number;
  };
  mechanicScores?: {
    mechanic: string;
    severity: 'critical' | 'warning';
    events: number;
    score: number;
  }[];
  regressionAlerts?: string[];
  bestPullChanges?: string[];
  categoryDelta?: {
    mechanics: number;
    cooldowns: number;
    throughput: number;
  };
  cooldownPlanner?: {
    at: number;
    phase: string;
    action: string;
    owner: string;
    reason: string;
  }[];
  assignmentAssessments?: AssignmentAssessment[];
  assignmentPlanOverview?: AssignmentPlanOverview;
  assignmentBreaks?: {
    owner: string;
    failure: string;
    count: number;
  }[];
  killProbability?: number;
  bossProgression?: {
    pullId: number;
    hpRemaining: number;
    duration: number;
    kill: boolean;
  }[];
  internalBenchmark?: {
    rank: number;
    total: number;
    percentile: number;
    scope: 'same_difficulty' | 'mixed_difficulty';
    difficulty?: string;
  };
  briefInsights?: BriefInsight[];
  deltaInsights?: BriefInsight[];
  playerCoaching?: BriefInsight[];
  phaseReadiness?: PhaseReadiness[];
  commandView?: CommandDecision;
}

interface NextPullAction {
  priority: 1 | 2 | 3;
  title: string;
  owner: string;
  reason: string;
}

interface PullDelta {
  comparedPullId: number;
  bossHPDelta: number;
  durationDelta: number;
  deathsDelta?: number;
  trend: 'better' | 'worse' | 'same';
  scope?: 'same_difficulty' | 'mixed_difficulty';
  comparedDifficulty?: string;
}

interface RepeatedMistake {
  player: string;
  ability: string;
  count: number;
}

// NEW: Death Cascade Analysis
interface DeathCascadeAnalysis {
  rootDeath: {
    player: string;
    role: string;
    ability: string;
    time: number;
    impact: 'critical' | 'high' | 'medium';
  };
  chainDeaths: {
    player: string;
    role: string;
    ability: string;
    time: number;
    causedByRoot: boolean;
  }[];
  timeToWipe: number;
  recoveryPossible: boolean;
  recommendation: string;
}

// NEW: Cooldown Gap Analysis
interface CooldownGapAnalysis {
  time: number;
  duration: number;
  damageTaken: number;
  availableCds: string[];
  severity: 'critical' | 'warning';
}

// NEW: Burst Window Analysis
interface BurstWindowAnalysis {
  name: string;
  startTime: number;
  duration: number;
  playersWithoutCDs: string[];
  efficiency: number;
}

interface PlayerStats {
  name: string;
  class: string;
  spec: string;
  role: 'tank' | 'healer' | 'dps';
  dps: number;
  hps: number;
  rankPercent: number;
  itemLevel: number;
  flaskUsed: boolean;
  foodUsed: boolean;
  potionUsed: boolean;
  runeUsed: boolean;
  activeTime: number;
  deaths: number;
  talents?: string[];
  avoidableDamageTaken?: number;
  dtps?: number;
  reliabilityScore?: number;
  improvementFocus?: string;
  region?: string;
  server?: string;
}

interface TalentUsage {
  playerId: string;
  playerName: string;
  talentId: number;
  talentName: string;
  usageRate: number;
  recommendation: string;
}

interface Issue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
  player?: string;
  suggestion: string;
}

interface AnalyzedDeath {
  player: string;
  ability: string;
  time: number;
  avoidable: boolean;
  phase: string;
  tip: string;
  impact: string;
}

interface PerformanceIssue {
  player: string;
  class: string;
  expectedDPS: number;
  actualDPS: number;
  gap: number;
  reason: string;
}

interface RaidBuff {
  name: string;
  present: boolean;
  source?: string;
  missingImpact: string;
}

interface CooldownIssue {
  player: string;
  ability: string;
  expected: number;
  actual: number;
}

interface BuildSignificanceInsight {
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

interface BuildSignificanceResponse {
  bossName: string;
  generatedAt: string;
  datasetSummary: {
    totalRecords: number;
    killRecords: number;
    talentCoverageRecords: number;
    namedTalentCoverageRecords?: number;
    supportedSpecs: number;
    requestedDifficulty?: string;
    scope: 'same_difficulty' | 'cross_difficulty_fallback';
    comparedDifficulties: string[];
    summary: string;
  };
  insights: BuildSignificanceInsight[];
}

interface FightData {
  id: number;
  bossName: string;
  difficulty: string;
  duration: number;
  kill: boolean;
  bossHP?: number;
}

// Format helpers
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
};

// Get rank color
const getRankColor = (percentile: number): string => {
  if (percentile >= 100) return 'text-pink-400';
  if (percentile >= 95) return 'text-amber-400';
  if (percentile >= 75) return 'text-purple-400';
  if (percentile >= 50) return 'text-blue-400';
  return 'text-gray-400';
};

const getRankBg = (percentile: number): string => {
  if (percentile >= 100) return 'bg-pink-500/20 border-pink-500/40';
  if (percentile >= 95) return 'bg-amber-500/20 border-amber-500/40';
  if (percentile >= 75) return 'bg-purple-500/20 border-purple-500/40';
  if (percentile >= 50) return 'bg-blue-500/20 border-blue-500/40';
  return 'bg-gray-500/20 border-gray-500/40';
};

const getGradeBg = (grade: string): string => {
  switch (grade) {
    case 'S': return 'from-pink-600/20 to-pink-500/10 border-pink-500/50';
    case 'A': return 'from-amber-600/20 to-amber-500/10 border-amber-500/50';
    case 'B': return 'from-purple-600/20 to-purple-500/10 border-purple-500/50';
    case 'C': return 'from-blue-600/20 to-blue-500/10 border-blue-500/50';
    case 'D': return 'from-orange-600/20 to-orange-500/10 border-orange-500/50';
    case 'F': return 'from-red-600/20 to-red-500/10 border-red-500/50';
    default: return 'from-gray-600/20 to-gray-500/10 border-gray-500/50';
  }
};

const getReadinessBadgeClass = (status: 'ready' | 'close' | 'not_ready'): string => {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'close':
      return 'bg-amber-500/20 text-amber-300';
    case 'not_ready':
      return 'bg-red-500/20 text-red-300';
    default:
      return 'bg-dark-700 text-tron-silver-300';
  }
};

const getPlanStatusBadgeClass = (status: 'missing' | 'partial' | 'ready'): string => {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'partial':
      return 'bg-amber-500/20 text-amber-300';
    case 'missing':
      return 'bg-red-500/20 text-red-300';
    default:
      return 'bg-dark-700 text-tron-silver-300';
  }
};

const getCoverageBadgeClass = (coverage: 'weak' | 'mixed' | 'strong'): string => {
  switch (coverage) {
    case 'strong':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'mixed':
      return 'bg-amber-500/20 text-amber-300';
    case 'weak':
      return 'bg-red-500/20 text-red-300';
    default:
      return 'bg-dark-700 text-tron-silver-300';
  }
};

// Main Component
export default function LogAnalysis() {
  const [logUrl, setLogUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedFight, setSelectedFight] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fightData, setFightData] = useState<FightData | null>(null);
  const [currentFight, setCurrentFight] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [assignmentPlan, setAssignmentPlan] = useState<AssignmentPlan>(EMPTY_ASSIGNMENT_PLAN);
  const [savedSnapshots, setSavedSnapshots] = useState<InsightSnapshot[]>([]);
  const [buildSignificance, setBuildSignificance] = useState<BuildSignificanceResponse | null>(null);
  const [isLoadingBuildSignificance, setIsLoadingBuildSignificance] = useState(false);
  const historicalFightsRef = useRef<any[]>([]);
  const persistedRunSignatureRef = useRef<string>('');

  const generateAnalysis = useCallback((fight: any, historicalFights: any[] = [], assignmentPlanInput: AssignmentPlan = EMPTY_ASSIGNMENT_PLAN): AnalysisResult => {
    return analyzeLogFight({
      fight,
      historicalFights,
      assignmentPlanInput,
      reportFights: report?.fights || [],
    });
  }, [report?.fights]);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    deathCascade: true,
    cooldownGaps: true,
    players: false,
    deaths: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (!currentFight?.bossName) {
      setAssignmentPlan(EMPTY_ASSIGNMENT_PLAN);
      setSavedSnapshots([]);
      return;
    }

    const storageKey = `wowtron:assignment-plan:${currentFight.bossName.toLowerCase()}`;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setAssignmentPlan(EMPTY_ASSIGNMENT_PLAN);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<AssignmentPlan>;
      setAssignmentPlan({
        interrupts: parsed.interrupts || '',
        soaks: parsed.soaks || '',
        dispels: parsed.dispels || '',
        raidCooldowns: parsed.raidCooldowns || '',
        tankAssignments: parsed.tankAssignments || '',
        notes: parsed.notes || '',
      });
    } catch {
      setAssignmentPlan(EMPTY_ASSIGNMENT_PLAN);
    }
    setSavedSnapshots(loadInsightSnapshots(currentFight.bossName));
  }, [currentFight?.bossName]);

  useEffect(() => {
    if (!currentFight?.bossName) return;
    const storageKey = `wowtron:assignment-plan:${currentFight.bossName.toLowerCase()}`;
    window.localStorage.setItem(storageKey, JSON.stringify(assignmentPlan));
    setAnalysis(generateAnalysis(currentFight, historicalFightsRef.current, assignmentPlan));
  }, [assignmentPlan, currentFight, generateAnalysis]);

  useEffect(() => {
    if (!analysis || !fightData) return;
    const snapshot = buildInsightSnapshot(fightData, analysis, report?.code);
    persistInsightSnapshot(snapshot);
    setSavedSnapshots(loadInsightSnapshots(fightData.bossName));

    if (!report?.code || !currentFight) return;

    const signature = [
      report.code,
      fightData.id,
      analysis.commandView?.biggestBlocker?.summary || '',
      analysis.commandView?.mostLikelyNextWipe?.summary || '',
      (analysis.briefInsights || []).slice(0, 3).map((insight) => insight.summary).join('|'),
      analysis.assignmentPlanOverview?.status || '',
      assignmentPlan.interrupts,
      assignmentPlan.soaks,
      assignmentPlan.dispels,
      assignmentPlan.raidCooldowns,
      assignmentPlan.tankAssignments,
      assignmentPlan.notes,
    ].join('::');

    if (persistedRunSignatureRef.current === signature) return;
    persistedRunSignatureRef.current = signature;

    void fetch('/api/analyzer-runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportCode: report.code,
        fight: currentFight,
        analysis,
        snapshot,
        source: 'client_analysis',
      }),
    }).catch(() => undefined);
  }, [
    analysis,
    assignmentPlan.dispels,
    assignmentPlan.interrupts,
    assignmentPlan.notes,
    assignmentPlan.raidCooldowns,
    assignmentPlan.soaks,
    assignmentPlan.tankAssignments,
    currentFight,
    fightData,
    report?.code,
  ]);

  const playersByRole = useMemo(() => {
    if (!analysis?.players) return { tanks: [], healers: [], dps: [] };
    return {
      tanks: analysis.players.filter(p => p.role === 'tank').sort((a, b) => b.dps - a.dps),
      healers: analysis.players.filter(p => p.role === 'healer').sort((a, b) => b.hps - a.hps),
      dps: analysis.players.filter(p => p.role === 'dps').sort((a, b) => b.dps - a.dps)
    };
  }, [analysis?.players]);

  const recentSnapshots = useMemo(
    () => savedSnapshots.filter((snapshot) => snapshot.fightId !== fightData?.id).slice(0, 5),
    [savedSnapshots, fightData?.id]
  );
  const sessionSnapshots = useMemo(
    () => {
      const snapshotCount = savedSnapshots.length;
      void snapshotCount;
      return report?.code && fightData?.bossName ? loadInsightSnapshotsForReport(report.code, fightData.bossName) : [];
    },
    [report?.code, fightData?.bossName, savedSnapshots.length]
  );
  const sessionReview = useMemo(
    () => buildSessionReview(sessionSnapshots),
    [sessionSnapshots]
  );
  const allBossSnapshots = useMemo(
    () => {
      const snapshotCount = savedSnapshots.length;
      void snapshotCount;
      return fightData?.bossName ? loadInsightSnapshots(fightData.bossName) : [];
    },
    [fightData?.bossName, savedSnapshots.length]
  );
  const bossMemory = useMemo(
    () => buildBossMemory(allBossSnapshots),
    [allBossSnapshots]
  );
  const reliabilityTrends = useMemo(
    () => buildPlayerReliabilityTrends(sessionSnapshots),
    [sessionSnapshots]
  );
  const sessionCommandCenter = useMemo(
    () => buildSessionCommandCenter(sessionReview, bossMemory, reliabilityTrends),
    [sessionReview, bossMemory, reliabilityTrends]
  );
  const nightComparison = useMemo(
    () => buildNightComparison(sessionSnapshots, allBossSnapshots, report?.code),
    [sessionSnapshots, allBossSnapshots, report?.code]
  );
  const guildBossKnowledge = useMemo(
    () => buildGuildBossKnowledge(allBossSnapshots),
    [allBossSnapshots]
  );
  const playerBossCoachingMemory = useMemo(
    () => buildPlayerBossCoachingMemory(allBossSnapshots),
    [allBossSnapshots]
  );
  const sessionRecap = useMemo(
    () =>
      buildSessionRecap({
        sessionReview,
        sessionCommandCenter,
        nightComparison,
        guildBossKnowledge,
        playerBossCoachingMemory,
        buildSignals: (buildSignificance?.insights || []).map((insight) => ({
          playerName: insight.playerName,
          summary: insight.summary,
          significancePercent: insight.significancePercent,
          confidence: insight.confidence,
        })),
      }),
    [sessionReview, sessionCommandCenter, nightComparison, guildBossKnowledge, playerBossCoachingMemory, buildSignificance]
  );

  useEffect(() => {
    if (!analysis || !fightData?.bossName) {
      setBuildSignificance(null);
      setIsLoadingBuildSignificance(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingBuildSignificance(true);

    fetch('/api/build-significance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        bossName: fightData.bossName,
        difficulty: fightData.difficulty,
        players: (analysis.players || []).map((player) => ({
          name: player.name,
          role: player.role,
          className: player.class,
          spec: player.spec,
          talents: player.talents || [],
          rankPercent: player.rankPercent,
          activeTime: player.activeTime,
          reliabilityScore: player.reliabilityScore || 0,
        })),
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load build significance.');
        }
        setBuildSignificance(data as BuildSignificanceResponse);
      })
      .catch((error: any) => {
        if (error?.name === 'AbortError') return;
        setBuildSignificance(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingBuildSignificance(false);
        }
      });

    return () => controller.abort();
  }, [analysis, fightData?.bossName, fightData?.difficulty]);

  const handleExportSnapshots = useCallback(() => {
    if (!fightData?.bossName) return;
    const payload = exportInsightSnapshots(fightData.bossName);
    if (payload.count === 0) {
      toast({ title: 'No snapshots', description: 'There are no saved snapshots to export for this boss yet.' });
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeBossName = fightData.bossName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    anchor.href = url;
    anchor.download = `wowtron-snapshots-${safeBossName}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);

    toast({ title: 'Snapshots exported', description: `${payload.count} snapshot(s) exported for ${fightData.bossName}.` });
  }, [fightData?.bossName]);

  const handleLoadReport = async () => {
    if (!logUrl.trim()) return;
    setIsLoading(true);
    try {
      const code = logUrl.match(/warcraftlogs\.com\/reports\/([a-zA-Z0-9]+)/)?.[1] || logUrl;
      const response = await fetch(`/api/wcl?action=report&code=${code}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setReport(data.report);
      setSelectedFight(null);
      setAnalysis(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load report', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeFight = async (fightId: number) => {
    if (!report) return;
    setIsLoading(true);
    setSelectedFight(fightId);
    try {
      const [currentFightRes, ...previousFightResponses] = await Promise.all([
        fetch(`/api/wcl?action=fight&code=${report.code}&fightId=${fightId}`),
        ...((report.fights || [])
          .filter((f) => f.id !== fightId)
          .sort((a, b) => b.id - a.id)
          .slice(0, 8)
          .map((f) => fetch(`/api/wcl?action=fight&code=${report.code}&fightId=${f.id}`))),
      ]);

      const data = await currentFightRes.json();
      if (data.error) throw new Error(data.error);

      const previousFightsPayload = await Promise.all(
        previousFightResponses.map(async (res) => {
          try {
            const json = await res.json();
            return json?.fight || null;
          } catch {
            return null;
          }
        })
      );
      const historicalFights = previousFightsPayload.filter(Boolean);
      historicalFightsRef.current = historicalFights;

      const fight = data.fight;
      setFightData({
        id: fight.id,
        bossName: fight.bossName,
        difficulty: fight.difficulty,
        duration: fight.duration,
        kill: fight.kill,
        bossHP: fight.bossHPPercent,
      });
      setCurrentFight(fight);
      setAnalysis(generateAnalysis(fight, historicalFights, assignmentPlan));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to analyze fight', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatBriefInsights = (insights: BriefInsight[] = []) =>
    insights
      .slice(0, 3)
      .map((insight, index) =>
        `${index + 1}. [${insight.kind.toUpperCase()}|${insight.severity.toUpperCase()}|${insight.confidence.toUpperCase()}] ${insight.summary}\n` +
        `   Owner: ${insight.owner} | Phase: ${insight.phase}\n` +
        `   Evidence: ${insight.evidence}\n` +
        `   Action: ${insight.recommendation}`
      )
      .join('\n');

  const formatBulletList = (items: string[] = [], fallback: string) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : fallback;

  const formatInsightList = (insights: BriefInsight[] = [], fallback: string) =>
    insights.length > 0
      ? insights
          .slice(0, 3)
          .map((insight) => `- ${insight.summary} (${insight.owner}, ${insight.phase})`)
          .join('\n')
      : fallback;

  const copyNormalizedRaidBrief = () => {
    if (!analysis || !fightData) return;
    const roleScores = analysis.roleScores
      ? `Tanks ${analysis.roleScores.tanks} | Healers ${analysis.roleScores.healers} | DPS ${analysis.roleScores.dps}`
      : 'N/A';
    const nextPullPlan = (analysis.nextPullActions || [])
      .slice(0, 3)
      .map((action) => `- P${action.priority}: ${action.title} (${action.owner})`)
      .join('\n');
    const phaseChecklist = (analysis.phaseCausality || [])
      .filter((phase) => phase.dominantCause !== 'stable')
      .map((phase) => `- ${phase.phase}: ${phase.dominantCause} (${phase.deaths} deaths, ${phase.avoidableDeaths} avoidable)`)
      .join('\n');
    const assignmentCoverage = (analysis.assignmentAssessments || [])
      .filter((assessment) => assessment.status !== 'covered')
      .slice(0, 3)
      .map((assessment) => `- ${assessment.mechanic}: ${assessment.status} (${assessment.owner}, ${assessment.phase})`)
      .join('\n');
    const phaseCriteria = (analysis.phaseSuccessCriteria || [])
      .slice(0, 3)
      .map((phase) => `- ${phase.phase}: ${phase.status} | ${phase.summary}`)
      .join('\n');
    const phaseReadiness = (analysis.phaseReadiness || [])
      .slice(0, 3)
      .map((phase) => `- ${phase.phase}: ${phase.status} | ${phase.blocker}`)
      .join('\n');
    const buildReview = (buildSignificance?.insights || [])
      .slice(0, 2)
      .map((insight) => `- ${insight.playerName}: ${insight.summary}`)
      .join('\n');
    const planVsExecution = analysis.assignmentPlanOverview
      ? `- Plan status: ${analysis.assignmentPlanOverview.status}\n- Coverage: ${analysis.assignmentPlanOverview.coverage}\n- ${analysis.assignmentPlanOverview.summary}\n- ${analysis.assignmentPlanOverview.recommendation}`
      : '- No plan-vs-execution summary available.';
    const brief = [
      `Raid Brief - ${fightData.bossName}`,
      `Status: ${fightData.kill ? 'KILL' : `WIPE @ ${fightData.bossHP}%`}`,
      `Root cause: ${analysis.wipeCause?.primary || 'mixed'}`,
      `Role scores: ${roleScores}`,
      `Kill probability: ${analysis.killProbability ?? 'N/A'}%`,
      `${analysis.commandView?.biggestBlockerLabel || 'Biggest blocker'}: ${analysis.commandView?.biggestBlocker?.summary || 'No clear blocker.'}`,
      `${analysis.commandView?.mostLikelyNextWipeLabel || 'Most likely next wipe'}: ${analysis.commandView?.mostLikelyNextWipe?.summary || 'No repeat wipe point flagged.'}`,
      '',
      'Top 3 actions:',
      formatBriefInsights(analysis.briefInsights) || '1. Clean up avoidable deaths before adding more throughput pressure.',
      '',
      `${analysis.commandView?.nextActionsLabel || 'Next pull plan'}:`,
      nextPullPlan || '- No explicit next-pull actions were generated.',
      '',
      'Plan vs execution:',
      planVsExecution,
      '',
      'Phase readiness:',
      phaseReadiness || '- No phase readiness readout available.',
      '',
      'Phase checklist:',
      phaseChecklist || '- No dominant failure phase detected.',
      '',
      'What changed from best pull:',
      formatInsightList(analysis.deltaInsights, '- No major delta versus the comparison pull.'),
      '',
      'Player coaching:',
      formatInsightList(analysis.playerCoaching, '- No focused coaching targets detected.'),
      '',
      'Build review:',
      buildReview || '- No boss-specific build review was generated yet.',
      '',
      'Assignment coverage:',
      assignmentCoverage || '- No assignment failures detected.',
      '',
      'Phase success criteria:',
      phaseCriteria || '- No phase criteria available for this pull.',
      '',
      'Cause chain:',
      formatBulletList(analysis.causeChains, '- No explicit cause chain was built for this pull.'),
      '',
      'Raid notes:',
      assignmentPlan.notes.trim() || '- No extra raid notes saved for this boss.',
    ].join('\n');

    navigator.clipboard.writeText(brief);
    toast({ title: 'Brief copied', description: 'Pull brief is ready to share.' });
  };

  const generateAnalysisSummaryText = (analysis: AnalysisResult, fight: FightData) => {
    const rootDeath = analysis.deathCascade
      ? `${analysis.deathCascade.rootDeath.player} at ${formatTime(analysis.deathCascade.rootDeath.time)} from ${analysis.deathCascade.rootDeath.ability}`
      : 'No dominant root death identified.';
    const nextPullPlan = (analysis.nextPullActions || [])
      .slice(0, 3)
      .map((action) => `- ${action.title} (${action.owner})`)
      .join('\n');
    const buildReview = (buildSignificance?.insights || [])
      .slice(0, 2)
      .map((insight) => `- ${insight.playerName}: ${insight.summary}`)
      .join('\n');

    return [
      `${fight.kill ? 'Kill Review' : 'Wipe Summary'} - ${fight.bossName}`,
      `Grade: ${analysis.raidEfficiency?.grade || 'N/A'} (${analysis.raidEfficiency?.overall ?? 'N/A'}%)`,
      `Root death: ${rootDeath}`,
      `Headline: ${analysis.commandView?.headline || (fight.kill ? 'Review what was still unstable on the kill.' : 'Find the main failure that needs to change.')}`,
      `${analysis.commandView?.biggestBlockerLabel || 'Biggest blocker'}: ${analysis.commandView?.biggestBlocker?.summary || 'No clear blocker.'}`,
      `${analysis.commandView?.mostLikelyNextWipeLabel || 'Most likely next wipe'}: ${analysis.commandView?.mostLikelyNextWipe?.summary || 'No repeat wipe point flagged.'}`,
      '',
      `${analysis.commandView?.whyLabel || 'Why this pull failed'}:`,
      formatBulletList(analysis.summary.whyWiped, fight.kill ? '- No major instability was detected on the kill.' : '- No clear wipe driver detected.'),
      '',
      `${analysis.commandView?.nextActionsLabel || 'Next pull plan'}:`,
      nextPullPlan || '- No explicit next-pull actions were generated.',
      '',
      'Highest-priority brief insights:',
      formatInsightList(analysis.briefInsights, '- No prioritized brief insights available.'),
      '',
      'Plan vs execution:',
      analysis.assignmentPlanOverview
        ? `- ${analysis.assignmentPlanOverview.summary}\n- ${analysis.assignmentPlanOverview.recommendation}`
        : '- No plan-vs-execution summary available.',
      '',
      'Phase readiness:',
      (analysis.phaseReadiness || [])
        .slice(0, 3)
        .map((phase) => `- ${phase.phase}: ${phase.status} | ${phase.blocker}`)
        .join('\n') || '- No phase readiness readout available.',
      '',
      'What changed from the comparison pull:',
      formatInsightList(analysis.deltaInsights, '- No major delta versus the comparison pull.'),
      '',
      'Player coaching:',
      formatInsightList(analysis.playerCoaching, '- No focused coaching targets detected.'),
      '',
      'Build review:',
      buildReview || '- No boss-specific build review was generated yet.',
      '',
      'Assignment coverage:',
      (analysis.assignmentAssessments || [])
        .filter((assessment) => assessment.status !== 'covered')
        .slice(0, 3)
        .map((assessment) => `- ${assessment.mechanic}: ${assessment.status} (${assessment.owner}, ${assessment.phase})`)
        .join('\n') || '- No assignment failures detected.',
      '',
      'Phase success criteria:',
      (analysis.phaseSuccessCriteria || [])
        .slice(0, 3)
        .map((phase) => `- ${phase.phase}: ${phase.status} | ${phase.summary}`)
        .join('\n') || '- No phase criteria available for this pull.',
      '',
      'Cause chain:',
      formatBulletList(analysis.causeChains, '- No explicit cause chain was built for this pull.'),
      '',
      'Raid notes:',
      assignmentPlan.notes.trim() || '- No extra raid notes saved for this boss.',
      '',
      'Generated by WoWtron',
    ].join('\n');
  };

  const copyAnalysisSummary = () => {
    if (!analysis || !fightData) return;
    navigator.clipboard.writeText(generateAnalysisSummaryText(analysis, fightData));
    toast({ title: 'Summary copied', description: 'Short pull summary is ready to share.' });
  };

  const copySessionCommandBrief = () => {
    if (!fightData || !sessionCommandCenter) return;

    const payload = [
      `Session Command Brief - ${fightData.bossName}`,
      `Verdict: ${sessionCommandCenter.verdict}`,
      `Headline: ${sessionCommandCenter.headline}`,
      `Rationale: ${sessionCommandCenter.rationale}`,
      '',
      'Tonight calls:',
      ...sessionCommandCenter.tonightCalls.map((call, index) => `${index + 1}. ${call}`),
      '',
      'Coaching targets:',
      ...(sessionCommandCenter.coachingTargets.length > 0
        ? sessionCommandCenter.coachingTargets.map((target) => `- ${target.name} (${target.role}): ${target.reason}`)
        : ['- No urgent coaching target recorded.']),
      '',
      'Night comparison:',
      nightComparison
        ? `- ${nightComparison.summary}\n- ${nightComparison.progressDelta}\n- ${nightComparison.recommendation}`
        : '- No cross-night baseline stored yet.',
      '',
      'Guild boss knowledge:',
      guildBossKnowledge
        ? `- ${guildBossKnowledge.summary}\n- Known blockers: ${guildBossKnowledge.knownBlockers.join(', ') || 'None yet.'}`
        : '- No stored guild memory for this boss yet.',
      '',
      'Build review:',
      ...(buildSignificance?.insights?.length
        ? buildSignificance.insights.slice(0, 2).map((insight) => `- ${insight.playerName}: ${insight.summary}`)
        : ['- No boss-specific build review available yet.']),
      '',
      `Escalation risk: ${sessionCommandCenter.escalationRisk}`,
      '',
      'Generated by WoWtron',
    ].join('\n');

    navigator.clipboard.writeText(payload);
    toast({ title: 'Session brief copied', description: 'Night-level command brief is ready to share.' });
  };

  const copyNightRecap = () => {
    if (!fightData || !sessionRecap) return;

    const payload = [
      `Night Recap - ${fightData.bossName}`,
      sessionRecap.oneSentenceSummary,
      '',
      'Keep doing:',
      ...(sessionRecap.keepDoing.length > 0 ? sessionRecap.keepDoing.map((item) => `- ${item}`) : ['- No stable keep signal yet.']),
      '',
      'Change now:',
      ...(sessionRecap.changeNow.length > 0 ? sessionRecap.changeNow.map((item) => `- ${item}`) : ['- No immediate change was flagged.']),
      '',
      'Watch next:',
      ...(sessionRecap.watchNext.length > 0 ? sessionRecap.watchNext.map((item) => `- ${item}`) : ['- No watch item recorded yet.']),
      '',
      `Next night start call: ${sessionRecap.nextNightStartCall}`,
      '',
      'Generated by WoWtron',
    ].join('\n');

    navigator.clipboard.writeText(payload);
    toast({ title: 'Night recap copied', description: 'Officer-style night recap is ready to share.' });
  };

  return (
    <div className="w-full space-y-5">
      {/* Input Bar */}
      <div className="rounded-2xl border border-dark-700 bg-gradient-to-br from-dark-800/80 to-dark-900/80 p-4 md:p-5">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-tron-silver-200">Warcraft Logs Analyzer</h2>
          <p className="text-sm text-tron-silver-400">Paste a report URL or code to turn Warcraft Logs into a raid-ready diagnosis.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="https://warcraftlogs.com/reports/XXXXXX"
            value={logUrl}
            onChange={(e) => setLogUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadReport()}
            className="flex-1 bg-dark-900 border-dark-600 text-tron-silver-200 placeholder:text-tron-silver-500 h-11 text-base"
          />
          <Button
            onClick={handleLoadReport}
            disabled={isLoading || !logUrl.trim()}
            className="bg-wow-gold hover:bg-amber-400 text-dark-900 font-bold h-11 px-8 text-base"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Analyze'}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 bg-dark-800/50 rounded-lg">
          <Loader2 className="h-8 w-8 text-wow-gold animate-spin mr-3" />
          <span className="text-tron-silver-400 text-lg">Analyzing...</span>
        </div>
      )}

      {/* Report Fights */}
      {report && !selectedFight && !isLoading && (
        <div className="bg-dark-800/50 rounded-2xl p-4 border border-dark-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-tron-silver-200">{report.title}</h2>
              <p className="text-sm text-tron-silver-400">{report.zone} • {report.fights.length} fights</p>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {report.fights.map((fight) => (
              <div
                key={fight.id}
                onClick={() => handleAnalyzeFight(fight.id)}
                className="p-3 rounded-xl bg-dark-700/40 border border-dark-600 hover:border-wow-gold hover:bg-dark-700/70 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {fight.kill ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-tron-silver-200 truncate">{fight.bossName.split(' ')[0]}</span>
                </div>
                <div className="text-xs text-tron-silver-400">
                  {fight.difficulty.charAt(0)} • {formatTime(fight.duration)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && fightData && !isLoading && (
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4">
            {/* Boss Info + Grade */}
            <div className="col-span-12 lg:col-span-3 flex items-center gap-4 p-4 bg-dark-800/50 rounded-lg border border-dark-700">
              <div className={`w-20 h-20 rounded-lg bg-gradient-to-br ${getGradeBg(analysis.raidEfficiency?.grade || 'C')} border flex flex-col items-center justify-center`}>
                <span className="text-4xl font-bold">{analysis.raidEfficiency?.grade || '?'}</span>
                <span className="text-xs opacity-70">{analysis.raidEfficiency?.overall}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-wow-gold truncate">{fightData.bossName}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-tron-silver-400 mt-1">
                  <span>{fightData.difficulty}</span>
                  <span>•</span>
                  <span>{formatTime(fightData.duration)}</span>
                  {fightData.kill ? (
                    <Badge className="bg-green-500/20 text-green-400 text-xs ml-1">KILL</Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 text-xs ml-1">WIPE @ {fightData.bossHP}%</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={copyNormalizedRaidBrief} className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Brief
                  </Button>
                  {sessionCommandCenter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copySessionCommandBrief}
                      className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold"
                    >
                      <Clock4 className="h-3.5 w-3.5 mr-1.5" />
                      Session Brief
                    </Button>
                  )}
                  {sessionRecap && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyNightRecap}
                      className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Night Recap
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAnalysisSummary}
                    className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Summary
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedFight(null); setAnalysis(null); }} className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> New
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold"
                  >
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> {showAdvanced ? 'Simple View' : 'Advanced View'}
                  </Button>
                </div>
            </div>
          </div>
          </div>

          {showAdvanced && (
          <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-fuchsia-400" /> Edit Assignment Plan
                </h3>
                <p className="text-sm text-tron-silver-400 mt-1">
                  Define the intended plan for this boss so WoWtron can compare execution versus assignment.
                </p>
              </div>
              <Badge className="bg-dark-700 text-tron-silver-300 text-xs">
                Saved per boss
              </Badge>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-tron-silver-500">Interrupts</p>
                <Textarea
                  value={assignmentPlan.interrupts}
                  onChange={(e) => setAssignmentPlan((prev) => ({ ...prev, interrupts: e.target.value }))}
                  placeholder={`Void Scream: Kicker1, Kicker2, Kicker3`}
                  className="min-h-24 bg-dark-900 border-dark-600 text-tron-silver-200 placeholder:text-tron-silver-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-tron-silver-500">Soaks</p>
                <Textarea
                  value={assignmentPlan.soaks}
                  onChange={(e) => setAssignmentPlan((prev) => ({ ...prev, soaks: e.target.value }))}
                  placeholder={`Orb 1: PlayerA, PlayerB`}
                  className="min-h-24 bg-dark-900 border-dark-600 text-tron-silver-200 placeholder:text-tron-silver-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-tron-silver-500">Dispels</p>
                <Textarea
                  value={assignmentPlan.dispels}
                  onChange={(e) => setAssignmentPlan((prev) => ({ ...prev, dispels: e.target.value }))}
                  placeholder={`Debuff X: Healer1, Healer2`}
                  className="min-h-24 bg-dark-900 border-dark-600 text-tron-silver-200 placeholder:text-tron-silver-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-tron-silver-500">Raid Cooldowns</p>
                <Textarea
                  value={assignmentPlan.raidCooldowns}
                  onChange={(e) => setAssignmentPlan((prev) => ({ ...prev, raidCooldowns: e.target.value }))}
                  placeholder={`Shadow Feast: Barrier - PriestName`}
                  className="min-h-24 bg-dark-900 border-dark-600 text-tron-silver-200 placeholder:text-tron-silver-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-tron-silver-500">Tank Swaps / Externals</p>
                <Textarea
                  value={assignmentPlan.tankAssignments}
                  onChange={(e) => setAssignmentPlan((prev) => ({ ...prev, tankAssignments: e.target.value }))}
                  placeholder={`2 stacks swap. External on second combo.`}
                  className="min-h-24 bg-dark-900 border-dark-600 text-tron-silver-200 placeholder:text-tron-silver-500"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-tron-silver-500">Raid Notes</p>
                <Textarea
                  value={assignmentPlan.notes}
                  onChange={(e) => setAssignmentPlan((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={`Extra context for this boss or comp.`}
                  className="min-h-24 bg-dark-900 border-dark-600 text-tron-silver-200 placeholder:text-tron-silver-500"
                />
              </div>
            </div>
          </div>
          )}

          {/* Stats Grid */}
          <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              <StatCard icon={<Swords className="h-4 w-4" />} label="Raid DPS" value={formatNumber(analysis.performance.raidDPS)} helpText="How much damage the whole raid is doing each second. Bigger is better if people are still alive." />
              <StatCard icon={<Heart className="h-4 w-4" />} label="Raid HPS" value={formatNumber(analysis.performance.raidHPS)} helpText="How much healing the whole raid is doing each second. Bigger helps only if it keeps people alive at the right time." />
              <StatCard icon={<Skull className="h-4 w-4" />} label="Deaths" value={String(analysis.deaths.avoidable.length + analysis.deaths.unavoidable.length)} valueClass="text-red-400" />
              <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Avoidable" value={String(analysis.deaths.avoidable.length)} valueClass="text-amber-400" helpText="Deaths or hits that usually should not happen. Lower is better." />
              <StatCard icon={<TrendingDown className="h-4 w-4" />} label="DPS Lost" value={formatNumber(analysis.consumables.estimatedDPSLoss)} valueClass="text-orange-400" />
              <StatCard icon={<Users className="h-4 w-4" />} label="Players" value={String(analysis.players.length)} />
              <StatCard
                icon={<Gauge className="h-4 w-4" />}
                label="Avg Reliability"
                value={String(Math.floor(analysis.players.reduce((s, p) => s + (p.reliabilityScore || 0), 0) / Math.max(1, analysis.players.length)))}
                valueClass="text-emerald-400"
                helpText="A simple trust score. Higher means the raid was more stable and made fewer costly mistakes."
              />
            </div>
          </div>

          {(analysis.commandView?.biggestBlocker || analysis.commandView?.mostLikelyNextWipe || (analysis.nextPullActions && analysis.nextPullActions.length > 0)) && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {analysis.commandView?.headline ? (
                <div className="xl:col-span-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Command Read</p>
                  <p className="mt-2 text-sm font-medium text-tron-silver-200">{analysis.commandView.headline}</p>
                </div>
              ) : null}
              <div className="bg-dark-800/50 rounded-lg p-4 border border-red-500/20">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-red-400" /> {analysis.commandView?.biggestBlockerLabel || 'Biggest Blocker'}
                </h3>
                <p className="text-sm font-semibold text-tron-silver-200">
                  {analysis.commandView?.biggestBlocker?.summary || 'No clear blocker detected.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-tron-silver-400">
                  <span>Owner: <span className="text-tron-silver-200">{analysis.commandView?.biggestBlocker?.owner || 'Raid'}</span></span>
                  <span>Phase: <span className="text-tron-silver-200">{analysis.commandView?.biggestBlocker?.phase || 'Full Fight'}</span></span>
                </div>
                <p className="text-xs text-tron-silver-400 mt-2">
                  {analysis.commandView?.biggestBlocker?.reason || 'No blocker reason recorded.'}
                </p>
              </div>

              <div className="bg-dark-800/50 rounded-lg p-4 border border-amber-500/20">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                  <ShieldAlert className="h-5 w-5 text-amber-400" /> {analysis.commandView?.mostLikelyNextWipeLabel || 'Most Likely Next Wipe'}
                </h3>
                <p className="text-sm font-semibold text-tron-silver-200">
                  {analysis.commandView?.mostLikelyNextWipe?.summary || 'No repeat wipe point flagged.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-tron-silver-400">
                  <span>Owner: <span className="text-tron-silver-200">{analysis.commandView?.mostLikelyNextWipe?.owner || 'Raid'}</span></span>
                  <span>Phase: <span className="text-tron-silver-200">{analysis.commandView?.mostLikelyNextWipe?.phase || 'Full Fight'}</span></span>
                </div>
                <p className="text-xs text-tron-silver-400 mt-2">
                  {analysis.commandView?.mostLikelyNextWipe?.reason || 'No repeat wipe reason recorded.'}
                </p>
              </div>

              <div className="bg-dark-800/50 rounded-lg p-4 border border-wow-gold/20">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-wow-gold" /> {analysis.commandView?.nextActionsLabel || 'Next Pull Plan'}
                </h3>
                <div className="space-y-2">
                  {(analysis.nextPullActions || []).slice(0, 3).map((action) => (
                    <div key={`${action.priority}-${action.title}`} className="rounded-md bg-dark-700/40 p-3 text-sm">
                      <p className="font-semibold text-tron-silver-200">P{action.priority}. {action.title}</p>
                      <p className="text-xs text-tron-silver-400 mt-1">{action.owner}</p>
                      <p className="text-xs text-wow-gold mt-1">{action.reason}</p>
                    </div>
                  ))}
                  {(!analysis.nextPullActions || analysis.nextPullActions.length === 0) && (
                    <p className="text-sm text-tron-silver-400">No explicit next-pull actions were generated.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(analysis.assignmentPlanOverview || (analysis.phaseReadiness && analysis.phaseReadiness.length > 0)) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {analysis.assignmentPlanOverview && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-5 w-5 text-fuchsia-400" /> Plan vs Execution <InlineHelp text="Checks whether the key jobs for this boss were planned clearly and actually covered in the pull." />
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getPlanStatusBadgeClass(analysis.assignmentPlanOverview.status)}>
                      plan {analysis.assignmentPlanOverview.status}
                    </Badge>
                    <Badge className={getCoverageBadgeClass(analysis.assignmentPlanOverview.coverage)}>
                      coverage {analysis.assignmentPlanOverview.coverage}
                    </Badge>
                  </div>
                  <p className="text-sm text-tron-silver-300">{analysis.assignmentPlanOverview.summary}</p>
                  <p className="text-xs text-wow-gold mt-2">{analysis.assignmentPlanOverview.recommendation}</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.assignmentPlanOverview.categories.filter((category) => category.required).map((category) => (
                      <div key={category.key} className="rounded-md bg-dark-700/40 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-tron-silver-200">{category.label}</p>
                          <Badge className={
                            category.execution === 'covered'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : category.execution === 'at_risk'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                          }>
                            {category.execution}
                          </Badge>
                        </div>
                        <p className="text-tron-silver-400 mt-1">{category.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.phaseReadiness && analysis.phaseReadiness.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <Award className="h-5 w-5 text-emerald-400" /> Phase Readiness <InlineHelp text="Tells you if a phase already looks ready to progress, almost ready, or still not ready." />
                  </h3>
                  <div className="space-y-2">
                    {analysis.phaseReadiness.map((phase) => (
                      <div key={phase.phase} className="rounded-md bg-dark-700/40 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-tron-silver-200">{phase.phase}</p>
                          <Badge className={getReadinessBadgeClass(phase.status)}>
                            {phase.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-tron-silver-300 mt-1">{phase.summary}</p>
                        <p className="text-xs text-tron-silver-400 mt-2">{phase.blocker}</p>
                        <p className="text-xs text-wow-gold mt-1">Owner: {phase.owner}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(sessionRecap || sessionCommandCenter || sessionReview || bossMemory || reliabilityTrends.length > 0 || nightComparison || guildBossKnowledge || playerBossCoachingMemory.length > 0 || buildSignificance || isLoadingBuildSignificance) && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {sessionRecap && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-wow-gold/20">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <Trophy className="h-5 w-5 text-wow-gold" /> Night Recap
                    <InlineHelp text="The shortest officer-style summary of what to keep, what to change, and how to start the next night." />
                  </h3>
                  <p className="text-sm font-semibold text-tron-silver-100">{sessionRecap.oneSentenceSummary}</p>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Keep doing</p>
                      <div className="mt-2 space-y-1">
                        {sessionRecap.keepDoing.length > 0 ? sessionRecap.keepDoing.map((item) => (
                          <p key={item} className="text-tron-silver-200">{item}</p>
                        )) : (
                          <p className="text-tron-silver-400">No stable keep signal yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Change now</p>
                      <div className="mt-2 space-y-1">
                        {sessionRecap.changeNow.length > 0 ? sessionRecap.changeNow.map((item) => (
                          <p key={item} className="text-tron-silver-200">{item}</p>
                        )) : (
                          <p className="text-tron-silver-400">No urgent change was recorded.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Watch next</p>
                      <div className="mt-2 space-y-1">
                        {sessionRecap.watchNext.length > 0 ? sessionRecap.watchNext.map((item) => (
                          <p key={item} className="text-tron-silver-200">{item}</p>
                        )) : (
                          <p className="text-tron-silver-400">No watch item recorded yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Next night start call</p>
                      <p className="text-wow-gold font-medium">{sessionRecap.nextNightStartCall}</p>
                    </div>
                  </div>
                </div>
              )}

              {sessionCommandCenter && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-cyan-500/20">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <Clock4 className="h-5 w-5 text-cyan-400" /> Session Command Center
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className="bg-cyan-500/20 text-cyan-300">
                      {sessionCommandCenter.verdict.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-tron-silver-100">{sessionCommandCenter.headline}</p>
                  <p className="mt-2 text-sm text-tron-silver-300">{sessionCommandCenter.rationale}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Tonight calls</p>
                      <div className="mt-2 space-y-1">
                        {sessionCommandCenter.tonightCalls.map((call) => (
                          <p key={call} className="text-tron-silver-200">{call}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Coaching targets</p>
                      <div className="mt-2 space-y-1">
                        {sessionCommandCenter.coachingTargets.length > 0 ? sessionCommandCenter.coachingTargets.map((target) => (
                          <p key={target.name} className="text-tron-silver-200">
                            {target.name} <span className="text-tron-silver-500">({target.role})</span> - {target.reason}
                          </p>
                        )) : (
                          <p className="text-tron-silver-400">No urgent coaching target recorded.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Escalation risk</p>
                      <p className="text-wow-gold font-medium">{sessionCommandCenter.escalationRisk}</p>
                    </div>
                  </div>
                </div>
              )}

              {nightComparison && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-sky-500/20">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <GitBranch className="h-5 w-5 text-sky-400" /> Night Comparison
                    <InlineHelp text="Compares this report against the best stored previous night for the same boss." />
                  </h3>
                  <p className="text-sm text-tron-silver-200 font-semibold">{nightComparison.summary}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Progress delta</p>
                      <p className="text-tron-silver-200">{nightComparison.progressDelta}</p>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Recommendation</p>
                      <p className="text-wow-gold font-medium">{nightComparison.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}

              {sessionReview && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-sky-400" /> Session Review
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={
                      sessionReview.trend === 'improving'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : sessionReview.trend === 'regressing'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                    }>
                      {sessionReview.trend}
                    </Badge>
                    <Badge className="bg-dark-700 text-tron-silver-300">
                      {sessionReview.totalPulls} pulls
                    </Badge>
                    <Badge className="bg-dark-700 text-tron-silver-300">
                      {sessionReview.kills} kill / {sessionReview.wipes} wipes
                    </Badge>
                  </div>
                  <p className="text-sm text-tron-silver-300">{sessionReview.summary}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Best pull this session</p>
                      <p className="text-tron-silver-200 font-medium">
                        {sessionReview.bestPull
                          ? `Pull #${sessionReview.bestPull.fightId} ${sessionReview.bestPull.kill ? 'Kill' : `@ ${sessionReview.bestPull.bossHP}%`}`
                          : 'No best pull found.'}
                      </p>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Repeated failure</p>
                      <p className="text-tron-silver-200 font-medium">{sessionReview.repeatedFailure || 'No repeated failure flagged yet.'}</p>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Next focus</p>
                      <p className="text-wow-gold font-medium">{sessionReview.nextFocus}</p>
                    </div>
                  </div>
                </div>
              )}

              {guildBossKnowledge && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-violet-500/20">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <Crown className="h-5 w-5 text-violet-400" /> Guild Boss Knowledge
                    <InlineHelp text="What this guild keeps repeating on this boss across stored nights, not just in the current report." />
                  </h3>
                  <p className="text-sm text-tron-silver-300">{guildBossKnowledge.summary}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Stable kill pattern</p>
                      <p className="text-tron-silver-200">{guildBossKnowledge.stableKillPattern}</p>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Known blockers</p>
                      <div className="mt-2 space-y-1">
                        {guildBossKnowledge.knownBlockers.length > 0 ? guildBossKnowledge.knownBlockers.map((blocker) => (
                          <p key={blocker} className="text-tron-silver-200">{blocker}</p>
                        )) : (
                          <p className="text-tron-silver-400">No stable blocker is recorded yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Known pressure point</p>
                      <p className="text-wow-gold font-medium">
                        {(guildBossKnowledge.knownFailurePhase || 'No failure phase yet')} / {(guildBossKnowledge.knownOwnerPressure || 'No repeated owner yet')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bossMemory && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <RefreshCw className="h-5 w-5 text-violet-400" /> Boss Memory
                  </h3>
                  <p className="text-sm text-tron-silver-300">{bossMemory.summary}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Recurring blocker</p>
                      <p className="text-tron-silver-200 font-medium">{bossMemory.recurringBlocker || 'No recurring blocker recorded yet.'}</p>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Recurring wipe phase</p>
                      <p className="text-tron-silver-200 font-medium">{bossMemory.recurringWipePhase || 'No recurring phase recorded yet.'}</p>
                    </div>
                    <div className="rounded-md bg-dark-700/40 p-3">
                      <p className="text-xs text-tron-silver-500">Owner that keeps showing up</p>
                      <p className="text-tron-silver-200 font-medium">{bossMemory.recurringOwner || 'No repeated owner flagged yet.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {(buildSignificance || isLoadingBuildSignificance) && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-fuchsia-500/20">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <Medal className="h-5 w-5 text-fuchsia-400" /> Build Significance <span className="text-xs text-tron-silver-500">(Beta)</span>
                    <InlineHelp text="Compares current builds against stored boss history. When talent data is missing, WoWtron falls back to spec-level kill baselines instead of pretending certainty." />
                  </h3>
                  {isLoadingBuildSignificance ? (
                    <div className="flex items-center gap-2 text-sm text-tron-silver-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Building boss-level build comparison...
                    </div>
                  ) : buildSignificance ? (
                    <>
                      <p className="text-sm text-tron-silver-300">{buildSignificance.datasetSummary.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="bg-dark-700 text-tron-silver-300">{buildSignificance.datasetSummary.totalRecords} records</Badge>
                        <Badge className="bg-dark-700 text-tron-silver-300">{buildSignificance.datasetSummary.killRecords} kill records</Badge>
                        <Badge className="bg-dark-700 text-tron-silver-300">{buildSignificance.datasetSummary.talentCoverageRecords} talent-tagged</Badge>
                        {typeof buildSignificance.datasetSummary.namedTalentCoverageRecords === 'number' ? (
                          <Badge className="bg-dark-700 text-tron-silver-300">{buildSignificance.datasetSummary.namedTalentCoverageRecords} named-label</Badge>
                        ) : null}
                        <Badge className={buildSignificance.datasetSummary.scope === 'same_difficulty' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                          {buildSignificance.datasetSummary.scope === 'same_difficulty' ? 'same difficulty' : 'cross-difficulty fallback'}
                        </Badge>
                        {buildSignificance.datasetSummary.requestedDifficulty ? (
                          <Badge className="bg-dark-700 text-tron-silver-300">
                            target: {buildSignificance.datasetSummary.requestedDifficulty}
                          </Badge>
                        ) : null}
                      </div>
                      {buildSignificance.datasetSummary.comparedDifficulties.length > 0 ? (
                        <p className="mt-2 text-xs text-tron-silver-500">
                          Compared difficulties: {buildSignificance.datasetSummary.comparedDifficulties.join(', ')}
                        </p>
                      ) : null}
                      {typeof buildSignificance.datasetSummary.namedTalentCoverageRecords === 'number' &&
                      buildSignificance.datasetSummary.talentCoverageRecords > 0 &&
                      buildSignificance.datasetSummary.namedTalentCoverageRecords === 0 ? (
                        <p className="mt-2 text-xs text-amber-300">
                          WoWtron is seeing observed talent trees here, but most labels are still unresolved. Treat this as build-shape guidance, not a precise talent swap call yet.
                        </p>
                      ) : null}
                      <div className="mt-3 space-y-2 text-sm">
                        {buildSignificance.insights.length > 0 ? buildSignificance.insights.map((insight) => (
                          <div key={`${insight.playerName}-${insight.spec}`} className="rounded-md bg-dark-700/40 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-tron-silver-200">{insight.playerName}</p>
                              <div className="flex gap-2">
                                <Badge className="bg-dark-700 text-tron-silver-300">{insight.spec}</Badge>
                                <Badge className={insight.comparisonMode === 'talent' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-amber-500/20 text-amber-300'}>
                                  {insight.comparisonMode === 'talent' ? 'talent mode' : 'spec fallback'}
                                </Badge>
                                <Badge className={insight.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300' : insight.confidence === 'medium' ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'}>
                                  {insight.confidence}
                                </Badge>
                              </div>
                            </div>
                            <p className="mt-2 text-tron-silver-300">{insight.summary}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-tron-silver-400">
                              <span>Current: <span className="text-tron-silver-200">{insight.currentBuildLabel}</span></span>
                              <span>Better build: <span className="text-tron-silver-200">{insight.betterBuildLabel || 'No forced swap'}</span></span>
                              <span>Sample: <span className="text-tron-silver-200">{insight.sampleSize}</span></span>
                              <span>Impact: <span className="text-wow-gold">{insight.significancePercent}%</span></span>
                            </div>
                            <p className="mt-2 text-xs text-wow-gold">{insight.recommendation}</p>
                            {insight.note ? <p className="mt-1 text-xs text-tron-silver-500">{insight.note}</p> : null}
                          </div>
                        )) : (
                          <p className="text-tron-silver-400">No build comparison was generated for this boss yet.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-tron-silver-400">Build significance is not available yet.</p>
                  )}
                </div>
              )}

              {reliabilityTrends.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-amber-400" /> Reliability Trends
                  </h3>
                  <div className="space-y-2">
                    {reliabilityTrends.map((player) => (
                      <div key={player.name} className="rounded-md bg-dark-700/40 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-tron-silver-200">{player.name}</p>
                          <div className="flex gap-2">
                            <Badge className="bg-dark-700 text-tron-silver-300">{player.role}</Badge>
                            <Badge className={
                              player.trend === 'up'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : player.trend === 'down'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-amber-500/20 text-amber-300'
                            }>
                              {player.trend}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-tron-silver-400">
                          <span>Reliability <span className="text-tron-silver-200">{player.averageReliability}</span></span>
                          <span>Active <span className="text-tron-silver-200">{player.averageActiveTime}%</span></span>
                          <span>Deaths <span className="text-tron-silver-200">{player.totalDeaths}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {playerBossCoachingMemory.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-amber-500/20">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                    <Star className="h-5 w-5 text-amber-400" /> Coaching Memory
                    <InlineHelp text="Shows which players keep repeating the same reliability problem on this boss across stored nights." />
                  </h3>
                  <div className="space-y-2">
                    {playerBossCoachingMemory.map((player) => (
                      <div key={player.name} className="rounded-md bg-dark-700/40 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-tron-silver-200">{player.name}</p>
                          <div className="flex gap-2">
                            <Badge className="bg-dark-700 text-tron-silver-300">{player.role}</Badge>
                            <Badge className="bg-amber-500/20 text-amber-300">{player.sessions} sessions</Badge>
                          </div>
                        </div>
                        <p className="mt-2 text-tron-silver-300">{player.repeatedReason}</p>
                        <p className="mt-1 text-xs text-wow-gold">Average reliability: {player.averageReliability}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-wow-gold/80">
            <Crown className="h-3.5 w-3.5" />
            Pull Brief
          </div>

          {/* RAID CALL QUICK PLAN */}
          {(analysis.briefInsights && analysis.briefInsights.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                  <Crown className="h-5 w-5 text-wow-gold" /> Prioritized Insights
                </h3>
                <div className="space-y-2">
                  {analysis.briefInsights.slice(0, showAdvanced ? analysis.briefInsights.length : 3).map((insight, index) => (
                    <div key={insight.id} className="p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.22em] text-tron-silver-500">#{index + 1}</p>
                          <p className="text-sm font-semibold text-tron-silver-200 mt-1">
                            {insight.summary}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Badge className={
                            insight.severity === 'critical'
                              ? 'bg-red-500/20 text-red-300'
                              : insight.severity === 'warning'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-sky-500/20 text-sky-300'
                          }>
                            {insight.severity}
                          </Badge>
                          <Badge className="bg-wow-gold/20 text-wow-gold text-xs whitespace-nowrap">{insight.confidence}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-tron-silver-400">
                        <span>Priority: <span className="text-tron-silver-200">{insight.priorityScore}</span></span>
                        <span>Type: <span className="text-tron-silver-200">{insight.kind}</span></span>
                        <span>Owner: <span className="text-tron-silver-200">{insight.owner}</span></span>
                        <span>Phase: <span className="text-tron-silver-200">{insight.phase}</span></span>
                        <span>Category: <span className="text-tron-silver-200">{insight.category}</span></span>
                      </div>
                      <p className="text-xs text-tron-silver-400 mt-2">{insight.evidence}</p>
                      {insight.confidenceReasons && insight.confidenceReasons.length > 0 && (
                        <div className="mt-2 rounded-md bg-dark-900/60 border border-dark-600 p-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-tron-silver-500">Why this confidence</p>
                          <div className="mt-1 space-y-1">
                            {insight.confidenceReasons.slice(0, 3).map((reason) => (
                              <p key={reason} className="text-xs text-tron-silver-400">{reason}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-wow-gold mt-1">{insight.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                <h3 className="text-base font-semibold text-tron-silver-200 mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-cyan-400" /> Pull Summary <InlineHelp text="A short read of what happened in this pull and what most likely mattered." />
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">{fightData.kill ? 'Outcome Read' : 'Primary Cause'}</p>
                    <p className="text-tron-silver-200 font-medium">{analysis.wipeCause?.details || 'No dominant cause detected.'}</p>
                  </div>
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">{fightData.kill ? 'Avoidable Errors' : 'Avoidable Deaths'}</p>
                    <p className="text-tron-silver-200 font-medium">{analysis.deaths.avoidable.length} on this pull</p>
                  </div>
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">Estimated DPS Gap</p>
                    <p className="text-tron-silver-200 font-medium">{formatNumber(analysis.performance.dpsGap)} total</p>
                  </div>
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">Highest Priority Owner</p>
                    <p className="text-tron-silver-200 font-medium">{analysis.briefInsights[0]?.owner || 'Raid'}</p>
                  </div>
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">Top Issue Type</p>
                    <p className="text-tron-silver-200 font-medium">{analysis.briefInsights[0]?.kind || 'N/A'}</p>
                  </div>
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">Top Priority Score</p>
                    <p className="text-tron-silver-200 font-medium">{analysis.briefInsights[0]?.priorityScore ?? 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            <Target className="h-3.5 w-3.5" />
            Evidence
          </div>

          {analysis.repeatedMistakes && analysis.repeatedMistakes.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-red-400" /> Repeated Mistakes
              </h3>
              <div className="space-y-2">
                {analysis.repeatedMistakes.map((mistake, index) => (
                  <div key={`${mistake.player}-${mistake.ability}-${index}`} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-tron-silver-200">
                      <span className="font-semibold">{mistake.player}</span> died to <span className="text-red-400">{mistake.ability}</span> {mistake.count}x
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WIPE CAUSE + PULL DELTA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analysis.wipeCause && (
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-400" /> {fightData.kill ? 'Kill Review' : 'Pull Root Cause'}
                </h3>
                <Badge className="mb-2 bg-amber-500/20 text-amber-400">
                  {analysis.wipeCause.primary}
                </Badge>
                <p className="text-sm text-tron-silver-300">{analysis.wipeCause.details}</p>
              </div>
            )}

            {analysis.pullDelta && (
              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-wow-gold" /> Pull vs Pull #{analysis.pullDelta.comparedPullId}
                </h3>
                <div className="mb-3 flex flex-wrap gap-2">
                  {analysis.pullDelta.scope ? (
                    <Badge className={analysis.pullDelta.scope === 'same_difficulty' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                      {analysis.pullDelta.scope === 'same_difficulty' ? 'same difficulty' : 'mixed difficulty'}
                    </Badge>
                  ) : null}
                  {analysis.pullDelta.comparedDifficulty ? (
                    <Badge className="bg-dark-700 text-tron-silver-300">
                      vs {analysis.pullDelta.comparedDifficulty}
                    </Badge>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-tron-silver-500">HP Delta</p>
                    <p className={analysis.pullDelta.bossHPDelta >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {analysis.pullDelta.bossHPDelta >= 0 ? '-' : '+'}{Math.abs(analysis.pullDelta.bossHPDelta)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-tron-silver-500">Time</p>
                    <p className="text-tron-silver-200 font-semibold">{analysis.pullDelta.durationDelta > 0 ? '+' : ''}{analysis.pullDelta.durationDelta}s</p>
                  </div>
                  <div>
                    <p className="text-tron-silver-500">Deaths</p>
                    <p className="text-tron-silver-200 font-semibold">
                      {typeof analysis.pullDelta.deathsDelta === 'number'
                        ? `${analysis.pullDelta.deathsDelta > 0 ? '+' : ''}${analysis.pullDelta.deathsDelta}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {analysis.deltaInsights && analysis.deltaInsights.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 mb-3 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-cyan-400" /> Pull Delta Insight
              </h3>
              <div className="space-y-2">
                {analysis.deltaInsights.map((insight) => (
                  <div key={insight.id} className="rounded-md bg-dark-700/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-tron-silver-200">{insight.summary}</p>
                      <Badge className="bg-cyan-500/20 text-cyan-300">{insight.kind}</Badge>
                    </div>
                    <p className="text-tron-silver-400 mt-1">{insight.evidence}</p>
                    <p className="text-wow-gold text-xs mt-1">{insight.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showAdvanced && recentSnapshots.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-sky-400" /> Saved analysis snapshots
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={handleExportSnapshots}>
                  <Download className="h-4 w-4 mr-2" />
                  Export snapshots
                </Button>
              </div>
              <div className="space-y-2">
                {recentSnapshots.map((snapshot) => (
                  <div key={snapshot.key} className="rounded-md bg-dark-700/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-tron-silver-200">
                        Pull #{snapshot.fightId} {snapshot.kill ? 'Kill' : snapshot.bossHP !== undefined ? `(${snapshot.bossHP}% boss HP)` : ''}
                      </p>
                      <span className="text-xs text-tron-silver-500">{new Date(snapshot.recordedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-tron-silver-400 mt-1">
                      {snapshot.briefInsights[0]?.summary || 'No saved brief insight.'}
                    </p>
                    <p className="text-wow-gold text-xs mt-1">
                      {snapshot.phaseSuccessCriteria[0]?.summary || snapshot.causeChains[0] || 'No saved phase criteria.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(analysis.causeChainDetails && analysis.causeChainDetails.length > 0) && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 mb-3 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-rose-400" /> Cause Chain v2
              </h3>
              <div className="space-y-3">
                {analysis.causeChainDetails.map((chain) => (
                  <div key={chain.id} className="rounded-lg border border-dark-600 bg-dark-700/30 p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                      <Badge className="bg-rose-500/20 text-rose-300">{chain.phase}</Badge>
                      <Badge className="bg-dark-700 text-tron-silver-300">{chain.owner}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                      {chain.steps.map((step) => (
                        <div key={`${chain.id}-${step.label}`} className="rounded-md bg-dark-900/60 border border-dark-600 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-tron-silver-500">
                            {step.label.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-tron-silver-300 mt-2">{step.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.causeChains && analysis.causeChains.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 mb-3 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-rose-400" /> Cause Chain Summary
              </h3>
              <div className="space-y-2">
                {analysis.causeChains.map((chain, index) => (
                  <div key={`${chain}-${index}`} className="rounded-md bg-dark-700/40 p-3 text-sm text-tron-silver-300">
                    {chain}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-tron-silver-400/80">
            <Users className="h-3.5 w-3.5" />
            Detail
          </div>

          {showAdvanced && (analysis.phaseSuccessCriteria || analysis.phaseCausality || analysis.pullTrend || analysis.roleScores) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
              {analysis.phaseSuccessCriteria && analysis.phaseSuccessCriteria.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-400" /> Phase success criteria <InlineHelp text="A quick check for whether each phase looked good enough to keep progressing." />
                  </h3>
                  <div className="space-y-2">
                    {analysis.phaseSuccessCriteria.map((phase) => (
                      <div key={phase.phase} className="rounded-md bg-dark-700/40 p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-tron-silver-200">{phase.phase}</p>
                          <Badge className={
                            phase.status === 'met'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : phase.status === 'at_risk'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                          }>
                            {phase.status}
                          </Badge>
                        </div>
                        <p className="text-tron-silver-300 mt-1">{phase.summary}</p>
                        <p className="text-tron-silver-500 mt-1">{phase.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.phaseCausality && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Clock4 className="h-5 w-5 text-indigo-400" /> Phase Causality
                  </h3>
                  <div className="space-y-2">
                    {analysis.phaseCausality.map((phase) => (
                      <div key={phase.phase} className="rounded-md bg-dark-700/40 p-2 text-xs">
                        <div className="flex items-center justify-between text-tron-silver-200">
                          <span className="font-semibold">{phase.phase} ({formatTime(phase.start)}-{formatTime(phase.end)})</span>
                          <Badge className="bg-indigo-500/20 text-indigo-300">{phase.dominantCause}</Badge>
                        </div>
                        <p className="text-tron-silver-400 mt-1">
                          Deaths: {phase.deaths} / Avoidable: {phase.avoidableDeaths}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.pullTrend && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-400" /> Recent Pull Delta
                  </h3>
                  <p className="text-xs text-tron-silver-400 mb-2">Based on the last {analysis.pullTrend.sampleSize} pulls on this boss</p>
                  {analysis.pullTrend.currentDeaths === 0 && analysis.pullTrend.avgDeathsPrev === 0 && analysis.pullTrend.currentAvoidableDeaths === 0 && analysis.pullTrend.avgAvoidablePrev === 0 ? (
                    <p className="text-sm text-tron-silver-300">
                      No useful mechanic or death signal in recent pull history.
                    </p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <p className="text-tron-silver-300">Deaths: <span className="font-semibold">{analysis.pullTrend.currentDeaths}</span> vs avg <span className="font-semibold">{analysis.pullTrend.avgDeathsPrev}</span></p>
                      <p className="text-tron-silver-300">Avoidable: <span className="font-semibold">{analysis.pullTrend.currentAvoidableDeaths}</span> vs avg <span className="font-semibold">{analysis.pullTrend.avgAvoidablePrev}</span></p>
                      <p className="text-tron-silver-300">Time: <span className="font-semibold">{analysis.pullTrend.currentDuration}s</span> vs avg <span className="font-semibold">{analysis.pullTrend.avgDurationPrev}s</span></p>
                    </div>
                  )}
                </div>
              )}

              {analysis.roleScores && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" /> Role score
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-tron-silver-300">Tanks: <span className="font-semibold text-blue-400">{analysis.roleScores.tanks}</span></p>
                    <p className="text-tron-silver-300">Healers: <span className="font-semibold text-green-400">{analysis.roleScores.healers}</span></p>
                    <p className="text-tron-silver-300">DPS: <span className="font-semibold text-amber-400">{analysis.roleScores.dps}</span></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {showAdvanced && ((analysis.mechanicScores && analysis.mechanicScores.length > 0) || (analysis.regressionAlerts && analysis.regressionAlerts.length > 0)) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analysis.mechanicScores && analysis.mechanicScores.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5 text-rose-400" /> Critical mechanic score
                  </h3>
                  <div className="space-y-2">
                    {analysis.mechanicScores.map((m) => (
                      <div key={m.mechanic} className="rounded-md bg-dark-700/40 p-2 text-sm flex items-center justify-between">
                        <div>
                          <p className="text-tron-silver-200 font-medium">{m.mechanic}</p>
                          <p className="text-xs text-tron-silver-400">{m.events} occurrence(s)</p>
                        </div>
                        <div className="text-right">
                          <Badge className={m.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}>
                            {m.severity}
                          </Badge>
                          <p className="text-xs text-tron-silver-400 mt-1">score {m.score}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.regressionAlerts && analysis.regressionAlerts.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400" /> Regression alerts (P2)
                  </h3>
                  <div className="space-y-2">
                    {analysis.regressionAlerts.map((alert, idx) => (
                      <div key={`${alert}-${idx}`} className="rounded-md bg-orange-500/10 border border-orange-500/20 p-2 text-sm text-tron-silver-200">
                        {alert}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {showAdvanced && analysis.bestPullChanges && analysis.bestPullChanges.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-sky-400" /> What changed from best pull
              </h3>
              <div className="space-y-2">
                {analysis.bestPullChanges.map((change, idx) => (
                  <div key={`${change}-${idx}`} className="rounded-md bg-sky-500/10 border border-sky-500/20 p-2 text-sm text-tron-silver-200">
                    {change}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showAdvanced && ((analysis.cooldownPlanner && analysis.cooldownPlanner.length > 0) || (analysis.assignmentAssessments && analysis.assignmentAssessments.length > 0) || (analysis.assignmentBreaks && analysis.assignmentBreaks.length > 0) || typeof analysis.killProbability === 'number' || analysis.internalBenchmark) ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {typeof analysis.killProbability === 'number' && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-lime-400" /> Kill Probability <InlineHelp text="A rough guess, not a promise. It estimates how close this pull looked to a kill." />
                  </h3>
                  <p className="text-3xl font-bold text-lime-400">{analysis.killProbability}%</p>
                  <p className="text-xs text-tron-silver-400 mt-1">Estimate based on boss HP, deaths, avoidable mechanics, and raid-cooldown gaps.</p>
                </div>
              )}

              {analysis.internalBenchmark && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Medal className="h-5 w-5 text-yellow-400" /> Internal benchmark
                  </h3>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge className={analysis.internalBenchmark.scope === 'same_difficulty' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                      {analysis.internalBenchmark.scope === 'same_difficulty' ? 'same difficulty' : 'mixed difficulty'}
                    </Badge>
                    {analysis.internalBenchmark.difficulty ? (
                      <Badge className="bg-dark-700 text-tron-silver-300">{analysis.internalBenchmark.difficulty}</Badge>
                    ) : null}
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">
                    #{analysis.internalBenchmark.rank}/{analysis.internalBenchmark.total}
                  </p>
                  <p className="text-xs text-tron-silver-400 mt-1">
                    Internal percentile: {analysis.internalBenchmark.percentile}
                  </p>
                </div>
              )}

              {analysis.cooldownPlanner && analysis.cooldownPlanner.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-violet-400" /> Raid cooldown planner
                  </h3>
                  <div className="space-y-2">
                    {analysis.cooldownPlanner.slice(0, 5).map((item, idx) => (
                      <div key={`${item.at}-${idx}`} className="rounded-md bg-violet-500/10 border border-violet-500/20 p-2 text-xs">
                        <p className="text-tron-silver-200 font-medium">{formatTime(item.at)} [{item.phase}] {item.action}</p>
                        <p className="text-tron-silver-400">{item.owner} / {item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.assignmentAssessments && analysis.assignmentAssessments.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-fuchsia-400" /> Assignment coverage <InlineHelp text="Checks whether the planned jobs like kicks, soaks, and raid CDs were actually covered." />
                  </h3>
                  <div className="space-y-2">
                    {analysis.assignmentAssessments.slice(0, 6).map((item) => (
                      <div key={item.id} className="rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-tron-silver-200 font-medium">{item.mechanic}</p>
                          <Badge className={
                            item.status === 'failing'
                              ? 'bg-red-500/20 text-red-300'
                              : item.status === 'at_risk'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-tron-silver-400 mt-1">{item.owner} / {item.phase}</p>
                        <p className="text-tron-silver-500 mt-1">{item.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {showAdvanced && analysis.bossProgression && analysis.bossProgression.length > 1 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-400" /> Boss progression history
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {analysis.bossProgression.slice(-8).map((p) => (
                  <div key={p.pullId} className="rounded-md bg-dark-700/40 p-2">
                    <p className="text-tron-silver-300 font-semibold">Pull #{p.pullId}</p>
                    <p className={p.kill ? 'text-green-400' : 'text-red-400'}>
                      {p.kill ? 'KILL' : `HP ${p.hpRemaining}%`}
                    </p>
                    <p className="text-tron-silver-500">{p.duration}s</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEW: DEATH CASCADE ANALYSIS - THE KEY INSIGHT */}
          {analysis.deathCascade && !fightData.kill && (
            <div className="bg-gradient-to-r from-red-900/20 to-dark-800/50 rounded-lg p-5 border border-red-500/30">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <GitBranch className="h-6 w-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-400 mb-1">Death chain detected</h3>
                  <p className="text-sm text-tron-silver-400 mb-4">The first death that converted into a wipe</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Root Death */}
                    <div className="bg-dark-800/50 rounded-lg p-4 border border-red-500/20">
                      <div className="text-xs text-red-400 uppercase tracking-wide mb-2 font-semibold">Root Death</div>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          analysis.deathCascade.rootDeath.role === 'tank' ? 'bg-blue-500/20 text-blue-400' :
                          analysis.deathCascade.rootDeath.role === 'healer' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {analysis.deathCascade.rootDeath.role === 'tank' ? <Shield className="h-5 w-5" /> :
                           analysis.deathCascade.rootDeath.role === 'healer' ? <Heart className="h-5 w-5" /> :
                           <Swords className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-tron-silver-200">{analysis.deathCascade.rootDeath.player}</p>
                          <p className="text-sm text-tron-silver-400">{analysis.deathCascade.rootDeath.ability}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-lg font-bold text-red-400">{formatTime(analysis.deathCascade.rootDeath.time)}</p>
                          <Badge className={`${
                            analysis.deathCascade.rootDeath.impact === 'critical' ? 'bg-red-500/20 text-red-400' :
                            analysis.deathCascade.rootDeath.impact === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-amber-500/20 text-amber-400'
                          } text-xs`}>
                            {analysis.deathCascade.rootDeath.impact}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Chain Deaths */}
                    {analysis.deathCascade.chainDeaths.length > 0 && (
                      <div className="bg-dark-800/50 rounded-lg p-4 border border-orange-500/20">
                        <div className="text-xs text-orange-400 uppercase tracking-wide mb-2 font-semibold">Chain Deaths</div>
                        <div className="space-y-2">
                          {analysis.deathCascade.chainDeaths.slice(0, 3).map((death, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <ArrowRight className="h-3 w-3 text-orange-400" />
                              <span className="text-tron-silver-200">{death.player}</span>
                              <span className="text-tron-silver-500">→</span>
                              <span className="text-red-400">{death.ability}</span>
                              <span className="text-tron-silver-500 text-xs ml-auto">{formatTime(death.time)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommendation */}
                  <div className="mt-4 p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-wow-gold mt-0.5 shrink-0" />
                      <p className="text-sm text-tron-silver-300">{analysis.deathCascade.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COOLDOWN GAPS - Valuable Insight */}
          {analysis.cooldownGaps && analysis.cooldownGaps.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <Collapsible open={expandedSections.cooldownGaps} onOpenChange={() => toggleSection('cooldownGaps')}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-wow-gold" /> Raid cooldown gaps
                      <Badge className="bg-orange-500/20 text-orange-400 text-xs ml-2">
                        {analysis.cooldownGaps.length} gap(s)
                      </Badge>
                    </h3>
                    {expandedSections.cooldownGaps ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-sm text-tron-silver-400 mt-2 mb-3">High-damage moments that landed without an active raid cooldown.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {analysis.cooldownGaps.map((gap, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        gap.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-tron-silver-200">{formatTime(gap.time)}</span>
                          <Badge className={gap.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}>
                            {gap.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-tron-silver-400 space-y-1">
                          <p>Duration: {gap.duration}s without coverage</p>
                          <p>Damage taken: {formatNumber(gap.damageTaken)}</p>
                          {gap.availableCds.length > 0 && (
                            <p className="text-wow-gold">Available: {gap.availableCds.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* BURST WINDOW EFFICIENCY */}
          {showAdvanced && analysis.burstWindows && analysis.burstWindows.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-wow-gold" /> Burst window efficiency
              </h3>
              <div className="space-y-3">
                {analysis.burstWindows.map((window, i) => (
                  <div key={i} className="p-3 bg-dark-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-tron-silver-200">{window.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-tron-silver-400">{formatTime(window.startTime)} - {formatTime(window.startTime + window.duration)}</span>
                        <Badge className={`${window.efficiency >= 90 ? 'bg-green-500/20 text-green-400' : window.efficiency >= 70 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                          {window.efficiency}%
                        </Badge>
                      </div>
                    </div>
                    {window.playersWithoutCDs.length > 0 && (
                      <div className="text-xs">
                        <span className="text-orange-400">Missing CDs during burst: </span>
                        <span className="text-tron-silver-300">{window.playersWithoutCDs.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Bars */}
          {showAdvanced && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'DPS Score', score: analysis.raidEfficiency?.dps || 0, color: 'bg-red-500', desc: 'Damage output efficiency' },
              { label: 'Survival Score', score: analysis.raidEfficiency?.survival || 0, color: 'bg-green-500', desc: 'Player survivability' },
              { label: 'Mechanics Score', score: analysis.raidEfficiency?.mechanics || 0, color: 'bg-amber-500', desc: 'Mechanic execution' },
              { label: 'Consumables Score', score: analysis.raidEfficiency?.consumables || 0, color: 'bg-purple-500', desc: 'Raid preparation' },
            ].map((item, i) => (
              <div key={i} className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-tron-silver-400">{item.label}</span>
                  <span className="text-lg font-bold text-tron-silver-200">{item.score}%</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Players Section - Collapsible */}
          {showAdvanced && (
          <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
            <Collapsible open={expandedSections.players} onOpenChange={() => toggleSection('players')}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                    <Users className="h-5 w-5 text-wow-gold" /> Raid Roster
                    <Badge className="bg-dark-700 text-tron-silver-400 text-xs ml-2">
                      {playersByRole.tanks.length}T / {playersByRole.healers.length}H / {playersByRole.dps.length}D
                    </Badge>
                  </h3>
                  {expandedSections.players ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {/* Tanks */}
                {playersByRole.tanks.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-blue-400 mb-2 font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                      <Shield className="h-4 w-4" /> Tanks
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {playersByRole.tanks.map((player, i) => <PlayerCard key={i} player={player} />)}
                    </div>
                  </div>
                )}
                {/* Healers */}
                {playersByRole.healers.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-green-400 mb-2 font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                      <Heart className="h-4 w-4" /> Healers
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {playersByRole.healers.map((player, i) => <PlayerCard key={i} player={player} />)}
                    </div>
                  </div>
                )}
                {/* DPS */}
                <div className="mt-4">
                  <div className="text-xs text-red-400 mb-2 font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                    <Swords className="h-4 w-4" /> DPS
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {playersByRole.dps.map((player, i) => <PlayerCard key={i} player={player} />)}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          )}

          {analysis.playerCoaching && analysis.playerCoaching.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" /> Player Coaching
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {analysis.playerCoaching.map((insight) => (
                  <div key={insight.id} className="rounded-md bg-dark-700/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-tron-silver-200">{insight.owner}</p>
                      <div className="flex gap-2">
                        <Badge className="bg-amber-500/20 text-amber-300">{insight.category}</Badge>
                        <Badge className={
                          insight.severity === 'critical'
                            ? 'bg-red-500/20 text-red-300'
                            : insight.severity === 'warning'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-sky-500/20 text-sky-300'
                        }>
                          {insight.severity}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-tron-silver-500 mt-2">
                      {insight.phase} • {insight.confidence} confidence
                    </p>
                    <p className="text-tron-silver-300 mt-1">{insight.summary}</p>
                    <p className="text-tron-silver-400 text-xs mt-1">{insight.evidence}</p>
                    <p className="text-wow-gold text-xs mt-1">{insight.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHASE 2 ANALYSIS - Advanced Insights */}
          {showAdvanced && currentFight && (
            <Phase2Analysis fight={currentFight} report={report} />
          )}

          {/* Quick Tips - Based on Analysis */}
          {showAdvanced && (
          <div className="bg-dark-800/50 rounded-lg p-4 border border-wow-gold/30">
            <h3 className="text-base font-semibold text-wow-gold flex items-center gap-2 mb-3">
              <Target className="h-5 w-5" /> Recommended actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Death Cascade Recommendation */}
              {analysis.deathCascade && !fightData.kill && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Fix the root death first</p>
                    <p className="text-xs text-tron-silver-400">{analysis.deathCascade.recommendation}</p>
                  </div>
                </div>
              )}
              
              {/* Cooldown Gap Recommendation */}
              {analysis.cooldownGaps && analysis.cooldownGaps.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <Clock4 className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Adjust cooldown timing</p>
                    <p className="text-xs text-tron-silver-400">Align raid cooldowns with the main damage event at {formatTime(analysis.cooldownGaps[0].time)}</p>
                  </div>
                </div>
              )}
              
              {/* Burst Window Recommendation */}
              {analysis.burstWindows?.some(w => w.playersWithoutCDs.length > 0) && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <Zap className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Burst Timing</p>
                    <p className="text-xs text-tron-silver-400">{analysis.burstWindows.find(w => w.playersWithoutCDs.length > 0)?.playersWithoutCDs.slice(0, 3).join(', ')} missed cooldown usage during the burst window</p>
                  </div>
                </div>
              )}
              
              {/* Potion Recommendation */}
              {analysis.consumables.missingPotion.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <Flame className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Potions</p>
                    <p className="text-xs text-tron-silver-400">{analysis.consumables.missingPotion.length} players missed potions, costing roughly 80K DPS each</p>
                  </div>
                </div>
              )}
              
              {/* Flask Recommendation */}
              {analysis.consumables.missingFlask.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Flasks</p>
                    <p className="text-xs text-tron-silver-400">{analysis.consumables.missingFlask.length} players missed flasks, costing roughly 50K DPS each</p>
                  </div>
                </div>
              )}
              
              {/* Low Performers Recommendation */}
              {analysis.performance.lowPerformers.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <TrendingDown className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">DPS Gap</p>
                    <p className="text-xs text-tron-silver-400">{analysis.performance.lowPerformers[0].player}: -{formatNumber(analysis.performance.lowPerformers[0].gap)} DPS ({analysis.performance.lowPerformers[0].reason})</p>
                  </div>
                </div>
              )}
              
              {/* Missing Raid Buffs */}
              {analysis.raidBuffs.filter(b => !b.present).slice(0, 1).map((buff, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Missing raid buff</p>
                    <p className="text-xs text-tron-silver-400">{buff.name}: {buff.missingImpact}</p>
                  </div>
                </div>
              ))}
              
              {/* Kill Potential */}
              {fightData.kill ? (
                <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Boss Kill!</p>
                    <p className="text-xs text-tron-silver-400">Duration: {formatTime(fightData.duration)} | DPS: {formatNumber(analysis.performance.raidDPS)}</p>
                  </div>
                </div>
              ) : analysis.summary.killPotential && (
                <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <Trophy className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Kill is close</p>
                    <p className="text-xs text-tron-silver-400">Boss reached {fightData.bossHP}% - the next clean pulls should convert.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function InlineHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-tron-silver-500 hover:text-cyan-400 transition-colors">
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] bg-dark-900 text-tron-silver-200 border border-dark-700">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function StatCard({ icon, label, value, valueClass = '', helpText }: { icon: React.ReactNode; label: string; value: string; valueClass?: string; helpText?: string }) {
  return (
    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700 text-center">
      <div className="flex items-center justify-center gap-1.5 text-tron-silver-400 text-sm mb-1.5">
        {icon} {label} {helpText ? <InlineHelp text={helpText} /> : null}
      </div>
      <div className={`text-xl font-bold ${valueClass || 'text-tron-silver-200'}`}>{value}</div>
    </div>
  );
}

// Player Card Component
function PlayerCard({ player }: { player: PlayerStats }) {
  // Check if player has no valid data
  const hasNoData = player.dps === 0 && player.hps === 0;
  
  return (
    <div className={`p-3 rounded-lg border ${hasNoData ? 'bg-dark-700/30 border-dark-600' : getRankBg(player.rankPercent)} flex items-center gap-3`}>
      <div className="flex-1 min-w-0">
        <Link
          href={`/players/${encodeURIComponent((player.region || 'us').toLowerCase())}/${encodeURIComponent((player.server || 'unknown').toLowerCase())}/${encodeURIComponent(player.name.toLowerCase())}`}
          className="font-medium text-sm truncate block hover:underline"
          style={{ color: getClassColor(player.class) }}
        >
          {player.name}
        </Link>
        <p className="text-xs text-tron-silver-500 truncate">{player.spec}</p>
        {!hasNoData && player.improvementFocus && (
          <p className="text-[10px] text-tron-silver-400 truncate mt-0.5">
            Focus: {player.improvementFocus}
          </p>
        )}
        {!hasNoData && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-tron-silver-500">
            <span>Active time {player.activeTime}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-tron-silver-500 hover:text-cyan-400 transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] bg-dark-900 text-tron-silver-200 border border-dark-700">
                How much of the fight the player was really attacking or healing. Ideal is usually 90% or more.
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        {hasNoData ? (
          <div className="flex items-center gap-1 text-tron-silver-500">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">No Data</span>
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-1 ${getRankColor(player.rankPercent)}`}>
              <Star className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{player.rankPercent}%</span>
            </div>
            <p className="text-xs text-tron-silver-500">{formatNumber(player.dps)} DPS</p>
            <p className={`text-[10px] font-semibold ${
              (player.reliabilityScore || 0) >= 80 ? 'text-emerald-400' :
              (player.reliabilityScore || 0) >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>
              Reliability {player.reliabilityScore || 0}
            </p>
          </>
        )}
      </div>
    </div>
  );
}




