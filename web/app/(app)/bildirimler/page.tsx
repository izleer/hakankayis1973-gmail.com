import type { Metadata } from 'next';
import { NotificationsList } from '@/components/NotificationsList';
import { api, requireViewer } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import type { Notification } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Bildirimler') };
}

export default async function NotificationsPage() {
  const t = await getT();
  await requireViewer();
  const data = await api<{
    items: Notification[];
    unreadCount: number;
    nextCursor: string | null;
  }>('/v1/notifications?limit=40');

  return (
    <main className="page page-narrow">
      <header className="page-head compact">
        <div>
          <span className="eyebrow">{t('Sana dokunan izler')}</span>
          <h1>{t('Bildirimler')}</h1>
          <p>
            {t(
              'Varlıklarına, gönderilerine ve hafızana başkaları dokunduğunda burada görünür.',
            )}
          </p>
        </div>
      </header>

      <NotificationsList initial={data.items} initialUnread={data.unreadCount} />
    </main>
  );
}
