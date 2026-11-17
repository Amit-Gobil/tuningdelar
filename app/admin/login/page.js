export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin – logga in' };

export default async function AdminLogin({ searchParams }) {
  const sp = await searchParams;
  const error =
    sp?.error === 'setup'
      ? 'ADMIN_PASSWORD är inte satt i Vercel (minst 10 tecken).'
      : sp?.error
        ? 'Fel lösenord.'
        : null;
  return (
    <div className="wrap" style={{ maxWidth: 420, paddingTop: 64 }}>
      <form className="card stack" method="post" action="/api/admin/login">
        <h1 style={{ fontSize: 26 }}>Admin</h1>
        {error && <div className="alert err">{error}</div>}
        <div className="field">
          <label htmlFor="password">Lösenord</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        <button type="submit" className="btn block">Logga in</button>
      </form>
    </div>
  );
}
