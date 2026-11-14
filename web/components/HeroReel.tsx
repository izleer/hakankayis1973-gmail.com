'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { MediaImage } from './MediaImage';

export type HeroReelItem = {
  id: string;
  src: string;
  alt: string;
  href: string;
};

/**
 * Ana sayfa hero'sundaki küçük anı şeridi. Görselleri 2 saniyede bir
 * bir adım kaydırır; fare/klavye odağında durur, reduced-motion'da sabit kalır.
 */
export function HeroReel({ items, label }: { items: HeroReelItem[]; label: string }) {
  const [offset, setOffset] = useState(0);
  const [instant, setInstant] = useState(false);
  const [paused, setPaused] = useState(false);

  // Başa dönüşü animasyon tamamlandıktan sonra, sıçramasız yap.
  useEffect(() => {
    if (offset !== items.length) return;
    const timer = window.setTimeout(() => {
      setInstant(true);
      setOffset(0);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setInstant(false));
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [offset, items.length]);

  useEffect(() => {
    // Az sayıda görselde pencere boşalmasın; şerit sabit kalsın.
    if (paused || items.length < 4) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setOffset((value) => value + 1), 2000);
    return () => window.clearInterval(timer);
  }, [paused, items.length]);

  if (items.length === 0) return null;

  const loop = items.length >= 4 ? [...items, ...items] : items;

  return (
    <div
      className={`hero-reel${items.length < 4 ? ' is-static' : ''}`}
      role="group"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      style={{ '--reel-shift': offset } as CSSProperties}
    >
      <div className={`hero-reel-track${instant ? ' no-transition' : ''}`}>
        {loop.map((item, position) => {
          const duplicate = position >= items.length;
          return (
            <Link
              key={`${item.id}-${position}`}
              href={item.href}
              className="hero-reel-item"
              aria-hidden={duplicate || undefined}
              tabIndex={duplicate ? -1 : 0}
              title={item.alt}
            >
              <MediaImage src={item.src} alt={duplicate ? '' : item.alt} loading="eager" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
