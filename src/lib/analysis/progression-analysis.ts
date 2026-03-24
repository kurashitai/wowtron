// ============================================
// PHASE 3 ANALYSIS - Progression Tracking
// ============================================
// Progress Prediction, Consistency Analysis, Best Pull

// ============================================
// TYPES
// ============================================

export interface ProgressPrediction {
  pullsUntilKill: number;
  confidence: 'high' | 'medium' | 'low';
  improvementRate: number; // HP% per pull
  plateau: boolean;
  plateauPulls: number;
  trend: 'improving' | 'stagnant' | 'regressing';
  prediction: string;
  bestCase: number; // pulls
  worstCase: number; // pulls
}

export interface PullHistory {
  pullNumber: number;
  bossHP: number;
  duration: number;
  deaths: number;
  raidDPS: number;
  timestamp: number;
}

export interface ConsistencyAnalysis {
  players: PlayerConsistency[];
  mostConsistent: string[];
  leastConsistent: string[];
  chokers: string[];
  clutchPerformers: string[];
}

export interface PlayerConsistency {
  name: string;
  class: string;
  role: string;
  avgDPS: number;
  minDPS: number;
  maxDPS: number;
  stdDev: number;
  variance: number;
  consistencyScore: number; // 0-100
  grade: string;
  pullPerformances: number[]; // DPS per pull
}

export interface BestPullAnalysis {
  pullNumber: number;
  score: number;
  reasons: string[];
  metrics: {
    bossHP: number;
    duration: number;
    deaths: number;
    raidDPS: number;
    mechanicsScore: number;
  };
  comparison: {
    vsAverage: {
      dps: number;
      deaths: number;
      duration: number;
    };
  };
}

export interface ProgressionDashboard {
  bossName: string;
  totalPulls: number;
  bestPull: BestPullAnalysis;
  prediction: ProgressPrediction;
  recentTrend: string;
  keyInsights: string[];
  pullHistory: PullHistory[];
}

// ============================================
// PROGRESS PREDICTION
// ============================================

export function predictProgress(
  pulls: PullHistory[],
  bossName: string
): ProgressPrediction {
  if (pulls.length < 3) {
    return {
      pullsUntilKill: -1,
      confidence: 'low',
      improvementRate: 0,
      plateau: false,
      plateauPulls: 0,
      trend: 'improving',
      prediction: 'Dados insuficientes. Continue progredindo!',
      bestCase: -1,
      worstCase: -1
    };
  }

  // Calculate improvement rate (HP% reduction per pull)
  const sortedPulls = [...pulls].sort((a, b) => a.pullNumber - b.pullNumber);
  const recentPulls = sortedPulls.slice(-10); // Last 10 pulls
  
  // Linear regression on HP
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  recentPulls.forEach((pull, i) => {
    sumX += i;
    sumY += pull.bossHP;
    sumXY += i * pull.bossHP;
    sumX2 += i * i;
  });
  
  const n = recentPulls.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const improvementRate = -slope; // Negative slope = improvement

  // Detect plateau (no improvement in last 5 pulls)
  const last5 = sortedPulls.slice(-5);
  const avgLast5 = last5.reduce((s, p) => s + p.bossHP, 0) / 5;
  const previous5 = sortedPulls.slice(-10, -5);
  const avgPrevious5 = previous5.length > 0 
    ? previous5.reduce((s, p) => s + p.bossHP, 0) / previous5.length 
    : avgLast5;
  
  const improvement = avgPrevious5 - avgLast5;
  const plateau = improvement < 2; // Less than 2% improvement
  const plateauPulls = plateau ? last5.length : 0;

  // Determine trend
  let trend: 'improving' | 'stagnant' | 'regressing';
  if (improvement > 5) trend = 'improving';
  else if (improvement < -3) trend = 'regressing';
  else trend = 'stagnant';

  // Predict pulls until kill
  const lastHP = sortedPulls[sortedPulls.length - 1].bossHP;
  let pullsUntilKill = -1;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let bestCase = -1;
  let worstCase = -1;

  if (improvementRate > 0 && lastHP > 0) {
    pullsUntilKill = Math.ceil(lastHP / improvementRate);
    
    // Calculate confidence based on consistency
    const variance = calculatePullVariance(recentPulls);
    if (variance < 100 && pullsUntilKill < 20) confidence = 'high';
    else if (variance < 200 && pullsUntilKill < 40) confidence = 'medium';
    else confidence = 'low';

    // Best/worst case
    bestCase = Math.max(1, Math.floor(pullsUntilKill * 0.6));
    worstCase = Math.ceil(pullsUntilKill * 1.5);
  }

  // Generate prediction text
  let prediction = '';
  if (lastHP <= 5) {
    prediction = '🎯 MUITO PERTO! Kill iminente, provavelmente no próximo pull!';
  } else if (lastHP <= 15) {
    prediction = `🔥 Próximo! ${lastHP}% HP. Foco total, kill em ${pullsUntilKill} pull(s).`;
  } else if (plateau) {
    prediction = `⚠️ Plateau detectado. HP estagnado em ~${Math.round(avgLast5)}%. Considere mudar estratégia.`;
  } else if (trend === 'improving') {
    prediction = `📈 Progresso constante! ~${pullsUntilKill} pulls até o kill (${confidence} confiança).`;
  } else if (trend === 'regressing') {
    prediction = `📉 Regressão. Estão piorando. Revisem estratégia.`;
  } else {
    prediction = `➡️ Estagnado. Considere ajustes táticos.`;
  }

  return {
    pullsUntilKill,
    confidence,
    improvementRate,
    plateau,
    plateauPulls,
    trend,
    prediction,
    bestCase,
    worstCase
  };
}

function calculatePullVariance(pulls: PullHistory[]): number {
  if (pulls.length < 2) return 0;
  const avg = pulls.reduce((s, p) => s + p.bossHP, 0) / pulls.length;
  const squaredDiffs = pulls.map(p => Math.pow(p.bossHP - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / pulls.length);
}

// ============================================
// CONSISTENCY ANALYSIS
// ============================================

export function analyzeConsistency(
  pullsByPlayer: Map<string, number[]>
): ConsistencyAnalysis {
  const players: PlayerConsistency[] = [];

  pullsByPlayer.forEach((dpsValues, playerName) => {
    if (dpsValues.length < 2) return;

    const avg = dpsValues.reduce((s, d) => s + d, 0) / dpsValues.length;
    const min = Math.min(...dpsValues);
    const max = Math.max(...dpsValues);
    
    // Standard deviation
    const squaredDiffs = dpsValues.map(d => Math.pow(d - avg, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / dpsValues.length);
    
    // Variance as percentage
    const variance = (stdDev / avg) * 100;
    
    // Consistency score (lower variance = higher consistency)
    const consistencyScore = Math.max(0, 100 - variance);
    
    // Grade
    let grade = 'C';
    if (consistencyScore >= 90) grade = 'S';
    else if (consistencyScore >= 80) grade = 'A';
    else if (consistencyScore >= 70) grade = 'B';
    else if (consistencyScore >= 50) grade = 'C';
    else if (consistencyScore >= 30) grade = 'D';
    else grade = 'F';

    players.push({
      name: playerName,
      class: '', // Would need to pass this
      role: dpsValues[0] > 200000 ? 'dps' : dpsValues[0] > 100000 ? 'healer' : 'tank',
      avgDPS: avg,
      minDPS: min,
      maxDPS: max,
      stdDev,
      variance,
      consistencyScore,
      grade,
      pullPerformances: dpsValues
    });
  });

  // Sort by consistency
  players.sort((a, b) => b.consistencyScore - a.consistencyScore);

  // Identify special cases
  const mostConsistent = players.slice(0, 3).map(p => p.name);
  const leastConsistent = players.slice(-3).map(p => p.name);
  
  // Chokers: high max DPS but low consistency
  const chokers = players
    .filter(p => p.variance > 30 && p.maxDPS > p.avgDPS * 1.3)
    .map(p => p.name);
  
  // Clutch: consistent high performers
  const clutchPerformers = players
    .filter(p => p.consistencyScore >= 80 && p.avgDPS > 150000)
    .map(p => p.name);

  return {
    players,
    mostConsistent,
    leastConsistent,
    chokers,
    clutchPerformers
  };
}

// ============================================
// BEST PULL ANALYSIS
// ============================================

export function findBestPull(
  pulls: PullHistory[]
): BestPullAnalysis | null {
  if (pulls.length === 0) return null;

  // Score each pull
  const scoredPulls = pulls.map(pull => {
    let score = 100;
    
    // Lower HP = better
    score -= pull.bossHP * 0.5;
    
    // Fewer deaths = better
    score -= pull.deaths * 5;
    
    // Higher DPS = better
    score += (pull.raidDPS / 1000000) * 2;
    
    // Duration efficiency (shorter is usually better for DPS check)
    if (pull.duration < 300) score += 5;
    
    return { ...pull, score: Math.max(0, score) };
  });

  // Find best
  scoredPulls.sort((a, b) => b.score - a.score);
  const best = scoredPulls[0];

  // Calculate averages for comparison
  const avgDPS = pulls.reduce((s, p) => s + p.raidDPS, 0) / pulls.length;
  const avgDeaths = pulls.reduce((s, p) => s + p.deaths, 0) / pulls.length;
  const avgDuration = pulls.reduce((s, p) => s + p.duration, 0) / pulls.length;

  // Generate reasons
  const reasons: string[] = [];
  if (best.bossHP <= 5) reasons.push('Boss HP mais baixo (quase kill!)');
  else if (best.bossHP === Math.min(...pulls.map(p => p.bossHP))) reasons.push('Melhor HP do progress');
  if (best.raidDPS > avgDPS * 1.1) reasons.push('DPS acima da média (+10%)');
  if (best.deaths < avgDeaths * 0.5) reasons.push('Poucas mortes');
  if (best.deaths === 0) reasons.push('Sem mortes!');
  if (best.duration < avgDuration * 0.9) reasons.push('Pull rápido e eficiente');
  if (reasons.length === 0) reasons.push('Melhor combinação de métricas');

  return {
    pullNumber: best.pullNumber,
    score: best.score,
    reasons,
    metrics: {
      bossHP: best.bossHP,
      duration: best.duration,
      deaths: best.deaths,
      raidDPS: best.raidDPS,
      mechanicsScore: 100 - best.deaths * 10
    },
    comparison: {
      vsAverage: {
        dps: Math.round(((best.raidDPS - avgDPS) / avgDPS) * 100),
        deaths: Math.round(best.deaths - avgDeaths),
        duration: Math.round(best.duration - avgDuration)
      }
    }
  };
}

// ============================================
// PROGRESSION DASHBOARD
// ============================================

export function generateProgressionDashboard(
  bossName: string,
  pulls: PullHistory[],
  playerData?: Map<string, number[]>
): ProgressionDashboard {
  const prediction = predictProgress(pulls, bossName);
  const bestPull = findBestPull(pulls);
  
  // Recent trend description
  let recentTrend = '';
  const last3 = pulls.slice(-3);
  if (last3.length >= 3) {
    const improving = last3.filter((p, i) => 
      i === 0 || p.bossHP < last3[i - 1].bossHP
    ).length;
    if (improving >= 2) recentTrend = 'Melhorando';
    else if (improving === 0) recentTrend = 'Piorando';
    else recentTrend = 'Estável';
  }

  // Key insights
  const keyInsights: string[] = [];
  
  if (prediction.plateau) {
    keyInsights.push(`Plateau de ${prediction.plateauPulls} pulls. Considere mudar estratégia.`);
  }
  
  if (bestPull && bestPull.metrics.bossHP <= 10) {
    keyInsights.push(`Melhor pull chegou a ${bestPull.metrics.bossHP}% HP.`);
  }
  
  if (prediction.trend === 'improving') {
    keyInsights.push(`Taxa de melhoria: ${prediction.improvementRate.toFixed(1)}% HP/pull`);
  }
  
  if (pulls.length >= 20 && prediction.pullsUntilKill > 30) {
    keyInsights.push('Muitos pulls. Considere trocar de boss ou estratégia.');
  }

  if (keyInsights.length === 0) {
    keyInsights.push('Continue progredindo para mais insights.');
  }

  return {
    bossName,
    totalPulls: pulls.length,
    bestPull: bestPull || {
      pullNumber: pulls.length,
      score: 50,
      reasons: ['Primeiro pull registrado'],
      metrics: { bossHP: 100, duration: 300, deaths: 0, raidDPS: 0, mechanicsScore: 50 },
      comparison: { vsAverage: { dps: 0, deaths: 0, duration: 0 } }
    },
    prediction,
    recentTrend,
    keyInsights,
    pullHistory: pulls
  };
}

// ============================================
// HELPERS - Extract real data from WCL reports
// ============================================

export function extractPullHistoryFromReport(
  fights: any[],
  bossName: string
): PullHistory[] {
  // Filter fights for the specific boss
  const bossFights = fights.filter(f => f.bossName === bossName);
  
  return bossFights.map((fight, index) => ({
    pullNumber: index + 1,
    bossHP: fight.bossHPPercent ?? (fight.kill ? 0 : 100),
    duration: fight.duration || 0,
    deaths: fight.summary?.deaths || 0,
    raidDPS: fight.summary?.raidDPS || 0,
    timestamp: fight.startTime || Date.now()
  }));
}

export function extractPlayerDataFromFights(
  fights: any[],
  playerNames: string[]
): Map<string, number[]> {
  const data = new Map<string, number[]>();
  
  playerNames.forEach(name => {
    const performances: number[] = [];
    
    fights.forEach(fight => {
      const player = (fight.players || []).find((p: any) => p.name === name);
      if (player) {
        performances.push(player.dps || player.hps || 0);
      }
    });
    
    if (performances.length > 0) {
      data.set(name, performances);
    }
  });
  
  return data;
}
