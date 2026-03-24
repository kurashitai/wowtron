// Mock Data for WoWtron Demo
import { WOW_CLASSES, GUILD_RANKS, ROLES, DUNGEONS, AFFIXES } from './wow-data';

// Generate random character name
function randomName(): string {
  const prefixes = ['Shadow', 'Blood', 'Storm', 'Fire', 'Iron', 'Dark', 'Light', 'Frost', 'Thunder', 'Steel'];
  const suffixes = ['fang', 'bane', 'heart', 'strike', 'hammer', 'weaver', 'walker', 'bringer', 'seeker', 'hunter'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
}

// Mock Guild
export const mockGuild = {
  id: 'guild-1',
  name: 'Eternal Vanguard',
  realm: 'Area 52',
  faction: 'Horde',
  region: 'us',
  description: 'A mythic progression guild pushing content while maintaining a positive atmosphere. We value skill, dedication, and teamwork.',
  progress: '7/9 Mythic',
  memberCount: 38,
  recruiting: true,
  logo: '/wowtron-logo.png',
  discordUrl: 'https://discord.gg/eternalvanguard',
  website: 'https://eternalvanguard.gg',
};

// Mock Characters (Roster)
export const mockCharacters = Array.from({ length: 25 }, (_, i) => {
  const wowClass = WOW_CLASSES[Math.floor(Math.random() * WOW_CLASSES.length)];
  const spec = wowClass.specs[Math.floor(Math.random() * wowClass.specs.length)];
  const rank = GUILD_RANKS[Math.floor(Math.random() * GUILD_RANKS.length)];
  const role = spec.toLowerCase().includes('protection') || spec.toLowerCase().includes('blood') || spec.toLowerCase().includes('brewmaster') || spec.toLowerCase().includes('guardian') || spec.toLowerCase().includes('vengeance')
    ? 'tank'
    : spec.toLowerCase().includes('holy') || spec.toLowerCase().includes('restoration') || spec.toLowerCase().includes('mistweaver') || spec.toLowerCase().includes('preservation') || spec.toLowerCase().includes('discipline')
    ? 'healer'
    : 'dps';

  return {
    id: `char-${i}`,
    name: randomName(),
    class: wowClass.name,
    spec,
    role,
    rank: rank.id,
    itemLevel: 480 + Math.floor(Math.random() * 25),
    mPlusScore: 1800 + Math.floor(Math.random() * 1200),
    attendance: 70 + Math.floor(Math.random() * 30),
    status: Math.random() > 0.3 ? 'online' : 'offline',
    lastOnline: Math.random() > 0.5 ? 'Now' : `${Math.floor(Math.random() * 7) + 1} days ago`,
  };
});

// Mock Raids
export const mockRaids = [
  {
    id: 'raid-1',
    name: 'Nerub-ar Palace Progression',
    type: 'progression',
    difficulty: 'Mythic',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
    time: '20:00',
    duration: 180,
    maxPlayers: 30,
    signups: 28,
    confirmed: 22,
    status: 'scheduled',
  },
  {
    id: 'raid-2',
    name: 'Farm Night',
    type: 'farm',
    difficulty: 'Heroic',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // Day after tomorrow
    time: '20:00',
    duration: 150,
    maxPlayers: 30,
    signups: 24,
    confirmed: 20,
    status: 'scheduled',
  },
  {
    id: 'raid-3',
    name: 'Alt Run',
    type: 'alt',
    difficulty: 'Normal',
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days
    time: '19:00',
    duration: 120,
    maxPlayers: 30,
    signups: 18,
    confirmed: 15,
    status: 'scheduled',
  },
];

// Mock M+ Runs
export const mockMPlusRuns = [
  { dungeon: 'The Dawnbreaker', level: 24, time: '28:45', score: 285, completed: true },
  { dungeon: 'City of Threads', level: 23, time: '31:12', score: 270, completed: true },
  { dungeon: 'Darkflame Crevasse', level: 22, time: '26:58', score: 255, completed: true },
  { dungeon: 'Ara-Kara', level: 25, time: '35:20', score: 298, completed: false },
  { dungeon: 'Priory', level: 21, time: '29:15', score: 240, completed: true },
  { dungeon: 'Cinderbrew Meadery', level: 20, time: '27:30', score: 225, completed: true },
  { dungeon: 'The Stonevault', level: 23, time: '32:45', score: 265, completed: true },
  { dungeon: 'Gallagio', level: 22, time: '30:10', score: 250, completed: true },
];

// Current Week Affixes
export const currentWeekAffixes = [
  AFFIXES.find(a => a.id === 'tyrannical')!,
  AFFIXES.find(a => a.id === 'volcanic')!,
  AFFIXES.find(a => a.id === 'afflicted')!,
];

// Mock Log Analysis
export const mockLogAnalysis = {
  reportId: 'TqZH2AvyNJnPfDbk',
  fight: 'Queen Ansurek',
  duration: '8:45',
  difficulty: 'Mythic',
  metrics: {
    averageDps: 485000,
    topDps: 625000,
    averageHps: 145000,
    deaths: 3,
    avoidableDamage: 12.5,
    buffUptime: 94.2,
  },
  topPerformers: [
    { name: 'Shadowstrike', class: 'Rogue', dps: 625000, parse: 98 },
    { name: 'Fireweaver', class: 'Mage', dps: 598000, parse: 95 },
    { name: 'Steelbreaker', class: 'Warrior', dps: 572000, parse: 92 },
  ],
  issues: [
    { player: 'Darkweaver', issue: 'Low uptime on main ability', suggestion: 'Improve rotation priority' },
    { player: 'Stormheart', issue: 'High avoidable damage taken', suggestion: 'Better positioning during swirls' },
  ],
};

// Mock Recruitment Listings
export const mockRecruitmentListings = [
  {
    id: 'listing-1',
    guildName: 'Eternal Vanguard',
    realm: 'Area 52',
    faction: 'Horde',
    progress: '7/9 Mythic',
    requirements: {
      itemLevel: 485,
      mPlusScore: 2400,
      attendance: '80%',
      days: ['Tuesday', 'Thursday', 'Sunday'],
      time: '8-11 PM EST',
    },
    roles: ['Healer', 'Ranged DPS'],
    description: 'Looking for skilled players to push Mythic content.',
  },
  {
    id: 'listing-2',
    guildName: 'Infernal Legion',
    realm: 'Illidan',
    faction: 'Horde',
    progress: '9/9 Mythic',
    requirements: {
      itemLevel: 490,
      mPlusScore: 2800,
      attendance: '95%',
      days: ['Wednesday', 'Thursday', 'Monday'],
      time: '9-12 PM EST',
    },
    roles: ['Tank'],
    description: 'Hall of Fame guild seeking exceptional players.',
  },
  {
    id: 'listing-3',
    guildName: 'Dawn Brigade',
    realm: 'Sargeras',
    faction: 'Alliance',
    progress: '5/9 Mythic',
    requirements: {
      itemLevel: 480,
      mPlusScore: 2000,
      attendance: '70%',
      days: ['Friday', 'Saturday'],
      time: '7-10 PM EST',
    },
    roles: ['DPS', 'Healer', 'Tank'],
    description: 'Casual mythic guild with a family-friendly atmosphere.',
  },
];

// Mock Player Cards (for recruitment)
export const mockPlayerCards = [
  {
    id: 'player-1',
    name: 'Shadowstrike',
    class: 'Rogue',
    spec: 'Outlaw',
    itemLevel: 492,
    mPlusScore: 2850,
    parseAvg: 87,
    deathRate: 15,
    avoidableDamage: 8,
    buffUptime: 96,
    mechanicErrors: 3,
    raidsAttended: 45,
    reliability: 92,
    strengths: ['Consistent DPS', 'Low avoidable damage', 'High attendance'],
    improvements: ['Positioning on boss transitions'],
    autoMemo: 'Highly reliable Rogue with exceptional DPS consistency. Parses consistently in the 85-90% range. Minimal avoidable damage taken. Great addition for any mythic team.',
    lookingForGuild: true,
  },
  {
    id: 'player-2',
    name: 'Lightweaver',
    class: 'Priest',
    spec: 'Holy',
    itemLevel: 488,
    mPlusScore: 2400,
    parseAvg: 92,
    deathRate: 8,
    avoidableDamage: 5,
    buffUptime: 98,
    mechanicErrors: 2,
    raidsAttended: 52,
    reliability: 98,
    strengths: ['Excellent HPS', 'Great positioning', 'High buff uptime'],
    improvements: [],
    autoMemo: 'Top-tier healer with exceptional performance. Very low death rate and avoidable damage. Perfect for progression content.',
    lookingForGuild: true,
  },
  {
    id: 'player-3',
    name: 'Ironbreaker',
    class: 'Warrior',
    spec: 'Protection',
    itemLevel: 485,
    mPlusScore: 2200,
    parseAvg: 78,
    deathRate: 35,
    avoidableDamage: 22,
    buffUptime: 85,
    mechanicErrors: 12,
    raidsAttended: 20,
    reliability: 65,
    strengths: ['Good threat generation'],
    improvements: ['Cooldown usage', 'Positioning', 'Active mitigation'],
    autoMemo: 'Developing tank with potential. Needs work on active mitigation timing and cooldown usage. Higher death rate suggests positioning issues. May improve with guidance.',
    lookingForGuild: true,
  },
];

// Mock Activity Feed
export const mockActivityFeed = [
  { type: 'raid', message: 'Raid "Nerub-ar Palace" completed', time: '2 hours ago', icon: 'trophy' },
  { type: 'member', message: 'Shadowstrike joined the guild', time: '5 hours ago', icon: 'user-plus' },
  { type: 'mplus', message: 'Darkweaver completed +24 Dawnbreaker', time: '6 hours ago', icon: 'target' },
  { type: 'loot', message: 'Fireweaver received Mythic weapon', time: '1 day ago', icon: 'gift' },
  { type: 'achievement', message: 'Guild achieved Ahead of the Curve', time: '2 days ago', icon: 'award' },
  { type: 'member', message: 'Ironbreaker promoted to Raider', time: '3 days ago', icon: 'star' },
];

// Mock Stats
export const mockStats = {
  activeMembers: 34,
  maxMembers: 40,
  nextRaid: 'Tomorrow, 8 PM',
  raidProgress: '7/9 Mythic',
  mPlusAvg: 2450,
  attendanceRate: 87,
};

// Dungeons with progress
export const mockDungeonProgress = DUNGEONS.map(dungeon => ({
  ...dungeon,
  bestKey: 18 + Math.floor(Math.random() * 8),
  score: 200 + Math.floor(Math.random() * 150),
  completed: Math.random() > 0.2,
}));

// Weekly Reset Countdown
export const weeklyResetTime = new Date();
weeklyResetTime.setDate(weeklyResetTime.getDate() + ((2 + 7 - weeklyResetTime.getDay()) % 7 || 7));
weeklyResetTime.setHours(15, 0, 0, 0); // Tuesday 3 PM UTC

// Notification data
export const mockNotifications = [
  { id: 'notif-1', type: 'raid', title: 'Raid Reminder', message: 'Nerub-ar Palace starts in 2 hours', read: false, time: '2 hours ago' },
  { id: 'notif-2', type: 'signup', title: 'New Signup', message: 'Shadowstrike signed up for Farm Night', read: false, time: '3 hours ago' },
  { id: 'notif-3', type: 'log', title: 'Log Analysis Complete', message: 'Your Queen Ansurek analysis is ready', read: true, time: '1 day ago' },
  { id: 'notif-4', type: 'recruit', title: 'New Application', message: 'Lightweaver applied to your guild', read: true, time: '2 days ago' },
];
