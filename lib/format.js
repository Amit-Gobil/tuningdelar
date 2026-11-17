const TZ = 'Europe/Stockholm';

export function kr(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return `${new Intl.NumberFormat('sv-SE').format(n)} kr`;
}

export function num(n) {
  if (n === null || n === undefined) return '';
  return new Intl.NumberFormat('sv-SE').format(n);
}

export function dateTime(iso) {
  if (!iso) return '–';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}

export function relative(iso, nowMs = Date.now()) {
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'nyss';
  if (m < 60) return `för ${m} min sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `för ${h} tim sedan`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'igår' : `för ${d} dagar sedan`;
}

export function timeLeft(iso, nowMs = Date.now()) {
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - nowMs) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

// 'closed' | 'upcoming' | 'live' | 'ended' | 'sold'
export function auctionPhase(a, nowMs = Date.now()) {
  if (a.status === 'sold') return 'sold';
  if (a.status !== 'published') return 'closed';
  const s = a.starts_at ? new Date(a.starts_at).getTime() : 0;
  if (nowMs < s) return 'upcoming';
  if (a.sale_type === 'fixed') return 'live';
  if (!a.ends_at) return 'closed';
  if (nowMs >= new Date(a.ends_at).getTime()) return 'ended';
  return 'live';
}

export function minNextBid(a) {
  return a.current_price === null || a.current_price === undefined
    ? a.start_price
    : a.current_price + a.min_increment;
}

export function listingTitle(a) {
  if (a.headline) return a.headline;
  return [a.make, a.model].filter(Boolean).join(' ') || 'Namnlös annons';
}

// Kept for older imports.
export function carTitle(a) {
  return listingTitle(a) + (a.year && !a.headline ? ` · ${a.year}` : '');
}

export function buyNowAvailable(a, phase) {
  if (a.sale_type === 'auction' || !a.buy_now_price) return false;
  if (phase !== 'live') return false;
  if (a.sale_type === 'both' && a.current_price !== null && a.current_price !== undefined && a.current_price >= a.buy_now_price) return false;
  return true;
}
