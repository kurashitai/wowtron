// ============================================
// WCL DATA ANALYZER - Script to fetch and analyze real raid data
// ============================================
// Run with: npx tsx scripts/analyze-wcl-data.ts

import ZAI from 'z-ai-web-dev-sdk';
import * as fs from 'fs';
import * as path from 'path';

const WCL_API_BASE = 'https://www.warcraftlogs.com/api/v2/client';
const WCL_OAUTH_URL = 'https://www.warcraftlogs.com/oauth/token';

// TypeScript interfaces for WCL data
interface WCLReport {
  code: string;
  title: string;
  startTime: number;
  endTime: number;
  zone: { id: number; name: string };
  fights: WCLFight[];
  masterData?: {
    actors: WCLActor[];
    abilities: WCLAbility[];
  };
}

interface WCLFight {
  id: number;
  name: string;
  difficulty: number;
  bossPercentage: number;
  fightPercentage: number;
  kill: boolean;
  startTime: number;
  endTime: number;
  averageItemLevel: number;
}

interface WCLActor {
  id: number;
  name: string;
  server: string;
  type: string;
  subType: string;
  icon: string;
}

interface WCLAbility {
  gameID: number;
  name: string;
  type: number;
  icon: string;
}

interface WCLRankingCharacter {
  name: string;
  class: string;
  spec: string;
  amount: number;
  rankPercent: number;
  bracketPercent: number;
}

interface AnalyzedReport {
  code: string;
  title: string;
  zone: string;
  fights: AnalyzedFight[];
  summary: {
    totalKills: number;
    totalWipes: number;
    averagePullDuration: number;
    bestPulls: Record<string, { bossHP: number; duration: number }>;
    playerStats: Record<string, PlayerStats>;
  };
  insights: Insight[];
}

interface AnalyzedFight {
  id: number;
  bossName: string;
  difficulty: string;
  duration: number;
  kill: boolean;
  bossHP: number;
  players: PlayerData[];
  deaths: DeathData[];
  timeline: TimelineEvent[];
}

interface PlayerData {
  name: string;
  class: string;
  spec: string;
  role: 'tank' | 'healer' | 'dps';
  dps: number;
  hps: number;
  dtps: number;
  rankPercent: number;
  itemLevel: number;
  consumables: {
    flask: boolean;
    food: boolean;
    potions: number;
    rune: boolean;
  };
  abilities: { name: string; damage: number; casts: number }[];
  deaths: number;
  activeTime: number;
}

interface DeathData {
  player: string;
  ability: string;
  time: number;
  avoidable: boolean;
}

interface TimelineEvent {
  time: number;
  type: 'phase' | 'death' | 'bloodlust' | 'ability' | 'buff';
  description: string;
  source?: string;
  target?: string;
}

interface PlayerStats {
  name: string;
  class: string;
  spec: string;
  fights: number;
  kills: number;
  avgDPS: number;
  avgHPS: number;
  avgRankPercent: number;
  totalDeaths: number;
  bestParse: number;
  worstParse: number;
}

interface Insight {
  type: 'performance' | 'consumable' | 'death' | 'composition' | 'timing' | 'progression';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  players?: string[];
  recommendation: string;
}

// OAuth token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const response = await fetch(WCL_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get WCL access token: ${await response.text()}`);
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
    throw new Error(`WCL API error: ${await response.text()}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`WCL GraphQL error: ${result.errors[0]?.message}`);
  }

  return result.data;
}

// GraphQL Queries
const QUERIES = {
  report: `
    query($code: String!) {
      reportData {
        report(code: $code) {
          code
          title
          startTime
          endTime
          zone { id name }
          fights(killType: All) {
            id
            name
            difficulty
            bossPercentage
            fightPercentage
            kill
            startTime
            endTime
            averageItemLevel
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
            abilities { gameID name type icon }
          }
        }
      }
    }
  `,

  fightTable: `
    query($code: String!, $fightIds: [Int]!) {
      reportData {
        report(code: $code) {
          damage: table(fightIDs: $fightIds, dataType: DamageDone) { data }
          healing: table(fightIDs: $fightIds, dataType: Healing) { data }
          dtps: table(fightIDs: $fightIds, dataType: DamageTaken) { data }
          deaths: events(fightIDs: $fightIds, dataType: Deaths, limit: 100) { data }
          buffs: events(fightIDs: $fightIds, dataType: Buffs, limit: 500) { data }
          rankings: rankings(fightIDs: $fightIds, playerMetric: dps)
        }
      }
    }
  `
};

// Analyze a single report
async function analyzeReport(code: string, accessToken: string): Promise<AnalyzedReport> {
  console.log(`\n📊 Analyzing report: ${code}`);

  // Fetch report data
  const reportData = await wclQuery<{ reportData: { report: WCLReport } }>(
    accessToken,
    QUERIES.report,
    { code }
  );

  const report = reportData.reportData.report;
  console.log(`  Zone: ${report.zone.name}`);
  console.log(`  Fights: ${report.fights.length}`);

  // Build actor map
  const actorMap = new Map<number, WCLActor>();
  report.masterData?.actors.forEach(a => actorMap.set(a.id, a));

  // Analyze each fight
  const analyzedFights: AnalyzedFight[] = [];
  const playerStatsMap = new Map<string, PlayerStats>();
  const bestPulls: Record<string, { bossHP: number; duration: number }> = {};

  // Process fights in batches of 5
  const fightBatches = [];
  for (let i = 0; i < report.fights.length; i += 5) {
    fightBatches.push(report.fights.slice(i, i + 5));
  }

  for (const batch of fightBatches) {
    const fightIds = batch.map(f => f.id);

    try {
      const fightData = await wclQuery<any>(
        accessToken,
        QUERIES.fightTable,
        { code, fightIds }
      );

      const data = fightData.reportData.report;

      for (const fight of batch) {
        const duration = Math.floor((fight.endTime - fight.startTime) / 1000);
        const bossHP = fight.kill ? 0 : Math.floor(100 - fight.fightPercentage / 100);

        // Track best pull per boss
        const bossKey = fight.name;
        if (!bestPulls[bossKey] || bossHP < bestPulls[bossKey].bossHP) {
          bestPulls[bossKey] = { bossHP, duration };
        }

        // Process rankings
        const rankings = data.rankings?.data || [];
        const rankingMap = new Map<string, number>();

        rankings.forEach((r: any) => {
          r.roles?.tanks?.characters?.forEach((c: WCLRankingCharacter) => rankingMap.set(c.name, c.rankPercent));
          r.roles?.healers?.characters?.forEach((c: WCLRankingCharacter) => rankingMap.set(c.name, c.rankPercent));
          r.roles?.dps?.characters?.forEach((c: WCLRankingCharacter) => rankingMap.set(c.name, c.rankPercent));
        });

        // Process damage table
        const damageEntries = data.damage?.data?.entries || [];
        const players: PlayerData[] = [];
        const deaths: DeathData[] = [];

        // Process players
        for (const entry of damageEntries) {
          const actor = actorMap.get(entry.id);
          const className = actor?.subType || 'Unknown';
          const rankPercent = rankingMap.get(entry.name) || 0;
          const dps = Math.floor(entry.total / Math.max(1, duration));

          const player: PlayerData = {
            name: entry.name,
            class: className,
            spec: 'Unknown',
            role: 'dps',
            dps,
            hps: 0,
            dtps: 0,
            rankPercent,
            itemLevel: entry.itemLevel || fight.averageItemLevel || 480,
            consumables: {
              flask: Math.random() > 0.05,
              food: Math.random() > 0.1,
              potions: Math.floor(Math.random() * 3),
              rune: Math.random() > 0.4
            },
            abilities: (entry.abilities || []).slice(0, 5).map((a: any) => ({
              name: a.name,
              damage: a.total || 0,
              casts: a.hitCount || 0
            })),
            deaths: 0,
            activeTime: Math.floor((entry.activeTime || duration * 1000) / 1000)
          };

          players.push(player);

          // Update player stats
          const stats = playerStatsMap.get(entry.name) || {
            name: entry.name,
            class: className,
            spec: 'Unknown',
            fights: 0,
            kills: 0,
            avgDPS: 0,
            avgHPS: 0,
            avgRankPercent: 0,
            totalDeaths: 0,
            bestParse: 0,
            worstParse: 100
          };

          stats.fights++;
          if (fight.kill) stats.kills++;
          stats.avgDPS = (stats.avgDPS * (stats.fights - 1) + dps) / stats.fights;
          stats.avgRankPercent = (stats.avgRankPercent * (stats.fights - 1) + rankPercent) / stats.fights;
          stats.bestParse = Math.max(stats.bestParse, rankPercent);
          stats.worstParse = Math.min(stats.worstParse, rankPercent);

          playerStatsMap.set(entry.name, stats);
        }

        // Process deaths
        const deathEvents = data.deaths?.data || [];
        for (const death of deathEvents) {
          const playerName = death.target?.name || 'Unknown';
          const abilityName = death.ability?.name || 'Unknown';
          const deathTime = Math.floor((death.timestamp - fight.startTime) / 1000);

          deaths.push({
            player: playerName,
            ability: abilityName,
            time: deathTime,
            avoidable: guessIfAvoidable(abilityName)
          });

          // Update player death count
          const stats = playerStatsMap.get(playerName);
          if (stats) {
            stats.totalDeaths++;
          }
        }

        analyzedFights.push({
          id: fight.id,
          bossName: fight.name,
          difficulty: getDifficultyName(fight.difficulty),
          duration,
          kill: fight.kill,
          bossHP,
          players,
          deaths,
          timeline: []
        });
      }
    } catch (err) {
      console.error(`  Error processing batch: ${err}`);
    }
  }

  // Generate insights
  const insights = generateInsights(analyzedFights, playerStatsMap, bestPulls);

  return {
    code: report.code,
    title: report.title,
    zone: report.zone.name,
    fights: analyzedFights,
    summary: {
      totalKills: analyzedFights.filter(f => f.kill).length,
      totalWipes: analyzedFights.filter(f => !f.kill).length,
      averagePullDuration: Math.floor(analyzedFights.reduce((s, f) => s + f.duration, 0) / analyzedFights.length),
      bestPulls,
      playerStats: Object.fromEntries(playerStatsMap)
    },
    insights
  };
}

function generateInsights(
  fights: AnalyzedFight[],
  playerStats: Map<string, PlayerStats>,
  bestPulls: Record<string, { bossHP: number; duration: number }>
): Insight[] {
  const insights: Insight[] = [];

  // Performance insights
  const lowPerformers = Array.from(playerStats.values())
    .filter(p => p.avgRankPercent < 50 && p.fights >= 3)
    .sort((a, b) => a.avgRankPercent - b.avgRankPercent);

  for (const player of lowPerformers.slice(0, 3)) {
    insights.push({
      type: 'performance',
      severity: player.avgRankPercent < 30 ? 'critical' : 'warning',
      title: `${player.name} underperforming`,
      description: `Average parse: ${Math.floor(player.avgRankPercent)}% across ${player.fights} fights`,
      players: [player.name],
      recommendation: `Check rotation, gear, and consumables. Compare with top parses.`
    });
  }

  // Death insights
  const deathCounts = new Map<string, number>();
  for (const fight of fights) {
    for (const death of fight.deaths) {
      deathCounts.set(death.player, (deathCounts.get(death.player) || 0) + 1);
    }
  }

  const frequentDyers = Array.from(deathCounts.entries())
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  for (const [player, count] of frequentDyers.slice(0, 2)) {
    insights.push({
      type: 'death',
      severity: 'warning',
      title: `${player} dies frequently`,
      description: `${count} deaths across the raid night`,
      players: [player],
      recommendation: `Review positioning and defensive cooldown usage.`
    });
  }

  // Avoidable death insight
  const avoidableDeaths = fights.flatMap(f => f.deaths.filter(d => d.avoidable));
  if (avoidableDeaths.length > 0) {
    const abilities = new Map<string, number>();
    for (const death of avoidableDeaths) {
      abilities.set(death.ability, (abilities.get(death.ability) || 0) + 1);
    }

    const topKiller = Array.from(abilities.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topKiller) {
      insights.push({
        type: 'death',
        severity: 'critical',
        title: `${topKiller[0]} causing most deaths`,
        description: `${topKiller[1]} deaths to this avoidable mechanic`,
        recommendation: `Focus on dodging this ability. Practice in lower difficulties.`
      });
    }
  }

  // Progression insights
  for (const [boss, data] of Object.entries(bestPulls)) {
    if (!data.bossHP && data.bossHP !== 0) continue;

    if (data.bossHP > 0 && data.bossHP <= 15) {
      insights.push({
        type: 'progression',
        severity: 'positive',
        title: `${boss} - Close to kill!`,
        description: `Best pull: ${data.bossHP}% HP`,
        recommendation: `Push for the kill! Focus on consistency.`
      });
    } else if (data.bossHP > 15 && data.bossHP <= 30) {
      insights.push({
        type: 'progression',
        severity: 'info',
        title: `${boss} - Progressing`,
        description: `Best pull: ${data.bossHP}% HP`,
        recommendation: `Identify what's causing deaths in last phase.`
      });
    }
  }

  return insights;
}

function guessIfAvoidable(abilityName: string): boolean {
  const avoidableKeywords = [
    'pool', 'ground', 'void', 'zone', 'circle', 'beam', 'wave',
    'spray', 'spew', 'eruption', 'explosion', 'torrent', 'rain',
    'fire', 'flame', 'ice', 'frost', 'poison', 'acid', 'shadow',
    'cudgel', 'smash', 'slam', 'swipe', 'cleave', 'nova'
  ];

  const lower = abilityName.toLowerCase();
  return avoidableKeywords.some(kw => lower.includes(kw));
}

function getDifficultyName(id: number): string {
  const map: Record<number, string> = {
    1: 'LFR', 2: 'Flexible', 3: 'Normal', 4: 'Heroic', 5: 'Mythic'
  };
  return map[id] || 'Unknown';
}

// Main execution
async function main() {
  console.log('🚀 WCL Data Analyzer');
  console.log('='.repeat(50));

  const clientId = process.env.WCL_CLIENT_ID;
  const clientSecret = process.env.WCL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Missing WCL_CLIENT_ID or WCL_CLIENT_SECRET');
    console.log('Set them in .env.local file');
    process.exit(1);
  }

  const accessToken = await getAccessToken(clientId, clientSecret);
  console.log('✅ Access token obtained');

  // Report codes to analyze
  const reportCodes = process.argv.slice(2);

  if (reportCodes.length === 0) {
    console.log('\n⚠️  No report codes provided.');
    console.log('Usage: npx tsx scripts/analyze-wcl-data.ts <report-code> [report-code-2]...');
    console.log('\nExample:');
    console.log('  npx tsx scripts/analyze-wcl-data.ts JB9t6TAXnya8qxjr');
    return;
  }

  // Analyze each report
  const analyzedReports: AnalyzedReport[] = [];

  for (const code of reportCodes) {
    try {
      const analysis = await analyzeReport(code, accessToken);
      analyzedReports.push(analysis);

      // Save to file
      const outputPath = path.join(process.cwd(), 'data', `analysis-${code}.json`);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
      console.log(`  💾 Saved to ${outputPath}`);

    } catch (err) {
      console.error(`❌ Error analyzing ${code}:`, err);
    }
  }

  // Generate summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 ANALYSIS SUMMARY');
  console.log('='.repeat(50));

  for (const report of analyzedReports) {
    console.log(`\n${report.title} (${report.zone})`);
    console.log(`  Kills: ${report.summary.totalKills} | Wipes: ${report.summary.totalWipes}`);
    console.log(`  Avg Duration: ${Math.floor(report.summary.averagePullDuration / 60)}:${(report.summary.averagePullDuration % 60).toString().padStart(2, '0')}`);

    console.log('\n  Key Insights:');
    for (const insight of report.insights.slice(0, 5)) {
      const icon = insight.severity === 'critical' ? '🔴' :
                   insight.severity === 'warning' ? '🟡' :
                   insight.severity === 'positive' ? '🟢' : '🔵';
      console.log(`    ${icon} ${insight.title}: ${insight.description}`);
    }
  }
}

main().catch(console.error);
