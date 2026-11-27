import JSZip from 'jszip';
import { File } from 'expo-file-system';
import { isSafeArchivePath } from './slug';

export interface ZipFileOptions {
  compression?: 'STORE' | 'DEFLATE';
}

/**
 * Yerel dosyayı base64 olarak okuyup ZIP'e ekler.
 * Fotoğraflar zaten sıkıştırılmış olduğu için varsayılan STORE kullanılır.
 */
export async function addLocalFile(
  zip: JSZip,
  archivePath: string,
  fileUri: string,
  options: ZipFileOptions = {},
): Promise<number> {
  const source = new File(fileUri);
  if (!source.exists) {
    throw new Error(`Dosya bulunamadı: ${archivePath}`);
  }
  const base64 = await source.base64();
  zip.file(archivePath, base64, {
    base64: true,
    compression: options.compression ?? 'STORE',
  });
  return source.size;
}

export function addTextFile(zip: JSZip, archivePath: string, text: string): void {
  zip.file(archivePath, text, { compression: 'DEFLATE' });
}

export async function addBytesFile(
  zip: JSZip,
  archivePath: string,
  bytes: Uint8Array,
): Promise<void> {
  zip.file(archivePath, bytes, { compression: 'DEFLATE' });
}

/**
 * ZIP'i hedef dosyaya yazar. Üretim bellekte yapılır; büyük arşivlerde
 * ilerleme yüzdesi bildirilir.
 */
export async function writeZip(
  zip: JSZip,
  target: File,
  onProgress?: (percent: number) => void,
): Promise<number> {
  const bytes = await zip.generateAsync(
    {
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      streamFiles: true,
    },
    (meta) => onProgress?.(Math.round(meta.percent)),
  );
  target.create({ overwrite: true, intermediates: true });
  await target.write(bytes);
  return bytes.byteLength;
}

export async function readZip(archiveUri: string): Promise<JSZip> {
  const file = new File(archiveUri);
  if (!file.exists) throw new Error('Arşiv dosyası bulunamadı.');
  const bytes = await file.bytes();
  return JSZip.loadAsync(bytes);
}

export function findZipEntry(zip: JSZip, path: string): JSZip.JSZipObject | null {
  if (!isSafeArchivePath(path)) return null;
  return zip.file(path) ?? null;
}

export async function readZipText(zip: JSZip, path: string): Promise<string | null> {
  const entry = findZipEntry(zip, path);
  if (!entry) return null;
  return entry.async('string');
}

export async function readZipBytes(zip: JSZip, path: string): Promise<Uint8Array | null> {
  const entry = findZipEntry(zip, path);
  if (!entry) return null;
  return entry.async('uint8array');
}

/** Arşivdeki tüm dosya adlarını güvenli biçimde listeler. */
export function listZipPaths(zip: JSZip): string[] {
  return Object.keys(zip.files).filter((path) => !zip.files[path].dir);
}
