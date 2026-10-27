import { NotificationsList } from '@/components/NotificationsList';
import { api, requireViewer } from '@/lib/api';
import type { Notification } from '@/lib/types';

export const metadata = { title: 'Bildirimler' };

export default async function NotificationsPage() {
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
          <span className="eyebrow">Sana dokunan izler</span>
          <h1>Bildirimler</h1>
          <p>
            Varlıklarına, gönderilerine ve hafızana başkaları dokunduğunda burada
            görünür.
          </p>
        </div>
      </header>

      <NotificationsList initial={data.items} initialUnread={data.unreadCount} />
    </main>
  );
}
