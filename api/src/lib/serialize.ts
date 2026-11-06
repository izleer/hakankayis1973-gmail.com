import { query } from '../db.js';
import { iso } from './http.js';
import type { Locale } from './locale.js';
import { mediaUrl } from './storage.js';
import { translateTypeLabel } from './taxonomy.js';

type Row = Record<string, any>;

export type MediaDto = {
  id: string;
  kind: 'image' | 'video' | 'document';
  status: 'pending' | 'ready' | 'failed';
  url: string | null;
  mimeType: string;
  originalName: string | null;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export async function mapMedia(row: Row): Promise<MediaDto> {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    url: await mediaUrl(row.storage_key),
    mimeType: row.mime_type,
    originalName: row.original_name,
    byteSize: Number(row.byte_size),
    width: row.width,
    height: row.height,
    createdAt: iso(row.created_at)!,
  };
}

/**
 * Satırları hedef kimliğine göre gruplar. Sıralı ilerler: aynı kayda ait
 * medyalar paralel işlendiğinde her görev kendi boş listesini oluşturup
 * öncekini eziyordu (fotoğraf + belge eklenince ilki kayboluyordu).
 */
async function groupMedia(rows: Row[], key: 'entry_id' | 'post_id'): Promise<Map<string, MediaDto[]>> {
  const grouped = new Map<string, MediaDto[]>();
  for (const row of rows) {
    const id = row[key];
    const list = grouped.get(id) ?? [];
    list.push(await mapMedia(row));
    grouped.set(id, list);
  }
  return grouped;
}

export async function mediaForEntries(entryIds: string[]): Promise<Map<string, MediaDto[]>> {
  if (entryIds.length === 0) return new Map();
  const rows = await query<Row>(
    `SELECT * FROM media
     WHERE entry_id = ANY($1::uuid[]) AND status = 'ready'
     ORDER BY created_at ASC`,
    [entryIds],
  );
  return groupMedia(rows, 'entry_id');
}

export async function mediaForPosts(postIds: string[]): Promise<Map<string, MediaDto[]>> {
  if (postIds.length === 0) return new Map();
  const rows = await query<Row>(
    `SELECT * FROM media
     WHERE post_id = ANY($1::uuid[]) AND status = 'ready'
     ORDER BY created_at ASC`,
    [postIds],
  );
  return groupMedia(rows, 'post_id');
}

export function mapUserMini(row: Row, prefix = ''): {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
} {
  return {
    id: row[`${prefix}id`],
    username: row[`${prefix}username`],
    displayName: row[`${prefix}display_name`],
    avatarUrl: row[`${prefix}avatar_url`],
  };
}

export function mapUser(row: Row): {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  role: 'user' | 'moderator' | 'admin';
  interests: string[];
  createdAt: string;
  onboardedAt: string | null;
} {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    role: row.role,
    interests: row.interests ?? [],
    createdAt: iso(row.created_at)!,
    onboardedAt: iso(row.onboarded_at),
  };
}

export type AssetDto = {
  id: string;
  title: string;
  description: string | null;
  visibility: 'private' | 'selected' | 'friends' | 'public';
  status: 'active' | 'archived';
  coverUrl: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  acquiredAt: string | null;
  attributes: Record<string, unknown>;
  owner: ReturnType<typeof mapUserMini>;
  type: { id: string; label: string; parentId: string | null; icon: string | null };
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

function dateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function mapAsset(row: Row, locale: Locale = 'tr'): Promise<AssetDto> {
  const cover = row.cover_storage_key ? await mediaUrl(row.cover_storage_key) : row.cover_url;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    status: row.status,
    coverUrl: cover ?? null,
    locationName: row.location_name,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    acquiredAt: dateOnly(row.acquired_at),
    attributes: row.attributes ?? {},
    owner: mapUserMini(row, 'owner_'),
    type: {
      id: row.type_id,
      label: translateTypeLabel(locale, row.type_label),
      parentId: row.type_parent_id,
      icon: row.type_icon,
    },
    entryCount: Number(row.entry_count ?? 0),
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

export async function mapEntry(row: Row, media: MediaDto[] = []): Promise<Record<string, unknown>> {
  return {
    id: row.id,
    assetId: row.asset_id,
    type: row.type,
    title: row.title,
    body: row.body,
    occurredAt: iso(row.occurred_at)!,
    visibility: row.visibility,
    locationName: row.location_name,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    attributes: row.attributes ?? {},
    author: mapUserMini(row, 'author_'),
    media,
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
  };
}

export async function mapPost(
  row: Row,
  media: MediaDto[] = [],
  locale: Locale = 'tr',
): Promise<Record<string, unknown>> {
  const assetCover = row.asset_cover_storage_key
    ? await mediaUrl(row.asset_cover_storage_key)
    : row.asset_cover_url;

  return {
    id: row.id,
    body: row.body,
    audience: row.audience,
    status: row.status,
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    author: mapUserMini(row, 'author_'),
    asset: row.asset_id && row.asset_title
      ? {
          id: row.asset_id,
          title: row.asset_title,
          coverUrl: assetCover ?? null,
          visibility: row.asset_visibility,
          typeLabel: translateTypeLabel(locale, row.asset_type_label),
        }
      : null,
    entry: row.entry_id
      ? {
          id: row.entry_id,
          title: row.entry_title,
          type: row.entry_type,
          occurredAt: iso(row.entry_occurred_at),
        }
      : null,
    community: row.community_id
      ? {
          id: row.community_id,
          slug: row.community_slug,
          name: row.community_name,
        }
      : null,
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    likedByMe: Boolean(row.liked_by_me),
    media,
  };
}

export function mapCommunity(row: Row): Record<string, unknown> {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category ?? null,
    rules: row.rules ?? null,
    visibility: row.visibility,
    joinPolicy: row.join_policy ?? 'open',
    coverUrl: row.cover_url,
    memberCount: Number(row.member_count ?? 0),
    postCount: Number(row.post_count ?? 0),
    assetCount: Number(row.asset_count ?? 0),
    role: row.role ?? null,
    membershipStatus: row.role ? 'active' : row.membership_pending ? 'pending' : null,
    owner: row.owner_username ? mapUserMini(row, 'owner_') : null,
    createdAt: iso(row.created_at)!,
  };
}
