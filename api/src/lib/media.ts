import { query } from '../db.js';
import { ApiError, forbidden, notFound } from './errors.js';

type Target = { assetId?: string | null; entryId?: string | null; postId?: string | null };

export async function attachMedia(
  mediaIds: string[] | undefined,
  ownerId: string,
  target: Target,
): Promise<void> {
  if (!mediaIds || mediaIds.length === 0) return;
  const unique = [...new Set(mediaIds)];
  if (unique.length > 8) {
    throw new ApiError(422, 'TOO_MANY_MEDIA', 'Bir kayda en fazla 8 medya eklenebilir.');
  }

  const rows = await query<{ id: string; owner_id: string; status: string }>(
    `SELECT id, owner_id, status FROM media WHERE id = ANY($1::uuid[])`,
    [unique],
  );
  if (rows.length !== unique.length) notFound('Medya bulunamadı.');
  if (rows.some((row) => row.owner_id !== ownerId)) {
    forbidden('Yalnızca kendi yüklediğiniz medyayı ekleyebilirsiniz.');
  }
  if (rows.some((row) => row.status !== 'ready')) {
    throw new ApiError(422, 'MEDIA_NOT_READY', 'Medya henüz hazır değil.');
  }

  const targetColumn =
    target.postId != null ? 'post_id' : target.entryId != null ? 'entry_id' : 'asset_id';
  const targetValue = target.postId ?? target.entryId ?? target.assetId;
  if (!targetValue) return;

  await query(
    `UPDATE media SET
       post_id = CASE WHEN $1::uuid IS NOT NULL THEN $1 ELSE post_id END,
       entry_id = CASE WHEN $2::uuid IS NOT NULL THEN $2 ELSE entry_id END,
       asset_id = CASE WHEN $3::uuid IS NOT NULL THEN $3 ELSE asset_id END
     WHERE id = ANY($4::uuid[])
       AND owner_id = $5
       AND (${targetColumn} IS NULL OR ${targetColumn} = $6)`,
    [
      target.postId ?? null,
      target.entryId ?? null,
      target.assetId ?? null,
      unique,
      ownerId,
      targetValue,
    ],
  );
}
