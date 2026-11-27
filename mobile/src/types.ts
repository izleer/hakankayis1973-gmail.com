export type Visibility = 'private' | 'selected' | 'friends' | 'public';
export type AssetStatus = 'active' | 'archived';

export const ENTRY_TYPES = [
  'note',
  'photo',
  'maintenance',
  'acquisition',
  'measurement',
  'health',
  'event',
  'document',
  'reminder',
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export type ExportType = 'report' | 'photos' | 'backup';

export type ExportStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'PROCESSING'
  | 'READY'
  | 'SHARED'
  | 'FAILED'
  | 'CANCELLED';

export interface AssetType {
  slug: string;
  name: string;
  parentSlug: string | null;
  sort: number;
}

export interface Asset {
  id: string;
  name: string;
  typeSlug: string | null;
  typeName?: string | null;
  description: string | null;
  location: string | null;
  acquiredOn: string | null;
  coverPath: string | null;
  visibility: Visibility;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  entryCount?: number;
  mediaCount?: number;
}

export interface Entry {
  id: string;
  assetId: string;
  type: EntryType;
  title: string;
  note: string | null;
  occurredAt: string;
  measurementValue: number | null;
  measurementUnit: string | null;
  reminderAt: string | null;
  reminderDone: boolean;
  extraJson: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MediaItem {
  id: string;
  assetId: string;
  entryId: string | null;
  kind: 'image' | 'video' | 'document';
  relativePath: string;
  mime: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface ExportJob {
  id: string;
  exportType: ExportType;
  status: ExportStatus;
  startedAt: string | null;
  completedAt: string | null;
  filePath: string | null;
  fileName: string | null;
  totalFiles: number;
  processedFiles: number;
  totalBytes: number;
  processedBytes: number;
  errorMessage: string | null;
  optionsJson: string | null;
}

export interface ArchiveStats {
  assets: number;
  entries: number;
  media: number;
  bytes: number;
  dueReminders: number;
  archived: number;
}

export interface ReminderRow extends Entry {
  assetName: string;
  assetTypeName: string | null;
}

export interface TimelineEntry extends Entry {
  media: MediaItem[];
  assetName?: string;
}

export type ReportKind = 'asset-history' | 'photo-growth' | 'measurements' | 'all-assets';
export type ReportFormat = 'pdf' | 'csv' | 'xlsx';

export interface ReportOptions {
  kind: ReportKind;
  format: ReportFormat;
  assetIds: string[];
  from: string | null;
  to: string | null;
  includePhotos: boolean;
  includeEntries: boolean;
  includeMeasurements: boolean;
  includeNotes: boolean;
}

export interface PhotoExportOptions {
  assetIds: string[];
  from: string | null;
  to: string | null;
  includeIndex: boolean;
}

export interface BackupManifest {
  format: 'izleer-backup';
  formatVersion: number;
  archiveId: string;
  appVersion: string;
  label?: string;
  createdAt: string;
  counts: {
    assets: number;
    entries: number;
    media: number;
    types: number;
  };
  bytes: {
    database: number;
    media: number;
    total: number;
  };
  /** Anahtar: arşiv içindeki yol. */
  files: Record<string, { bytes: number; sha256: string }>;
  mediaRoot: 'assets';
  device: {
    platform: string;
    databaseSchema: number;
  };
}

export interface RestorePreview {
  manifest: BackupManifest;
  archiveName: string;
  archiveUri: string;
  cachePath: string;
  databasePath: string;
  mediaCount: number;
  missingMedia: string[];
}

export interface RestoreResult {
  assets: number;
  entries: number;
  media: number;
  restoredFiles: number;
  preRestoreBackup: string | null;
  mode: 'merge';
}
