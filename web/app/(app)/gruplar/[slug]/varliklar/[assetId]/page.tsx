import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { Icon, type IconName } from '@/components/Icons';
import { MediaImage } from '@/components/MediaImage';
import { ApiError, api, requireViewer } from '@/lib/api';
import {
  attributeLabel,
  entryTypeDescriptions,
  entryTypeLabels,
  formatDate,
  formatNumber,
  formatTime,
  mediaSrc,
  typeIconName,
} from '@/lib/format';
import { localeTags } from '@/lib/i18n/config';
import { getI18n, getT } from '@/lib/i18n/server';
import type {
  AssetType,
  EntryType,
  GroupAssetDetail,
  GroupAssetScope,
} from '@/lib/types';

type Params = Promise<{ slug: string; assetId: string }>;

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

const scopeLabels: Record<GroupAssetScope, string> = {
  summary: 'Yalnızca özet',
  timeline: 'Herkese açık kayıtlar',
  all: 'Tüm hikâye',
};

const scopeNotes: Record<GroupAssetScope, string> = {
  summary:
    'Bu varlık gruba yalnızca özet olarak paylaşıldı. Kayıtların tamamı sahibinde kalıyor.',
  timeline:
    'Sahibi bu varlığın yalnızca herkese açık işaretlediği kayıtlarını grupla paylaştı.',
  all: 'Sahibi bu varlığın bütün hikâyesini grup üyeleriyle paylaştı.',
};

function findType(types: AssetType[], id: string): AssetType | null {
  for (const type of types) {
    if (type.id === id) return type;
    const child = findType(type.children ?? [], id);
    if (child) return child;
  }
  return null;
}

async function loadAttributeLabels(typeId: string): Promise<Record<string, string>> {
  try {
    const types = await api<{ items: AssetType[] }>('/v1/asset-types');
    const fields = findType(types.items, typeId)?.attributesSchema?.fields ?? [];
    return Object.fromEntries(fields.map((field) => [field.key, field.label]));
  } catch {
    return {};
  }
}

async function loadSharedAsset(
  slug: string,
  assetId: string,
): Promise<GroupAssetDetail | null> {
  try {
    return await api<GroupAssetDetail>(
      `/v1/communities/${encodeURIComponent(slug)}/assets/${assetId}`,
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getT();
  const { slug, assetId } = await params;
  try {
    const data = await api<GroupAssetDetail>(
      `/v1/communities/${encodeURIComponent(slug)}/assets/${assetId}`,
    );
    return {
      title: `${data.asset.title} · ${data.community.name}`,
      description:
        data.asset.description ?? t('{type} hafızası', { type: data.asset.type.label }),
    };
  } catch {
    return { title: t('Paylaşılan varlık') };
  }
}

export default async function SharedAssetPage({ params }: { params: Params }) {
  await requireViewer();
  const { t, locale } = await getI18n();
  const { slug, assetId } = await params;
  const data = await loadSharedAsset(slug, assetId);
  if (!data) notFound();

  const { asset, share, community, entries } = data;
  const attributeLabels = await loadAttributeLabels(asset.type.id);
  const images = entries.flatMap((entry) => entry.media).filter((item) => item.kind === 'image');

  let lastYear = '';

  return (
    <main className="page page-group">
      <Link href={`/gruplar/${community.slug}`} className="back-link">
        <Icon name="arrow-left" size={16} />
        {community.name}
      </Link>

      <header className="group-shared-head">
        <div className="group-shared-cover">
          <MediaImage
            src={asset.coverUrl}
            alt={asset.title}
            fallbackIcon={typeIconName(asset.type.icon)}
            loading="eager"
          />
        </div>
        <div className="group-shared-info">
          <div className="detail-kicker">
            <span className="group-category">{asset.type.label}</span>
            <span className="status-pill">{t(scopeLabels[share.scope])}</span>
            <span className="visibility-pill is-selected">
              <Icon name="users" size={13} />
              {community.name}
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
                  {asset.locationName}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{t('Görünen kayıt')}</dt>
              <dd>{formatNumber(entries.length, locale)}</dd>
            </div>
            <div>
              <dt>{t('Fotoğraf')}</dt>
              <dd>{formatNumber(images.length, locale)}</dd>
            </div>
            {Object.entries(asset.attributes)
              .filter(([, value]) => value !== null && value !== '')
              .slice(0, 4)
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{t(attributeLabels[key] ?? attributeLabel(key))}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>

          <p className="detail-owner">
            <span className="avatar avatar-tiny">
              {asset.owner.avatarUrl ? (
                <img src={asset.owner.avatarUrl} alt="" />
              ) : (
                asset.owner.displayName.slice(0, 1)
              )}
            </span>
            {asset.owner.displayName} · @{asset.owner.username}
            <span className="muted-note">
              {' · '}
              {t('{date} tarihinde paylaştı', { date: formatDate(share.sharedAt, locale) })}
            </span>
          </p>
        </div>
      </header>

      <p className="group-scope-note">
        <Icon name="lock" size={16} />
        {t(scopeNotes[share.scope])}
      </p>

      <section className="story">
        {share.scope === 'summary' ? (
          <div className="group-locked group-locked-inline">
            <span className="group-locked-icon">
              <Icon name="lock" size={24} />
            </span>
            <h2>{t('Kayıtlar paylaşılmadı')}</h2>
            <p>
              {t('Sahibi bu varlığı gruba yalnızca özet olarak ekledi. Hikâyesini okumak için varlığın sahibinden kapsamı genişletmesini isteyebilirsin.')}
            </p>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="book"
            title={t('Paylaşılan kayıt yok')}
            body={t('Bu kapsamda görünür bir kayıt bulunmuyor.')}
          />
        ) : (
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
                      <strong>{new Date(entry.occurredAt).getDate()}</strong>
                      <span>
                        {new Intl.DateTimeFormat(localeTags[locale], {
                          month: 'short',
                          timeZone: 'Europe/Istanbul',
                        }).format(new Date(entry.occurredAt))}
                      </span>
                    </div>
                    <div className="entry-card">
                      <header className="entry-head">
                        <span className={`entry-kind type-${entry.type}`}>
                          <Icon name={entryIcons[entry.type]} size={14} />
                          {t(entryTypeLabels[entry.type])}
                        </span>
                        <span className="entry-time">{formatTime(entry.occurredAt, locale)}</span>
                      </header>
                      {entry.title ? <h3>{entry.title}</h3> : null}
                      {entry.body ? <p>{entry.body}</p> : null}
                      {Object.keys(entry.attributes ?? {}).length > 0 ? (
                        <dl className="entry-attrs">
                          {Object.entries(entry.attributes)
                            .slice(0, 6)
                            .map(([key, value]) => (
                              <div key={key}>
                                <dt>{t(attributeLabels[key] ?? attributeLabel(key))}</dt>
                                <dd>{String(value)}</dd>
                              </div>
                            ))}
                        </dl>
                      ) : null}
                      {entry.media.length > 0 ? (
                        <div className="entry-media">
                          {entry.media
                            .filter((item) => item.kind === 'image')
                            .map((item) => (
                              <a
                                key={item.id}
                                href={mediaSrc(item.url) ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="entry-photo"
                              >
                                <MediaImage src={mediaSrc(item.url)} alt={entry.title ?? ''} />
                              </a>
                            ))}
                          {entry.media
                            .filter((item) => item.kind === 'document')
                            .map((item) => (
                              <a
                                key={item.id}
                                href={mediaSrc(item.url) ?? '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="doc-chip"
                              >
                                <span className="doc-chip-icon">
                                  <Icon name="file" size={15} />
                                </span>
                                <span>
                                  <strong>{item.originalName ?? t('Belge')}</strong>
                                  <small>{item.mimeType}</small>
                                </span>
                              </a>
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
        )}
      </section>
    </main>
  );
}
