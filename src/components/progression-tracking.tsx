'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Trophy, Target, AlertTriangle, CheckCircle, Clock,
  BarChart3, Flame, Star, Zap, Award
} from 'lucide-react';
import {
  ProgressPrediction, ConsistencyAnalysis, BestPullAnalysis,
  ProgressionDashboard, PullHistory,
  predictProgress, analyzeConsistency, findBestPull,
  generateProgressionDashboard, extractPullHistoryFromReport, extractPlayerDataFromFights
} from '@/lib/analysis/progression-analysis';

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

interface ProgressionTrackingProps {
  bossName: string;
  report?: any;
  currentFight?: any;
}

export function ProgressionTracking({ bossName, report, currentFight }: ProgressionTrackingProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    prediction: true,
    bestPull: true,
    consistency: true,
    history: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Extract REAL progression data from report fights
  const pullHistory = useMemo(() => {
    if (!report?.fights) return [];
    
    // Filter fights for this boss and extract real data
    const bossFights = report.fights.filter((f: any) => f.bossName === bossName);
    
    return bossFights.map((fight: any, index: number) => ({
      pullNumber: index + 1,
      bossHP: fight.bossHPPercent ?? (fight.kill ? 0 : 100),
      duration: fight.duration || 0,
      deaths: fight.summary?.deaths || 0,
      raidDPS: fight.summary?.raidDPS || 0,
      timestamp: fight.startTime || Date.now()
    }));
  }, [report?.fights, bossName]);
  
  // Extract player data from fights
  const playerData = useMemo(() => {
    if (!report?.fights) return new Map<string, number[]>();
    
    // Get all unique player names from fights
    const allPlayers = new Set<string>();
    report.fights.forEach((fight: any) => {
      (fight.players || []).forEach((p: any) => allPlayers.add(p.name));
    });
    
    return extractPlayerDataFromFights(report.fights, Array.from(allPlayers));
  }, [report?.fights]);
  
  const dashboard = useMemo(() => 
    generateProgressionDashboard(bossName, pullHistory, playerData),
    [bossName, pullHistory, playerData]
  );
  
  const consistency = useMemo(() => 
    analyzeConsistency(playerData),
    [playerData]
  );

  return (
    <div className="space-y-4">
      {/* PROGRESSION HEADER - Summary */}
      <div className="bg-gradient-to-r from-wow-gold/10 to-dark-800/50 rounded-lg p-4 border border-wow-gold/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-wow-gold">Progressão: {bossName}</h3>
            <p className="text-sm text-tron-silver-400">{dashboard.totalPulls} pulls registrados</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`text-sm ${
              dashboard.prediction.trend === 'improving' ? 'bg-green-500/20 text-green-400' :
              dashboard.prediction.trend === 'regressing' ? 'bg-red-500/20 text-red-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              {dashboard.prediction.trend === 'improving' ? <TrendingUp className="h-3 w-3 mr-1" /> :
               dashboard.prediction.trend === 'regressing' ? <TrendingDown className="h-3 w-3 mr-1" /> :
               <Minus className="h-3 w-3 mr-1" />}
              {dashboard.recentTrend}
            </Badge>
            {dashboard.prediction.pullsUntilKill > 0 && (
              <Badge className="bg-wow-gold/20 text-wow-gold text-sm">
                ~{dashboard.prediction.pullsUntilKill} pulls
              </Badge>
            )}
          </div>
        </div>
        
        {/* Key Prediction */}
        <div className="mt-3 p-3 bg-dark-700/50 rounded-lg">
          <p className="text-sm text-tron-silver-200">{dashboard.prediction.prediction}</p>
        </div>

        {/* Quick Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-tron-silver-200">{dashboard.bestPull.metrics.bossHP}%</div>
            <div className="text-xs text-tron-silver-400">Melhor HP</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-tron-silver-200">{dashboard.bestPull.metrics.deaths}</div>
            <div className="text-xs text-tron-silver-400">Mortes (best)</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-tron-silver-200">{formatNumber(dashboard.bestPull.metrics.raidDPS)}</div>
            <div className="text-xs text-tron-silver-400">DPS (best)</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${
              dashboard.prediction.confidence === 'high' ? 'text-green-400' :
              dashboard.prediction.confidence === 'medium' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {dashboard.prediction.confidence === 'high' ? 'Alta' :
               dashboard.prediction.confidence === 'medium' ? 'Média' : 'Baixa'}
            </div>
            <div className="text-xs text-tron-silver-400">Confiança</div>
          </div>
        </div>
      </div>

      {/* PROGRESS PREDICTION */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.prediction} onOpenChange={() => toggleSection('prediction')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-400" /> Previsão de Progresso
                {dashboard.prediction.plateau && (
                  <Badge className="bg-amber-500/20 text-amber-400 text-xs ml-2">Plateau</Badge>
                )}
              </h3>
              {expandedSections.prediction ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pulls Until Kill */}
              <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-wow-gold">
                  {dashboard.prediction.pullsUntilKill > 0 ? dashboard.prediction.pullsUntilKill : '?'}
                </div>
                <div className="text-sm text-tron-silver-400 mt-1">Pulls até Kill</div>
                {dashboard.prediction.bestCase > 0 && (
                  <div className="text-xs text-tron-silver-500 mt-2">
                    {dashboard.prediction.bestCase} (melhor) - {dashboard.prediction.worstCase} (pior)
                  </div>
                )}
              </div>

              {/* Improvement Rate */}
              <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {dashboard.prediction.improvementRate.toFixed(1)}%
                </div>
                <div className="text-sm text-tron-silver-400 mt-1">Melhoria/Pull</div>
                <div className="text-xs text-tron-silver-500 mt-2">
                  Taxa de redução de HP
                </div>
              </div>

              {/* Confidence */}
              <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                <div className={`text-3xl font-bold ${
                  dashboard.prediction.confidence === 'high' ? 'text-green-400' :
                  dashboard.prediction.confidence === 'medium' ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {dashboard.prediction.confidence === 'high' ? 'ALTA' :
                   dashboard.prediction.confidence === 'medium' ? 'MÉDIA' : 'BAIXA'}
                </div>
                <div className="text-sm text-tron-silver-400 mt-1">Confiança</div>
                <div className="text-xs text-tron-silver-500 mt-2">
                  Baseado em {pullHistory.length} pulls
                </div>
              </div>
            </div>

            {/* Plateau Warning */}
            {dashboard.prediction.plateau && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Plateau Detectado</p>
                    <p className="text-xs text-tron-silver-400 mt-1">
                      Sem progresso significativo nos últimos {dashboard.prediction.plateauPulls} pulls.
                      Considere mudar a estratégia ou fazer ajustes no comp.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* BEST PULL */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.bestPull} onOpenChange={() => toggleSection('bestPull')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" /> Melhor Pull
                <Badge className="bg-amber-500/20 text-amber-400 text-xs ml-2">
                  #{dashboard.bestPull.pullNumber}
                </Badge>
              </h3>
              {expandedSections.bestPull ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Reasons */}
            <div className="mt-3 flex flex-wrap gap-2">
              {dashboard.bestPull.reasons.map((reason, i) => (
                <Badge key={i} className="bg-green-500/20 text-green-400 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" /> {reason}
                </Badge>
              ))}
            </div>

            {/* Metrics */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-400">{dashboard.bestPull.metrics.bossHP}%</div>
                <div className="text-xs text-tron-silver-400">Boss HP</div>
              </div>
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-tron-silver-200">{formatTime(dashboard.bestPull.metrics.duration)}</div>
                <div className="text-xs text-tron-silver-400">Duração</div>
              </div>
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">{dashboard.bestPull.metrics.deaths}</div>
                <div className="text-xs text-tron-silver-400">Mortes</div>
              </div>
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{formatNumber(dashboard.bestPull.metrics.raidDPS)}</div>
                <div className="text-xs text-tron-silver-400">Raid DPS</div>
              </div>
            </div>

            {/* Comparison */}
            <div className="mt-3 p-3 bg-dark-700/50 rounded-lg">
              <div className="text-xs text-tron-silver-400 mb-2">vs Média dos Pulls</div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold ${
                    dashboard.bestPull.comparison.vsAverage.dps > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {dashboard.bestPull.comparison.vsAverage.dps > 0 ? '+' : ''}{dashboard.bestPull.comparison.vsAverage.dps}%
                  </span>
                  <span className="text-xs text-tron-silver-400">DPS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-semibold ${
                    dashboard.bestPull.comparison.vsAverage.deaths < 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {dashboard.bestPull.comparison.vsAverage.deaths > 0 ? '+' : ''}{dashboard.bestPull.comparison.vsAverage.deaths}
                  </span>
                  <span className="text-xs text-tron-silver-400">Mortes</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* CONSISTENCY ANALYSIS */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.consistency} onOpenChange={() => toggleSection('consistency')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" /> Consistência
                {consistency.leastConsistent.length > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 text-xs ml-2">
                    {consistency.leastConsistent.length} inconsistente(s)
                  </Badge>
                )}
              </h3>
              {expandedSections.consistency ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Most Consistent */}
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-xs text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Star className="h-3 w-3" /> Mais Consistentes
                </div>
                <div className="space-y-2">
                  {consistency.mostConsistent.map((name, i) => {
                    const player = consistency.players.find(p => p.name === name);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-tron-silver-200">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">{player?.consistencyScore}%</span>
                          <Badge className="bg-green-500/20 text-green-400 text-xs">{player?.grade}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Least Consistent */}
              <div className="bg-dark-700/50 rounded-lg p-3">
                <div className="text-xs text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Menos Consistentes
                </div>
                <div className="space-y-2">
                  {consistency.leastConsistent.map((name, i) => {
                    const player = consistency.players.find(p => p.name === name);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-tron-silver-200">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">{player?.consistencyScore}%</span>
                          <Badge className="bg-red-500/20 text-red-400 text-xs">{player?.grade}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chokers & Clutch */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {consistency.chokers.length > 0 && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="text-xs text-amber-400 mb-1">⚠️ Chokers (alta variância)</div>
                  <div className="text-sm text-tron-silver-300">{consistency.chokers.join(', ')}</div>
                </div>
              )}
              {consistency.clutchPerformers.length > 0 && (
                <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-xs text-green-400 mb-1 flex items-center gap-1">
                    <Award className="h-3 w-3" /> Clutch Performers
                  </div>
                  <div className="text-sm text-tron-silver-300">{consistency.clutchPerformers.join(', ')}</div>
                </div>
              )}
            </div>

            {/* Player Grid */}
            <div className="mt-3">
              <div className="text-xs text-tron-silver-400 uppercase tracking-wide mb-2">Todos os Players</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {consistency.players.slice(0, 8).map((player, i) => (
                  <div key={i} className={`p-2 rounded-lg border ${
                    player.grade === 'S' || player.grade === 'A' ? 'bg-green-500/10 border-green-500/30' :
                    player.grade === 'B' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-tron-silver-200 truncate">{player.name}</span>
                      <Badge className={`text-xs ${
                        player.grade === 'S' || player.grade === 'A' ? 'bg-green-500/20 text-green-400' :
                        player.grade === 'B' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {player.grade}
                      </Badge>
                    </div>
                    <div className="text-xs text-tron-silver-400">
                      {player.consistencyScore}% consistência
                    </div>
                    <div className="text-xs text-tron-silver-500">
                      {formatNumber(player.avgDPS)} avg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* PULL HISTORY - Mini Chart */}
      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
        <Collapsible open={expandedSections.history} onOpenChange={() => toggleSection('history')}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
                <Clock className="h-5 w-5 text-tron-silver-400" /> Histórico de Pulls
                <Badge className="bg-dark-700 text-tron-silver-400 text-xs ml-2">
                  {pullHistory.length} pulls
                </Badge>
              </h3>
              {expandedSections.history ? <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : <ChevronDown className="h-5 w-5 text-tron-silver-400" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Mini HP Chart */}
            <div className="mt-3 h-20 flex items-end gap-0.5">
              {pullHistory.map((pull, i) => {
                const height = Math.max(5, 100 - pull.bossHP);
                const isBest = pull.bossHP === Math.min(...pullHistory.map(p => p.bossHP));
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-all ${
                      isBest ? 'bg-wow-gold' : 
                      pull.bossHP < 20 ? 'bg-green-500' :
                      pull.bossHP < 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`Pull #${pull.pullNumber}: ${pull.bossHP}% HP`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-tron-silver-400 mt-1">
              <span>Pull #1</span>
              <span>HP % (mais baixo = melhor)</span>
              <span>#{pullHistory.length}</span>
            </div>

            {/* Last 5 pulls */}
            <div className="mt-3 grid grid-cols-5 gap-2">
              {pullHistory.slice(-5).map((pull, i) => (
                <div key={i} className="bg-dark-700/50 rounded p-2 text-center">
                  <div className="text-xs text-tron-silver-400">#{pull.pullNumber}</div>
                  <div className={`text-sm font-bold ${
                    pull.bossHP < 20 ? 'text-green-400' :
                    pull.bossHP < 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {pull.bossHP}%
                  </div>
                  <div className="text-xs text-tron-silver-500">{pull.deaths} mortes</div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
