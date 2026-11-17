import { NextResponse } from 'next/server';
import { guardListing } from '@/lib/admin';
import { db, IMAGE_BUCKET } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function loadImage(imageId) {
  if (!/^[0-9a-f-]{36}$/i.test(imageId)) return null;
  const { data } = await db().from('auction_images').select('id,auction_id,path').eq('id', imageId).maybeSingle();
  return data;
}

// PATCH { action: 'main' | 'left' | 'right' }
export async function PATCH(req, { params }) {
  const { imageId } = await params;
  const img = await loadImage(imageId);
  if (!img) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
  const g = await guardListing(req, img.auction_id, 'id');
  if (g.error) return g.error;
  const { action } = (await req.json().catch(() => ({}))) || {};

  const { data: all } = await db()
    .from('auction_images')
    .select('id,sort,created_at')
    .eq('auction_id', img.auction_id)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });
  const ids = (all || []).map((r) => r.id);
  const i = ids.indexOf(imageId);
  if (action === 'main') {
    ids.splice(i, 1);
    ids.unshift(imageId);
  } else if (action === 'left' && i > 0) {
    [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
  } else if (action === 'right' && i < ids.length - 1) {
    [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
  }
  await Promise.all(ids.map((rid, idx) => db().from('auction_images').update({ sort: idx }).eq('id', rid)));
  return NextResponse.json({ ok: true, order: ids });
}

export async function DELETE(req, { params }) {
  const { imageId } = await params;
  const img = await loadImage(imageId);
  if (!img) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 });
  const g = await guardListing(req, img.auction_id, 'id');
  if (g.error) return g.error;
  await db().storage.from(IMAGE_BUCKET).remove([img.path]);
  await db().from('auction_images').delete().eq('id', imageId);
  return NextResponse.json({ ok: true });
}
