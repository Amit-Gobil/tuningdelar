'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, SALE_TYPES } from '@/lib/categories';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

// Downscale large photos in the browser so each upload stays small.
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`${file.name}: bara JPG, PNG eller WebP.`);
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const max = 2000;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 3.5 * 1024 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

export default function ListingEditor({ initial, initialImages, backHref = '/konto' }) {
  const router = useRouter();
  const [a, setA] = useState(initial);
  const [form, setForm] = useState(() => ({
    sale_type: initial.sale_type || 'fixed',
    category: initial.category || 'ovrigt',
    condition: initial.condition || 'begagnad',
    headline: initial.headline || '',
    make: initial.make || '',
    model: initial.model || '',
    year: initial.year ?? '',
    fits: initial.fits || '',
    location: initial.location || '',
    description: initial.description || '',
    known_issues: initial.known_issues || '',
    viewing_delivery: initial.viewing_delivery || '',
    buy_now_price: initial.buy_now_price ?? '',
    start_price: initial.start_price ?? '',
    reserve_price: initial.reserve_price ?? '',
    min_increment: initial.min_increment ?? 1000,
    starts_at: toLocalInput(initial.starts_at),
    ends_at: toLocalInput(initial.ends_at),
    extend_enabled: initial.extend_enabled ?? true,
    extend_minutes: initial.extend_minutes ?? 2
  }));
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const hasBids = a.bid_count > 0;
  const sold = a.status === 'sold';
  const isCar = form.category === 'bilar';
  const isAuction = form.sale_type !== 'fixed';
  const hasBuyNow = form.sale_type !== 'auction';

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const choose = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(extra = {}) {
    setBusy(true);
    setMsg(null);
    try {
      const payload = { ...form, starts_at: fromLocalInput(form.starts_at), ends_at: fromLocalInput(form.ends_at), ...extra };
      if (!isAuction) {
        delete payload.start_price;
        delete payload.reserve_price;
        delete payload.min_increment;
        delete payload.ends_at;
        delete payload.extend_enabled;
        delete payload.extend_minutes;
      }
      if (!hasBuyNow) payload.buy_now_price = '';
      const res = await fetch(`/api/listings/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Kunde inte spara');
      setA(data.auction);
      setMsg({
        type: 'ok',
        text: extra.status === 'published' ? 'Publicerad! Annonsen syns nu för alla.' : extra.status === 'draft' ? 'Avpublicerad, nu ett utkast.' : extra.status === 'cancelled' ? 'Annonsen är avslutad.' : 'Sparat.'
      });
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Radera annonsen helt? Det går inte att ångra.')) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${a.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ type: 'err', text: data.error || 'Kunde inte radera' });
    router.push(backHref);
    router.refresh();
  }

  async function upload(files) {
    setMsg(null);
    const list = Array.from(files || []);
    setUploading(list.length);
    for (const f of list) {
      try {
        const prepared = await prepareImage(f);
        const fd = new FormData();
        fd.append('file', prepared);
        const res = await fetch(`/api/listings/${a.id}/images`, { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Uppladdning misslyckades (${f.name})`);
        setImages((imgs) => [...imgs, data.image]);
      } catch (e) {
        setMsg({ type: 'err', text: e.message });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function imageAction(id, action) {
    const res = await fetch(`/api/images/${id}`, {
      method: action === 'delete' ? 'DELETE' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: action === 'delete' ? undefined : JSON.stringify({ action })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ type: 'err', text: data.error || 'Något gick fel' });
    if (action === 'delete') setImages((imgs) => imgs.filter((i) => i.id !== id));
    else setImages((imgs) => data.order.map((oid) => imgs.find((i) => i.id === oid)).filter(Boolean));
  }

  const statusLabel = { draft: 'Utkast', published: 'Publicerad', cancelled: 'Avslutad', sold: 'Såld' }[a.status];
  const title = (isCar ? [form.make, form.model].filter(Boolean).join(' ') : form.headline) || 'Ny annons';

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 30, marginBottom: 6 }}>{title}</h1>
          <div className="muted" style={{ fontSize: 15 }}>
            Status: <b style={{ color: 'var(--text)' }}>{statusLabel}</b>{isAuction && ` · ${a.bid_count} bud`}
          </div>
        </div>
        {!sold && (
          <div className="row">
            <button type="button" className="btn ghost" disabled={busy} onClick={() => save()}>Spara</button>
            {a.status !== 'draft' && <a className="btn ghost" href={`/annons/${a.id}`} target="_blank" rel="noreferrer">Visa annonsen</a>}
            {a.status !== 'published' ? (
              <button type="button" className="btn" disabled={busy} onClick={() => save({ status: 'published' })}>Publicera</button>
            ) : !hasBids ? (
              <button type="button" className="btn ghost" disabled={busy} onClick={() => save({ status: 'draft' })}>Avpublicera</button>
            ) : null}
          </div>
        )}
      </div>

      {msg && <div className={`alert ${msg.type}`} role="status">{msg.text}</div>}
      {sold && <div className="alert ok">Annonsen är såld för {new Intl.NumberFormat('sv-SE').format(a.sold_price)} kr. Kontakta köparen via meddelanden.</div>}
      {hasBids && !sold && <div className="alert warn">Det finns bud. Typ, pris, budsteg och tider är låsta. Reservationspriset kan bara sänkas.</div>}

      <div className="layout">
        <div className="stack" style={{ gap: 24 }}>
          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>Hur vill du sälja?</h2>
            <div className="choice-grid">
              {Object.entries(SALE_TYPES).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`choice${form.sale_type === k ? ' on' : ''}`}
                  aria-pressed={form.sale_type === k}
                  disabled={hasBids || sold}
                  onClick={() => choose('sale_type', k)}
                >
                  <b>{label}</b>
                  <span>{k === 'fixed' ? 'Fast pris, första köparen tar den' : k === 'auction' ? 'Högsta bud när tiden går ut' : 'Bud, eller köp direkt till ditt pris'}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>Bilder</h2>
            <label className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
              <span style={{ fontWeight: 600 }}>{uploading > 0 ? `Laddar upp… (${uploading} kvar)` : 'Dra hit bilder eller välj filer'}</span>
              <span className="hint">Första bilden blir huvudbild. Stora bilder förminskas automatiskt.</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
            </label>
            {images.length > 0 && (
              <div className="img-grid">
                {images.map((img, i) => (
                  <div key={img.id} className={`img-tile${i === 0 ? ' main' : ''}`}>
                    <img src={img.url} alt={`Bild ${i + 1}`} />
                    <div className="tools">
                      {i === 0 ? (
                        <button type="button" disabled style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>Huvudbild</button>
                      ) : (
                        <button type="button" onClick={() => imageAction(img.id, 'main')}>Gör huvud</button>
                      )}
                      <span className="row" style={{ gap: 4 }}>
                        <button type="button" aria-label="Flytta vänster" onClick={() => imageAction(img.id, 'left')}>←</button>
                        <button type="button" aria-label="Flytta höger" onClick={() => imageAction(img.id, 'right')}>→</button>
                        <button type="button" aria-label="Ta bort bild" onClick={() => imageAction(img.id, 'delete')}>✕</button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>Om annonsen</h2>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="category">Kategori</label>
                <select id="category" className="select" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="condition">Skick</label>
                <select id="condition" className="select" value={form.condition} onChange={set('condition')}>
                  <option value="begagnad">Begagnad</option>
                  <option value="ny">Ny</option>
                </select>
              </div>
            </div>
            {isCar ? (
              <div className="grid-2">
                <div className="field"><label htmlFor="make">Märke</label><input id="make" className="input" value={form.make} onChange={set('make')} placeholder="t.ex. Audi" /></div>
                <div className="field"><label htmlFor="model">Modell</label><input id="model" className="input" value={form.model} onChange={set('model')} placeholder="t.ex. S5 4.2 V8" /></div>
                <div className="field"><label htmlFor="year">Årsmodell</label><input id="year" className="input" inputMode="numeric" value={form.year} onChange={set('year')} placeholder="t.ex. 2011" /></div>
                <div className="field"><label htmlFor="location">Ort</label><input id="location" className="input" value={form.location} onChange={set('location')} placeholder="t.ex. Malmö" /></div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="headline">Rubrik</label>
                  <input id="headline" className="input" maxLength={140} value={form.headline} onChange={set('headline')} placeholder="t.ex. JHM Stage 2 kompressorkit till Audi S5 4.2" />
                </div>
                <div className="grid-2">
                  <div className="field"><label htmlFor="fits">Passar till</label><input id="fits" className="input" value={form.fits} onChange={set('fits')} placeholder="t.ex. Audi B8 S5 4.2 V8" /></div>
                  <div className="field"><label htmlFor="location">Ort</label><input id="location" className="input" value={form.location} onChange={set('location')} placeholder="t.ex. Malmö" /></div>
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="description">Beskrivning</label>
              <textarea id="description" rows={7} className="textarea" value={form.description} onChange={set('description')} placeholder="Skick, historik, vad som ingår…" />
            </div>
            <div className="field">
              <label htmlFor="known_issues">Kända fel (valfritt)</label>
              <textarea id="known_issues" rows={2} className="textarea" value={form.known_issues} onChange={set('known_issues')} />
            </div>
            <div className="field">
              <label htmlFor="viewing_delivery">Frakt och upphämtning (valfritt)</label>
              <textarea id="viewing_delivery" rows={2} className="textarea" value={form.viewing_delivery} onChange={set('viewing_delivery')} placeholder="t.ex. Skickas med PostNord, köparen betalar frakt. Kan hämtas i Malmö." />
            </div>
          </section>
        </div>

        <div className="stack" style={{ gap: 24 }}>
          <section className="card stack">
            <h2 style={{ fontSize: 18 }}>Pris</h2>
            {hasBuyNow && (
              <div className="field">
                <label htmlFor="buy_now_price">{form.sale_type === 'fixed' ? 'Pris (kr)' : 'Köp direkt-pris (kr)'}</label>
                <input id="buy_now_price" className="input" inputMode="numeric" value={form.buy_now_price} onChange={set('buy_now_price')} disabled={sold} />
                {form.sale_type === 'both' && <span className="hint">Försvinner när buden når upp till priset.</span>}
              </div>
            )}
            {isAuction && (
              <>
                <div className="field">
                  <label htmlFor="start_price">Utropspris (kr)</label>
                  <input id="start_price" className="input" inputMode="numeric" value={form.start_price} onChange={set('start_price')} disabled={hasBids || sold} />
                </div>
                <div className="field">
                  <label htmlFor="reserve_price">Reservationspris (kr, valfritt)</label>
                  <input id="reserve_price" className="input" inputMode="numeric" value={form.reserve_price} onChange={set('reserve_price')} disabled={sold} />
                  <span className="hint">Dolt lägsta pris. Når buden inte upp hit måste du inte sälja.</span>
                </div>
                <div className="field">
                  <label htmlFor="min_increment">Minsta budhöjning (kr)</label>
                  <input id="min_increment" className="input" inputMode="numeric" value={form.min_increment} onChange={set('min_increment')} disabled={hasBids || sold} />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="field"><label htmlFor="starts_at">Start</label><input id="starts_at" type="datetime-local" className="input" value={form.starts_at} onChange={set('starts_at')} disabled={hasBids || sold} /></div>
                  <div className="field"><label htmlFor="ends_at">Slut</label><input id="ends_at" type="datetime-local" className="input" value={form.ends_at} onChange={set('ends_at')} disabled={hasBids || sold} /></div>
                </div>
                <label className="check">
                  <input type="checkbox" checked={form.extend_enabled} onChange={set('extend_enabled')} disabled={hasBids || sold} />
                  <span>Förläng med {form.extend_minutes} min vid bud i slutet</span>
                </label>
              </>
            )}
          </section>

          {!sold && (
            <section className="card stack" style={{ gap: 12 }}>
              <h2 style={{ fontSize: 18 }}>Hantera</h2>
              {a.status === 'published' && (
                <button type="button" className="btn danger" disabled={busy} onClick={() => window.confirm('Avsluta annonsen? Den försvinner från sajten.') && save({ status: 'cancelled' })}>Avsluta annonsen</button>
              )}
              {!hasBids && <button type="button" className="btn danger" disabled={busy} onClick={remove}>Radera annonsen</button>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
