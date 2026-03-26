import { NextResponse } from 'next/server';
import { getPlayerSyncStatus } from '@/lib/player-profile';

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
    const status = await getPlayerSyncStatus(region, realm, name);
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to read sync status' },
      { status: 500 }
    );
  }
}
