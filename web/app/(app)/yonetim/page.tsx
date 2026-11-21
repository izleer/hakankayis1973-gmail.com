import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlanLimitEditor } from '@/components/PlanLimitEditor';
import { PlanRequestQueue } from '@/components/PlanRequestQueue';
import { UserLimitOverrides } from '@/components/UserLimitOverrides';
import { api, requireViewer } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import type { PlanLimitHistoryItem, PlanLimitRule } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Yönetim') };
}

export default async function AdminPage() {
  const viewer = await requireViewer();
  if (viewer.role !== 'admin') notFound();
  const t = await getT();

  const [catalog, history] = await Promise.all([
    api<{ rules: PlanLimitRule[]; keys: string[] }>('/v1/admin/plan-limits'),
    api<{ items: PlanLimitHistoryItem[] }>('/v1/admin/plan-limits/history?limit=20'),
  ]);

  return (
    <main className="page admin-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Paket yönetimi')}</span>
          <h1>{t('Yönetim')}</h1>
          <p>
            {t(
              'Plan sınırlarını kod değiştirmeden güncelle. Her kuralın nasıl uygulanacağını (zorunlu, uyarı, gölge) ayrı ayrı seçebilirsin.',
            )}
          </p>
        </div>
      </header>
      <PlanRequestQueue />
      <PlanLimitEditor rules={catalog.rules} history={history.items} />
      <UserLimitOverrides />
    </main>
  );
}
