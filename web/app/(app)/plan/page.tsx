import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icons';
import { PlanActions } from '@/components/PlanActions';
import { api, requireViewer } from '@/lib/api';
import { formatBytes, formatDate, formatNumber } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { PLAN_LIMITS } from '@/lib/plan';
import type { Plan, PlanInfo } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Plan ve yetkiler') };
}

function planTitle(plan: Plan): string {
  if (plan === 'plus') return 'Plus';
  if (plan === 'premium') return 'Premium';
  return 'Ücretsiz';
}

export default async function PlanPage() {
  await requireViewer();
  const { t, locale } = await getI18n();
  const info = await api<PlanInfo>('/v1/me/plan');
  const current = info.plan;
  const limits = info.limits;
  const storageLimit = limits.maxStorageBytes ?? null;
  const storageUsed = info.usage.storageBytes ?? 0;
  const warnings = info.warnings ?? [];
  const storagePct =
    storageLimit !== null && storageLimit > 0
      ? Math.min(100, Math.round((storageUsed / storageLimit) * 100))
      : null;

  const storageText = (value: number | null): string =>
    value === null ? t('Sınırsız') : formatBytes(value, locale);

  const rows: {
    label: string;
    free: string;
    premium: string;
    plus: string;
    icon: IconName;
  }[] = [
    {
      label: t('Varlık'),
      free: formatNumber(PLAN_LIMITS.free.maxAssets ?? 0, locale),
      premium: formatNumber(PLAN_LIMITS.premium.maxAssets ?? 0, locale),
      plus: formatNumber(PLAN_LIMITS.plus.maxAssets ?? 0, locale),
      icon: 'leaf',
    },
    {
      label: t('Varlık başına kayıt'),
      free: formatNumber(PLAN_LIMITS.free.maxEntriesPerAsset ?? 0, locale),
      premium: formatNumber(PLAN_LIMITS.premium.maxEntriesPerAsset ?? 0, locale),
      plus: formatNumber(PLAN_LIMITS.plus.maxEntriesPerAsset ?? 0, locale),
      icon: 'book',
    },
    {
      label: t('Kayıt başına fotoğraf'),
      free: formatNumber(PLAN_LIMITS.free.maxMediaPerEntry ?? 0, locale),
      premium: formatNumber(PLAN_LIMITS.premium.maxMediaPerEntry ?? 0, locale),
      plus: formatNumber(PLAN_LIMITS.plus.maxMediaPerEntry ?? 0, locale),
      icon: 'image',
    },
    {
      label: t('Varlık başına dosya'),
      free: formatNumber(PLAN_LIMITS.free.maxMediaPerAsset ?? 0, locale),
      premium: formatNumber(PLAN_LIMITS.premium.maxMediaPerAsset ?? 0, locale),
      plus: formatNumber(PLAN_LIMITS.plus.maxMediaPerAsset ?? 0, locale),
      icon: 'archive',
    },
    {
      label: t('Depolama'),
      free: storageText(PLAN_LIMITS.free.maxStorageBytes),
      premium: storageText(PLAN_LIMITS.premium.maxStorageBytes),
      plus: storageText(PLAN_LIMITS.plus.maxStorageBytes),
      icon: 'archive',
    },
    {
      label: t('Fotoğraf geçmişi'),
      free: t('Temel'),
      premium: t('Gelişmiş'),
      plus: t('Gelişmiş'),
      icon: 'camera',
    },
    {
      label: t('Fotoğraf karşılaştırma'),
      free: t('Yok'),
      premium: t('Var'),
      plus: t('Gelişmiş'),
      icon: 'grid',
    },
    {
      label: t('Ölçüm grafikleri'),
      free: t('Yok'),
      premium: t('Temel'),
      plus: t('Gelişmiş'),
      icon: 'ruler',
    },
    {
      label: t('Hatırlatmalar'),
      free: t('Temel'),
      premium: t('Gelişmiş'),
      plus: t('Gelişmiş'),
      icon: 'clock',
    },
    {
      label: t('PDF rapor'),
      free: t('Yok'),
      premium: t('Yok'),
      plus: t('Var'),
      icon: 'file',
    },
    {
      label: t('Toplu dışa aktarma'),
      free: t('Yok'),
      premium: t('Yok'),
      plus: t('Var'),
      icon: 'download',
    },
    {
      label: t('Web analizleri'),
      free: t('Temel'),
      premium: t('Gelişmiş'),
      plus: t('Tam'),
      icon: 'grid',
    },
    {
      label: t('Reklam'),
      free: t('Reklamlı'),
      premium: t('Reklamsız'),
      plus: t('Reklamsız'),
      icon: 'eye',
    },
  ];

  const planClass = (plan: Plan) => (current === plan ? 'is-current' : undefined);

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
              'Ücretsiz planla başla; kayıtların her planda senin kalır. Premium ve Plus, sınırları genişletir; Plus rapor ve toplu dışa aktarmayı açar.',
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

      <section
        className={`plan-current${current !== 'free' ? ' is-premium' : ''}`}
        aria-label={t('Mevcut plan')}
      >
        <div className="plan-current-head">
          <span className="plan-badge">{t(planTitle(current).toUpperCase())}</span>
          <div>
            <h2>{t('{plan} plan', { plan: t(planTitle(current)) })}</h2>
            <p>
              {current === 'plus'
                ? t('Tüm özellikler ve en yüksek kotalar açık.')
                : current === 'premium'
                  ? t('Gelişmiş kayıt ve takip, analiz ve karşılaştırma açık.')
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
            <dd>
              {limits.maxMediaPerEntry === null
                ? t('Sınırsız')
                : formatNumber(limits.maxMediaPerEntry, locale)}
            </dd>
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
        <PlanActions current={current} request={info.request ?? null} />
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
                <th scope="col" className={planClass('free')}>
                  {t('Ücretsiz')}
                </th>
                <th scope="col" className={planClass('premium')}>
                  {t('Premium')}
                </th>
                <th scope="col" className={planClass('plus')}>
                  {t('Plus')}
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
                  <td className={planClass('free')}>{row.free}</td>
                  <td className={planClass('premium')}>{row.premium}</td>
                  <td className={planClass('plus')}>{row.plus}</td>
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
        {current !== 'free' ? (
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
