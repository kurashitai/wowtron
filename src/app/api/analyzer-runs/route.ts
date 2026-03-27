import { NextRequest, NextResponse } from 'next/server';
import { persistAnalyzerRun } from '@/lib/platform-improvement/repository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportCode, fight, analysis, snapshot, source } = body || {};

    if (!reportCode || !fight?.id || !fight?.bossName || !analysis || !snapshot) {
      return NextResponse.json({ error: 'Missing analyzer run payload.' }, { status: 400 });
    }

    const record = await persistAnalyzerRun({
      reportCode,
      fight,
      analysis,
      snapshot,
      source: source || 'client_analysis',
    });

    return NextResponse.json({ ok: true, key: record.key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to persist analyzer run.' }, { status: 500 });
  }
}
