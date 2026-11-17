import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import { db } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import { kr } from '@/lib/format';
import { getImages, isUuid } from '@/lib/auctions';
import ListingEditor from '@/components/ListingEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin – annons' };

function maskNin(nin) {
  if (!nin) return '';
  const s = String(nin).replace(/\D/g, '');
  return s.length >= 8 ? `${s.slice(0, 8)}-XXXX` : 'XXXX';
}

export default async function AdminEdit({ params }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { data: listing } = await db().from('auctions').select('*').eq('id', id).maybeSingle();
  if (!listing) notFound();
  const images = await getImages(id);
  const { data: bids } = await db()
    .from('bids')
    .select('id,amount,created_at,ip,terms_version,bidders(id,name,nin_enc)')
    .eq('auction_id', id)
    .order('created_at', { ascending: false });
  const { data: seller } = listing.seller_id
    ? await db().from('bidders').select('name,email,phone').eq('id', listing.seller_id).single()
    : { data: null };
  const { data: order } = await db().from('orders').select('price,kind,created_at,bidders!orders_buyer_id_fkey(name,email,phone)').eq('listing_id', id).maybeSingle();

  const bidRows = (bids || []).map((b) => {
    let nin = '';
    try {
      nin = maskNin(decrypt(b.bidders?.nin_enc));
    } catch {
      nin = '';
    }
    return { ...b, name: b.bidders?.name || '', nin };
  });

  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <div style={{ marginBottom: 12 }}><Link href="/admin">← Alla annonser</Link></div>
      <div className="card" style={{ marginBottom: 20, padding: 16, fontSize: 14 }}>
        Säljare: <b>{seller ? `${seller.name} · ${seller.email || 'ingen mejl'} · ${seller.phone || 'ingen telefon'}` : 'Gobil AB (admin)'}</b>
        {order && <> · Såld via {order.kind === 'buy_now' ? 'köp direkt' : 'auktion'} till <b>{order.bidders?.name}</b> för {kr(order.price)}</>}
      </div>
      <ListingEditor initial={listing} initialImages={images} backHref="/admin" />

      {listing.sale_type !== 'fixed' && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Bud ({bidRows.length})</h2>
          {bidRows.length === 0 ? (
            <div className="muted" style={{ fontSize: 14 }}>Inga bud än.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Tid</th><th>Belopp</th><th>Budgivare</th><th>Personnr</th><th>IP</th><th>Villkor</th></tr></thead>
                <tbody>
                  {bidRows.map((b, i) => (
                    <tr key={b.id}>
                      <td>{new Date(b.created_at).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })}</td>
                      <td style={{ fontWeight: i === 0 ? 700 : 400 }}>{kr(b.amount)}</td>
                      <td>{b.name}{i === 0 && <span className="pill lead">Leder</span>}</td>
                      <td>{b.nin}</td>
                      <td>{b.ip}</td>
                      <td>{b.terms_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
