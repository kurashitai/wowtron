'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { 
  Skull, Heart, Zap, Clock, ChevronDown, ChevronUp, 
  Activity, Swords, Shield, AlertTriangle
} from 'lucide-react';
import type { BossData } from '@/lib/boss-data-midnight';

// Format helpers
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Timeline event types
interface TimelineEvent {
  time: number;
  type: 'phase' | 'death' | 'bloodlust' | 'raid_cd' | 'boss_ability' | 'defensive';
  description: string;
  target?: string;
  ability?: string;
  source?: string;
  impact?: 'critical' | 'warning' | 'info';
}

interface TimelineProps {
  fight: any;
  bossData?: BossData;
  duration: number;
}

// Color mapping for event types
const eventColors: Record<string, string> = {
  phase: 'bg-purple-500',
  death: 'bg-red-500',
  bloodlust: 'bg-orange-500',
  raid_cd: 'bg-green-500',
  boss_ability: 'bg-amber-500',
  defensive: 'bg-blue-500'
};

const eventBorderColors: Record<string, string> = {
  phase: 'border-purple-400',
  death: 'border-red-400',
  bloodlust: 'border-orange-400',
  raid_cd: 'border-green-400',
  boss_ability: 'border-amber-400',
  defensive: 'border-blue-400'
};

export function RaidTimeline({ fight, bossData, duration }: TimelineProps) {
  const [expanded, setExpanded] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  // Process timeline events
  const events = useMemo(() => {
    if (!fight) return [];
    
    const timelineEvents: TimelineEvent[] = [];
    
    // Add phase markers from boss data
    if (bossData?.phases) {
      bossData.phases.forEach((phase, i) => {
        const phaseStart = (phase.hpRange[0] / 100) * duration;
        timelineEvents.push({
          time: Math.floor(phaseStart),
          type: 'phase',
          description: phase.name,
          impact: 'info'
        });
      });
    } else {
      // Default phases based on duration
      const phaseCount = Math.min(4, Math.floor(duration / 120) + 1);
      for (let i = 0; i < phaseCount; i++) {
        timelineEvents.push({
          time: Math.floor((duration / phaseCount) * i),
          type: 'phase',
          description: `Phase ${i + 1}`,
          impact: 'info'
        });
      }
    }
    
    // Add bloodlust/heroism
    const bloodlustEvent = (fight.timeline || []).find((e: any) => 
      e.type === 'bloodlust' || 
      (e.description && ['Bloodlust', 'Heroism', 'Time Warp', 'Ancient Hysteria', 'Netherwinds']
        .some(bl => e.description.includes(bl)))
    );
    if (bloodlustEvent) {
      timelineEvents.push({
        time: bloodlustEvent.time || 8,
        type: 'bloodlust',
        description: bloodlustEvent.description || 'Bloodlust',
        source: bloodlustEvent.source
      });
    }
    // Note: Don't assume bloodlust if not detected - only add if actually found
    
    // Add death events
    (fight.timeline || [])
      .filter((e: any) => e.type === 'death')
      .forEach((death: any) => {
        timelineEvents.push({
          time: death.time,
          type: 'death',
          description: `${death.target || 'Unknown'} died`,
          target: death.target,
          ability: death.ability,
          impact: 'critical'
        });
      });
    
    // Add raid cooldowns from buffs
    const raidCDs = ['Power Word: Barrier', 'Spirit Link Totem', 'Divine Hymn', 
                     'Tranquility', 'Revival', 'Healing Tide Totem', 'Darkness',
                     'Rallying Cry', 'Aura Mastery'];
    
    (fight.combatEvents || [])
      .filter((e: any) => 
        e.ability?.name && raidCDs.some(cd => e.ability.name.includes(cd))
      )
      .slice(0, 10)
      .forEach((cd: any) => {
        const cdTime = (cd.timestamp - (fight.startTime || 0)) / 1000;
        if (cdTime >= 0 && cdTime <= duration) {
          timelineEvents.push({
            time: Math.floor(cdTime),
            type: 'raid_cd',
            description: cd.ability.name,
            source: cd.source?.name
          });
        }
      });
    
    // Add boss ability casts (from bossData)
    if (bossData?.mechanics) {
      bossData.mechanics.forEach(mech => {
        if (mech.frequency && mech.frequency > 0) {
          // Estimate when abilities would be cast
          const expectedCasts = Math.floor(duration / mech.frequency);
          for (let i = 0; i < Math.min(expectedCasts, 5); i++) {
            const castTime = mech.frequency * (i + 1);
            if (castTime <= duration) {
              timelineEvents.push({
                time: castTime,
                type: 'boss_ability',
                description: mech.name,
                ability: mech.name,
                impact: mech.type === 'raid_cd' ? 'warning' : 'info'
              });
            }
          }
        }
      });
    }
    
    return timelineEvents.sort((a, b) => a.time - b.time);
  }, [fight, bossData, duration]);

  // Generate HP curve (simplified - boss HP decreases over time)
  const hpCurve = useMemo(() => {
    const points: { time: number; hp: number }[] = [];
    const phases = bossData?.phases || [];
    
    if (fight.kill) {
      // Linear decrease for kills
      for (let t = 0; t <= duration; t += 10) {
        points.push({
          time: t,
          hp: Math.max(0, 100 - (t / duration) * 100)
        });
      }
    } else if (fight.bossHPPercent) {
      // Decrease until wipe point
      const wipeHP = fight.bossHPPercent;
      const wipeProgress = (100 - wipeHP) / 100;
      for (let t = 0; t <= duration; t += 10) {
        const progress = Math.min(1, (t / duration) / wipeProgress);
        points.push({
          time: t,
          hp: Math.max(wipeHP, 100 - progress * 100)
        });
      }
    } else {
      // Default curve
      for (let t = 0; t <= duration; t += 10) {
        points.push({
          time: t,
          hp: 100 - (t / duration) * 80
        });
      }
    }
    
    return points;
  }, [fight, bossData, duration]);

  // Event counts for summary
  const eventCounts = useMemo(() => ({
    deaths: events.filter(e => e.type === 'death').length,
    raidCDs: events.filter(e => e.type === 'raid_cd').length,
    phases: events.filter(e => e.type === 'phase').length
  }), [events]);

  if (!fight) return null;

  return (
    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-tron-silver-200 flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" /> 
            Timeline de Eventos
            <div className="flex items-center gap-1.5 ml-2">
              {eventCounts.deaths > 0 && (
                <Badge className="bg-red-500/20 text-red-400 text-xs">
                  <Skull className="h-3 w-3 mr-1" />
                  {eventCounts.deaths}
                </Badge>
              )}
              {eventCounts.raidCDs > 0 && (
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {eventCounts.raidCDs}
                </Badge>
              )}
            </div>
          </h3>
          {expanded ? 
            <ChevronUp className="h-5 w-5 text-tron-silver-400" /> : 
            <ChevronDown className="h-5 w-5 text-tron-silver-400" />
          }
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* HP Curve Visualization */}
          <div className="relative h-16 bg-dark-700/50 rounded-lg overflow-hidden">
            <div className="absolute top-1 left-2 text-xs text-tron-silver-400">Boss HP</div>
            <svg className="w-full h-full" viewBox={`0 0 ${duration} 100`} preserveAspectRatio="none">
              {/* HP curve */}
              <path
                d={`M 0 100 ${hpCurve.map(p => `L ${p.time} ${p.hp}`).join(' ')}`}
                fill="none"
                stroke="url(#hpGradient)"
                strokeWidth="2"
              />
              {/* Gradient definition */}
              <defs>
                <linearGradient id="hpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Time markers */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-tron-silver-500">
              <span>0:00</span>
              <span>{formatTime(duration / 2)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Timeline Track */}
          <div className="relative h-8 bg-dark-700/50 rounded-lg overflow-hidden">
            {/* Phase regions */}
            {events.filter(e => e.type === 'phase').map((phase, i) => {
              const width = (duration / (bossData?.phases?.length || 4)) / duration * 100;
              const left = (phase.time / duration) * 100;
              return (
                <div
                  key={`phase-${i}`}
                  className="absolute top-0 h-full bg-purple-500/10 border-r border-purple-500/30"
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <span className="absolute top-1 left-1 text-xs text-purple-400 truncate">
                    {phase.description.split(':')[0]}
                  </span>
                </div>
              );
            })}
            
            {/* Event markers */}
            {events.map((event, i) => {
              const left = (event.time / duration) * 100;
              return (
                <HoverCard key={`event-${i}`} openDelay={100}>
                  <HoverCardTrigger asChild>
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer
                        ${eventColors[event.type]} border-2 ${eventBorderColors[event.type]}
                        ${event.impact === 'critical' ? 'animate-pulse' : ''}
                      `}
                      style={{ left: `${Math.min(98, Math.max(2, left))}%` }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 bg-dark-800 border-dark-600">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${eventColors[event.type]}`} />
                        <span className="font-medium text-tron-silver-200 capitalize">
                          {event.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-tron-silver-400 ml-auto">
                          {formatTime(event.time)}
                        </span>
                      </div>
                      <p className="text-sm text-tron-silver-300">{event.description}</p>
                      {event.target && (
                        <p className="text-xs text-tron-silver-400">Target: {event.target}</p>
                      )}
                      {event.ability && (
                        <p className="text-xs text-tron-silver-400">Ability: {event.ability}</p>
                      )}
                      {event.source && (
                        <p className="text-xs text-tron-silver-400">Source: {event.source}</p>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
            
            {/* Time axis */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-dark-600" />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-tron-silver-400">Phase</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-tron-silver-400">Death</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-tron-silver-400">Bloodlust</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-tron-silver-400">Raid CD</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-tron-silver-400">Boss Ability</span>
            </div>
          </div>

          {/* Death Events Detail */}
          {events.filter(e => e.type === 'death').length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Skull className="h-3 w-3" /> Mortes
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {events.filter(e => e.type === 'death').map((death, i) => (
                  <div key={i} className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-red-400">{death.target}</span>
                      <span className="text-tron-silver-400">{formatTime(death.time)}</span>
                    </div>
                    <p className="text-tron-silver-400 mt-1 truncate">
                      {death.ability || death.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RaidTimeline;
