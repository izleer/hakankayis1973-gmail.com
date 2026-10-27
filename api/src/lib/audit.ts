import { query } from '../db.js';

export async function audit(
  actorId: string | null,
  action: string,
  entityType?: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
  ip?: string | null,
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_events (actor_id, action, entity_type, entity_id, metadata, ip)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [actorId, action, entityType ?? null, entityId ?? null, JSON.stringify(metadata), ip ?? null],
    );
  } catch (error) {
    console.error('Denetim kaydı yazılamadı:', error);
  }
}
