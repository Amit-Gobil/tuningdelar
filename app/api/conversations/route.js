import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getBidder } from '@/lib/session';
import { sameOrigin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// Start (or reopen) a conversation with the seller of a listing.
export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await getBidder();
  if (!user) return NextResponse.json({ error: 'Du behöver logga in.' }, { status: 401 });
  const { listingId } = (await req.json().catch(() => ({}))) || {};
  if (typeof listingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(listingId)) {
    return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
  }
  const { data: listing } = await db().from('auctions').select('id,seller_id,status').eq('id', listingId).maybeSingle();
  if (!listing || listing.status === 'draft') return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
  if (!listing.seller_id) return NextResponse.json({ error: 'Den här säljaren tar inte emot meddelanden här.' }, { status: 400 });
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'Det är din egen annons.' }, { status: 400 });

  const { data: existing } = await db()
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, id: existing.id });

  const { data, error } = await db()
    .from('conversations')
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: listing.seller_id })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: 'Kunde inte starta konversationen.' }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
