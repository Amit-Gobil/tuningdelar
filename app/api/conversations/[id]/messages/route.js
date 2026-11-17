import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { getBidder } from '@/lib/session';
import { sameOrigin } from '@/lib/admin';
import { getConversationFor } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

const lastSent = new Map();

export async function GET(_req, { params }) {
  const { id } = await params;
  const user = await getBidder();
  const conv = await getConversationFor(id, user?.id);
  if (!conv) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
  const { data } = await db()
    .from('messages')
    .select('id,sender_id,body,created_at,read_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(500);
  await db()
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .is('read_at', null);
  return NextResponse.json(
    { messages: (data || []).map((m) => ({ id: m.id, mine: m.sender_id === user.id, body: m.body, created_at: m.created_at })) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req, { params }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await params;
  const user = await getBidder();
  const conv = await getConversationFor(id, user?.id);
  if (!conv) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
  const { body } = (await req.json().catch(() => ({}))) || {};
  const text = String(body || '').trim();
  if (!text) return NextResponse.json({ error: 'Skriv ett meddelande.' }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: 'Meddelandet är för långt.' }, { status: 400 });
  if (Date.now() - (lastSent.get(user.id) || 0) < 1500) {
    return NextResponse.json({ error: 'Vänta en sekund.' }, { status: 429 });
  }
  lastSent.set(user.id, Date.now());

  const { data, error } = await db()
    .from('messages')
    .insert({ conversation_id: id, sender_id: user.id, body: text })
    .select('id,body,created_at')
    .single();
  if (error) return NextResponse.json({ error: 'Kunde inte skicka.' }, { status: 500 });
  await db().from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true, message: { id: data.id, mine: true, body: data.body, created_at: data.created_at } });
}
