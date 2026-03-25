'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function PlayerSyncControls({ region, realm, name }: { region: string; realm: string; name: string }) {
  const [status, setStatus] = useState<string>('idle');
  const [snapshots, setSnapshots] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const runSync = async () => {
    setLoading(true);
    setStatus('running');
    try {
      await fetch(`/api/player/${region}/${realm}/${name}/sync`, { method: 'POST' });
      const res = await fetch(`/api/player/${region}/${realm}/${name}/sync-status`);
      const data = await res.json();
      setStatus(data.status || 'completed');
      setSnapshots(data.snapshots || 0);
    } catch {
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={runSync} disabled={loading} size="sm" variant="outline">
        {loading ? 'Sync...' : 'Sync Public Data'}
      </Button>
      <span className="text-xs text-tron-silver-400">Status: {status} • Snapshots: {snapshots}</span>
    </div>
  );
}
