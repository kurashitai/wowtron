import { NextResponse } from 'next/server';
import { checkSupabaseConnection } from '@/lib/player-profile-store';

export async function GET() {
  const result = await checkSupabaseConnection();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
