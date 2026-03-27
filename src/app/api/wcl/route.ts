import { NextRequest, NextResponse } from 'next/server';
import { 
  getWCLAccessToken,
  fetchWCLReport,
  fetchWCLDamageDone,
  fetchWCLHealingDone,
  fetchWCLDamageTaken,
  fetchWCLDeaths,
  fetchWCLBuffs,
  fetchWCLCasts,
  fetchWCLPlayerDetails,
  fetchWCLDpsGraph,
  fetchWCLHpsGraph,
  fetchWCLDpsRankings,
  fetchWCLHpsRankings,
  parseReportCode,
  getDifficultyName,
  getRoleFromIcon,
  getClassFromIcon,
  getSpecFromIcon,
  type WCLReport,
  type WCLFight,
  type WCLActor,
  type WCLTableEntry,
  type WCLPlayerDetailEntry,
  type WCLEvent,
  type WCLRankingsData,
  type WCLRankingCharacter
} from '@/lib/warcraft-logs-api';
import { 
  type ReportData, 
  type FightData, 
  type PlayerStats,
  type TimelineEvent,
  BOSSES
} from '@/lib/combat-logs';
import { 
  analyzeDeathDetails,
  analyzeDefensiveUsage,
  calculateAllScorecards
} from '@/lib/analysis/phase2-analysis';
import { getBossByNickname, type BossData } from '@/lib/boss-data-midnight';
import { getCachedValue, setCachedValue } from '@/lib/wcl-cache';
import { resolveBossContext } from '@/lib/boss-context';
import { extractTalentNames } from '@/lib/platform-improvement/build-significance';
import { persistFightRecord, persistRawLogArtifact } from '@/lib/platform-improvement/repository';

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;
const REPORT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const FIGHT_CACHE_TTL_MS = 60 * 60 * 1000; // 1h

function flattenPlayerDetailsEntries(playerDetails: any): WCLPlayerDetailEntry[] {
  if (!playerDetails || typeof playerDetails !== 'object') return [];
  return [
    ...((playerDetails.tanks || []) as WCLPlayerDetailEntry[]),
    ...((playerDetails.healers || []) as WCLPlayerDetailEntry[]),
    ...((playerDetails.dps || []) as WCLPlayerDetailEntry[]),
  ].filter((entry) => Boolean(entry && entry.name));
}

function buildPlayerDetailsLookup(playerDetails: any) {
  const lookup = new Map<string, WCLPlayerDetailEntry>();
  flattenPlayerDetailsEntries(playerDetails).forEach((entry) => {
    if (!entry.name) return;
    lookup.set(entry.name.toLowerCase(), entry);
  });
  return lookup;
}

function extractPlayerTalentNames(
  entryTalents: unknown,
  playerDetailsEntry?: WCLPlayerDetailEntry
): string[] {
  const directTalents = extractTalentNames(entryTalents);
  if (directTalents.length > 0) return directTalents;
  if (!playerDetailsEntry) return [];

  const detailCandidates = [
    playerDetailsEntry.talents,
    playerDetailsEntry.combatantInfo?.talents,
    playerDetailsEntry.combatantInfo?.pvpTalents,
  ];

  for (const candidate of detailCandidates) {
    const talentNames = extractTalentNames(candidate);
    if (talentNames.length > 0) return talentNames;
  }

  return [];
}

async function getToken(): Promise<string> {
  const clientId = process.env.WCL_CLIENT_ID;
  const clientSecret = process.env.WCL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('WCL_API_NOT_CONFIGURED');
  }
  
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }
  
  const token = await getWCLAccessToken(clientId, clientSecret);
  cachedToken = { token, expiresAt: Date.now() + 86400000 };
  return token;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const forceRefresh = searchParams.get('refresh') === 'true';
  
  try {
    // ==========================================
    // REPORT INFO - Fetch all fights for progression
    // ==========================================
    if (action === 'report') {
      const code = searchParams.get('code');
      if (!code) return NextResponse.json({ error: 'Missing report code' }, { status: 400 });
      
      const reportCode = parseReportCode(code);
      if (!reportCode) return NextResponse.json({ error: 'Invalid report code or URL' }, { status: 400 });
      
      if (!forceRefresh) {
        const cachedReport = await getCachedValue<ReportData>('report', reportCode, REPORT_CACHE_TTL_MS);
        if (cachedReport) {
          return NextResponse.json({ report: cachedReport, cached: true });
        }
      }
      
      const token = await getToken();
      const wclReport = await fetchWCLReport(reportCode, token);
      
      const report: ReportData = {
        id: reportCode,
        code: reportCode,
        title: wclReport.title || 'Unknown Report',
        owner: 'WCL User',
        zone: wclReport.zone?.name || 'Unknown Zone',
        startTime: wclReport.startTime,
        endTime: wclReport.endTime,
        fights: wclReport.fights.map(fight => ({
          id: fight.id,
          bossName: fight.name,
          bossIcon: fight.name.toLowerCase().split(' ')[0],
          difficulty: getDifficultyName(fight.difficulty),
          duration: Math.floor((fight.endTime - fight.startTime) / 1000),
          kill: Boolean(fight.kill),
          // WCL returns bossPercentage as 0-10000 (e.g., 4200 = 42.00% HP remaining)
          // For kills, it's 0. For wipes, it's the HP remaining
          bossHPPercent: fight.kill ? 0 : Math.floor((fight.bossPercentage ?? fight.fightPercentage ?? 10000) / 100),
          startTime: fight.startTime,
          endTime: fight.endTime
        }))
      };

      await persistRawLogArtifact({
        artifactType: 'wcl_report',
        source: 'wcl_api',
        cacheKey: `report:${reportCode}:raw`,
        reportCode,
        payload: wclReport,
        metadata: {
          title: report.title,
          zone: report.zone,
          fightCount: report.fights.length,
        },
      });
      await persistRawLogArtifact({
        artifactType: 'wcl_report_payload',
        source: 'wcl_api',
        cacheKey: `report:${reportCode}:payload`,
        reportCode,
        payload: report,
        metadata: {
          title: report.title,
          zone: report.zone,
          fightCount: report.fights.length,
        },
      });

      await setCachedValue('report', reportCode, report);
      
      return NextResponse.json({ report, cached: false });
    }
    
    // ==========================================
    // FIGHT DETAILS - Complete analysis
    // ==========================================
    if (action === 'fight') {
      console.log('[WCL FIGHT] ========== START FIGHT ANALYSIS ==========');
      
      const code = searchParams.get('code');
      const fightId = parseInt(searchParams.get('fightId') || '0');
      
      console.log('[WCL FIGHT] Code:', code, 'FightId:', fightId);
      
      if (!code || !fightId) {
        console.log('[WCL FIGHT] ERROR: Missing code or fightId');
        return NextResponse.json({ error: 'Missing code or fightId' }, { status: 400 });
      }
      
      const reportCode = parseReportCode(code);
      console.log('[WCL FIGHT] Parsed report code:', reportCode);
      
      if (!reportCode) {
        console.log('[WCL FIGHT] ERROR: Invalid report code');
        return NextResponse.json({ error: 'Invalid report code' }, { status: 400 });
      }
      
      const fightCacheKey = `${reportCode}:${fightId}`;
      if (!forceRefresh) {
        const cachedFightPayload = await getCachedValue<any>('fight', fightCacheKey, FIGHT_CACHE_TTL_MS);
        if (cachedFightPayload) {
          return NextResponse.json({ ...cachedFightPayload, cached: true });
        }
      }
      
      // ===== REAL DATA FETCH =====
      console.log('[WCL FIGHT] Getting token...');
      const token = await getToken();
      console.log('[WCL FIGHT] Token obtained, length:', token?.length);
      
      // Fetch report first to get fight timing
      console.log('[WCL FIGHT] Fetching report:', reportCode);
      const wclReport = await fetchWCLReport(reportCode, token);
      console.log('[WCL FIGHT] Report fetched, fights:', wclReport?.fights?.length);
      
      const fight = wclReport.fights.find(f => f.id === fightId);
      if (!fight) {
        console.log('[WCL FIGHT] ERROR: Fight not found. Available IDs:', wclReport?.fights?.map(f => f.id));
        return NextResponse.json({ error: 'Fight not found' }, { status: 404 });
      }
      console.log('[WCL FIGHT] Found fight:', fight.name, 'Duration:', Math.floor((fight.endTime - fight.startTime) / 1000));
      
      const duration = Math.floor((fight.endTime - fight.startTime) / 1000);
      // When fightIDs is specified, startTime/endTime are relative to fight start (in ms)
      // Use fight.startTime and fight.endTime as absolute timestamps for events API
      const fightStartTime = fight.startTime;
      const fightEndTime = fight.endTime;
      
      // Fetch all data in parallel with error handling for each request
      let damageDone, healingDone, damageTaken, deaths, buffs, casts, playerDetails, dpsGraph, hpsGraph, dpsRankings, hpsRankings;
      
      try {
        const results = await Promise.allSettled([
          fetchWCLDamageDone(reportCode, [fightId], token),
          fetchWCLHealingDone(reportCode, [fightId], token),
          fetchWCLDamageTaken(reportCode, [fightId], token),
          fetchWCLDeaths(reportCode, [fightId], fightStartTime, fightEndTime, token),
          fetchWCLBuffs(reportCode, [fightId], fightStartTime, fightEndTime, token),
          fetchWCLCasts(reportCode, [fightId], fightStartTime, fightEndTime, token),
          fetchWCLPlayerDetails(reportCode, [fightId], token),
          fetchWCLDpsGraph(reportCode, [fightId], fightStartTime, fightEndTime, token),
          fetchWCLHpsGraph(reportCode, [fightId], fightStartTime, fightEndTime, token),
          fetchWCLDpsRankings(reportCode, [fightId], token),
          fetchWCLHpsRankings(reportCode, [fightId], token),
        ]);
        
        // Extract results, using defaults for failed requests
        damageDone = results[0].status === 'fulfilled' ? results[0].value : { entries: [] };
        healingDone = results[1].status === 'fulfilled' ? results[1].value : { entries: [] };
        damageTaken = results[2].status === 'fulfilled' ? results[2].value : { entries: [] };
        deaths = results[3].status === 'fulfilled' ? results[3].value : [];
        buffs = results[4].status === 'fulfilled' ? results[4].value : [];
        casts = results[5].status === 'fulfilled' ? results[5].value : [];
        playerDetails = results[6].status === 'fulfilled' ? results[6].value : null;
        dpsGraph = results[7].status === 'fulfilled' ? results[7].value : null;
        hpsGraph = results[8].status === 'fulfilled' ? results[8].value : null;
        dpsRankings = results[9].status === 'fulfilled' ? results[9].value : [];
        hpsRankings = results[10].status === 'fulfilled' ? results[10].value : [];
        
        // Log any failures for debugging
        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            console.error(`[WCL] Request ${i} failed:`, result.reason);
          }
        });
        
        // Debug: Log the status of important requests
        const requestNames = ['damageDone', 'healingDone', 'damageTaken', 'deaths', 'buffs', 'casts', 'playerDetails', 'dpsGraph', 'hpsGraph', 'dpsRankings', 'hpsRankings'];
        console.log('[WCL] Request status summary:');
        results.forEach((result, i) => {
          const name = requestNames[i] || `request${i}`;
          if (result.status === 'fulfilled') {
            const value = result.value;
            const length = Array.isArray(value) ? value.length : 
              (value && typeof value === 'object' && 'entries' in value ? value.entries?.length : 
              (value && typeof value === 'object' ? 'object' : 'unknown'));
            console.log(`[WCL]   ${name}: fulfilled (${length})`);
          } else {
            console.log(`[WCL]   ${name}: REJECTED - ${result.reason}`);
          }
        });
        
        // Debug: Check the actual structure of damageDone
        console.log('[WCL DEBUG] damageDone type:', typeof damageDone);
        console.log('[WCL DEBUG] damageDone keys:', damageDone ? Object.keys(damageDone) : 'null');
        console.log('[WCL DEBUG] damageDone.entries:', damageDone?.entries?.length || 'no entries');
        console.log('[WCL DEBUG] damageDone.data:', damageDone?.data ? 'has data' : 'no data');
        
        // Log first 3 damage entries if available
        if (damageDone?.entries && damageDone.entries.length > 0) {
          console.log('[WCL DEBUG] First 3 damage entries:');
          damageDone.entries.slice(0, 3).forEach((entry: any, i: number) => {
            console.log(`[WCL DEBUG]   Entry ${i}: name=${entry.name}, total=${entry.total}, dps=${entry.dps}, id=${entry.id}`);
          });
        } else {
          console.log('[WCL DEBUG] WARNING: No damage entries found!');
        }
        
        // Log first 3 healing entries if available
        if (healingDone?.entries && healingDone.entries.length > 0) {
          console.log('[WCL DEBUG] First 3 healing entries:');
          healingDone.entries.slice(0, 3).forEach((entry: any, i: number) => {
            console.log(`[WCL DEBUG]   Entry ${i}: name=${entry.name}, total=${entry.total}, hps=${entry.hps || 'N/A'}, id=${entry.id}`);
          });
        } else {
          console.log('[WCL DEBUG] WARNING: No healing entries found!');
        }
        
        // WCL table API returns { data: { entries: [...], totalTime: ... } }
        // Extract the data.entries to the top level
        if (damageDone && 'data' in damageDone && damageDone.data && typeof damageDone.data === 'object') {
          console.log('[WCL DEBUG] Extracting damage entries from data property');
          if ('entries' in damageDone.data) {
            damageDone = damageDone.data;
          }
        }
        if (healingDone && 'data' in healingDone && healingDone.data && typeof healingDone.data === 'object') {
          console.log('[WCL DEBUG] Extracting healing entries from data property');
          if ('entries' in healingDone.data) {
            healingDone = healingDone.data;
          }
        }
        if (damageTaken && 'data' in damageTaken && damageTaken.data && typeof damageTaken.data === 'object') {
          console.log('[WCL DEBUG] Extracting damageTaken entries from data property');
          if ('entries' in damageTaken.data) {
            damageTaken = damageTaken.data;
          }
        }
        
        // Log successful results for debugging
        console.log('[WCL] DamageDone entries after fix:', damageDone?.entries?.length || 0);
        console.log('[WCL] HealingDone entries after fix:', healingDone?.entries?.length || 0);
        console.log('[WCL] PlayerDetails result:', playerDetails ? 'has data' : 'null');
      } catch (error: any) {
        console.error('[WCL] Error fetching data:', error);
        return NextResponse.json({ error: `Failed to fetch WCL data: ${error.message}` }, { status: 500 });
      }
      
      // Build actor lookup from masterData
      // The GraphQL query already filters actors(type: "player") so all returned are players
      const actors = wclReport.masterData?.actors || [];
      const abilities = wclReport.masterData?.abilities || [];
      const actorMap = new Map<number, WCLActor>();
      const actorNameMap = new Map<string, WCLActor>();
      const abilityMap = new Map<number, WCLReport['masterData']['abilities'][number]>();
      const playerNameSet = new Set<string>();
      
      // Add all actors - they're already filtered by the query to be players only
      actors.forEach(a => {
        actorMap.set(a.id, a);
        actorNameMap.set(a.name.toLowerCase(), a);
        playerNameSet.add(a.name);
      });
      abilities.forEach((ability) => {
        abilityMap.set(ability.gameID, ability);
      });
      
      // Also build a set of player names from playerDetails for extra validation
      const playerDetailsNames = new Set<string>();
      const playerDetailsLookup = buildPlayerDetailsLookup(playerDetails);
      playerDetailsLookup.forEach((entry) => {
        if (entry.name) {
          playerDetailsNames.add(entry.name);
        }
      });
      
      // Log for debugging
      console.log('[WCL] Actors found:', actors.length);
      console.log('[WCL] Player names from actors:', Array.from(playerNameSet).slice(0, 5));
      console.log('[WCL] Player names from playerDetails:', Array.from(playerDetailsNames).slice(0, 5));
      console.log('[WCL] Damage entries count:', damageDone?.entries?.length || 0);
      console.log('[WCL] Healing entries count:', healingDone?.entries?.length || 0);
      
      // Build rankings map for percentile lookup - process both DPS and HPS rankings
      const rankingMap = new Map<string, { dps: number; hps: number }>();
      
      const processRankings = (rankings: WCLRankingsData[] | null | undefined, type: 'dps' | 'hps') => {
        if (!rankings || !Array.isArray(rankings)) return;
        
        rankings.forEach((rankingData: WCLRankingsData) => {
          if (!rankingData?.roles) return;
          
          const processCharacters = (characters: WCLRankingCharacter[] | null | undefined) => {
            if (!characters || !Array.isArray(characters)) return;
            
            characters.forEach((char: WCLRankingCharacter) => {
              if (char?.name && char.rankPercent !== undefined) {
                const existing = rankingMap.get(char.name) || { dps: 0, hps: 0 };
                existing[type] = char.rankPercent;
                rankingMap.set(char.name, existing);
              }
            });
          };
          
          processCharacters(rankingData.roles.tanks?.characters);
          processCharacters(rankingData.roles.healers?.characters);
          processCharacters(rankingData.roles.dps?.characters);
        });
      };
      
      processRankings(dpsRankings, 'dps');
      processRankings(hpsRankings, 'hps');
      
      // Debug: Log rankings data
      console.log('[WCL] Rankings processed - count:', rankingMap.size);
      if (rankingMap.size > 0) {
        const sampleEntries = Array.from(rankingMap.entries()).slice(0, 3);
        sampleEntries.forEach(([name, data]) => {
          console.log(`[WCL] Ranking sample: ${name} - DPS: ${data.dps}, HPS: ${data.hps}`);
        });
      }
      
      // Debug: Log playerDetails structure
      if (playerDetails) {
        console.log('[WCL] playerDetails structure:', Object.keys(playerDetails));
        console.log('[WCL] playerDetails.tanks:', playerDetails.tanks?.length || 0, 
          playerDetails.tanks?.slice(0, 2).map((t: any) => typeof t === 'object' ? Object.keys(t) : typeof t));
        console.log('[WCL] playerDetails.healers:', playerDetails.healers?.length || 0,
          playerDetails.healers?.slice(0, 2).map((h: any) => typeof h === 'object' ? Object.keys(h) : typeof h));
        console.log('[WCL] playerDetails.dps:', playerDetails.dps?.length || 0,
          playerDetails.dps?.slice(0, 2).map((d: any) => typeof d === 'object' ? Object.keys(d) : typeof d));
        // Log first entry from each if available
        if (playerDetails.tanks?.[0]) console.log('[WCL] Sample tank:', JSON.stringify(playerDetails.tanks[0]).substring(0, 200));
        if (playerDetails.healers?.[0]) console.log('[WCL] Sample healer:', JSON.stringify(playerDetails.healers[0]).substring(0, 200));
        if (playerDetails.dps?.[0]) console.log('[WCL] Sample dps:', JSON.stringify(playerDetails.dps[0]).substring(0, 200));
      } else {
        console.log('[WCL] playerDetails is null - will use actor.icon for role detection');
      }
      
      // Determine role from multiple sources - prioritize playerDetails from WCL
      const getPlayerRole = (playerName: string, actor: WCLActor | undefined): 'tank' | 'healer' | 'dps' => {
        // First check playerDetails from WCL - this is the most reliable source
        if (playerDetails) {
          const tanks = (playerDetails.tanks || []) as WCLPlayerDetailEntry[];
          const healers = (playerDetails.healers || []) as WCLPlayerDetailEntry[];
          const dps = (playerDetails.dps || []) as WCLPlayerDetailEntry[];
          
          // Check exact match first, handle both {name: string} and string formats
          const findByName = (arr: any[], name: string) => arr.some((item: any) => {
            if (typeof item === 'string') return item === name;
            if (typeof item === 'object' && item !== null) return item.name === name;
            return false;
          });
          
          if (findByName(tanks, playerName)) return 'tank';
          if (findByName(healers, playerName)) return 'healer';
          if (findByName(dps, playerName)) return 'dps';
        }
        
        // Then check actor icon for spec - this is reliable as it comes from WCL masterData
        if (actor?.icon) {
          const role = getRoleFromIcon(actor.icon);
          return role;
        }
        
        // Default to dps for players we can't determine
        return 'dps';
      };
      
      // Get class from actor
      const getPlayerClass = (actor: WCLActor | undefined): string => {
        if (actor?.name) {
          const detailsPlayer = playerDetailsLookup.get(actor.name.toLowerCase());
          if (typeof detailsPlayer?.class === 'string' && detailsPlayer.class) {
            return detailsPlayer.class;
          }
          if (typeof detailsPlayer?.type === 'string' && detailsPlayer.type) {
            return detailsPlayer.type;
          }
        }

        if (!actor) return 'Unknown';
        
        // subType contains class name
        if (actor.subType && actor.subType !== 'Unknown') {
          return actor.subType;
        }
        
        // Parse from icon
        if (actor.icon) {
          return getClassFromIcon(actor.icon);
        }
        
        return 'Unknown';
      };
      
      // Get spec from actor icon
      const getPlayerSpec = (playerName: string, actor: WCLActor | undefined): string => {
        // Check playerDetails first
        const player = playerDetailsLookup.get(playerName.toLowerCase());
        if (player?.spec) return player.spec;
        if (Array.isArray((player as WCLPlayerDetailEntry | undefined)?.specs)) {
          const firstSpec = ((player as WCLPlayerDetailEntry & { specs?: Array<{ spec?: string }> }).specs || []).find(
            (specEntry) => typeof specEntry?.spec === 'string' && specEntry.spec
          );
          if (firstSpec?.spec) return firstSpec.spec;
        }

        // Parse from icon
        if (actor?.icon) {
          return getSpecFromIcon(actor.icon);
        }
        
        return 'Unknown';
      };
      
      // Count interrupts from casts - only count actual interrupts (when target is casting something interruptible)
      const interruptAbilities = [
        'Pummel', 'Shield Bash', 'Kick', 'Counterspell', 'Wind Shear', 
        'Rebuke', 'Spear Hand Strike', 'Skull Bash', 'Maim', 'Arcane Torrent',
        'Silence', 'Strangulate', 'Mind Freeze', 'Disrupt', 'Spear of Bastion',
        'Intimidating Shout', 'Blind', 'Gouge', 'Hex', 'Bind Elemental',
        'Avatar', 'Axial Conduit', 'Chi Torpedo', 'Spear Hand Strike'
      ];
      
      // Track actual interrupts - when the interrupt ability results in the target's cast being stopped
      // WCL events have type 'interrupt' when successful, or 'cast' with targetIsFriendly === false for attempts
      const interruptCount = new Map<string, number>();
      
      // Look for actual interrupt events (type = 'interrupt' or 'cast' that interrupts)
      const castsArray = Array.isArray(casts) ? casts : [];
      console.log('[WCL] Casts array length:', castsArray.length);
      
      // Debug: Log interrupt-related casts
      const interruptCasts = castsArray.filter((c: WCLEvent) => 
        c.type === 'interrupt' || 
        (c.ability?.name && interruptAbilities.some(ia => c.ability!.name.toLowerCase().includes(ia.toLowerCase())))
      );
      console.log('[WCL] Interrupt-related casts found:', interruptCasts.length);
      if (interruptCasts.length > 0) {
        console.log('[WCL] Sample interrupt casts:', interruptCasts.slice(0, 5).map((c: WCLEvent) => 
          `type=${c.type}, ability=${c.ability?.name}, source=${c.source?.name}, target=${c.target?.name}`
        ));
      }
      
      castsArray.forEach((cast: WCLEvent) => {
        if (!cast?.ability?.name) return;
        
        const abilityName = cast.ability.name.toLowerCase();
        const isInterruptAbility = interruptAbilities.some(ia => abilityName.includes(ia.toLowerCase()));
        
        // Only count if:
        // 1. This is an interrupt ability OR type is 'interrupt'
        // 2. The target is an enemy (boss) - targetIsFriendly === false OR type === 'interrupt'
        // 3. The source is a player
        const isSuccessfulInterrupt = cast.type === 'interrupt' || 
          (isInterruptAbility && cast.targetIsFriendly === false);
        
        if (isSuccessfulInterrupt) {
          // Try multiple ways to get the source name
          const sourceName = cast.source?.name || 
            (cast.sourceID ? actorMap.get(cast.sourceID)?.name : null);
          
          if (sourceName) {
            // Verify this is a player using the interrupt (check actorMap by name too)
            const isPlayer = playerNameSet.has(sourceName) || 
              playerDetailsNames.has(sourceName) ||
              actorNameMap.has(sourceName.toLowerCase());
            
            if (isPlayer) {
              interruptCount.set(sourceName, (interruptCount.get(sourceName) || 0) + 1);
            }
          }
        }
      });
      
      console.log('[WCL] Total interrupts counted:', Array.from(interruptCount.entries()));
      
      // Count dispels from casts - only count dispels by actual players
      const dispelAbilities = ['Purify', 'Cleanse', 'Dispel Magic', 'Remove Curse', 'Purify Spirit', 'Detox', "Nature's Cure", 'Purify Disease'];
      const dispelCount = new Map<string, number>();
      castsArray.forEach((cast: WCLEvent) => {
        if (!cast?.ability?.name || !cast?.source?.name) return;
        
        if (dispelAbilities.some(da => cast.ability!.name.toLowerCase().includes(da.toLowerCase()))) {
          const sourceName = cast.source.name;
          // Only count dispels by actual players
          if (playerNameSet.has(sourceName) || playerDetailsNames.has(sourceName)) {
            dispelCount.set(sourceName, (dispelCount.get(sourceName) || 0) + 1);
          }
        }
      });
      
      // Check for potions, flasks, food, runes from buffs
      const potionNames = ['Power Potion', 'Agility Potion', 'Strength Potion', 'Intellect Potion', 'Essence of Power'];
      const flaskNames = ['Flask', 'Greater Flask', 'Spectral Flask'];
      const foodNames = ['Well Fed', 'Bountiful Feast', 'Surprisingly Palatable Feast', 'Grand Banquet'];
      const runeNames = ['Veiled Augment Rune', 'Eternal Augment Rune', 'Battle-Scarred Augment Rune'];
      
      const playerConsumables = new Map<string, { potion: boolean; flask: boolean; food: boolean; rune: boolean }>();
      
      // Process buffs safely
      const buffsArray = Array.isArray(buffs) ? buffs : [];
      buffsArray.forEach((buff: WCLEvent) => {
        if (!buff?.target?.name || !buff?.ability?.name) return;
        
        const targetName = buff.target.name;
        const abilityName = buff.ability.name.toLowerCase();
        
        if (!playerConsumables.has(targetName)) {
          playerConsumables.set(targetName, { potion: false, flask: false, food: false, rune: false });
        }
        
        const consumables = playerConsumables.get(targetName)!;
        if (potionNames.some(p => abilityName.includes(p.toLowerCase()))) consumables.potion = true;
        if (flaskNames.some(f => abilityName.includes(f.toLowerCase()))) consumables.flask = true;
        if (foodNames.some(f => abilityName.includes(f.toLowerCase()))) consumables.food = true;
        if (runeNames.some(r => abilityName.includes(r.toLowerCase()))) consumables.rune = true;
      });
      
      // Build player stats
      const playerMap = new Map<number, PlayerStats>();
      
      // CRITICAL: Filter entries to only include ACTUAL PLAYERS
      // WCL tables can include pets, NPCs, etc. that we need to exclude
      const isActualPlayer = (entry: WCLTableEntry): boolean => {
        // Check if entry ID exists in actorMap (actors are filtered by type='player' in GraphQL)
        if (actorMap.has(entry.id)) return true;
        // Check if entry name exists in playerNameSet
        if (playerNameSet.has(entry.name)) return true;
        // Check if entry name exists in playerDetailsNames
        if (playerDetailsNames.has(entry.name)) return true;
        // Check entry type field - 'Player' indicates a real player
        if (entry.type === 'Player') return true;
        // Exclude entries that look like pets (usually have parentheses in name like "Pet (Owner)")
        if (entry.name.includes('(') || entry.name.includes(')')) return false;
        return false;
      };
      
      // Filter entries to only include actual players
      const damageEntries = (damageDone?.entries || []).filter(isActualPlayer);
      const healingEntries = (healingDone?.entries || []).filter(isActualPlayer);
      const dtpsEntries = (damageTaken?.entries || []).filter(isActualPlayer);
      
      console.log('[WCL] === DATA SUMMARY (After Player Filtering) ===');
      console.log('[WCL] Actors from masterData:', actors.length);
      console.log('[WCL] Player names from actors:', Array.from(playerNameSet).slice(0, 10));
      console.log('[WCL] Player names from playerDetails:', Array.from(playerDetailsNames).slice(0, 10));
      console.log('[WCL] Damage entries (filtered):', damageEntries.length, 'of', damageDone?.entries?.length || 0);
      console.log('[WCL] Healing entries (filtered):', healingEntries.length, 'of', healingDone?.entries?.length || 0);
      console.log('[WCL] DTPS entries (filtered):', dtpsEntries.length, 'of', damageTaken?.entries?.length || 0);
      if (damageEntries.length > 0) {
        console.log('[WCL] Sample damage entries:', damageEntries.slice(0, 3).map(e => `${e.name} (${e.id}, ${e.type})`));
      }
      console.log('[WCL] ======================');
      
      damageEntries.forEach((entry: WCLTableEntry) => {
        const actor = actorMap.get(entry.id);
        const className = getPlayerClass(actor);
        const playerRole = getPlayerRole(entry.name, actor);
        const playerSpec = getPlayerSpec(entry.name, actor);
        const rankings = rankingMap.get(entry.name);
        
        // Calculate DPS from total and activeTime
        const activeTimeSeconds = (entry.activeTime || duration * 1000) / 1000;
        const dps = Math.floor((entry.total || 0) / Math.max(1, activeTimeSeconds));
        
        // Get percentile - for wipes, rankings still provide rankPercent based on all parses
        // The rankings API returns rankPercent even for non-kills
        let percentile = rankings?.dps || 0;
        
        // For healers, prioritize HPS ranking
        if (playerRole === 'healer' && rankings?.hps) {
          percentile = rankings.hps;
        }
        
        // If still no percentile from rankings, try to get from the entry itself
        // WCL sometimes provides rank info in table entries
        if (!percentile && (entry as any).rankPercent !== undefined) {
          percentile = (entry as any).rankPercent;
        }
        
          const consumables = playerConsumables.get(entry.name) || { potion: false, flask: false, food: false, rune: false };
          const playerDetailsEntry = playerDetailsLookup.get(entry.name.toLowerCase());
          const playerTalents = extractPlayerTalentNames(entry.talents, playerDetailsEntry);
          
          const player: PlayerStats = {
            id: entry.id,
            name: entry.name,
            class: className,
            spec: playerSpec,
            role: playerRole,
            talents: playerTalents,
            itemLevel: entry.itemLevel || fight.averageItemLevel || 480,
            server: actor?.server || 'Unknown',
          
          dps: dps,
          dpsMax: dps,
          dpsMin: dps,
          totalDamage: entry.total || 0,
          damagePercent: 0,
          rank: 0,
          rankPercent: percentile,
          
          hps: 0,
          hpsMax: 0,
          hpsMin: 0,
          totalHealing: 0,
          healingPercent: 0,
          overheal: 0,
          overhealPercent: 0,
          
          dtps: 0,
          totalDamageTaken: 0,
          avoidableDamageTaken: 0,
          avoidableDamagePercent: 0,
          
          abilities: (entry.abilities || []).slice(0, 8).map(a => ({
            name: a.name,
            icon: a.icon,
            casts: a.hitCount || 0,
            hits: a.hitCount || 0,
            critPercent: a.hitCount > 0 ? Math.floor((a.critCount / a.hitCount) * 100) : 0,
            avgHit: Math.floor(a.avgHit || 0),
            maxHit: Math.floor(a.maxHit || 0),
            totalDamage: a.total || 0,
            percentOfTotal: 0
          })),
          
          healingAbilities: [],
          
          dpsTimeline: generateTimelineFromGraph(dpsGraph, entry.id, duration, dps),
          hpsTimeline: [],
          dtpsTimeline: [],
          
          buffUptime: [],
          debuffs: [],
          deaths: 0,
          deathEvents: [],
          activeTime: Math.min(100, Math.floor((entry.activeTime || duration * 1000) / (duration * 10))),
          downtime: 0,
          interruptions: interruptCount.get(entry.name) || 0,
          dispels: dispelCount.get(entry.name) || 0,
          potionUsed: consumables.potion,
          flaskUsed: consumables.flask,
          foodUsed: consumables.food,
          runeUsed: consumables.rune,
        };
        
        playerMap.set(entry.id, player);
      });
      
      // Add healing data - includes healers that may not be in damage table
      healingEntries.forEach((entry: WCLTableEntry) => {
        const actor = actorMap.get(entry.id);
        const className = getPlayerClass(actor);
        const playerRole = getPlayerRole(entry.name, actor);
        const playerSpec = getPlayerSpec(entry.name, actor);
        const rankings = rankingMap.get(entry.name);
        
        const activeTimeSeconds = (entry.activeTime || duration * 1000) / 1000;
        const hps = Math.floor((entry.total || 0) / Math.max(1, activeTimeSeconds));
        
        const player = playerMap.get(entry.id);
        
        if (player) {
            // Update existing player with healing data
            if (!player.talents || player.talents.length === 0) {
              const playerDetailsEntry = playerDetailsLookup.get(entry.name.toLowerCase());
              player.talents = extractPlayerTalentNames(entry.talents, playerDetailsEntry);
            }
            player.hps = hps;
            player.hpsMax = hps;
            player.hpsMin = hps;
          player.totalHealing = entry.total || 0;
          
          // Update percentile if healer
          if (playerRole === 'healer' && rankings?.hps) {
            player.rankPercent = rankings.hps;
          }
          
          player.healingAbilities = (entry.abilities || []).slice(0, 6).map(a => ({
            name: a.name,
            icon: a.icon,
            casts: a.hitCount || 0,
            hits: a.hitCount || 0,
            critPercent: a.hitCount > 0 ? Math.floor((a.critCount / a.hitCount) * 100) : 0,
            avgHit: Math.floor(a.avgHit || 0),
            maxHit: Math.floor(a.maxHit || 0),
            totalHealing: a.total || 0,
            overheal: 0,
            percentOfTotal: 0
          }));
          
          player.hpsTimeline = generateTimelineFromGraph(hpsGraph, entry.id, duration, hps);
        } else {
          // Healer not in damage table - add them
            const consumables = playerConsumables.get(entry.name) || { potion: false, flask: false, food: false, rune: false };
              const playerDetailsEntry = playerDetailsLookup.get(entry.name.toLowerCase());
              const playerTalents = extractPlayerTalentNames(entry.talents, playerDetailsEntry);
          
          // Get HPS percentile for healer
          let healerPercentile = rankings?.hps || 0;
          if (!healerPercentile && (entry as any).rankPercent !== undefined) {
            healerPercentile = (entry as any).rankPercent;
          }
          
          const newPlayer: PlayerStats = {
            id: entry.id,
            name: entry.name,
              class: className,
              spec: playerSpec,
              role: playerRole,
              talents: playerTalents,
              itemLevel: entry.itemLevel || fight.averageItemLevel || 480,
              server: actor?.server || 'Unknown',
            
            dps: 0,
            dpsMax: 0,
            dpsMin: 0,
            totalDamage: 0,
            damagePercent: 0,
            rank: 0,
            rankPercent: healerPercentile,
            
            hps: hps,
            hpsMax: hps,
            hpsMin: hps,
            totalHealing: entry.total || 0,
            healingPercent: 0,
            overheal: 0,
            overhealPercent: 0,
            
            dtps: 0,
            totalDamageTaken: 0,
            avoidableDamageTaken: 0,
            avoidableDamagePercent: 0,
            
            abilities: [],
            healingAbilities: (entry.abilities || []).slice(0, 6).map(a => ({
              name: a.name,
              icon: a.icon,
              casts: a.hitCount || 0,
              hits: a.hitCount || 0,
              critPercent: a.hitCount > 0 ? Math.floor((a.critCount / a.hitCount) * 100) : 0,
              avgHit: Math.floor(a.avgHit || 0),
              maxHit: Math.floor(a.maxHit || 0),
              totalHealing: a.total || 0,
              overheal: 0,
              percentOfTotal: 0
            })),
            
            dpsTimeline: [],
            hpsTimeline: generateTimelineFromGraph(hpsGraph, entry.id, duration, hps),
            dtpsTimeline: [],
            
            buffUptime: [],
            debuffs: [],
            deaths: 0,
            deathEvents: [],
            activeTime: Math.min(100, Math.floor((entry.activeTime || duration * 1000) / (duration * 10))),
            downtime: 0,
            interruptions: interruptCount.get(entry.name) || 0,
            dispels: dispelCount.get(entry.name) || 0,
            potionUsed: consumables.potion,
            flaskUsed: consumables.flask,
            foodUsed: consumables.food,
            runeUsed: consumables.rune,
          };
          
          playerMap.set(entry.id, newPlayer);
        }
      });
      
      // Add DTPS data
      dtpsEntries.forEach((entry: WCLTableEntry) => {
        const player = playerMap.get(entry.id);
        if (player) {
          player.dtps = Math.floor(entry.dps || 0);
          player.totalDamageTaken = entry.total || 0;
        }
      });
      
      // Process death events safely
      const deathsArray = Array.isArray(deaths) ? deaths : [];
      console.log('[WCL] Deaths array length:', deathsArray.length);
      if (deathsArray.length > 0) {
        console.log('[WCL] Sample death events:', deathsArray.slice(0, 3).map((d: WCLEvent) => 
          `target=${d.target?.name}(${d.target?.id}), ability=${d.ability?.name}, timestamp=${d.timestamp}`
        ));
      }
      
      deathsArray.forEach((death: WCLEvent) => {
        const targetId = death.target?.id || death.targetID || 0;
        const targetName = death.target?.name || (targetId ? actorMap.get(targetId)?.name : undefined) || 'Unknown';
        const resolvedAbilityName =
          death.ability?.name ||
          (typeof (death as WCLEvent & { killingAbilityGameID?: number }).killingAbilityGameID === 'number'
            ? abilityMap.get((death as WCLEvent & { killingAbilityGameID?: number }).killingAbilityGameID || 0)?.name
            : undefined) ||
          (typeof (death as WCLEvent & { abilityGameID?: number }).abilityGameID === 'number'
            ? abilityMap.get((death as WCLEvent & { abilityGameID?: number }).abilityGameID || 0)?.name
            : undefined) ||
          'Unknown';
        
        // Find player by ID or name
        let player: PlayerStats | undefined = playerMap.get(targetId || 0);
        if (!player && targetName) {
          // Try case-insensitive name match
          player = Array.from(playerMap.values()).find(p => 
            p.name.toLowerCase() === targetName.toLowerCase()
          );
        }
        
        console.log('[WCL] Processing death:', targetName, '(', targetId, ') - found player:', !!player);
        
        if (player) {
          player.deaths++;
          const deathTime = Math.floor((death.timestamp - fight.startTime) / 1000);
          player.deathEvents.push({
            time: deathTime,
            killer: death.source?.name || (death.sourceID ? actorMap.get(death.sourceID)?.name : undefined) || fight.name,
            ability: resolvedAbilityName,
            damage: death.amount || 0,
            hpRemaining: 0
          });
          console.log('[WCL] Added death to player:', player.name, 'at', deathTime, 's');
        }
      });
      
      // Convert to array and calculate percentages/ranks
      const playersArray = Array.from(playerMap.values());
      const totalDamage = playersArray.reduce((s, p) => s + p.totalDamage, 0);
      const totalHealing = playersArray.reduce((s, p) => s + p.totalHealing, 0);
      
      playersArray.forEach(p => {
        p.damagePercent = Math.round((p.totalDamage / Math.max(1, totalDamage)) * 1000) / 10;
        p.healingPercent = Math.round((p.totalHealing / Math.max(1, totalHealing)) * 1000) / 10;
        
        // Calculate ability percentages
        const totalAbilityDamage = p.abilities.reduce((s, a) => s + a.totalDamage, 0);
        p.abilities.forEach(a => {
          a.percentOfTotal = Math.round((a.totalDamage / Math.max(1, totalAbilityDamage)) * 1000) / 10;
        });
        
        const totalHealingAbility = p.healingAbilities.reduce((s, a) => s + a.totalHealing, 0);
        p.healingAbilities.forEach(a => {
          a.percentOfTotal = Math.round((a.totalHealing / Math.max(1, totalHealingAbility)) * 1000) / 10;
        });
      });
      
      // Sort by DPS for ranking
      const sorted = [...playersArray].sort((a, b) => b.dps - a.dps);
      sorted.forEach((p, i) => {
        const player = playersArray.find(pl => pl.id === p.id);
        if (player) player.rank = i + 1;
      });
      
      // Build timeline events
      const timeline: TimelineEvent[] = [];
      
      // Add phases from boss data
      const bossKey = fight.name.toLowerCase().split(' ')[0];
      const bossData = BOSSES[bossKey as keyof typeof BOSSES];
      if (bossData?.phases) {
        bossData.phases.forEach((phase, i) => {
          timeline.push({
            time: Math.floor((duration / bossData.phases.length) * i),
            type: 'phase',
            description: phase,
            source: fight.name
          });
        });
      }
      
      // Add bloodlust ONLY if actually detected in casts - do NOT assume/fabricate
      const bloodlustCast = castsArray.find((c: WCLEvent) => 
        c?.ability?.name && ['Bloodlust', 'Heroism', 'Time Warp', 'Ancient Hysteria', 'Netherwinds']
          .some(bl => c.ability!.name.includes(bl))
      );
      
      // Only add bloodlust to timeline if actually detected
      if (bloodlustCast) {
        timeline.push({
          time: Math.floor((bloodlustCast.timestamp - fight.startTime) / 1000),
          type: 'bloodlust',
          description: bloodlustCast.ability.name,
          source: bloodlustCast.source?.name || playersArray.find(p => p.class === 'Shaman')?.name || 'Unknown'
        });
      }
      
      // Add deaths to timeline
      playersArray.filter(p => p.deaths > 0).forEach(p => {
        p.deathEvents.forEach(d => {
          timeline.push({
            time: d.time,
            type: 'death',
            description: `${p.name} died to ${d.ability}`,
            target: p.name,
            ability: d.ability
          });
        });
      });
      
      timeline.sort((a, b) => a.time - b.time);

      // Build raid buffs from real buff events (no synthetic uptimes)
      const raidBuffNames = ['Bloodlust', 'Power Word: Fortitude', 'Battle Shout', 'Arcane Intellect', 'Mark of the Wild'];
      const raidBuffs = raidBuffNames
        .map((buffName) => {
          const buffEvent = buffsArray.find((b: WCLEvent) => b?.ability?.name?.toLowerCase().includes(buffName.toLowerCase()));
          if (!buffEvent) return null;
          return {
            name: buffName,
            uptime: 0,
            source: buffEvent.source?.name || 'Unknown',
          };
        })
        .filter(Boolean) as { name: string; uptime: number; source: string }[];
      
      // Build fight data
      const bossContext = await resolveBossContext(fight.name);

      const fightData: FightData = {
        id: fight.id,
        reportId: reportCode,
        bossId: 0,
        bossName: fight.name,
        bossIcon: bossKey,
        zone: wclReport.zone?.name || 'Unknown',
        difficulty: getDifficultyName(fight.difficulty) as any,
        duration,
        startTime: fight.startTime,
        endTime: fight.endTime,
        kill: Boolean(fight.kill),
        bossHPPercent: fight.kill ? 0 : Math.floor((fight.bossPercentage ?? fight.fightPercentage ?? 10000) / 100),
        
        composition: {
          tanks: playersArray.filter(p => p.role === 'tank').length,
          healers: playersArray.filter(p => p.role === 'healer').length,
          dps: playersArray.filter(p => p.role === 'dps').length,
          total: playersArray.length,
          bloodlust: !!bloodlustCast,
          brez: playersArray.filter(p => ['Druid', 'Death Knight', 'Warlock'].includes(p.class)).length
        },
        
        phases: bossData?.phases?.map((name, i) => ({
          name,
          startTime: Math.floor((duration / bossData.phases.length) * i) * 1000,
          endTime: Math.floor((duration / bossData.phases.length) * (i + 1)) * 1000,
          bossHP: [],
          events: []
        })) || [{ name: 'Phase 1', startTime: 0, endTime: duration * 1000, bossHP: [], events: [] }],
        
        players: playersArray,
        
        bossAbilities: bossData?.abilities?.map((a: any) => ({
          name: a.name,
          icon: a.icon,
          damage: 0,
          healing: 0,
          hits: 0,
          avgHit: 0,
          maxHit: 0,
          type: a.type as any,
          targets: [],
          timeline: []
        })) || [],
        
        timeline,
        combatEvents: castsArray,
        
        summary: {
          totalDamage,
          totalHealing,
          totalDamageTaken: playersArray.reduce((s, p) => s + p.totalDamageTaken, 0),
          raidDPS: Math.floor(totalDamage / Math.max(1, duration)),
          raidHPS: Math.floor(totalHealing / Math.max(1, duration)),
          raidDTPS: Math.floor(playersArray.reduce((s, p) => s + p.dtps, 0)),
          deaths: playersArray.reduce((s, p) => s + p.deaths, 0),
          combatResurrections: 0,
          bloodlusts: bloodlustCast ? 1 : 0,
          dispels: playersArray.reduce((s, p) => s + p.dispels, 0),
          interrupts: playersArray.reduce((s, p) => s + p.interruptions, 0)
        },
        
        raidBuffs,
        
        enemies: [{ id: 0, name: fight.name, type: 'boss' as const, totalDamage, totalHP: 10000000000 }],
        
        // Include playerDetails from WCL for accurate role detection in phase2 analysis
        playerDetails: playerDetails ? {
          tanks: (playerDetails.tanks || []).map((t: any) => ({ name: t.name, class: t.class || 'Unknown', spec: t.spec || 'Unknown' })),
          healers: (playerDetails.healers || []).map((h: any) => ({ name: h.name, class: h.class || 'Unknown', spec: h.spec || 'Unknown' })),
          dps: (playerDetails.dps || []).map((d: any) => ({ name: d.name, class: d.class || 'Unknown', spec: d.spec || 'Unknown' }))
        } : undefined
      };

      (fightData as FightData & { bossContext?: unknown }).bossContext = bossContext;
      
      // Run advanced analysis
      const bossMechanicsData = getBossByNickname(bossKey);
      const deathAnalysis = analyzeDeathDetails(fightData, bossMechanicsData);
      const defensiveAnalysis = analyzeDefensiveUsage(fightData);
      const playerScorecards = calculateAllScorecards(fightData);
      
      const responsePayload = { 
        fight: fightData, 
        deathAnalysis,
        defensiveAnalysis,
        playerScorecards,
      };

      await persistRawLogArtifact({
        artifactType: 'wcl_fight_bundle',
        source: 'wcl_api',
        cacheKey: `fight:${fightCacheKey}:bundle`,
        reportCode,
        fightId,
        bossName: fight.name,
        payload: {
          report: wclReport,
          damageDone,
          healingDone,
          damageTaken,
          deaths,
          buffs,
          casts,
          playerDetails,
          dpsGraph,
          hpsGraph,
          dpsRankings,
          hpsRankings,
        },
        metadata: {
          difficulty: fightData.difficulty,
          duration: fightData.duration,
        },
      });
      await persistRawLogArtifact({
        artifactType: 'wcl_fight_payload',
        source: 'wcl_api',
        cacheKey: `fight:${fightCacheKey}:payload`,
        reportCode,
        fightId,
        bossName: fight.name,
        payload: responsePayload,
        metadata: {
          difficulty: fightData.difficulty,
          duration: fightData.duration,
          kill: fightData.kill,
          bossHPPercent: fightData.bossHPPercent,
        },
      });
      await persistFightRecord(fightData, reportCode, 'wcl_api');

      await setCachedValue('fight', fightCacheKey, responsePayload);
      
      return NextResponse.json({ ...responsePayload, cached: false });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    console.error('WCL API Error:', error);
    
    if (error.message === 'WCL_API_NOT_CONFIGURED') {
      return NextResponse.json({ 
        error: 'Warcraft Logs API not configured. Add WCL_CLIENT_ID and WCL_CLIENT_SECRET to environment variables.',
        needsConfig: true
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch data from Warcraft Logs'
    }, { status: 500 });
  }
}

// Helper: Generate timeline from graph data
function generateTimelineFromGraph(graphData: any, playerId: number, duration: number, baseValue: number): number[] {
  // If we have graph data with series for this player, use it
  if (graphData?.series) {
    const series = graphData.series.find((s: any) => s.id === playerId);
    if (series?.data && Array.isArray(series.data)) {
      return series.data.map((v: number) => Math.floor(v || 0));
    }
  }
  
  // No graph fallback: return empty data instead of synthetic timelines.
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportCode } = body;
    
    if (!reportCode) {
      return NextResponse.json({ error: 'Missing reportCode' }, { status: 400 });
    }
    
    const code = parseReportCode(reportCode);
    if (!code) {
      return NextResponse.json({ error: 'Invalid report code or URL' }, { status: 400 });
    }
    
    return NextResponse.json({ code, valid: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
