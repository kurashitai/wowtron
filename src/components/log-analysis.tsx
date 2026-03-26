'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Skull, AlertTriangle, CheckCircle, XCircle, Clock, Users, Zap,
  Search, Copy, Loader2, Send, ChevronRight, TrendingUp,
  TrendingDown, Minus, Flame, Target, Shield, Heart, Activity,
  BarChart3, Timer, RefreshCw, ChevronDown, ChevronUp,
  Star, Swords, ShieldAlert, AlertCircle, Sparkles, Gauge,
  Trophy, Medal, Award, Crown, Flame as Fire, Info,
  ArrowRight, GitBranch, Clock4, ShieldCheck
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getClassColor } from '@/lib/wow-data';
import { Phase2Analysis } from './phase2-analysis';
import { ProgressionTracking } from './progression-tracking';

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
  cooldownPlanner?: {
    at: number;
    phase: string;
    action: string;
    owner: string;
    reason: string;
  }[];
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
  };
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

// Main Component
export default function LogAnalysis() {
  const [logUrl, setLogUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedFight, setSelectedFight] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fightData, setFightData] = useState<FightData | null>(null);
  const [currentFight, setCurrentFight] = useState<any>(null);
  const [isPostingBrief, setIsPostingBrief] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    deathCascade: true,
    cooldownGaps: true,
    players: false,
    deaths: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const playersByRole = useMemo(() => {
    if (!analysis?.players) return { tanks: [], healers: [], dps: [] };
    return {
      tanks: analysis.players.filter(p => p.role === 'tank').sort((a, b) => b.dps - a.dps),
      healers: analysis.players.filter(p => p.role === 'healer').sort((a, b) => b.hps - a.hps),
      dps: analysis.players.filter(p => p.role === 'dps').sort((a, b) => b.dps - a.dps)
    };
  }, [analysis?.players]);

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
      setAnalysis(generateAnalysis(fight, historicalFights));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to analyze fight', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalysis = (fight: any, historicalFights: any[] = []): AnalysisResult => {
    const players = fight.players || [];
    const fightDuration = Math.max(1, Number(fight.duration || 1));
    const timelineDeaths = fight.timeline?.filter((e: any) => e.type === 'death') || [];
    const directDeaths = Array.isArray(fight.deaths) ? fight.deaths : [];
    const deaths = timelineDeaths.length > 0 ? timelineDeaths : directDeaths;
    const currentReportFight = report?.fights?.find((f) => f.id === fight.id);
    const sameBossHistory = historicalFights
      .filter((f: any) => f?.bossName === fight.bossName && f?.id !== fight.id)
      .sort((a: any, b: any) => b.id - a.id);
    const previousSameBossPulls = report?.fights
      ?.filter((f) => f.bossName === fight.bossName && f.id !== fight.id) || [];
    const comparedPull = [...sameBossHistory, ...previousSameBossPulls]
      .sort((a: any, b: any) => {
        const aHp = a.kill ? 0 : (a.bossHPPercent ?? 100);
        const bHp = b.kill ? 0 : (b.bossHPPercent ?? 100);
        if (aHp !== bHp) return aHp - bHp;
        if ((a.duration ?? 0) !== (b.duration ?? 0)) return (a.duration ?? 0) - (b.duration ?? 0);
        return (b.id ?? 0) - (a.id ?? 0);
      })[0];
    
    // Check if we have any valid player data
    const hasValidPlayerData = players.some((p: any) => 
      (p.dps > 0) || (p.hps > 0) || (p.totalDamage > 0) || (p.totalHealing > 0)
    );
    
    // If no valid data, return early with appropriate indicators
    if (!hasValidPlayerData && players.length > 0) {
      console.warn('[ANALYSIS] No valid player data found - returning N/A state');
    }
    
    const playerStats: PlayerStats[] = players.map((player: any) => {
      const derivedDps = Number(player.dps || 0) > 0
        ? Number(player.dps)
        : Math.round(Number(player.totalDamage || 0) / fightDuration);
      const derivedHps = Number(player.hps || 0) > 0
        ? Number(player.hps)
        : Math.round(Number(player.totalHealing || 0) / fightDuration);
      const normalizedActiveTime = Number(player.activeTime || 0) > 1
        ? Number(player.activeTime)
        : Math.round(Number(player.activeTime || 0) * 100);
      const missingConsumablesPenalty = (player.flaskUsed ? 0 : 5) + (player.foodUsed ? 0 : 5) + (player.potionUsed ? 0 : 5) + (player.runeUsed ? 0 : 3);
      const reliabilityScore = Math.max(
        0,
        Math.min(
          100,
          100
          - ((player.deaths || 0) * 20)
          - Math.max(0, 95 - (normalizedActiveTime || 95))
          - missingConsumablesPenalty
          - Math.min(20, Math.floor((player.avoidableDamagePercent || player.avoidableDamageTaken || 0) / 5))
        )
      );

      return {
      name: player.name,
      class: player.class,
      spec: player.spec,
      role: player.role,
      dps: derivedDps,
      hps: derivedHps,
      rankPercent: player.rankPercent || 0,
      itemLevel: player.itemLevel || 480,
      server: player.server || 'unknown',
      flaskUsed: player.flaskUsed ?? true,
      foodUsed: player.foodUsed ?? true,
      potionUsed: player.potionUsed ?? true,
      runeUsed: player.runeUsed ?? false,
      activeTime: normalizedActiveTime || 95,
      deaths: player.deaths || 0,
      dtps: player.dtps || 0,
      avoidableDamageTaken: player.avoidableDamageTaken || player.avoidableDamagePercent || 0,
      reliabilityScore,
      improvementFocus: diagnoseLowDPS(player),
      };
    });

    const avoidableDeaths: AnalyzedDeath[] = [];
    const unavoidableDeaths: AnalyzedDeath[] = [];
    
    deaths.forEach((death: any) => {
      const isAvoidable = guessIfAvoidable(death.ability || 'Unknown');
      const analyzed: AnalyzedDeath = {
        player: death.target || 'Unknown',
        ability: death.ability || 'Unknown',
        time: death.time,
        avoidable: isAvoidable,
        phase: getPhaseAtTime(death.time, fight.duration),
        tip: getTipForAbility(death.ability || 'Unknown'),
        impact: death.time > fight.duration * 0.7 ? 'high' : death.time > fight.duration * 0.4 ? 'medium' : 'low',
      };
      if (isAvoidable) avoidableDeaths.push(analyzed);
      else unavoidableDeaths.push(analyzed);
    });

    const repeatedMistakesMap = new Map<string, { occurrences: number; pulls: Set<number | string> }>();
    const registerAvoidableDeath = (player: string, ability: string, pullId: number | string) => {
      const key = `${player}::${ability}`;
      const entry = repeatedMistakesMap.get(key) || { occurrences: 0, pulls: new Set<number | string>() };
      entry.occurrences += 1;
      entry.pulls.add(pullId);
      repeatedMistakesMap.set(key, entry);
    };

    avoidableDeaths.forEach((death) => {
      registerAvoidableDeath(death.player, death.ability, fight.id);
    });

    historicalFights
      .filter((f: any) => f?.bossName === fight.bossName)
      .slice(0, 5)
      .forEach((historicalFight: any) => {
        const historicalDeaths = (historicalFight.timeline || []).filter((e: any) => e.type === 'death');
        historicalDeaths.forEach((death: any) => {
          const ability = death.ability || 'Unknown';
          const player = death.target || death.playerName || 'Unknown';
          if (guessIfAvoidable(ability)) {
            registerAvoidableDeath(player, ability, historicalFight.id ?? 'unknown');
          }
        });
      });

    const repeatedMistakes: RepeatedMistake[] = Array.from(repeatedMistakesMap.entries())
      .filter(([, value]) => value.pulls.size >= 2)
      .map(([key, value]) => {
        const [player, ability] = key.split('::');
        return { player, ability, count: value.occurrences };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // NEW: Generate Death Cascade Analysis
    const deathCascade = generateDeathCascade(deaths, players, fight);

    const dpsPlayersSorted = [...playerStats]
      .filter((p) => p.role === 'dps')
      .sort((a, b) => b.dps - a.dps);
    dpsPlayersSorted.forEach((p, idx) => {
      if (!p.rankPercent || p.rankPercent <= 0) {
        p.rankPercent = Math.round((1 - idx / Math.max(1, dpsPlayersSorted.length - 1)) * 100);
      }
    });

    const lowPerformers: PerformanceIssue[] = [];
    let totalDPS = 0;
    let totalHPS = 0;
    
    players.forEach((player: any) => {
      const effectiveDps = Number(player.dps || 0) > 0
        ? Number(player.dps)
        : Math.round(Number(player.totalDamage || 0) / fightDuration);
      const effectiveHps = Number(player.hps || 0) > 0
        ? Number(player.hps)
        : Math.round(Number(player.totalHealing || 0) / fightDuration);
      totalDPS += effectiveDps;
      totalHPS += effectiveHps;
      const expectedDPS = getExpectedDPS(player.spec || player.class);
      if (effectiveDps < expectedDPS * 0.8 && player.role === 'dps') {
        lowPerformers.push({
          player: player.name,
          class: player.class,
          expectedDPS,
          actualDPS: effectiveDps,
          gap: expectedDPS - effectiveDps,
          reason: diagnoseLowDPS(player),
        });
      }
    });

    const missingFlask: string[] = [];
    const missingFood: string[] = [];
    const missingPotion: string[] = [];
    const missingRune: string[] = [];
    let estimatedDPSLoss = 0;

    players.forEach((player: any) => {
      if (!player.flaskUsed) { missingFlask.push(player.name); estimatedDPSLoss += 50000; }
      if (!player.foodUsed) { missingFood.push(player.name); estimatedDPSLoss += 25000; }
      if (!player.potionUsed) { missingPotion.push(player.name); estimatedDPSLoss += 80000; }
      if (!player.runeUsed) { missingRune.push(player.name); estimatedDPSLoss += 30000; }
    });

    const presentClasses = new Set(players.map((p: any) => p.class));
    const raidBuffs: RaidBuff[] = [
      { name: 'Bloodlust', present: presentClasses.has('Shaman') || presentClasses.has('Mage') || presentClasses.has('Evoker'), source: players.find((p: any) => ['Shaman', 'Mage', 'Evoker'].includes(p.class))?.name, missingImpact: '+30% haste' },
      { name: 'Fortitude', present: presentClasses.has('Priest'), source: players.find((p: any) => p.class === 'Priest')?.name, missingImpact: '+10% stamina' },
      { name: 'Battle Shout', present: presentClasses.has('Warrior'), source: players.find((p: any) => p.class === 'Warrior')?.name, missingImpact: '+10% AP' },
      { name: 'Arcane Intellect', present: presentClasses.has('Mage'), source: players.find((p: any) => p.class === 'Mage')?.name, missingImpact: '+10% intellect' },
      { name: 'Mark of the Wild', present: presentClasses.has('Druid'), source: players.find((p: any) => p.class === 'Druid')?.name, missingImpact: '+5% stats' },
      { name: 'Chaos Brand', present: presentClasses.has('Demon Hunter'), source: players.find((p: any) => p.class === 'Demon Hunter')?.name, missingImpact: '+5% magic dmg' },
      { name: 'Mystic Touch', present: presentClasses.has('Monk'), source: players.find((p: any) => p.class === 'Monk')?.name, missingImpact: '+5% phys dmg' },
    ];

    const expectedRaidDps = Math.max(
      1,
      players
        .filter((p: any) => p.role === 'dps')
        .reduce((sum: number, p: any) => sum + getExpectedDPS(p.spec || p.class), 0)
    );
    const optimalTime = expectedRaidDps > 0 ? Math.floor((expectedRaidDps * fightDuration) / Math.max(1, totalDPS)) : fightDuration;
    const timeSaved = fight.duration - optimalTime;

    const whyWiped: string[] = [];
    let fightEfficiency: { actualTime: number; optimalTime: number; timeSaved: number; dpsLoss: number } | undefined;

    if (!fight.kill) {
      if (deathCascade && deathCascade.rootDeath) {
        whyWiped.push(`${deathCascade.rootDeath.player} morreu cedo (${formatTime(deathCascade.rootDeath.time)}) iniciando cadeia de mortes`);
      }
      if (fight.bossHPPercent && fight.bossHPPercent > 20) whyWiped.push(`Boss em ${fight.bossHPPercent}% HP`);
      if (estimatedDPSLoss > 300000) whyWiped.push(`~${formatNumber(estimatedDPSLoss)} DPS perdido`);
      if (lowPerformers.length > 2) whyWiped.push(`${lowPerformers.length} players abaixo do esperado`);
      if (whyWiped.length === 0) whyWiped.push('Quase lá! Pequenos ajustes necessários');
    } else {
      fightEfficiency = {
        actualTime: fight.duration,
        optimalTime: Math.max(30, optimalTime),
        timeSaved: Math.max(0, timeSaved),
        dpsLoss: estimatedDPSLoss,
      };
    }

    // Calculate DPS score - based on how much of required DPS was met
    // A good raid should meet or exceed required DPS
    const dpsRatio = totalDPS / expectedRaidDps;
    const dpsScore = Math.min(100, Math.max(0, Math.floor(dpsRatio * 100)));
    
    // Survival score - based on deaths (0 deaths = 100, each death reduces)
    const totalDeaths = deaths.length;
    const survivalScore = Math.max(0, 100 - totalDeaths * 10);
    
    // Mechanics score - based on avoidable deaths (each avoidable death reduces more)
    const mechanicsScore = Math.max(0, 100 - avoidableDeaths.length * 15);
    
    // Consumables score - based on how many players are missing consumables
    const missingConsumablesCount = missingFlask.length + missingFood.length + missingPotion.length + missingRune.length;
    const consumablesScore = Math.max(0, 100 - (missingConsumablesCount * 3));
    
    // Overall score - weighted average
    const overallScore = Math.floor(dpsScore * 0.35 + survivalScore * 0.30 + mechanicsScore * 0.25 + consumablesScore * 0.10);
    const averageReliability = playerStats.length > 0
      ? Math.floor(playerStats.reduce((sum, p) => sum + (p.reliabilityScore || 0), 0) / playerStats.length)
      : 0;
    
    // Grade based on overall score
    let grade = 'C';
    if (overallScore >= 95) grade = 'S';
    else if (overallScore >= 85) grade = 'A';
    else if (overallScore >= 70) grade = 'B';
    else if (overallScore >= 55) grade = 'C';
    else if (overallScore >= 40) grade = 'D';
    else grade = 'F';

    const keyIssues: Issue[] = [];
    avoidableDeaths.slice(0, 3).forEach((death) => {
      keyIssues.push({
        type: 'death',
        severity: death.impact === 'high' ? 'critical' : 'warning',
        message: `${death.player} died to ${death.ability}`,
        details: `At ${formatTime(death.time)} (${death.phase})`,
        player: death.player,
        suggestion: death.tip,
      });
    });

    // NEW: Generate Cooldown Gap Analysis
    const cooldownGaps = generateCooldownGaps(fight, players);

    // NEW: Generate Burst Window Analysis
    const burstWindows = generateBurstWindows(fight, players);

    const comparedPullDeaths = (comparedPull as any)?.summary?.deaths;
    const currentDeaths = fight.summary?.deaths;
    const pullDelta: PullDelta | undefined = comparedPull && currentReportFight ? {
      comparedPullId: comparedPull.id,
      bossHPDelta: (comparedPull.bossHPPercent ?? 100) - (currentReportFight.bossHPPercent ?? 100),
      durationDelta: currentReportFight.duration - comparedPull.duration,
      deathsDelta: typeof currentDeaths === 'number' && typeof comparedPullDeaths === 'number'
        ? currentDeaths - comparedPullDeaths
        : undefined,
      trend: (currentReportFight.bossHPPercent ?? 100) < (comparedPull.bossHPPercent ?? 100) ? 'better'
        : (currentReportFight.bossHPPercent ?? 100) > (comparedPull.bossHPPercent ?? 100) ? 'worse'
        : 'same',
    } : undefined;

    const wipeCause: AnalysisResult['wipeCause'] = (() => {
      if (fight.kill) return { primary: 'mixed', details: 'Fight finalizada com kill.' };
      if (cooldownGaps.length >= 2) return { primary: 'cooldown_gap', details: 'Picos de dano sem cobertura adequada de cooldowns de raid.' };
      if (avoidableDeaths.length >= Math.max(2, deaths.length * 0.5)) return { primary: 'mechanics', details: 'Muitas mortes evitáveis em mecânicas-chave.' };
      if (lowPerformers.length >= 3 || (fight.bossHPPercent ?? 100) > 20) return { primary: 'throughput', details: 'Dano/heal efetivo abaixo da exigência para o checkpoint do boss.' };
      return { primary: 'mixed', details: 'Wipe por combinação de execução, throughput e timings.' };
    })();

    const topAvoidableAbility = (() => {
      const abilityCounts = new Map<string, { count: number; players: Set<string> }>();
      avoidableDeaths.forEach((death) => {
        const key = death.ability || 'Mecânica desconhecida';
        const entry = abilityCounts.get(key) || { count: 0, players: new Set<string>() };
        entry.count += 1;
        entry.players.add(death.player);
        abilityCounts.set(key, entry);
      });
      return Array.from(abilityCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)[0];
    })();

    const healerNames = playerStats
      .filter((p) => p.role === 'healer')
      .map((p) => p.name)
      .slice(0, 2);

    const topThroughputPlayers = lowPerformers
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2)
      .map((p) => p.player);

    const nextPullActions: NextPullAction[] = [
      {
        priority: 1,
        title: topAvoidableAbility
          ? `Corrigir mecânica: ${topAvoidableAbility[0]}`
          : 'Executar pull limpo sem mortes no early',
        owner: topAvoidableAbility
          ? Array.from(topAvoidableAbility[1].players).slice(0, 3).join(', ')
          : 'Raid inteira',
        reason: topAvoidableAbility
          ? `${topAvoidableAbility[1].count} morte(s) evitável(is) ligadas a essa mecânica.`
          : 'Sem wipe mecânico dominante, foco em consistência.',
      },
      {
        priority: 2,
        title: cooldownGaps.length > 0
          ? `Cobrir gap de CD em ${formatTime(cooldownGaps[0].time)}`
          : 'Sincronizar CDs de cura para picos da luta',
        owner: healerNames.length > 0 ? healerNames.join(', ') : 'Healers + RL',
        reason: cooldownGaps.length > 0
          ? `${cooldownGaps.length} gap(s) sem CD identificado(s).`
          : 'Evita colapso de raid HP em janelas críticas.',
      },
      {
        priority: 3,
        title: topThroughputPlayers.length > 0
          ? `Melhorar throughput de ${topThroughputPlayers.join(' + ')}`
          : 'Otimizar uptime e burst window',
        owner: topThroughputPlayers.length > 0 ? topThroughputPlayers.join(', ') : 'DPS Core',
        reason: lowPerformers.length > 0
          ? `Gap total estimado de ${formatNumber(lowPerformers.slice(0, 2).reduce((sum, p) => sum + p.gap, 0))} DPS entre os principais underperformers.`
          : 'Ganho incremental de kill chance em boss HP baixo.',
      },
    ];

    const explicitPhases = (fight.timeline || [])
      .filter((e: any) => e.type === 'phase' && typeof e.time === 'number')
      .sort((a: any, b: any) => a.time - b.time);

    const phaseBoundaries = explicitPhases.length > 0
      ? explicitPhases.map((phaseEvent: any, index: number) => ({
          label: phaseEvent.description || `P${index + 1}`,
          start: phaseEvent.time,
          end: explicitPhases[index + 1]?.time ?? fight.duration,
        }))
      : [
          { label: 'P1', start: 0, end: Math.floor(fight.duration / 3) },
          { label: 'P2', start: Math.floor(fight.duration / 3), end: Math.floor((fight.duration * 2) / 3) },
          { label: 'P3', start: Math.floor((fight.duration * 2) / 3), end: fight.duration },
        ];

    const phaseCausality = phaseBoundaries.map((phase) => {
      const phaseDeaths = deaths.filter((d: any) => (d.time || 0) >= phase.start && (d.time || 0) < phase.end);
      const phaseAvoidable = phaseDeaths.filter((d: any) => guessIfAvoidable(String(d.ability || 'Unknown')));
      const phaseGaps = cooldownGaps.filter((g) => g.time >= phase.start && g.time < phase.end);
      const dominantCause: 'mechanics' | 'throughput' | 'cooldown_gap' | 'stable' =
        phaseAvoidable.length >= 2
          ? 'mechanics'
          : phaseGaps.length > 0
            ? 'cooldown_gap'
            : (phaseDeaths.length > 0 && lowPerformers.length >= 2)
              ? 'throughput'
              : 'stable';

      return {
        phase: phase.label,
        start: phase.start,
        end: phase.end,
        deaths: phaseDeaths.length,
        avoidableDeaths: phaseAvoidable.length,
        dominantCause,
      };
    });

    const lastFiveSameBoss = sameBossHistory.slice(0, 5);
    const historicalMetrics = lastFiveSameBoss.map((f: any) => {
      const timelineDeaths = (f.timeline || []).filter((e: any) => e.type === 'death');
      const directDeaths = Array.isArray(f.deaths) ? f.deaths : [];
      const fDeaths = timelineDeaths.length > 0 ? timelineDeaths : directDeaths;
      const fAvoidable = fDeaths.filter((d: any) => guessIfAvoidable(String(d.ability || 'Unknown')));
      return {
        deaths: Number(f.summary?.deaths ?? fDeaths.length ?? 0),
        avoidable: fAvoidable.length,
        duration: Number(f.duration || 0),
        hasTimeline: timelineDeaths.length > 0,
      };
    });

    const historicalMetricsWithSignal = historicalMetrics.filter((m) =>
      m.deaths > 0 || m.avoidable > 0 || m.duration > 0 || m.hasTimeline
    );

    const pullTrend = historicalMetricsWithSignal.length > 0
      ? {
          sampleSize: historicalMetricsWithSignal.length,
          avgDeathsPrev: Math.round((historicalMetricsWithSignal.reduce((s, m) => s + m.deaths, 0) / historicalMetricsWithSignal.length) * 10) / 10,
          avgAvoidablePrev: Math.round((historicalMetricsWithSignal.reduce((s, m) => s + m.avoidable, 0) / historicalMetricsWithSignal.length) * 10) / 10,
          avgDurationPrev: Math.round(historicalMetricsWithSignal.reduce((s, m) => s + m.duration, 0) / historicalMetricsWithSignal.length),
          currentDeaths: Number(fight.summary?.deaths || deaths.length || 0),
          currentAvoidableDeaths: avoidableDeaths.length,
          currentDuration: Number(fight.duration || 0),
        }
      : undefined;

    const scoreRoleGroup = (role: 'tank' | 'healer' | 'dps') => {
      const rolePlayers = playerStats.filter((p) => p.role === role);
      if (rolePlayers.length === 0) return 0;
      const avgReliability = rolePlayers.reduce((s, p) => s + (p.reliabilityScore || 0), 0) / rolePlayers.length;
      const deathsPenalty = rolePlayers.reduce((s, p) => s + (p.deaths || 0), 0) * 6;
      return Math.max(0, Math.min(100, Math.round(avgReliability - deathsPenalty)));
    };

    const roleScoresRaw = {
      tanks: scoreRoleGroup('tank'),
      healers: scoreRoleGroup('healer'),
      dps: scoreRoleGroup('dps'),
    };
    const roleScores = Object.values(roleScoresRaw).some((score) => score > 0)
      ? roleScoresRaw
      : undefined;

    const mechanicScores = (() => {
      const map = new Map<string, number>();
      avoidableDeaths.forEach((death) => {
        map.set(death.ability, (map.get(death.ability) || 0) + 1);
      });
      const interruptCount = (fight.timeline || []).filter((e: any) => e.type === 'interrupt').length;
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([mechanic, events]) => ({
          mechanic,
          events,
          severity: events >= 3 ? 'critical' as const : 'warning' as const,
          score: Math.max(0, 100 - events * 18),
        }))
        .concat([
          {
            mechanic: 'Interrupts',
            events: interruptCount,
            severity: interruptCount === 0 ? 'critical' as const : 'warning' as const,
            score: Math.min(100, interruptCount * 10),
          },
        ]);
    })();

    const regressionAlerts = (() => {
      if (historicalMetrics.length < 3) return [];
      const recent3 = historicalMetrics.slice(0, 3);
      const avgRecentDeaths = recent3.reduce((s, m) => s + m.deaths, 0) / recent3.length;
      const avgRecentAvoidable = recent3.reduce((s, m) => s + m.avoidable, 0) / recent3.length;
      const alerts: string[] = [];
      if ((fight.summary?.deaths || deaths.length) > avgRecentDeaths + 1) {
        alerts.push(`Regressão de mortes: atual ${(fight.summary?.deaths || deaths.length)} vs média recente ${avgRecentDeaths.toFixed(1)}.`);
      }
      if (avoidableDeaths.length > avgRecentAvoidable + 1) {
        alerts.push(`Regressão de mecânica: avoidable atual ${avoidableDeaths.length} vs média recente ${avgRecentAvoidable.toFixed(1)}.`);
      }
      if (!fight.kill && (fight.bossHPPercent ?? 100) > 20 && historicalFights.some((f: any) => f?.bossName === fight.bossName && f?.kill)) {
        alerts.push('Houve kill anterior no mesmo boss e o pull atual voltou para wipe alto de HP.');
      }
      return alerts.slice(0, 3);
    })();

    const bestPullChanges = (() => {
      const comparisonPool = !fight.kill
        ? sameBossHistory.filter((f: any) => !f.kill)
        : sameBossHistory;
      const bestFight = comparisonPool
        .slice()
        .sort((a: any, b: any) => {
          const aHp = a.kill ? 0 : (a.bossHPPercent ?? 100);
          const bHp = b.kill ? 0 : (b.bossHPPercent ?? 100);
          if (aHp !== bHp) return aHp - bHp;
          return (a.duration ?? 0) - (b.duration ?? 0);
        })[0];

      if (!bestFight) return [];

      const bestDeaths = Number(bestFight.summary?.deaths || (bestFight.timeline || []).filter((e: any) => e.type === 'death').length || 0);
      const currentDeathsCount = Number(fight.summary?.deaths || deaths.length || 0);
      const bestAvoidable = (bestFight.timeline || [])
        .filter((e: any) => e.type === 'death' && guessIfAvoidable(e.ability || 'Unknown')).length;

      const changes: string[] = [];
      if (currentDeathsCount > bestDeaths) {
        changes.push(`+${currentDeathsCount - bestDeaths} mortes vs best pull (#${bestFight.id}).`);
      } else if (currentDeathsCount < bestDeaths) {
        changes.push(`-${bestDeaths - currentDeathsCount} mortes vs best pull (#${bestFight.id}).`);
      }

      if (avoidableDeaths.length > bestAvoidable) {
        changes.push(`+${avoidableDeaths.length - bestAvoidable} mortes evitáveis vs best pull.`);
      } else if (avoidableDeaths.length < bestAvoidable) {
        changes.push(`-${bestAvoidable - avoidableDeaths.length} mortes evitáveis vs best pull.`);
      }

      if ((fight.duration || 0) > (bestFight.duration || 0)) {
        changes.push(`Pull ${fight.duration - bestFight.duration}s mais lento que o best pull.`);
      } else if ((fight.duration || 0) < (bestFight.duration || 0)) {
        changes.push(`Pull ${bestFight.duration - fight.duration}s mais rápido que o best pull.`);
      }

      return changes.slice(0, 4);
    })();

    const cooldownPlanner = (() => {
      const entries = cooldownGaps
        .slice(0, 5)
        .map((gap) => {
          const phase = phaseCausality.find((p) => gap.time >= p.start && gap.time < p.end);
          return {
            at: gap.time,
            phase: phase?.phase || 'Unknown',
            action: gap.severity === 'critical' ? 'Usar CD defensivo maior' : 'Cobrir com CD de cura',
            owner: healerNames.length > 0 ? healerNames.join(', ') : 'Healers + RL',
            reason: `${Math.round(gap.damageTaken / 1000)}k de dano sem cobertura.`,
          };
        });
      return entries;
    })();

    const assignmentBreaks = (() => {
      const breaks = new Map<string, { owner: string; failure: string; count: number }>();

      const addBreak = (owner: string, failure: string) => {
        const key = `${owner}::${failure}`;
        const current = breaks.get(key) || { owner, failure, count: 0 };
        current.count += 1;
        breaks.set(key, current);
      };

      // repeated avoidable deaths = likely assignment execution break
      repeatedMistakes.forEach((m) => {
        addBreak(m.player, `Falha repetida em ${m.ability}`);
      });

      // interrupt events are expected in many fights; detect players with zero interrupts among DPS/melee
      const interrupters = new Set(
        (fight.timeline || [])
          .filter((e: any) => e.type === 'interrupt' && (e.source || e.sourceName))
          .map((e: any) => e.source || e.sourceName)
      );
      playerStats
        .filter((p) => p.role === 'dps')
        .slice(0, 8)
        .forEach((p) => {
          if (!interrupters.has(p.name)) {
            addBreak(p.name, 'Sem interrupções registradas no pull');
          }
        });

      return Array.from(breaks.values()).sort((a, b) => b.count - a.count).slice(0, 6);
    })();

    const killProbability = (() => {
      const hpRemaining = fight.bossHPPercent ?? (fight.kill ? 0 : 100);
      const deathPenalty = Math.min(35, (fight.summary?.deaths || deaths.length || 0) * 3);
      const avoidablePenalty = Math.min(30, avoidableDeaths.length * 4);
      const cooldownPenalty = Math.min(20, cooldownGaps.length * 5);
      const base = fight.kill ? 100 : Math.max(0, 100 - hpRemaining);
      return Math.max(0, Math.min(100, Math.round(base - deathPenalty - avoidablePenalty - cooldownPenalty + (fight.kill ? 0 : 20))));
    })();

    const bossProgression = (() => {
      if (!report?.fights || !fight?.bossName) return [];
      return report.fights
        .filter((f) => f.bossName === fight.bossName)
        .sort((a, b) => a.id - b.id)
        .map((f) => ({
          pullId: f.id,
          hpRemaining: f.kill ? 0 : (f.bossHPPercent ?? 100),
          duration: f.duration,
          kill: f.kill,
        }));
    })();

    const internalBenchmark = (() => {
      if (!bossProgression.length || !currentReportFight) return undefined;
      const sorted = [...bossProgression].sort((a, b) => {
        if (a.hpRemaining !== b.hpRemaining) return a.hpRemaining - b.hpRemaining;
        return a.duration - b.duration;
      });
      const idx = sorted.findIndex((p) => p.pullId === currentReportFight.id);
      if (idx === -1) return undefined;
      const rank = idx + 1;
      const total = sorted.length;
      const percentile = Math.round((1 - idx / Math.max(1, total - 1)) * 100);
      return { rank, total, percentile };
    })();

    const hasPhaseSignal = phaseCausality.some((phase) => phase.deaths > 0 || phase.avoidableDeaths > 0 || phase.dominantCause !== 'stable');

    return {
      summary: {
        killPotential: fight.kill || (fight.bossHPPercent && fight.bossHPPercent < 10),
        whyWiped,
        keyIssues: keyIssues.slice(0, 5),
        fightEfficiency,
      },
      deaths: { avoidable: avoidableDeaths, unavoidable: unavoidableDeaths },
      performance: {
        raidDPS: totalDPS,
        raidHPS: totalHPS,
        requiredDPS: Math.floor(expectedRaidDps),
        dpsGap: lowPerformers.reduce((s, p) => s + p.gap, 0),
        lowPerformers: lowPerformers.sort((a, b) => b.gap - a.gap).slice(0, 5),
      },
      players: playerStats.sort((a, b) => b.dps - a.dps),
      consumables: { missingFlask, missingFood, missingPotion, missingRune, estimatedDPSLoss },
      raidBuffs,
      cooldowns: { defensives: [], raidCooldowns: [] },
      talents: [],
      raidEfficiency: { overall: overallScore, dps: dpsScore, survival: survivalScore, mechanics: mechanicsScore, consumables: consumablesScore, grade },
      bossInsight: {
        dpsCheckMet: totalDPS >= expectedRaidDps,
        healingIntensity: totalHPS > 2000000 ? 'high' : totalHPS > 1000000 ? 'medium' : 'low',
        movementRequired: averageReliability >= 75 ? 'controlado' : 'caótico',
        keyMechanics: avoidableDeaths.slice(0, 3).map(d => ({ name: d.ability, deaths: 1, tip: d.tip })),
      },
      deathCascade,
      cooldownGaps,
      burstWindows,
      nextPullActions,
      pullDelta,
      wipeCause,
      repeatedMistakes,
      phaseCausality: hasPhaseSignal ? phaseCausality : undefined,
      pullTrend,
      roleScores,
      mechanicScores,
      regressionAlerts,
      bestPullChanges,
      cooldownPlanner,
      assignmentBreaks,
      killProbability,
      bossProgression,
      internalBenchmark,
    };
  };

  // NEW: Generate Death Cascade Analysis
  const generateDeathCascade = (deaths: any[], players: any[], fight: any): DeathCascadeAnalysis | undefined => {
    if (deaths.length === 0) return undefined;

    const sortedDeaths = [...deaths].sort((a, b) => (a.time || 0) - (b.time || 0));
    const firstDeath = sortedDeaths[0];
    
    const player = players.find((p: any) => p.name === (firstDeath.target || firstDeath.playerName));
    const role = player?.role || 'dps';
    
    // Determine impact based on role and timing
    const timePercent = (firstDeath.time || 0) / fight.duration;
    let impact: 'critical' | 'high' | 'medium' = 'medium';
    
    if (role === 'tank' || timePercent < 0.3) impact = 'critical';
    else if (role === 'healer' || timePercent < 0.5) impact = 'high';

    // Find chain deaths (deaths within 15 seconds of root death)
    const chainDeaths = sortedDeaths.slice(1)
      .filter((d: any) => (d.time || 0) - (firstDeath.time || 0) <= 15)
      .map((d: any) => {
        const chainPlayer = players.find((p: any) => p.name === (d.target || d.playerName));
        return {
          player: d.target || d.playerName || 'Unknown',
          role: chainPlayer?.role || 'dps',
          ability: d.ability || 'Unknown',
          time: d.time || 0,
          causedByRoot: true,
        };
      });

    // Generate recommendation
    let recommendation = '';
    if (role === 'tank') {
      recommendation = 'Tank swap pode estar atrasado. Verifique defensives e externals.';
    } else if (role === 'healer') {
      recommendation = 'Healer morreu cedo - posicionamento ou uso de CDs pode estar inadequado.';
    } else {
      recommendation = `${firstDeath.target} morreu para ${firstDeath.ability}. ${getTipForAbility(firstDeath.ability || 'Unknown')}`;
    }

    return {
      rootDeath: {
        player: firstDeath.target || firstDeath.playerName || 'Unknown',
        role,
        ability: firstDeath.ability || 'Unknown',
        time: firstDeath.time || 0,
        impact,
      },
      chainDeaths,
      timeToWipe: fight.duration - (firstDeath.time || 0),
      recoveryPossible: chainDeaths.length < 3 && role !== 'tank',
      recommendation,
    };
  };

  // NEW: Generate Cooldown Gap Analysis - Uses REAL data from fight
  const generateCooldownGaps = (fight: any, players: any[]): CooldownGapAnalysis[] => {
    const gaps: CooldownGapAnalysis[] = [];
    const duration = fight.duration;
    const timeline = fight.timeline || [];
    const bossAbilities = fight.bossAbilities || [];
    const raidCdPatterns = [
      'bloodlust',
      'heroism',
      'time warp',
      'tranquility',
      'healing tide',
      'divine hymn',
      'aura mastery',
      'barrier',
      'rallying cry',
      'spirit link',
      'revival',
    ];
    
    // Find damage spikes from boss abilities that hit multiple players
    bossAbilities.forEach((ability: any) => {
      // High damage abilities that should have had a CD
      if (ability.damage > 1500000 && ability.type === 'avoidable') {
        // Check timeline for when this ability was cast
        const abilityEvents = timeline.filter((e: any) => 
          e.type === 'ability' && e.description?.includes(ability.name)
        );
        
        abilityEvents.forEach((event: any) => {
          // Check if any raid CD was used within a short window of this event
          const cdEvents = timeline.filter((e: any) => {
            const text = String(e.description || e.ability || '').toLowerCase();
            const isRaidCdEvent = e.type === 'buff' || e.type === 'cast' || e.type === 'ability';
            return isRaidCdEvent &&
              raidCdPatterns.some((pattern) => text.includes(pattern)) &&
              Math.abs((e.time || 0) - event.time) <= 6;
          });
          
          if (cdEvents.length === 0) {
            gaps.push({
              time: event.time,
              duration: ability.hits > 50 ? 6 : 4,
              damageTaken: ability.damage,
              availableCds: ['Tranquility', 'Healing Tide', 'Divine Hymn', 'Aura Mastery'],
              severity: ability.damage > 2000000 ? 'critical' : 'warning',
            });
          }
        });
      }
    });
    
    // Also check DTPS timeline for spikes without CDs
    const dtpsData = players.reduce((acc: number[], p: any) => {
      if (p.dtpsTimeline) {
        p.dtpsTimeline.forEach((val: number, i: number) => {
          acc[i] = (acc[i] || 0) + val;
        });
      }
      return acc;
    }, []);
    
    if (dtpsData.length > 0) {
      const avgDtps = dtpsData.reduce((a: number, b: number) => a + b, 0) / dtpsData.length;
      const threshold = avgDtps * 1.8;
      
      for (let i = 0; i < dtpsData.length; i++) {
        if (dtpsData[i] > threshold) {
          // Found a spike - check if it's already in gaps
          const existingGap = gaps.find(g => Math.abs(g.time - i) < 10);
          if (!existingGap) {
            gaps.push({
              time: i,
              duration: 3,
              damageTaken: dtpsData[i] * 3,
              availableCds: ['Tranquility', 'Healing Tide', 'Divine Hymn'],
              severity: dtpsData[i] > avgDtps * 2.5 ? 'critical' : 'warning',
            });
          }
        }
      }
    }

    return gaps.sort((a, b) => a.time - b.time).slice(0, 5);
  };

  // NEW: Generate Burst Window Analysis - Uses REAL data from fight
  const generateBurstWindows = (fight: any, players: any[]): BurstWindowAnalysis[] => {
    const windows: BurstWindowAnalysis[] = [];
    const duration = fight.duration;
    const timeline = fight.timeline || [];
    
    // Find bloodlust window from timeline
    const bloodlustEvent = timeline.find((e: any) => 
      e.type === 'bloodlust' || e.description?.toLowerCase().includes('bloodlust') ||
      e.description?.toLowerCase().includes('heroism') || e.description?.toLowerCase().includes('time warp')
    );
    
    if (bloodlustEvent) {
      const bloodlustTime = bloodlustEvent.time;
      const bloodlustDuration = 40;
      
      // Check which DPS had their DPS spike during bloodlust (indicates CD usage)
      const dpsPlayers = players.filter((p: any) => p.role === 'dps');
      const playersWithoutCDs: string[] = [];
      
      dpsPlayers.forEach((player: any) => {
        if (player.dpsTimeline && player.dpsTimeline.length > bloodlustTime + 10) {
          // Check if DPS during bloodlust window is significantly higher than average
          const bloodlustDPS = player.dpsTimeline.slice(bloodlustTime, bloodlustTime + 30);
          const avgBloodlustDPS = bloodlustDPS.reduce((a: number, b: number) => a + b, 0) / bloodlustDPS.length;
          const overallAvg = player.dps;
          
          // If DPS during bloodlust isn't at least 50% higher than average, they might not have used CDs
          if (avgBloodlustDPS < overallAvg * 1.3) {
            playersWithoutCDs.push(player.name);
          }
        }
      });

      windows.push({
        name: 'Bloodlust',
        startTime: bloodlustTime,
        duration: bloodlustDuration,
        playersWithoutCDs,
        efficiency: Math.max(50, 100 - (playersWithoutCDs.length * 8)),
      });
    }
    
    // Execute phase window (last 20% of fight)
    if (!fight.kill && fight.bossHPPercent && fight.bossHPPercent < 30) {
      const executeStart = Math.floor(duration * 0.8);
      
      // Calculate DPS efficiency in execute phase
      const executeDPS = players
        .filter((p: any) => p.role === 'dps' && p.dpsTimeline)
        .reduce((sum: number, p: any) => {
          const executeSlice = p.dpsTimeline.slice(executeStart);
          return sum + (executeSlice.reduce((a: number, b: number) => a + b, 0) / executeSlice.length);
        }, 0);
      
      const avgDPS = players
        .filter((p: any) => p.role === 'dps')
        .reduce((sum: number, p: any) => sum + p.dps, 0);
      
      const efficiency = avgDPS > 0 ? Math.floor((executeDPS / avgDPS) * 100) : 85;
      
      windows.push({
        name: 'Execute Phase',
        startTime: executeStart,
        duration: duration - executeStart,
        playersWithoutCDs: [],
        efficiency: Math.min(100, Math.max(50, efficiency)),
      });
    }

    return windows;
  };

  const copyToClipboard = () => {
    if (!analysis || !fightData) return;
    const text = generateDiscordText(analysis, fightData);
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Analysis copied to clipboard' });
  };

  const copyRaidBrief = () => {
    if (!analysis || !fightData) return;
    const actions = (analysis.nextPullActions || [])
      .map((a) => `${a.priority}. ${a.title} (${a.owner})`)
      .join('\n');
    const phaseChecklist = (analysis.phaseCausality || [])
      .filter((p) => p.dominantCause !== 'stable')
      .map((p) => `- ${p.phase}: ${p.dominantCause} (${p.deaths} deaths, ${p.avoidableDeaths} avoidable)`)
      .join('\n');
    const roleScores = analysis.roleScores
      ? `Tanks ${analysis.roleScores.tanks} | Healers ${analysis.roleScores.healers} | DPS ${analysis.roleScores.dps}`
      : 'N/D';
    const regression = (analysis.regressionAlerts || []).map((a) => `- ${a}`).join('\n');
    const bestPull = (analysis.bestPullChanges || []).map((a) => `- ${a}`).join('\n');
    const cdPlan = (analysis.cooldownPlanner || []).slice(0, 3).map((c) => `- ${formatTime(c.at)} [${c.phase}] ${c.action} (${c.owner})`).join('\n');
    const assignment = (analysis.assignmentBreaks || []).slice(0, 3).map((a) => `- ${a.owner}: ${a.failure} (${a.count}x)`).join('\n');
    const benchmark = analysis.internalBenchmark
      ? `Rank ${analysis.internalBenchmark.rank}/${analysis.internalBenchmark.total} (${analysis.internalBenchmark.percentile}º percentil interno)`
      : 'N/D';
    const brief = [
      `🎯 Raid Brief — ${fightData.bossName}`,
      `Status: ${fightData.kill ? 'KILL' : `WIPE @ ${fightData.bossHP}%`}`,
      `Causa raiz: ${analysis.wipeCause?.primary || 'mixed'}`,
      `Score por role: ${roleScores}`,
      `Kill probability: ${analysis.killProbability ?? 'N/D'}%`,
      `Benchmark interno: ${benchmark}`,
      '',
      'Top 3 ações:',
      actions || '1. Executar fight sem mortes evitáveis',
      '',
      'Checklist por fase:',
      phaseChecklist || '- Sem fase crítica dominante detectada',
      '',
      'Alertas de regressão:',
      regression || '- Sem regressão relevante detectada',
      '',
      'What changed from best pull:',
      bestPull || '- Sem diferenças relevantes detectadas',
      '',
      'Plano de CD (fase):',
      cdPlan || '- Sem gaps críticos de CD detectados',
      '',
      'Assignment breaks:',
      assignment || '- Sem assignment breaks evidentes',
    ].join('\n');
    navigator.clipboard.writeText(brief);
    toast({ title: 'Brief copiado', description: 'Resumo rápido pronto para Discord.' });
  };

  const sendRaidBriefToDiscord = async () => {
    if (!analysis || !fightData) return;
    const actions = (analysis.nextPullActions || [])
      .map((a) => `${a.priority}. ${a.title} (${a.owner})`)
      .join('\n');
    const content = [
      `🎯 Raid Brief — ${fightData.bossName}`,
      `Status: ${fightData.kill ? 'KILL' : `WIPE @ ${fightData.bossHP}%`}`,
      `Causa raiz: ${analysis.wipeCause?.primary || 'mixed'}`,
      '',
      'Top 3 ações:',
      actions || '1. Executar fight sem mortes evitáveis',
    ].join('\n');

    try {
      setIsPostingBrief(true);
      const response = await fetch('/api/raid-brief/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || 'Falha ao enviar brief para Discord');
      }
      toast({ title: 'Brief enviado', description: 'Resumo enviado para o Discord com sucesso.' });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar',
        description: error?.message || 'Não foi possível enviar o brief para Discord.',
        variant: 'destructive',
      });
    } finally {
      setIsPostingBrief(false);
    }
  };

  const generateDiscordText = (analysis: AnalysisResult, fight: FightData) => {
    let text = `**${fight.kill ? 'Fight Analysis' : 'Wipe Analysis'} - ${fight.bossName}**\n`;
    text += `Grade: ${analysis.raidEfficiency?.grade} (${analysis.raidEfficiency?.overall}%)\n\n`;
    
    // Add death cascade info
    if (analysis.deathCascade) {
      text += `**Morte Raiz:** ${analysis.deathCascade.rootDeath.player} aos ${formatTime(analysis.deathCascade.rootDeath.time)}\n`;
      if (analysis.deathCascade.chainDeaths.length > 0) {
        text += `**Cadeia:** ${analysis.deathCascade.chainDeaths.map(d => d.player).join(' → ')}\n`;
      }
      text += `\n`;
    }
    
    if (!fight.kill) {
      text += `**Por que wipeamos:**\n`;
      analysis.summary.whyWiped.forEach(r => { text += `• ${r}\n`; });
    }
    text += `\n_Analisado por WoWtron_`;
    return text;
  };

  return (
    <div className="w-full space-y-5">
      {/* Input Bar */}
      <div className="rounded-2xl border border-dark-700 bg-gradient-to-br from-dark-800/80 to-dark-900/80 p-4 md:p-5">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-tron-silver-200">Warcraft Logs Analyzer</h2>
          <p className="text-sm text-tron-silver-400">Cole URL/código do report para gerar insights de raid call em formato bento.</p>
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
                <div className="flex items-center gap-2 text-sm text-tron-silver-400 mt-1">
                  <span>{fightData.difficulty}</span>
                  <span>•</span>
                  <span>{formatTime(fightData.duration)}</span>
                  {fightData.kill ? (
                    <Badge className="bg-green-500/20 text-green-400 text-xs ml-1">KILL</Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 text-xs ml-1">WIPE @ {fightData.bossHP}%</Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={copyRaidBrief} className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Brief
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendRaidBriefToDiscord}
                    disabled={isPostingBrief}
                    className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold"
                  >
                    {isPostingBrief ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                    Discord
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold">
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
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
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> {showAdvanced ? 'Modo simples' : 'Modo avançado'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="col-span-12 lg:col-span-9 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard icon={<Swords className="h-4 w-4" />} label="Raid DPS" value={formatNumber(analysis.performance.raidDPS)} />
              <StatCard icon={<Heart className="h-4 w-4" />} label="Raid HPS" value={formatNumber(analysis.performance.raidHPS)} />
              <StatCard icon={<Skull className="h-4 w-4" />} label="Deaths" value={String(analysis.deaths.avoidable.length + analysis.deaths.unavoidable.length)} valueClass="text-red-400" />
              <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Avoidable" value={String(analysis.deaths.avoidable.length)} valueClass="text-amber-400" />
              <StatCard icon={<TrendingDown className="h-4 w-4" />} label="DPS Lost" value={formatNumber(analysis.consumables.estimatedDPSLoss)} valueClass="text-orange-400" />
              <StatCard icon={<Users className="h-4 w-4" />} label="Players" value={String(analysis.players.length)} />
              <StatCard
                icon={<Gauge className="h-4 w-4" />}
                label="Avg Reliability"
                value={String(Math.floor(analysis.players.reduce((s, p) => s + (p.reliabilityScore || 0), 0) / Math.max(1, analysis.players.length)))}
                valueClass="text-emerald-400"
              />
            </div>
          )}

          {analysis.repeatedMistakes && analysis.repeatedMistakes.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-red-400" /> Erros repetidos (prioridade de correção)
              </h3>
              <div className="space-y-2">
                {analysis.repeatedMistakes.map((mistake, index) => (
                  <div key={`${mistake.player}-${mistake.ability}-${index}`} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-tron-silver-200">
                      <span className="font-semibold">{mistake.player}</span> morreu para <span className="text-red-400">{mistake.ability}</span> {mistake.count}x
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
                  <AlertCircle className="h-5 w-5 text-amber-400" /> Causa raiz do pull
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
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-tron-silver-500">HP Delta</p>
                    <p className={analysis.pullDelta.bossHPDelta >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {analysis.pullDelta.bossHPDelta >= 0 ? '-' : '+'}{Math.abs(analysis.pullDelta.bossHPDelta)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-tron-silver-500">Tempo</p>
                    <p className="text-tron-silver-200 font-semibold">{analysis.pullDelta.durationDelta > 0 ? '+' : ''}{analysis.pullDelta.durationDelta}s</p>
                  </div>
                  <div>
                    <p className="text-tron-silver-500">Deaths</p>
                    <p className="text-tron-silver-200 font-semibold">
                      {typeof analysis.pullDelta.deathsDelta === 'number'
                        ? `${analysis.pullDelta.deathsDelta > 0 ? '+' : ''}${analysis.pullDelta.deathsDelta}`
                        : 'N/D'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RAID CALL QUICK PLAN */}
          {analysis.nextPullActions && analysis.nextPullActions.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                  <Crown className="h-5 w-5 text-wow-gold" /> Plano do próximo pull (objetivo + dono)
                </h3>
                <div className="space-y-2">
                  {analysis.nextPullActions.map((action) => (
                    <div key={action.priority} className="p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-tron-silver-200">
                          #{action.priority} {action.title}
                        </p>
                        <Badge className="bg-wow-gold/20 text-wow-gold text-xs whitespace-nowrap">{action.owner}</Badge>
                      </div>
                      <p className="text-xs text-tron-silver-400 mt-1">{action.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                <h3 className="text-base font-semibold text-tron-silver-200 mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-cyan-400" /> Resumo executivo
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">Causa principal</p>
                    <p className="text-tron-silver-200 font-medium">{analysis.wipeCause?.details || 'Sem causa dominante detectada.'}</p>
                  </div>
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">Mortes evitáveis</p>
                    <p className="text-tron-silver-200 font-medium">{analysis.deaths.avoidable.length} no pull atual</p>
                  </div>
                  <div className="p-2 rounded-md bg-dark-700/50 border border-dark-600">
                    <p className="text-tron-silver-400 text-xs">Gap de DPS estimado</p>
                    <p className="text-tron-silver-200 font-medium">{formatNumber(analysis.performance.dpsGap)} total</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {analysis.repeatedMistakes && analysis.repeatedMistakes.length > 0 && (
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-red-400" /> Erros repetidos (prioridade de correção)
              </h3>
              <div className="space-y-2">
                {analysis.repeatedMistakes.map((mistake, index) => (
                  <div key={`${mistake.player}-${mistake.ability}-${index}`} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-tron-silver-200">
                      <span className="font-semibold">{mistake.player}</span> morreu para <span className="text-red-400">{mistake.ability}</span> {mistake.count}x
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
                  <AlertCircle className="h-5 w-5 text-amber-400" /> Causa raiz do pull
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
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-tron-silver-500">HP Delta</p>
                    <p className={analysis.pullDelta.bossHPDelta >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {analysis.pullDelta.bossHPDelta >= 0 ? '-' : '+'}{Math.abs(analysis.pullDelta.bossHPDelta)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-tron-silver-500">Tempo</p>
                    <p className="text-tron-silver-200 font-semibold">{analysis.pullDelta.durationDelta > 0 ? '+' : ''}{analysis.pullDelta.durationDelta}s</p>
                  </div>
                  <div>
                    <p className="text-tron-silver-500">Deaths</p>
                    <p className="text-tron-silver-200 font-semibold">
                      {typeof analysis.pullDelta.deathsDelta === 'number'
                        ? `${analysis.pullDelta.deathsDelta > 0 ? '+' : ''}${analysis.pullDelta.deathsDelta}`
                        : 'N/D'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(analysis.phaseCausality || analysis.pullTrend || analysis.roleScores) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {analysis.phaseCausality && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Clock4 className="h-5 w-5 text-indigo-400" /> Causalidade por fase
                  </h3>
                  <div className="space-y-2">
                    {analysis.phaseCausality.map((phase) => (
                      <div key={phase.phase} className="rounded-md bg-dark-700/40 p-2 text-xs">
                        <div className="flex items-center justify-between text-tron-silver-200">
                          <span className="font-semibold">{phase.phase} ({formatTime(phase.start)}-{formatTime(phase.end)})</span>
                          <Badge className="bg-indigo-500/20 text-indigo-300">{phase.dominantCause}</Badge>
                        </div>
                        <p className="text-tron-silver-400 mt-1">
                          Deaths: {phase.deaths} • Avoidable: {phase.avoidableDeaths}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.pullTrend && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-400" /> Delta últimos pulls
                  </h3>
                  <p className="text-xs text-tron-silver-400 mb-2">Base: últimos {analysis.pullTrend.sampleSize} pulls do mesmo boss</p>
                  {analysis.pullTrend.currentDeaths === 0 && analysis.pullTrend.avgDeathsPrev === 0 && analysis.pullTrend.currentAvoidableDeaths === 0 && analysis.pullTrend.avgAvoidablePrev === 0 ? (
                    <p className="text-sm text-tron-silver-300">
                      Sem sinal útil de morte/erro mecânico no histórico recente (dados de deaths muito baixos ou ausentes).
                    </p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <p className="text-tron-silver-300">Deaths: <span className="font-semibold">{analysis.pullTrend.currentDeaths}</span> vs média <span className="font-semibold">{analysis.pullTrend.avgDeathsPrev}</span></p>
                      <p className="text-tron-silver-300">Avoidable: <span className="font-semibold">{analysis.pullTrend.currentAvoidableDeaths}</span> vs média <span className="font-semibold">{analysis.pullTrend.avgAvoidablePrev}</span></p>
                      <p className="text-tron-silver-300">Tempo: <span className="font-semibold">{analysis.pullTrend.currentDuration}s</span> vs média <span className="font-semibold">{analysis.pullTrend.avgDurationPrev}s</span></p>
                    </div>
                  )}
                </div>
              )}

              {analysis.roleScores && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" /> Score por role
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
                    <Target className="h-5 w-5 text-rose-400" /> Score por mecânica crítica
                  </h3>
                  <div className="space-y-2">
                    {analysis.mechanicScores.map((m) => (
                      <div key={m.mechanic} className="rounded-md bg-dark-700/40 p-2 text-sm flex items-center justify-between">
                        <div>
                          <p className="text-tron-silver-200 font-medium">{m.mechanic}</p>
                          <p className="text-xs text-tron-silver-400">{m.events} ocorrência(s)</p>
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
                    <AlertTriangle className="h-5 w-5 text-orange-400" /> Alertas de regressão (P2)
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

          {showAdvanced && ((analysis.cooldownPlanner && analysis.cooldownPlanner.length > 0) || (analysis.assignmentBreaks && analysis.assignmentBreaks.length > 0) || typeof analysis.killProbability === 'number' || analysis.internalBenchmark) ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {typeof analysis.killProbability === 'number' && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-lime-400" /> Kill Probability
                  </h3>
                  <p className="text-3xl font-bold text-lime-400">{analysis.killProbability}%</p>
                  <p className="text-xs text-tron-silver-400 mt-1">Estimativa baseada em HP, mortes, mecânicas evitáveis e gaps de CD.</p>
                </div>
              )}

              {analysis.internalBenchmark && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Medal className="h-5 w-5 text-yellow-400" /> Benchmark interno
                  </h3>
                  <p className="text-2xl font-bold text-yellow-400">
                    #{analysis.internalBenchmark.rank}/{analysis.internalBenchmark.total}
                  </p>
                  <p className="text-xs text-tron-silver-400 mt-1">
                    Percentil interno: {analysis.internalBenchmark.percentile}
                  </p>
                </div>
              )}

              {analysis.cooldownPlanner && analysis.cooldownPlanner.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-violet-400" /> CD Planner por fase
                  </h3>
                  <div className="space-y-2">
                    {analysis.cooldownPlanner.slice(0, 5).map((item, idx) => (
                      <div key={`${item.at}-${idx}`} className="rounded-md bg-violet-500/10 border border-violet-500/20 p-2 text-xs">
                        <p className="text-tron-silver-200 font-medium">{formatTime(item.at)} [{item.phase}] {item.action}</p>
                        <p className="text-tron-silver-400">{item.owner} • {item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.assignmentBreaks && analysis.assignmentBreaks.length > 0 && (
                <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
                  <h3 className="text-base font-semibold text-tron-silver-200 mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-fuchsia-400" /> Assignment breaks
                  </h3>
                  <div className="space-y-2">
                    {analysis.assignmentBreaks.slice(0, 6).map((item, idx) => (
                      <div key={`${item.owner}-${idx}`} className="rounded-md bg-fuchsia-500/10 border border-fuchsia-500/20 p-2 text-xs">
                        <p className="text-tron-silver-200 font-medium">{item.owner}</p>
                        <p className="text-tron-silver-400">{item.failure} • {item.count}x</p>
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
                <TrendingUp className="h-5 w-5 text-cyan-400" /> Histórico longitudinal do boss
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
                  <h3 className="text-lg font-bold text-red-400 mb-1">Cadeia de Mortes Identificada</h3>
                  <p className="text-sm text-tron-silver-400 mb-4">A morte raiz que causou o wipe</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Root Death */}
                    <div className="bg-dark-800/50 rounded-lg p-4 border border-red-500/20">
                      <div className="text-xs text-red-400 uppercase tracking-wide mb-2 font-semibold">Morte Raiz</div>
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
                        <div className="text-xs text-orange-400 uppercase tracking-wide mb-2 font-semibold">Mortes em Cadeia</div>
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
                      <ShieldCheck className="h-5 w-5 text-wow-gold" /> Gaps de Cooldown
                      <Badge className="bg-orange-500/20 text-orange-400 text-xs ml-2">
                        {analysis.cooldownGaps.length} gap(s)
                      </Badge>
                    </h3>
                    {expandedSections.cooldownGaps ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-sm text-tron-silver-400 mt-2 mb-3">Momentos de alto dano sem cooldown de raid ativo</p>
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
                          <p>Duração: {gap.duration}s sem CD</p>
                          <p>Dano tomado: {formatNumber(gap.damageTaken)}</p>
                          {gap.availableCds.length > 0 && (
                            <p className="text-wow-gold">Disponível: {gap.availableCds.join(', ')}</p>
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
                <Zap className="h-5 w-5 text-wow-gold" /> Eficiência de Burst Window
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
                        <span className="text-orange-400">Sem CD durante burst: </span>
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

          {/* PHASE 2 ANALYSIS - Advanced Insights */}
          {showAdvanced && currentFight && (
            <Phase2Analysis fight={currentFight} report={report} />
          )}

          {/* PHASE 3 - PROGRESSION TRACKING */}
          {showAdvanced && currentFight && (
            <ProgressionTracking bossName={fightData.bossName} report={report} />
          )}

          {/* Quick Tips - Based on Analysis */}
          <div className="bg-dark-800/50 rounded-lg p-4 border border-wow-gold/30">
            <h3 className="text-base font-semibold text-wow-gold flex items-center gap-2 mb-3">
              <Target className="h-5 w-5" /> Ações Recomendadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Death Cascade Recommendation */}
              {analysis.deathCascade && !fightData.kill && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Foco na Morte Raiz</p>
                    <p className="text-xs text-tron-silver-400">{analysis.deathCascade.recommendation}</p>
                  </div>
                </div>
              )}
              
              {/* Cooldown Gap Recommendation */}
              {analysis.cooldownGaps && analysis.cooldownGaps.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <Clock4 className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Ajuste CD Timing</p>
                    <p className="text-xs text-tron-silver-400">Alinhe raid CDs com os momentos de dano em {formatTime(analysis.cooldownGaps[0].time)}</p>
                  </div>
                </div>
              )}
              
              {/* Burst Window Recommendation */}
              {analysis.burstWindows?.some(w => w.playersWithoutCDs.length > 0) && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <Zap className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Burst Timing</p>
                    <p className="text-xs text-tron-silver-400">{analysis.burstWindows.find(w => w.playersWithoutCDs.length > 0)?.playersWithoutCDs.slice(0, 3).join(', ')} sem CDs durante burst</p>
                  </div>
                </div>
              )}
              
              {/* Potion Recommendation */}
              {analysis.consumables.missingPotion.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <Flame className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Potions</p>
                    <p className="text-xs text-tron-silver-400">{analysis.consumables.missingPotion.length} players sem potion (~80K DPS cada)</p>
                  </div>
                </div>
              )}
              
              {/* Flask Recommendation */}
              {analysis.consumables.missingFlask.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-dark-700/50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-tron-silver-200">Flasks</p>
                    <p className="text-xs text-tron-silver-400">{analysis.consumables.missingFlask.length} players sem flask (~50K DPS cada)</p>
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
                    <p className="text-sm font-medium text-tron-silver-200">Raid Buff Faltando</p>
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
                    <p className="text-xs text-tron-silver-400">Duração: {formatTime(fightData.duration)} | DPS: {formatNumber(analysis.performance.raidDPS)}</p>
                  </div>
                </div>
              ) : analysis.summary.killPotential && (
                <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <Trophy className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Kill Iminente!</p>
                    <p className="text-xs text-tron-silver-400">Boss em {fightData.bossHP}% - próximos pulls devem ser o kill</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, valueClass = '' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700 text-center">
      <div className="flex items-center justify-center gap-1.5 text-tron-silver-400 text-sm mb-1.5">
        {icon} {label}
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
          href={`/players/us/${encodeURIComponent((player.server || 'unknown').toLowerCase())}/${encodeURIComponent(player.name.toLowerCase())}`}
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

// Helper functions
function guessIfAvoidable(abilityName: string): boolean {
  const avoidableKeywords = ['pool', 'ground', 'void', 'zone', 'circle', 'beam', 'wave', 'spray', 'spew', 'eruption', 'explosion', 'torrent', 'rain', 'fire', 'flame', 'ice', 'frost', 'poison', 'acid', 'shadow', 'cudgel', 'smash', 'slam', 'swipe', 'cleave'];
  const lower = abilityName.toLowerCase();
  return avoidableKeywords.some(kw => lower.includes(kw));
}

function getPhaseAtTime(time: number, duration: number): string {
  const percent = (time / duration) * 100;
  if (percent < 25) return 'Early';
  if (percent < 50) return 'Mid';
  if (percent < 75) return 'Late';
  return 'Final';
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

function getExpectedDPS(spec: string): number {
  const dps: Record<string, number> = {
    'Fury': 180000, 'Arms': 175000, 'Frost': 170000, 'Unholy': 175000,
    'Retribution': 165000, 'Enhancement': 170000, 'Outlaw': 175000,
    'Fire': 180000, 'Frost Mage': 170000, 'Arcane': 175000,
    'Beast Mastery': 160000, 'Marksmanship': 170000, 'Survival': 165000,
    'Balance': 165000, 'Feral': 170000, 'Shadow': 165000,
    'Affliction': 160000, 'Destruction': 170000, 'Demonology': 165000,
    'Havoc': 175000, 'Windwalker': 170000,
  };
  return dps[spec] || 150000;
}

function diagnoseLowDPS(player: any): string {
  if (player.activeTime < 90) return `Low activity: ${player.activeTime}%`;
  if (!player.potionUsed) return 'No potion used';
  if (!player.flaskUsed) return 'No flask';
  if (player.deaths > 0) return 'Died during fight';
  return 'Check rotation/gear';
}
