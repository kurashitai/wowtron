// WoW Class and Spec Data
export const WOW_CLASSES = [
  { id: 'warrior', name: 'Warrior', color: '#C79C6E', specs: ['Arms', 'Fury', 'Protection'] },
  { id: 'paladin', name: 'Paladin', color: '#F58CBA', specs: ['Holy', 'Protection', 'Retribution'] },
  { id: 'hunter', name: 'Hunter', color: '#ABD473', specs: ['Beast Mastery', 'Marksmanship', 'Survival'] },
  { id: 'rogue', name: 'Rogue', color: '#FFF569', specs: ['Assassination', 'Outlaw', 'Subtlety'] },
  { id: 'priest', name: 'Priest', color: '#FFFFFF', specs: ['Discipline', 'Holy', 'Shadow'] },
  { id: 'shaman', name: 'Shaman', color: '#0070DE', specs: ['Elemental', 'Enhancement', 'Restoration'] },
  { id: 'mage', name: 'Mage', color: '#69CCF0', specs: ['Arcane', 'Fire', 'Frost'] },
  { id: 'warlock', name: 'Warlock', color: '#9482C9', specs: ['Affliction', 'Demonology', 'Destruction'] },
  { id: 'monk', name: 'Monk', color: '#00FF96', specs: ['Brewmaster', 'Mistweaver', 'Windwalker'] },
  { id: 'druid', name: 'Druid', color: '#FF7D0A', specs: ['Balance', 'Feral', 'Guardian', 'Restoration'] },
  { id: 'demon-hunter', name: 'Demon Hunter', color: '#A330C9', specs: ['Havoc', 'Vengeance'] },
  { id: 'death-knight', name: 'Death Knight', color: '#C41F3B', specs: ['Blood', 'Frost', 'Unholy'] },
  { id: 'evoker', name: 'Evoker', color: '#33937F', specs: ['Devastation', 'Preservation', 'Augmentation'] },
] as const;

export const ROLES = [
  { id: 'tank', name: 'Tank', color: '#3B82F6', icon: 'shield' },
  { id: 'healer', name: 'Healer', color: '#10B981', icon: 'heart' },
  { id: 'dps', name: 'DPS', color: '#EF4444', icon: 'sword' },
] as const;

export const GUILD_RANKS = [
  { id: 'leader', name: 'Guild Leader', color: '#FFD700' },
  { id: 'officer', name: 'Officer', color: '#8B5CF6' },
  { id: 'raider', name: 'Raider', color: '#1E90FF' },
  { id: 'trial', name: 'Trial', color: '#94A3B8' },
  { id: 'member', name: 'Member', color: '#64748B' },
] as const;

export const RAID_DIFFICULTIES = [
  { id: 'lfr', name: 'LFR', color: '#10B981' },
  { id: 'normal', name: 'Normal', color: '#3B82F6' },
  { id: 'heroic', name: 'Heroic', color: '#8B5CF6' },
  { id: 'mythic', name: 'Mythic', color: '#FFD700' },
] as const;

export const DUNGEONS = [
  { id: 'ara-kara', name: "Ara-Kara, City of Echoes", abbreviation: 'AK' },
  { id: 'city-of-threads', name: 'City of Threads', abbreviation: 'CoT' },
  { id: 'darkflame-crevasse', name: 'Darkflame Crevasse', abbreviation: 'DFC' },
  { id: 'dawnbreaker', name: 'The Dawnbreaker', abbreviation: 'DB' },
  { id: 'priory', name: 'Priory of the Sacred Flame', abbreviation: 'Priory' },
  { id: 'spires', name: 'The Stonevault', abbreviation: 'SV' },
  { id: ' Cinderbrew', name: 'Cinderbrew Meadery', abbreviation: 'CM' },
  { id: 'gallagio', name: 'Gallagio', abbreviation: 'Gal' },
] as const;

export const AFFIXES = [
  { id: 'fortified', name: 'Fortified', description: 'Non-boss enemies have 20% more health and deal 30% more damage.', icon: 'shield' },
  { id: 'tyrannical', name: 'Tyrannical', description: 'Bosses have 20% more health and deal 30% more damage.', icon: 'crown' },
  { id: 'volcanic', name: 'Volcanic', description: 'Enemies cause eruptions of flame near distant players.', icon: 'flame' },
  { id: 'raging', name: 'Raging', description: 'Non-boss enemies enrage at 30% health, dealing 100% more damage.', icon: 'rage' },
  { id: 'bolstering', name: 'Bolstering', description: 'Non-boss enemies bolster nearby allies on death.', icon: 'buff' },
  { id: 'sanguine', name: 'Sanguine', description: 'Enemies leave pools of blood on death.', icon: 'blood' },
  { id: 'bursting', name: 'Bursting', description: 'Non-boss enemies explode on death.', icon: 'explosion' },
  { id: 'spiteful', name: 'Spiteful', description: 'Spiteful shades attack players.', icon: 'ghost' },
  { id: 'storming', name: 'Storming', description: 'Storms appear around enemies.', icon: 'storm' },
  { id: 'entangling', name: 'Entangling', description: 'Entangling vines appear.', icon: 'vine' },
  { id: 'afflicted', name: 'Afflicted', description: 'Afflicted souls appear.', icon: 'soul' },
  { id: 'incorporeal', name: 'Incorporeal', description: 'Incorporeal beings appear.', icon: 'spirit' },
] as const;

export const ZONES = [
  { id: 'nerub-ar-palace', name: 'Nerub-ar Palace', bosses: 9 },
  { id: 'liberation-of-undermine', name: 'Liberation of Undermine', bosses: 8 },
] as const;

export function getClassColor(className: string): string {
  const wowClass = WOW_CLASSES.find(c => c.name.toLowerCase() === className.toLowerCase());
  return wowClass?.color || '#94A3B8';
}

export function getRoleColor(role: string): string {
  const wowRole = ROLES.find(r => r.id === role.toLowerCase());
  return wowRole?.color || '#94A3B8';
}

export function getRankColor(rank: string): string {
  const guildRank = GUILD_RANKS.find(r => r.id === rank.toLowerCase());
  return guildRank?.color || '#64748B';
}
