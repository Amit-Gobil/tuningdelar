'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const fmt = (iso) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default function Chat({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text })
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMessages((m) => [...m, data.message]);
      setText('');
    } else setErr(data.error || 'Kunde inte skicka.');
  }

  return (
    <div className="chat card">
      <div className="chat-log">
        {messages.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: 24 }}>Inga meddelanden än. Skriv något!</div>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble${m.mine ? ' mine' : ''}`}>
            <div>{m.body}</div>
            <span>{fmt(m.created_at)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="chat-form">
        <label htmlFor="msg" className="sr-only">Meddelande</label>
        <textarea
          id="msg"
          rows={2}
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
          placeholder="Skriv ett meddelande…"
        />
        <button type="submit" className="btn" disabled={busy || !text.trim()}>Skicka</button>
      </form>
      {err && <div className="alert err" style={{ marginTop: 8 }}>{err}</div>}
      <p className="hint" style={{ margin: '8px 0 0' }}>Betala aldrig innan du sett varan eller har en trygg betalningslösning.</p>
    </div>
  );
}
