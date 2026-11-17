import { NextResponse } from 'next/server';
import { isAdmin, getBidder } from './session';
import { db } from './supabase';

export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Returns a NextResponse if the request must be rejected, otherwise null.
export async function guardAdmin(req, { checkOrigin = true } = {}) {
  if (checkOrigin && !sameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

// Admin can edit everything; a user can edit their own listings.
// Returns { listing, admin, user } or { error: NextResponse }.
export async function guardListing(req, listingId, fields = '*') {
  if (!sameOrigin(req)) return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  const admin = await isAdmin();
  const user = await getBidder();
  if (!admin && !user) return { error: NextResponse.json({ error: 'Du behöver logga in.' }, { status: 401 }) };
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return { error: NextResponse.json({ error: 'Hittades inte' }, { status: 404 }) };
  const { data: listing } = await db().from('auctions').select(fields === '*' ? '*' : `${fields},seller_id`).eq('id', listingId).maybeSingle();
  if (!listing) return { error: NextResponse.json({ error: 'Hittades inte' }, { status: 404 }) };
  if (!admin && listing.seller_id !== user?.id) {
    return { error: NextResponse.json({ error: 'Du kan bara ändra dina egna annonser.' }, { status: 403 }) };
  }
  return { listing, admin, user };
}

export const EDITABLE_TEXT = [
  'make', 'model', 'headline', 'fits', 'location', 'description', 'known_issues', 'viewing_delivery'
];
export const EDITABLE_INT = ['year', 'mileage_mil'];
export const LOCKED_AFTER_BIDS = ['start_price', 'min_increment', 'starts_at', 'ends_at', 'extend_enabled', 'extend_minutes', 'sale_type'];
