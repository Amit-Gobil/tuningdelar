'use client';

import { useCallback, useEffect, useState } from 'react';

export default function Gallery({ images }) {
  const [open, setOpen] = useState(null);
  const count = images?.length || 0;

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d) => setOpen((i) => (i === null ? i : (i + d + count) % count)), [count]);

  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close, step]);

  if (!count) return <div className="mosaic-empty">Bilder kommer snart</div>;

  const shown = images.slice(0, 5);
  const cls = count === 1 ? 'mosaic one' : count < 5 ? 'mosaic few' : 'mosaic';

  return (
    <>
      <section aria-label="Bilder" className={cls}>
        {shown.map((img, i) => (
          <button key={img.id} type="button" onClick={() => setOpen(i)} aria-label={`Visa bild ${i + 1} av ${count}`}>
            <img src={img.url} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            {i === shown.length - 1 && count > 1 && <span className="all">Visa alla {count} bilder</span>}
          </button>
        ))}
      </section>

      {open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Bildvisning" onClick={(e) => e.target === e.currentTarget && close()}>
          <img src={images[open].url} alt={`Bild ${open + 1} av ${count}`} />
          <button type="button" className="lb-btn" style={{ top: 20, right: 20 }} onClick={close} aria-label="Stäng">✕</button>
          {count > 1 && (
            <>
              <button type="button" className="lb-btn" style={{ left: 20, top: '50%' }} onClick={() => step(-1)} aria-label="Föregående bild">‹</button>
              <button type="button" className="lb-btn" style={{ right: 20, top: '50%' }} onClick={() => step(1)} aria-label="Nästa bild">›</button>
            </>
          )}
          <div className="lb-count">{open + 1} / {count}</div>
        </div>
      )}
    </>
  );
}
