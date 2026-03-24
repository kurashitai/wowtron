'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle, ChevronDown, ChevronUp, Clock, Eye, Heart, 
  TrendingUp, TrendingDown, ArrowRight, Zap, AlertCircle, CheckCircle
} from 'lucide-react';
import {
  PullComparison, GhostMechanic, HealerReactionAnalysis, DPSRampAnalysis,
  comparePulls, analyzeGhostMechanics, analyzeHealerReaction, analyzeDPSRamp
} from '@/lib/analysis/phase2-analysis';

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

// Phase 2 Analysis Props
interface Phase2AnalysisProps {
  fight: any;
  report?: any;
  showPullComparison?: boolean;
}

export function Phase2Analysis({ fight, report, showPullComparison = true }: Phase2AnalysisProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ghostMechanics: true,
    healerReaction: true,
    dpsRamp: true,
    pullComparison: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  return (
    <div className="space-y-4">
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
