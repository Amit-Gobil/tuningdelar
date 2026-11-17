import './globals.css';
import Link from 'next/link';
import { SITE_NAME, COMPANY_NAME } from '@/lib/config';
import { getBidder } from '@/lib/session';
import { unreadCount } from '@/lib/messaging';

export const metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: 'Köp och sälj trimdelar och bilar. Auktion eller köp direkt, alla verifierade med BankID.'
};

export const viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }) {
  let user = null;
  let unread = 0;
  try {
    user = await getBidder();
    if (user) unread = await unreadCount(user.id);
  } catch {
    user = null;
  }
  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="header">
          <div className="wrap">
            <div className="header-left">
              <Link href="/" className="logo">{SITE_NAME.toLowerCase()}</Link>
              <nav className="nav" aria-label="Huvudmeny">
                <Link href="/">Annonser</Link>
                <Link href="/?typ=auktion">Auktioner</Link>
                <Link href="/?kat=bilar">Bilar</Link>
              </nav>
            </div>
            {user ? (
              <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                <Link href="/konto?flik=meddelanden" className="btn ghost small" aria-label={`Meddelanden${unread ? `, ${unread} olästa` : ''}`}>
                  Meddelanden{unread > 0 && <span className="badge">{unread}</span>}
                </Link>
                <Link href="/konto" className="btn ghost small">Mitt konto</Link>
                <form method="post" action="/api/listings" className="hide-sm">
                  <button type="submit" className="btn small">+ Sälj</button>
                </form>
              </div>
            ) : (
              <Link href="/logga-in" className="btn small">Logga in med BankID</Link>
            )}
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap">
            <span>{SITE_NAME} · {COMPANY_NAME}</span>
            <span className="row" style={{ gap: 20 }}>
              <Link href="/villkor">Villkor</Link>
              {user && (
                <form action="/api/auth/logout" method="post">
                  <button type="submit" style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', font: 'inherit', padding: 0 }}>Logga ut</button>
                </form>
              )}
              <Link href="/admin">Admin</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
