// Warcraft Logs API Integration - Comprehensive
// https://www.warcraftlogs.com/api/docs

const WCL_API_BASE = 'https://www.warcraftlogs.com/api/v2/client';
const WCL_OAUTH_URL = 'https://www.warcraftlogs.com/oauth/token';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WCLReport {
  code: string;
  title: string;
  startTime: number;
  endTime: number;
  zone: {
    id: number;
    name: string;
  };
  fights: WCLFight[];
  masterData?: {
    actors: WCLActor[];
    abilities: WCLAbility[];
  };
  exportedCharacters?: WCLCharacter[];
}

export interface WCLFight {
  id: number;
  name: string;
  difficulty: number;
  bossPercentage: number;
  fightPercentage: number;
  kill: boolean;
  startTime: number;
  endTime: number;
  averageItemLevel: number;
  gameZone: {
    name: string;
  };
}

export interface WCLActor {
  id: number;
  name: string;
  server: string;
  type: string;
  subType: string;
  icon: string;
}

export interface WCLAbility {
  gameID: number;
  name: string;
  type: number;
  icon: string;
}

export interface WCLCharacter {
  name: string;
  server: string;
  classID: number;
  specID: number;
  ilvl: number;
}

// Damage/Healing/DTPS Table Data
export interface WCLTableData {
  total: number;
  dps: number;
  dpsMax: number;
  dpsMin: number;
  hps: number;
  dtps: number;
  entries: WCLTableEntry[];
}

export interface WCLTableEntry {
  id: number;
  name: string;
  type: string;
  icon: string;
  total: number;
  totalReduced?: number;
  activeTime: number;  // in milliseconds
  activeTimeReduced?: number;
  itemLevel?: number;
  abilities: WCLAbilityEntry[];
  gear?: any[];
  talents?: any[];
  pets?: any[];
  // Damage Taken specific fields
  dps?: number; // Actually DTPS when dataType is DamageTaken
  hitCount?: number;
  // Player specific fields
  server?: string;
  class?: string;
  spec?: string;
}

export interface WCLAbilityEntry {
  name: string;
  icon: string;
  type: number;
  total: number;
  hitCount: number;
  critCount: number;
  avgHit: number;
  maxHit: number;
  minHit: number;
}

// Event Data
export interface WCLEvent {
  timestamp: number;
  type: string;
  sourceID?: number;
  sourceIsFriendly?: boolean;
  targetID?: number;
  targetIsFriendly?: boolean;
  ability?: {
    gameID: number;
    name: string;
    type: number;
    icon: string;
  };
  amount?: number;
  overheal?: number;
  absorbed?: number;
  hitType?: number;
  mitigated?: number;
  blocked?: number;
  unmitigatedAmount?: number;
  packetID?: number;
  fight?: number;
  death?: number;
  target?: {
    id: number;
    name: string;
  };
  source?: {
    id: number;
    name: string;
  };
}

// ============================================
// GRAPHQL QUERIES
// ============================================

const QUERIES = {
  // Full report data with master data
  report: `
    query($code: String!) {
      reportData {
        report(code: $code) {
          code
          title
          startTime
          endTime
          zone {
            id
            name
          }
          fights {
            id
            name
            difficulty
            bossPercentage
            fightPercentage
            kill
            startTime
            endTime
            averageItemLevel
            gameZone {
              name
            }
          }
          masterData {
            actors(type: "player") {
              id
              name
              server
              type
              subType
              icon
            }
            abilities {
              gameID
              name
              type
              icon
            }
          }
        }
      }
    }
  `,
  
  // Damage done table for a fight
  damageDone: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          table(fightIDs: $fightIds, dataType: DamageDone)
        }
      }
    }
  `,
  
  // Healing done table
  healingDone: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          table(fightIDs: $fightIds, dataType: Healing)
        }
      }
    }
  `,
  
  // Damage taken table
  damageTaken: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          table(fightIDs: $fightIds, dataType: DamageTaken)
        }
      }
    }
  `,
  
  // Summary table (all in one)
  summary: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          table(fightIDs: $fightIds, dataType: Summary)
        }
      }
    }
  `,
  
  // Death events
  deaths: `
    query($code: String!, $fightIds: [Int]!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(
            fightIDs: $fightIds
            startTime: $startTime
            endTime: $endTime
            dataType: Deaths
            limit: 100
          ) {
            data
          }
        }
      }
    }
  `,
  
  // Buffs applied
  buffs: `
    query($code: String!, $fightIds: [Int]!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(
            fightIDs: $fightIds
            startTime: $startTime
            endTime: $endTime
            dataType: Buffs
            limit: 500
          ) {
            data
          }
        }
      }
    }
  `,

  // Casts for interrupt detection
  casts: `
    query($code: String!, $fightIds: [Int]!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(
            fightIDs: $fightIds
            startTime: $startTime
            endTime: $endTime
            dataType: Casts
            limit: 5000
          ) {
            data
          }
        }
      }
    }
  `,

  // All combat events for timeline
  combatEvents: `
    query($code: String!, $fightIds: [Int]!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          events(
            fightIDs: $fightIds
            startTime: $startTime
            endTime: $endTime
            dataType: All
            limit: 5000
          ) {
            data
            nextPageTimestamp
          }
        }
      }
    }
  `,

  // Graph data for DPS timeline
  dpsGraph: `
    query($code: String!, $fightIds: [Int]!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          graph(
            fightIDs: $fightIds
            startTime: $startTime
            endTime: $endTime
            dataType: DamageDone
          )
        }
      }
    }
  `,
  
  // Graph data for HPS timeline
  hpsGraph: `
    query($code: String!, $fightIds: [Int]!, $startTime: Float!, $endTime: Float!) {
      reportData {
        report(code: $code) {
          graph(
            fightIDs: $fightIds
            startTime: $startTime
            endTime: $endTime
            dataType: Healing
          )
        }
      }
    }
  `,
  
  // Player details with abilities
  playerDetails: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          playerDetails(fightIDs: $fightIds)
        }
      }
    }
  `,
  
  // Rankings with percentiles for each player
  rankings: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          rankings(fightIDs: $fightIds, playerMetric: dps)
        }
      }
    }
  `,

  // Rankings for healers
  healerRankings: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          rankings(fightIDs: $fightIds, playerMetric: hps)
        }
      }
    }
  `,
};

// ============================================
// CLASS/SPEC MAPPING
// ============================================

export const WCL_CLASS_MAP: Record<number, string> = {
  1: 'Warrior',
  2: 'Paladin',
  3: 'Hunter',
  4: 'Rogue',
  5: 'Priest',
  6: 'Death Knight',
  7: 'Shaman',
  8: 'Mage',
  9: 'Warlock',
  10: 'Monk',
  11: 'Druid',
  12: 'Demon Hunter',
  13: 'Evoker',
};

export const WCL_SPEC_MAP: Record<number, { spec: string; role: 'tank' | 'healer' | 'dps' }> = {
  // Warrior
  71: { spec: 'Arms', role: 'dps' },
  72: { spec: 'Fury', role: 'dps' },
  73: { spec: 'Protection', role: 'tank' },
  // Paladin
  65: { spec: 'Holy', role: 'healer' },
  66: { spec: 'Protection', role: 'tank' },
  70: { spec: 'Retribution', role: 'dps' },
  // Hunter
  253: { spec: 'Beast Mastery', role: 'dps' },
  254: { spec: 'Marksmanship', role: 'dps' },
  255: { spec: 'Survival', role: 'dps' },
  // Rogue
  259: { spec: 'Assassination', role: 'dps' },
  260: { spec: 'Outlaw', role: 'dps' },
  261: { spec: 'Subtlety', role: 'dps' },
  // Priest
  256: { spec: 'Discipline', role: 'healer' },
  257: { spec: 'Holy', role: 'healer' },
  258: { spec: 'Shadow', role: 'dps' },
  // Death Knight
  250: { spec: 'Blood', role: 'tank' },
  251: { spec: 'Frost', role: 'dps' },
  252: { spec: 'Unholy', role: 'dps' },
  // Shaman
  262: { spec: 'Elemental', role: 'dps' },
  263: { spec: 'Enhancement', role: 'dps' },
  264: { spec: 'Restoration', role: 'healer' },
  // Mage
  62: { spec: 'Arcane', role: 'dps' },
  63: { spec: 'Fire', role: 'dps' },
  64: { spec: 'Frost', role: 'dps' },
  // Warlock
  265: { spec: 'Affliction', role: 'dps' },
  266: { spec: 'Demonology', role: 'dps' },
  267: { spec: 'Destruction', role: 'dps' },
  // Monk
  268: { spec: 'Brewmaster', role: 'tank' },
  269: { spec: 'Windwalker', role: 'dps' },
  270: { spec: 'Mistweaver', role: 'healer' },
  // Druid
  102: { spec: 'Balance', role: 'dps' },
  103: { spec: 'Feral', role: 'dps' },
  104: { spec: 'Guardian', role: 'tank' },
  105: { spec: 'Restoration', role: 'healer' },
  // Demon Hunter
  577: { spec: 'Havoc', role: 'dps' },
  581: { spec: 'Vengeance', role: 'tank' },
  // Evoker
  1467: { spec: 'Devastation', role: 'dps' },
  1468: { spec: 'Preservation', role: 'healer' },
  1473: { spec: 'Augmentation', role: 'dps' },
};

export const DIFFICULTY_MAP: Record<number, string> = {
  1: 'LFR',
  2: 'Flexible',
  3: 'Normal',
  4: 'Heroic',
  5: 'Mythic',
  10: 'Challenge',
  11: 'Challenge',
};

// ============================================
// ROLE DETECTION FROM ICON
// ============================================

// Icon format: "Class-Spec" e.g., "Paladin-Holy", "Warrior-Protection"
export function getRoleFromIcon(icon: string): 'tank' | 'healer' | 'dps' {
  if (!icon) return 'dps';
  
  const iconLower = icon.toLowerCase();
  
  // Tank specs
  const tankSpecs = ['protection', 'blood', 'brewmaster', 'guardian', 'vengeance'];
  if (tankSpecs.some(spec => iconLower.includes(spec))) return 'tank';
  
  // Healer specs
  const healerSpecs = ['holy', 'restoration', 'mistweaver', 'discipline', 'preservation'];
  if (healerSpecs.some(spec => iconLower.includes(spec))) return 'healer';
  
  return 'dps';
}

// Get class name from icon (format: "ClassName-SpecName")
export function getClassFromIcon(icon: string): string {
  if (!icon) return 'Unknown';
  const parts = icon.split('-');
  return parts[0] || 'Unknown';
}

// Get spec name from icon
export function getSpecFromIcon(icon: string): string {
  if (!icon) return 'Unknown';
  const parts = icon.split('-');
  return parts[1] || 'Unknown';
}

// ============================================
// API FUNCTIONS
// ============================================

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getWCLAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Check cache
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }
  
  const response = await fetch(WCL_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get WCL access token: ${error}`);
  }
  
  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
  
  return data.access_token;
}

async function wclQuery<T>(accessToken: string, query: string, variables: Record<string, any>): Promise<T> {
  const response = await fetch(WCL_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WCL API error: ${error}`);
  }
  
  const result = await response.json();
  
  if (result.errors) {
    console.error('WCL GraphQL errors:', result.errors);
    throw new Error(`WCL GraphQL error: ${result.errors[0]?.message}`);
  }
  
  return result.data;
}

export async function fetchWCLReport(code: string, accessToken: string): Promise<WCLReport> {
  const data = await wclQuery<{ reportData: { report: WCLReport } }>(
    accessToken,
    QUERIES.report,
    { code }
  );
  
  return data.reportData.report;
}

export async function fetchWCLDamageDone(
  code: string,
  fightIds: number[],
  accessToken: string
): Promise<WCLTableData> {
  const data = await wclQuery<{ reportData: { report: { table: WCLTableData } } }>(
    accessToken,
    QUERIES.damageDone,
    { code, fightIds }
  );
  
  return data.reportData.report.table;
}

export async function fetchWCLHealingDone(
  code: string,
  fightIds: number[],
  accessToken: string
): Promise<WCLTableData> {
  const data = await wclQuery<{ reportData: { report: { table: WCLTableData } } }>(
    accessToken,
    QUERIES.healingDone,
    { code, fightIds }
  );
  
  return data.reportData.report.table;
}

export async function fetchWCLDamageTaken(
  code: string,
  fightIds: number[],
  accessToken: string
): Promise<WCLTableData> {
  const data = await wclQuery<{ reportData: { report: { table: WCLTableData } } }>(
    accessToken,
    QUERIES.damageTaken,
    { code, fightIds }
  );
  
  return data.reportData.report.table;
}

export async function fetchWCLDeaths(
  code: string,
  fightIds: number[],
  startTime: number,
  endTime: number,
  accessToken: string
): Promise<WCLEvent[]> {
  try {
    const data = await wclQuery<{ reportData: { report: { events: { data: WCLEvent[] } } } }>(
      accessToken,
      QUERIES.deaths,
      { code, fightIds, startTime, endTime }
    );
    
    return data.reportData.report.events.data || [];
  } catch (error) {
    console.error('Failed to fetch deaths:', error);
    return [];
  }
}

export async function fetchWCLBuffs(
  code: string,
  fightIds: number[],
  startTime: number,
  endTime: number,
  accessToken: string
): Promise<WCLEvent[]> {
  try {
    const data = await wclQuery<{ reportData: { report: { events: { data: WCLEvent[] } } } }>(
      accessToken,
      QUERIES.buffs,
      { code, fightIds, startTime, endTime }
    );
    
    return data.reportData.report.events.data || [];
  } catch (error) {
    console.error('Failed to fetch buffs:', error);
    return [];
  }
}

export async function fetchWCLCasts(
  code: string,
  fightIds: number[],
  startTime: number,
  endTime: number,
  accessToken: string
): Promise<WCLEvent[]> {
  try {
    const data = await wclQuery<{ reportData: { report: { events: { data: WCLEvent[] } } } }>(
      accessToken,
      QUERIES.casts,
      { code, fightIds, startTime, endTime }
    );
    
    return data.reportData.report.events.data || [];
  } catch (error) {
    console.error('Failed to fetch casts:', error);
    return [];
  }
}

export async function fetchWCLSummary(
  code: string,
  fightIds: number[],
  accessToken: string
): Promise<any> {
  const data = await wclQuery<{ reportData: { report: { table: { data: any } } } }>(
    accessToken,
    QUERIES.summary,
    { code, fightIds }
  );
  
  return data.reportData.report.table.data;
}

export async function fetchWCLPlayerDetails(
  code: string,
  fightIds: number[],
  accessToken: string
): Promise<any> {
  try {
    const data = await wclQuery<{ reportData: { report: { playerDetails: any } } }>(
      accessToken,
      QUERIES.playerDetails,
      { code, fightIds }
    );
    
    // playerDetails returns { data: { tanks: [...], healers: [...], dps: [...] } }
    return data.reportData.report.playerDetails?.data || null;
  } catch (error) {
    console.error('Failed to fetch player details:', error);
    return null;
  }
}

export async function fetchWCLDpsGraph(
  code: string,
  fightIds: number[],
  startTime: number,
  endTime: number,
  accessToken: string
): Promise<any> {
  try {
    const data = await wclQuery<{ reportData: { report: { graph: any } } }>(
      accessToken,
      QUERIES.dpsGraph,
      { code, fightIds, startTime, endTime }
    );
    
    return data.reportData.report.graph;
  } catch (error) {
    console.error('Failed to fetch DPS graph:', error);
    return null;
  }
}

export async function fetchWCLHpsGraph(
  code: string,
  fightIds: number[],
  startTime: number,
  endTime: number,
  accessToken: string
): Promise<any> {
  try {
    const data = await wclQuery<{ reportData: { report: { graph: any } } }>(
      accessToken,
      QUERIES.hpsGraph,
      { code, fightIds, startTime, endTime }
    );
    
    return data.reportData.report.graph;
  } catch (error) {
    console.error('Failed to fetch HPS graph:', error);
    return null;
  }
}

export async function fetchWCLCombatEvents(
  code: string,
  fightIds: number[],
  startTime: number,
  endTime: number,
  accessToken: string
): Promise<{ events: WCLEvent[]; nextPageTimestamp: number | null }> {
  try {
    const data = await wclQuery<{ reportData: { report: { events: { data: WCLEvent[]; nextPageTimestamp: number | null } } } }>(
      accessToken,
      QUERIES.combatEvents,
      { code, fightIds, startTime, endTime }
    );
    
    return {
      events: data.reportData.report.events.data,
      nextPageTimestamp: data.reportData.report.events.nextPageTimestamp
    };
  } catch (error) {
    console.error('Failed to fetch combat events:', error);
    return { events: [], nextPageTimestamp: null };
  }
}

// Ranking data from WCL (includes percentiles!)
export interface WCLRankingCharacter {
  id: number;
  name: string;
  server: { id: number; name: string; region: string };
  class: string;
  spec: string;
  amount: number;
  rank: number | string;
  rankPercent: number;
  bracketPercent: number;
  totalParses: number;
}

export interface WCLRankingsData {
  fightID: number;
  encounter: { id: number; name: string };
  difficulty: number;
  size: number;
  kill: number;
  duration: number;
  roles: {
    tanks: { characters: WCLRankingCharacter[] };
    healers: { characters: WCLRankingCharacter[] };
    dps: { characters: WCLRankingCharacter[] };
  };
}

export async function fetchWCLDpsRankings(
  code: string,
  fightIds: number[],
  accessToken: string
): Promise<WCLRankingsData[]> {
  try {
    const data = await wclQuery<{ reportData: { report: { rankings: { data: WCLRankingsData[] } } } }>(
      accessToken,
      QUERIES.rankings,
      { code, fightIds }
    );
    
    return data.reportData.report.rankings?.data || [];
  } catch (error) {
    console.error('Failed to fetch DPS rankings:', error);
    return [];
  }
}

export async function fetchWCLHpsRankings(
  code: string,
  fightIds: number[],
  accessToken: string
): Promise<WCLRankingsData[]> {
  try {
    const data = await wclQuery<{ reportData: { report: { rankings: { data: WCLRankingsData[] } } } }>(
      accessToken,
      QUERIES.healerRankings,
      { code, fightIds }
    );
    
    return data.reportData.report.rankings?.data || [];
  } catch (error) {
    console.error('Failed to fetch HPS rankings:', error);
    return [];
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function parseReportCode(input: string): string | null {
  // Handle full URL
  const urlMatch = input.match(/warcraftlogs\.[a-z]+\/reports\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  
  // Handle just code
  if (/^[a-zA-Z0-9]{12,20}$/.test(input)) return input;
  
  return null;
}

export function isWCLConfigured(): boolean {
  return !!(process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET);
}

export function getDifficultyName(difficultyId: number): string {
  return DIFFICULTY_MAP[difficultyId] || 'Unknown';
}

export function getClassFromId(classId: number): string {
  return WCL_CLASS_MAP[classId] || 'Unknown';
}

export function getSpecFromId(specId: number): { spec: string; role: 'tank' | 'healer' | 'dps' } | undefined {
  return WCL_SPEC_MAP[specId];
}
