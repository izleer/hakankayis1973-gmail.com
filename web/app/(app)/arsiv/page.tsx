import type { Metadata } from 'next';
import Link from 'next/link';
import { ArchiveGallery } from '@/components/ArchiveGallery';
import { Icon } from '@/components/Icons';
import { api, requireViewer } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { getI18n, getT } from '@/lib/i18n/server';
import type { ArchiveResponse, Stats } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Arşiv') };
}

type SearchParams = Promise<{ kind?: string; q?: string }>;

const kinds = [
  { id: 'all', label: 'Tümü', icon: 'archive' as const },
  { id: 'image', label: 'Fotoğraf', icon: 'image' as const },
  { id: 'document', label: 'Belge', icon: 'file' as const },
  { id: 'video', label: 'Video', icon: 'camera' as const },
];

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const { t, locale } = await getI18n();
  await requireViewer();
  const params = await searchParams;
  const kind = kinds.some((item) => item.id === params.kind) ? params.kind! : 'all';
  const query = params.q?.trim() ?? '';

  const search = new URLSearchParams({ kind, limit: '36' });
  if (query) search.set('q', query);

  const [archive, stats] = await Promise.all([
    api<ArchiveResponse>(`/v1/media?${search.toString()}`),
    api<Stats>('/v1/stats'),
  ]);

  function href(next: { kind?: string; q?: string }) {
    const nextSearch = new URLSearchParams();
    const nextKind = next.kind ?? kind;
    const nextQuery = next.q !== undefined ? next.q : query;
    if (nextKind !== 'all') nextSearch.set('kind', nextKind);
    if (nextQuery) nextSearch.set('q', nextQuery);
    return `/arsiv${nextSearch.toString() ? `?${nextSearch.toString()}` : ''}`;
  }

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Kâğıt, ışık ve iz')}</span>
          <h1>{t('Arşiv')}</h1>
          <p>
            {t(
              'Varlıklarının fotoğrafları, belgeleri ve videoları tek bir yerde. Bir parçaya dokunduğunda büyür, bağlı olduğu hafızaya götürür.',
            )}
          </p>
        </div>
        <Link href="/varliklar" className="btn btn-ghost">
          <Icon name="grid" size={17} />
          {t('Varlıklar')}
        </Link>
      </header>

      <section className="archive-summary" aria-label={t('Arşiv özeti')}>
        <div>
          <span>{t('Toplam parça')}</span>
          <strong>{formatNumber(stats.images + stats.documents + stats.videos, locale)}</strong>
        </div>
        <div>
          <span>{t('Fotoğraf')}</span>
          <strong>{formatNumber(stats.images, locale)}</strong>
        </div>
        <div>
          <span>{t('Belge')}</span>
          <strong>{formatNumber(stats.documents, locale)}</strong>
        </div>
        <div>
          <span>{t('Video')}</span>
          <strong>{formatNumber(stats.videos, locale)}</strong>
        </div>
      </section>

      <div className="toolbar archive-toolbar-page">
        <div className="segmented" aria-label={t('Arşiv türü')}>
          {kinds.map((item) => (
            <Link
              key={item.id}
              href={href({ kind: item.id })}
              className={kind === item.id ? 'is-active' : ''}
            >
              <Icon name={item.icon} size={15} />
              {t(item.label)}
            </Link>
          ))}
        </div>
        <form className="search-form" action="/arsiv">
          {kind !== 'all' ? <input type="hidden" name="kind" value={kind} /> : null}
          <Icon name="search" size={18} />
          <input
            name="q"
            defaultValue={query}
            placeholder={t('Varlık ya da dosya adı ara…')}
            aria-label={t('Arşivde ara')}
          />
          <button type="submit" className="search-submit">
            {t('Ara')}
          </button>
        </form>
      </div>

      {query ? (
        <p className="archive-filter-note">
          {t('“{query}” için {count} parça bulundu', {
            query,
            count: archive.counts.total,
          })}
          {' · '}
          <Link href={href({ q: '' })}>{t('aramayı temizle')}</Link>
        </p>
      ) : (
        <p className="archive-filter-note">
          {t('{count} parça · her biri bir varlığın hafızasına bağlı', {
            count: archive.counts.total,
          })}
        </p>
      )}

      <ArchiveGallery initial={archive} kind={kind} query={query} />
    </main>
  );
}
