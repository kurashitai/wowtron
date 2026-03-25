import { NextResponse } from 'next/server';
import { getPlayerProfile } from '@/lib/player-profile';

type Params = {
  params: Promise<{
    region: string;
    realm: string;
    name: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { region, realm, name } = await params;
    const profile = await getPlayerProfile(region, realm, name);
    return NextResponse.json(profile);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch player profile' },
      { status: 500 }
    );
  }
}
