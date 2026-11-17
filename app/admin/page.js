import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import { db } from '@/lib/supabase';
import { kr, dateTime, auctionPhase, listingTitle } from '@/lib/format';
import { SALE_TYPES, categoryName } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminHome() {
  if (!(await isAdmin())) redirect('/admin/login');
  const { data: listings, error } = await db()
    .from('auctions')
    .select('id,status,sale_type,category,make,model,year,headline,start_price,buy_now_price,current_price,sold_price,bid_count,starts_at,ends_at,created_at,bidders!auctions_seller_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(500);
  const { count: users } = await db().from('bidders').select('id', { count: 'exact', head: true });

  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="row" style={{ gap: 12 }}>
          <h1 style={{ fontSize: 30 }}>Alla annonser</h1>
          <span className="badge-admin">Admin</span>
          <span className="muted" style={{ fontSize: 14 }}>{users || 0} användare</span>
        </div>
        <div className="row">
          <form method="post" action="/api/listings?admin=1"><button className="btn" type="submit">+ Ny annons (Gobil AB)</button></form>
          <form method="post" action="/api/admin/logout"><button className="btn ghost" type="submit">Logga ut</button></form>
        </div>
      </div>
      {error && <div className="alert err">Något gick fel: {error.message}</div>}
      {listings?.length === 0 && <div className="card muted">Inga annonser än.</div>}
      {listings?.length > 0 && (
        <div className="card table-wrap" style={{ padding: 8 }}>
          <table className="table">
            <thead><tr><th>Annons</th><th>Säljare</th><th>Typ</th><th>Status</th><th>Pris</th><th>Slutar</th><th></th></tr></thead>
            <tbody>
              {listings.map((a) => {
                const phase = auctionPhase(a);
                const status = { draft: 'Utkast', cancelled: 'Avslutad', sold: 'Såld' }[a.status] || { live: 'Aktiv', upcoming: 'Kommande', ended: 'Avslutad auktion' }[phase] || '';
                const price = a.status === 'sold' ? a.sold_price : a.sale_type === 'fixed' ? a.buy_now_price : a.current_price ?? a.start_price;
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{listingTitle(a)}<div className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{categoryName(a.category)}</div></td>
                    <td>{a.bidders?.name || 'Gobil AB'}</td>
                    <td>{SALE_TYPES[a.sale_type]}</td>
                    <td>{status}{a.sale_type !== 'fixed' && ` · ${a.bid_count} bud`}</td>
                    <td>{kr(price)}</td>
                    <td>{a.sale_type === 'fixed' ? '–' : dateTime(a.ends_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link href={`/admin/${a.id}`} style={{ color: 'var(--text)', fontWeight: 600 }}>Hantera</Link>
                      {a.status !== 'draft' && <> · <Link href={`/annons/${a.id}`}>Visa</Link></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
