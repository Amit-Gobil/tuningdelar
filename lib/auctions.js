import { db } from './supabase';
import { auctionPhase, minNextBid } from './format';

const PUBLIC_FIELDS =
  'id,status,sale_type,buy_now_price,category,condition,fits,make,model,year,headline,mileage_mil,location,description,known_issues,viewing_delivery,start_price,reserve_price,min_increment,starts_at,ends_at,extend_enabled,extend_minutes,current_price,bid_count,leader_bidder_id,seller_id,buyer_id,sold_price,sold_at,created_at';

export async function getImages(auctionId) {
  const { data } = await db()
    .from('auction_images')
    .select('id,url,sort')
    .eq('auction_id', auctionId)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });
  return data || [];
}

export function isUuid(id) {
  return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);
}

export async function getAuctionRaw(id) {
  if (!isUuid(id)) return null;
  const { data } = await db().from('auctions').select(PUBLIC_FIELDS).eq('id', id).maybeSingle();
  return data;
}

function firstName(full) {
  return (full || '').trim().split(/\s+/)[0] || 'Säljare';
}

export async function getSeller(sellerId) {
  if (!sellerId) return null;
  const { data } = await db().from('bidders').select('id,name,created_at').eq('id', sellerId).maybeSingle();
  if (!data) return null;
  return { id: data.id, name: firstName(data.name), since: data.created_at };
}

// Public view: never exposes reserve price, bidder identities, buyer or leader id.
export function toPublic(a, viewerId) {
  if (!a) return null;
  const { reserve_price, leader_bidder_id, buyer_id, ...rest } = a;
  return {
    ...rest,
    has_reserve: reserve_price !== null,
    reserve_met: reserve_price === null ? true : (a.current_price ?? -1) >= reserve_price,
    min_next_bid: minNextBid(a),
    phase: auctionPhase(a),
    you_lead: Boolean(viewerId && leader_bidder_id === viewerId),
    you_bought: Boolean(viewerId && buyer_id === viewerId),
    is_owner: Boolean(viewerId && a.seller_id === viewerId)
  };
}

export async function getPublicBids(auctionId, viewerId, limit = 50) {
  const { data } = await db()
    .from('bids')
    .select('id,amount,created_at,bidder_id')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: true });
  const rows = data || [];
  const labels = new Map();
  for (const r of rows) {
    if (!labels.has(r.bidder_id)) labels.set(r.bidder_id, `Budgivare ${labels.size + 1}`);
  }
  return rows
    .slice()
    .reverse()
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      amount: r.amount,
      created_at: r.created_at,
      label: labels.get(r.bidder_id),
      is_you: Boolean(viewerId && r.bidder_id === viewerId)
    }));
}

export async function getPublicState(id, viewerId) {
  const a = await getAuctionRaw(id);
  if (!a) return null;
  if (a.status === 'draft' && a.seller_id !== viewerId) return null;
  const bids = a.sale_type === 'fixed' ? [] : await getPublicBids(id, viewerId);
  return { auction: toPublic(a, viewerId), bids, server_now: new Date().toISOString() };
}
