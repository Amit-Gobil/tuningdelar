import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getBidder } from '@/lib/session';
import { db } from '@/lib/supabase';
import { getConversationFor } from '@/lib/messaging';
import { listingTitle, kr } from '@/lib/format';
import Chat from '@/components/Chat';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meddelanden' };

export default async function ConversationPage({ params }) {
  const user = await getBidder();
  const { id } = await params;
  if (!user) redirect(`/logga-in?next=/konto/meddelanden/${id}`);
  const conv = await getConversationFor(id, user.id);
  if (!conv) notFound();

  const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
  const [{ data: listing }, { data: other }] = await Promise.all([
    db().from('auctions').select('id,headline,make,model,status,buyer_id,sold_price,sale_type,leader_bidder_id,ends_at').eq('id', conv.listing_id).single(),
    db().from('bidders').select('name,email,phone').eq('id', otherId).single()
  ]);

  // Share contact details only once these two have a deal.
  const auctionDone = listing.sale_type !== 'fixed' && listing.ends_at && new Date(listing.ends_at) < new Date();
  const buyerId = listing.status === 'sold' ? listing.buyer_id : auctionDone ? listing.leader_bidder_id : null;
  const deal = buyerId && (buyerId === conv.buyer_id);

  return (
    <div className="wrap" style={{ paddingTop: 28, maxWidth: 820 }}>
      <div style={{ marginBottom: 12 }}><Link href="/konto?flik=meddelanden">← Meddelanden</Link></div>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{(other?.name || 'Användare').split(' ')[0]}</div>
            <Link href={`/annons/${listing.id}`} className="muted" style={{ fontSize: 14 }}>{listingTitle(listing)}</Link>
          </div>
          {listing.status === 'sold' && <span className="pill ok">Såld {kr(listing.sold_price)}</span>}
        </div>
        {deal && (other?.email || other?.phone) && (
          <div className="alert ok" style={{ marginTop: 12 }}>
            Affär klar. Kontakt: {[other.name, other.phone, other.email].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <Chat conversationId={id} />
    </div>
  );
}
