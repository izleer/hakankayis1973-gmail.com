import type { Metadata } from 'next';
import Link from 'next/link';
import { AssetGrid } from '@/components/AssetCard';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icons';
import { MediaImage } from '@/components/MediaImage';
import { requireViewer, api } from '@/lib/api';
import {
  entryTypeLabels,
  formatDate,
  formatDayNumber,
  formatMonthYear,
  formatNumber,
  mediaSrc,
  typeIconName,
} from '@/lib/format';
import { getI18n, getT } from '@/lib/i18n/server';
import type { ArchiveResponse, Asset, Paged, Stats } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Hafıza') };
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const { t, locale, tag } = await getI18n();
  const [stats, assets, media] = await Promise.all([
    api<Stats>('/v1/stats'),
    api<Paged<Asset>>('/v1/assets?limit=6&sort=updated'),
    api<ArchiveResponse>('/v1/media?limit=6&kind=image'),
  ]);

  const today = new Intl.DateTimeFormat(tag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });

  const heroAsset = assets.items.find((asset) => asset.coverUrl) ?? assets.items[0] ?? null;
  const firstName = viewer.displayName.split(' ')[0];

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-topline">
            <span className="eyebrow eyebrow-light">{t('Hafıza defteri')}</span>
            <span className="hero-date">{today.format(new Date())}</span>
          </div>
          <div className="hero-main">
            <h1>
              {t('Her şeyin')}
              <br />
              {t('bir hafızası var.')}
            </h1>
            <p>
              {t(
                '{name}, büyüttüğün, baktığın ya da biriktirdiğin her şeyin izini burada tut. Fotoğraflar, belgeler ve küçük notlar zamanla bir hikâyeye dönüşsün.',
                { name: firstName },
              )}
            </p>
            <div className="hero-actions">
              <Link href="/varliklar/yeni" className="btn btn-paper">
                <Icon name="plus" size={18} />
                {t('Yeni varlık')}
              </Link>
              <Link href="/arsiv" className="btn btn-ghost-light">
                {t('Arşivi gör')}
                <Icon name="arrow-right" size={17} />
              </Link>
            </div>
          </div>
          <div className="hero-numbers">
            <span>
              <strong>{formatNumber(stats.assets, locale)}</strong> {t('varlık', { count: stats.assets })}
            </span>
            <span>
              <strong>{formatNumber(stats.entries, locale)}</strong> {t('kayıt', { count: stats.entries })}
            </span>
            <span>
              <strong>{formatNumber(stats.images, locale)}</strong> {t('fotoğraf', { count: stats.images })}
            </span>
          </div>
        </div>

        <div className="hero-image">
          {heroAsset ? (
            <Link href={`/varliklar/${heroAsset.id}`} className="hero-image-link">
              <MediaImage
                src={heroAsset.coverUrl}
                alt={heroAsset.title}
                fallbackIcon={typeIconName(heroAsset.type.icon)}
                loading="eager"
              />
              <span className="hero-image-caption">
                <span className="eyebrow eyebrow-light">{t('Son iz')}</span>
                <strong>{heroAsset.title}</strong>
                <small>
                  {heroAsset.type.label} · {formatDate(heroAsset.updatedAt, locale)}
                </small>
              </span>
              <span className="hero-image-mark">
                <Icon name="arrow-right" size={18} />
              </span>
            </Link>
          ) : (
            <div className="hero-image-empty">
              <Icon name="leaf" size={40} />
              <p>{t('İlk varlığını ekle, hafızan burada başlasın.')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="stats" aria-label={t('Hafıza özeti')}>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="leaf" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.assets, locale)}</strong>
            <span>{t('Varlık')}</span>
          </div>
          <small>
            {t('{count} herkese açık', { count: formatNumber(stats.publicAssets, locale) })}
          </small>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="book" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.entries, locale)}</strong>
            <span>{t('Hafıza kaydı')}</span>
          </div>
          <small>
            {t('Son 30 günde {count} yeni iz', { count: stats.recentEntries.length })}
          </small>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="image" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.images, locale)}</strong>
            <span>{t('Fotoğraf')}</span>
          </div>
          <small>
            {stats.videos} {t('video', { count: stats.videos })}
          </small>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="file" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.documents, locale)}</strong>
            <span>{t('Belge')}</span>
          </div>
          <small>
            <Link href="/arkadaslar?tab=assets" className="stat-link">
              {t('{count} paylaşılan varlık', { count: stats.sharedWithMe })}
              <Icon name="arrow-right" size={12} />
            </Link>
          </small>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t('Sahip oldukların')}</span>
            <h2>{t('Varlıkların')}</h2>
          </div>
          <Link href="/varliklar" className="text-link">
            {t('Tümünü gör')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        {assets.items.length > 0 ? (
          <AssetGrid assets={assets.items} />
        ) : (
          <EmptyState
            title={t('Hafızan henüz boş')}
            body={t('İlk bonsain, kedin, tablon ya da evinle başla. Bir fotoğraf ve kısa bir not yeterli.')}
            action={{ href: '/varliklar/yeni', label: t('İlk varlığı ekle') }}
          />
        )}
      </section>

      <div className="split-section">
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Zaman çizelgesi')}</span>
              <h2>{t('Son izler')}</h2>
            </div>
            <Link href="/arsiv" className="text-link">
              {t('Arşiv')}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          {stats.recentEntries.length > 0 ? (
            <div className="mini-timeline">
              {stats.recentEntries.slice(0, 5).map((entry) => {
                const photo = entry.media.find((item) => item.kind === 'image');
                return (
                  <Link
                    key={entry.id}
                    href={`/varliklar/${entry.assetId}`}
                    className="mini-entry"
                  >
                    <span className="mini-entry-date">
                      <strong>{formatDayNumber(entry.occurredAt, locale)}</strong>
                      <small>{formatMonthYear(entry.occurredAt, locale)}</small>
                    </span>
                    <span className="mini-entry-body">
                      <span className="mini-entry-kicker">
                        {t(entryTypeLabels[entry.type])} · {entry.asset?.title ?? t('Varlık')}
                      </span>
                      <strong>{entry.title ?? t('İsimsiz kayıt')}</strong>
                      {entry.body ? <small>{entry.body}</small> : null}
                    </span>
                    {photo ? (
                      <span className="mini-entry-thumb">
                        <MediaImage src={mediaSrc(photo.url)} alt="" />
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted-note">
              {t('Henüz kayıt yok. İlk notunu eklediğinde burada görünecek.')}
            </p>
          )}
        </section>

        <aside className="manifesto">
          <span className="eyebrow eyebrow-light">{t('Neden hafıza?')}</span>
          <blockquote>
            {t(
              '“Bir yaprağın açması bir günde olur; onu fark etmek için yıllarca aynı yere bakmak gerekir.”',
            )}
          </blockquote>
          <p>
            {t(
              'izleer, yalnızca envanter tutmaz. Bakımın, değişimin ve biriktirdiğin anların arasındaki bağı görünür kılar.',
            )}
          </p>
          <div className="manifesto-stats">
            <span>
              <strong>{stats.images + stats.documents}</strong>
              {t('arşiv parçası', { count: stats.images + stats.documents })}
            </span>
            <span>
              <strong>{stats.following}</strong>
              {t('takip edilen hafıza', { count: stats.following })}
            </span>
          </div>
        </aside>
      </div>

      {media.items.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Son eklenenler')}</span>
              <h2>{t('Arşivden')}</h2>
            </div>
            <Link href="/arsiv" className="text-link">
              {t('Tüm arşiv')}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="strip">
            {media.items.map((item) => (
              <Link key={item.id} href={`/varliklar/${item.asset.id}`} className="strip-item">
                <MediaImage src={mediaSrc(item.url)} alt={item.asset.title} />
                <span>
                  <strong>{item.asset.title}</strong>
                  <small>{formatDate(item.createdAt, locale)}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
