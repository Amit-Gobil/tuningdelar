'use client';

import { useState } from 'react';

export default function ProfileForm({ name, email: e0, phone: p0 }) {
  const [email, setEmail] = useState(e0);
  const [phone, setPhone] = useState(p0);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, phone }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { type: 'ok', text: 'Sparat.' } : { type: 'err', text: data.error || 'Kunde inte spara.' });
  }

  return (
    <form onSubmit={save} className="card stack" style={{ maxWidth: 520 }}>
      <div><div className="label-cap">Namn (från BankID)</div><div style={{ fontWeight: 600 }}>{name}</div></div>
      <div className="field">
        <label htmlFor="email">Mejl</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="phone">Telefon</label>
        <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <p className="hint" style={{ margin: 0 }}>Visas aldrig publikt. Används så att köpare och säljare kan nå varandra efter en affär.</p>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
      <button type="submit" className="btn" disabled={busy}>Spara</button>
    </form>
  );
}
