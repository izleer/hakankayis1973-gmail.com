import * as Print from 'expo-print';
import { File } from 'expo-file-system';
import {
  createExportJob,
  getExportJob,
  listAllAssetsForExport,
  listAssetsByIds,
  listEntries,
  updateExportJob,
} from '../db/repo';
import { buildCsv } from '../lib/csv';
import { formatBytes, formatDate, formatNumber, formatShortDate } from '../lib/format';
import { compactStamp } from '../lib/slug';
import {
  buildReportHtml,
  type ReportAssetView,
  type ReportDocument,
  type ReportEntryView,
  type ReportPhotoView,
} from '../lib/reporthtml';
import { buildXlsx } from '../lib/xlsx';
import { ensureAppDirectories, exportFile, mediaFile } from '../lib/paths';
import { entryTypeMeta } from '../theme';
import { fileToDataUri } from './media';
import type { Asset, ExportJob, ReportKind, ReportOptions } from '../types';

export interface ProgressEvent {
  percent: number;
  message: string;
}

const REPORT_LABELS: Record<ReportKind, string> = {
  'asset-history': 'Varlık geçmişi',
  'photo-growth': 'Fotoğraf gelişimi',
  measurements: 'Ölçüm raporu',
  'all-assets': 'Tüm varlıklar',
};

const MAX_PHOTOS_PER_ASSET = 8;
const MAX_PHOTOS_TOTAL = 28;
const MAX_PHOTO_BYTES = 2_500_000;

export function reportLabel(kind: ReportKind): string {
  return REPORT_LABELS[kind];
}

export function reportDescription(kind: ReportKind): string {
  switch (kind) {
    case 'asset-history':
      return 'Tek bir varlığın tüm kayıtlarını kronolojik olarak toplar.';
    case 'photo-growth':
      return 'Fotoğrafları kayıt tarihleriyle birlikte gelişim albümü olarak sunar.';
    case 'measurements':
      return 'Ölçüm kayıtlarını tablo halinde, birimleriyle birlikte listeler.';
    case 'all-assets':
      return 'Arşivdeki tüm varlıkları ve seçilen kayıtları tek raporda birleştirir.';
  }
}

function reportHeaders(): string[] {
  return [
    'Varlık',
    'Varlık türü',
    'Tarih',
    'Kayıt türü',
    'Başlık',
    'Not',
    'Ölçüm değeri',
    'Ölçüm birimi',
    'Konum',
    'Fotoğraf sayısı',
  ];
}

function entryTypeLabel(type: string): string {
  return entryTypeMeta[type]?.label ?? type;
}

function withinRange(iso: string, from: string | null, to: string | null): boolean {
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

function fileStamp(): string {
  return compactStamp(new Date());
}

interface BuiltReport {
  document: ReportDocument;
  assets: Asset[];
  rows: unknown[][];
  entryCount: number;
  photoCount: number;
  totalBytes: number;
}

async function buildReportData(
  options: ReportOptions,
  onProgress?: (event: ProgressEvent) => void,
): Promise<BuiltReport> {
  let assets: Asset[];
  if (options.kind === 'all-assets') {
    assets = await listAllAssetsForExport();
    if (options.assetIds.length > 0) {
      const selected = new Set(options.assetIds);
      assets = assets.filter((asset) => selected.has(asset.id));
    }
  } else if (options.assetIds.length > 0) {
    assets = await listAssetsByIds(options.assetIds);
  } else {
    assets = await listAllAssetsForExport();
  }

  assets = assets.filter((asset) => asset.deletedAt === null);

  let photoBudget = MAX_PHOTOS_TOTAL;
  const rows: unknown[][] = [];
  const assetViews: ReportAssetView[] = [];
  let entryCount = 0;
  let photoCount = 0;
  let totalBytes = 0;

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    onProgress?.({
      percent: Math.round((index / Math.max(1, assets.length)) * 70),
      message: `${asset.name} hazırlanıyor`,
    });

    const timeline = await listEntries(asset.id);
    const filtered = timeline.filter((entry) => {
      if (!withinRange(entry.occurredAt, options.from, options.to)) return false;
      if (options.kind === 'measurements') {
        return entry.type === 'measurement' && entry.measurementValue !== null;
      }
      return true;
    });

    const entryViews: ReportEntryView[] = [];
    let assetPhotos = 0;

    for (const entry of filtered) {
      entryCount += 1;
      const photos: ReportPhotoView[] = [];
      if (options.includePhotos && photoBudget > 0) {
        for (const media of entry.media) {
          if (photos.length >= 4) break;
          if (photoBudget <= 0 || assetPhotos >= MAX_PHOTOS_PER_ASSET) break;
          if (media.bytes > MAX_PHOTO_BYTES) continue;
          const dataUri = await fileToDataUri(media.relativePath);
          if (!dataUri) continue;
          photos.push({
            dataUri,
            caption: `${formatShortDate(entry.occurredAt)} · ${entry.title}`,
          });
          photoBudget -= 1;
          assetPhotos += 1;
          photoCount += 1;
          totalBytes += media.bytes;
        }
      }

      const measurement =
        entry.measurementValue !== null
          ? `${formatNumber(entry.measurementValue)}${entry.measurementUnit ? ` ${entry.measurementUnit}` : ''}`
          : null;

      entryViews.push({
        dateLabel: formatShortDate(entry.occurredAt),
        typeLabel: entryTypeLabel(entry.type),
        title: entry.title,
        note: options.includeNotes ? entry.note : null,
        measurement: options.includeMeasurements ? measurement : null,
        photos: options.includePhotos ? photos : [],
      });

      rows.push([
        asset.name,
        asset.typeName ?? '',
        formatShortDate(entry.occurredAt),
        entryTypeLabel(entry.type),
        entry.title,
        options.includeNotes ? entry.note ?? '' : '',
        options.includeMeasurements ? entry.measurementValue ?? '' : '',
        options.includeMeasurements ? entry.measurementUnit ?? '' : '',
        asset.location ?? '',
        entry.media.length,
      ]);
    }

    let coverDataUri: string | null = null;
    if (options.includePhotos && asset.coverPath) {
      const cover = mediaFile(asset.coverPath);
      if (cover.exists && cover.size <= MAX_PHOTO_BYTES) {
        coverDataUri = await fileToDataUri(asset.coverPath);
      }
    }

    assetViews.push({
      name: asset.name,
      typeName: asset.typeName ?? null,
      location: asset.location,
      description: asset.description,
      acquiredLabel: asset.acquiredOn ? formatDate(asset.acquiredOn) : null,
      coverDataUri,
      entryCount: filtered.length,
      mediaCount: asset.mediaCount ?? 0,
      entries: entryViews,
    });
  }

  const rangeLabel =
    options.from || options.to
      ? `${options.from ? formatDate(options.from) : 'Başlangıç'} – ${
          options.to ? formatDate(options.to) : 'Bugün'
        }`
      : null;

  const summary = [
    { label: 'Varlık', value: formatNumber(assets.length) },
    { label: 'Kayıt', value: formatNumber(entryCount) },
    { label: 'Rapordaki fotoğraf', value: formatNumber(photoCount) },
    { label: 'Fotoğraf boyutu', value: formatBytes(totalBytes) },
  ];

  const document: ReportDocument = {
    title: REPORT_LABELS[options.kind],
    subtitle: reportDescription(options.kind),
    generatedLabel: `Oluşturma: ${formatDate(new Date().toISOString())}`,
    rangeLabel,
    summary,
    notes: [
      'Rapor cihaz üzerinde üretildi; verileriniz sunucuya yüklenmedi.',
      options.includePhotos
        ? `Rapora en fazla ${MAX_PHOTOS_TOTAL} fotoğraf eklendi. Tam arşiv için “Fotoğrafları aktar” kullanılabilir.`
        : 'Fotoğraflar bu rapora dahil edilmedi.',
    ],
    assets: assetViews,
    includePhotos: options.includePhotos,
  };

  return { document, assets, rows, entryCount, photoCount, totalBytes };
}

export interface ReportResult {
  job: ExportJob;
  entryCount: number;
  assetCount: number;
  photoCount: number;
}

/**
 * Raporu cihaz üzerinde üretir ve dışa aktarım klasörüne yazar.
 * PDF, CSV ve gerçek XLSX desteklenir. İşlem kesilirse export_jobs satırı
 * FAILED olarak kalır; yeni deneme yeni bir iş oluşturur.
 */
export async function createReport(
  options: ReportOptions,
  onProgress?: (event: ProgressEvent) => void,
): Promise<ReportResult> {
  await ensureAppDirectories();
  const job = await createExportJob('report', 'PREPARING', options);
  try {
    await updateExportJob(job.id, { status: 'PROCESSING' });
    const built = await buildReportData(options, onProgress);
    if (built.assets.length === 0) {
      throw new Error('Rapor kapsamında varlık bulunamadı.');
    }

    onProgress?.({ percent: 80, message: 'Dosya oluşturuluyor' });
    const stamp = fileStamp();
    let target: File;
    let fileName: string;

    if (options.format === 'pdf') {
      const html = buildReportHtml(built.document);
      const printed = await Print.printToFileAsync({ html, width: 595, height: 842 });
      fileName = `izleer-rapor-${options.kind}-${stamp}.pdf`;
      target = exportFile(fileName);
      await new File(printed.uri).copy(target, { overwrite: true });
    } else if (options.format === 'csv') {
      fileName = `izleer-rapor-${options.kind}-${stamp}.csv`;
      target = exportFile(fileName);
      const csv = buildCsv(reportHeaders(), built.rows);
      target.create({ overwrite: true, intermediates: true });
      await target.write(csv);
    } else {
      fileName = `izleer-rapor-${options.kind}-${stamp}.xlsx`;
      target = exportFile(fileName);
      const bytes = await buildXlsx(reportHeaders(), built.rows, {
        sheetName: REPORT_LABELS[options.kind],
        columnWidths: [24, 18, 12, 16, 34, 40, 12, 12, 20, 12],
      });
      target.create({ overwrite: true, intermediates: true });
      await target.write(bytes);
    }

    const size = target.exists ? target.size : 0;
    await updateExportJob(job.id, {
      status: 'READY',
      filePath: target.uri,
      fileName,
      completedAt: new Date().toISOString(),
      totalFiles: 1,
      processedFiles: 1,
      totalBytes: size,
      processedBytes: size,
    });
    const readyJob = await getExportJob(job.id);

    onProgress?.({ percent: 100, message: 'Rapor hazır' });
    return {
      job: readyJob ?? job,
      entryCount: built.entryCount,
      assetCount: built.assets.length,
      photoCount: built.photoCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rapor oluşturulamadı.';
    await updateExportJob(job.id, {
      status: 'FAILED',
      errorMessage: message,
      completedAt: new Date().toISOString(),
    });
    throw error;
  }
}
