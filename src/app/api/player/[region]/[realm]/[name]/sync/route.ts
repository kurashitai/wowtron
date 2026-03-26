import { NextResponse } from 'next/server';
import { triggerPlayerSync } from '@/lib/player-profile';

type Params = {
  params: Promise<{
    region: string;
    realm: string;
    name: string;
  }>;
};

export async function POST(_: Request, { params }: Params) {
  try {
    const { region, realm, name } = await params;
    await triggerPlayerSync(region, realm, name);
    return NextResponse.json({ ok: true, status: 'completed' });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}
