// ============================================
// WIPE ANALYSIS - Cadeia de Mortes
// ============================================
// Identifica a "morte raiz" que causou o wipe
// e rastreia o impacto em cadeia

import { FightData, PlayerStats } from '../combat-logs';
import { BossData, BossMechanic, getMechanicByAbility } from '../boss-data-midnight';

// ============================================
// TYPES
// ============================================

export interface DeathEvent {
  playerId: number;
  playerName: string;
  time: number; // seconds into fight
  ability: string;
  abilityId: number;
  damage: number;
  hpRemaining: number;
}

export interface DeathCascade {
  rootDeath: DeathNode;
  chainDeaths: DeathNode[];
  timeToWipeInevitable: number; // seconds after root death
  impact: 'critical' | 'high' | 'medium' | 'low';
  recoveryPossible: boolean;
  recommendation: string;
}

export interface DeathNode {
  death: DeathEvent;
  impact: string;
  relatedMechanic?: BossMechanic;
  causedBy?: number; // playerId da morte que causou esta
  causedDeaths: number[]; // playerIds das mortes causadas
  phase: string;
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeDeathCascade(
  deaths: DeathEvent[],
  fight: FightData,
  bossData?: BossData
): DeathCascade | null {
  if (deaths.length === 0) return null;

  // Sort deaths by time
  const sortedDeaths = [...deaths].sort((a, b) => a.time - b.time);

  // Build death nodes
  const deathNodes: DeathNode[] = sortedDeaths.map(death => ({
    death,
    impact: assessDeathImpact(death, fight),
    relatedMechanic: bossData 
      ? getMechanicByAbility(death.ability, bossData) 
      : undefined,
    causedDeaths: [],
    phase: getPhaseAtTime(death.time, fight, bossData)
  }));

  // Find the root cause death
  const rootDeath = findRootDeath(deathNodes, fight);
  
  // Build the cascade tree
  buildCascadeTree(deathNodes, fight);

  // Calculate time to inevitable wipe
  const timeToWipe = calculateTimeToWipe(rootDeath, fight);

  // Generate recommendation
  const recommendation = generateRecommendation(rootDeath, fight, bossData);

  return {
    rootDeath,
    chainDeaths: deathNodes.filter(n => n !== rootDeath),
    timeToWipeInevitable: timeToWipe,
    impact: rootDeath.impact as any,
    recoveryPossible: assessRecoveryPossibility(deathNodes, fight),
    recommendation
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function assessDeathImpact(death: DeathEvent, fight: FightData): string {
  const timePercent = death.time / fight.duration;
  
  // Early deaths are usually more impactful
  if (timePercent < 0.3) {
    return 'critical';
  }
  
  // Late deaths might not matter
  if (timePercent > 0.8) {
    return 'low';
  }
  
  // Check if it's a key role
  const player = fight.players.find(p => p.name === death.playerName);
  if (player?.role === 'tank') {
    return 'critical';
  }
  if (player?.role === 'healer') {
    return 'high';
  }
  
  return 'medium';
}

function getPhaseAtTime(time: number, fight: FightData, bossData?: BossData): string {
  if (!bossData?.phases || bossData.phases.length === 0) {
    const percent = (time / fight.duration) * 100;
    if (percent < 25) return 'Early';
    if (percent < 50) return 'Mid';
    if (percent < 75) return 'Late';
    return 'Final';
  }

  const fightPercent = (time / fight.duration) * 100;
  
  for (const phase of bossData.phases) {
    if (fightPercent >= phase.hpRange[1] && fightPercent <= phase.hpRange[0]) {
      return phase.name;
    }
  }

  return 'Unknown Phase';
}

function findRootDeath(deaths: DeathNode[], fight: FightData): DeathNode {
  // The root death is usually:
  // 1. The first death if it's early (before 30%)
  // 2. The first critical role death
  // 3. The first avoidable death
  
  for (const death of deaths) {
    const timePercent = death.death.time / fight.duration;
    
    // Early critical death = root
    if (timePercent < 0.3 && death.impact === 'critical') {
      return death;
    }
    
    // Tank death is almost always root
    if (death.impact === 'critical') {
      return death;
    }
  }
  
  // Default to first death
  return deaths[0];
}

function buildCascadeTree(deathNodes: DeathNode[], fight: FightData): void {
  // For each death, try to find if it caused subsequent deaths
  // This is based on timing and role relationships
  
  for (let i = 0; i < deathNodes.length; i++) {
    const currentDeath = deathNodes[i];
    
    for (let j = i + 1; j < deathNodes.length; j++) {
      const laterDeath = deathNodes[j];
      const timeDiff = laterDeath.death.time - currentDeath.death.time;
      
      // If death happened within 10 seconds, might be related
      if (timeDiff <= 10) {
        // Check if there's a causal relationship
        if (isCausalRelationship(currentDeath, laterDeath, fight)) {
          laterDeath.causedBy = currentDeath.death.playerId;
          currentDeath.causedDeaths.push(laterDeath.death.playerId);
        }
      }
    }
  }
}

function isCausalRelationship(
  earlier: DeathNode, 
  later: DeathNode, 
  fight: FightData
): boolean {
  const earlierPlayer = fight.players.find(p => p.name === earlier.death.playerName);
  const laterPlayer = fight.players.find(p => p.name === later.death.playerName);
  
  if (!earlierPlayer || !laterPlayer) return false;
  
  // Tank death -> Healer death (trying to compensate)
  if (earlierPlayer.role === 'tank' && laterPlayer.role === 'healer') {
    return true;
  }
  
  // Healer death -> DPS death (no healing)
  if (earlierPlayer.role === 'healer' && laterPlayer.role === 'dps') {
    return true;
  }
  
  // Same mechanic killed both (probably related)
  if (earlier.death.ability === later.death.ability) {
    return true;
  }
  
  return false;
}

function calculateTimeToWipe(rootDeath: DeathNode, fight: FightData): number {
  // Calculate how long after root death the wipe became inevitable
  const remainingTime = fight.duration - rootDeath.death.time;
  return remainingTime;
}

function assessRecoveryPossibility(deaths: DeathNode[], fight: FightData): boolean {
  const tanks = fight.players.filter(p => p.role === 'tank');
  const healers = fight.players.filter(p => p.role === 'healer');
  
  const deadTanks = deaths.filter(d => {
    const player = fight.players.find(p => p.name === d.death.playerName);
    return player?.role === 'tank';
  }).length;
  
  const deadHealers = deaths.filter(d => {
    const player = fight.players.find(p => p.name === d.death.playerName);
    return player?.role === 'healer';
  }).length;
  
  // Recovery is possible if:
  // - At least 1 tank alive
  // - At least 1 healer alive
  // - Less than 50% of raid dead
  
  return deadTanks < tanks.length && 
         deadHealers < healers.length &&
         deaths.length < fight.composition.total / 2;
}

function generateRecommendation(
  rootDeath: DeathNode, 
  fight: FightData, 
  bossData?: BossData
): string {
  const player = fight.players.find(p => p.name === rootDeath.death.playerName);
  const mechanic = rootDeath.relatedMechanic;
  
  if (mechanic) {
    // Use the boss mechanic tip
    return `${rootDeath.death.playerName} morreu para ${mechanic.name}. ${mechanic.tip}`;
  }
  
  // Generic recommendations based on role
  if (player?.role === 'tank') {
    const time = formatTime(rootDeath.death.time);
    return `Tank morreu cedo (${time}). Verifique tank swap e uso de defensives.`;
  }
  
  if (player?.role === 'healer') {
    const time = formatTime(rootDeath.death.time);
    return `Healer morreu em ${time}. Posicionamento ou uso de CDs pode ter sido inadequado.`;
  }
  
  return `${rootDeath.death.playerName} morreu para ${rootDeath.death.ability}. Evite este dano.`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// CASCADE TREE VISUALIZATION HELPER
// ============================================

export function formatCascadeTree(cascade: DeathCascade): string {
  const lines: string[] = [];
  
  lines.push(`💀 CADEIA DE MORTES IDENTIFICADA`);
  lines.push(``);
  lines.push(`Morte Raiz: ${cascade.rootDeath.death.playerName} morreu para ${cascade.rootDeath.death.ability} (${formatTime(cascade.rootDeath.death.time)})`);
  
  if (cascade.chainDeaths.length > 0) {
    lines.push(`├─ Impacto: ${cascade.rootDeath.impact}`);
    
    cascade.chainDeaths.forEach((node, index) => {
      const prefix = index === cascade.chainDeaths.length - 1 ? '└─' : '├─';
      lines.push(`${prefix} ${formatTime(node.death.time)} - ${node.death.playerName} morreu para ${node.death.ability}`);
    });
  }
  
  lines.push(``);
  lines.push(`🔴 Recomendação: ${cascade.recommendation}`);
  
  if (!cascade.recoveryPossible) {
    lines.push(`⚠️ Wipe era inevitável após a morte raiz.`);
  }
  
  return lines.join('\n');
}
