import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getBidder } from '@/lib/session';
import { TERMS_VERSION } from '@/lib/config';

export const dynamic = 'force-dynamic';

// Simple per-instance throttle (one bid per bidder every 3 s).
const lastBid = new Map();

function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const bidder = await getBidder();
  if (!bidder) return NextResponse.json({ ok: false, error: 'not_logged_in' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_amount' }, { status: 400 });
  }

  const { auctionId, amount, acceptTerms } = body || {};
  if (acceptTerms !== true) return NextResponse.json({ ok: false, error: 'terms' }, { status: 400 });
  if (typeof auctionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(auctionId)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount <= 0 || amount > 2_000_000_000) {
    return NextResponse.json({ ok: false, error: 'invalid_amount' }, { status: 400 });
  }

  const prev = lastBid.get(bidder.id) || 0;
  if (Date.now() - prev < 3000) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  lastBid.set(bidder.id, Date.now());

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  const ua = (req.headers.get('user-agent') || '').slice(0, 300);

  const { data, error } = await db().rpc('place_bid', {
    p_auction_id: auctionId,
    p_bidder_id: bidder.id,
    p_amount: amount,
    p_ip: ip,
    p_user_agent: ua,
    p_terms_version: TERMS_VERSION
  });

  if (error) {
    // falls through to generic server error below

    console.error('place_bid failed', error);
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
  return NextResponse.json(data, { status: data?.ok ? 200 : 409 });
}
