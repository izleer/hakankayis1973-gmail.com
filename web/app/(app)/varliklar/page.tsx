import type { Metadata } from 'next';
import Link from 'next/link';
import { AssetGrid } from '@/components/AssetCard';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icons';
import { api, requireViewer } from '@/lib/api';
import { formatNumber, typeIconName } from '@/lib/format';
import { getI18n, getT } from '@/lib/i18n/server';
import type { Asset, AssetType, Paged } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Varlıklar') };
}

type SearchParams = Promise<{ q?: string; type?: string; status?: string }>;

export default async function AssetsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireViewer();
  const { t, locale } = await getI18n();
  const params = await searchParams;
  const query = new URLSearchParams({ limit: '48', sort: 'updated' });
  if (params.q) query.set('q', params.q);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);

  const [assets, types] = await Promise.all([
    api<Paged<Asset>>(`/v1/assets?${query.toString()}`),
    api<{ items: AssetType[] }>('/v1/asset-types'),
  ]);

  const rootTypes = types.items;
  const activeType = params.type ?? '';
  const activeStatus = params.status ?? '';

  function href(next: { type?: string; status?: string }) {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    const type = next.type !== undefined ? next.type : activeType;
    const status = next.status !== undefined ? next.status : activeStatus;
    if (type) search.set('type', type);
    if (status) search.set('status', status);
    return `/varliklar${search.toString() ? `?${search.toString()}` : ''}`;
  }

  const clearHref = (() => {
    const search = new URLSearchParams();
    if (activeType) search.set('type', activeType);
    if (activeStatus) search.set('status', activeStatus);
    return `/varliklar${search.toString() ? `?${search.toString()}` : ''}`;
  })();

  const isFiltered = Boolean(params.q || activeType || activeStatus);

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Hafıza defteri')}</span>
          <h1>{t('Varlıkların')}</h1>
          <p>
            {t(
              '{count} parça; her biri kendi zamanını, bakımını ve hikâyesini taşıyor.',
              { count: assets.total },
            )}
          </p>
        </div>
        <Link href="/varliklar/yeni" className="btn btn-primary">
          <Icon name="plus" size={18} />
          {t('Yeni varlık')}
        </Link>
      </header>

      <div className="toolbar">
        <form className="search-form" action="/varliklar">
          {activeType ? <input type="hidden" name="type" value={activeType} /> : null}
          {activeStatus ? <input type="hidden" name="status" value={activeStatus} /> : null}
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
        <div className="segmented" aria-label={t('Durum')}>
          <Link href={href({ status: '' })} className={!activeStatus ? 'is-active' : ''}>
            {t('Tümü')}
          </Link>
          <Link href={href({ status: 'active' })} className={activeStatus === 'active' ? 'is-active' : ''}>
            {t('Güncel')}
          </Link>
          <Link
            href={href({ status: 'archived' })}
            className={activeStatus === 'archived' ? 'is-active' : ''}
          >
            {t('Arşivlenen')}
          </Link>
        </div>
      </div>

      {isFiltered ? (
        <p className="result-line" role="status">
          <strong>{formatNumber(assets.total, locale)}</strong>{' '}
          {t('sonuç', { count: assets.total })}
          {params.q ? <> · “{params.q}”</> : null}
          <Link href="/varliklar">{t('Filtreleri temizle')}</Link>
        </p>
      ) : null}

      <div className="filter-row">
        <Link href={href({ type: '' })} className={`chip${!activeType ? ' is-active' : ''}`}>
          <Icon name="grid" size={15} />
          {t('Tüm türler')}
        </Link>
        {rootTypes.map((type) => (
          <Link
            key={type.id}
            href={href({ type: type.id })}
            className={`chip${activeType === type.id ? ' is-active' : ''}`}
          >
            <Icon name={typeIconName(type.icon)} size={15} />
            {type.label}
          </Link>
        ))}
      </div>

      {assets.items.length > 0 ? (
        <AssetGrid assets={assets.items} />
      ) : (
        <EmptyState
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
