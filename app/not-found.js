import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingTop: 64, maxWidth: 560 }}>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Sidan finns inte</h1>
      <p className="muted">Auktionen kan ha tagits bort eller länken är fel.</p>
      <Link href="/" className="btn" style={{ marginTop: 16 }}>Till auktionerna</Link>
    </div>
  );
}
