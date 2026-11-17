import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getBidder } from '@/lib/session';
import { db } from '@/lib/supabase';
import { kr, relative, listingTitle, auctionPhase } from '@/lib/format';
import { listConversations } from '@/lib/messaging';
import ListingCard from '@/components/ListingCard';
import ProfileForm from '@/components/ProfileForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mitt konto' };

const TABS = [
  ['annonser', 'Mina annonser'],
  ['bud', 'Mina bud'],
  ['kop', 'Mina köp'],
  ['meddelanden', 'Meddelanden'],
  ['profil', 'Kontaktuppgifter']
];
const FIELDS = 'id,status,sale_type,category,make,model,year,headline,fits,location,start_price,buy_now_price,current_price,bid_count,starts_at,ends_at,sold_price,created_at,leader_bidder_id,buyer_id,auction_images(url,sort)';

export default async function Account({ searchParams }) {
  const user = await getBidder();
  if (!user) redirect('/logga-in?next=/konto');
  const sp = await searchParams;
  const flik = TABS.some(([k]) => k === sp?.flik) ? sp.flik : 'annonser';
  const now = Date.now();

  let content = null;

  if (flik === 'annonser') {
    const { data } = await db().from('auctions').select(FIELDS).eq('seller_id', user.id).order('created_at', { ascending: false });
    content = data?.length ? (
      <div className="cards">{data.map((a) => <ListingCard key={a.id} a={a} now={now} href={`/konto/annons/${a.id}`} />)}</div>
    ) : (
      <div className="card muted">Du har inga annonser än.</div>
    );
  }

  if (flik === 'bud') {
    const { data: bids } = await db().from('bids').select('auction_id,amount,created_at').eq('bidder_id', user.id).order('created_at', { ascending: false }).limit(200);
    const ids = [...new Set((bids || []).map((b) => b.auction_id))];
    const { data: listings } = ids.length ? await db().from('auctions').select(FIELDS).in('id', ids) : { data: [] };
    const myMax = new Map();
    for (const b of bids || []) myMax.set(b.auction_id, Math.max(myMax.get(b.auction_id) || 0, b.amount));
    content = listings?.length ? (
      <div className="list">
        {ids.map((id) => {
          const a = listings.find((l) => l.id === id);
          if (!a) return null;
          const phase = auctionPhase(a, now);
          const leading = a.leader_bidder_id === user.id;
          const status = phase === 'ended' ? (leading ? 'Du vann' : 'Avslutad') : phase === 'sold' ? (a.buyer_id === user.id ? 'Du köpte' : 'Såld') : leading ? 'Du leder' : 'Överbjuden';
          return (
            <Link key={id} href={`/annons/${id}`} className="list-row">
              <span className="who"><b>{listingTitle(a)}</b><br /><span className="muted" style={{ fontSize: 13 }}>Ditt högsta bud {kr(myMax.get(id))} · ledande {kr(a.current_price)}</span></span>
              <span className={`pill ${leading ? 'ok' : 'grey'}`}>{status}</span>
            </Link>
          );
        })}
      </div>
    ) : (
      <div className="card muted">Du har inte lagt några bud än.</div>
    );
  }

  if (flik === 'kop') {
    const { data: bought } = await db().from('auctions').select(FIELDS).eq('buyer_id', user.id).order('sold_at', { ascending: false });
    const { data: won } = await db().from('auctions').select(FIELDS).eq('leader_bidder_id', user.id).eq('status', 'published').neq('sale_type', 'fixed').lt('ends_at', new Date().toISOString());
    const all = [...(bought || []), ...(won || [])];
    content = all.length ? (
      <div className="cards">{all.map((a) => <ListingCard key={a.id} a={a} now={now} />)}</div>
    ) : (
      <div className="card muted">Du har inga köp än.</div>
    );
  }

  if (flik === 'meddelanden') {
    const convs = await listConversations(user.id);
    content = convs.length ? (
      <div className="list">
        {convs.map((c) => {
          const other = c.buyer_id === user.id ? c.seller?.name : c.buyer?.name;
          const role = c.buyer_id === user.id ? 'Säljare' : 'Köpare';
          return (
            <Link key={c.id} href={`/konto/meddelanden/${c.id}`} className="list-row">
              <span className="avatar">{(other || '?').slice(0, 1)}</span>
              <span className="who">
                <b>{(other || '').split(' ')[0] || 'Användare'}</b> <span className="muted" style={{ fontSize: 13 }}>· {role}</span><br />
                <span className="muted" style={{ fontSize: 13 }}>{listingTitle(c.auctions || {})} · {relative(c.last_message_at, now)}</span>
              </span>
              {c.unread > 0 && <span className="badge">{c.unread}</span>}
            </Link>
          );
        })}
      </div>
    ) : (
      <div className="card muted">Inga meddelanden än. Du kan skriva till en säljare från annonsen.</div>
    );
  }

  if (flik === 'profil') {
    const { data: me } = await db().from('bidders').select('name,email,phone').eq('id', user.id).single();
    content = <ProfileForm name={me?.name || ''} email={me?.email || ''} phone={me?.phone || ''} />;
  }

  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 32 }}>Hej {user.name.split(' ')[0]}</h1>
          <div className="muted">Verifierad med BankID</div>
        </div>
        <form method="post" action="/api/listings">
          <button type="submit" className="btn">+ Lägg upp annons</button>
        </form>
      </div>
      {sp?.error === 'drafts' && <div className="alert warn" style={{ marginBottom: 16 }}>Du har många utkast. Publicera eller radera några först.</div>}
      <nav className="tabs" style={{ marginTop: 0, marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/konto?flik=${k}`} className={`tab-link${flik === k ? ' on' : ''}`}>{label}</Link>
        ))}
      </nav>
      {content}
    </div>
  );
}
