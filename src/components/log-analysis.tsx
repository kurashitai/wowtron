'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Skull, AlertTriangle, CheckCircle, XCircle, Clock, Users, Zap,
  Search, Copy, Loader2, ChevronRight, TrendingUp,
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
  const [isMockData, setIsMockData] = useState(false);
  const [currentFight, setCurrentFight] = useState<any>(null);
  
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
      setIsMockData(data.mock);
      setSelectedFight(null);
      setAnalysis(null);
      if (data.mock) {
        toast({ title: 'Demo Mode', description: 'Using demo data. Add WCL API keys for real data.' });
      }
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
      const response = await fetch(`/api/wcl?action=fight&code=${report.code}&fightId=${fightId}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
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
      setAnalysis(generateAnalysis(fight));
      setIsMockData(data.mock);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to analyze fight', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalysis = (fight: any): AnalysisResult => {
    const players = fight.players || [];
    const deaths = fight.timeline?.filter((e: any) => e.type === 'death') || [];
    
    const playerStats: PlayerStats[] = players.map((player: any) => ({
      name: player.name,
      class: player.class,
      spec: player.spec,
      role: player.role,
      dps: player.dps || 0,
      hps: player.hps || 0,
      rankPercent: player.rankPercent || 0,
      itemLevel: player.itemLevel || 480,
      flaskUsed: player.flaskUsed ?? true,
      foodUsed: player.foodUsed ?? true,
      potionUsed: player.potionUsed ?? true,
      runeUsed: player.runeUsed ?? false,
      activeTime: player.activeTime || 95,
      deaths: player.deaths || 0,
      dtps: player.dtps || 0,
      avoidableDamageTaken: player.avoidableDamageTaken || player.avoidableDamagePercent || 0,
    }));

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

    // NEW: Generate Death Cascade Analysis
    const deathCascade = generateDeathCascade(deaths, players, fight);

    const lowPerformers: PerformanceIssue[] = [];
    let totalDPS = 0;
    let totalHPS = 0;
    
    players.forEach((player: any) => {
      totalDPS += player.dps || 0;
      totalHPS += player.hps || 0;
      const expectedDPS = getExpectedDPS(player.spec || player.class);
      if (player.dps && player.dps < expectedDPS * 0.8 && player.role === 'dps') {
        lowPerformers.push({
          player: player.name,
          class: player.class,
          expectedDPS,
          actualDPS: player.dps,
          gap: expectedDPS - player.dps,
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

    const bossHP = 10000000000;
    const optimalDPS = totalDPS + estimatedDPSLoss + lowPerformers.reduce((s, p) => s + p.gap, 0);
    const optimalTime = Math.floor(bossHP / optimalDPS);
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
    const requiredDPS = bossHP / fight.duration;
    const dpsRatio = totalDPS / requiredDPS;
    // Score from 0-100: 100% of required = 70 score, 110% = 80, 120% = 90, 130%+ = 100
    const dpsScore = Math.min(100, Math.max(0, Math.floor((dpsRatio - 0.5) * 100)));
    
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
        requiredDPS: Math.floor(bossHP / fight.duration),
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
        dpsCheckMet: totalDPS >= bossHP / fight.duration,
        healingIntensity: totalHPS > 2000000 ? 'high' : totalHPS > 1000000 ? 'medium' : 'low',
        movementRequired: 'medium',
        keyMechanics: avoidableDeaths.slice(0, 3).map(d => ({ name: d.ability, deaths: 1, tip: d.tip })),
      },
      deathCascade,
      cooldownGaps,
      burstWindows,
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
    
    // Find damage spikes from boss abilities that hit multiple players
    bossAbilities.forEach((ability: any) => {
      // High damage abilities that should have had a CD
      if (ability.damage > 1500000 && ability.type === 'avoidable') {
        // Check timeline for when this ability was cast
        const abilityEvents = timeline.filter((e: any) => 
          e.type === 'ability' && e.description?.includes(ability.name)
        );
        
        abilityEvents.forEach((event: any) => {
          // Check if any raid CD was used within 5s of this event
          const cdEvents = timeline.filter((e: any) => 
            e.type === 'buff' && 
            ['Bloodlust', 'Tranquility', 'Healing Tide', 'Divine Hymn', 'Aura Mastery'].includes(e.description || '') &&
            Math.abs(e.time - event.time) <= 5
          );
          
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
    <div className="w-full space-y-4">
      {/* Input Bar */}
      <div className="flex gap-3 p-4 bg-dark-800/50 rounded-lg border border-dark-700">
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

      {isMockData && (
        <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-sm">
          ⚠️ Demo Mode - Configure WCL API keys for real data
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 bg-dark-800/50 rounded-lg">
          <Loader2 className="h-8 w-8 text-wow-gold animate-spin mr-3" />
          <span className="text-tron-silver-400 text-lg">Analyzing...</span>
        </div>
      )}

      {/* Report Fights */}
      {report && !selectedFight && !isLoading && (
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
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
                className="p-3 rounded bg-dark-700/50 border border-dark-600 hover:border-wow-gold cursor-pointer transition-all"
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
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold">
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedFight(null); setAnalysis(null); }} className="h-8 text-xs px-3 border-dark-600 text-tron-silver-400 hover:text-wow-gold">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> New
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
            </div>
          </div>

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
          {analysis.burstWindows && analysis.burstWindows.length > 0 && (
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
          {currentFight && (
            <Phase2Analysis fight={currentFight} report={report} />
          )}

          {/* PHASE 3 - PROGRESSION TRACKING */}
          {currentFight && (
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
  return (
    <div className={`p-3 rounded-lg border ${getRankBg(player.rankPercent)} flex items-center gap-3`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: getClassColor(player.class) }}>
          {player.name}
        </p>
        <p className="text-xs text-tron-silver-500 truncate">{player.spec}</p>
      </div>
      <div className="text-right shrink-0">
        <div className={`flex items-center gap-1 ${getRankColor(player.rankPercent)}`}>
          <Star className="h-3.5 w-3.5" />
          <span className="text-sm font-bold">{player.rankPercent}%</span>
        </div>
        <p className="text-xs text-tron-silver-500">{formatNumber(player.dps)} DPS</p>
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
