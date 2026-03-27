import type { BossData } from '@/lib/boss-data-midnight';
import type { BriefInsight, AssignmentAssessment } from './log-insight-types';

interface BossRuleEngineInput {
  bossData?: BossData;
  assignmentAssessments: AssignmentAssessment[];
  cooldownGaps: { time: number }[];
  phaseLabelFor: (time?: number) => string;
  dominantPhase?: { phase: string };
  healerNames: string[];
  fightKill?: boolean;
}

interface BossPhaseCriterionInput {
  bossData?: BossData;
  phaseName: string;
  phaseDeaths: number;
  phaseAvoidable: number;
  phaseGaps: number;
  phaseMechanics: BossData['mechanics'];
  assignmentAssessments: AssignmentAssessment[];
  fightKill?: boolean;
}

export function getBossRulePackInsight({
  bossData,
  assignmentAssessments,
  cooldownGaps,
  phaseLabelFor,
  dominantPhase,
  healerNames,
  fightKill,
}: BossRuleEngineInput): BriefInsight | undefined {
  if (!bossData) return undefined;

  const phase = dominantPhase?.phase || 'Full Fight';
  const failingInterrupt = assignmentAssessments.find((assessment) => assessment.category === 'interrupt' && assessment.status === 'failing');
  const failingSoak = assignmentAssessments.find((assessment) => assessment.category === 'soak' && assessment.status === 'failing');
  const failingRaidCd = assignmentAssessments.find((assessment) => assessment.category === 'raid_cd' && (fightKill ? assessment.status === 'failing' : assessment.status !== 'covered'));
  const failingDispel = assignmentAssessments.find((assessment) => assessment.category === 'dispel' && assessment.status === 'failing');

  switch (bossData.nickname) {
    case 'vorasius':
      if (failingInterrupt?.mechanic.toLowerCase().includes('void scream')) {
        return {
          id: 'bossrule-vorasius-void-scream',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 168,
          owner: fightKill ? 'Assigned kickers, Assigned soakers, Healers + RL' : 'Assigned kickers, Assigned soakers',
          phase: failingInterrupt.phase || phase,
          summary: 'Void Scream coverage is the wipe gate on Vorasius.',
          evidence: failingInterrupt.evidence,
          confidenceReasons: [
            'Vorasius explicitly requires a stable kick rotation on Void Scream.',
            'The boss data marks failed kicks here as raid-wiping.',
            ...(failingInterrupt.confidenceReasons || []),
          ],
          recommendation: 'Lock a named kick order for every Void Scream cast and assign backup kicks before pull.',
          category: 'strategy',
        };
      }
      if (failingSoak?.mechanic.toLowerCase().includes('consume essence')) {
        return {
          id: 'bossrule-vorasius-soaks',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 156,
          owner: 'Assigned soakers',
          phase: failingSoak.phase || phase,
          summary: 'Consume Essence soaks are the main progression check on Vorasius.',
          evidence: failingSoak.evidence,
          confidenceReasons: [
            'Vorasius Phase 2 is built around orb soak execution.',
            'The boss data calls out orb soaks as a critical phase requirement.',
            ...(failingSoak.confidenceReasons || []),
          ],
          recommendation: 'Pre-assign one soak owner per orb, add backups, and pair personals with each position.',
          category: 'strategy',
        };
      }
      return {
        id: 'bossrule-vorasius-baseline',
        kind: 'raid_assignment',
        severity: fightKill ? 'info' : 'critical',
        confidence: 'high',
        priorityScore: fightKill ? 150 : 164,
        owner: fightKill ? 'Assigned kickers, Assigned soakers, Healers + RL' : 'Assigned kickers, Assigned soakers',
        phase,
        summary: fightKill
          ? 'Void Scream interrupts, Consume Essence soaks, and Shadow Feast coverage stayed stable on the kill.'
          : 'Void Scream interrupts and Consume Essence soaks are the main wipe gate on Vorasius.',
        evidence: fightKill
          ? 'The fight stayed stable through its assignment checks.'
          : 'Vorasius is an assignment fight first, especially on kicks and soaks.',
        confidenceReasons: [
          'Vorasius is defined by kick order and soak execution.',
          'The reviewed fixtures expect assignment-first diagnosis on this boss.',
        ],
        recommendation: fightKill
          ? 'Keep the same kick rotation, soak map, and Shadow Feast coverage.'
          : 'Lock kick order, soak ownership, and healer coverage before changing throughput goals.',
        category: 'strategy',
      };
      break;
    case 'averzian':
      if (failingRaidCd?.mechanic.toLowerCase().includes('void blast')) {
        return {
          id: 'bossrule-averzian-void-blast',
          kind: 'raid_cooldown',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 150,
          owner: 'Healers + RL',
          phase: failingRaidCd.phase || phase,
          summary: 'Empowered Void Blast needs a fixed raid-CD map on Averzian.',
          evidence: failingRaidCd.evidence,
          confidenceReasons: [
            'Averzian uses Void Blast as the primary raid-damage checkpoint.',
            'The static boss rules explicitly call for raid CDs on empowered blasts.',
            ...(failingRaidCd.confidenceReasons || []),
          ],
          recommendation: 'Map one named raid cooldown to every Void Blast in the dangerous phases before pull.',
          category: 'cooldowns',
        };
      }
      return {
        id: 'bossrule-averzian-baseline',
        kind: 'raid_cooldown',
        severity: fightKill ? 'info' : 'critical',
        confidence: 'high',
        priorityScore: fightKill ? 148 : 160,
        owner: 'Healers + RL',
        phase,
        summary: fightKill
          ? 'Void Blast coverage and Imperial Decree positioning stayed controlled through the kill.'
          : 'Void Blast coverage and Imperial Decree positioning are the main progression gate on Averzian.',
        evidence: fightKill
          ? 'Averzian was stabilized through the dangerous middle phase.'
          : 'Averzian usually breaks on raid-CD timing and Decree handling before it becomes a pure throughput wall.',
        confidenceReasons: [
          'Averzian is defined by Void Blast timing and Decree handling.',
          'The reviewed fixtures expect a raid-CD and positioning diagnosis on this boss.',
        ],
        recommendation: fightKill
          ? 'Keep the same raid-CD map and clean Decree positioning.'
          : 'Map every dangerous Void Blast and tighten Decree positioning before the next pull.',
        category: fightKill ? 'strategy' : 'cooldowns',
      };
      break;
    case 'salhadaar':
      if (failingInterrupt?.mechanic.toLowerCase().includes('royal guardian')) {
        return {
          id: 'bossrule-salhadaar-guardian',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 148,
          owner: 'Raid, Assigned kickers, Tanks',
          phase: failingInterrupt.phase || phase,
          summary: 'Royal Guardian interrupts are the main coordination check on Salhadaar.',
          evidence: failingInterrupt.evidence,
          confidenceReasons: [
            'Salhadaar Phase 2 is defined by add control in the shadow realm.',
            'The boss rules call for dedicated interrupters on Guardian spawns.',
            ...(failingInterrupt.confidenceReasons || []),
          ],
          recommendation: 'Assign realm-specific interrupters to every Guardian add and keep the callout in voice.',
          category: 'strategy',
        };
      }
      return {
        id: 'bossrule-salhadaar-baseline',
        kind: 'raid_strategy',
        severity: fightKill ? 'info' : 'warning',
        confidence: 'high',
        priorityScore: fightKill ? 146 : 140,
        owner: 'Raid, Assigned kickers, Tanks',
        phase,
        summary: fightKill
          ? "King's Decree, Void Shockwave, Shadow Realm, and Guardian interrupts stayed controlled on the kill."
          : 'Salhadaar is breaking down on decree reactions, shockwave movement, or realm coordination.',
        evidence: fightKill
          ? 'The coordination checks stayed stable through the kill.'
          : 'Salhadaar is won or lost on coordination rather than raw throughput alone.',
        confidenceReasons: [
          'Salhadaar is built around decree reactions, movement, and add control.',
          'The reviewed fixtures expect a coordination-first diagnosis on this boss.',
        ],
        recommendation: fightKill
          ? 'Keep decree calls, shockwave movement, and Guardian interrupt ownership stable.'
          : 'Tighten decree calls, shockwave movement, and Guardian interrupt ownership before the next pull.',
        category: 'strategy',
      };
      break;
    case 'vanguard':
      if (failingSoak?.mechanic.toLowerCase().includes('void touched')) {
        return {
          id: 'bossrule-vanguard-void-touched',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 146,
          owner: 'Assigned soakers, Healers + RL, Raid',
          phase: failingSoak.phase || phase,
          summary: 'Void Touched soaks are the main assignment check on Vanguard.',
          evidence: failingSoak.evidence,
          confidenceReasons: [
            'Vanguard Phase 1 is explicitly built around clean soak ownership.',
            'The boss data recommends pre-assigned soak positions.',
            ...(failingSoak.confidenceReasons || []),
          ],
          recommendation: 'Assign fixed soak positions, rotate owners, and keep mobility cooldowns for missed beam patterns.',
          category: 'strategy',
        };
      }
      return {
        id: 'bossrule-vanguard-baseline',
        kind: 'raid_assignment',
        severity: fightKill ? 'info' : 'critical',
        confidence: 'high',
        priorityScore: fightKill ? 150 : 154,
        owner: 'Assigned soakers, Healers + RL, Raid',
        phase,
        summary: fightKill
          ? 'Void Touched soaks, beam discipline, and Righteous Flame coverage stayed stable into the kill.'
          : 'Void Touched soaks and Righteous Flame coverage are the main progression gate on Vanguard.',
        evidence: fightKill
          ? 'The fight stayed stable through its soak and beam checks.'
          : 'Vanguard is won on soak ownership, beam movement, and flame coverage.',
        confidenceReasons: [
          'Vanguard is built around soak ownership and beam discipline.',
          'The reviewed fixtures expect soak/beam/flame language on this boss.',
        ],
        recommendation: fightKill
          ? 'Keep the same soak map, beam movement, and Righteous Flame cooldown plan.'
          : 'Pre-assign soaks, clean up beam movement, and map a raid CD to every dangerous Flame window.',
        category: 'strategy',
      };
      break;
    case 'xalatath':
      if (failingInterrupt?.mechanic.toLowerCase().includes('void army')) {
        return {
          id: 'bossrule-xalatath-void-army',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 170,
          owner: failingInterrupt.owner,
          phase: failingInterrupt.phase || phaseLabelFor(cooldownGaps[0]?.time),
          summary: 'Void Army is the main raid coordination gate on Xal\'atath.',
          evidence: failingInterrupt.evidence,
          confidenceReasons: [
            'Xal\'atath Phase 2 is defined by add priority and dangerous casts.',
            'The boss rules explicitly prioritize caster control in Void Army.',
            ...(failingInterrupt.confidenceReasons || []),
          ],
          recommendation: 'Pre-assign add kick teams and target priority before every Void Army wave.',
          category: 'strategy',
        };
      }
      break;
    case 'mylora':
      if (failingRaidCd?.mechanic.toLowerCase().includes('emerald burst')) {
        return {
          id: 'bossrule-mylora-emerald-burst',
          kind: 'raid_cooldown',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 144,
          owner: healerNames.join(', ') || 'Healers + RL',
          phase: failingRaidCd.phase || phase,
          summary: 'Emerald Burst is the main raid-CD checkpoint on Mylora.',
          evidence: failingRaidCd.evidence,
          confidenceReasons: [
            'Mylora Phase 2 is built around Emerald Burst coverage.',
            'The boss rules explicitly recommend raid CDs here.',
            ...(failingRaidCd.confidenceReasons || []),
          ],
          recommendation: 'Map a fixed raid-CD order for every Emerald Burst in Phase 2 and keep bloodlust aligned there.',
          category: 'cooldowns',
        };
      }
      break;
    case 'grove':
      if (failingSoak?.mechanic.toLowerCase().includes('corrupted growth')) {
        return {
          id: 'bossrule-grove-corrupted-growth',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 145,
          owner: failingSoak.owner,
          phase: failingSoak.phase || phase,
          summary: 'Corrupted Growth soaks are the main wipe check in the Grove.',
          evidence: failingSoak.evidence,
          confidenceReasons: [
            'The Corrupted Grove encounter is defined by clean soak ownership.',
            'The boss data lists missed soaks as one of the main death drivers.',
            ...(failingSoak.confidenceReasons || []),
          ],
          recommendation: 'Assign fixed soak owners, keep backups ready, and make soak rotations explicit before pull.',
          category: 'strategy',
        };
      }
      if (failingDispel?.mechanic.toLowerCase().includes('entangling roots')) {
        return {
          id: 'bossrule-grove-roots',
          kind: 'raid_assignment',
          severity: 'warning',
          confidence: 'high',
          priorityScore: 130,
          owner: failingDispel.owner,
          phase: failingDispel.phase || phase,
          summary: 'Entangling Roots dispels are dragging down Grove consistency.',
          evidence: failingDispel.evidence,
          confidenceReasons: [
            'The Grove rewards quick dispels to keep movement clean.',
            'The boss data flags slow root dispels as a common mistake.',
            ...(failingDispel.confidenceReasons || []),
          ],
          recommendation: 'Define primary and backup dispellers and call roots immediately when they land.',
          category: 'strategy',
        };
      }
      break;
    case 'crown':
      if (failingRaidCd?.mechanic.toLowerCase().includes('devouring cosmos')) {
        return {
          id: 'bossrule-crown-cosmos',
          kind: 'raid_cooldown',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 152,
          owner: 'Healers + RL, Raid',
          phase: failingRaidCd.phase || phase,
          summary: 'Devouring Cosmos needs a fixed raid-CD map on Crown of the Cosmos.',
          evidence: failingRaidCd.evidence,
          confidenceReasons: [
            'Crown of the Cosmos ramps raid pressure through repeated platform damage windows.',
            'Devouring Cosmos is one of the main healing checkpoints of the fight.',
            ...(failingRaidCd.confidenceReasons || []),
          ],
          recommendation: 'Map raid cooldowns for every Devouring Cosmos and save Hero/Lust for the last platform phase.',
          category: 'cooldowns',
        };
      }
      if (failingSoak?.mechanic.toLowerCase().includes('silverstrike') || failingInterrupt?.mechanic.toLowerCase().includes('void barrage')) {
        const movementFailure = failingSoak || failingInterrupt;
        return {
          id: 'bossrule-crown-movement',
          kind: 'raid_strategy',
          severity: 'critical',
          confidence: 'high',
          priorityScore: 150,
          owner: 'Raid',
          phase: movementFailure?.phase || phase,
          summary: 'Crown of the Cosmos is punishing movement and spacing mistakes before the real burn phase.',
          evidence: movementFailure?.evidence || 'Repeated movement failures are showing up in the main wipe mechanics.',
          confidenceReasons: [
            'This fight heavily punishes repeated movement errors long before it becomes a pure DPS check.',
            'The main wipe mechanics are tied to spacing and lane discipline.',
            ...(movementFailure?.confidenceReasons || []),
          ],
          recommendation: 'Clean up Barrage, Expulsion, and Ricochet movement first. Do not spend Hero/Lust before the final three-platform phase.',
          category: 'strategy',
        };
      }
      return {
        id: 'bossrule-crown-baseline',
        kind: 'raid_cooldown',
        severity: fightKill ? 'info' : 'critical',
        confidence: 'high',
        priorityScore: fightKill ? 151 : 156,
        owner: 'Healers + RL, Raid',
        phase: fightKill ? 'Phase 3: Three Platforms' : phase,
        summary: fightKill
          ? 'Devouring Cosmos coverage, movement, and spacing stayed stable into the final platform phase.'
          : 'Crown is punishing movement, spacing, and Devouring Cosmos coverage before the final platform burn.',
        evidence: fightKill
          ? 'The raid held movement and healing discipline through the final platform phase.'
          : 'Crown is usually lost to movement, spacing, and healing pressure before it becomes a raw burn check.',
        confidenceReasons: [
          'Crown heavily rewards movement discipline and late-phase raid-CD planning.',
          'The reviewed fixtures expect final platform language on this boss.',
        ],
        recommendation: fightKill
          ? 'Keep Hero/Lust for the final platform phase and preserve the same raid-CD map.'
          : 'Clean up movement and spacing first, and keep Hero/Lust for the final platform phase.',
        category: 'strategy',
      };
    case 'alleria':
      if (failingInterrupt?.mechanic.toLowerCase().includes('windrunner adds')) {
        return {
          id: 'bossrule-alleria-adds',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'medium',
          priorityScore: 149,
          owner: 'Assigned kickers, DPS Core',
          phase: failingInterrupt.phase || phase,
          summary: 'Alleria is losing stability on add control before the real burn can start.',
          evidence: failingInterrupt.evidence,
          confidenceReasons: [
            'The current MQD dataset already points to add control as one of Alleria’s first real assignment gates.',
            'When Windrunner add control slips, the raid reaches Void Collapse already unstable.',
            ...(failingInterrupt.confidenceReasons || []),
          ],
          recommendation: 'Lock a named kick order and fast swap priority for every Windrunner add wave before the next pull.',
          category: 'strategy',
        };
      }
      if (failingRaidCd?.mechanic.toLowerCase().includes('void collapse') || failingSoak?.mechanic.toLowerCase().includes('barrage')) {
        const problem = failingRaidCd || failingSoak;
        return {
          id: 'bossrule-alleria-coverage',
          kind: 'raid_cooldown',
          severity: 'critical',
          confidence: 'medium',
          priorityScore: 146,
          owner: failingRaidCd ? 'Healers + RL' : 'Assigned soakers, Raid',
          phase: problem?.phase || phase,
          summary: 'Alleria is still gated by Barrage ownership and Void Collapse coverage.',
          evidence: problem?.evidence || 'The current pull is not surviving the main assignment windows cleanly.',
          confidenceReasons: [
            'The current public MQD corpus shows Alleria as an assignment and healer-coverage fight first.',
            'The static boss rules for Alleria emphasize soak ownership and healer coverage over raw throughput blame.',
            ...(problem?.confidenceReasons || []),
          ],
          recommendation: 'Pre-assign Barrage coverage, then map healer CDs to every dangerous Void Collapse before changing damage goals.',
          category: 'cooldowns',
        };
      }
      return {
        id: 'bossrule-alleria-baseline',
        kind: 'raid_strategy',
        severity: fightKill ? 'info' : 'critical',
        confidence: 'medium',
        priorityScore: fightKill ? 145 : 151,
        owner: 'Raid, Assigned kickers, Healers + RL',
        phase: fightKill ? 'Phase 3: Final Hunt' : phase,
        summary: fightKill
          ? 'Movement, Barrage ownership, and Void Collapse coverage stayed stable through Alleria.'
          : 'Alleria is mostly a control fight right now: movement, add control, Barrage ownership, and healer coverage.',
        evidence: fightKill
          ? 'The pull held together through the main MQD control checks.'
          : 'Current MQD data is still thin, but it already points more toward assignment and control than pure throughput blame.',
        confidenceReasons: [
          'Alleria is still on early public coverage, so the rulepack stays intentionally conservative.',
          'The strongest early signals are movement discipline, add control, and healer coverage.',
        ],
        recommendation: fightKill
          ? 'Preserve the add-control plan and the same Barrage and Void Collapse coverage timings.'
          : 'Stabilize movement, add control, and Barrage ownership before calling this a damage wall.',
        category: 'strategy',
      };
    case 'chimaerus':
      if (failingInterrupt?.mechanic.toLowerCase().includes('aberrant spawn')) {
        return {
          id: 'bossrule-chimaerus-adds',
          kind: 'raid_assignment',
          severity: 'critical',
          confidence: 'medium',
          priorityScore: 151,
          owner: 'Assigned kickers, DPS Core',
          phase: failingInterrupt.phase || phase,
          summary: 'Chimaerus is failing first on Aberrant Spawn control.',
          evidence: failingInterrupt.evidence,
          confidenceReasons: [
            'The early MQD rules point to add control as the cleanest assignment gate on Chimaerus.',
            'If spawn control slips, Cosmic Rupture lands into an already unstable raid state.',
            ...(failingInterrupt.confidenceReasons || []),
          ],
          recommendation: 'Assign kick ownership and fast kill priority to every Aberrant Spawn before the next pull.',
          category: 'strategy',
        };
      }
      if (failingRaidCd?.mechanic.toLowerCase().includes('cosmic rupture') || failingSoak?.mechanic.toLowerCase().includes('shattered heads')) {
        const problem = failingRaidCd || failingSoak;
        return {
          id: 'bossrule-chimaerus-coverage',
          kind: failingRaidCd ? 'raid_cooldown' : 'raid_assignment',
          severity: 'critical',
          confidence: 'medium',
          priorityScore: 148,
          owner: failingRaidCd ? 'Healers + RL' : 'Assigned soakers, Raid',
          phase: problem?.phase || phase,
          summary: 'Chimaerus is not ready until Cosmic Rupture coverage and Shattered Heads ownership are stable.',
          evidence: problem?.evidence || 'The raid is still breaking on the main coordinated damage events.',
          confidenceReasons: [
            'The current MQD dataset points to Rupture coverage and soak ownership as the most likely conversion gate.',
            'The rulepack stays conservative because public Chimaerus data is still very early.',
            ...(problem?.confidenceReasons || []),
          ],
          recommendation: 'Map healer CDs to every Rupture and pre-assign Shattered Heads groups before changing the overall plan.',
          category: failingRaidCd ? 'cooldowns' : 'strategy',
        };
      }
      return {
        id: 'bossrule-chimaerus-baseline',
        kind: 'raid_strategy',
        severity: fightKill ? 'info' : 'critical',
        confidence: 'medium',
        priorityScore: fightKill ? 144 : 150,
        owner: 'Raid, Tanks, Healers + RL',
        phase,
        summary: fightKill
          ? 'Chimaerus stayed stable on tank control, Rupture coverage, and add handling.'
          : 'Chimaerus looks like a control-and-coverage fight first: tank swaps, add control, Rupture coverage, and soak discipline.',
        evidence: fightKill
          ? 'The kill held its core coordination checks.'
          : 'Current public Chimaerus coverage is early, but it already points more toward coordination than raw DPS blame.',
        confidenceReasons: [
          'Chimaerus currently has limited public data, so the rulepack stays broad and conservative.',
          'The strongest early signals are add control, raid-CD planning, and soak discipline.',
        ],
        recommendation: fightKill
          ? 'Keep the same tank, add, and raid-CD plan.'
          : 'Treat add control and Rupture coverage as the real gate before calling this a throughput wall.',
        category: 'strategy',
      };
    case 'twins':
      return {
        id: 'bossrule-twins-baseline',
        kind: 'raid_strategy',
        severity: fightKill ? 'info' : 'critical',
        confidence: 'high',
        priorityScore: fightKill ? 149 : 430,
        owner: 'Raid, Healers + RL, Tanks',
        phase: fightKill ? 'Phase 2: Dark Synchronization' : phase,
        summary: fightKill
          ? 'Duplicate control, Twisted Fusion movement, and Shadow Nova coverage stayed stable into Phase 2.'
          : 'Twisted Fusion, Duplicate control, and Shadow Nova stabilization are the wipe gate on the twins.',
        evidence: fightKill
          ? 'The synchronized phase stayed controlled through the kill.'
          : 'The twins are mainly a coordination fight around movement, duplicates, and stabilization.',
        confidenceReasons: [
          'The twins encounter is defined by Duplicate control and Twisted Fusion movement.',
          'The reviewed fixtures expect coordination-first language on this boss.',
        ],
        recommendation: fightKill
          ? 'Keep the same duplicate assignments, beam discipline, and raid-CD plan.'
          : 'Fix beam discipline, duplicate control, and Shadow Nova coverage before changing throughput targets.',
        category: 'strategy',
      };
      break;
    default:
      break;
  }

  return undefined;
}

export function getBossRulePackCauseChain(bossData?: BossData, fightKill?: boolean): string[] {
  if (!bossData) return [];

  switch (bossData.nickname) {
    case 'averzian':
      return [
        fightKill
          ? 'Raid-CD map held on Void Blast -> Imperial Decree handling stayed clean -> Averzian died in a controlled Phase 2 push.'
          : 'Void Blast pressure built up -> Imperial Decree positioning broke down -> the raid lost control before the kill.',
      ];
    case 'vorasius':
      return [
        fightKill
          ? 'Kick rotation held on Void Scream -> Consume Essence soaks stayed clean -> Shadow Feast stabilized and the kill converted.'
          : 'Kick rotation or orb soaks slipped -> Vorasius pressure snowballed -> the raid failed before recovery.',
      ];
    case 'salhadaar':
      return [
        "Decree reactions stayed clean -> Shockwave movement and Guardian interrupts held -> the raid maintained control through the kill.",
      ];
    case 'vanguard':
      return [
        fightKill
          ? 'Void Touched soaks held -> Righteous Flame coverage stayed stable -> beam discipline carried the fight into the kill.'
          : 'Soak or beam discipline slipped -> Righteous Flame pressure escalated -> the raid lost control of the encounter.',
      ];
    case 'crown':
      return [
        fightKill
          ? 'Devouring Cosmos coverage held -> movement and spacing stayed controlled -> the raid converted the final platform phase.'
          : 'Movement or spacing slipped -> Devouring Cosmos pressure stacked up -> the raid failed before the final platform conversion.',
      ];
    case 'alleria':
      return [
        fightKill
          ? 'Add control held -> Barrage ownership and Void Collapse coverage stayed clean -> the raid converted the final hunt.'
          : 'Movement or add control slipped -> Void Collapse landed into an unstable raid -> the pull failed before a clean final phase.',
      ];
    case 'chimaerus':
      return [
        fightKill
          ? 'Aberrant Spawn control held -> Cosmic Rupture coverage stayed stable -> the raid converted the final collapse phase.'
          : 'Add control or soak ownership slipped -> Cosmic Rupture landed into chaos -> the pull failed before it became a pure burn check.',
      ];
    case 'twins':
      return [
        fightKill
          ? 'Duplicate control stayed stable -> Twisted Fusion movement stayed clean -> Shadow Nova coverage carried the synchronized phase.'
          : 'Twisted Fusion or duplicate control slipped -> Shadow Nova pressure spiked -> the synchronized phase collapsed.',
      ];
    default:
      return [];
  }
}

export function getBossPhaseCriterionOverride({
  bossData,
  phaseName,
  phaseDeaths,
  phaseAvoidable,
  phaseGaps,
  phaseMechanics,
  assignmentAssessments,
  fightKill,
}: BossPhaseCriterionInput): {
  status?: 'met' | 'at_risk' | 'missed';
  summary?: string;
  evidence?: string;
  blocker?: string;
} | undefined {
  if (!bossData) return undefined;

  const lowerPhase = phaseName.toLowerCase();
  const phaseAssignments = assignmentAssessments.filter((assessment) => assessment.phase === phaseName);
  const failingInterrupt = phaseAssignments.find((assessment) => assessment.category === 'interrupt' && assessment.status === 'failing');
  const failingSoak = phaseAssignments.find((assessment) => assessment.category === 'soak' && assessment.status === 'failing');
  const failingRaidCd = phaseAssignments.find((assessment) => assessment.category === 'raid_cd' && assessment.status === 'failing');
  const atRiskRaidCd = phaseAssignments.find((assessment) => assessment.category === 'raid_cd' && assessment.status === 'at_risk');
  const failingDispel = phaseAssignments.find((assessment) => assessment.category === 'dispel' && assessment.status === 'failing');
  const mechanicNames = phaseMechanics.map((mechanic) => mechanic.name).join(', ');

  switch (bossData.nickname) {
    case 'vorasius':
      if (lowerPhase.includes('hunger')) {
        if (failingInterrupt) {
          return {
            status: 'missed',
            summary: `${phaseName} is not ready until Void Scream is fully covered.`,
            evidence: failingInterrupt.evidence,
            blocker: 'Kick order is still the first failure point of the fight.',
          };
        }
        return {
          status: phaseAvoidable > 0 ? 'at_risk' : 'met',
          summary: phaseAvoidable > 0
            ? `${phaseName} is close, but early movement or tank stability is still leaking value.`
            : `${phaseName} is stable enough to reach the soak phase cleanly.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}.`,
          blocker: phaseAvoidable > 0 ? 'The raid is still losing control before the real soak phase.' : 'Kick order and tank swaps look stable enough here.',
        };
      }
      if (lowerPhase.includes('feast')) {
        if (failingSoak || failingRaidCd || atRiskRaidCd) {
          const problem = failingSoak || failingRaidCd || atRiskRaidCd;
          return {
            status: 'missed',
            summary: `${phaseName} is the progression wall until soaks and feast coverage are stable.`,
            evidence: problem?.evidence || `Key checks: ${mechanicNames}.`,
            blocker: failingSoak ? 'Consume Essence ownership is still failing.' : 'Shadow Feast coverage is still not stable enough.',
          };
        }
        return {
          status: phaseDeaths > 0 || phaseAvoidable > 0 ? 'at_risk' : 'met',
          summary: phaseDeaths > 0 || phaseAvoidable > 0
            ? `${phaseName} is close, but orb soaks or feast damage are still leaking pulls.`
            : `${phaseName} is stable enough for progression.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}, raid-CD gaps ${phaseGaps}.`,
          blocker: phaseDeaths > 0 || phaseAvoidable > 0 ? 'The fight is still unstable at the main soak checkpoint.' : 'Orb soaks and feast healing look good enough.',
        };
      }
      break;
    case 'averzian':
      if (lowerPhase.includes('imperial wrath') || lowerPhase.includes('phase 2')) {
        if (failingRaidCd || atRiskRaidCd) {
          const gap = failingRaidCd || atRiskRaidCd;
          return {
            status: failingRaidCd ? 'missed' : 'at_risk',
            summary: `${phaseName} is only ready when Void Blast coverage is mapped cleanly.`,
            evidence: gap?.evidence || `Key checks: ${mechanicNames}.`,
            blocker: 'Void Blast coverage is still the main readiness gate here.',
          };
        }
        return {
          status: phaseAvoidable >= 2 ? 'missed' : phaseAvoidable === 1 || phaseDeaths > 0 ? 'at_risk' : 'met',
          summary: phaseAvoidable >= 2
            ? `${phaseName} is below the bar because Decree movement is still too loose.`
            : phaseAvoidable === 1 || phaseDeaths > 0
              ? `${phaseName} is close, but Decree handling is not fully clean yet.`
              : `${phaseName} is stable enough to keep progressing.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}, raid-CD gaps ${phaseGaps}.`,
          blocker: phaseAvoidable > 0 ? 'Imperial Decree movement is still the cleanup target.' : 'Void Blast map and Decree reactions are stable enough.',
        };
      }
      break;
    case 'salhadaar':
      if (lowerPhase.includes('shadow realm') || lowerPhase.includes('phase 2')) {
        if (failingInterrupt) {
          return {
            status: 'missed',
            summary: `${phaseName} is not ready until Guardian control is stable.`,
            evidence: failingInterrupt.evidence,
            blocker: 'Guardian interrupts are still the first recovery failure in the realm phase.',
          };
        }
        return {
          status: phaseAvoidable >= 2 ? 'missed' : phaseAvoidable === 1 || phaseDeaths > 0 ? 'at_risk' : 'met',
          summary: phaseAvoidable >= 2
            ? `${phaseName} is still failing on decree, wave, or realm coordination.`
            : phaseAvoidable === 1 || phaseDeaths > 0
              ? `${phaseName} is close, but realm coordination still leaks pulls.`
              : `${phaseName} is stable enough to carry progression.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}.`,
          blocker: phaseAvoidable > 0 ? 'Realm coordination is still too expensive.' : 'Realm coordination looks stable enough.',
        };
      }
      break;
    case 'vanguard':
      if (failingSoak || failingRaidCd || atRiskRaidCd) {
        const problem = failingSoak || failingRaidCd || atRiskRaidCd;
        return {
          status: failingSoak || failingRaidCd ? 'missed' : 'at_risk',
          summary: `${phaseName} is only ready when soak ownership and flame coverage are stable.`,
          evidence: problem?.evidence || `Key checks: ${mechanicNames}.`,
          blocker: failingSoak ? 'Void Touched soaks are still failing.' : 'Righteous Flame coverage is still too loose.',
        };
      }
      break;
    case 'crown':
      if (lowerPhase.includes('three platforms') || lowerPhase.includes('phase 3')) {
        if (failingRaidCd || phaseGaps > 0) {
          return {
            status: 'missed',
            summary: `${phaseName} is not ready until Devouring Cosmos has a fixed raid-CD map.`,
            evidence: failingRaidCd?.evidence || `Key checks: ${mechanicNames}. Raid-CD gaps ${phaseGaps}.`,
            blocker: 'The burn phase is still losing control on Devouring Cosmos coverage.',
          };
        }
        return {
          status: phaseAvoidable >= 2 ? 'at_risk' : 'met',
          summary: phaseAvoidable >= 2
            ? `${phaseName} is close, but spacing mistakes are still too expensive for the burn.`
            : `${phaseName} is stable enough for final-burn progression.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}.`,
          blocker: phaseAvoidable >= 2 ? 'The final burn is still leaking movement mistakes.' : 'Spacing and coverage are stable enough for the last phase.',
        };
      }
      if (phaseAvoidable >= 2) {
        return {
          status: 'missed',
          summary: `${phaseName} is still too unstable on movement and spacing.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}.`,
          blocker: 'The raid is losing too much before the final platform phase.',
        };
      }
      break;
    case 'alleria':
      if (lowerPhase.includes('reinforcements') || lowerPhase.includes('phase 2')) {
        if (failingInterrupt || failingRaidCd || failingSoak) {
          const problem = failingInterrupt || failingRaidCd || failingSoak;
          return {
            status: 'missed',
            summary: `${phaseName} is not ready until add control, Barrage ownership, and Void Collapse coverage are stable.`,
            evidence: problem?.evidence || `Key checks: ${mechanicNames}.`,
            blocker: failingInterrupt
              ? 'Add control is still the first failure point.'
              : failingSoak
                ? 'Barrage ownership is still too loose.'
                : 'Void Collapse coverage is still not stable enough.',
          };
        }
        return {
          status: phaseAvoidable >= 2 || phaseDeaths >= 2 ? 'at_risk' : 'met',
          summary: phaseAvoidable >= 2 || phaseDeaths >= 2
            ? `${phaseName} is close, but the raid still arrives to the main assignment checks too unstable.`
            : `${phaseName} is stable enough to keep progressing Alleria.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}, raid-CD gaps ${phaseGaps}.`,
          blocker: phaseAvoidable >= 2 || phaseDeaths >= 2
            ? 'The phase still leaks too much movement damage before the main checks.'
            : 'Add control and coverage look stable enough here.',
        };
      }
      if (phaseAvoidable >= 2) {
        return {
          status: 'missed',
          summary: `${phaseName} is still too unstable on movement and spacing for Alleria.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}.`,
          blocker: 'Early movement mistakes are still too expensive.',
        };
      }
      break;
    case 'chimaerus':
      if (lowerPhase.includes('convergence') || lowerPhase.includes('phase 2')) {
        if (failingInterrupt || failingRaidCd || failingSoak || failingDispel) {
          const problem = failingInterrupt || failingRaidCd || failingSoak || failingDispel;
          return {
            status: 'missed',
            summary: `${phaseName} is not ready until add control, Rupture coverage, and soak discipline are stable.`,
            evidence: problem?.evidence || `Key checks: ${mechanicNames}.`,
            blocker: failingInterrupt
              ? 'Aberrant Spawn control is still failing first.'
              : failingSoak
                ? 'Shattered Heads ownership is still too loose.'
                : failingRaidCd
                  ? 'Cosmic Rupture coverage is still not stable enough.'
                  : 'Fractured Mind dispel timing is still dragging the phase down.',
          };
        }
        return {
          status: phaseAvoidable >= 2 || phaseDeaths >= 2 ? 'at_risk' : 'met',
          summary: phaseAvoidable >= 2 || phaseDeaths >= 2
            ? `${phaseName} is close, but the raid still reaches its main checks too damaged.`
            : `${phaseName} is stable enough to keep progressing Chimaerus.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}, raid-CD gaps ${phaseGaps}.`,
          blocker: phaseAvoidable >= 2 || phaseDeaths >= 2
            ? 'The phase is still leaking too much avoidable pressure.'
            : 'Assignments and healer coverage look stable enough here.',
        };
      }
      if (phaseAvoidable >= 2 || phaseDeaths >= 2) {
        return {
          status: 'missed',
          summary: `${phaseName} is still too unstable on boss control or recovery discipline.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}.`,
          blocker: 'The raid is still losing too much before the real assignment wall.',
        };
      }
      break;
    case 'twins':
      if (phaseAvoidable >= 2 || phaseDeaths >= 2) {
        return {
          status: 'missed',
          summary: `${phaseName} is failing on duplicate control or beam movement.`,
          evidence: `Key checks: ${mechanicNames}. Deaths ${phaseDeaths}, avoidable ${phaseAvoidable}.`,
          blocker: 'The synchronized phase is still breaking on movement and coordination.',
        };
      }
      break;
    case 'grove':
      if (failingSoak || failingDispel) {
        const problem = failingSoak || failingDispel;
        return {
          status: 'missed',
          summary: `${phaseName} is still failing on soak or dispel discipline.`,
          evidence: problem?.evidence || `Key checks: ${mechanicNames}.`,
          blocker: failingSoak ? 'Corrupted Growth ownership is still failing.' : 'Root dispels are still too slow.',
        };
      }
      break;
    case 'mylora':
      if (failingRaidCd || atRiskRaidCd) {
        const problem = failingRaidCd || atRiskRaidCd;
        return {
          status: failingRaidCd ? 'missed' : 'at_risk',
          summary: `${phaseName} is still gated by Emerald Burst coverage.`,
          evidence: problem?.evidence || `Key checks: ${mechanicNames}.`,
          blocker: 'Emerald Burst still needs a cleaner healer CD plan.',
        };
      }
      break;
    default:
      break;
  }

  return undefined;
}
