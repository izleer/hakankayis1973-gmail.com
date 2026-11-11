import { transaction } from '../db.js';
import { translate } from './i18n/index.js';

export const REMINDER_MESSAGE_KEY = '“{asset}” için hatırlatma: {title}';
export const REMINDER_MESSAGE_FALLBACK_KEY = '“{asset}” için bir hatırlatma zamanı geldi.';

type ReminderRow = {
  id: string;
  asset_id: string;
  author_id: string;
  title: string | null;
  body: string | null;
  due_at: Date;
  asset_title: string;
};

/**
 * Bildirimde gösterilecek metni üretir. Başlık yoksa notun ilk satırları
 * kullanılır; o da yoksa yalnızca varlık adıyla sade bir metne düşer.
 */
export function reminderMessage(
  assetTitle: string,
  title: string | null,
  body: string | null,
): { key: string; params: Record<string, string>; text: string } {
  const trimmedTitle = title?.trim();
  const excerpt = body?.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!trimmedTitle && !excerpt) {
    const params = { asset: assetTitle };
    return {
      key: REMINDER_MESSAGE_FALLBACK_KEY,
      params,
      text: translate('tr', REMINDER_MESSAGE_FALLBACK_KEY, params),
    };
  }
  const params = { asset: assetTitle, title: trimmedTitle || excerpt! };
  return {
    key: REMINDER_MESSAGE_KEY,
    params,
    text: translate('tr', REMINDER_MESSAGE_KEY, params),
  };
}

/**
 * Zamanı gelmiş, henüz bildirilmemiş ve tamamlanmamış hatırlatmaları bulur.
 * Satırlar `FOR UPDATE SKIP LOCKED` ile kilitlenir; aynı anda çalışan API
 * kopyaları aynı hatırlatmayı iki kez bildirmez. Bildirim kaydı ile
 * `reminder_notified_at` güncellemesi aynı işlemdedir.
 */
export async function processDueReminders(options: {
  userId?: string;
  limit?: number;
} = {}): Promise<number> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  return transaction(async (client) => {
    const params: unknown[] = [];
    let userFilter = '';
    if (options.userId) {
      params.push(options.userId);
      userFilter = `AND je.author_id = $${params.length}`;
    }
    params.push(limit);

    const rows = await client.query<ReminderRow>(
      `SELECT je.id, je.asset_id, je.author_id, je.title, je.body, je.due_at,
              a.title AS asset_title
       FROM journal_entries je
       JOIN assets a ON a.id = je.asset_id AND a.deleted_at IS NULL
       JOIN users u ON u.id = je.author_id AND u.deleted_at IS NULL
       WHERE je.type = 'reminder'
         AND je.deleted_at IS NULL
         AND je.due_at IS NOT NULL
         AND je.due_at <= now()
         AND je.reminder_notified_at IS NULL
         AND je.reminder_done_at IS NULL
         ${userFilter}
       ORDER BY je.due_at ASC
       FOR UPDATE OF je SKIP LOCKED
       LIMIT $${params.length}`,
      params,
    );
    const count = rows.rows.length;
    if (count === 0) return 0;

    const ids = rows.rows.map((row) => row.id);
    await client.query(
      `UPDATE journal_entries
       SET reminder_notified_at = now()
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );

    for (const row of rows.rows) {
      const message = reminderMessage(row.asset_title, row.title, row.body);
      await client.query(
        `INSERT INTO notifications
           (user_id, type, entity_type, entity_id, message, message_key, message_params)
         VALUES ($1, 'reminder', 'asset', $2, $3, $4, $5::jsonb)`,
        [
          row.author_id,
          row.asset_id,
          message.text.slice(0, 300),
          message.key,
          JSON.stringify(message.params),
        ],
      );
    }
    return count;
  });
}
