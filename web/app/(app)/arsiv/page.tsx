import Link from 'next/link';
import { ArchiveGallery } from '@/components/ArchiveGallery';
import { Icon } from '@/components/Icons';
import { api, requireViewer } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { ArchiveResponse, Stats } from '@/lib/types';

export const metadata = { title: 'Arşiv' };

type SearchParams = Promise<{ kind?: string; q?: string }>;

const kinds = [
  { id: 'all', label: 'Tümü', icon: 'archive' as const },
  { id: 'image', label: 'Fotoğraf', icon: 'image' as const },
  { id: 'document', label: 'Belge', icon: 'file' as const },
  { id: 'video', label: 'Video', icon: 'camera' as const },
];

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
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
          <span className="eyebrow">Kâğıt, ışık ve iz</span>
          <h1>Arşiv</h1>
          <p>
            Varlıklarının fotoğrafları, belgeleri ve videoları tek bir yerde. Bir
            parçaya dokunduğunda büyür, bağlı olduğu hafızaya götürür.
          </p>
        </div>
        <Link href="/varliklar" className="btn btn-ghost">
          <Icon name="grid" size={17} />
          Varlıklar
        </Link>
      </header>

      <section className="archive-summary" aria-label="Arşiv özeti">
        <div>
          <span>Toplam parça</span>
          <strong>{formatNumber(stats.images + stats.documents + stats.videos)}</strong>
        </div>
        <div>
          <span>Fotoğraf</span>
          <strong>{formatNumber(stats.images)}</strong>
        </div>
        <div>
          <span>Belge</span>
          <strong>{formatNumber(stats.documents)}</strong>
        </div>
        <div>
          <span>Video</span>
          <strong>{formatNumber(stats.videos)}</strong>
        </div>
      </section>

      <div className="toolbar archive-toolbar-page">
        <div className="segmented" aria-label="Arşiv türü">
          {kinds.map((item) => (
            <Link
              key={item.id}
              href={href({ kind: item.id })}
              className={kind === item.id ? 'is-active' : ''}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </Link>
          ))}
        </div>
        <form className="search-form" action="/arsiv">
          {kind !== 'all' ? <input type="hidden" name="kind" value={kind} /> : null}
          <Icon name="search" size={18} />
          <input
            name="q"
            defaultValue={query}
            placeholder="Varlık ya da dosya adı ara…"
            aria-label="Arşivde ara"
          />
          <button type="submit" className="search-submit">
            Ara
          </button>
        </form>
      </div>

      {query ? (
        <p className="archive-filter-note">
          “{query}” için {archive.counts.total} parça bulundu ·{' '}
          <Link href={href({ q: '' })}>aramayı temizle</Link>
        </p>
      ) : (
        <p className="archive-filter-note">
          {archive.counts.total} parça · her biri bir varlığın hafızasına bağlı
        </p>
      )}

      <ArchiveGallery initial={archive} kind={kind} query={query} />
    </main>
  );
}
