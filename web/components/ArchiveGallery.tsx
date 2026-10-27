'use client';

import Link from 'next/link';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { formatBytes, formatDate, typeIconName } from '@/lib/format';
import type { ArchiveItem, ArchiveResponse } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

export function ArchiveGallery({
  initial,
  kind,
  query,
}: {
  initial: ArchiveResponse;
  kind: string;
  query: string;
}) {
  const [items, setItems] = useState<ArchiveItem[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);

  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    setError(null);
    try {
      const search = new URLSearchParams({ kind, limit: '36', cursor });
      if (query) search.set('q', query);
      const data = await vh.get<ArchiveResponse>(`media?${search.toString()}`);
      setItems((current) => [...current, ...data.items]);
      setCursor(data.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Arşivin devamı yüklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon">
          <Icon name="archive" size={28} />
        </span>
        <h3>Burada henüz bir parça yok</h3>
        <p>
          {query
            ? 'Farklı bir kelime dene ya da filtreyi değiştir.'
            : 'Varlıklarına fotoğraf ve belge ekledikçe arşivin burada büyüyecek.'}
        </p>
        <Link href="/varliklar" className="btn btn-primary btn-sm">
          Varlıklara git
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="archive-page-grid">
        {items.map((item) => (
          <article className="archive-page-item" key={item.id}>
            {item.kind === 'image' ? (
              <button
                type="button"
                className="archive-page-media"
                onClick={() =>
                  setLightbox({ url: item.url ?? '', alt: item.asset.title })
                }
              >
                <MediaImage src={item.url} alt={item.asset.title} />
                <span className="archive-page-zoom">
                  <Icon name="search" size={16} />
                </span>
              </button>
            ) : (
              <a
                className="archive-page-media is-document"
                href={item.url ?? '#'}
                target="_blank"
                rel="noreferrer"
              >
                <span className="archive-page-file">
                  <Icon name={item.kind === 'video' ? 'camera' : 'file'} size={30} />
                  <small>{item.mimeType.split('/')[1]?.toUpperCase() ?? 'DOSYA'}</small>
                </span>
              </a>
            )}
            <div className="archive-page-info">
              <span className="archive-page-kicker">
                <Icon name={typeIconName(null)} size={13} />
                {item.asset.typeLabel}
              </span>
              <Link href={`/varliklar/${item.asset.id}`} className="archive-page-title">
                {item.asset.title}
              </Link>
              <p className="archive-page-meta">
                <span>{formatDate(item.createdAt)}</span>
                {item.entry?.title ? <span>{item.entry.title}</span> : null}
                <span>{formatBytes(item.byteSize)}</span>
              </p>
            </div>
          </article>
        ))}
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {cursor ? (
        <div className="archive-more">
          <button type="button" className="btn btn-ghost" onClick={loadMore} disabled={busy}>
            {busy ? 'Yükleniyor…' : 'Daha fazla göster'}
            {!busy ? <Icon name="chevron-down" size={17} /> : null}
          </button>
          <small>{items.length} parça gösteriliyor</small>
        </div>
      ) : (
        <p className="archive-end">Arşivin sonuna geldin · {items.length} parça</p>
      )}

      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button type="button" className="lightbox-close" aria-label="Kapat">
            <Icon name="close" size={22} />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.alt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
