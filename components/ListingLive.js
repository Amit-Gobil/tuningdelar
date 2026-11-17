'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kr, dateTime, relative, buyNowAvailable } from '@/lib/format';
import { categoryName, SALE_TYPES } from '@/lib/categories';

const ERRORS = {
  too_low: (d) => `Budet är för lågt. Lägsta bud just nu är ${kr(d.min)}.`,
  ended: () => 'Auktionen har avslutats.',
  not_started: () => 'Annonsen har inte startat än.',
  not_open: () => 'Annonsen är inte öppen.',
  not_found: () => 'Annonsen finns inte.',
  already_leading: () => 'Du leder redan.',
  own_listing: () => 'Du kan inte buda på eller köpa din egen annons.',
  no_buy_now: () => 'Köp direkt är inte längre möjligt.',
  not_logged_in: () => 'Du behöver logga in med BankID igen.',
  terms: () => 'Du måste bekräfta att köpet är bindande.',
  invalid_amount: () => 'Ange ett belopp i hela kronor.',
  rate_limited: () => 'Vänta några sekunder och försök igen.'
};

const pad = (n) => String(n).padStart(2, '0');
const initials = (label) => label.replace('Budgivare ', 'B');

export default function ListingLive({ listingId, initial, loggedIn, bidderName, bankidReady, title, sellerName, canMessage, children }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [offset, setOffset] = useState(() => new Date(initial.server_now).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const [amount, setAmount] = useState('');
  const [tab, setTab] = useState('desc');
  const [confirm, setConfirm] = useState(null); // { kind: 'bid'|'buy', amount }
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const a = state.auction;
  const isAuction = a.sale_type !== 'fixed';
  const isCar = a.category === 'byggda-bilar';
  const endsMs = a.ends_at ? new Date(a.ends_at).getTime() : 0;
  const startsMs = a.starts_at ? new Date(a.starts_at).getTime() : 0;
  const phase = a.status === 'sold' ? 'sold'
    : a.status !== 'published' ? 'closed'
    : now < startsMs ? 'upcoming'
    : a.sale_type === 'fixed' ? 'live'
    : now >= endsMs ? 'ended' : 'live';
  const canBuyNow = buyNowAvailable(a, phase);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${listingId}/state`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setState(data);
      setOffset(new Date(data.server_now).getTime() - Date.now());
    } catch {
      /* try again next tick */
    }
  }, [listingId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);

  useEffect(() => {
    const fast = isAuction && phase === 'live' && endsMs - now < 5 * 60 * 1000;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, fast ? 2000 : isAuction ? 5000 : 15000);
    return () => clearInterval(t);
  }, [refresh, phase, endsMs, now, isAuction]);

  const remaining = Math.max(0, (phase === 'upcoming' ? startsMs : endsMs) - now);
  const parts = useMemo(() => {
    const s = Math.floor(remaining / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }, [remaining]);

  const parsedAmount = Number(String(amount).replace(/[\s ]/g, ''));
  const quick = [1000, 5000, 10000].map((step) => Math.max(a.min_next_bid, (a.current_price ?? a.start_price - 1000) + step));

  function openBid(e) {
    e.preventDefault();
    setMsg(null);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) return setMsg({ type: 'err', text: ERRORS.invalid_amount() });
    if (parsedAmount < a.min_next_bid) return setMsg({ type: 'err', text: ERRORS.too_low({ min: a.min_next_bid }) });
    setAccepted(false);
    setConfirm({ kind: 'bid', amount: parsedAmount });
  }

  function openBuy() {
    setMsg(null);
    setAccepted(false);
    setConfirm({ kind: 'buy', amount: a.buy_now_price });
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const isBid = confirm.kind === 'bid';
      const res = await fetch(isBid ? '/api/bid' : '/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isBid ? { auctionId: listingId, amount: confirm.amount, acceptTerms: accepted } : { listingId, acceptTerms: accepted })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setConfirm(null);
        setAmount('');
        setMsg({
          type: 'ok',
          text: isBid
            ? `Ditt bud på ${kr(data.amount)} är registrerat.${data.extended ? ' Auktionen förlängdes.' : ''}`
            : `Du har köpt den för ${kr(data.price)}. Kontakta säljaren för betalning och leverans.`
        });
      } else {
        const fn = ERRORS[data.error];
        setMsg({ type: 'err', text: fn ? fn(data) : 'Något gick fel. Försök igen.' });
        if (data.error !== 'terms') setConfirm(null);
      }
    } catch {
      setMsg({ type: 'err', text: 'Kunde inte nå servern. Kontrollera anslutningen.' });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function contactSeller() {
    setMsg(null);
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) router.push(`/konto/meddelanden/${data.id}`);
    else setMsg({ type: 'err', text: data.error || 'Kunde inte öppna konversationen.' });
  }

  const loginHref = `/logga-in?next=${encodeURIComponent(`/annons/${listingId}`)}`;
  const headline = isCar ? [a.make, a.model].filter(Boolean).join(' ') : (a.headline || [a.make, a.model].filter(Boolean).join(' '));

  return (
    <>
      <div className="listing">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            {phase === 'live' && <span className="pill ok live">{isAuction ? 'Live' : 'Till salu'}</span>}
            {phase === 'upcoming' && <span className="pill warn">Startar {dateTime(a.starts_at)}</span>}
            {phase === 'ended' && <span className="pill grey">Avslutad</span>}
            {phase === 'sold' && <span className="pill grey">Såld</span>}
            {phase === 'closed' && <span className="pill grey">{a.status === 'draft' ? 'Utkast – bara du ser den' : 'Avslutad'}</span>}
            <span className="pill grey">{SALE_TYPES[a.sale_type]}</span>
            {a.location && <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{a.location}</span>}
          </div>
          <h1 className="title">{headline || 'Namnlös annons'}</h1>
          {isCar && a.year && <div className="subtitle">Årsmodell {a.year}</div>}
          {!isCar && a.fits && <div className="subtitle">Passar {a.fits}</div>}

          <dl className="facts">
            {isCar ? (
              <>
                <div><dt>Märke</dt><dd>{a.make || '–'}</dd></div>
                <div><dt>Modell</dt><dd>{a.model || '–'}</dd></div>
                <div><dt>Årsmodell</dt><dd>{a.year || '–'}</dd></div>
              </>
            ) : (
              <>
                <div><dt>Kategori</dt><dd>{categoryName(a.category)}</dd></div>
                <div><dt>Skick</dt><dd>{a.condition === 'ny' ? 'Ny' : 'Begagnad'}</dd></div>
              </>
            )}
            <div><dt>Säljare</dt><dd>{sellerName}</dd></div>
          </dl>

          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'desc'} onClick={() => setTab('desc')}>Beskrivning</button>
            {isAuction && <button type="button" role="tab" aria-selected={tab === 'bids'} onClick={() => setTab('bids')}>Budhistorik ({state.bids.length})</button>}
            <Link href="/villkor" style={{ padding: '12px 0', color: 'var(--muted)', fontWeight: 600 }}>Villkor</Link>
          </div>
          <div className="tab-panel" role="tabpanel">
            {tab === 'desc' ? children : state.bids.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Inga bud än. Utropspris {kr(a.start_price)}.</p>
            ) : (
              <div style={{ maxWidth: 560 }}>
                {state.bids.map((b, i) => (
                  <div key={b.id} className="bid-row" style={{ borderBottom: '1px solid var(--line)', padding: '12px 0' }}>
                    <span className={`avatar${i === 0 ? ' lead' : ''}`}>{b.is_you ? 'Du' : initials(b.label)}</span>
                    <span className="who">
                      <span style={{ fontWeight: i === 0 ? 600 : 500 }}>{b.is_you ? 'Du' : b.label}</span>
                      <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>{relative(b.created_at, now)}</span>
                    </span>
                    <span style={{ fontWeight: i === 0 ? 700 : 500 }}>{kr(b.amount)}</span>
                  </div>
                ))}
                <p className="hint" style={{ marginTop: 12 }}>Budgivare visas anonymt.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="bidbox" aria-label="Köp och budgivning">
          {phase === 'sold' ? (
            <div className="stack" style={{ gap: 8 }}>
              <div className="label-cap">Såld</div>
              <div className="price" style={{ fontSize: 34 }}>{kr(a.sold_price)}</div>
              {a.you_bought && <div className="alert ok">Du köpte den här. Kontakta säljaren för betalning och leverans.</div>}
            </div>
          ) : (
            <>
              {isAuction && (phase === 'live' || phase === 'upcoming') && (
                <div className="timer" role="timer">
                  <div><b>{pad(parts.d)}</b><span>dagar</span></div>
                  <div><b>{pad(parts.h)}</b><span>tim</span></div>
                  <div><b>{pad(parts.m)}</b><span>min</span></div>
                  <div><b>{pad(parts.s)}</b><span>sek</span></div>
                </div>
              )}
              {isAuction && phase === 'ended' && <div className="muted" style={{ fontSize: 14 }}>Avslutades {dateTime(a.ends_at)}</div>}

              {isAuction ? (
                <div>
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                    <span>{a.current_price ? (phase === 'ended' ? 'Vinnande bud' : 'Ledande bud') : 'Utropspris'}</span>
                    <span>{a.bid_count} bud</span>
                  </div>
                  <div className="price" style={{ fontSize: 38, marginTop: 2 }}>{kr(a.current_price ?? a.start_price)}</div>
                  <div className="row" style={{ marginTop: 8, gap: 6 }}>
                    {a.has_reserve && <span className={`pill ${a.reserve_met ? 'ok' : 'warn'}`}>{a.reserve_met ? 'Reservationspris uppnått' : 'Reservationspris ej uppnått'}</span>}
                    {a.you_lead && <span className="pill ok">{phase === 'ended' ? 'Du vann' : 'Du leder'}</span>}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="label-cap">Pris</div>
                  <div className="price" style={{ fontSize: 38, marginTop: 2 }}>{kr(a.buy_now_price)}</div>
                </div>
              )}
            </>
          )}

          {msg && <div className={`alert ${msg.type}`} role="status">{msg.text}</div>}

          {a.is_owner ? (
            <div className="stack" style={{ gap: 10 }}>
              <div className="alert warn">Det här är din annons.</div>
              <a className="btn ghost block" href={`/konto/annons/${listingId}`}>Redigera annonsen</a>
            </div>
          ) : phase === 'live' && !loggedIn ? (
            <a href={loginHref} className="btn block">Logga in med BankID för att {isAuction ? 'buda' : 'köpa'}</a>
          ) : phase === 'live' ? (
            <>
              {isAuction && (
                <form onSubmit={openBid} className="stack" style={{ gap: 12 }}>
                  <div className="quick">
                    {quick.map((q, i) => <button key={i} type="button" onClick={() => setAmount(String(q))}>{kr(q)}</button>)}
                  </div>
                  <label htmlFor="bud" style={{ fontSize: 13, fontWeight: 600 }}>Ditt bud</label>
                  <div className="amount-input">
                    <input id="bud" inputMode="numeric" autoComplete="off" placeholder={new Intl.NumberFormat('sv-SE').format(a.min_next_bid)} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ''))} />
                    <span className="muted" style={{ fontWeight: 500 }}>kr</span>
                  </div>
                  <button type="submit" className="btn block" disabled={a.you_lead}>{a.you_lead ? 'Du leder redan' : 'Lägg bud'}</button>
                </form>
              )}
              {canBuyNow && (
                <>
                  {isAuction && <div className="or">eller</div>}
                  <button type="button" className={`btn block${isAuction ? ' ghost' : ''}`} onClick={openBuy}>Köp direkt för {kr(a.buy_now_price)}</button>
                </>
              )}
            </>
          ) : null}

          {!a.is_owner && canMessage && phase !== 'closed' && (
            loggedIn ? (
              <button type="button" className="btn ghost block" style={{ height: 46 }} onClick={contactSeller}>Skicka meddelande till säljaren</button>
            ) : (
              <a href={loginHref} className="btn ghost block" style={{ height: 46 }}>Logga in för att kontakta säljaren</a>
            )
          )}

          <div className="row" style={{ gap: 8, fontSize: 13, color: 'var(--muted)', flexWrap: 'nowrap' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>
            <span>
              Alla köp och bud är bindande och kräver BankID{!bankidReady && ' (aktiveras snart)'}.
              {isAuction && phase === 'live' && a.extend_enabled && ` Sena bud förlänger med ${a.extend_minutes} min.`}
            </span>
          </div>

          {isAuction && state.bids.length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              {state.bids.slice(0, 3).map((b, i) => (
                <div key={b.id} className="bid-row" style={{ color: i === 0 ? 'var(--text)' : 'var(--soft)' }}>
                  <span className={`avatar${i === 0 ? ' lead' : ''}`}>{b.is_you ? 'Du' : initials(b.label)}</span>
                  <span className="who" style={{ fontWeight: i === 0 ? 500 : 400 }}>{b.is_you ? 'Du' : b.label}</span>
                  <span style={{ fontWeight: i === 0 ? 700 : 400 }}>{kr(b.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {confirm && (
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && !busy && setConfirm(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title" style={{ fontSize: 22 }}>{confirm.kind === 'bid' ? 'Bekräfta ditt bud' : 'Bekräfta köpet'}</h2>
            <div className="summary">
              <div><span className="muted">Annons</span><span style={{ textAlign: 'right' }}>{title}</span></div>
              <div><span className="muted">{confirm.kind === 'bid' ? 'Budgivare' : 'Köpare'}</span><span>{bidderName} <span style={{ color: 'var(--ok)' }}>✓ BankID</span></span></div>
              <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10, alignItems: 'baseline' }}>
                <span className="muted">{confirm.kind === 'bid' ? 'Ditt bud' : 'Pris'}</span>
                <span className="price" style={{ fontSize: 26 }}>{kr(confirm.amount)}</span>
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>
                {confirm.kind === 'bid'
                  ? <>Jag förstår att budet är <b>bindande</b> och att jag köper till detta pris om jag vinner.</>
                  : <>Jag förstår att köpet är <b>bindande</b> och att jag betalar {kr(confirm.amount)} till säljaren.</>}
                {' '}Jag har läst <a href="/villkor" target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>villkoren</a>.
              </span>
            </label>
            {msg?.type === 'err' && <div className="alert err">{msg.text}</div>}
            <div className="stack" style={{ gap: 10 }}>
              <button type="button" className="btn block" disabled={!accepted || busy} onClick={submit}>
                {busy ? 'Skickar…' : confirm.kind === 'bid' ? 'Lägg bindande bud' : 'Köp nu'}
              </button>
              <button type="button" className="btn ghost block" disabled={busy} onClick={() => setConfirm(null)}>Avbryt</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
