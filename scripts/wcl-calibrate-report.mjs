const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const reportCode = args.code;
const fightId = Number(args.fightId);
const baseUrl = args.baseUrl || 'http://localhost:3000';

if (!reportCode || !fightId) {
  console.error('Usage: node scripts/wcl-calibrate-report.mjs --code=REPORTCODE --fightId=123 [--baseUrl=http://localhost:3000]');
  process.exit(1);
}

const url = new URL('/api/wcl', baseUrl);
url.searchParams.set('action', 'fight');
url.searchParams.set('code', reportCode);
url.searchParams.set('fightId', String(fightId));
url.searchParams.set('refresh', 'true');

const response = await fetch(url);
if (!response.ok) {
  console.error(`Request failed: ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
const fight = data.fight;

if (!fight) {
  console.error('No fight payload returned');
  process.exit(1);
}

const summary = {
  fightId: fight.id,
  bossName: fight.bossName,
  difficulty: fight.difficulty,
  kill: fight.kill,
  duration: fight.duration,
  bossHPPercent: fight.bossHPPercent,
  players: Array.isArray(fight.players) ? fight.players.length : 0,
  deaths: Array.isArray(fight.deaths) ? fight.deaths.length : 0,
  timelineEvents: Array.isArray(fight.timeline) ? fight.timeline.length : 0,
  bossContextSource: fight.bossContext?.source || null,
};

console.log(JSON.stringify(summary, null, 2));
