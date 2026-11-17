import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getBidder } from '@/lib/session';
import { sameOrigin } from '@/lib/admin';
import { TERMS_VERSION } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const user = await getBidder();
  if (!user) return NextResponse.json({ ok: false, error: 'not_logged_in' }, { status: 401 });
  const { listingId, acceptTerms } = (await req.json().catch(() => ({}))) || {};
  if (acceptTerms !== true) return NextResponse.json({ ok: false, error: 'terms' }, { status: 400 });
  if (typeof listingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(listingId)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 400 });
  }
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  const { data, error } = await db().rpc('buy_now', {
    p_listing_id: listingId,
    p_buyer_id: user.id,
    p_ip: ip,
    p_terms_version: TERMS_VERSION
  });
  if (error) {
    console.error('buy_now failed', error);
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
  return NextResponse.json(data, { status: data?.ok ? 200 : 409 });
}
