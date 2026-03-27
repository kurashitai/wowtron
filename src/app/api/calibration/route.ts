import { NextRequest, NextResponse } from 'next/server';
import { analyzeLogFight } from '@/lib/analysis/log-analysis-engine';
import { buildInsightSnapshot } from '@/lib/analysis/insight-snapshots';
import { persistAnalyzerRun, persistRawLogArtifact } from '@/lib/platform-improvement/repository';

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  if (action !== 'snapshot') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const code = request.nextUrl.searchParams.get('code');
  const fightId = request.nextUrl.searchParams.get('fightId');

  if (!code || !fightId) {
    return NextResponse.json({ error: 'Missing code or fightId' }, { status: 400 });
  }

  const baseUrl = new URL(request.url);
  const fightUrl = new URL('/api/wcl', baseUrl.origin);
  fightUrl.searchParams.set('action', 'fight');
  fightUrl.searchParams.set('code', code);
  fightUrl.searchParams.set('fightId', fightId);
  fightUrl.searchParams.set('refresh', 'true');

  const response = await fetch(fightUrl);
  if (!response.ok) {
    return NextResponse.json({ error: `Failed to fetch fight payload: ${response.status}` }, { status: response.status });
  }

  const payload = await response.json();
  if (!payload?.fight) {
    return NextResponse.json({ error: 'Fight payload missing' }, { status: 500 });
  }

  const analysis = analyzeLogFight({
    fight: payload.fight,
    historicalFights: [],
    reportFights: [],
  });
  const snapshot = buildInsightSnapshot(
    {
      ...payload.fight,
      bossHP: payload.fight.bossHPPercent,
    },
    analysis,
    code
  );
  await persistRawLogArtifact({
    artifactType: 'calibration_snapshot',
    source: 'calibration_api',
    cacheKey: `calibration:${code}:${fightId}:snapshot`,
    reportCode: code,
    fightId: Number(fightId),
    bossName: payload.fight.bossName,
    payload: snapshot,
    metadata: {
      kill: payload.fight.kill,
      bossHPPercent: payload.fight.bossHPPercent,
    },
  });
  await persistAnalyzerRun({
    reportCode: code,
    fight: payload.fight,
    analysis,
    snapshot,
    source: 'calibration_api',
  });
  return NextResponse.json({ snapshot });
}
