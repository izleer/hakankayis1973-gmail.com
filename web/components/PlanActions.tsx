'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { useT } from '@/lib/i18n/client';
import type { Plan, PlanRequest } from '@/lib/types';
import { Icon } from './Icons';

/**
 * Plan yükseltme talebi. Kullanıcı kendi planını doğrudan değiştiremez;
 * talebi admin onayladığında plan etkinleşir.
 */
export function PlanActions({
  current,
  request = null,
}: {
  current: Plan;
  request?: PlanRequest | null;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<Plan | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function requestPlan(plan: 'premium' | 'plus') {
    setBusy(plan);
    setError(null);
    setNotice(null);
    try {
      await vh.post('me/plan-request', { plan });
      setNotice(t('Talebiniz alındı. Yönetici onayından sonra plan etkinleşecek.'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Talep oluşturulamadı.'));
    } finally {
      setBusy(null);
    }
  }

  async function cancelRequest() {
    setBusy('cancel');
    setError(null);
    setNotice(null);
    try {
      await vh.delete('me/plan-request');
      setNotice(t('Bekleyen plan talebiniz iptal edildi.'));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Talep iptal edilemedi.'));
    } finally {
      setBusy(null);
    }
  }

  if (request) {
    const label = request.plan === 'plus' ? t('Plus') : t('Premium');
    return (
      <div className="plan-actions">
        <p className="plan-notice" role="status">
          <Icon name="clock" size={15} />
          {t('{plan} plan talebiniz yönetici onayı bekliyor.', { plan: label })}
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={cancelRequest}
          disabled={busy !== null}
        >
          {busy === 'cancel' ? t('İptal ediliyor…') : t('Talebi iptal et')}
        </button>
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

  return (
    <div className="plan-actions">
      {current === 'free' ? (
        <>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => requestPlan('premium')}
            disabled={busy !== null}
          >
            <Icon name="sparkles" size={17} />
            {busy === 'premium' ? t('Gönderiliyor…') : t('Premium talep et')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => requestPlan('plus')}
            disabled={busy !== null}
          >
            <Icon name="sparkles" size={17} />
            {busy === 'plus' ? t('Gönderiliyor…') : t('Plus talep et')}
          </button>
        </>
      ) : current === 'premium' ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => requestPlan('plus')}
          disabled={busy !== null}
        >
          <Icon name="sparkles" size={17} />
          {busy === 'plus' ? t('Gönderiliyor…') : t('Plus’a yükselt')}
        </button>
      ) : (
        <p className="plan-notice">
          <Icon name="check" size={15} />
          {t('Plus planınız etkin.')}
        </p>
      )}
      <p className="plan-note">
        <Icon name="lock" size={14} />
        {t('Plan değişiklikleri yönetici onayıyla yapılır.')}
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
