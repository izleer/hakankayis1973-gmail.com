import { getDatabase } from './index';
import { newId, nowIso } from '../lib/ids';
import type {
  ArchiveStats,
  Asset,
  AssetType,
  Entry,
  EntryType,
  ExportJob,
  ExportStatus,
  ExportType,
  MediaItem,
  ReminderRow,
  TimelineEntry,
  Visibility,
} from '../types';

type AssetRow = {
  id: string;
  name: string;
  type_slug: string | null;
  type_name: string | null;
  description: string | null;
  location: string | null;
  acquired_on: string | null;
  cover_path: string | null;
  visibility: Visibility;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  entry_count?: number;
  media_count?: number;
};

type EntryRow = {
  id: string;
  asset_id: string;
  type: EntryType;
  title: string;
  note: string | null;
  occurred_at: string;
  measurement_value: number | null;
  measurement_unit: string | null;
  reminder_at: string | null;
  reminder_done: number;
  extra_json: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  asset_name?: string;
  asset_type_name?: string | null;
};

type MediaRow = {
  id: string;
  asset_id: string;
  entry_id: string | null;
  kind: 'image' | 'video' | 'document';
  relative_path: string;
  mime: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
  deleted_at: string | null;
};

type JobRow = {
  id: string;
  export_type: ExportType;
  status: ExportStatus;
  started_at: string | null;
  completed_at: string | null;
  file_path: string | null;
  file_name: string | null;
  total_files: number;
  processed_files: number;
  total_bytes: number;
  processed_bytes: number;
  error_message: string | null;
  options_json: string | null;
};

function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    typeSlug: row.type_slug,
    typeName: row.type_name,
    description: row.description,
    location: row.location,
    acquiredOn: row.acquired_on,
    coverPath: row.cover_path,
    visibility: row.visibility,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    entryCount: row.entry_count,
    mediaCount: row.media_count,
  };
}

function mapEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    assetId: row.asset_id,
    type: row.type,
    title: row.title,
    note: row.note,
    occurredAt: row.occurred_at,
    measurementValue: row.measurement_value,
    measurementUnit: row.measurement_unit,
    reminderAt: row.reminder_at,
    reminderDone: row.reminder_done === 1,
    extraJson: row.extra_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    assetId: row.asset_id,
    entryId: row.entry_id,
    kind: row.kind,
    relativePath: row.relative_path,
    mime: row.mime,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapJob(row: JobRow): ExportJob {
  return {
    id: row.id,
    exportType: row.export_type,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    filePath: row.file_path,
    fileName: row.file_name,
    totalFiles: row.total_files,
    processedFiles: row.processed_files,
    totalBytes: row.total_bytes,
    processedBytes: row.processed_bytes,
    errorMessage: row.error_message,
    optionsJson: row.options_json,
  };
}

const ASSET_SELECT = `
  SELECT a.*, t.name AS type_name,
    (SELECT count(*) FROM entries e WHERE e.asset_id = a.id AND e.deleted_at IS NULL) AS entry_count,
    (SELECT count(*) FROM media m WHERE m.asset_id = a.id AND m.deleted_at IS NULL) AS media_count
  FROM assets a
  LEFT JOIN asset_types t ON t.slug = a.type_slug
`;

export async function listAssetTypes(): Promise<AssetType[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    slug: string;
    name: string;
    parent_slug: string | null;
    sort: number;
  }>('SELECT slug, name, parent_slug, sort FROM asset_types ORDER BY sort ASC');
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    parentSlug: row.parent_slug,
    sort: row.sort,
  }));
}

export interface AssetFilter {
  search?: string;
  typeSlug?: string | null;
  status?: 'active' | 'archived' | 'all';
}

export async function listAssets(filter: AssetFilter = {}): Promise<Asset[]> {
  const db = await getDatabase();
  const where: string[] = ['a.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (filter.status && filter.status !== 'all') {
    where.push('a.status = ?');
    params.push(filter.status);
  }
  if (filter.typeSlug) {
    where.push('(a.type_slug = ? OR a.type_slug LIKE ?)');
    params.push(filter.typeSlug, `${filter.typeSlug}-%`);
  }
  if (filter.search?.trim()) {
    where.push('(a.name LIKE ? OR a.description LIKE ? OR a.location LIKE ?)');
    const term = `%${filter.search.trim()}%`;
    params.push(term, term, term);
  }
  const rows = await db.getAllAsync<AssetRow>(
    `${ASSET_SELECT} WHERE ${where.join(' AND ')} ORDER BY a.updated_at DESC`,
    params,
  );
  return rows.map(mapAsset);
}

export async function getAsset(id: string): Promise<Asset | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AssetRow>(
    `${ASSET_SELECT} WHERE a.id = ? AND a.deleted_at IS NULL`,
    [id],
  );
  return row ? mapAsset(row) : null;
}

export interface AssetInput {
  name: string;
  typeSlug: string | null;
  description?: string | null;
  location?: string | null;
  acquiredOn?: string | null;
  coverPath?: string | null;
  visibility?: Visibility;
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const db = await getDatabase();
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO assets
      (id, name, type_slug, description, location, acquired_on, cover_path, visibility, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      id,
      input.name.trim(),
      input.typeSlug,
      input.description?.trim() || null,
      input.location?.trim() || null,
      input.acquiredOn || null,
      input.coverPath ?? null,
      input.visibility ?? 'private',
      now,
      now,
    ],
  );
  const asset = await getAsset(id);
  if (!asset) throw new Error('Varlık oluşturulamadı.');
  return asset;
}

export async function updateAsset(id: string, patch: Partial<AssetInput>): Promise<Asset> {
  const db = await getDatabase();
  const fields: string[] = [];
  const params: (string | null)[] = [];
  const assign = (column: string, value: string | null) => {
    fields.push(`${column} = ?`);
    params.push(value);
  };
  if (patch.name !== undefined) assign('name', patch.name.trim());
  if (patch.typeSlug !== undefined) assign('type_slug', patch.typeSlug);
  if (patch.description !== undefined) assign('description', patch.description?.trim() || null);
  if (patch.location !== undefined) assign('location', patch.location?.trim() || null);
  if (patch.acquiredOn !== undefined) assign('acquired_on', patch.acquiredOn || null);
  if (patch.coverPath !== undefined) assign('cover_path', patch.coverPath);
  if (patch.visibility !== undefined) assign('visibility', patch.visibility);
  assign('updated_at', nowIso());
  params.push(id);
  await db.runAsync(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`, params);
  const asset = await getAsset(id);
  if (!asset) throw new Error('Varlık bulunamadı.');
  return asset;
}

export async function setAssetStatus(id: string, status: 'active' | 'archived'): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE assets SET status = ?, updated_at = ? WHERE id = ?', [
    status,
    nowIso(),
    id,
  ]);
}

/** Varlığı ve bağlı kayıtlarını siler; silinen medya yollarını döner. */
export async function softDeleteAsset(id: string): Promise<string[]> {
  const db = await getDatabase();
  const media = await db.getAllAsync<{ relative_path: string }>(
    'SELECT relative_path FROM media WHERE asset_id = ? AND deleted_at IS NULL',
    [id],
  );
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE media SET deleted_at = ? WHERE asset_id = ? AND deleted_at IS NULL', [
      stamp,
      id,
    ]);
    await db.runAsync(
      'UPDATE entries SET deleted_at = ? WHERE asset_id = ? AND deleted_at IS NULL',
      [stamp, id],
    );
    await db.runAsync('UPDATE assets SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      stamp,
      stamp,
      id,
    ]);
  });
  return media.map((row) => row.relative_path);
}

export interface EntryInput {
  assetId: string;
  type: EntryType;
  title: string;
  note?: string | null;
  occurredAt: string;
  measurementValue?: number | null;
  measurementUnit?: string | null;
  reminderAt?: string | null;
  reminderDone?: boolean;
  extraJson?: string | null;
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  const db = await getDatabase();
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO entries
      (id, asset_id, type, title, note, occurred_at, measurement_value, measurement_unit,
       reminder_at, reminder_done, extra_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.assetId,
      input.type,
      input.title.trim(),
      input.note?.trim() || null,
      input.occurredAt,
      input.measurementValue ?? null,
      input.measurementUnit ?? null,
      input.reminderAt ?? null,
      input.reminderDone ? 1 : 0,
      input.extraJson ?? null,
      now,
      now,
    ],
  );
  await db.runAsync('UPDATE assets SET updated_at = ? WHERE id = ?', [now, input.assetId]);
  const entry = await getEntry(id);
  if (!entry) throw new Error('Kayıt oluşturulamadı.');
  return entry;
}

export async function getEntry(id: string): Promise<Entry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<EntryRow>(
    'SELECT * FROM entries WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return row ? mapEntry(row) : null;
}

export async function updateEntry(id: string, patch: Partial<EntryInput>): Promise<Entry> {
  const db = await getDatabase();
  const fields: string[] = [];
  const params: (string | number | null)[] = [];
  const assign = (column: string, value: string | number | null) => {
    fields.push(`${column} = ?`);
    params.push(value);
  };
  if (patch.type !== undefined) assign('type', patch.type);
  if (patch.title !== undefined) assign('title', patch.title.trim());
  if (patch.note !== undefined) assign('note', patch.note?.trim() || null);
  if (patch.occurredAt !== undefined) assign('occurred_at', patch.occurredAt);
  if (patch.measurementValue !== undefined) assign('measurement_value', patch.measurementValue ?? null);
  if (patch.measurementUnit !== undefined) assign('measurement_unit', patch.measurementUnit ?? null);
  if (patch.reminderAt !== undefined) assign('reminder_at', patch.reminderAt ?? null);
  if (patch.reminderDone !== undefined) assign('reminder_done', patch.reminderDone ? 1 : 0);
  if (patch.extraJson !== undefined) assign('extra_json', patch.extraJson);
  assign('updated_at', nowIso());
  params.push(id);
  await db.runAsync(`UPDATE entries SET ${fields.join(', ')} WHERE id = ?`, params);
  const entry = await getEntry(id);
  if (!entry) throw new Error('Kayıt bulunamadı.');
  await db.runAsync('UPDATE assets SET updated_at = ? WHERE id = ?', [nowIso(), entry.assetId]);
  return entry;
}

export async function softDeleteEntry(id: string): Promise<void> {
  const db = await getDatabase();
  const entry = await getEntry(id);
  if (!entry) return;
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE media SET deleted_at = ? WHERE entry_id = ? AND deleted_at IS NULL', [
      stamp,
      id,
    ]);
    await db.runAsync('UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      stamp,
      stamp,
      id,
    ]);
  });
}

export async function listEntries(assetId: string): Promise<TimelineEntry[]> {
  const db = await getDatabase();
  const entries = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries
     WHERE asset_id = ? AND deleted_at IS NULL
     ORDER BY occurred_at DESC, created_at DESC`,
    [assetId],
  );
  const media = await db.getAllAsync<MediaRow>(
    'SELECT * FROM media WHERE asset_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    [assetId],
  );
  const mediaByEntry = new Map<string, MediaItem[]>();
  for (const row of media) {
    if (!row.entry_id) continue;
    const item = mapMedia(row);
    const list = mediaByEntry.get(row.entry_id) ?? [];
    list.push(item);
    mediaByEntry.set(row.entry_id, list);
  }
  return entries.map(
    (row): TimelineEntry => ({
      ...mapEntry(row),
      media: mediaByEntry.get(row.id) ?? [],
    }),
  );
}

export async function listRecentEntries(limit = 8): Promise<TimelineEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT e.*, a.name AS asset_name
     FROM entries e
     JOIN assets a ON a.id = e.asset_id
     WHERE e.deleted_at IS NULL AND a.deleted_at IS NULL
     ORDER BY e.occurred_at DESC, e.created_at DESC
     LIMIT ?`,
    [limit],
  );
  const entries = rows.map((row) => ({ ...mapEntry(row), media: [], assetName: row.asset_name }));
  const media = await attachMediaToEntries(entries.map((entry) => entry.id));
  return entries.map((entry) => ({ ...entry, media: media.get(entry.id) ?? [] }));
}

async function attachMediaToEntries(entryIds: string[]): Promise<Map<string, MediaItem[]>> {
  const map = new Map<string, MediaItem[]>();
  if (entryIds.length === 0) return map;
  const db = await getDatabase();
  const placeholders = entryIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<MediaRow>(
    `SELECT * FROM media WHERE entry_id IN (${placeholders}) AND deleted_at IS NULL ORDER BY created_at ASC`,
    entryIds,
  );
  for (const row of rows) {
    if (!row.entry_id) continue;
    const list = map.get(row.entry_id) ?? [];
    list.push(mapMedia(row));
    map.set(row.entry_id, list);
  }
  return map;
}

export async function listReminders(options: { includeDone?: boolean; limit?: number } = {}): Promise<
  ReminderRow[]
> {
  const db = await getDatabase();
  const where = [
    "e.type = 'reminder'",
    'e.deleted_at IS NULL',
    'a.deleted_at IS NULL',
    'e.reminder_at IS NOT NULL',
  ];
  if (!options.includeDone) where.push('e.reminder_done = 0');
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT e.*, a.name AS asset_name, t.name AS asset_type_name
     FROM entries e
     JOIN assets a ON a.id = e.asset_id
     LEFT JOIN asset_types t ON t.slug = a.type_slug
     WHERE ${where.join(' AND ')}
     ORDER BY e.reminder_done ASC, e.reminder_at ASC
     LIMIT ?`,
    [options.limit ?? 100],
  );
  return rows.map((row) => ({
    ...mapEntry(row),
    assetName: row.asset_name ?? '',
    assetTypeName: row.asset_type_name ?? null,
  }));
}

export async function setReminderDone(id: string, done: boolean): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE entries SET reminder_done = ?, updated_at = ? WHERE id = ?', [
    done ? 1 : 0,
    nowIso(),
    id,
  ]);
}

export async function getStats(): Promise<ArchiveStats> {
  const db = await getDatabase();
  const counts = await db.getFirstAsync<{
    assets: number;
    entries: number;
    media: number;
    bytes: number;
    archived: number;
  }>(
    `SELECT
      (SELECT count(*) FROM assets WHERE deleted_at IS NULL AND status = 'active') AS assets,
      (SELECT count(*) FROM entries e JOIN assets a ON a.id = e.asset_id
        WHERE e.deleted_at IS NULL AND a.deleted_at IS NULL) AS entries,
      (SELECT count(*) FROM media m JOIN assets a ON a.id = m.asset_id
        WHERE m.deleted_at IS NULL AND a.deleted_at IS NULL) AS media,
      (SELECT COALESCE(sum(m.bytes), 0) FROM media m JOIN assets a ON a.id = m.asset_id
        WHERE m.deleted_at IS NULL AND a.deleted_at IS NULL) AS bytes,
      (SELECT count(*) FROM assets WHERE deleted_at IS NULL AND status = 'archived') AS archived`,
  );
  const due = await db.getFirstAsync<{ count: number }>(
    `SELECT count(*) AS count FROM entries e JOIN assets a ON a.id = e.asset_id
     WHERE e.type = 'reminder' AND e.reminder_done = 0 AND e.deleted_at IS NULL
       AND a.deleted_at IS NULL AND e.reminder_at IS NOT NULL`,
  );
  return {
    assets: counts?.assets ?? 0,
    entries: counts?.entries ?? 0,
    media: counts?.media ?? 0,
    bytes: counts?.bytes ?? 0,
    archived: counts?.archived ?? 0,
    dueReminders: due?.count ?? 0,
  };
}

export interface MediaInput {
  assetId: string;
  entryId: string | null;
  kind?: 'image' | 'video' | 'document';
  relativePath: string;
  mime?: string | null;
  bytes: number;
  width?: number | null;
  height?: number | null;
}

export async function attachMedia(input: MediaInput): Promise<MediaItem> {
  const db = await getDatabase();
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO media (id, asset_id, entry_id, kind, relative_path, mime, bytes, width, height, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.assetId,
      input.entryId,
      input.kind ?? 'image',
      input.relativePath,
      input.mime ?? null,
      input.bytes,
      input.width ?? null,
      input.height ?? null,
      now,
    ],
  );
  return {
    id,
    assetId: input.assetId,
    entryId: input.entryId,
    kind: input.kind ?? 'image',
    relativePath: input.relativePath,
    mime: input.mime ?? null,
    bytes: input.bytes,
    width: input.width ?? null,
    height: input.height ?? null,
    createdAt: now,
    deletedAt: null,
  };
}

export async function listEntryMedia(entryId: string): Promise<MediaItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MediaRow>(
    'SELECT * FROM media WHERE entry_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    [entryId],
  );
  return rows.map(mapMedia);
}

export async function listAssetMedia(assetId: string): Promise<MediaItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MediaRow>(
    'SELECT * FROM media WHERE asset_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    [assetId],
  );
  return rows.map(mapMedia);
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MediaRow>(
    'SELECT * FROM media WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return row ? mapMedia(row) : null;
}

export async function deleteMedia(id: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ relative_path: string }>(
    'SELECT relative_path FROM media WHERE id = ?',
    [id],
  );
  await db.runAsync('UPDATE media SET deleted_at = ? WHERE id = ?', [nowIso(), id]);
  return row?.relative_path ?? null;
}

export async function setAssetCover(assetId: string, relativePath: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE assets SET cover_path = ?, updated_at = ? WHERE id = ?', [
    relativePath,
    nowIso(),
    assetId,
  ]);
}

export interface PhotoExportRow {
  media: MediaItem;
  assetName: string;
  assetTypeName: string | null;
  assetTypeSlug: string | null;
  entryTitle: string | null;
  entryDate: string | null;
  entryType: string | null;
}

export async function listPhotoExportRows(options: {
  assetIds?: string[];
  from?: string;
  to?: string;
}): Promise<PhotoExportRow[]> {
  const db = await getDatabase();
  const where = ['m.deleted_at IS NULL', 'a.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (options.assetIds && options.assetIds.length > 0) {
    where.push(`m.asset_id IN (${options.assetIds.map(() => '?').join(', ')})`);
    params.push(...options.assetIds);
  }
  if (options.from) {
    where.push('COALESCE(e.occurred_at, m.created_at) >= ?');
    params.push(options.from);
  }
  if (options.to) {
    where.push('COALESCE(e.occurred_at, m.created_at) <= ?');
    params.push(options.to);
  }
  const rows = await db.getAllAsync<
    MediaRow & {
      asset_name: string;
      asset_type_name: string | null;
      asset_type_slug: string | null;
      entry_title: string | null;
      entry_date: string | null;
      entry_type: string | null;
    }
  >(
    `SELECT m.*, a.name AS asset_name, a.type_slug AS asset_type_slug, t.name AS asset_type_name,
            e.title AS entry_title, e.occurred_at AS entry_date, e.type AS entry_type
     FROM media m
     JOIN assets a ON a.id = m.asset_id
     LEFT JOIN asset_types t ON t.slug = a.type_slug
     LEFT JOIN entries e ON e.id = m.entry_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.name ASC, COALESCE(e.occurred_at, m.created_at) ASC`,
    params,
  );
  return rows.map((row) => ({
    media: mapMedia(row),
    assetName: row.asset_name,
    assetTypeName: row.asset_type_name,
    assetTypeSlug: row.asset_type_slug,
    entryTitle: row.entry_title,
    entryDate: row.entry_date,
    entryType: row.entry_type,
  }));
}

export interface ReportEntryRow {
  entry: Entry;
  assetName: string;
  assetTypeName: string | null;
  location: string | null;
}

export async function listReportEntries(options: {
  assetIds?: string[];
  from?: string;
  to?: string;
}): Promise<ReportEntryRow[]> {
  const db = await getDatabase();
  const where = ['e.deleted_at IS NULL', 'a.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  if (options.assetIds && options.assetIds.length > 0) {
    where.push(`e.asset_id IN (${options.assetIds.map(() => '?').join(', ')})`);
    params.push(...options.assetIds);
  }
  if (options.from) {
    where.push('e.occurred_at >= ?');
    params.push(options.from);
  }
  if (options.to) {
    where.push('e.occurred_at <= ?');
    params.push(options.to);
  }
  const rows = await db.getAllAsync<
    EntryRow & { asset_name: string; asset_type_name: string | null; location: string | null }
  >(
    `SELECT e.*, a.name AS asset_name, a.location, t.name AS asset_type_name
     FROM entries e
     JOIN assets a ON a.id = e.asset_id
     LEFT JOIN asset_types t ON t.slug = a.type_slug
     WHERE ${where.join(' AND ')}
     ORDER BY a.name ASC, e.occurred_at DESC`,
    params,
  );
  return rows.map((row) => ({
    entry: mapEntry(row),
    assetName: row.asset_name,
    assetTypeName: row.asset_type_name,
    location: row.location,
  }));
}

export async function createExportJob(
  exportType: ExportType,
  status: ExportStatus,
  options?: unknown,
): Promise<ExportJob> {
  const db = await getDatabase();
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO export_jobs (id, export_type, status, started_at, created_at, options_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, exportType, status, now, now, options ? JSON.stringify(options) : null],
  );
  const job = await getExportJob(id);
  if (!job) throw new Error('Aktarım işi oluşturulamadı.');
  return job;
}

export async function getExportJob(id: string): Promise<ExportJob | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<JobRow>('SELECT * FROM export_jobs WHERE id = ?', [id]);
  return row ? mapJob(row) : null;
}

export async function listExportJobs(limit = 30): Promise<ExportJob[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<JobRow>(
    'SELECT * FROM export_jobs ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(mapJob);
}

export interface JobPatch {
  status?: ExportStatus;
  filePath?: string | null;
  fileName?: string | null;
  totalFiles?: number;
  processedFiles?: number;
  totalBytes?: number;
  processedBytes?: number;
  errorMessage?: string | null;
  completedAt?: string | null;
}

export async function updateExportJob(id: string, patch: JobPatch): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const params: (string | number | null)[] = [];
  const assign = (column: string, value: string | number | null) => {
    fields.push(`${column} = ?`);
    params.push(value);
  };
  if (patch.status !== undefined) assign('status', patch.status);
  if (patch.filePath !== undefined) assign('file_path', patch.filePath);
  if (patch.fileName !== undefined) assign('file_name', patch.fileName);
  if (patch.totalFiles !== undefined) assign('total_files', patch.totalFiles);
  if (patch.processedFiles !== undefined) assign('processed_files', patch.processedFiles);
  if (patch.totalBytes !== undefined) assign('total_bytes', patch.totalBytes);
  if (patch.processedBytes !== undefined) assign('processed_bytes', patch.processedBytes);
  if (patch.errorMessage !== undefined) assign('error_message', patch.errorMessage);
  if (patch.completedAt !== undefined) assign('completed_at', patch.completedAt);
  if (fields.length === 0) return;
  params.push(id);
  await db.runAsync(`UPDATE export_jobs SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteExportJob(id: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ file_path: string | null }>(
    'SELECT file_path FROM export_jobs WHERE id = ?',
    [id],
  );
  await db.runAsync('DELETE FROM export_items WHERE job_id = ?', [id]);
  await db.runAsync('DELETE FROM export_jobs WHERE id = ?', [id]);
  return row?.file_path ?? null;
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function countTable(table: 'assets' | 'entries' | 'media' | 'asset_types'): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(`SELECT count(*) AS count FROM ${table}`);
  return row?.count ?? 0;
}

/** Yedekleme için silinmişler dahil tüm medya satırları. */
export async function listAllMedia(includeDeleted = true): Promise<MediaItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MediaRow>(
    includeDeleted
      ? 'SELECT * FROM media ORDER BY created_at ASC'
      : 'SELECT * FROM media WHERE deleted_at IS NULL ORDER BY created_at ASC',
  );
  return rows.map(mapMedia);
}

export async function listAssetsByIds(ids: string[]): Promise<Asset[]> {
  if (ids.length === 0) return [];
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.getAllAsync<AssetRow>(
    `${ASSET_SELECT} WHERE a.deleted_at IS NULL AND a.id IN (${placeholders}) ORDER BY a.name ASC`,
    ids,
  );
  return rows.map(mapAsset);
}

export async function listAllAssetsForExport(): Promise<Asset[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AssetRow>(
    `${ASSET_SELECT} WHERE a.deleted_at IS NULL ORDER BY a.name ASC`,
  );
  return rows.map(mapAsset);
}

export async function listAssetTypeRows(): Promise<AssetType[]> {
  return listAssetTypes();
}

/** Son geri yükleme bilgisini meta tablosunda tutar. */
export async function markRestoreCompleted(archiveId: string, archiveName: string): Promise<void> {
  await setMeta('restore.last_archive_id', archiveId);
  await setMeta('restore.last_archive_name', archiveName);
  await setMeta('restore.last_at', nowIso());
}
