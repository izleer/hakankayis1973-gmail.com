import { query } from '../db.js';
import { translate, type MessageParams } from './i18n/index.js';

type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'community_join'
  | 'community_post'
  | 'community_invite'
  | 'community_request'
  | 'community_approved'
  | 'system';

export async function notify(input: {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  /** Çeviri anahtarı; Türkçe şablon metni olarak da kullanılır. */
  messageKey?: string;
  messageParams?: MessageParams;
  /** Çeviri yoksa kullanılacak hazır metin. */
  message?: string;
}): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;
  const fallback =
    input.message ??
    (input.messageKey ? translate('tr', input.messageKey, input.messageParams) : '');
  try {
    await query(
      `INSERT INTO notifications
         (user_id, actor_id, type, entity_type, entity_id, message, message_key, message_params)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.userId,
        input.actorId ?? null,
        input.type,
        input.entityType ?? null,
        input.entityId ?? null,
        fallback.slice(0, 300),
        input.messageKey ?? null,
        input.messageParams ? JSON.stringify(input.messageParams) : null,
      ],
    );
  } catch (error) {
    console.error('Bildirim oluşturulamadı:', error);
  }
}
