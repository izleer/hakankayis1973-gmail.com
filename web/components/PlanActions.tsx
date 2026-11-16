'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { useT } from '@/lib/i18n/client';
import type { Plan, PlanInfo } from '@/lib/types';
import { Icon } from './Icons';

/**
 * Plan yükseltme/düşürme. Ödeme altyapısı bağlanana kadar seçim anında
 * geçerli olur; bu not arayüzde açıkça gösterilir.
 */
export function PlanActions({ current }: { current: Plan }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function change(plan: Plan) {
    setBusy(plan);
    setError(null);
    setNotice(null);
    try {
      await vh.patch<PlanInfo>('me/plan', { plan });
      setNotice(
        plan === 'premium'
          ? t('Premium plan etkinleştirildi. Sınırsız varlık, gelişmiş analiz ve raporlar açıldı.')
          : t('Ücretsiz plana geçildi. Mevcut kayıtların silinmedi; yalnızca yeni yazmalar sınırlara tabi.'),
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Plan değiştirilemedi.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="plan-actions">
      {current === 'free' ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => change('premium')}
          disabled={busy !== null}
        >
          <Icon name="sparkles" size={17} />
          {busy === 'premium' ? t('Etkinleştiriliyor…') : t('Premium’a geç')}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => change('free')}
          disabled={busy !== null}
        >
          {busy === 'free' ? t('Değiştiriliyor…') : t('Ücretsiz plana dön')}
        </button>
      )}
      <p className="plan-note">
        <Icon name="lock" size={14} />
        {t(
          'Ödeme altyapısı henüz bağlı değil; plan seçimi şimdilik anında geçerli olur.',
        )}
      </p>
      {notice ? (
        <p className="plan-notice" role="status">
          <Icon name="check" size={15} />
          {notice}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
