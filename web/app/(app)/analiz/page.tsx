import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icons';
import { PremiumGate } from '@/components/PremiumGate';
import { api, requireViewer } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/format';
import { localeTags } from '@/lib/i18n/config';
import { getI18n } from '@/lib/i18n/server';
import { isPremium } from '@/lib/plan';
import type { AnalyticsData } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Analiz merkezi') };
}

export default async function AnalyticsPage() {
  const viewer = await requireViewer();
  const { t, locale } = await getI18n();

  if (!isPremium(viewer)) {
    return (
      <PremiumGate
        title={t('Analiz merkezi Premium’da açılır')}
        body={t(
          'Varlıklarını yan yana karşılaştır, 12 aylık kayıt eğilimini gör ve yönetim kararlarını veriye dayandır.',
        )}
      />
    );
  }

  const data = await api<AnalyticsData>('/v1/stats/analytics');
  const monthFormatter = new Intl.DateTimeFormat(localeTags[locale], { month: 'short' });
  const maxMonth = Math.max(1, ...data.monthly.map((item) => item.count));
  const maxType = Math.max(1, ...data.byType.map((item) => item.count));
  const totals = data.totals;

  return (
    <main className="page page-analytics">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('PREMIUM · ANALİZ VE YÖNETİM')}</span>
          <h1>{t('Analiz merkezi')}</h1>
          <p>
            {t(
              'Hafızanın nabzı: tür dağılımı, 12 aylık kayıt eğilimi ve varlıkların yan yana karşılaştırması.',
            )}
          </p>
        </div>
        <Link href="/plan" className="btn btn-ghost">
          <Icon name="sparkles" size={16} />
          {t('Planın')}
        </Link>
      </header>

      <section className="analytics-stats" aria-label={t('Özet')}>
        <div className="analytics-stat">
          <span className="stat-icon">
            <Icon name="leaf" size={18} />
          </span>
          <div>
            <strong>{formatNumber(totals.assets, locale)}</strong>
            <span>{t('Varlık')}</span>
          </div>
        </div>
        <div className="analytics-stat">
          <span className="stat-icon">
            <Icon name="book" size={18} />
          </span>
          <div>
            <strong>{formatNumber(totals.entries, locale)}</strong>
            <span>{t('Kayıt')}</span>
          </div>
        </div>
        <div className="analytics-stat">
          <span className="stat-icon">
            <Icon name="image" size={18} />
          </span>
          <div>
            <strong>{formatNumber(totals.media, locale)}</strong>
            <span>{t('Medya')}</span>
          </div>
        </div>
        <div className="analytics-stat">
          <span className="stat-icon">
            <Icon name="users" size={18} />
          </span>
          <div>
            <strong>{formatNumber(totals.sharedGroups, locale)}</strong>
            <span>{t('Paylaşılan grup')}</span>
          </div>
        </div>
        <div className="analytics-stat">
          <span className="stat-icon">
            <Icon name="ruler" size={18} />
          </span>
          <div>
            <strong>{formatNumber(totals.averageEntries, locale)}</strong>
            <span>{t('Varlık başına kayıt')}</span>
          </div>
        </div>
        <div className="analytics-stat">
          <span className="stat-icon">
            <Icon name="archive" size={18} />
          </span>
          <div>
            <strong>{formatNumber(totals.archivedAssets, locale)}</strong>
            <span>{t('Arşivlenen')}</span>
          </div>
        </div>
      </section>

      {totals.assets === 0 ? (
        <EmptyState
          icon="ruler"
          title={t('Analiz için henüz veri yok')}
          body={t('İlk varlığını ve kayıtlarını eklediğinde burada bir tablo oluşacak.')}
          action={{ href: '/varliklar/yeni', label: t('Yeni varlık ekle') }}
        />
      ) : (
        <>
          <div className="analytics-grid">
            <section className="analytics-card" aria-label={t('Kayıt eğilimi')}>
              <header>
                <div>
                  <span className="eyebrow">{t('SON 12 AY')}</span>
                  <h2>{t('Kayıt eğilimi')}</h2>
                </div>
                <span className="analytics-total">
                  {formatNumber(data.monthly.reduce((sum, item) => sum + item.count, 0), locale)}
                </span>
              </header>
              <div className="analytics-bars" role="img" aria-label={t('Aylık kayıt sayıları')}>
                {data.monthly.map((item) => {
                  const height = Math.max(3, Math.round((item.count / maxMonth) * 100));
                  return (
                    <div className="analytics-bar" key={item.month}>
                      <span className="analytics-bar-value">{item.count}</span>
                      <span
                        className={`analytics-bar-fill${item.count === 0 ? ' is-empty' : ''}`}
                        style={{ height: `${item.count === 0 ? 3 : height}%` }}
                      />
                      <span className="analytics-bar-label">
                        {monthFormatter.format(new Date(`${item.month}-01T00:00:00Z`))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="analytics-card" aria-label={t('Tür dağılımı')}>
              <header>
                <div>
                  <span className="eyebrow">{t('DAĞILIM')}</span>
                  <h2>{t('Tür dağılımı')}</h2>
                </div>
                <span className="analytics-total">{formatNumber(data.byType.length, locale)}</span>
              </header>
              <ul className="analytics-types">
                {data.byType.map((item) => (
                  <li key={item.label}>
                    <span className="analytics-type-label">{item.label}</span>
                    <span className="analytics-type-track">
                      <span
                        className="analytics-type-fill"
                        style={{ width: `${Math.max(6, Math.round((item.count / maxType) * 100))}%` }}
                      />
                    </span>
                    <span className="analytics-type-count">{item.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="analytics-card analytics-compare" aria-label={t('Varlık karşılaştırması')}>
            <header>
              <div>
                <span className="eyebrow">{t('KARŞILAŞTIRMA')}</span>
                <h2>{t('Varlık karşılaştırması')}</h2>
                <p>{t('Kayıt sayısına göre sıralı; son iz tarihiyle birlikte.')}</p>
              </div>
            </header>
            <div className="analytics-table-scroll">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th scope="col">{t('Varlık')}</th>
                    <th scope="col">{t('Tür')}</th>
                    <th scope="col">{t('Kayıt')}</th>
                    <th scope="col">{t('Medya')}</th>
                    <th scope="col">{t('İlk kayıt')}</th>
                    <th scope="col">{t('Son iz')}</th>
                    <th scope="col">{t('Durum')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((asset) => (
                    <tr key={asset.id}>
                      <th scope="row">
                        <Link href={`/varliklar/${asset.id}`}>{asset.title}</Link>
                      </th>
                      <td>{asset.typeLabel}</td>
                      <td>{formatNumber(asset.entryCount, locale)}</td>
                      <td>{formatNumber(asset.mediaCount, locale)}</td>
                      <td>{asset.firstEntryAt ? formatDate(asset.firstEntryAt, locale) : '—'}</td>
                      <td>{asset.lastEntryAt ? formatDate(asset.lastEntryAt, locale) : '—'}</td>
                      <td>
                        <span className={`status-pill${asset.status === 'archived' ? ' is-archived' : ''}`}>
                          {asset.status === 'archived' ? t('Arşiv') : t('Güncel')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
