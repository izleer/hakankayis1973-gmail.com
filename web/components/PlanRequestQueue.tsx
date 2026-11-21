'use client';

import { useCallback, useEffect, useState } from 'react';
import { vh } from '@/lib/client';
import { useT } from '@/lib/i18n/client';
import type { PlanRequestItem } from '@/lib/types';
import { Icon } from './Icons';

function planLabel(plan: string): string {
  if (plan === 'plus') return 'Plus';
  if (plan === 'premium') return 'Premium';
  return 'Ücretsiz';
}

/**
 * Yönetici onayı bekleyen plan talepleri. Onay planı yükseltir; ret yalnızca
 * talebi kapatır. Liste işlemden sonra yeniden yüklenir.
 */
export function PlanRequestQueue() {
  const t = useT();
  const [items, setItems] = useState<PlanRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vh.get<{ items: PlanRequestItem[] }>(
        'admin/plan-requests?status=pending',
      );
      setItems(data.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Talepler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    setError(null);
    try {
      await vh.patch(`admin/plan-requests/${id}`, { action });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('İşlem tamamlanamadı.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="admin-section" aria-label={t('Plan talepleri')}>
      <header className="admin-section-head">
        <div>
          <span className="eyebrow">{t('PLAN TALEPLERİ')}</span>
          <h2>{t('Onay bekleyen talepler')}</h2>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
          {loading ? t('Yükleniyor…') : t('Yenile')}
        </button>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <p className="muted">{t('Bekleyen plan talebi yok.')}</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.id} className="admin-list-item">
              <div>
                <strong>
                  {item.user.displayName} <span className="muted">@{item.user.username}</span>
                </strong>
                <p className="muted">
                  {t('Mevcut plan')}: {planLabel(item.user.plan)} → {planLabel(item.plan)}
                  {item.note ? ` · ${item.note}` : ''}
                </p>
                <p className="muted">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="admin-list-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void decide(item.id, 'approve')}
                  disabled={busy !== null}
                >
                  <Icon name="check" size={16} />
                  {busy === item.id ? t('İşleniyor…') : t('Onayla')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void decide(item.id, 'reject')}
                  disabled={busy !== null}
                >
                  <Icon name="close" size={16} />
                  {t('Reddet')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
