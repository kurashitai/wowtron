import { NextResponse } from 'next/server';
import { loadBuildSignificanceHealthPayload } from '@/lib/platform-improvement/health';

export async function GET() {
  const payload = await loadBuildSignificanceHealthPayload();
  return NextResponse.json({ payload });
}
