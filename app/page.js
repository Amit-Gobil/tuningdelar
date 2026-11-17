import Link from 'next/link';
import { db } from '@/lib/supabase';
import { auctionPhase } from '@/lib/format';
import { CATEGORIES, CATEGORY_SLUGS } from '@/lib/categories';
import ListingCard from '@/components/ListingCard';

export const dynamic = 'force-dynamic';

const FIELDS = 'id,status,sale_type,category,make,model,year,headline,fits,location,start_price,buy_now_price,current_price,bid_count,starts_at,ends_at,sold_price,created_at,auction_images(url,sort)';

function buildHref(params, patch) {
  const p = new URLSearchParams();
  const merged = { ...params, ...patch };
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/?${s}` : '/';
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp?.q === 'string' ? sp.q.trim().slice(0, 80) : '';
  const kat = CATEGORY_SLUGS.includes(sp?.kat) ? sp.kat : '';
  const typ = ['auktion', 'kopnu'].includes(sp?.typ) ? sp.typ : '';
  const current = { q, kat, typ };

  let listings = [];
  let error = null;
  try {
    let query = db().from('auctions').select(FIELDS).eq('status', 'published').order('created_at', { ascending: false }).limit(120);
    if (kat) query = query.eq('category', kat);
    if (typ === 'auktion') query = query.in('sale_type', ['auction', 'both']);
    if (typ === 'kopnu') query = query.in('sale_type', ['fixed', 'both']);
    if (q) {
      const safe = q.replace(/[%,()*]/g, ' ');
      query = query.or(`headline.ilike.%${safe}%,make.ilike.%${safe}%,model.ilike.%${safe}%,fits.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
    const { data, error: e } = await query;
    if (e) throw e;
    listings = data || [];
  } catch (e) {
    error = e.message;
  }

  const now = Date.now();
  const active = listings.filter((a) => auctionPhase(a, now) !== 'ended');

  return (
    <div className="wrap" style={{ paddingTop: 36 }}>
      <section className="hero">
        <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-1.6px', lineHeight: 1.05 }}>Delar och bilar för den som bygger.</h1>
        <p className="muted" style={{ fontSize: 17, margin: '10px 0 22px' }}>Köp direkt eller buda. Alla köpare och säljare är verifierade med BankID.</p>
        <form action="/" method="get" className="search">
          <label htmlFor="q" className="sr-only">Sök</label>
          <input id="q" name="q" defaultValue={q} placeholder="Sök efter del, bil eller modell…" />
          {kat && <input type="hidden" name="kat" value={kat} />}
          {typ && <input type="hidden" name="typ" value={typ} />}
          <button type="submit" className="btn">Sök</button>
        </form>
      </section>

      <nav className="chips" aria-label="Kategorier">
        <Link href={buildHref(current, { kat: '' })} className={`chip${!kat ? ' on' : ''}`}>Alla</Link>
        {CATEGORIES.map((c) => (
          <Link key={c.slug} href={buildHref(current, { kat: c.slug })} className={`chip${kat === c.slug ? ' on' : ''}`}>{c.name}</Link>
        ))}
      </nav>
      <nav className="chips" aria-label="Typ" style={{ marginTop: 8 }}>
        <Link href={buildHref(current, { typ: '' })} className={`chip small${!typ ? ' on' : ''}`}>Alla annonser</Link>
        <Link href={buildHref(current, { typ: 'auktion' })} className={`chip small${typ === 'auktion' ? ' on' : ''}`}>Auktioner</Link>
        <Link href={buildHref(current, { typ: 'kopnu' })} className={`chip small${typ === 'kopnu' ? ' on' : ''}`}>Köp direkt</Link>
      </nav>

      {error && <div className="alert err" style={{ marginTop: 20 }}>Kunde inte hämta annonser.</div>}
      {!error && active.length === 0 && (
        <div className="card muted" style={{ marginTop: 24 }}>
          {q || kat || typ ? 'Inga annonser matchar din sökning.' : 'Inga annonser än. Bli först att lägga upp något!'}
        </div>
      )}
      <div className="cards" style={{ marginTop: 24 }}>
        {active.map((a) => <ListingCard key={a.id} a={a} now={now} />)}
      </div>
    </div>
  );
}
