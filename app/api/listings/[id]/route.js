import { NextResponse } from 'next/server';
import { guardListing, EDITABLE_TEXT, EDITABLE_INT, LOCKED_AFTER_BIDS } from '@/lib/admin';
import { db, IMAGE_BUCKET } from '@/lib/supabase';
import { CATEGORY_SLUGS } from '@/lib/categories';

export const dynamic = 'force-dynamic';

function toInt(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[\s ]/g, ''));
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? NaN : d.toISOString();
}

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

export async function PATCH(req, { params }) {
  const { id } = await params;
  const g = await guardListing(req, id);
  if (g.error) return g.error;
  const current = g.listing;
  if (current.status === 'sold') return bad('Annonsen är såld och kan inte ändras.', 409);

  const body = await req.json().catch(() => null);
  if (!body) return bad('Ogiltig data');
  const hasBids = current.bid_count > 0;
  const update = {};

  for (const k of EDITABLE_TEXT) {
    if (k in body) update[k] = String(body[k] ?? '').slice(0, k === 'description' ? 20000 : k === 'headline' ? 140 : 4000);
  }
  for (const k of EDITABLE_INT) {
    if (k in body) {
      const n = toInt(body[k]);
      if (Number.isNaN(n)) return bad(`Ogiltigt värde för ${k}`);
      update[k] = n;
    }
  }
  if ('category' in body) {
    if (!CATEGORY_SLUGS.includes(body.category)) return bad('Ogiltig kategori');
    update.category = body.category;
  }
  if ('condition' in body) {
    if (!['ny', 'begagnad'].includes(body.condition)) return bad('Ogiltigt skick');
    update.condition = body.condition;
  }
  if ('buy_now_price' in body) {
    const n = toInt(body.buy_now_price);
    if (Number.isNaN(n) || n === 0) return bad('Ogiltigt köp direkt-pris');
    update.buy_now_price = n;
  }

  const locked = {};
  if ('sale_type' in body) {
    if (!['auction', 'fixed', 'both'].includes(body.sale_type)) return bad('Ogiltig försäljningstyp');
    locked.sale_type = body.sale_type;
  }
  if ('start_price' in body) locked.start_price = toInt(body.start_price) ?? 0;
  if ('min_increment' in body) locked.min_increment = toInt(body.min_increment) || 1000;
  if ('starts_at' in body) locked.starts_at = toDate(body.starts_at);
  if ('ends_at' in body) locked.ends_at = toDate(body.ends_at);
  if ('extend_enabled' in body) locked.extend_enabled = Boolean(body.extend_enabled);
  if ('extend_minutes' in body) locked.extend_minutes = Math.min(30, Math.max(1, toInt(body.extend_minutes) || 2));
  for (const [k, v] of Object.entries(locked)) {
    if (Number.isNaN(v)) return bad(`Ogiltigt värde för ${k}`);
    if (hasBids && LOCKED_AFTER_BIDS.includes(k)) {
      const same = k.endsWith('_at') ? v && current[k] && new Date(v).getTime() === new Date(current[k]).getTime() : String(v) === String(current[k]);
      if (!same) return bad('Pris, typ, budsteg och tider kan inte ändras när det finns bud.', 409);
      continue;
    }
    update[k] = v;
  }

  if ('reserve_price' in body) {
    const r = toInt(body.reserve_price);
    if (Number.isNaN(r)) return bad('Ogiltigt reservationspris');
    if (hasBids && r !== null && (current.reserve_price === null || r > current.reserve_price)) {
      return bad('Reservationspriset kan bara sänkas eller tas bort när det finns bud.', 409);
    }
    update.reserve_price = r;
  }

  const merged = { ...current, ...update };

  if ('status' in body) {
    const s = body.status;
    if (!['draft', 'published', 'cancelled'].includes(s)) return bad('Ogiltig status');
    if (hasBids && s === 'draft') return bad('En annons med bud kan inte göras till utkast.', 409);
    if (s === 'published') {
      const missing = [];
      const isCar = merged.category === 'byggda-bilar';
      if (!merged.headline && !(merged.make && merged.model)) missing.push(isCar ? 'märke och modell' : 'rubrik');
      if (!merged.description) missing.push('beskrivning');
      if (merged.sale_type !== 'fixed') {
        if (!merged.ends_at) missing.push('sluttid');
        if (merged.start_price === null || merged.start_price === undefined) missing.push('utropspris');
      }
      if (merged.sale_type !== 'auction' && !merged.buy_now_price) missing.push('pris för köp direkt');
      if (missing.length) return bad(`Fyll i ${missing.join(', ')} innan du publicerar.`);
      if (merged.sale_type === 'both' && merged.buy_now_price <= merged.start_price) {
        return bad('Köp direkt-priset måste vara högre än utropspriset.');
      }
      const { count } = await db().from('auction_images').select('id', { count: 'exact', head: true }).eq('auction_id', id);
      if (!count) return bad('Lägg till minst en bild innan du publicerar.');
    }
    update.status = s;
  }

  if (merged.sale_type !== 'fixed' && merged.starts_at && merged.ends_at && new Date(merged.ends_at) <= new Date(merged.starts_at)) {
    return bad('Sluttiden måste vara efter starttiden.');
  }

  update.updated_at = new Date().toISOString();
  const { data, error } = await db().from('auctions').update(update).eq('id', id).select('*').single();
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, auction: data });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const g = await guardListing(req, id, 'bid_count,status');
  if (g.error) return g.error;
  if (g.listing.bid_count > 0 || g.listing.status === 'sold') {
    return bad('Annonser med bud eller som är sålda kan inte raderas. Avbryt den i stället.', 409);
  }
  const { data: imgs } = await db().from('auction_images').select('path').eq('auction_id', id);
  if (imgs?.length) await db().storage.from(IMAGE_BUCKET).remove(imgs.map((i) => i.path));
  await db().from('auctions').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
