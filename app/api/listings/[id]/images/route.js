import { NextResponse } from 'next/server';
import { guardListing } from '@/lib/admin';
import { db, IMAGE_BUCKET } from '@/lib/supabase';
import { randomToken } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES = 30;

export async function POST(req, { params }) {
  const { id } = await params;
  const g = await guardListing(req, id, 'id,status');
  if (g.error) return g.error;
  if (g.listing.status === 'sold') return NextResponse.json({ error: 'Annonsen är såld.' }, { status: 409 });

  const { count } = await db().from('auction_images').select('id', { count: 'exact', head: true }).eq('auction_id', id);
  if ((count || 0) >= MAX_IMAGES) return NextResponse.json({ error: `Max ${MAX_IMAGES} bilder per annons.` }, { status: 400 });

  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Ingen fil' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Bara JPG, PNG eller WebP.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Bilden är för stor (max 4 MB).' }, { status: 400 });

  const path = `${id}/${Date.now()}-${randomToken(6)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await db().storage.from(IMAGE_BUCKET).upload(path, buf, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = db().storage.from(IMAGE_BUCKET).getPublicUrl(path);
  const { data, error } = await db()
    .from('auction_images')
    .insert({ auction_id: id, path, url: pub.publicUrl, sort: (count || 0) + 1 })
    .select('id,url,sort')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, image: data });
}
