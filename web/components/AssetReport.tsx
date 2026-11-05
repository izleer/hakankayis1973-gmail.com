import Link from 'next/link';
import {
  entryTypeLabels,
  formatAttributeValue,
  formatDate,
  formatDateTime,
  formatNumber,
  formatLocation,
  resolveAttributeLabel,
  typeIconName,
  visibilityLabels,
} from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';import type { Asset, AssetDetailData, Entry, EntryType, Measurement } from '@/lib/types';
import { Icon, type IconName } from './Icons';
import { MediaImage } from './MediaImage';
import { ReportActions } from './ReportActions';

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

function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function groupMeasurements(items: Measurement[]): [string, Measurement[]][] {
  const map = new Map<string, Measurement[]>();
  for (const item of items) {
    const list = map.get(item.metric) ?? [];
    list.push(item);
    map.set(item.metric, list);
  }
  return [...map.entries()].map(([metric, list]) => [
    metric,
    [...list].sort((a, b) => +new Date(a.measuredAt) - +new Date(b.measuredAt)),
  ]);
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 220;
  const height = 44;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((value, index) => {
    const x = 4 + (index / (points.length - 1)) * (width - 8);
    const y = 4 + (1 - (value - min) / span) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="report-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={coords.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export async function AssetReport({
  asset,
  access,
  entries,
  entriesTruncated,
  measurements,
  attributeLabels,
}: {
  asset: Asset;
  access: AssetDetailData['access'];
  entries: Entry[];
  entriesTruncated: boolean;
  measurements: Measurement[];
  attributeLabels: Record<string, string>;
}) {
  const { locale, t } = await getI18n();
  const generatedAt = formatDateTime(new Date(), locale);

  const media = entries.flatMap((entry) => entry.media);
  const images = media.filter((item) => item.kind === 'image' && item.url);
  const documents = media.filter((item) => item.kind === 'document');
  const attributes = Object.entries(asset.attributes).filter(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== '',
  );
  const measurementGroups = groupMeasurements(measurements);
  const coordinates =
    asset.latitude !== null && asset.longitude !== null
      ? formatCoordinates(asset.latitude, asset.longitude)
      : null;
  const mapsUrl = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${asset.latitude},${asset.longitude}`
    : null;

  return (
    <main className="page report-page">
      <ReportActions title={asset.title} />

      <article className="asset-report" aria-label={t('{title} varlık raporu', { title: asset.title })}>
        <header className="report-head">
          <div className="report-letterhead">
            <span className="report-brand">
              <Icon name="leaf" size={18} />
              izleer
            </span>
            <span className="report-doc-type">{t('Varlık raporu')}</span>
          </div>

          <div className="report-hero">
            <div className="report-cover">
              <MediaImage
                src={asset.coverUrl}
                alt={asset.title}
                fallbackIcon={typeIconName(asset.type.icon)}
                loading="eager"
              />
            </div>
            <div className="report-hero-text">
              <p className="report-eyebrow">
                {asset.type.label} · {t(visibilityLabels[asset.visibility])}
              </p>
              <h1>{asset.title}</h1>
              {asset.description ? <p className="report-description">{asset.description}</p> : null}
              <p className="report-owner">
                <span>{t('Sahip')}</span>
                <strong>{asset.owner.displayName}</strong>
                <small>@{asset.owner.username}</small>
              </p>
            </div>
          </div>

          <dl className="report-stats">
            <div>
              <dt>{t('Kayıtlar')}</dt>
              <dd>{formatNumber(entries.length, locale)}</dd>
            </div>
            <div>
              <dt>{t('Fotoğraf')}</dt>
              <dd>{formatNumber(images.length, locale)}</dd>
            </div>
            <div>
              <dt>{t('Belge')}</dt>
              <dd>{formatNumber(documents.length, locale)}</dd>
            </div>
            <div>
              <dt>{t('Ölçümler')}</dt>
              <dd>{formatNumber(measurements.length, locale)}</dd>
            </div>
          </dl>
        </header>

        <section className="report-section">
          <h2>{t('Künye')}</h2>
          <dl className="report-meta">
            <div>
              <dt>{t('Sahip')}</dt>
              <dd>
                {asset.owner.displayName} (@{asset.owner.username})
              </dd>
            </div>
            <div>
              <dt>{t('Görünürlük')}</dt>
              <dd>{t(visibilityLabels[asset.visibility])}</dd>
            </div>
            <div>
              <dt>{t('Durum')}</dt>
              <dd>{asset.status === 'archived' ? t('Arşivlenen') : t('Güncel')}</dd>
            </div>
            <div>
              <dt>{t('Başlangıç')}</dt>
              <dd>{asset.acquiredAt ? formatDate(asset.acquiredAt, locale) : '—'}</dd>
            </div>
            <div>
              <dt>{t('Oluşturulma')}</dt>
              <dd>{formatDate(asset.createdAt, locale)}</dd>
            </div>
            <div>
              <dt>{t('Son güncelleme')}</dt>
              <dd>{formatDate(asset.updatedAt, locale)}</dd>
            </div>
            <div>
              <dt>{t('Rapor tarihi')}</dt>
              <dd>{generatedAt}</dd>
            </div>
            {access.isShared ? (
              <div>
                <dt>{t('Paylaşım durumu')}</dt>
                <dd>{t('Seninle paylaşıldı')}</dd>
              </div>
            ) : null}
          </dl>

          {attributes.length > 0 ? (
            <dl className="report-meta report-meta-attributes">
              {attributes.map(([key, value]) => (
                <div key={key}>
                  <dt>{resolveAttributeLabel(key, attributeLabels)}</dt>
                  <dd>{formatAttributeValue(key, value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        {asset.locationName || coordinates ? (
          <section className="report-section">
            <h2>{t('Konum')}</h2>
            <div className="report-location">
              <Icon name="pin" size={16} />
              <div>
                <strong>{formatLocation(asset.locationName, locale) || t('Konum bilgisi yok')}</strong>
                {coordinates ? <span>{coordinates}</span> : null}
              </div>
              {mapsUrl ? (
                <a className="report-map-link no-print" href={mapsUrl} target="_blank" rel="noreferrer">
                  {t('Haritada aç')}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="report-section">
          <h2>{t('Ölçümler')}</h2>
          {measurementGroups.length === 0 ? (
            <p className="report-empty">{t('Henüz ölçüm yok.')}</p>
          ) : (
            <div className="report-metrics">
              {measurementGroups.map(([metric, list]) => {
                const latest = list[list.length - 1]!;
                const first = list[0]!;
                const delta = latest.value - first.value;
                return (
                  <article className="report-metric" key={metric}>
                    <header>
                      <h3>{metric}</h3>
                      <p>
                        <strong>
                          {formatNumber(latest.value, locale)} <small>{latest.unit}</small>
                        </strong>
                        {list.length > 1 ? (
                          <span className={delta >= 0 ? 'is-up' : 'is-down'}>
                            {delta >= 0 ? '+' : ''}
                            {formatNumber(Number(delta.toFixed(2)), locale)} {latest.unit}
                          </span>
                        ) : null}
                      </p>
                    </header>
                    <Sparkline points={list.map((item) => item.value)} />
                    <table>
                      <caption className="sr-only">{t('{metric} ölçüm geçmişi', { metric })}</caption>
                      <thead>
                        <tr>
                          <th scope="col">{t('Tarih')}</th>
                          <th scope="col">{t('Değer')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...list]
                          .reverse()
                          .slice(0, 8)
                          .map((item) => (
                            <tr key={item.id}>
                              <td>{formatDate(item.measuredAt, locale)}</td>
                              <td>
                                {formatNumber(item.value, locale)} {item.unit}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="report-section">
          <h2>
            {t('Hikâye')} <span className="report-count">{entries.length}</span>
          </h2>
          {entries.length === 0 ? (
            <p className="report-empty">{t('Henüz kayıt yok.')}</p>
          ) : (
            <div className="report-entries">
              {entries.map((entry) => {
                const entryImages = entry.media.filter(
                  (item) => item.kind === 'image' && item.url,
                );
                const entryDocuments = entry.media.filter((item) => item.kind === 'document');
                return (
                  <article className="report-entry" key={entry.id}>
                    <header>
                      <span className="report-entry-type">
                        <Icon name={entryIcons[entry.type]} size={13} />
                        {t(entryTypeLabels[entry.type])}
                      </span>
                      <time dateTime={entry.occurredAt}>
                        {formatDateTime(entry.occurredAt, locale)}
                      </time>
                    </header>
                    <h3>{entry.title || t(entryTypeLabels[entry.type])}</h3>
                    {entry.locationName ? (
                      <p className="report-entry-location">
                        <Icon name="pin" size={13} />
                        {formatLocation(entry.locationName, locale)}
                      </p>
                    ) : null}
                    {entry.body ? <p className="report-entry-body">{entry.body}</p> : null}
                    {entryImages.length > 0 ? (
                      <div className="report-entry-media">
                        {entryImages.slice(0, 4).map((item) => (
                          <figure key={item.id}>
                            <MediaImage src={item.url} alt={entry.title ?? asset.title} />
                            {item.originalName ? <figcaption>{item.originalName}</figcaption> : null}
                          </figure>
                        ))}
                      </div>
                    ) : null}
                    {entryDocuments.length > 0 ? (
                      <ul className="report-documents">
                        {entryDocuments.map((item) => (
                          <li key={item.id}>
                            <Icon name="file" size={13} />
                            {item.originalName ?? item.mimeType}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
          {entriesTruncated ? (
            <p className="report-note">
              {t('Bu raporda ilk {count} kayıt yer alıyor.', { count: entries.length })}
            </p>
          ) : null}
        </section>

        {images.length > 0 ? (
          <section className="report-section">
            <h2>
              {t('Medya')} <span className="report-count">{images.length}</span>
            </h2>
            <div className="report-gallery">
              {images.slice(0, 12).map((item) => (
                <figure key={item.id}>
                  <MediaImage src={item.url} alt={item.originalName ?? asset.title} />
                </figure>
              ))}
            </div>
            {images.length > 12 ? (
              <p className="report-note">
                {t('Galeride {count} görselden ilk 12 tanesi gösteriliyor.', { count: images.length })}
              </p>
            ) : null}
          </section>
        ) : null}

        <footer className="report-footer">
          <span>{t('Rapor, izleer varlık hafızasından oluşturuldu.')}</span>
          <span>
            {asset.title} · {generatedAt}
          </span>
        </footer>
      </article>

      <p className="report-back no-print">
        <Link href={`/varliklar/${asset.id}`} className="btn btn-ghost">
          <Icon name="arrow-left" size={16} />
          {t('Varlığa dön')}
        </Link>
      </p>
    </main>
  );
}
