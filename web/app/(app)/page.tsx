import type { Metadata } from 'next';
import Link from 'next/link';
import { AssetGrid } from '@/components/AssetCard';
import { EmptyState } from '@/components/EmptyState';
import { HeroReel, type HeroReelItem } from '@/components/HeroReel';
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
} from '@/lib/format';
import { getI18n, getT } from '@/lib/i18n/server';
import type {
  ArchiveResponse,
  Asset,
  GroupSummaryResponse,
  Paged,
  Stats,
} from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Hafıza') };
}

/** Kapak görseli olmayan gruplara isimden türeyen, kararlı bir görsel kimlik ver. */
function groupMark(name: string, locale: string) {
  const words = name
    .split(/\s+/)
    .filter((word) => word && word.toLocaleLowerCase(locale) !== 've');
  const label = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toLocaleUpperCase(locale);
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 5;
  }
  return { label: label || '?', tone: hash };
}

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const { t, locale, tag } = await getI18n();
  const [stats, assets, media, groups] = await Promise.all([
    api<Stats>('/v1/stats'),
    api<Paged<Asset>>('/v1/assets?limit=6&sort=updated'),
    api<ArchiveResponse>('/v1/media?limit=6&kind=image'),
    api<GroupSummaryResponse>('/v1/stats/groups'),
  ]);

  const today = new Intl.DateTimeFormat(tag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });

  const firstName = viewer.displayName.split(' ')[0];

  // Hero şeridinde önce son yüklenen görseller, yetmezse varlık kapakları döner.
  const reelItems: HeroReelItem[] = [];
  const reelSeen = new Set<string>();
  for (const item of media.items) {
    const src = mediaSrc(item.url);
    const href = `/varliklar/${item.asset.id}`;
    if (!src || item.status !== 'ready' || reelSeen.has(href)) continue;
    reelSeen.add(href);
    reelItems.push({ id: item.id, src, alt: item.asset.title, href });
  }
  for (const asset of assets.items) {
    const src = mediaSrc(asset.coverUrl);
    const href = `/varliklar/${asset.id}`;
    if (!src || reelSeen.has(href)) continue;
    reelSeen.add(href);
    reelItems.push({ id: asset.id, src, alt: asset.title, href });
  }
  reelItems.splice(8);

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
            <div className="hero-lead">
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
          </div>
          <div className="hero-foot">
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
            {reelItems.length > 0 ? (
              <HeroReel items={reelItems} label={t('Son anılar')} />
            ) : null}
          </div>
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

      {groups.items.length > 0 ? (
        <section className="section group-summary-section" aria-label={t('Grup özeti')}>
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Grupların')}</span>
              <h2>{t('Grup özeti')}</h2>
            </div>
            <Link href="/gruplar" className="text-link">
              {t('Tüm gruplar')}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="group-summary-grid">
            {groups.items.map((group) => {
              const base = `/gruplar/${encodeURIComponent(group.slug)}`;
              const activity =
                group.unreadPosts + group.addedAssets + group.removedAssets;
              const mark = groupMark(group.name, locale);
              return (
                <article
                  className={`group-summary-card group-summary-tone-${mark.tone}${activity > 0 ? ' has-activity' : ''}`}
                  key={group.id}
                >
                  <span className="group-summary-cover">
                    <MediaImage
                      src={group.coverUrl}
                      alt=""
                      fallbackIcon="users"
                      fallbackLabel={mark.label}
                    />
                    {activity > 0 ? (
                      <span className="group-summary-badge" aria-hidden="true">
                        {formatNumber(activity, locale)}
                      </span>
                    ) : null}
                  </span>
                  <div className="group-summary-body">
                    <div className="group-summary-head">
                      <Link href={base} className="group-summary-name">
                        <strong>{group.name}</strong>
                        <small>
                          <Icon name="users" size={12} />
                          {t('{count} üye', { count: group.memberCount })}
                        </small>
                      </Link>
                      <span className="group-summary-arrow" aria-hidden="true">
                        <Icon name="arrow-right" size={15} />
                      </span>
                    </div>
                    <div className="group-summary-metrics">
                      {group.unreadPosts > 0 ? (
                        <Link
                          href={base}
                          className="group-summary-metric is-unread"
                          title={t('Okunmamış akış')}
                          aria-label={`${t('Okunmamış akış')}: ${group.unreadPosts}`}
                        >
                          <Icon name="book" size={12} />
                          <strong>{formatNumber(group.unreadPosts, locale)}</strong>
                          <span>{t('okunmamış')}</span>
                        </Link>
                      ) : null}
                      {group.addedAssets > 0 ? (
                        <Link
                          href={`${base}?tab=assets`}
                          className="group-summary-metric is-added"
                          title={t('Eklenen varlık')}
                          aria-label={`${t('Eklenen varlık')}: ${group.addedAssets}`}
                        >
                          <Icon name="plus" size={12} />
                          <strong>+{formatNumber(group.addedAssets, locale)}</strong>
                          <span>{t('eklendi')}</span>
                        </Link>
                      ) : null}
                      {group.removedAssets > 0 ? (
                        <Link
                          href={`${base}?tab=assets`}
                          className="group-summary-metric is-removed"
                          title={t('Çıkarılan varlık')}
                          aria-label={`${t('Çıkarılan varlık')}: ${group.removedAssets}`}
                        >
                          <Icon name="archive" size={12} />
                          <strong>−{formatNumber(group.removedAssets, locale)}</strong>
                          <span>{t('çıkarıldı')}</span>
                        </Link>
                      ) : null}
                      {activity === 0 ? (
                        <span className="group-summary-idle">
                          <Icon name="leaf" size={12} />
                          {t('Hareket yok')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="group-summary-note">
            {t('Sayaçlar grubu son açtığından bu yana birikenleri gösterir.')}
          </p>
        </section>
      ) : null}

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
