'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { uploadMedia, vh } from '@/lib/client';
import {
  attributeLabel,
  entryTypeDescriptions,
  entryTypeLabels,
  formatAttributeValue,
  formatBytes,
  formatDate,
  formatDateTime,
  formatLocation,
  formatMonthYear,
  formatNumber,
  formatTime,
  mediaSrc,
  resolveAttributeLabel,
  typeIconName,
  visibilityLabels,
} from '@/lib/format';
import type {
  Asset,
  AssetDetailData,
  CursorPage,
  Entry,
  EntryType,
  Measurement,
  Media,
  User,
  UserMini,
  Visibility,
} from '@/lib/types';
import { useI18n, useT } from '@/lib/i18n/client';
import { EmptyState } from './EmptyState';
import { Icon, type IconName } from './Icons';
import { MediaImage } from './MediaImage';
import { MiniMap } from './MiniMap';
import { SocialShareModal } from './SocialShareModal';
import { useModalA11y } from './useModalA11y';

const entryIcons: Record<EntryType, IconName> = {
  note: 'book',
  photo: 'camera',
  maintenance: 'sprout',
  acquisition: 'sparkles',
  measurement: 'ruler',
  health: 'heart',
  event: 'sparkles',
  document: 'file',
};

const entryTypes = Object.keys(entryTypeLabels) as EntryType[];
const visibilityOrder: Visibility[] = ['private', 'selected', 'public'];

function nowLocalInput(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function isoToLocalInput(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function AssetDetail({
  data,
  measurements,
  viewer,
  attributeLabels = {},
  socialEnabled = false,
}: {
  data: AssetDetailData;
  measurements: Measurement[];
  viewer: User;
  attributeLabels?: Record<string, string>;
  socialEnabled?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const { locale } = useI18n();
  const [asset, setAsset] = useState(data.asset);
  const [entries, setEntries] = useState(data.entries);
  const [cursor, setCursor] = useState<string | null>(data.entriesNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewers, setViewers] = useState(data.access.viewers);
  const [tab, setTab] = useState<'story' | 'archive' | 'measurements' | 'share'>('story');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isOwner = data.access.isOwner || viewer.id === asset.owner.id;
  const media = useMemo(
    () =>
      entries
        .flatMap((entry) => entry.media)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [entries],
  );
  const images = media.filter((item) => item.kind === 'image');
  const videos = media.filter((item) => item.kind === 'video');
  const documents = media.filter((item) => item.kind === 'document');

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }

  async function loadMoreEntries() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await vh.get<CursorPage<Entry>>(
        `assets/${asset.id}/entries?limit=20&cursor=${encodeURIComponent(cursor)}`,
      );
      setEntries((current) => {
        const known = new Set(current.map((entry) => entry.id));
        return [...current, ...page.items.filter((entry) => !known.has(entry.id))];
      });
      setCursor(page.nextCursor);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : t('Daha eski kayıtlar yüklenemedi.'));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main className="page page-detail">
      <Link href="/varliklar" className="back-link">
        <Icon name="arrow-left" size={16} />
        {t('Varlıklar')}
      </Link>

      <header className="detail-banner">
        <div className="detail-cover">
          <MediaImage
            src={asset.coverUrl}
            alt={asset.title}
            fallbackIcon={typeIconName(asset.type.icon)}
            loading="eager"
          />
          <span className="detail-type">
            <Icon name={typeIconName(asset.type.icon)} size={15} />
            {asset.type.label}
          </span>
        </div>

        <div className="detail-info">
          <div className="detail-kicker">
            <span className={`visibility-pill is-${asset.visibility}`}>
              <Icon
                name={
                  asset.visibility === 'private'
                    ? 'lock'
                    : asset.visibility === 'selected'
                      ? 'users'
                      : 'eye'
                }
                size={13}
              />
              {t(visibilityLabels[asset.visibility])}
            </span>
            <span className={`status-pill${asset.status === 'archived' ? ' is-archived' : ''}`}>
              {asset.status === 'archived' ? t('Arşivlenen') : t('Güncel')}
            </span>
          </div>
          <h1>{asset.title}</h1>
          {asset.description ? <p className="detail-description">{asset.description}</p> : null}

          <dl className="detail-meta">
            {asset.acquiredAt ? (
              <div>
                <dt>{t('Başlangıç')}</dt>
                <dd>{formatDate(asset.acquiredAt, locale)}</dd>
              </div>
            ) : null}
            {asset.locationName ? (
              <div>
                <dt>{t('Konum')}</dt>
                <dd>
                  <Icon name="pin" size={14} />
                  {formatLocation(asset.locationName, locale)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{t('Hafıza')}</dt>
              <dd>{t('{count} kayıt', { count: asset.entryCount })}</dd>
            </div>
            <div>
              <dt>{t('Arşiv')}</dt>
              <dd>
                {t('{count} fotoğraf', { count: images.length })} ·{' '}
                {t('{count} belge', { count: documents.length })}
              </dd>
            </div>
            {Object.entries(asset.attributes)
              .filter(([, value]) => value !== null && value !== '')
              .slice(0, 4)
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{resolveAttributeLabel(key, attributeLabels)}</dt>
                  <dd>{formatAttributeValue(key, value)}</dd>
                </div>
              ))}
          </dl>

          {asset.latitude !== null && asset.longitude !== null ? (
            <div className="detail-map">
              <MiniMap
                latitude={asset.latitude}
                longitude={asset.longitude}
                label={formatLocation(asset.locationName, locale) || asset.title}
              />
            </div>
          ) : null}

          <div className="detail-actions">
            {isOwner ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setComposerOpen(true);
                    setTab('story');
                  }}
                >
                  <Icon name="plus" size={17} />
                  {t('Kayıt ekle')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)}>
                  <Icon name="edit" size={16} />
                  {t('Düzenle')}
                </button>
                {socialEnabled ? (
                  <button type="button" className="btn btn-ghost" onClick={() => setSocialOpen(true)}>
                    <Icon name="share" size={16} />
                    {t('Sosyal medya')}
                  </button>
                ) : null}
              </>
            ) : (
              <span className="shared-note">
                <Icon name="users" size={16} />
                {t('{name} tarafından paylaşıldı', { name: asset.owner.displayName })}
              </span>
            )}
            <Link href={`/rapor/${asset.id}`} className="btn btn-ghost">
              <Icon name="download" size={16} />
              {t('Rapor')}
            </Link>
          </div>
          <p className="detail-owner">
            <span className="avatar avatar-tiny">
              {asset.owner.avatarUrl ? (
                <img src={asset.owner.avatarUrl} alt="" />
              ) : (
                asset.owner.displayName.slice(0, 1)
              )}
            </span>
            {asset.owner.displayName} · @{asset.owner.username}
          </p>
        </div>
      </header>

      <nav className="tabs" aria-label={t('Varlık bölümleri')}>
        <button
          type="button"
          className={tab === 'story' ? 'is-active' : ''}
          onClick={() => setTab('story')}
        >
          {t('Hikâye')} <span>{entries.length}</span>
        </button>
        <button
          type="button"
          className={tab === 'archive' ? 'is-active' : ''}
          onClick={() => setTab('archive')}
        >
          {t('Medya')} <span>{media.length}</span>
        </button>
        <button
          type="button"
          className={tab === 'measurements' ? 'is-active' : ''}
          onClick={() => setTab('measurements')}
        >
          {t('Ölçümler')} <span>{measurements.length}</span>
        </button>
        {isOwner ? (
          <button
            type="button"
            className={tab === 'share' ? 'is-active' : ''}
            onClick={() => setTab('share')}
          >
            {t('Kişiler')} <span>{viewers.length}</span>
          </button>
        ) : null}
      </nav>

      {notice ? (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          {notice}
        </div>
      ) : null}

      {tab === 'story' ? (
        <section className="story">
          {isOwner ? (
            <button
              type="button"
              className="composer-prompt"
              onClick={() => setComposerOpen(true)}
            >
              <span className="composer-prompt-icon">
                <Icon name="plus" size={18} />
              </span>
              <span>
                <strong>{t('Bugün ne oldu?')}</strong>
                <small>{t('Bir fotoğraf, bakım notu ya da küçük bir an ekle.')}</small>
              </span>
              <Icon name="arrow-right" size={18} />
            </button>
          ) : null}

          {entries.length > 0 ? (
            <>
              <Timeline
                entries={entries}
                canEditEntry={(entry) => isOwner || entry.author.id === viewer.id}
                onEditEntry={setEditingEntry}
                onOpenImage={(item, alt) => setLightbox({ url: item, alt })}
              />
              {cursor ? (
                <div className="load-more">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={loadMoreEntries}
                    disabled={loadingMore}
                  >
                    {loadingMore ? t('Yükleniyor…') : t('Daha eski kayıtları göster')}
                  </button>
                </div>
              ) : (
                <p className="archive-end">{t('Hikâyenin başına geldin.')}</p>
              )}
            </>
          ) : (
            <EmptyState
              icon="book"
              title={t('Hikâye henüz başlamadı')}
              body={t('İlk kaydı eklediğinde burada bir zaman çizelgesi oluşacak.')}
            />
          )}
        </section>
      ) : null}

      {tab === 'archive' ? (
        <ArchivePanel
          media={media}
          onOpenImage={(item, alt) => setLightbox({ url: item, alt })}
        />
      ) : null}

      {tab === 'measurements' ? <MeasurementsPanel items={measurements} /> : null}

      {tab === 'share' && isOwner ? (
        <SharePanel
          asset={asset}
          viewers={viewers}
          onChange={setViewers}
          onFlash={flash}
        />
      ) : null}

      {composerOpen ? (
        <EntryComposer
          asset={asset}
          onClose={() => setComposerOpen(false)}
          onCreated={(entry) => {
            setEntries((current) => [entry, ...current]);
            setAsset((current) => ({ ...current, entryCount: current.entryCount + 1 }));
            setComposerOpen(false);
            flash(t('Kayıt hafızaya eklendi.'));
          }}
        />
      ) : null}

      {editOpen ? (
        <EditAssetModal
          asset={asset}
          onClose={() => setEditOpen(false)}
          onSaved={(next) => {
            setAsset(next);
            setEditOpen(false);
            flash(t('Varlık bilgileri güncellendi.'));
            router.refresh();
          }}
          onDeleted={() => {
            router.push('/varliklar');
            router.refresh();
          }}
        />
      ) : null}

      {socialOpen ? (
        <SocialShareModal
          asset={asset}
          images={images}
          videos={videos}
          onClose={() => setSocialOpen(false)}
          onShared={(message) => flash(message)}
        />
      ) : null}

      {editingEntry ? (
        <EntryEditModal
          asset={asset}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={(next) => {
            setEntries((current) =>
              current
                .map((item) => (item.id === next.id ? next : item))
                .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)),
            );
            setEditingEntry(null);
            flash(t('Kayıt güncellendi.'));
            router.refresh();
          }}
          onDeleted={(entryId) => {
            setEntries((current) => current.filter((item) => item.id !== entryId));
            setAsset((current) => ({
              ...current,
              entryCount: Math.max(0, current.entryCount - 1),
            }));
            setEditingEntry(null);
            flash(t('Kayıt silindi.'));
            router.refresh();
          }}
        />
      ) : null}

      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button type="button" className="lightbox-close" aria-label={t('Kapat')}>
            <Icon name="close" size={22} />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.alt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </main>
  );
}

function Timeline({
  entries,
  canEditEntry,
  onEditEntry,
  onOpenImage,
}: {
  entries: Entry[];
  canEditEntry: (entry: Entry) => boolean;
  onEditEntry: (entry: Entry) => void;
  onOpenImage: (url: string, alt: string) => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  let lastYear = '';
  return (
    <div className="timeline">
      {entries.map((entry) => {
        const year = new Date(entry.occurredAt).getFullYear().toString();
        const showYear = year !== lastYear;
        lastYear = year;
        return (
          <div key={entry.id}>
            {showYear ? <div className="year-divider">{year}</div> : null}
            <article className="timeline-entry">
              <div className="timeline-date">
                <time dateTime={entry.occurredAt}>
                  <strong>{new Date(entry.occurredAt).getDate()}</strong>
                  <span>{formatMonthYear(entry.occurredAt, locale)}</span>
                </time>
              </div>
              <div className="entry-card">
                <header className="entry-head">
                  <span className={`entry-kind type-${entry.type}`}>
                    <Icon name={entryIcons[entry.type]} size={14} />
                    {t(entryTypeLabels[entry.type])}
                  </span>
                  {entry.visibility !== 'public' ? (
                    <span className="entry-privacy">
                      <Icon name={entry.visibility === 'private' ? 'lock' : 'users'} size={12} />
                      {t(visibilityLabels[entry.visibility])}
                    </span>
                  ) : null}
                  <span className="entry-time">{formatTime(entry.occurredAt, locale)}</span>
                  {canEditEntry(entry) ? (
                    <button
                      type="button"
                      className="icon-btn entry-edit-btn"
                      onClick={() => onEditEntry(entry)}
                      aria-label={t('Kaydı düzenle')}
                      title={t('Kaydı düzenle')}
                    >
                      <Icon name="edit" size={14} />
                    </button>
                  ) : null}
                </header>
                {entry.title ? <h3>{entry.title}</h3> : null}
                {entry.body ? <p>{entry.body}</p> : null}
                {Object.keys(entry.attributes ?? {}).length > 0 ? (
                  <dl className="entry-attrs">
                    {Object.entries(entry.attributes)
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt>{attributeLabel(key)}</dt>
                          <dd>{formatAttributeValue(key, value)}</dd>
                        </div>
                      ))}
                  </dl>
                ) : null}
                {entry.media.length > 0 ? (
                  <div className="entry-media">
                    {entry.media
                      .filter((item) => item.kind === 'image')
                      .map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className="entry-photo"
                          onClick={() => onOpenImage(mediaSrc(item.url) ?? '', entry.title ?? '')}
                        >
                          <MediaImage src={mediaSrc(item.url)} alt={entry.title ?? ''} />
                        </button>
                      ))}
                    {entry.media
                      .filter((item) => item.kind === 'document')
                      .map((item) => (
                        <DocumentChip key={item.id} media={item} />
                      ))}
                  </div>
                ) : null}
                <footer className="entry-foot">
                  <span>
                    {entry.locationName ? (
                      <>
                        <Icon name="pin" size={12} /> {entry.locationName}
                      </>
                    ) : (
                      t(entryTypeDescriptions[entry.type])
                    )}
                  </span>
                  <span>{formatDate(entry.occurredAt, locale)}</span>
                </footer>
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}

function DocumentChip({ media }: { media: Media }) {
  const t = useT();
  const { locale } = useI18n();
  return (
    <a
      className="doc-chip"
      href={mediaSrc(media.url) ?? '#'}
      target="_blank"
      rel="noreferrer"
      download={media.originalName ?? undefined}
    >
      <span className="doc-chip-icon">
        <Icon name="file" size={18} />
      </span>
      <span>
        <strong>{media.originalName ?? t('Belge')}</strong>
        <small>
          {media.mimeType.split('/')[1]?.toUpperCase()} · {formatBytes(media.byteSize, locale)}
        </small>
      </span>
      <Icon name="download" size={15} />
    </a>
  );
}

function ArchivePanel({
  media,
  onOpenImage,
}: {
  media: Media[];
  onOpenImage: (url: string, alt: string) => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const [filter, setFilter] = useState<'all' | 'image' | 'document'>('all');
  const [query, setQuery] = useState('');
  const filtered = media.filter((item) => {
    if (filter !== 'all' && item.kind !== filter) return false;
    if (query && !(item.originalName ?? '').toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <section className="archive-panel">
      <div className="archive-toolbar">
        <div className="segmented">
          <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
            {t('Tümü')}
          </button>
          <button type="button" className={filter === 'image' ? 'is-active' : ''} onClick={() => setFilter('image')}>
            {t('Fotoğraf')}
          </button>
          <button type="button" className={filter === 'document' ? 'is-active' : ''} onClick={() => setFilter('document')}>
            {t('Belge')}
          </button>
        </div>
        <label className="inline-search">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Arşivde ara…')}
            aria-label={t('Arşivde ara')}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="archive"
          title={t('Bu filtrede bir parça yok')}
          body={t('Fotoğraf ya da belge eklediğinde arşiv burada büyüyecek.')}
        />
      ) : (
        <div className="archive-grid">
          {filtered.map((item) =>
            item.kind === 'image' ? (
              <button
                type="button"
                key={item.id}
                className="archive-tile"
                onClick={() => onOpenImage(mediaSrc(item.url) ?? '', item.originalName ?? '')}
              >
                <MediaImage src={mediaSrc(item.url)} alt={item.originalName ?? ''} />
                <span className="archive-tile-info">
                  <strong>{item.originalName?.replace(/\.[^.]+$/, '') ?? t('Fotoğraf')}</strong>
                  <small>{formatDate(item.createdAt, locale)}</small>
                </span>
              </button>
            ) : (
              <a
                key={item.id}
                className="archive-tile archive-doc"
                href={mediaSrc(item.url) ?? '#'}
                target="_blank"
                rel="noreferrer"
              >
                <span className="archive-doc-icon">
                  <Icon name="file" size={26} />
                </span>
                <span className="archive-tile-info">
                  <strong>{item.originalName ?? t('Belge')}</strong>
                  <small>
                    {formatBytes(item.byteSize, locale)} · {formatDate(item.createdAt, locale)}
                  </small>
                </span>
                <Icon name="download" size={16} />
              </a>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function MeasurementsPanel({ items }: { items: Measurement[] }) {
  const t = useT();
  const { locale } = useI18n();
  const grouped = useMemo(() => {
    const map = new Map<string, Measurement[]>();
    for (const item of items) {
      const list = map.get(item.metric) ?? [];
      list.push(item);
      map.set(item.metric, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.measuredAt) - +new Date(b.measuredAt));
    }
    return [...map.entries()];
  }, [items]);

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon="ruler"
        title={t('Henüz ölçüm yok')}
        body={t('Boy, kilo, yaprak sayısı gibi ölçümler eklendiğinde değişim burada grafikleşir.')}
      />
    );
  }

  return (
    <section className="measurements">
      {grouped.map(([metric, list]) => {
        const latest = list[list.length - 1]!;
        const first = list[0]!;
        const delta = latest.value - first.value;
        const values = list.map((item) => item.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = max - min || 1;
        const width = 560;
        const height = 150;
        const points = list.map((item, index) => {
          const x = list.length === 1 ? width / 2 : 24 + (index / (list.length - 1)) * (width - 48);
          const y = 18 + (1 - (item.value - min) / span) * (height - 48);
          return { x, y, item };
        });
        const path = points.map((point) => `${point.x},${point.y}`).join(' ');

        return (
          <article className="metric-card" key={metric}>
            <header>
              <div>
                <span className="eyebrow">{t('Ölçüm')}</span>
                <h3>{metric}</h3>
              </div>
              <div className="metric-latest">
                <strong>
                  {formatNumber(latest.value, locale)} <small>{latest.unit}</small>
                </strong>
                {list.length > 1 ? (
                  <span className={delta >= 0 ? 'delta-up' : 'delta-down'}>
                    {delta >= 0 ? '+' : ''}
                    {formatNumber(Number(delta.toFixed(2)), locale)} {latest.unit}
                  </span>
                ) : null}
              </div>
            </header>
            <svg viewBox={`0 0 ${width} ${height}`} className="metric-chart" role="img" aria-label={t('{metric} değişimi', { metric })}>
              <defs>
                <linearGradient id={`fill-${metric.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b6f55" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#5b6f55" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`24,${height - 24} ${path} ${width - 24},${height - 24}`}
                fill={`url(#fill-${metric.replace(/\s/g, '-')})`}
              />
              <polyline points={path} fill="none" stroke="#4f6549" strokeWidth="2" />
              {points.map((point) => (
                <circle key={point.item.id} cx={point.x} cy={point.y} r="3.5" fill="#f5f0e6" stroke="#4f6549" strokeWidth="2" />
              ))}
            </svg>
            <footer>
              <span>{formatDate(first.measuredAt, locale)}</span>
              <span>{t('{count} ölçüm', { count: list.length })}</span>
              <span>{formatDate(latest.measuredAt, locale)}</span>
            </footer>
          </article>
        );
      })}
    </section>
  );
}

function SharePanel({
  asset,
  viewers,
  onChange,
  onFlash,
}: {
  asset: Asset;
  viewers: { user: UserMini; grantedAt: string }[];
  onChange: (next: { user: UserMini; grantedAt: string }[]) => void;
  onFlash: (message: string) => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addUser(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await vh.post<{ user: UserMini }>(`assets/${asset.id}/access`, { username });
      onChange([{ user: data.user, grantedAt: new Date().toISOString() }, ...viewers]);
      setUsername('');
      onFlash(t('Erişim verildi.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Erişim verilemedi.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(userId: string) {
    setBusy(true);
    try {
      await vh.delete(`assets/${asset.id}/access/${userId}`);
      onChange(viewers.filter((item) => item.user.id !== userId));
      onFlash(t('Erişim kaldırıldı.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Erişim kaldırılamadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="share-panel">
      <div className="info-card">
        <Icon name="users" size={22} />
        <div>
          <h3>{t('Seçili kişilerle paylaş')}</h3>
          <p>
            {t('Varlığın görünürlüğü')}{' '}
            <strong>{t(visibilityLabels[asset.visibility])}</strong>.{' '}
            {t('Buradan eklediğin kişiler, varlıkla birlikte seçili kayıtlarını da görebilir.')}
          </p>
        </div>
      </div>

      <form className="share-form" onSubmit={addUser}>
        <Icon name="user" size={18} />
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t('Kullanıcı adı veya e-posta')}
          aria-label={t('Paylaşılacak kullanıcı')}
          required
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !username}>
          {t('Erişim ver')}
        </button>
      </form>
      {error ? <div className="form-error">{error}</div> : null}

      <div className="share-list">
        {viewers.length === 0 ? (
          <p className="muted-note">{t('Henüz kimseyle paylaşmadın.')}</p>
        ) : (
          viewers.map((item) => (
            <div className="share-row" key={item.user.id}>
              <span className="avatar avatar-small">
                {item.user.avatarUrl ? <img src={item.user.avatarUrl} alt="" /> : item.user.displayName.slice(0, 1)}
              </span>
              <span>
                <strong>{item.user.displayName}</strong>
                <small>
                  @{item.user.username} · {formatDate(item.grantedAt, locale)}
                </small>
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => removeUser(item.user.id)}
                disabled={busy}
                aria-label={t('Erişimi kaldır')}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function EntryComposer({
  asset,
  onClose,
  onCreated,
}: {
  asset: Asset;
  onClose: () => void;
  onCreated: (entry: Entry) => void;
}) {
  const t = useT();
  const [type, setType] = useState<EntryType>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [occurredAt, setOccurredAt] = useState(nowLocalInput());
  const [visibility, setVisibility] = useState<Visibility>(
    asset.visibility === 'public' ? 'private' : 'private',
  );
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  const allowedVisibilities = visibilityOrder.filter(
    (item) => visibilityOrder.indexOf(item) <= visibilityOrder.indexOf(asset.visibility),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title && !body) {
      setError(t('Bir başlık ya da not yazın.'));
      return;
    }
    if (files.length > 8) {
      setError(t('Bir kayda en fazla 8 dosya eklenebilir.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mediaIds: string[] = [];
      for (const [index, file] of files.entries()) {
        setProgress(
          t('Dosyalar yükleniyor · {current}/{total}', {
            current: index + 1,
            total: files.length,
          }),
        );
        const media = await uploadMedia(file);
        mediaIds.push(media.id);
      }
      setProgress(t('Kayıt oluşturuluyor…'));
      const data = await vh.post<{ entry: Entry }>(`assets/${asset.id}/entries`, {
        type,
        title: title || null,
        body: body || null,
        occurredAt: new Date(occurredAt).toISOString(),
        visibility,
        mediaIds,
      });
      onCreated(data.entry);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Kayıt eklenemedi.'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('Yeni kayıt')}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="modal-head">
          <div>
            <span className="eyebrow">{t('Yeni iz')}</span>
            <h2>{t('Hafızaya kayıt ekle')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <form className="modal-body" onSubmit={submit}>
          <div className="entry-type-grid">
            {entryTypes.map((item) => (
              <button
                type="button"
                key={item}
                className={`entry-type-option${type === item ? ' is-selected' : ''}`}
                onClick={() => setType(item)}
              >
                <Icon name={entryIcons[item]} size={18} />
                <span>{t(entryTypeLabels[item])}</span>
              </button>
            ))}
          </div>

          <label className="field">
            <span>{t('Başlık')}</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                type === 'maintenance' ? t('Örn. Kök ve tel kontrolü') : t('Kısa bir başlık')
              }
              maxLength={140}
            />
          </label>

          <label className="field">
            <span>{t('Not')}</span>
            <textarea
              className="textarea"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('Bugün ne oldu? Ne değişti? Ne hissettin?')}
              rows={5}
              maxLength={5000}
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>{t('Tarih ve saat')}</span>
              <input
                className="input"
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>{t('Kimler görebilsin?')}</span>
              <select
                className="select"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as Visibility)}
              >
                {allowedVisibilities.map((item) => (
                  <option key={item} value={item}>
                    {t(visibilityLabels[item])}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="upload-field">
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 8))}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="camera" size={17} />
              {t('Fotoğraf veya belge ekle')}
            </button>
            <span className="upload-hint">
              {t('En fazla 8 dosya · 10 MB / dosya · JPG, PNG, WEBP, GIF, PDF')}
            </span>
            {files.length > 0 ? (
              <div className="file-list">
                {files.map((file, index) => (
                  <span className="file-pill" key={`${file.name}-${index}`}>
                    <Icon name={file.type.startsWith('image/') ? 'image' : 'file'} size={14} />
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                      aria-label={t('Dosyayı kaldır')}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {error ? <div className="form-error">{error}</div> : null}
          {progress ? <div className="progress-note">{progress}</div> : null}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {t('Vazgeç')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? t('Kaydediliyor…') : t('Hafızaya ekle')}
              {!busy ? <Icon name="arrow-right" size={17} /> : null}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EntryEditModal({
  asset,
  entry,
  onClose,
  onSaved,
  onDeleted,
}: {
  asset: Asset;
  entry: Entry;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
  onDeleted: (entryId: string) => void;
}) {
  const t = useT();
  const [type, setType] = useState<EntryType>(entry.type);
  const [title, setTitle] = useState(entry.title ?? '');
  const [body, setBody] = useState(entry.body ?? '');
  const [occurredAt, setOccurredAt] = useState(isoToLocalInput(entry.occurredAt));
  const [locationName, setLocationName] = useState(entry.locationName ?? '');
  const [visibility, setVisibility] = useState<Visibility>(entry.visibility);
  const [attributes, setAttributes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(entry.attributes ?? {}).map(([key, value]) => [key, String(value ?? '')]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  const allowedVisibilities = visibilityOrder.filter(
    (item) =>
      item === entry.visibility ||
      visibilityOrder.indexOf(item) <= visibilityOrder.indexOf(asset.visibility),
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() && !body.trim()) {
      setError(t('Bir başlık ya da not yazın.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const nextAttributes = Object.fromEntries(
        Object.entries(attributes)
          .filter(([, value]) => value.trim() !== '')
          .map(([key, value]) => {
            const original = entry.attributes?.[key];
            const numeric =
              typeof original === 'number' &&
              value.trim() !== '' &&
              !Number.isNaN(Number(value));
            return [key, numeric ? Number(value) : value];
          }),
      );
      const data = await vh.patch<{ entry: Entry }>(`entries/${entry.id}`, {
        type,
        title: title.trim() || null,
        body: body.trim() || null,
        occurredAt: new Date(occurredAt).toISOString(),
        locationName: locationName.trim() || null,
        visibility,
        attributes: nextAttributes,
      });
      onSaved(data.entry);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Kayıt güncellenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await vh.delete(`entries/${entry.id}`);
      onDeleted(entry.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Kayıt silinemedi.'));
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('Kaydı düzenle')}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="modal-head">
          <div>
            <span className="eyebrow">{t('Hafıza kaydı')}</span>
            <h2>{t('Kaydı düzenle')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <form className="modal-body" onSubmit={save}>
          <div className="entry-type-grid">
            {entryTypes.map((item) => (
              <button
                type="button"
                key={item}
                className={`entry-type-option${type === item ? ' is-selected' : ''}`}
                onClick={() => setType(item)}
              >
                <Icon name={entryIcons[item]} size={18} />
                <span>{t(entryTypeLabels[item])}</span>
              </button>
            ))}
          </div>

          <label className="field">
            <span>{t('Başlık')}</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('Kısa bir başlık')}
              maxLength={140}
            />
          </label>

          <label className="field">
            <span>{t('Not')}</span>
            <textarea
              className="textarea"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              maxLength={5000}
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>{t('Tarih ve saat')}</span>
              <input
                className="input"
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>{t('Kimler görebilsin?')}</span>
              <select
                className="select"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as Visibility)}
              >
                {allowedVisibilities.map((item) => (
                  <option key={item} value={item}>
                    {t(visibilityLabels[item])}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>{t('Konum')}</span>
            <input
              className="input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder={t('İstanbul, Kadıköy')}
              maxLength={160}
            />
          </label>

          {Object.keys(attributes).length > 0 ? (
            <div className="form-grid">
              {Object.entries(attributes).map(([key, value]) => (
                <label className="field" key={key}>
                  <span>{attributeLabel(key)}</span>
                  <input
                    className="input"
                    value={value}
                    onChange={(event) =>
                      setAttributes((current) => ({ ...current, [key]: event.target.value }))
                    }
                    maxLength={120}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {entry.media.length > 0 ? (
            <p className="muted-note">
              {t(
                'Bu kayda bağlı {count} dosya korunur; metin ve tarih düzenlemesi dosyaları etkilemez.',
                { count: entry.media.length },
              )}
            </p>
          ) : null}

          {error ? <div className="form-error">{error}</div> : null}

          {confirming ? (
            <div className="confirm-inline" role="alertdialog" aria-label={t('Kayıt silme onayı')}>
              <p>{t('Bu kayıt kalıcı olarak silinsin mi? Bu işlem geri alınamaz.')}</p>
              <div className="confirm-inline-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                >
                  {t('Vazgeç')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger-solid btn-sm"
                  onClick={remove}
                  disabled={busy}
                >
                  {busy ? t('Siliniyor…') : t('Evet, sil')}
                </button>
              </div>
            </div>
          ) : null}

          <div className="modal-actions spread">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirming(true)}
              disabled={busy || confirming}
            >
              <Icon name="trash" size={16} />
              {t('Kaydı sil')}
            </button>
            <div className="modal-actions-right">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                {t('Vazgeç')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? t('Kaydediliyor…') : t('Kaydet')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAssetModal({
  asset,
  onClose,
  onSaved,
  onDeleted,
}: {
  asset: Asset;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
  onDeleted: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(asset.title);
  const [description, setDescription] = useState(asset.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(asset.visibility);
  const [status, setStatus] = useState(asset.status);
  const [acquiredAt, setAcquiredAt] = useState(asset.acquiredAt ?? '');
  const [locationName, setLocationName] = useState(asset.locationName ?? '');
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let coverMediaId: string | undefined;
      if (cover) {
        const media = await uploadMedia(cover);
        coverMediaId = media.id;
      }
      const data = await vh.patch<{ asset: Asset }>(`assets/${asset.id}`, {
        title,
        description: description || null,
        visibility,
        status,
        acquiredAt: acquiredAt || null,
        locationName: locationName || null,
        ...(coverMediaId ? { coverMediaId } : {}),
      });
      onSaved(data.asset);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Güncellenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await vh.delete(`assets/${asset.id}`);
      onDeleted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Varlık silinemedi.'));
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('Varlığı düzenle')}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="modal-head">
          <div>
            <span className="eyebrow">{t('Varlık bilgileri')}</span>
            <h2>{t('Düzenle')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <form className="modal-body" onSubmit={save}>
          <label className="field">
            <span>{t('Adı')}</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label className="field">
            <span>{t('Açıklama')}</span>
            <textarea
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={2000}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>{t('Görünürlük')}</span>
              <select
                className="select"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as Visibility)}
              >
                {visibilityOrder.map((item) => (
                  <option key={item} value={item}>
                    {t(visibilityLabels[item])}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('Durum')}</span>
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value as Asset['status'])}
              >
                <option value="active">{t('Güncel')}</option>
                <option value="archived">{t('Arşivlenen')}</option>
              </select>
            </label>
            <label className="field">
              <span>{t('Başlangıç tarihi')}</span>
              <input
                className="input"
                type="date"
                value={acquiredAt}
                onChange={(event) => setAcquiredAt(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('Konum')}</span>
              <input
                className="input"
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                maxLength={160}
              />
            </label>
          </div>

          <div className="cover-edit">
            <div className="cover-edit-preview">
              <MediaImage src={asset.coverUrl} alt={asset.title} />
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(event) => setCover(event.target.files?.[0] ?? null)}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <Icon name="camera" size={16} />
                {cover ? cover.name : t('Kapak fotoğrafını değiştir')}
              </button>
              <p className="muted-note">{t('Yeni kapak, kaydettiğinde yüklenir.')}</p>
            </div>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          {confirming ? (
            <div className="confirm-inline" role="alertdialog" aria-label={t('Varlık silme onayı')}>
              <p>
                {t(
                  '“{title}” ve tüm kayıtları kalıcı olarak silinsin mi? Bu işlem geri alınamaz.',
                  { title: asset.title },
                )}
              </p>
              <div className="confirm-inline-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                >
                  {t('Vazgeç')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger-solid btn-sm"
                  onClick={remove}
                  disabled={busy}
                >
                  {busy ? t('Siliniyor…') : t('Evet, sil')}
                </button>
              </div>
            </div>
          ) : null}

          <div className="modal-actions spread">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirming(true)}
              disabled={busy || confirming}
            >
              <Icon name="trash" size={16} />
              {t('Varlığı sil')}
            </button>
            <div className="modal-actions-right">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                {t('Vazgeç')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? t('Kaydediliyor…') : t('Kaydet')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
