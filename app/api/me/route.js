import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getBidder } from '@/lib/session';
import { sameOrigin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// Update contact details (shared with the other party after a deal).
export async function PATCH(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await getBidder();
  if (!user) return NextResponse.json({ error: 'Du behöver logga in.' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) || {};
  const email = String(body.email || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 40);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Ogiltig mejladress.' }, { status: 400 });
  if (phone && !/^[+\d][\d\s-]{5,}$/.test(phone)) return NextResponse.json({ error: 'Ogiltigt telefonnummer.' }, { status: 400 });
  const { error } = await db().from('bidders').update({ email: email || null, phone: phone || null }).eq('id', user.id);
  if (error) return NextResponse.json({ error: 'Kunde inte spara.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
