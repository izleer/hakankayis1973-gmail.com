import * as DocumentPicker from 'expo-document-picker';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import JSZip from 'jszip';

import {
  countTable,
  createExportJob,
  getExportJob,
  listAllMedia,
  listAssetTypes,
  markRestoreCompleted,
  updateExportJob,
} from '../db/repo';
import { getDatabase } from '../db';
import { SCHEMA_VERSION } from '../db/schema';
import { newId } from '../lib/ids';
import { ensureAppDirectories, exportFile, mediaFile, mediaRoot, workDirectory, workRoot } from '../lib/paths';
import { compactStamp, isSafeArchivePath } from '../lib/slug';
import { readZip, readZipBytes, readZipText, writeZip, addLocalFile, addTextFile } from '../lib/zip';
import type {
  BackupManifest,
  ExportJob,
  RestorePreview,
  RestoreResult,
} from '../types';
import type { ProgressEvent } from './report';

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupOptions {
  label?: string;
  reason?: 'manual' | 'pre-restore';
}

export interface BackupResult {
  job: ExportJob;
  manifest: BackupManifest;
  fileCount: number;
  skippedMedia: number;
}

interface RestoreOptions {
  onProgress?: (event: ProgressEvent) => void;
  verifyMedia?: boolean;
}

function appVersion(): string {
  return Constants.expoConfig?.version ?? '0.1.0';
}

function archiveFileName(reason?: 'manual' | 'pre-restore'): string {
  const stamp = compactStamp(new Date());
  if (reason === 'pre-restore') return `izleer-geri-yukleme-oncesi-${stamp}.izleer`;
  return `izleer-yedek-${stamp}.izleer`;
}

function toFilePath(uri: string): string {
  if (!uri.startsWith('file://')) return uri;
  const raw = uri.replace(/^file:\/\//, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function createBackup(
  options: BackupOptions = {},
  onProgress?: (event: ProgressEvent) => void,
): Promise<BackupResult> {
  await ensureAppDirectories();
  const job = await createExportJob('backup', 'PREPARING', {
    reason: options.reason ?? 'manual',
    label: options.label ?? null,
    formatVersion: BACKUP_FORMAT_VERSION,
  });

  const tempDirectory = workDirectory('backup');
  try {
    if (tempDirectory.exists) tempDirectory.delete();
    tempDirectory.create({ intermediates: true, idempotent: true });

    await updateExportJob(job.id, { status: 'PROCESSING' });
    onProgress?.({ percent: 3, message: 'Veritabanı anlık görüntüsü alınıyor' });

    // Tutarlı SQLite anlık görüntüsü: yazma işlemleriyle çakışmaz.
    const db = await getDatabase();
    const snapshotBytes = await db.serializeAsync();
    const snapshotFile = new File(tempDirectory, 'database.sqlite');
    snapshotFile.create({ overwrite: true, intermediates: true });
    await snapshotFile.write(snapshotBytes);
    const databaseBytes = snapshotFile.size;
    const databaseHash = await snapshotFile.digest('SHA-256');

    const [assets, entries, mediaCount, types] = await Promise.all([
      countTable('assets'),
      countTable('entries'),
      countTable('media'),
      countTable('asset_types'),
    ]);

    const media = await listAllMedia(true);
    const existing = media.filter((item) => mediaFile(item.relativePath).exists);
    let skippedMedia = media.length - existing.length;
    await updateExportJob(job.id, {
      totalFiles: existing.length + 1,
      processedFiles: 1,
      totalBytes: databaseBytes,
      processedBytes: databaseBytes,
    });

    const zip = new JSZip();
    await addLocalFile(zip, 'database.sqlite', snapshotFile.uri, { compression: 'DEFLATE' });

    const files: BackupManifest['files'] = {
      'database.sqlite': { bytes: databaseBytes, sha256: databaseHash },
    };

    let mediaBytes = 0;
    let processed = 1;
    for (const item of existing) {
      const source = mediaFile(item.relativePath);
      const archivePath = `assets/${item.relativePath}`;
      if (!isSafeArchivePath(item.relativePath)) {
        skippedMedia += 1;
        processed += 1;
        continue;
      }
      try {
        const hash = await source.digest('SHA-256');
        const bytes = await addLocalFile(zip, archivePath, source.uri, { compression: 'STORE' });
        files[archivePath] = { bytes, sha256: hash };
        mediaBytes += bytes;
      } catch {
        // Tek bir dosya okunamazsa yedek durmaz; manifestte yer almaz.
        skippedMedia += 1;
      }
      processed += 1;
      if (processed % 5 === 0 || processed === existing.length + 1) {
        await updateExportJob(job.id, {
          processedFiles: processed,
          processedBytes: databaseBytes + mediaBytes,
        });
        onProgress?.({
          percent: Math.round(3 + (processed / Math.max(1, existing.length + 1)) * 72),
          message: `${processed - 1} / ${existing.length} fotoğraf eklendi`,
        });
      }
    }

    const categoryRows = await listAssetTypes();
    addTextFile(
      zip,
      'metadata/kategoriler.json',
      JSON.stringify(
        {
          format: 'izleer-categories',
          formatVersion: 1,
          generatedAt: new Date().toISOString(),
          categories: categoryRows,
        },
        null,
        2,
      ),
    );

    const archiveId = newId();
    const manifest: BackupManifest = {
      format: 'izleer-backup',
      formatVersion: BACKUP_FORMAT_VERSION,
      archiveId,
      appVersion: appVersion(),
      label: options.label,
      createdAt: new Date().toISOString(),
      counts: { assets, entries, media: mediaCount, types },
      bytes: {
        database: databaseBytes,
        media: mediaBytes,
        total: databaseBytes + mediaBytes,
      },
      files,
      mediaRoot: 'assets',
      device: {
        platform: Platform.OS,
        databaseSchema: SCHEMA_VERSION,
      },
    };

    addTextFile(
      zip,
      'metadata/export_info.json',
      JSON.stringify(
        {
          format: 'izleer-backup-info',
          formatVersion: BACKUP_FORMAT_VERSION,
          archiveId,
          label: options.label ?? null,
          reason: options.reason ?? 'manual',
          createdAt: manifest.createdAt,
          counts: manifest.counts,
          bytes: manifest.bytes,
          note:
            'Bu arşiv; manifest.json, tutarlı SQLite anlık görüntüsü (database.sqlite), ' +
            'orijinal medya dosyaları (assets/) ve metadata/ bilgilerini içerir. ' +
            'Geri yükleme birleştirme (merge) modundadır; aynı UUID ikinci kez eklenmez.',
        },
        null,
        2,
      ),
    );

    addTextFile(zip, 'manifest.json', JSON.stringify(manifest, null, 2));

    onProgress?.({ percent: 78, message: 'Yedek paketleniyor' });
    const fileName = archiveFileName(options.reason);
    const target = exportFile(fileName);
    const zipBytes = await writeZip(zip, target, (percent) => {
      onProgress?.({
        percent: 78 + Math.round(percent * 0.21),
        message: 'Yedek paketleniyor',
      });
    });

    await updateExportJob(job.id, {
      status: 'READY',
      filePath: target.uri,
      fileName,
      completedAt: new Date().toISOString(),
      totalFiles: existing.length + 1,
      processedFiles: existing.length + 1,
      totalBytes: zipBytes,
      processedBytes: zipBytes,
    });
    const ready = await getExportJob(job.id);
    onProgress?.({ percent: 100, message: 'Yedek hazır' });
    return {
      job: ready ?? job,
      manifest,
      fileCount: existing.length + 1,
      skippedMedia,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Yedek oluşturulamadı.';
    await updateExportJob(job.id, {
      status: 'FAILED',
      errorMessage: message,
      completedAt: new Date().toISOString(),
    });
    throw error;
  } finally {
    try {
      if (tempDirectory.exists) tempDirectory.delete();
    } catch {
      // Geçici klasör temizlenemezse uygulama çalışmaya devam eder.
    }
  }
}

function validateManifest(raw: unknown): BackupManifest {
  if (!raw || typeof raw !== 'object') throw new Error('manifest.json okunamadı.');
  const manifest = raw as Partial<BackupManifest>;
  if (manifest.format !== 'izleer-backup') {
    throw new Error('Bu dosya bir izleer yedeği değil.');
  }
  if (
    typeof manifest.formatVersion !== 'number' ||
    manifest.formatVersion < 1 ||
    manifest.formatVersion > BACKUP_FORMAT_VERSION
  ) {
    throw new Error(
      `Yedek formatı desteklenmiyor (sürüm ${String(manifest.formatVersion ?? '?')}).`,
    );
  }
  if (!manifest.files || typeof manifest.files !== 'object') {
    throw new Error('Yedek dosya listesi eksik.');
  }
  if (!manifest.files['database.sqlite']) {
    throw new Error('Yedekte veritabanı anlık görüntüsü yok.');
  }
  if (!manifest.counts || !manifest.bytes || !manifest.device) {
    throw new Error('Yedek manifestosu eksik alanlar içeriyor.');
  }
  return manifest as BackupManifest;
}

export async function pickBackupArchive(): Promise<RestorePreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const picked = result.assets[0];

  await ensureAppDirectories();
  const restoreDirectory = workDirectory('restore');
  if (restoreDirectory.exists) restoreDirectory.delete();
  restoreDirectory.create({ intermediates: true, idempotent: true });

  const archiveFile = new File(restoreDirectory, 'archive.izleer');
  await new File(picked.uri).copy(archiveFile, { overwrite: true });

  const zip = await readZip(archiveFile.uri);
  const manifestText = await readZipText(zip, 'manifest.json');
  if (!manifestText) throw new Error('Yedek manifestosu bulunamadı.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText);
  } catch {
    throw new Error('Yedek manifestosu bozuk.');
  }
  const manifest = validateManifest(parsed);

  const databaseBytes = await readZipBytes(zip, 'database.sqlite');
  if (!databaseBytes) throw new Error('Yedekte veritabanı dosyası yok.');
  const databaseFile = new File(restoreDirectory, 'database.sqlite');
  databaseFile.create({ overwrite: true, intermediates: true });
  await databaseFile.write(databaseBytes);

  const expectedHash = manifest.files['database.sqlite']?.sha256;
  if (expectedHash) {
    const actualHash = await databaseFile.digest('SHA-256');
    if (actualHash !== expectedHash) {
      throw new Error('Veritabanı bütünlük kontrolü başarısız. Yedek bozuk olabilir.');
    }
  }

  const snapshot = await SQLite.openDatabaseAsync(
    'database.sqlite',
    { useNewConnection: true },
    restoreDirectory.uri,
  );
  try {
    const versionRow = await snapshot.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = versionRow?.user_version ?? 0;
    if (version < 1) throw new Error('Yedekteki veritabanı şeması geçersiz.');
    if (version > SCHEMA_VERSION) {
      throw new Error(
        `Yedek daha yeni bir uygulama sürümüyle oluşturulmuş (şema ${version}). ` +
          'Lütfen izleer uygulamasını güncelleyin.',
      );
    }
    const mediaRows = await snapshot.getAllAsync<{ relative_path: string }>(
      'SELECT relative_path FROM media WHERE deleted_at IS NULL',
    );
    const missingMedia = mediaRows
      .map((row) => row.relative_path)
      .filter((relativePath) => !manifest.files[`assets/${relativePath}`]);
    const mediaKeys = Object.keys(manifest.files).filter((key) => key.startsWith('assets/'));
    return {
      manifest,
      archiveName: picked.name ?? archiveFile.name,
      archiveUri: archiveFile.uri,
      cachePath: restoreDirectory.uri,
      databasePath: databaseFile.uri,
      mediaCount: mediaKeys.length,
      missingMedia,
    };
  } finally {
    await snapshot.closeAsync();
  }
}

const RESTORE_TABLE_ORDER = ['asset_types', 'assets', 'entries', 'media'] as const;

async function tableColumns(
  db: SQLite.SQLiteDatabase,
  schema: 'main' | 'src',
  table: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA ${schema}.table_info(${table})`);
  return rows.map((row) => row.name);
}

async function mergeTable(
  db: SQLite.SQLiteDatabase,
  table: (typeof RESTORE_TABLE_ORDER)[number],
  sourceColumns: string[],
  targetColumns: string[],
): Promise<void> {
  const columns = sourceColumns.filter((column) => targetColumns.includes(column));
  if (columns.length === 0) return;
  const columnList = columns.join(', ');
  const hasUpdatedAt = columns.includes('updated_at');

  if (table === 'media') {
    // Medya satırlarında updated_at yok. Yerel kayıt (özellikle silinmiş
    // işaretleri) korunur; aynı UUID ikinci kez eklenmez.
    await db.execAsync(
      `INSERT OR IGNORE INTO main.media (${columnList}) SELECT ${columnList} FROM src.media`,
    );
    return;
  }

  if (table === 'asset_types') {
    await db.execAsync(
      `INSERT INTO main.asset_types (${columnList})
       SELECT ${columnList} FROM src.asset_types
       ON CONFLICT(slug) DO UPDATE SET
         name = excluded.name,
         parent_slug = excluded.parent_slug,
         sort = excluded.sort`,
    );
    return;
  }

  const updates = columns
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  const guard = hasUpdatedAt
    ? `WHERE excluded.updated_at > ${table}.updated_at`
    : '';
  await db.execAsync(
    `INSERT INTO main.${table} (${columnList})
     SELECT ${columnList} FROM src.${table}
     ON CONFLICT(id) DO UPDATE SET ${updates} ${guard}`,
  );
}

async function attachSource(db: SQLite.SQLiteDatabase, databasePath: string): Promise<void> {
  const path = toFilePath(databasePath);
  try {
    await db.runAsync('ATTACH DATABASE ? AS src', [path]);
  } catch {
    const escaped = path.replace(/'/g, "''");
    await db.execAsync(`ATTACH DATABASE '${escaped}' AS src`);
  }
}

export async function restoreBackup(
  preview: RestorePreview,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const { onProgress, verifyMedia = true } = options;
  const zip = await readZip(preview.archiveUri);

  onProgress?.({ percent: 2, message: 'Güvenlik yedeği alınıyor' });
  const safety = await createBackup(
    { label: 'Geri yükleme öncesi', reason: 'pre-restore' },
    (event) => onProgress?.({ percent: 2 + Math.round(event.percent * 0.18), message: event.message }),
  );

  const restoreDirectory = new Directory(preview.cachePath);
  let restoredFiles = 0;

  try {
    onProgress?.({ percent: 22, message: 'Dosyalar doğrulanıyor' });
    const mediaKeys = Object.keys(preview.manifest.files).filter((key) => key.startsWith('assets/'));
    const total = Math.max(1, mediaKeys.length);
    let index = 0;

    for (const key of mediaKeys) {
      index += 1;
      const relativePath = key.slice('assets/'.length);
      if (!isSafeArchivePath(relativePath)) continue;
      const expected = preview.manifest.files[key];
      const bytes = await readZipBytes(zip, key);
      if (!bytes) continue;

      if (verifyMedia && expected?.sha256) {
        const hashed = await digestBytes(bytes);
        if (hashed !== expected.sha256) {
          throw new Error(`Dosya bütünlük kontrolü başarısız: ${relativePath}`);
        }
      }

      const destination = mediaFile(relativePath);
      if (!destination.exists) {
        destination.create({ overwrite: false, intermediates: true });
        await destination.write(bytes);
        restoredFiles += 1;
      }

      if (index % 5 === 0 || index === mediaKeys.length) {
        onProgress?.({
          percent: 22 + Math.round((index / total) * 63),
          message: `${index} / ${mediaKeys.length} dosya işlendi`,
        });
      }
    }

    onProgress?.({ percent: 88, message: 'Veritabanı birleştiriliyor' });
    const db = await getDatabase();
    await attachSource(db, preview.databasePath);
    try {
      const srcVersionRow = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA src.user_version',
      );
      const srcVersion = srcVersionRow?.user_version ?? 0;
      if (srcVersion < 1 || srcVersion > SCHEMA_VERSION) {
        throw new Error(`Yedekteki veritabanı şeması desteklenmiyor (${srcVersion}).`);
      }

      await db.withTransactionAsync(async () => {
        for (const table of RESTORE_TABLE_ORDER) {
          const srcColumns = await tableColumns(db, 'src', table);
          const mainColumns = await tableColumns(db, 'main', table);
          if (srcColumns.length === 0 || mainColumns.length === 0) continue;
          await mergeTable(db, table, srcColumns, mainColumns);
        }

        const violations = await db.getAllAsync<Record<string, unknown>>(
          'PRAGMA foreign_key_check',
        );
        if (violations.length > 0) {
          throw new Error('Geri yükleme sonrası ilişki kontrolü başarısız; işlem geri alındı.');
        }
      });
    } finally {
      await db.execAsync('DETACH DATABASE src').catch(() => undefined);
    }

    const [assets, entries, media] = await Promise.all([
      countTable('assets'),
      countTable('entries'),
      countTable('media'),
    ]);

    await markRestoreCompleted(preview.manifest.archiveId, preview.archiveName);
    try {
      if (restoreDirectory.exists) restoreDirectory.delete();
      const root = workRoot();
      if (root.exists && root.list().length === 0) root.delete();
    } catch {
      // Geçici dosyalar kalabilir; sonraki temizlikte silinir.
    }

    onProgress?.({ percent: 100, message: 'Geri yükleme tamamlandı' });
    return {
      assets,
      entries,
      media,
      restoredFiles,
      preRestoreBackup: safety.job.filePath,
      mode: 'merge',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geri yükleme başarısız.';
    throw new Error(`${message} Mevcut verileriniz değiştirilmedi; güvenlik yedeği: ${
      safety.job.fileName ?? 'oluşturuldu'
    }.`);
  }
}

async function digestBytes(bytes: Uint8Array): Promise<string> {
  const buffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Arşivdeki tüm dosyaların hash'lerini doğrular; arayüzde "Yedeği doğrula" için. */
export async function verifyBackupArchive(
  archiveUri: string,
  manifest: BackupManifest,
  onProgress?: (event: ProgressEvent) => void,
): Promise<{ verified: number; failed: string[] }> {
  const zip = await readZip(archiveUri);
  const entries = Object.entries(manifest.files);
  const failed: string[] = [];
  let verified = 0;
  let index = 0;
  for (const [path, meta] of entries) {
    index += 1;
    const bytes = await readZipBytes(zip, path);
    if (!bytes || (await digestBytes(bytes)) !== meta.sha256) {
      failed.push(path);
    } else {
      verified += 1;
    }
    if (index % 5 === 0 || index === entries.length) {
      onProgress?.({
        percent: Math.round((index / Math.max(1, entries.length)) * 100),
        message: `${index} / ${entries.length} dosya doğrulandı`,
      });
    }
  }
  return { verified, failed };
}

export function backupStatsText(result: BackupResult): string {
  return `${result.fileCount} dosya · ${result.manifest.counts.assets} varlık · ${result.manifest.counts.entries} kayıt`;
}

export { mediaRoot };
