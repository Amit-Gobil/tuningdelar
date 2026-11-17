import { notFound } from 'next/navigation';
import { getPublicState, getImages, getSeller } from '@/lib/auctions';
import { getBidder } from '@/lib/session';
import { listingTitle } from '@/lib/format';
import { bankidConfigured, COMPANY_NAME } from '@/lib/config';
import Gallery from '@/components/Gallery';
import ListingLive from '@/components/ListingLive';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const state = await getPublicState(id, null).catch(() => null);
  return { title: state ? listingTitle(state.auction) : 'Annons' };
}

export default async function ListingPage({ params }) {
  const { id } = await params;
  const user = await getBidder();
  const state = await getPublicState(id, user?.id);
  if (!state) notFound();
  const a = state.auction;
  const [images, seller] = await Promise.all([getImages(id), getSeller(a.seller_id)]);

  return (
    <div className="wrap">
      <Gallery images={images} />
      <ListingLive
        listingId={id}
        initial={state}
        loggedIn={Boolean(user)}
        bidderName={user?.name || ''}
        bankidReady={bankidConfigured()}
        title={listingTitle(a)}
        sellerName={seller ? `${seller.name} ✓` : COMPANY_NAME}
        canMessage={Boolean(a.seller_id)}
      >
        <div className="stack" style={{ gap: 28 }}>
          {a.description ? <p className="prose">{a.description}</p> : <p className="muted">Ingen beskrivning än.</p>}
          {a.known_issues && (
            <section>
              <h2 className="section-title">Kända fel</h2>
              <p className="prose">{a.known_issues}</p>
            </section>
          )}
          {a.viewing_delivery && (
            <section>
              <h2 className="section-title">Frakt och upphämtning</h2>
              <p className="prose">{a.viewing_delivery}</p>
            </section>
          )}
        </div>
      </ListingLive>
    </div>
  );
}
