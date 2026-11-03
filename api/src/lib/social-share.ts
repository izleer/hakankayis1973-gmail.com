import { queryOne } from '../db.js';
import { ApiError } from './errors.js';
import { decryptSecret } from './crypto.js';
import {
  createInstagramContainer,
  instagramPermalink,
  publishInstagramContainer,
  publishPageReel,
  publishPageStory,
  uploadPagePhoto,
  uploadPageVideo,
  waitForInstagramContainer,
} from './meta.js';
import { publicMediaUrl, readStorageObject } from './storage.js';

export type SocialFormat = 'post' | 'story' | 'reel';
export type SocialProvider = 'facebook' | 'instagram';

export type SocialConnectionRow = {
  id: string;
  user_id: string;
  provider: SocialProvider;
  external_id: string;
  account_name: string;
  account_username: string | null;
  page_id: string;
  page_name: string;
  token_cipher: string;
  token_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type ShareMediaRow = {
  id: string;
  kind: 'image' | 'video' | 'document';
  storage_key: string | null;
  mime_type: string;
  original_name: string | null;
};

export type ResolvedShareMedia = {
  id: string;
  kind: 'image' | 'video';
  storageKey: string;
  mimeType: string;
  filename: string;
  publicUrl: string | null;
};

function mediaFromRow(row: ShareMediaRow | null): ResolvedShareMedia | null {
  if (!row || !row.storage_key) return null;
  if (row.kind !== 'image' && row.kind !== 'video') return null;
  return {
    id: row.id,
    kind: row.kind,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    filename: row.original_name ?? `varlik.${row.kind === 'image' ? 'jpg' : 'mp4'}`,
    publicUrl: null,
  };
}

async function loadMediaById(mediaId: string, assetId: string): Promise<ShareMediaRow | null> {
  return queryOne<ShareMediaRow>(
    `SELECT m.id, m.kind, m.storage_key, m.mime_type, m.original_name
     FROM media m
     WHERE m.id = $1
       AND m.status = 'ready'
       AND (
         m.asset_id = $2
         OR EXISTS (
           SELECT 1 FROM journal_entries je
           WHERE je.id = m.entry_id AND je.asset_id = $2 AND je.deleted_at IS NULL
         )
       )`,
    [mediaId, assetId],
  );
}

async function loadLatestMedia(
  assetId: string,
  kind: 'image' | 'video',
): Promise<ShareMediaRow | null> {
  return queryOne<ShareMediaRow>(
    `SELECT m.id, m.kind, m.storage_key, m.mime_type, m.original_name
     FROM media m
     LEFT JOIN journal_entries je ON je.id = m.entry_id AND je.deleted_at IS NULL
     WHERE m.status = 'ready'
       AND m.kind = $2::media_kind
       AND (m.asset_id = $1 OR je.asset_id = $1)
     ORDER BY m.created_at DESC
     LIMIT 1`,
    [assetId, kind],
  );
}

async function loadCoverMedia(assetId: string): Promise<ShareMediaRow | null> {
  return queryOne<ShareMediaRow>(
    `SELECT m.id, m.kind, m.storage_key, m.mime_type, m.original_name
     FROM assets a
     JOIN media m ON m.id = a.cover_media_id
     WHERE a.id = $1
       AND m.status = 'ready'`,
    [assetId],
  );
}

/**
 * Paylaşılacak medyayı seçer. Hikâyede kapak fotoğrafı esas alınır; kapak
 * yoksa varlığa bağlı en yeni görsel kullanılır.
 */
export async function resolveShareMedia(input: {
  assetId: string;
  format: SocialFormat;
  mediaId?: string;
}): Promise<ResolvedShareMedia> {
  let row: ShareMediaRow | null = null;
  if (input.mediaId) {
    row = await loadMediaById(input.mediaId, input.assetId);
    if (!row) {
      throw new ApiError(
        422,
        'SOCIAL_MEDIA_NOT_FOUND',
        'Seçilen medya bu varlığa ait değil veya hazır değil.',
      );
    }
  } else if (input.format === 'reel') {
    row = await loadLatestMedia(input.assetId, 'video');
  } else if (input.format === 'story') {
    row = await loadCoverMedia(input.assetId);
    const cover = mediaFromRow(row);
    if (!cover || cover.kind !== 'image') row = await loadLatestMedia(input.assetId, 'image');
  } else {
    row = await loadCoverMedia(input.assetId);
    const cover = mediaFromRow(row);
    if (!cover) row = await loadLatestMedia(input.assetId, 'image');
  }

  const media = mediaFromRow(row);
  if (!media) {
    throw new ApiError(
      422,
      'SOCIAL_MEDIA_MISSING',
      input.format === 'reel'
        ? 'Reels paylaşımı için varlığa bağlı bir video gerekiyor.'
        : 'Paylaşım için varlığa bağlı bir görsel gerekiyor.',
    );
  }
  if (input.format === 'story' && media.kind !== 'image') {
    throw new ApiError(422, 'SOCIAL_STORY_IMAGE', 'Hikâye paylaşımı için bir görsel gerekiyor.');
  }
  if (input.format === 'reel' && media.kind !== 'video') {
    throw new ApiError(422, 'SOCIAL_REEL_VIDEO', 'Reels paylaşımı için bir video gerekiyor.');
  }

  media.publicUrl = await publicMediaUrl(media.storageKey);
  return media;
}

export async function performSocialShare(input: {
  connection: SocialConnectionRow;
  format: SocialFormat;
  media: ResolvedShareMedia;
  caption: string | null;
}): Promise<{ externalId: string | null; permalink: string | null }> {
  const token = decryptSecret(input.connection.token_cipher);
  const { connection, format, media, caption } = input;

  if (connection.provider === 'facebook') {
    if (format === 'story') {
      const uploaded = await uploadPagePhoto(connection.page_id, token, {
        buffer: await readStorageObject(media.storageKey),
        mimeType: media.mimeType,
        filename: media.filename,
        published: false,
      });
      const story = await publishPageStory(connection.page_id, token, uploaded.id);
      return { externalId: story.id ?? uploaded.id, permalink: null };
    }

    if (format === 'reel') {
      const reel = await publishPageReel(connection.page_id, token, {
        buffer: await readStorageObject(media.storageKey),
        mimeType: media.mimeType,
        filename: media.filename,
        description: caption ?? undefined,
      });
      return {
        externalId: reel.videoId,
        permalink: `https://www.facebook.com/reel/${reel.videoId}`,
      };
    }

    if (media.kind === 'video') {
      const video = await uploadPageVideo(connection.page_id, token, {
        buffer: await readStorageObject(media.storageKey),
        mimeType: media.mimeType,
        filename: media.filename,
        description: caption ?? undefined,
      });
      return {
        externalId: video.id,
        permalink: `https://www.facebook.com/${connection.page_id}/videos/${video.id}`,
      };
    }

    const photo = await uploadPagePhoto(connection.page_id, token, {
      buffer: await readStorageObject(media.storageKey),
      mimeType: media.mimeType,
      filename: media.filename,
      message: caption ?? undefined,
      published: true,
    });
    const postId = photo.post_id ?? photo.id;
    return {
      externalId: postId,
      permalink: `https://www.facebook.com/${postId}`,
    };
  }

  if (!media.publicUrl) {
    throw new ApiError(
      409,
      'SOCIAL_MEDIA_NOT_PUBLIC',
      "Instagram paylaşımı için medyanın herkese açık bir HTTPS adresinden erişilebilmesi gerekiyor. MEDIA_PUBLIC_BASE_URL ayarlayın veya S3 depolamaya geçin.",
    );
  }

  if (format === 'reel') {
    const container = await createInstagramContainer(connection.external_id, token, {
      videoUrl: media.publicUrl,
      caption: caption ?? undefined,
      mediaType: 'REELS',
      shareToFeed: true,
    });
    await waitForInstagramContainer(container, token);
    const mediaId = await publishInstagramContainer(connection.external_id, token, container);
    return {
      externalId: mediaId,
      permalink: await instagramPermalink(mediaId, token),
    };
  }

  if (format === 'story') {
    const container = await createInstagramContainer(connection.external_id, token, {
      imageUrl: media.publicUrl,
      mediaType: 'STORIES',
    });
    await waitForInstagramContainer(container, token);
    const mediaId = await publishInstagramContainer(connection.external_id, token, container);
    return {
      externalId: mediaId,
      permalink: await instagramPermalink(mediaId, token),
    };
  }

  if (media.kind === 'video') {
    throw new ApiError(
      422,
      'SOCIAL_IG_POST_VIDEO',
      'Instagram gönderisi için bir fotoğraf seçin; videoları Reels olarak paylaşabilirsiniz.',
    );
  }

  const container = await createInstagramContainer(connection.external_id, token, {
    imageUrl: media.publicUrl,
    caption: caption ?? undefined,
  });
  await waitForInstagramContainer(container, token);
  const mediaId = await publishInstagramContainer(connection.external_id, token, container);
  return {
    externalId: mediaId,
    permalink: await instagramPermalink(mediaId, token),
  };
}
