import Link from 'next/link';
import { kr, timeLeft, auctionPhase, listingTitle } from '@/lib/format';
import { SALE_TYPES } from '@/lib/categories';

export default function ListingCard({ a, now = Date.now(), href }) {
  const img = (a.auction_images || []).slice().sort((x, y) => x.sort - y.sort)[0];
  const phase = auctionPhase(a, now);
  const isAuction = a.sale_type !== 'fixed';
  const price = a.status === 'sold' ? a.sold_price : isAuction ? (a.current_price ?? a.start_price) : a.buy_now_price;
  const priceLabel = a.status === 'sold' ? 'Såld' : isAuction ? (a.current_price ? 'Ledande bud' : 'Utropspris') : 'Pris';
  return (
    <Link href={href || `/annons/${a.id}`} className="acard">
      <div className="img">
        {img ? <img src={img.url} alt="" loading="lazy" /> : <span>Ingen bild</span>}
        <span className="type-tag">{SALE_TYPES[a.sale_type]}</span>
      </div>
      <div className="body">
        <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>
          {listingTitle(a)}{a.category === 'byggda-bilar' && a.year ? ` · ${a.year}` : ''}
        </h3>
        {a.fits && <div className="muted" style={{ fontSize: 13 }}>Passar {a.fits}</div>}
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, alignItems: 'flex-end' }}>
          <div>
            <div className="label-cap" style={{ fontSize: 12 }}>{priceLabel}</div>
            <div className="price" style={{ fontSize: 20 }}>{kr(price)}</div>
          </div>
          <div className="muted" style={{ fontSize: 13, textAlign: 'right' }}>
            {a.status === 'draft' && 'Utkast'}
            {a.status === 'cancelled' && 'Avslutad'}
            {phase === 'live' && isAuction && <>{timeLeft(a.ends_at, now)} kvar<br />{a.bid_count} bud</>}
            {phase === 'live' && !isAuction && (a.location || '')}
            {phase === 'ended' && 'Avslutad'}
            {phase === 'upcoming' && 'Kommande'}
          </div>
        </div>
      </div>
    </Link>
  );
}
