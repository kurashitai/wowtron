'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle, ChevronDown, ChevronUp, Clock, Eye, Heart, 
  TrendingUp, TrendingDown, ArrowRight, Zap, AlertCircle, CheckCircle,
  Skull, Shield, Activity, Swords, Star
} from 'lucide-react';
import {
  PullComparison, GhostMechanic, HealerReactionAnalysis, DPSRampAnalysis,
  comparePulls, analyzeGhostMechanics, analyzeHealerReaction, analyzeDPSRamp,
  analyzeDeathDetails,
  analyzeDefensiveUsage,
  calculateAllScorecards,
  type DeathAnalysis,
  type DefensiveAnalysis,
  type PlayerScorecard
} from '@/lib/analysis/phase2-analysis';
import { RaidTimeline } from '@/components/raid-timeline';
import { getBossByNickname, type BossData } from '@/lib/boss-data-midnight';

// Format helpers
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatNumber = (n: number): string => {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
};

// Grade color helper
const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'S': return 'text-yellow-400';
    case 'A': return 'text-green-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-amber-400';
    case 'D': return 'text-orange-400';
    case 'F': return 'text-red-400';
    default: return 'text-tron-silver-400';
  }
};

const getGradeBgColor = (grade: string): string => {
  switch (grade) {
    case 'S': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'A': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'B': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'C': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'D': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'F': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-dark-700 text-tron-silver-400 border-dark-600';
  }
};

// Phase 2 Analysis Props
interface Phase2AnalysisProps {
  fight: any;
  report?: any;
  showPullComparison?: boolean;
  deathAnalysis?: DeathAnalysis;
  defensiveAnalysis?: DefensiveAnalysis;
  playerScorecards?: PlayerScorecard[];
}

export function Phase2Analysis({ 
  fight, 
  report, 
  showPullComparison = true,
  deathAnalysis: externalDeathAnalysis,
  defensiveAnalysis: externalDefensiveAnalysis,
  playerScorecards: externalPlayerScorecards
}: Phase2AnalysisProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ghostMechanics: true,
    healerReaction: true,
    dpsRamp: true,
    pullComparison: true,
    deathAnalysis: true,
    defensiveAnalysis: true,
    playerScorecards: true,
  timeline: true,
  interruptAnalysis: true,
 });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get boss data for tips
  const bossData = useMemo(() => {
    if (!fight?.bossName) return undefined;
    const bossKey = fight.bossName.toLowerCase().split(' ')[0];
    return getBossByNickname(bossKey);
  }, [fight]);

  // MEMOIZE all analysis results to prevent recalculation on expand/collapse
  // This ensures data doesn't change when toggling sections
  const ghostMechanics = useMemo(() => {
    if (!fight) return [];
    return analyzeGhostMechanics(fight);
  }, [fight]);

  const healerReaction = useMemo(() => {
    if (!fight) return {
      overall: { avgReactionTime: 500, grade: 'C', worstWindow: 'Nenhum' },
      healers: [],
      dangerWindows: []
    };
    return analyzeHealerReaction(fight);
  }, [fight]);

  const dpsRamp = useMemo(() => {
    if (!fight) return { players: [], slowRampers: [], recommendations: [] };
    return analyzeDPSRamp(fight);
  }, [fight]);

  const pullComparison = useMemo(() => {
    if (!showPullComparison || !report?.fights || !fight) return null;
    
    const sameBossWipes = report.fights.filter((f: any) => 
      f.bossName === fight.bossName && !f.kill && f.id !== fight.id
    );
    
    if (sameBossWipes.length === 0) return null;
    
    const prevPull = sameBossWipes[sameBossWipes.length - 1];
    return comparePulls(prevPull, fight);
  }, [fight, report, showPullComparison]);

  
  // Death Analysis - use external if provided, otherwise calculate
  const deathAnalysis = useMemo(() => {
    if (!fight) return { deaths: [], summary: { avoidable: 0, partiallyAvoidable: 0, unavoidable: 0, unknown: 0 } };
    if (externalDeathAnalysis) return externalDeathAnalysis;
    return analyzeDeathDetails(fight, bossData);
  }, [fight, bossData, externalDeathAnalysis]);
  
  // Defensive Analysis - use external if provided, otherwise calculate
  const defensiveAnalysis = useMemo(() => {
    if (!fight) return {
      players: [],
      wastedDefensives: [],
      missingDefensives: [],
      summary: { totalDefensivesUsed: 0, wastedCount: 0, missedOpportunities: 0 }
    };
    if (externalDefensiveAnalysis) return externalDefensiveAnalysis;
    return analyzeDefensiveUsage(fight);
  }, [fight, externalDefensiveAnalysis]);
  
  // Player Scorecards - use external if provided, otherwise calculate
  const playerScorecards = useMemo(() => {
    if (!fight?.players) return [];
    if (externalPlayerScorecards) return externalPlayerScorecards;
    return calculateAllScorecards(fight);
  }, [fight, externalPlayerScorecards]);
  
  // Interrupt tracking analysis
  const interruptAnalysis = useMemo(() => {
    if (!fight?.players) return { topInterrupters: [], missedInterrupts: 0 };
    
    const players = fight.players;
    const interruptAbilities = [
      'Pummel', 'Kick', 'Counterspell', 'Wind Shear', 'Rebuke', 
      'Spear Hand Strike', 'Skull Bash', 'Maim', 'Mind Freeze', 'Silence',
      'Strangulate', 'Disrupt', 'Arcane Torrent'
    ];
    
    // Find top interrupters
    const interruptCounts = new Map<string, number>();
    players.forEach((p: any) => {
      if (p.interruptions > 0) {
        interruptCounts.set(p.name, p.interruptions);
      }
    });
    
    const topInterrupters = Array.from(interruptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Estimate missed interrupts based on expected count
    const expectedInterrupts = Math.floor(fight.duration / 30);
    const missedInterrupts = Math.max(0, expectedInterrupts - interruptCounts.size);
    
    return { topInterrupters, missedInterrupts };
  }, [fight]);

  return (
    <div className="space-y-4">
      {/* RAID TIMELINE - Timeline Visual */}
      <RaidTimeline 
        fight={fight} 
        bossData={bossData}
        duration={fight?.duration || 0}
      />

      {/* DEATH ANALYSIS DETALHADA - CRITICAL */}
      {deathAnalysis.deaths.length > 0 && (
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <Collapsible open={expandedSections.deathAnalysis} onOpenChange={() => toggleSection('deathAnalysis')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                  <Skull className="h-5 w-5 text-red-400" /> Análise de Mortes
                  <Badge className="bg-red-500/20 text-red-400 text-xs ml-2">
                    {deathAnalysis.deaths.length} morte(s)
                  </Badge>
                </h3>
                {expandedSections.deathAnalysis ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                <div className="p-2 bg-red-500/10 rounded border border-red-500/30 text-center">
                  <div className="text-xs text-red-400">Evitáveis</div>
                  <div className="text-lg font-bold text-red-300">{deathAnalysis.summary.avoidable}</div>
                </div>
                <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30 text-center">
                  <div className="text-xs text-amber-400">Parcialmente</div>
                  <div className="text-lg font-bold text-amber-300">{deathAnalysis.summary.partiallyAvoidable}</div>
                </div>
                <div className="p-2 bg-blue-500/10 rounded border border-blue-500/30 text-center">
                  <div className="text-xs text-blue-400">Inevitáveis</div>
                  <div className="text-lg font-bold text-blue-300">{deathAnalysis.summary.unavoidable}</div>
                </div>
                <div className="p-2 bg-dark-700 rounded border border-dark-600 text-center">
                  <div className="text-xs text-tron-silver-400">Desconhecidas</div>
                  <div className="text-lg font-bold text-tron-silver-300">{deathAnalysis.summary.unknown}</div>
                </div>
              </div>
              
              {/* Death Details */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {deathAnalysis.deaths.map((death, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    death.classification === 'avoidable' ? 'bg-red-500/10 border-red-500/30' :
                    death.classification === 'partially_avoidable' ? 'bg-amber-500/10 border-amber-500/30' :
                    death.classification === 'unavoidable' ? 'bg-blue-500/10 border-blue-500/30' :
                    'bg-dark-700/50 border-dark-600'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-tron-silver-200">{death.player}</span>
                        <Badge className="text-xs bg-dark-700 text-tron-silver-400">{death.class}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-tron-silver-400">{formatTime(death.time)}</span>
                        <Badge className={`text-xs ${
                          death.classification === 'avoidable' ? 'bg-red-500/20 text-red-400' :
                          death.classification === 'partially_avoidable' ? 'bg-amber-500/20 text-amber-400' :
                          death.classification === 'unavoidable' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-dark-700 text-tron-silver-400'
                        }`}>
                          {death.classification.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-xs text-tron-silver-300 mb-1">
                      <span className="text-red-400">Killing Blow:</span> {death.killingBlow.ability} 
                      <span className="text-tron-silver-400">({death.killingBlow.source})</span>
                    </div>
                    
                    {/* Defensive status */}
                    <div className="flex items-center gap-2 text-xs mb-1">
                      {death.defensiveUsed.length > 0 ? (
                        <span className="text-green-400">Defensivas usadas: {death.defensiveUsed.join(', ')}</span>
                      ) : (
                        <span className="text-red-400">Sem defensiva usada</span>
                      )}
                    </div>
                    
                    {/* Tip */}
                    <div className="text-xs text-amber-400 italic mt-1 border-t border-dark-600 pt-1">
                      💡 {death.tip}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* DEFENSIVE USAGE ANALYSIS - NEW HIGH PRIORITY */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.defensiveAnalysis} onOpenChange={() => toggleSection('defensiveAnalysis')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" /> Análise de Defensivas
                <Badge className={`text-xs ml-2 ${
                  defensiveAnalysis.summary.wastedCount > 0 ? 'bg-red-500/20 text-red-400' :
                  defensiveAnalysis.summary.missedOpportunities > 0 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {defensiveAnalysis.summary.totalDefensivesUsed} usadas
                </Badge>
              </h3>
              {expandedSections.defensiveAnalysis ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2 bg-green-500/10 rounded border border-green-500/30 text-center">
                <div className="text-xs text-green-400">Usadas</div>
                <div className="text-lg font-bold text-green-300">{defensiveAnalysis.summary.totalDefensivesUsed}</div>
              </div>
              <div className="p-2 bg-red-500/10 rounded border border-red-500/30 text-center">
                <div className="text-xs text-red-400">Desperdiçadas</div>
                <div className="text-lg font-bold text-red-300">{defensiveAnalysis.summary.wastedCount}</div>
              </div>
              <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30 text-center">
                <div className="text-xs text-amber-400">Perdidas</div>
                <div className="text-lg font-bold text-amber-300">{defensiveAnalysis.summary.missedOpportunities}</div>
              </div>
            </div>
            
            {/* Player Defensive Grades */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {defensiveAnalysis.players.slice(0, 8).map((player, i) => (
                <div key={i} className={`p-2 rounded border ${getGradeBgColor(player.grade)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-tron-silver-200 truncate">{player.name}</span>
                    <Badge className={`text-xs ${getGradeBgColor(player.grade)}`}>
                      {player.grade}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-tron-silver-400">
                    <span>{player.defensives.length} usadas</span>
                    {player.wastedCount > 0 && (
                      <span className="text-red-400">{player.wastedCount} desperdiçada(s)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Missing Defensives */}
            {defensiveAnalysis.missingDefensives.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Defensivas Não Usadas (Mortes)
                </div>
                <div className="space-y-1">
                  {defensiveAnalysis.missingDefensives.slice(0, 4).map((missed, i) => (
                    <div key={i} className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs">
                      <span className="text-red-400">{missed.player}</span> - {missed.defensive} não usada
                      <span className="text-tron-silver-400">({formatTime(missed.time)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* GHOST MECHANICS - Falhas Silenciosas */}
      {ghostMechanics.length > 0 && (
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <Collapsible open={expandedSections.ghostMechanics} onOpenChange={() => toggleSection('ghostMechanics')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-400" /> Mecânicas Fantasma
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs ml-2">
                    {ghostMechanics.length} falha(s)
                  </Badge>
                </h3>
                {expandedSections.ghostMechanics ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-sm text-tron-silver-400 mt-2 mb-3">
                Erros que não causaram morte imediata mas prejudicaram a raid
              </p>
              <div className="space-y-2">
                {ghostMechanics.map((mechanic, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    mechanic.impact === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                    mechanic.impact === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-dark-700/50 border-dark-600'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-tron-silver-200">{mechanic.name}</span>
                        <Badge className={`text-xs ${
                          mechanic.type === 'interrupt' ? 'bg-orange-500/20 text-orange-400' :
                          mechanic.type === 'soak' ? 'bg-blue-500/20 text-blue-400' :
                          mechanic.type === 'cooldown' ? 'bg-green-500/20 text-green-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {mechanic.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-tron-silver-400">
                        {mechanic.actualCount}/{mechanic.expectedCount} executados
                      </div>
                    </div>
                    {mechanic.failures.length > 0 && (
                      <div className="text-xs text-tron-silver-400 space-y-1">
                        {mechanic.failures.slice(0, 3).map((failure, fi) => (
                          <div key={fi} className="flex items-center gap-2">
                            <AlertCircle className="h-3 w-3 text-amber-400" />
                            <span>{failure.time > 0 ? `${formatTime(failure.time)}: ` : ''}{failure.expectedAction} → {failure.actualAction}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* HEALER REACTION TIME */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.healerReaction} onOpenChange={() => toggleSection('healerReaction')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-400" /> Tempo de Reação (Healers)
                <Badge className={`text-xs ml-2 ${
                  healerReaction.overall.grade === 'S' || healerReaction.overall.grade === 'A' ? 'bg-green-500/20 text-green-400' :
                  healerReaction.overall.grade === 'B' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  Grade {healerReaction.overall.grade}
                </Badge>
              </h3>
              {expandedSections.healerReaction ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Overall Stats */}
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-xs text-tron-silver-400 uppercase tracking-wide mb-2">Visão Geral</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-tron-silver-400">Tempo Médio</span>
                    <span className="text-sm font-semibold text-tron-silver-200">{healerReaction.overall.avgReactionTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-tron-silver-400">Pior Janela</span>
                    <span className="text-sm font-semibold text-red-400">{healerReaction.overall.worstWindow}</span>
                  </div>
                </div>
              </div>

              {/* Healer List */}
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-xs text-tron-silver-400 uppercase tracking-wide mb-2">Por Healer</div>
                <div className="space-y-1.5">
                  {healerReaction.healers.length > 0 ? (
                    healerReaction.healers.slice(0, 4).map((healer, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-tron-silver-200">{healer.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`${
                            healer.avgReactionMs < 450 ? 'text-green-400' :
                            healer.avgReactionMs < 600 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {healer.avgReactionMs}ms
                          </span>
                          <Badge className={`text-xs ${
                            healer.grade === 'S' || healer.grade === 'A' ? 'bg-green-500/20 text-green-400' :
                            healer.grade === 'B' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {healer.grade}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-tron-silver-500">Nenhum healer no pull</div>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Windows */}
            {healerReaction.dangerWindows.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-red-400 uppercase tracking-wide mb-2">Janelas de Perigo</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {healerReaction.dangerWindows.map((window, i) => (
                    <div key={i} className={`p-2 rounded border ${
                      window.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
                    }`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-tron-silver-200">{formatTime(window.startTime)}</span>
                        <span className="text-tron-silver-400">{window.duration}s duração</span>
                        <span className={window.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}>
                          {window.severity === 'critical' ? 'Crítico' : 'Atenção'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* DPS RAMP-UP ANALYSIS */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.dpsRamp} onOpenChange={() => toggleSection('dpsRamp')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-400" /> DPS Ramp-up
                {dpsRamp.slowRampers.length > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 text-xs ml-2">
                    {dpsRamp.slowRampers.length} lento(s)
                  </Badge>
                )}
              </h3>
              {expandedSections.dpsRamp ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-sm text-tron-silver-400 mt-2 mb-3">
              Tempo até cada DPS atingir pico de damage
            </p>
            
            {/* Slow Rampers Alert */}
            {dpsRamp.slowRampers.length > 0 && (
              <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400">Ramp lento: </span>
                  <span className="text-tron-silver-300">{dpsRamp.slowRampers.join(', ')}</span>
                </div>
              </div>
            )}

            {/* DPS Grid */}
            {dpsRamp.players.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {dpsRamp.players.slice(0, 12).map((player, i) => (
                  <div key={i} className={`p-2 rounded-lg border ${
                    player.rampStatus === 'good' ? 'bg-green-500/10 border-green-500/30' :
                    player.rampStatus === 'slow' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-tron-silver-200 truncate">{player.name}</span>
                      <span className={`text-xs ${
                        player.rampStatus === 'good' ? 'text-green-400' :
                        player.rampStatus === 'slow' ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {player.timeToPeak}s
                      </span>
                    </div>
                    <div className="text-xs text-tron-silver-400">
                      Esperado: {player.expectedRampTime}s | Eff: {player.efficiency}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-tron-silver-500">Nenhum dado de DPS disponível</div>
            )}

            {/* Recommendations */}
            {dpsRamp.recommendations.length > 0 && (
              <div className="mt-3 space-y-1">
                {dpsRamp.recommendations.map((rec, i) => (
                  <div key={i} className="text-xs text-tron-silver-400 flex items-start gap-1.5">
                    <ArrowRight className="h-3 w-3 text-wow-gold mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* INTERRUPT TRACKING - New */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.interruptAnalysis} onOpenChange={() => toggleSection('interruptAnalysis')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-400" /> Interrupt Tracking
                <Badge className="bg-orange-500/20 text-orange-400 text-xs ml-2">
                  {interruptAnalysis.topInterrupters.length} top
                </Badge>
              </h3>
              {expandedSections.interruptAnalysis ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Interrupters */}
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-xs text-tron-silver-400 uppercase tracking-wide mb-2">Top Interrupters</div>
                <div className="space-y-1.5">
                  {interruptAnalysis.topInterrupters.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-tron-silver-200">{p.name}</span>
                      <Badge className="bg-green-500/20 text-green-400">{p.count} kicks</Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Missed Opportunities */}
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-xs text-tron-silver-400 uppercase tracking-wide mb-2">Análise</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-tron-silver-400">Esperado (est.)</span>
                    <span className="text-tron-silver-200">{Math.floor(fight?.duration / 30)} por min</span>
                  </div>
                  {interruptAnalysis.missedInterrupts > 0 && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
                      Possíveis interrupts perdidos: ~{interruptAnalysis.missedInterrupts}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* PLAYER SCORECARDS - New */}
      {playerScorecards.length > 0 && (
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <Collapsible open={expandedSections.playerScorecards} onOpenChange={() => toggleSection('playerScorecards')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                  <Star className="h-5 w-5 text-wow-gold" /> Player Scorecards
                </h3>
                {expandedSections.playerScorecards ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto custom-scrollbar">
                {playerScorecards.slice(0, 20).map((scorecard, i) => (
                  <div key={i} className={`p-2 rounded border ${getGradeBgColor(scorecard.overallGrade)}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-tron-silver-200 truncate">{scorecard.name}</span>
                      <Badge className={`text-xs ${getGradeBgColor(scorecard.overallGrade)}`}>
                        {scorecard.overallGrade} ({scorecard.overallScore})
                      </Badge>
                    </div>
                    <div className="grid grid-cols-5 gap-0.5 text-xs">
                      <div className="text-center" title="DPS">
                        <div className={getGradeColor(scorecard.grades.dps.grade)}>{scorecard.grades.dps.grade}</div>
                      </div>
                      <div className="text-center" title="Mechanics">
                        <div className={getGradeColor(scorecard.grades.mechanics.grade)}>{scorecard.grades.mechanics.grade}</div>
                      </div>
                      <div className="text-center" title="Survival">
                        <div className={getGradeColor(scorecard.grades.survival.grade)}>{scorecard.grades.survival.grade}</div>
                      </div>
                      <div className="text-center" title="Utility">
                        <div className={getGradeColor(scorecard.grades.utility.grade)}>{scorecard.grades.utility.grade}</div>
                      </div>
                      <div className="text-center" title="Activity">
                        <div className={getGradeColor(scorecard.grades.activity.grade)}>{scorecard.grades.activity.grade}</div>
                      </div>
                    </div>
                    {/* Issues/Positives */}
                    {scorecard.issues.length > 0 && (
                      <div className="mt-1 text-xs text-red-400 truncate" title={scorecard.issues.join(', ')}>
                        {scorecard.issues[0]}
                      </div>
                    )}
                    {scorecard.positives.length > 0 && (
                      <div className="text-xs text-green-400 truncate" title={scorecard.positives.join(', ')}>
                        ✓ {scorecard.positives[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* PULL COMPARISON */}
      {pullComparison && (
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <Collapsible open={expandedSections.pullComparison} onOpenChange={() => toggleSection('pullComparison')}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-wow-gold" /> Comparação de Pulls
                  <Badge className="bg-dark-700 text-tron-silver-400 text-xs ml-2">
                    #{pullComparison.pull1.fightId} vs #{pullComparison.pull2.fightId}
                  </Badge>
                </h3>
                {expandedSections.pullComparison ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {/* Key Insight */}
              <div className={`mt-3 p-3 rounded-lg border ${
                pullComparison.pull2.kill ? 'bg-green-500/10 border-green-500/30' :
                pullComparison.improvements.length > pullComparison.regressions.length ? 'bg-amber-500/10 border-amber-500/30' :
                'bg-red-500/10 border-red-500/30'
              }`}>
                <p className="text-sm font-medium text-tron-silver-200">{pullComparison.keyInsight}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Improvements */}
                {pullComparison.improvements.length > 0 && (
                  <div>
                    <div className="text-xs text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Melhorias
                    </div>
                    <div className="space-y-1.5">
                      {pullComparison.improvements.slice(0, 4).map((change, i) => (
                        <div key={i} className="text-xs text-tron-silver-300 flex items-start gap-1.5">
                          <TrendingUp className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                          <span>{change.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regressions */}
                {pullComparison.regressions.length > 0 && (
                  <div>
                    <div className="text-xs text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Regressões
                    </div>
                    <div className="space-y-1.5">
                      {pullComparison.regressions.slice(0, 4).map((change, i) => (
                        <div key={i} className="text-xs text-tron-silver-300 flex items-start gap-1.5">
                          <TrendingDown className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                          <span>{change.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Focus Areas */}
              {pullComparison.focusAreas.length > 0 && (
                <div className="mt-3 p-2 bg-dark-700/50 rounded-lg">
                  <div className="text-xs text-wow-gold uppercase tracking-wide mb-1">Foco para Próximo Pull</div>
                  <div className="flex flex-wrap gap-1.5">
                    {pullComparison.focusAreas.map((area, i) => (
                      <Badge key={i} className="bg-dark-700 text-tron-silver-300 text-xs">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}