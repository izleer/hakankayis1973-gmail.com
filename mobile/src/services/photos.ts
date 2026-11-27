import JSZip from 'jszip';
import {
  createExportJob,
  getExportJob,
  listPhotoExportRows,
  updateExportJob,
} from '../db/repo';
import { buildCsv } from '../lib/csv';
import { formatBytes, formatShortDate } from '../lib/format';
import { compactStamp, folderSegment, isSafeArchivePath } from '../lib/slug';
import { ensureAppDirectories, exportFile, mediaFile } from '../lib/paths';
import { addLocalFile, addTextFile, writeZip } from '../lib/zip';
import type { ExportJob, PhotoExportOptions } from '../types';
import { isoDateFolder } from './media';
import type { ProgressEvent } from './report';

export interface PhotoArchiveResult {
  job: ExportJob;
  fileCount: number;
  totalBytes: number;
  missing: string[];
}

interface PhotoRow {
  archivePath: string;
  assetId: string;
  assetName: string;
  assetTypeName: string | null;
  entryTitle: string | null;
  entryType: string | null;
  entryDate: string | null;
  relativePath: string;
  bytes: number;
  mediaId: string;
}

function extensionOf(relativePath: string): string {
  const match = relativePath.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

function buildArchivePath(
  row: {
    assetName: string;
    assetTypeName: string | null;
    entryTitle: string | null;
    entryDate: string | null;
    createdAt: string;
    relativePath: string;
  },
  counters: Map<string, number>,
): string {
  const typeFolder = folderSegment(row.assetTypeName ?? 'Diger', 'Diger');
  const assetFolder = folderSegment(row.assetName, 'Varlik');
  const entryFolder = row.entryDate
    ? `${isoDateFolder(row.entryDate)}_${folderSegment(row.entryTitle ?? 'Kayit', 'Kayit')}`
    : `${isoDateFolder(row.createdAt)}_Fotograflar`;
  const folder = `${typeFolder}/${assetFolder}/${entryFolder}`;
  const next = (counters.get(folder) ?? 0) + 1;
  counters.set(folder, next);
  const fileName = `foto_${String(next).padStart(3, '0')}.${extensionOf(row.relativePath)}`;
  return `${folder}/${fileName}`;
}

export async function createPhotoArchive(
  options: PhotoExportOptions,
  onProgress?: (event: ProgressEvent) => void,
): Promise<PhotoArchiveResult> {
  await ensureAppDirectories();
  const job = await createExportJob('photos', 'PREPARING', options);
  try {
    await updateExportJob(job.id, { status: 'PROCESSING' });
    const sourceRows = await listPhotoExportRows({
      assetIds: options.assetIds,
      from: options.from ?? undefined,
      to: options.to ?? undefined,
    });

    if (sourceRows.length === 0) {
      throw new Error('Seçilen kapsamda fotoğraf bulunamadı.');
    }

    const counters = new Map<string, number>();
    const rows: PhotoRow[] = [];
    for (const row of sourceRows) {
      const archivePath = buildArchivePath(
        {
          assetName: row.assetName,
          assetTypeName: row.assetTypeName,
          entryTitle: row.entryTitle,
          entryDate: row.entryDate,
          createdAt: row.media.createdAt,
          relativePath: row.media.relativePath,
        },
        counters,
      );
      if (!isSafeArchivePath(archivePath)) continue;
      rows.push({
        archivePath,
        assetId: row.media.assetId,
        assetName: row.assetName,
        assetTypeName: row.assetTypeName,
        entryTitle: row.entryTitle,
        entryType: row.entryType,
        entryDate: row.entryDate,
        relativePath: row.media.relativePath,
        bytes: row.media.bytes,
        mediaId: row.media.id,
      });
    }

    const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
    await updateExportJob(job.id, {
      totalFiles: rows.length,
      processedFiles: 0,
      totalBytes,
      processedBytes: 0,
    });

    const zip = new JSZip();
    const missing: string[] = [];
    let done = 0;
    let writtenBytes = 0;

    for (const row of rows) {
      const source = mediaFile(row.relativePath);
      if (!source.exists) {
        missing.push(row.relativePath);
        done += 1;
        continue;
      }
      try {
        await addLocalFile(zip, row.archivePath, source.uri, { compression: 'STORE' });
        writtenBytes += source.size;
      } catch {
        missing.push(row.relativePath);
      }
      done += 1;
      if (done % 5 === 0 || done === rows.length) {
        await updateExportJob(job.id, { processedFiles: done, processedBytes: writtenBytes });
        onProgress?.({
          percent: Math.round(5 + (done / Math.max(1, rows.length)) * 65),
          message: `${done} / ${rows.length} fotoğraf eklendi`,
        });
      }
    }

    if (rows.length - missing.length === 0) {
      throw new Error('Fotoğraf dosyalarına erişilemedi. Arşiv oluşturulmadı.');
    }

    if (options.includeIndex) {
      const headers = [
        'Arşiv yolu',
        'Varlık',
        'Varlık türü',
        'Kayıt',
        'Kayıt türü',
        'Tarih',
        'Kaynak yol',
        'Boyut (bayt)',
        'Medya kimliği',
        'Varlık kimliği',
      ];
      const csvRows = rows.map((row) => [
        row.archivePath,
        row.assetName,
        row.assetTypeName ?? '',
        row.entryTitle ?? '',
        row.entryType ?? '',
        row.entryDate ? formatShortDate(row.entryDate) : '',
        row.relativePath,
        row.bytes,
        row.mediaId,
        row.assetId,
      ]);
      addTextFile(zip, 'metadata/kayitlar.csv', buildCsv(headers, csvRows));
    }

    const folderSummary = Array.from(counters.entries())
      .map(([folder, count]) => ({ folder, count }))
      .sort((a, b) => a.folder.localeCompare(b.folder, 'tr'));

    addTextFile(
      zip,
      'metadata/export_info.json',
      JSON.stringify(
        {
          format: 'izleer-photo-archive',
          formatVersion: 1,
          generatedAt: new Date().toISOString(),
          options,
          counts: {
            files: rows.length - missing.length,
            assets: new Set(rows.map((row) => row.assetId)).size,
            entries: new Set(rows.map((row) => row.entryTitle ?? '')).size,
            missing: missing.length,
          },
          totalBytes: writtenBytes,
          folders: folderSummary,
          note:
            'Klasörler varlık türü / varlık adı / tarih_kayıt başlığı olarak düzenlenmiştir. ' +
            'Dosya adları arşiv içinde sıralıdır; özgün bilgiler metadata/kayitlar.csv içindedir.',
          missing,
        },
        null,
        2,
      ),
    );

    onProgress?.({ percent: 75, message: 'Arşiv paketleniyor' });
    const stamp = compactStamp(new Date());
    const fileName = `izleer-fotograflar-${stamp}.zip`;
    const target = exportFile(fileName);
    const zipBytes = await writeZip(zip, target, (percent) => {
      onProgress?.({
        percent: 75 + Math.round(percent * 0.24),
        message: 'Arşiv paketleniyor',
      });
    });

    await updateExportJob(job.id, {
      status: 'READY',
      filePath: target.uri,
      fileName,
      completedAt: new Date().toISOString(),
      totalFiles: rows.length,
      processedFiles: rows.length,
      totalBytes: zipBytes,
      processedBytes: zipBytes,
    });
    const ready = await getExportJob(job.id);
    onProgress?.({ percent: 100, message: 'Fotoğraf arşivi hazır' });
    return {
      job: ready ?? job,
      fileCount: rows.length - missing.length,
      totalBytes: zipBytes,
      missing,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fotoğraf arşivi oluşturulamadı.';
    await updateExportJob(job.id, {
      status: 'FAILED',
      errorMessage: message,
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export function photoArchiveSummary(result: PhotoArchiveResult): string {
  return `${result.fileCount} fotoğraf · ${formatBytes(result.totalBytes)}`;
}
