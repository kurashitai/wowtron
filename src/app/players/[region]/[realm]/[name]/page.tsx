import { notFound } from 'next/navigation';
import { getPlayerProfile } from '@/lib/player-profile';
import { PlayerSyncControls } from '@/components/player-sync-controls';

type Props = {
  params: Promise<{
    region: string;
    realm: string;
    name: string;
  }>;
};

export default async function PlayerProfilePage({ params }: Props) {
  const { region, realm, name } = await params;
  const profile = await getPlayerProfile(region, realm, name);
  if (!profile) return notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl border border-dark-700 bg-dark-800/60 p-5">
        <h1 className="text-2xl font-bold text-wow-gold">
          {profile.identity?.name} - {profile.identity?.class} ({profile.identity?.spec})
        </h1>
        <p className="text-tron-silver-400 mt-1">
          {profile.identity?.region?.toUpperCase()} • {profile.identity?.realm} • ilvl {profile.identity?.itemLevel ?? 'N/A'}
        </p>
        <div className="mt-3">
          <PlayerSyncControls region={region} realm={realm} name={name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <h2 className="font-semibold text-tron-silver-200 mb-2">Mythic+</h2>
          <p className="text-sm text-tron-silver-400">Score: {profile.mythicPlus?.score ?? 'N/A'}</p>
          <p className="text-sm text-tron-silver-400">Risk: {profile.mythicPlus?.risk ?? 'unknown'}</p>
        </div>

        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <h2 className="font-semibold text-tron-silver-200 mb-2">Gear Summary</h2>
          <p className="text-sm text-tron-silver-400">Embellishments: {profile.gear?.summary?.embellishedCount ?? 0}</p>
          <p className="text-sm text-tron-silver-400">Gems: {profile.gear?.summary?.gemsCount ?? 0}</p>
        </div>

        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <h2 className="font-semibold text-tron-silver-200 mb-2">Afiliações</h2>
          <p className="text-sm text-tron-silver-400">Guild: {profile.identity?.guild || 'N/A'}</p>
          <p className="text-sm text-tron-silver-400">Cached: {profile.cached ? 'yes' : 'no'}</p>
          <p className="text-sm text-tron-silver-400">Snapshots: {profile.historyMeta?.snapshots ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
        <h2 className="font-semibold text-tron-silver-200 mb-3">Items atuais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(profile.gear?.items || []).map((item: any, idx: number) => (
            <div key={`${item.itemId}-${idx}`} className="p-3 rounded-lg border border-dark-600 bg-dark-700/40">
              <p className="text-sm font-semibold text-tron-silver-200">{item.slot}: {item.itemName}</p>
              <p className="text-xs text-tron-silver-400">iLvl {item.itemLevel ?? 'N/A'}</p>
              {item.gems?.length > 0 && <p className="text-xs text-sapphire-blue mt-1">Gems: {item.gems.join(', ')}</p>}
              {item.enchantments?.length > 0 && <p className="text-xs text-shadow-purple mt-1">Enchants: {item.enchantments.join(', ')}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <h2 className="font-semibold text-tron-silver-200 mb-3">M+ runs recentes</h2>
          <div className="space-y-2">
            {(profile.history?.recentRuns || []).map((run: any, idx: number) => (
              <div key={`${run.dungeon}-${idx}`} className="text-sm text-tron-silver-300">
                +{run.mythic_level} {run.dungeon} ({run.num_keystone_upgrades > 0 ? `+${run.num_keystone_upgrades}` : 'untimed'})
              </div>
            ))}
            {(profile.history?.recentRuns || []).length === 0 && <p className="text-sm text-tron-silver-500">Sem runs recentes.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <h2 className="font-semibold text-tron-silver-200 mb-3">Logs de Pulls/Raids</h2>
          <p className="text-sm text-tron-silver-500">
            Em breve: histórico de pulls por boss com confiabilidade/mecânicas por encontro.
          </p>
        </div>
      </div>
    </div>
  );
}
