// ============================================
// COOLDOWN ANALYSIS - Janela de Cooldowns
// ============================================
// Analisa se raid CDs foram usados nos momentos certos
// Cruza com picos de dano para identificar gaps e desperdícios

import { FightData, PlayerStats } from '../combat-logs';
import { BossData, BossMechanic } from '../boss-data-midnight';

// ============================================
// COOLDOWN IDs - Important Raid Cooldowns
// ============================================

export const RAID_COOLDOWNS = {
  // Healing Raid CDs
  tranquility: { id: 740, name: 'Tranquility', class: 'Druid', type: 'healing' },
  healingTideTotem: { id: 108280, name: 'Healing Tide Totem', class: 'Shaman', type: 'healing' },
  spiritLinkTotem: { id: 98008, name: 'Spirit Link Totem', class: 'Shaman', type: 'healing' },
  divineHymn: { id: 64843, name: 'Divine Hymn', class: 'Priest', type: 'healing' },
  revival: { id: 115310, name: 'Revival', class: 'Monk', type: 'healing' },
  ancestralGuidance: { id: 108281, name: 'Ancestral Guidance', class: 'Shaman', type: 'healing' },
  flourishingLotus: { id: 374251, name: 'Restoral', class: 'Evoker', type: 'healing' },
  
  // Damage Reduction Raid CDs
  auraMastery: { id: 31821, name: 'Aura Mastery', class: 'Paladin', type: 'reduction' },
  darkness: { id: 209426, name: 'Darkness', class: 'Demon Hunter', type: 'reduction' },
  powerWordBarrier: { id: 62618, name: 'Power Word: Barrier', class: 'Priest', type: 'reduction' },
  spiritShell: { id: 109964, name: 'Spirit Shell', class: 'Priest', type: 'reduction' },
  rallyingCry: { id: 97462, name: 'Rallying Cry', class: 'Warrior', type: 'reduction' },
  
  // Bloodlust variants
  bloodlust: { id: 2825, name: 'Bloodlust', class: 'Shaman', type: 'burst' },
  heroism: { id: 32182, name: 'Heroism', class: 'Shaman', type: 'burst' },
  timeWarp: { id: 80353, name: 'Time Warp', class: 'Mage', type: 'burst' },
  ancientHysteria: { id: 90355, name: 'Ancient Hysteria', class: 'Hunter', type: 'burst' },
  netherwinds: { id: 160452, name: 'Netherwinds', class: 'Evoker', type: 'burst' },
};

// Personal Defensive CDs worth tracking
export const PERSONAL_COOLDOWNS = {
  // Tanks
  shieldWall: { id: 871, name: 'Shield Wall', class: 'Warrior', type: 'defensive' },
  dancingRuneWeapon: { id: 49028, name: 'Dancing Rune Weapon', class: 'Death Knight', type: 'defensive' },
  demonSpikes: { id: 203720, name: 'Demon Spikes', class: 'Demon Hunter', type: 'defensive' },
  ironskinBrew: { id: 115308, name: 'Ironskin Brew', class: 'Monk', type: 'defensive' },
  guardianOfAncientKings: { id: 86659, name: 'Guardian of Ancient Kings', class: 'Paladin', type: 'defensive' },
  survivalInstincts: { id: 61336, name: 'Survival Instincts', class: 'Druid', type: 'defensive' },
  
  // Healers
  divineShield: { id: 642, name: 'Divine Shield', class: 'Paladin', type: 'immune' },
  dispersion: { id: 47585, name: 'Dispersion', class: 'Priest', type: 'defensive' },
  iceBlock: { id: 45438, name: 'Ice Block', class: 'Mage', type: 'immune' },
};

// ============================================
// TYPES
// ============================================

export interface CooldownUsage {
  abilityId: number;
  abilityName: string;
  player: string;
  playerClass: string;
  castTime: number; // seconds into fight
  effectiveness: number; // 0-100 score
  issues: string[];
}

export interface DamageSpike {
  time: number; // seconds into fight
  duration: number; // seconds
  damageAmount: number;
  damageType: 'raid_wide' | 'targeted' | 'mechanic';
  mechanicName?: string;
  cooldownsAvailable: string[];
  cooldownsUsed: string[];
  coverage: number; // percentage of spike covered by CDs
}

export interface CooldownGap {
  time: number;
  duration: number;
  damageTaken: number;
  availableCdsNotUsed: string[];
  severity: 'critical' | 'warning' | 'info';
}

export interface CooldownAnalysisResult {
  overallScore: number; // 0-100
  totalCooldowns: number;
  wellTimedCount: number;
  wastedCount: number;
  gaps: CooldownGap[];
  usages: CooldownUsage[];
  damageSpikes: DamageSpike[];
  recommendations: string[];
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export function analyzeCooldownUsage(
  fight: FightData,
  dtpsTimeline: number[], // damage taken per second
  bossData?: BossData
): CooldownAnalysisResult {
  // 1. Identify damage spikes from DTPS timeline
  const damageSpikes = identifyDamageSpikes(dtpsTimeline, fight.duration, bossData);
  
  // 2. Get cooldown casts (would come from WCL events)
  // For now, we'll use mock data structure
  const cooldownCasts = extractCooldownCasts(fight);
  
  // 3. Match cooldowns to damage spikes
  const usages = analyzeCooldownTiming(cooldownCasts, damageSpikes, fight);
  
  // 4. Find gaps (damage spikes with no CDs)
  const gaps = findCooldownGaps(damageSpikes, cooldownCasts);
  
  // 5. Calculate overall score
  const score = calculateCooldownScore(usages, gaps, damageSpikes);
  
  // 6. Generate recommendations
  const recommendations = generateRecommendations(usages, gaps, damageSpikes);

  return {
    overallScore: score,
    totalCooldowns: cooldownCasts.length,
    wellTimedCount: usages.filter(u => u.effectiveness >= 70).length,
    wastedCount: usages.filter(u => u.effectiveness < 30).length,
    gaps,
    usages,
    damageSpikes,
    recommendations
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function identifyDamageSpikes(
  dtpsTimeline: number[], 
  duration: number,
  bossData?: BossData
): DamageSpike[] {
  const spikes: DamageSpike[] = [];
  
  if (dtpsTimeline.length === 0) return spikes;
  
  // Calculate average DTPS
  const avgDtps = dtpsTimeline.reduce((a, b) => a + b, 0) / dtpsTimeline.length;
  const threshold = avgDtps * 1.5; // Spike is 50% above average
  
  let inSpike = false;
  let spikeStart = 0;
  let spikeDamage = 0;
  
  for (let i = 0; i < dtpsTimeline.length; i++) {
    const time = i;
    const dtps = dtpsTimeline[i];
    
    if (dtps > threshold && !inSpike) {
      // Start of spike
      inSpike = true;
      spikeStart = time;
      spikeDamage = dtps;
    } else if (dtps > threshold && inSpike) {
      // Continue spike
      spikeDamage += dtps;
    } else if (dtps <= threshold && inSpike) {
      // End of spike
      inSpike = false;
      
      const duration = time - spikeStart;
      if (duration >= 2) { // Only count spikes of 2+ seconds
        spikes.push({
          time: spikeStart,
          duration,
          damageAmount: spikeDamage,
          damageType: 'raid_wide',
          mechanicName: identifyMechanicAtTime(spikeStart, bossData),
          cooldownsAvailable: [],
          cooldownsUsed: [],
          coverage: 0
        });
      }
    }
  }
  
  return spikes;
}

function identifyMechanicAtTime(time: number, bossData?: BossData): string | undefined {
  if (!bossData) return undefined;
  
  // Find mechanic that occurs around this time
  // This would need boss phase/mechanic timing data
  for (const mechanic of bossData.mechanics) {
    if (mechanic.type === 'raid_cd' && mechanic.frequency) {
      // Check if time matches approximate cast time
      const expectedCast = Math.floor(time / mechanic.frequency) * mechanic.frequency;
      if (Math.abs(time - expectedCast) < 5) {
        return mechanic.name;
      }
    }
  }
  
  return undefined;
}

function extractCooldownCasts(fight: FightData): CooldownUsage[] {
  // In real implementation, this would extract from WCL cast events
  // For now, return empty array
  return [];
}

function analyzeCooldownTiming(
  casts: CooldownUsage[],
  spikes: DamageSpike[],
  fight: FightData
): CooldownUsage[] {
  return casts.map(cast => {
    // Find nearest damage spike
    const nearestSpike = spikes.find(spike => 
      Math.abs(spike.time - cast.castTime) <= 5
    );
    
    let effectiveness = 50;
    const issues: string[] = [];
    
    if (nearestSpike) {
      // CD was used during a spike - good!
      // Calculate effectiveness based on timing precision
      const timingOffset = Math.abs(cast.castTime - nearestSpike.time);
      
      // Perfect timing (used 0-2s before spike) = 95-100%
      // Good timing (used at spike start) = 85-94%
      // Late timing (used after spike started) = 60-84%
      if (cast.castTime <= nearestSpike.time) {
        effectiveness = 95 - (timingOffset * 2); // Before or at spike = excellent
      } else if (cast.castTime <= nearestSpike.time + 2) {
        effectiveness = 85 - (timingOffset * 5); // Early spike = good
      } else {
        effectiveness = 70 - ((cast.castTime - nearestSpike.time - 2) * 5); // Late = reduced
        issues.push('Usado após o pico de dano começar');
      }
      
      // Bonus for covering high-damage spike
      if (nearestSpike.damageAmount > 2000000) {
        effectiveness = Math.min(100, effectiveness + 5);
      }
    } else {
      // CD was used when there was no spike - potentially wasted
      // Calculate distance to nearest spike (even if outside optimal window)
      const nearestAnySpike = spikes.reduce((nearest, spike) => {
        const dist = Math.abs(spike.time - cast.castTime);
        return dist < nearest.dist ? { spike, dist } : nearest;
      }, { spike: null as DamageSpike | null, dist: Infinity });
      
      if (nearestAnySpike.dist < 15) {
        // Close to a spike but not quite aligned
        effectiveness = 40;
        issues.push('Usado próximo de janela de dano, mas fora do timing ideal');
      } else {
        // Far from any spike
        effectiveness = 25;
        issues.push('Usado fora de janela de alto dano');
      }
    }
    
    return {
      ...cast,
      effectiveness: Math.max(0, Math.min(100, effectiveness)),
      issues
    };
  });
}

function findCooldownGaps(
  spikes: DamageSpike[],
  casts: CooldownUsage[]
): CooldownGap[] {
  const gaps: CooldownGap[] = [];
  
  for (const spike of spikes) {
    // Find CDs used during this spike
    const cdsDuringSpike = casts.filter(c => 
      c.castTime >= spike.time - 2 && c.castTime <= spike.time + spike.duration
    );
    
    if (cdsDuringSpike.length === 0) {
      // Gap found - spike with no CDs
      gaps.push({
        time: spike.time,
        duration: spike.duration,
        damageTaken: spike.damageAmount,
        availableCdsNotUsed: [], // Would list available CDs
        severity: spike.damageAmount > 1000000 ? 'critical' : 'warning'
      });
    } else {
      spike.cooldownsUsed = cdsDuringSpike.map(c => c.abilityName);
      spike.coverage = Math.min(100, cdsDuringSpike.length * 30);
    }
  }
  
  return gaps;
}

function calculateCooldownScore(
  usages: CooldownUsage[],
  gaps: CooldownGap[],
  spikes: DamageSpike[]
): number {
  if (usages.length === 0 && spikes.length === 0) return 100;
  if (usages.length === 0 && spikes.length > 0) return 0;
  
  // Score based on:
  // - How many spikes were covered
  // - How well timed the CDs were
  // - How many gaps there were
  
  const avgEffectiveness = usages.length > 0 
    ? usages.reduce((sum, u) => sum + u.effectiveness, 0) / usages.length 
    : 0;
  
  const spikesCovered = spikes.filter(s => s.coverage > 0).length;
  const spikeCoverageScore = spikes.length > 0 
    ? (spikesCovered / spikes.length) * 100 
    : 100;
  
  const gapPenalty = gaps.reduce((sum, g) => {
    return sum + (g.severity === 'critical' ? 20 : 10);
  }, 0);
  
  return Math.max(0, Math.min(100, 
    avgEffectiveness * 0.4 + 
    spikeCoverageScore * 0.4 - 
    gapPenalty
  ));
}

function generateRecommendations(
  usages: CooldownUsage[],
  gaps: CooldownGap[],
  spikes: DamageSpike[]
): string[] {
  const recommendations: string[] = [];
  
  // Check for critical gaps
  const criticalGaps = gaps.filter(g => g.severity === 'critical');
  if (criticalGaps.length > 0) {
    recommendations.push(
      `⚠️ ${criticalGaps.length} janela(s) de dano sem cooldown. ` +
      `Considere ajustar o CD rotation.`
    );
  }
  
  // Check for wasted CDs
  const wastedCds = usages.filter(u => u.effectiveness < 30);
  if (wastedCds.length > 0) {
    recommendations.push(
      `${wastedCds.length} cooldown(s) usados em momentos de baixo dano. ` +
      `Salve para picos de dano.`
    );
  }
  
  // Check for late CD usage
  const lateCds = usages.filter(u => u.issues.some(i => i.includes('após')));
  if (lateCds.length > 0) {
    recommendations.push(
      `${lateCds.length} cooldown(s) usados tardiamente. ` +
      `Use ANTES do pico de dano, não durante.`
    );
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Bom uso de cooldowns! Continue assim.');
  }
  
  return recommendations;
}

// ============================================
// FORMATTING HELPER
// ============================================

export function formatCooldownAnalysis(result: CooldownAnalysisResult): string {
  const lines: string[] = [];
  
  lines.push(`🛡️ ANÁLISE DE COOLDOWNS`);
  lines.push(``);
  lines.push(`📊 Score de Alinhamento: ${Math.round(result.overallScore)}/100`);
  lines.push(``);
  
  if (result.gaps.length > 0) {
    lines.push(`⚠️ GAPS IDENTIFICADOS:`);
    result.gaps.forEach(gap => {
      const icon = gap.severity === 'critical' ? '🔴' : '🟡';
      lines.push(`${icon} ${formatTime(gap.time)} - ${gap.duration}s sem CD`);
    });
    lines.push(``);
  }
  
  if (result.wastedCount > 0) {
    lines.push(`❌ Cooldowns Desperdiçados: ${result.wastedCount}`);
  }
  
  lines.push(`✅ Cooldowns Bem Usados: ${result.wellTimedCount}`);
  lines.push(``);
  
  lines.push(`💡 RECOMENDAÇÕES:`);
  result.recommendations.forEach(r => lines.push(`• ${r}`));
  
  return lines.join('\n');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
