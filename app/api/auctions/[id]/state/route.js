import { NextResponse } from 'next/server';
import { getPublicState } from '@/lib/auctions';
import { getBidder } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  const bidder = await getBidder();
  const state = await getPublicState(id, bidder?.id);
  if (!state) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
}
