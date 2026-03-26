import { NextResponse } from 'next/server';
import { getProfileHistory } from '@/lib/player-profile-store';

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
    const history = await getProfileHistory(region, realm, name);
    return NextResponse.json({ snapshots: history });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to read player history' },
      { status: 500 }
    );
  }
}
