'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n/client';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

/**
 * Ücretsiz plan sayfalarında gösterilen reklam alanı. Yayıncı kimliği ve
 * birim kimliği tanımlıysa AdSense kutusunu basar; tanımlı değilse nötr bir
 * yer tutucu gösterir. Premium kullanıcılarda bileşen hiç oluşturulmaz.
 */
export function AdSlot({ client, slot }: { client: string; slot: string }) {
  const t = useT();
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);
  const ready = client !== '' && slot !== '';

  useEffect(() => {
    if (!ready || pushed.current) return;
    const element = insRef.current;
    // React yeniden bağlarken aynı kutuya ikinci kez istek göndermeyi önle.
    if (!element || element.getAttribute('data-adsbygoogle-status')) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Betik henüz yüklenmediyse istek adsbygoogle kuyruğuna alınır.
    }
  }, [ready]);

  if (!ready) {
    return (
      <aside className="ad-slot ad-slot-placeholder" aria-label={t('Reklam alanı')}>
        <span className="ad-tag">{t('Reklam')}</span>
        <p>
          {t('Reklamlar ücretsiz planda görünür. Premium ile reklamsız.')}{' '}
          <Link href="/plan">{t('Reklamsız kullanım')}</Link>
        </p>
      </aside>
    );
  }

  return (
    <aside className="ad-slot" aria-label={t('Reklam alanı')}>
      <span className="ad-tag">{t('Reklam')}</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
