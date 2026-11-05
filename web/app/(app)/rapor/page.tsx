import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icons';
import { MediaImage } from '@/components/MediaImage';
import { api, requireViewer } from '@/lib/api';
import { formatDate, formatLocation, formatNumber, typeIconName } from '@/lib/format';
import { getI18n, getT } from '@/lib/i18n/server';
import type { Asset, AssetType, Paged } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Raporlar') };
}

type SearchParams = Promise<{ q?: string; type?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireViewer();
  const { t, locale } = await getI18n();
  const params = await searchParams;
  const query = new URLSearchParams({ limit: '48', sort: 'updated' });
  if (params.q) query.set('q', params.q);
  if (params.type) query.set('type', params.type);

  const [assets, types] = await Promise.all([
    api<Paged<Asset>>(`/v1/assets?${query.toString()}`),
    api<{ items: AssetType[] }>('/v1/asset-types'),
  ]);

  const activeType = params.type ?? '';
  const isFiltered = Boolean(params.q || activeType);
  const clearHref = activeType ? `/rapor?type=${encodeURIComponent(activeType)}` : '/rapor';

  function typeHref(type: string) {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (type) search.set('type', type);
    return `/rapor${search.toString() ? `?${search.toString()}` : ''}`;
  }

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Yazdırılabilir kayıtlar')}</span>
          <h1>{t('Raporlar')}</h1>
          <p>
            {t(
              'Bir varlık seç; künyesi, konumu, ölçümleri ve hikâyesi tek bir ayrıntılı raporda toplansın.',
            )}
          </p>
        </div>
      </header>

      <div className="toolbar">
        <form className="search-form" action="/rapor">
          {activeType ? <input type="hidden" name="type" value={activeType} /> : null}
          <Icon name="search" size={18} />
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder={t('Varlık, tür ya da not ara…')}
            aria-label={t('Varlık ara')}
          />
          {params.q ? (
            <Link
              href={clearHref}
              className="search-clear"
              aria-label={t('Aramayı temizle')}
              title={t('Aramayı temizle')}
            >
              <Icon name="close" size={15} />
            </Link>
          ) : null}
          <button type="submit" className="search-submit">
            {t('Ara')}
          </button>
        </form>
      </div>

      {isFiltered ? (
        <p className="result-line" role="status">
          <strong>{formatNumber(assets.total, locale)}</strong> {t('sonuç', { count: assets.total })}
          {params.q ? <> · “{params.q}”</> : null}
          <Link href="/rapor">{t('Filtreleri temizle')}</Link>
        </p>
      ) : null}

      <div className="filter-row">
        <Link href={typeHref('')} className={`chip${!activeType ? ' is-active' : ''}`}>
          <Icon name="grid" size={15} />
          {t('Tüm türler')}
        </Link>
        {types.items.map((type) => (
          <Link
            key={type.id}
            href={typeHref(type.id)}
            className={`chip${activeType === type.id ? ' is-active' : ''}`}
          >
            <Icon name={typeIconName(type.icon)} size={15} />
            {type.label}
          </Link>
        ))}
      </div>

      {assets.items.length > 0 ? (
        <div className="report-picker">
          {assets.items.map((asset) => (
            <Link
              key={asset.id}
              href={`/rapor/${asset.id}`}
              className="report-picker-card"
              aria-label={t('{title} raporunu aç', { title: asset.title })}
            >
              <span className="report-picker-media">
                <MediaImage
                  src={asset.coverUrl}
                  alt={asset.title}
                  fallbackIcon={typeIconName(asset.type.icon)}
                />
              </span>
              <span className="report-picker-body">
                <span className="report-picker-kicker">
                  <span>
                    <Icon name={typeIconName(asset.type.icon)} size={14} />
                    {asset.type.label}
                  </span>
                  <span>{formatLocation(asset.locationName, locale) || t('Konum bilgisi yok')}</span>
                </span>
                <strong>{asset.title}</strong>
                {asset.description ? <small>{asset.description}</small> : null}
                <span className="report-picker-meta">
                  {t('{count} kayıt', { count: asset.entryCount })} · {t('Son iz')}{' '}
                  {formatDate(asset.updatedAt, locale)}
                </span>
              </span>
              <span className="report-picker-cta">
                {t('Raporu aç')}
                <Icon name="arrow-right" size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="file"
          title={params.q ? t('Bu aramada bir iz yok') : t('Bu filtrede varlık yok')}
          body={
            params.q
              ? t('Farklı bir kelime dene ya da filtreleri temizle.')
              : t('Yeni bir varlık ekleyerek hafızanı genişletebilirsin.')
          }
          action={{ href: '/varliklar/yeni', label: t('Yeni varlık ekle') }}
        />
      )}
    </main>
  );
}
