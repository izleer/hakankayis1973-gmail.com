import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icons';
import { PlanActions } from '@/components/PlanActions';
import { api, requireViewer } from '@/lib/api';
import { formatBytes, formatDate, formatNumber } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { PLAN_LIMITS } from '@/lib/plan';
import type { PlanInfo } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Plan ve yetkiler') };
}

export default async function PlanPage() {
  const viewer = await requireViewer();
  const { t, locale } = await getI18n();
  const info = await api<PlanInfo>('/v1/me/plan');
  const premium = info.plan === 'premium';
  const limits = info.limits;
  const freeLimits = PLAN_LIMITS.free;
  const storageLimit = limits.maxStorageBytes ?? null;
  const storageUsed = info.usage.storageBytes ?? 0;
  const warnings = info.warnings ?? [];
  const storagePct =
    storageLimit !== null && storageLimit > 0
      ? Math.min(100, Math.round((storageUsed / storageLimit) * 100))
      : null;

  const rows: { label: string; free: string; premium: string; icon: IconName }[] = [
    {
      label: t('Mobil'),
      free: t('Günlük kayıt ve takip'),
      premium: t('Gelişmiş kayıt ve takip'),
      icon: 'sprout',
    },
    {
      label: t('Web'),
      free: t('Görüntüleme ve temel düzenleme'),
      premium: t('Analiz ve yönetim merkezi'),
      icon: 'grid',
    },
    {
      label: t('Varlık'),
      free: t('{count} varlık', { count: freeLimits.maxAssets ?? 0 }),
      premium: t('Sınırsız'),
      icon: 'leaf',
    },
    {
      label: t('Geçmiş kaydı'),
      free: t('Varlık başına {count} kayıt', { count: freeLimits.maxEntriesPerAsset ?? 0 }),
      premium: t('Sınırsız'),
      icon: 'book',
    },
    {
      label: t('Fotoğraf'),
      free: t('Kayıt başına 1 dosya'),
      premium: t('Kayıt başına 10 dosya'),
      icon: 'image',
    },
    {
      label: t('Depolama'),
      free:
        (freeLimits.maxStorageBytes ?? null) === null
          ? t('Sınırsız')
          : formatBytes(freeLimits.maxStorageBytes!, locale),
      premium:
        (PLAN_LIMITS.premium.maxStorageBytes ?? null) === null
          ? t('Sınırsız')
          : formatBytes(PLAN_LIMITS.premium.maxStorageBytes!, locale),
      icon: 'archive',
    },
    {
      label: t('Analiz'),
      free: t('Temel'),
      premium: t('Gelişmiş'),
      icon: 'ruler',
    },
    {
      label: t('Karşılaştırma'),
      free: t('Yok'),
      premium: t('Var'),
      icon: 'grid',
    },
    {
      label: t('Rapor'),
      free: t('Yok'),
      premium: t('Var'),
      icon: 'file',
    },
    {
      label: t('Bulut'),
      free: t('Sınırlı'),
      premium: t('Tam'),
      icon: 'globe',
    },
    {
      label: t('Reklam'),
      free: t('Reklamlı'),
      premium: t('Reklamsız'),
      icon: 'eye',
    },
  ];

  return (
    <main className="page page-narrow">
      <Link href="/profil" className="back-link">
        <Icon name="arrow-left" size={16} />
        {t('Profil')}
      </Link>

      <header className="page-head">
        <div>
          <span className="eyebrow">{t('PLANLAR')}</span>
          <h1>{t('Plan ve yetkiler')}</h1>
          <p>
            {t(
              'Ücretsiz planla başla; kayıtların her planda senin kalır. Premium, sınırları kaldırır ve web’i bir analiz merkezine dönüştürür.',
            )}
          </p>
        </div>
      </header>

      {warnings.length > 0 ? (
        <ul className="plan-warnings" aria-label={t('Kota uyarıları')}>
          {warnings.map((warning) => (
            <li
              key={warning.limitKey}
              className={`plan-warning${warning.level === 'blocked' ? ' is-blocked' : ''}`}
            >
              <Icon name="alert" size={16} />
              <span>{warning.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <section className={`plan-current${premium ? ' is-premium' : ''}`} aria-label={t('Mevcut plan')}>
        <div className="plan-current-head">
          <span className="plan-badge">{premium ? t('PREMIUM') : t('ÜCRETSİZ')}</span>
          <div>
            <h2>{premium ? t('Premium plan') : t('Ücretsiz plan')}</h2>
            <p>
              {premium
                ? t('Gelişmiş kayıt ve takip, analiz ve yönetim merkezi açık.')
                : t('Günlük kayıt ve takip için ihtiyacın olan her şey açık.')}
            </p>
          </div>
        </div>
        <dl className="plan-usage">
          <div>
            <dt>{t('Varlıkların')}</dt>
            <dd>
              {formatNumber(info.usage.assets, locale)}
              {limits.maxAssets !== null ? ` / ${formatNumber(limits.maxAssets, locale)}` : ''}
            </dd>
          </div>
          <div>
            <dt>{t('Fotoğraf / kayıt')}</dt>
            <dd>{limits.maxMediaPerEntry === null ? t('Sınırsız') : formatNumber(limits.maxMediaPerEntry, locale)}</dd>
          </div>
          <div>
            <dt>{t('Depolama')}</dt>
            <dd>
              {formatBytes(storageUsed, locale)}
              {storageLimit === null
                ? ` · ${t('Sınırsız')}`
                : ` / ${formatBytes(storageLimit, locale)}`}
            </dd>
            {storagePct !== null ? (
              <div
                className={`plan-meter${
                  storagePct >= 90 ? ' is-danger' : storagePct >= 70 ? ' is-warning' : ''
                }`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={storagePct}
              >
                <span style={{ width: `${storagePct}%` }} />
              </div>
            ) : null}
          </div>
          <div>
            <dt>{t('Plan başlangıcı')}</dt>
            <dd>{info.startedAt ? formatDate(info.startedAt, locale) : t('Yeni hesap')}</dd>
          </div>
        </dl>
        <PlanActions current={info.plan} />
      </section>

      <section className="plan-matrix-wrap" aria-label={t('Plan karşılaştırması')}>
        <header className="plan-matrix-head">
          <h2>{t('Plan karşılaştırması')}</h2>
          <p>{t('Aynı hafıza, farklı derinlik. Okuma ve dışa aktarma her planda açıktır.')}</p>
        </header>
        <div className="plan-matrix-scroll">
          <table className="plan-matrix">
            <thead>
              <tr>
                <th scope="col">{t('Özellik')}</th>
                <th scope="col" className={!premium ? 'is-current' : undefined}>
                  {t('Ücretsiz')}
                </th>
                <th scope="col" className={premium ? 'is-current' : undefined}>
                  {t('Premium')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">
                    <Icon name={row.icon} size={16} />
                    {row.label}
                  </th>
                  <td className={!premium ? 'is-current' : undefined}>{row.free}</td>
                  <td className={premium ? 'is-current' : undefined}>{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="plan-notes">
        <p>
          <Icon name="check" size={15} />
          {t('Plan düşse bile mevcut varlık ve kayıtlar silinmez; yalnızca yeni yazmalar sınırlara tabi olur.')}
        </p>
        <p>
          <Icon name="download" size={15} />
          {t('Verilerini dışa aktarma her planda açıktır.')}
        </p>
      </section>

      <div className="plan-links">
        {premium ? (
          <Link href="/analiz" className="btn btn-primary">
            <Icon name="ruler" size={17} />
            {t('Analiz merkezini aç')}
          </Link>
        ) : (
          <Link href="/varliklar" className="btn btn-ghost">
            <Icon name="grid" size={17} />
            {t('Varlıklarına dön')}
          </Link>
        )}
      </div>
    </main>
  );
}
