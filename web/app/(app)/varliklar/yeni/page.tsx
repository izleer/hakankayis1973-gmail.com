import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icons';
import { NewAssetForm } from '@/components/NewAssetForm';
import { api, requireViewer } from '@/lib/api';
import { adConfig } from '@/lib/ads';
import { formatNumber } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import { limitsFor, reachedAssetLimit, showsAds } from '@/lib/plan';
import type { AssetType, PlanInfo } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Yeni varlık') };
}

export default async function NewAssetPage() {
  const viewer = await requireViewer();
  const { t, locale } = await getI18n();
  const [types, plan] = await Promise.all([
    api<{ items: AssetType[] }>('/v1/asset-types'),
    api<PlanInfo>('/v1/me/plan'),
  ]);
  const limits = limitsFor(viewer);
  const limitReached = reachedAssetLimit(viewer, plan.usage.assets);
  const ads = showsAds(viewer) ? adConfig() : null;

  if (limitReached) {
    const max = limits.maxAssets ?? 0;
    return (
      <main className="page page-narrow">
        <Link href="/varliklar" className="back-link">
          <Icon name="arrow-left" size={16} />
          {t('Varlıklar')}
        </Link>
        <section className="limit-page" aria-label={t('Plan sınırı')}>
          <span className="premium-gate-icon">
            <Icon name="lock" size={26} />
          </span>
          <span className="eyebrow">{t('ÜCRETSİZ PLAN')}</span>
          <h1>{t('Varlık sınırına ulaştın')}</h1>
          <p>
            {t(
              'Ücretsiz planda {max} varlık oluşturabilirsin. Mevcut varlıkların ve kayıtların olduğu gibi kalır.',
              { max },
            )}
          </p>
          <div className="limit-usage">
            <span>
              {formatNumber(plan.usage.assets, locale)} / {formatNumber(max, locale)}
            </span>
            <span className="limit-usage-track">
              <span
                className="limit-usage-fill"
                style={{ width: `${Math.min(100, Math.round((plan.usage.assets / max) * 100))}%` }}
              />
            </span>
          </div>
          <div className="premium-gate-actions">
            <Link href="/plan" className="btn btn-primary">
              <Icon name="sparkles" size={17} />
              {t('Premium ile sınırsız varlık')}
            </Link>
            <Link href="/varliklar" className="btn btn-ghost">
              {t('Varlıklarına dön')}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page page-narrow">
      <Link href="/varliklar" className="back-link">
        <Icon name="arrow-left" size={16} />
        {t('Varlıklar')}
      </Link>
      <header className="page-head compact">
        <div>
          <span className="eyebrow">{t('Hafızaya yeni bir iz')}</span>
          <h1>{t('Yeni varlık')}</h1>
          <p>
            {t('Bir canlı, bir eser, bir mekân… Adını koy, ilk fotoğrafını ekle ve hikâyesini başlat.')}
          </p>
        </div>
      </header>
      {limits.maxAssets !== null ? (
        <p className="plan-inline">
          <Icon name="leaf" size={14} />
          {t('Ücretsiz plan: {used} / {max} varlık', {
            used: plan.usage.assets,
            max: limits.maxAssets,
          })}
          <Link href="/plan">{t('Premium’a geç')}</Link>
        </p>
      ) : null}
      <NewAssetForm
        types={types.items}
        adSlot={
          showsAds(viewer)
            ? { client: ads?.client ?? '', slot: ads?.slots.assets ?? '' }
            : null
        }
      />
    </main>
  );
}
