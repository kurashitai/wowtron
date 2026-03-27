import { NextResponse } from 'next/server';
import { loadPriorityBacklogPayload, loadReviewCadencePayload } from '@/lib/platform-improvement/health';

export async function GET() {
  const [backlog, cadence] = await Promise.all([
    loadPriorityBacklogPayload(),
    loadReviewCadencePayload(),
  ]);

  return NextResponse.json({
    backlog,
    cadence,
  });
}
