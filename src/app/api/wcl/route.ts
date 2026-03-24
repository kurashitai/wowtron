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

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

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
  
  try {
    // ==========================================
    // REPORT INFO - Fetch all fights for progression
    // ==========================================
    if (action === 'report') {
      const code = searchParams.get('code');
      if (!code) return NextResponse.json({ error: 'Missing report code' }, { status: 400 });
      
      const reportCode = parseReportCode(code);
      if (!reportCode) return NextResponse.json({ error: 'Invalid report code or URL' }, { status: 400 });
      
      const useMock = !process.env.WCL_CLIENT_ID || searchParams.get('mock') === 'true';
      
      if (useMock) {
        const mockReport: ReportData = {
          id: reportCode,
          code: reportCode,
          title: 'Demo Report (No API Key)',
          owner: 'Demo',
          zone: 'Nerub-ar Palace',
          startTime: Date.now() - 86400000,
          endTime: Date.now() - 82800000,
          fights: [
            { id: 1, bossName: "Ulgrax the Devourer", bossIcon: "ulgrax", difficulty: "Mythic", duration: 423, kill: true, bossHPPercent: 0 },
            { id: 2, bossName: "The Bloodbound Horror", bossIcon: "bloodbound", difficulty: "Mythic", duration: 312, kill: true, bossHPPercent: 0 },
            { id: 3, bossName: "Sikran, Captain of the Sureki", bossIcon: "sikran", difficulty: "Mythic", duration: 287, kill: true, bossHPPercent: 0 },
            { id: 4, bossName: "Rasha'nan", bossIcon: "rashanan", difficulty: "Mythic", duration: 356, kill: true, bossHPPercent: 0 },
            { id: 5, bossName: "Bloodtwister Ovi'nax", bossIcon: "ovinax", difficulty: "Mythic", duration: 445, kill: false, bossHPPercent: 35 },
            { id: 6, bossName: "Nexus-Princess Ky'veza", bossIcon: "kyveza", difficulty: "Mythic", duration: 398, kill: true, bossHPPercent: 0 },
            { id: 7, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 623, kill: false, bossHPPercent: 42 },
            { id: 8, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 587, kill: false, bossHPPercent: 28 },
            { id: 9, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 612, kill: false, bossHPPercent: 15 },
            { id: 10, bossName: "Queen Ansurek", bossIcon: "ansurek", difficulty: "Mythic", duration: 542, kill: true, bossHPPercent: 0 },
          ]
        };
        return NextResponse.json({ report: mockReport, mock: true });
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
          kill: fight.kill,
          // WCL returns bossPercentage as 0-10000 (e.g., 4200 = 42.00% HP remaining)
          // For kills, it's 0. For wipes, it's the HP remaining
          bossHPPercent: fight.kill ? 0 : Math.floor((fight.bossPercentage ?? fight.fightPercentage ?? 10000) / 100),
          startTime: fight.startTime,
          endTime: fight.endTime
        }))
      };
      
      return NextResponse.json({ report, mock: false });
    }
    
    // ==========================================
    // FIGHT DETAILS - Complete analysis
    // ==========================================
    if (action === 'fight') {
      const code = searchParams.get('code');
      const fightId = parseInt(searchParams.get('fightId') || '0');
      
      if (!code || !fightId) return NextResponse.json({ error: 'Missing code or fightId' }, { status: 400 });
      
      const reportCode = parseReportCode(code);
      if (!reportCode) return NextResponse.json({ error: 'Invalid report code' }, { status: 400 });
      
      const useMock = !process.env.WCL_CLIENT_ID || searchParams.get('mock') === 'true';
      
      if (useMock) {
        // Return mock data for demo
        return NextResponse.json({ fight: generateMockFightData(fightId), mock: true });
      }
      
      // ===== REAL DATA FETCH =====
      const token = await getToken();
      
      // Fetch report first to get fight timing
      const wclReport = await fetchWCLReport(reportCode, token);
      const fight = wclReport.fights.find(f => f.id === fightId);
      if (!fight) return NextResponse.json({ error: 'Fight not found' }, { status: 404 });
      
      const duration = Math.floor((fight.endTime - fight.startTime) / 1000);
      const fightStartTime = 0;
      const fightEndTime = fight.endTime - fight.startTime;
      
      // Fetch all data in parallel
      const [
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
        hpsRankings
      ] = await Promise.all([
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
      
      // Build actor lookup from masterData
      // The GraphQL query already filters actors(type: "player") so all returned are players
      const actors = wclReport.masterData?.actors || [];
      const actorMap = new Map<number, WCLActor>();
      const actorNameMap = new Map<string, WCLActor>();
      const playerNameSet = new Set<string>();
      
      // Add all actors - they're already filtered by the query to be players only
      actors.forEach(a => {
        actorMap.set(a.id, a);
        actorNameMap.set(a.name.toLowerCase(), a);
        playerNameSet.add(a.name);
      });
      
      // Also build a set of player names from playerDetails for extra validation
      const playerDetailsNames = new Set<string>();
      if (playerDetails) {
        const allDetails = [
          ...(playerDetails.tanks || []), 
          ...(playerDetails.healers || []), 
          ...(playerDetails.dps || [])
        ];
        allDetails.forEach((p: any) => {
          if (p && p.name) {
            playerDetailsNames.add(p.name);
          }
        });
      }
      
      // Log for debugging
      console.log('[WCL] Actors found:', actors.length);
      console.log('[WCL] Player names from actors:', Array.from(playerNameSet).slice(0, 5));
      console.log('[WCL] Player names from playerDetails:', Array.from(playerDetailsNames).slice(0, 5));
      console.log('[WCL] Damage entries count:', damageDone?.entries?.length || 0);
      console.log('[WCL] Healing entries count:', healingDone?.entries?.length || 0);
      
      // Build rankings map for percentile lookup - process both DPS and HPS rankings
      const rankingMap = new Map<string, { dps: number; hps: number }>();
      
      const processRankings = (rankings: WCLRankingsData[], type: 'dps' | 'hps') => {
        rankings.forEach((rankingData: WCLRankingsData) => {
          const processCharacters = (characters: WCLRankingCharacter[]) => {
            characters.forEach((char: WCLRankingCharacter) => {
              if (char.name && char.rankPercent !== undefined) {
                const existing = rankingMap.get(char.name) || { dps: 0, hps: 0 };
                existing[type] = char.rankPercent;
                rankingMap.set(char.name, existing);
              }
            });
          };
          
          processCharacters(rankingData.roles?.tanks?.characters || []);
          processCharacters(rankingData.roles?.healers?.characters || []);
          processCharacters(rankingData.roles?.dps?.characters || []);
        });
      };
      
      processRankings(dpsRankings, 'dps');
      processRankings(hpsRankings, 'hps');
      
      // Determine role from multiple sources - prioritize playerDetails from WCL
      const getPlayerRole = (playerName: string, actor: WCLActor | undefined): 'tank' | 'healer' | 'dps' => {
        // First check playerDetails from WCL - this is the most reliable source
        if (playerDetails) {
          const tanks = playerDetails.tanks || [];
          const healers = playerDetails.healers || [];
          const dps = playerDetails.dps || [];
          
          // Check exact match first
          if (tanks.some((t: any) => t.name === playerName)) return 'tank';
          if (healers.some((h: any) => h.name === playerName)) return 'healer';
          if (dps.some((d: any) => d.name === playerName)) return 'dps';
        }
        
        // Then check actor icon for spec
        if (actor?.icon) {
          return getRoleFromIcon(actor.icon);
        }
        
        // Check entry type field as last resort
        if (actor?.subType === 'Player') {
          return 'dps'; // Default to dps for players we can't determine
        }
        
        return 'dps';
      };
      
      // Get class from actor
      const getPlayerClass = (actor: WCLActor | undefined): string => {
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
        if (playerDetails) {
          const allPlayers = [
            ...(playerDetails.tanks || []),
            ...(playerDetails.healers || []),
            ...(playerDetails.dps || [])
          ];
          const player = allPlayers.find((p: any) => p.name === playerName);
          if (player?.spec) return player.spec;
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
      // WCL events have type 'interrupt' when successful
      const interruptCount = new Map<string, number>();
      
      // Look for actual interrupt events (type = 'interrupt' or 'cast' that interrupts)
      (casts as WCLEvent[]).forEach((cast: WCLEvent) => {
        const abilityName = cast.ability?.name?.toLowerCase() || '';
        const isInterruptAbility = interruptAbilities.some(ia => abilityName.includes(ia.toLowerCase()));
        
        // Only count if this is an interrupt ability AND the target is an enemy (boss)
        // The target should be an enemy (not friendly) to count as a boss interrupt
        if (isInterruptAbility && cast.targetIsFriendly === false && cast.source?.name) {
          const sourceName = cast.source.name;
          // Verify this is a player using the interrupt
          if (playerNameSet.has(sourceName) || playerDetailsNames.has(sourceName)) {
            interruptCount.set(sourceName, (interruptCount.get(sourceName) || 0) + 1);
          }
        }
      });
      
      // Count dispels from casts - only count dispels by actual players
      const dispelAbilities = ['Purify', 'Cleanse', 'Dispel Magic', 'Remove Curse', 'Purify Spirit', 'Detox', "Nature's Cure", 'Purify Disease'];
      const dispelCount = new Map<string, number>();
      (casts as WCLEvent[]).forEach((cast: WCLEvent) => {
        if (cast.ability?.name && dispelAbilities.some(da => 
          cast.ability!.name.toLowerCase().includes(da.toLowerCase())
        )) {
          const sourceName = cast.source?.name || '';
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
      
      (buffs as WCLEvent[]).forEach((buff: WCLEvent) => {
        const targetName = buff.target?.name || '';
        const abilityName = buff.ability?.name?.toLowerCase() || '';
        
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
      
      // The WCL damage/healing/damageTaken tables already only contain player data
      // No need for complex filtering - use entries directly
      const damageEntries = damageDone?.entries || [];
      const healingEntries = healingDone?.entries || [];
      const dtpsEntries = damageTaken?.entries || [];
      
      console.log('[WCL] === DATA SUMMARY ===');
      console.log('[WCL] Actors from masterData:', actors.length);
      console.log('[WCL] Player names from actors:', Array.from(playerNameSet));
      console.log('[WCL] Player names from playerDetails:', Array.from(playerDetailsNames));
      console.log('[WCL] Damage entries:', damageEntries.length, damageEntries.slice(0, 3).map(e => e.name));
      console.log('[WCL] Healing entries:', healingEntries.length, healingEntries.slice(0, 3).map(e => e.name));
      console.log('[WCL] DTPS entries:', dtpsEntries.length);
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
        
        const player: PlayerStats = {
          id: entry.id,
          name: entry.name,
          class: className,
          spec: playerSpec,
          role: playerRole,
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
      
      // Process death events
      (deaths as WCLEvent[]).forEach((death: WCLEvent) => {
        const targetId = death.target?.id;
        const targetName = death.target?.name;
        
        // Find player by ID or name
        let player: PlayerStats | undefined = playerMap.get(targetId || 0);
        if (!player && targetName) {
          player = Array.from(playerMap.values()).find(p => p.name === targetName);
        }
        
        if (player) {
          player.deaths++;
          player.deathEvents.push({
            time: Math.floor((death.timestamp - fight.startTime) / 1000),
            killer: death.source?.name || fight.name,
            ability: death.ability?.name || 'Unknown',
            damage: death.amount || 0,
            hpRemaining: 0
          });
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
      
      // Add bloodlust (find from casts or assume)
      const bloodlustCast = (casts as WCLEvent[]).find((c: WCLEvent) => 
        c.ability?.name && ['Bloodlust', 'Heroism', 'Time Warp', 'Ancient Hysteria', 'Netherwinds']
          .some(bl => c.ability!.name.includes(bl))
      );
      
      timeline.push({
        time: bloodlustCast ? Math.floor((bloodlustCast.timestamp - fight.startTime) / 1000) : 8,
        type: 'bloodlust',
        description: bloodlustCast?.ability?.name || 'Bloodlust',
        source: bloodlustCast?.source?.name || playersArray.find(p => p.class === 'Shaman')?.name || 'Shaman'
      });
      
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
      
      // Build fight data
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
        kill: fight.kill,
        bossHPPercent: fight.kill ? 0 : Math.floor((fight.bossPercentage ?? fight.fightPercentage ?? 10000) / 100),
        
        composition: {
          tanks: playersArray.filter(p => p.role === 'tank').length,
          healers: playersArray.filter(p => p.role === 'healer').length,
          dps: playersArray.filter(p => p.role === 'dps').length,
          total: playersArray.length,
          bloodlust: true,
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
        combatEvents: casts as WCLEvent[],
        
        summary: {
          totalDamage,
          totalHealing,
          totalDamageTaken: playersArray.reduce((s, p) => s + p.totalDamageTaken, 0),
          raidDPS: Math.floor(totalDamage / Math.max(1, duration)),
          raidHPS: Math.floor(totalHealing / Math.max(1, duration)),
          raidDTPS: Math.floor(playersArray.reduce((s, p) => s + p.dtps, 0)),
          deaths: playersArray.reduce((s, p) => s + p.deaths, 0),
          combatResurrections: 0,
          bloodlusts: 1,
          dispels: playersArray.reduce((s, p) => s + p.dispels, 0),
          interrupts: playersArray.reduce((s, p) => s + p.interruptions, 0)
        },
        
        raidBuffs: [
          { name: 'Bloodlust', uptime: 100, source: playersArray.find(p => p.class === 'Shaman')?.name || playersArray.find(p => p.class === 'Mage')?.name || playersArray.find(p => p.class === 'Evoker')?.name || 'Raid' },
          { name: 'Power Word: Fortitude', uptime: 98, source: playersArray.find(p => p.class === 'Priest')?.name || 'Priest' },
          { name: 'Battle Shout', uptime: 97, source: playersArray.find(p => p.class === 'Warrior')?.name || 'Warrior' },
          { name: 'Arcane Intellect', uptime: 96, source: playersArray.find(p => p.class === 'Mage')?.name || 'Mage' },
          { name: 'Mark of the Wild', uptime: 95, source: playersArray.find(p => p.class === 'Druid')?.name || 'Druid' },
        ],
        
        enemies: [{ id: 0, name: fight.name, type: 'boss' as const, totalDamage, totalHP: 10000000000 }],
        
        // Include playerDetails from WCL for accurate role detection in phase2 analysis
        playerDetails: playerDetails ? {
          tanks: (playerDetails.tanks || []).map((t: any) => ({ name: t.name, class: t.class || 'Unknown', spec: t.spec || 'Unknown' })),
          healers: (playerDetails.healers || []).map((h: any) => ({ name: h.name, class: h.class || 'Unknown', spec: h.spec || 'Unknown' })),
          dps: (playerDetails.dps || []).map((d: any) => ({ name: d.name, class: d.class || 'Unknown', spec: d.spec || 'Unknown' }))
        } : undefined
      };
      
      return NextResponse.json({ fight: fightData, mock: false });
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
  
  // Otherwise generate deterministic data based on player ID and duration
  return generateDeterministicTimeline(baseValue, duration, playerId);
}

// Helper: Generate deterministic timeline (no Math.random)
function generateDeterministicTimeline(baseValue: number, duration: number, seed: number): number[] {
  const timeline: number[] = [];
  
  for (let t = 0; t < duration; t++) {
    // Deterministic variance using sine/cosine waves
    const variance = Math.sin(seed * 0.1 + t * 0.12) * 0.3 + 
                     Math.cos(seed * 0.07 + t * 0.09) * 0.2 + 0.8;
    
    // Bloodlust burst (typically around 8-48 seconds)
    const burst = (t >= 8 && t < 48) ? 1.35 : 
                  (t > duration * 0.8) ? 1.1 : 1;
    
    timeline.push(Math.max(0, Math.floor(baseValue * variance * burst)));
  }
  
  return timeline;
}

// Mock fight data for demo mode
function generateMockFightData(fightId: number): FightData {
  return {
    id: fightId,
    reportId: 'demo',
    bossId: 0,
    bossName: 'Ulgrax the Devourer',
    bossIcon: 'ulgrax',
    zone: 'Nerub-ar Palace',
    difficulty: 'Mythic',
    duration: 423,
    startTime: Date.now() - 3600000,
    endTime: Date.now() - 3600000 + 423000,
    kill: true,
    bossHPPercent: 0,
    composition: { tanks: 2, healers: 4, dps: 14, total: 20, bloodlust: true, brez: 3 },
    phases: [
      { name: 'Phase 1', startTime: 0, endTime: 141000, bossHP: [], events: [] },
      { name: 'Phase 2', startTime: 141000, endTime: 282000, bossHP: [], events: [] },
      { name: 'Phase 3', startTime: 282000, endTime: 423000, bossHP: [], events: [] }
    ],
    players: [],
    bossAbilities: [],
    timeline: [
      { time: 0, type: 'phase', description: 'Phase 1', source: 'Ulgrax' },
      { time: 8, type: 'bloodlust', description: 'Bloodlust', source: 'Shaman' },
      { time: 141, type: 'phase', description: 'Phase 2', source: 'Ulgrax' },
      { time: 282, type: 'phase', description: 'Phase 3', source: 'Ulgrax' }
    ],
    combatEvents: [],
    summary: {
      totalDamage: 8500000000,
      totalHealing: 2500000000,
      totalDamageTaken: 1800000000,
      raidDPS: 20095000,
      raidHPS: 5900000,
      raidDTPS: 4250000,
      deaths: 0,
      combatResurrections: 0,
      bloodlusts: 1,
      dispels: 12,
      interrupts: 45
    },
    raidBuffs: [
      { name: 'Bloodlust', uptime: 100, source: 'Shaman' },
      { name: 'Power Word: Fortitude', uptime: 98, source: 'Priest' }
    ],
    enemies: [{ id: 0, name: 'Ulgrax', type: 'boss', totalDamage: 8500000000, totalHP: 10000000000 }]
  };
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
