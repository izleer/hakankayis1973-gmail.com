import { query } from '../db.js';

type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'community_join'
  | 'community_post'
  | 'system';

export async function notify(input: {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  message: string;
}): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;
  try {
    await query(
      `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.userId,
        input.actorId ?? null,
        input.type,
        input.entityType ?? null,
        input.entityId ?? null,
        input.message.slice(0, 300),
      ],
    );
  } catch (error) {
    console.error('Bildirim oluşturulamadı:', error);
  }
}
