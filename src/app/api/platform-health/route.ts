import { NextResponse } from 'next/server';
import { loadAnalyzerHealthPayload, loadOutputQualityPayload } from '@/lib/platform-improvement/health';

export async function GET() {
  const [health, outputQuality] = await Promise.all([
    loadAnalyzerHealthPayload(),
    loadOutputQualityPayload(),
  ]);

  return NextResponse.json({
    health,
    outputQuality,
  });
}
