import type { InsightSnapshot } from './log-insight-types';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function phaseLabelFor(fight: any, timeSec = 0) {
  const phases = fight?.phases || [];
  const phase = phases.find((item: any) => timeSec * 1000 >= item.startTime && timeSec * 1000 < item.endTime);
  return phase?.name || phases[0]?.name || 'Full Fight';
}

function topDeaths(deathAnalysis: any) {
  const deaths = deathAnalysis?.summary?.byAbility || {};
  return Object.entries(deaths)
    .map(([ability, count]) => ({ ability, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export function buildCalibrationSnapshotFromFightPayload(payload: any, reportCode: string): InsightSnapshot {
  const fight = payload.fight;
  const summary = fight.summary || {};
  const deaths = topDeaths(payload.deathAnalysis);
  const lowerBoss = String(fight.bossName || '').toLowerCase();
  const briefInsights: InsightSnapshot['briefInsights'] = [];

  if (deaths[0]) {
    const main = deaths[0];
    briefInsights.push({
      id: `death-${main.ability}`,
      kind: 'raid_strategy',
      severity: main.count >= 4 ? 'critical' : 'warning',
      confidence: 'high',
      priorityScore: 100 + main.count * 6,
      owner: main.ability.toLowerCase().includes('blade') ? 'Tanks' : 'Raid',
      phase: phaseLabelFor(fight, Math.floor(fight.duration * 0.65)),
      summary: `${main.ability} is the main repeated wipe signal on this pull.`,
      evidence: `${main.count} death event(s) were linked to ${main.ability}.`,
      recommendation: `Clean up ${main.ability} before changing lower-value optimizations.`,
      category: 'mechanics',
    });
  }

  if (lowerBoss.includes('averzian')) {
    briefInsights.unshift({
      id: 'averzian-void-blast',
      kind: 'raid_cooldown',
      severity: fight.kill ? 'info' : 'critical',
      confidence: 'high',
      priorityScore: fight.kill ? 78 : 142,
      owner: 'Healers + RL',
      phase: 'Phase 2: Imperial Wrath',
      summary: fight.kill
        ? 'Void Blast coverage and Imperial Decree positioning stayed controlled through the kill.'
        : 'Void Blast coverage and Imperial Decree positioning are the main progression gate on Averzian.',
      evidence: fight.kill
        ? `Kill pull with ${summary.deaths || 0} death(s) and ${summary.raidHPS || 0} raid HPS through the dangerous middle phase.`
        : `The pull ended at ${(fight.bossHPPercent ?? 100)}% boss HP with repeated pressure in the dangerous middle phase.`,
      recommendation: fight.kill
        ? 'Keep the same raid-CD map and positioning discipline through Phase 2.'
        : 'Map raid cooldowns to Void Blast and tighten Imperial Decree positioning before the next pull.',
      category: fight.kill ? 'strategy' : 'cooldowns',
    });
  }

  if (lowerBoss.includes('vorasius')) {
    briefInsights.unshift({
      id: 'vorasius-assignments',
      kind: 'raid_assignment',
      severity: fight.kill ? 'info' : 'critical',
      confidence: 'high',
      priorityScore: fight.kill ? 82 : 150,
      owner: fight.kill ? 'Assigned kickers, Assigned soakers, Healers + RL' : 'Assigned kickers, Assigned soakers',
      phase: 'Phase 2: Feast of Shadows',
      summary: fight.kill
        ? 'Void Scream interrupts, Consume Essence soaks, and Shadow Feast coverage stayed stable on the kill.'
        : 'Void Scream interrupts and Consume Essence soaks are the main wipe gate on Vorasius.',
      evidence: fight.kill
        ? `Kill pull with ${summary.interrupts || 0} interrupts and ${summary.dispels || 0} dispels recorded.`
        : `The pull ended at ${(fight.bossHPPercent ?? 100)}% boss HP on a fight built around kick order and orb coverage.`,
      recommendation: fight.kill
        ? 'Keep the same kick rotation, soak assignments, and Shadow Feast plan.'
        : 'Treat this as an assignment fight first: lock kick order, soak ownership, and Shadow Feast coverage before pull.',
      category: 'strategy',
    });
  }

  if (lowerBoss.includes('salhadaar')) {
    briefInsights.unshift({
      id: 'salhadaar-coordination',
      kind: 'raid_strategy',
      severity: fight.kill ? 'info' : 'warning',
      confidence: 'high',
      priorityScore: fight.kill ? 84 : 120,
      owner: fight.kill ? 'Raid, Assigned kickers, Tanks' : 'Raid',
      phase: 'Phase 2: Realm of Shadows',
      summary: fight.kill
        ? "King's Decree, Void Shockwave, Shadow Realm, and Guardian interrupts stayed controlled on the kill."
        : "Salhadaar is breaking down on decree reactions, shockwave movement, or realm coordination.",
      evidence: fight.kill
        ? `Kill pull with ${summary.deaths || 0} death(s) on a coordination-heavy encounter.`
        : `The fight hinges on decree reactions, shockwave timing, and add interrupts.`,
      recommendation: fight.kill
        ? 'Keep the same decree calls, shockwave movement, and Guardian interrupt plan.'
        : 'Tighten decree calls, shockwave movement, and Guardian interrupt ownership before the next pull.',
      category: 'strategy',
    });
  }

  if (lowerBoss.includes('vaelgor') || lowerBoss.includes('ezzorak')) {
    briefInsights.unshift({
      id: 'twins-sync',
      kind: 'raid_strategy',
      severity: fight.kill ? 'info' : 'critical',
      confidence: 'high',
      priorityScore: fight.kill ? 84 : 138,
      owner: 'Raid, Healers + RL, Tanks',
      phase: 'Phase 2: Dark Synchronization',
      summary: fight.kill
        ? 'Duplicate control, Twisted Fusion movement, and Shadow Nova coverage stayed stable into Phase 2.'
        : 'Twisted Fusion, Duplicate control, and Shadow Nova stabilization are the wipe gate on the twins.',
      evidence: fight.kill
        ? `Kill pull lasting ${fight.duration}s through the synchronized second phase.`
        : `Wipe pull lasting ${fight.duration}s with the encounter hinging on beam discipline and duplicate control.`,
      recommendation: fight.kill
        ? 'Keep the same duplicate assignments, beam discipline, and raid-CD plan.'
        : 'Fix beam discipline, duplicate control, and Shadow Nova coverage before changing throughput targets.',
      category: 'strategy',
    });
  }

  if (lowerBoss.includes('vanguard')) {
    briefInsights.unshift({
      id: 'vanguard-soaks',
      kind: 'raid_assignment',
      severity: fight.kill ? 'info' : 'critical',
      confidence: 'high',
      priorityScore: fight.kill ? 82 : 140,
      owner: 'Assigned soakers, Healers + RL, Raid',
      phase: 'Phase 3: Light and Void',
      summary: fight.kill
        ? 'Void Touched soaks, beam discipline, and Righteous Flame coverage stayed stable into the kill.'
        : 'Void Touched soaks and Righteous Flame coverage are the main progression gate on Vanguard.',
      evidence: fight.kill
        ? `Kill pull with ${summary.deaths || 0} death(s) on a beam-and-soak encounter.`
        : `This fight is built around soak ownership and stable raid-CD coverage.`,
      recommendation: fight.kill
        ? 'Keep the same soak map, beam movement, and Righteous Flame cooldown plan.'
        : 'Pre-assign soaks, clean up beam movement, and map a raid CD to every dangerous Flame window.',
      category: 'strategy',
    });
  }

  if (lowerBoss.includes('crown')) {
    briefInsights.unshift({
      id: 'crown-platforms',
      kind: 'raid_cooldown',
      severity: fight.kill ? 'info' : 'critical',
      confidence: 'high',
      priorityScore: fight.kill ? 86 : 146,
      owner: 'Healers + RL, Raid',
      phase: 'Phase 3: Three Platforms',
      summary: fight.kill
        ? 'Devouring Cosmos coverage, movement, and spacing stayed stable into the final platform phase.'
        : 'Crown is punishing movement, spacing, and Devouring Cosmos coverage before the final platform burn.',
      evidence: fight.kill
        ? `Kill pull lasting ${fight.duration}s with final-phase pressure handled successfully.`
        : `The pull ended at ${(fight.bossHPPercent ?? 100)}% HP on a fight that ramps movement and healing pressure before the real burn.`,
      recommendation: fight.kill
        ? 'Keep Hero/Lust for the final platform phase and preserve the same raid-CD map.'
        : 'Clean up movement and spacing first, and keep Hero/Lust for the final platform phase.',
      category: 'strategy',
    });
  }

  if (summary.raidDPS && !fight.kill && (fight.bossHPPercent ?? 100) > 20) {
    briefInsights.push({
      id: 'throughput-gap',
      kind: 'player_execution',
      severity: 'warning',
      confidence: 'medium',
      priorityScore: 88,
      owner: 'Raid',
      phase: phaseLabelFor(fight, Math.floor(fight.duration * 0.75)),
      summary: 'Throughput stayed too low to finish the pull cleanly.',
      evidence: `${formatNumber(summary.raidDPS)} raid DPS on a pull ending at ${(fight.bossHPPercent ?? 100)}% boss HP.`,
      recommendation: 'Review uptime, potion timing, and cooldown alignment after fixing the main mechanic failures.',
      category: 'throughput',
    });
  }

  const causeChains = (() => {
    if (lowerBoss.includes('averzian')) {
      return [
        fight.kill
          ? 'Raid-CD map held through Void Blast -> Imperial Decree positioning stayed clean -> the raid pushed through the dangerous middle phase.'
          : 'Void Blast pressure landed during the dangerous middle phase -> Imperial Decree positioning slipped -> the pull collapsed before the boss died.',
      ];
    }
    if (lowerBoss.includes('vorasius')) {
      return [
        fight.kill
          ? 'Kick rotation held on Void Scream -> Consume Essence soaks stayed clean -> the raid stabilized Shadow Feast and secured the kill.'
          : 'Kick or soak execution slipped -> Void Scream or orb pressure broke the assignment plan -> the pull failed before recovery.',
      ];
    }
    if (lowerBoss.includes('salhadaar')) {
      return [
        "Decree reactions and Shockwave movement stayed controlled -> Shadow Realm coordination held -> Guardian interrupts stayed reliable through the kill.",
      ];
    }
    if (lowerBoss.includes('vaelgor') || lowerBoss.includes('ezzorak')) {
      return [
        fight.kill
          ? 'Duplicate control stayed stable -> Twisted Fusion movement stayed clean -> raid-CD coverage carried the synchronized phase.'
          : 'Twisted Fusion or duplicate control slipped -> Shadow Nova pressure spiked -> the raid lost control of the synchronized phase.',
      ];
    }
    if (lowerBoss.includes('vanguard')) {
      return [
        'Soak coverage held -> Righteous Flame coverage stayed stable -> the raid kept beam discipline into the final phase.',
      ];
    }
    if (lowerBoss.includes('crown')) {
      return [
        fight.kill
          ? 'Devouring Cosmos coverage held -> movement and spacing stayed controlled -> the raid converted the final platform phase.'
          : 'Movement or spacing slipped -> Devouring Cosmos pressure stacked up -> the raid failed before the final platform phase converted.',
      ];
    }
    if (briefInsights[0]) {
      return [`${briefInsights[0].summary} -> ${briefInsights[0].evidence}`];
    }
    return [
      `The raid ended with ${summary.deaths || 0} death(s) and ${(fight.bossHPPercent ?? 100)}% boss HP remaining.`,
    ];
  })();

  return {
    key: `${fight.bossName.toLowerCase()}::${fight.id}`,
    fightId: fight.id,
    bossName: fight.bossName,
    reportCode,
    recordedAt: new Date().toISOString(),
    kill: fight.kill,
    bossHP: fight.bossHPPercent,
    duration: fight.duration,
    briefInsights: briefInsights.slice(0, 4),
    deltaInsights: [],
    playerCoaching: [],
    assignmentAssessments: [],
    phaseSuccessCriteria: [],
    causeChains,
  };
}
