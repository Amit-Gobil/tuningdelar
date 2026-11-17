import Link from 'next/link';
import { bankidConfigured } from '@/lib/config';
import { safeNext } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Logga in med BankID' };

const ERRORS = {
  cancelled: 'Inloggningen avbröts.',
  state: 'Inloggningen gick ut eller kunde inte verifieras. Försök igen.',
  failed: 'Inloggningen misslyckades. Försök igen.',
  not_configured: 'BankID är inte aktiverat på sajten än.'
};

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = safeNext(sp?.next || '/');
  const err = sp?.error && ERRORS[sp.error];
  const ready = bankidConfigured();

  return (
    <div className="wrap" style={{ maxWidth: 520, paddingTop: 48 }}>
      <div className="card stack" style={{ gap: 22 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--warn-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 10 }}>Verifiera dig med BankID</h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--soft)', margin: 0 }}>
            Alla bud och köp är bindande. Därför identifierar sig alla med BankID, så att du vet att du gör affärer med en riktig person.
          </p>
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', fontSize: 14, lineHeight: 1.8 }}>
          <li>Du loggar in med BankID</li>
          <li>Andra ser bara ditt förnamn, aldrig ditt personnummer</li>
          <li>Köpare och säljare sköter betalning och överlämning via meddelanden</li>
        </ol>
        {err && <div className="alert err">{err}</div>}
        {ready ? (
          <a className="btn block" href={`/api/auth/login?next=${encodeURIComponent(next)}`}>Logga in med BankID</a>
        ) : (
          <div className="alert warn">{ERRORS.not_configured}</div>
        )}
        <div className="hint" style={{ textAlign: 'center' }}>
          Genom att logga in godkänner du <Link href="/villkor" style={{ color: 'var(--accent)' }}>villkoren</Link>.
        </div>
      </div>
    </div>
  );
}
