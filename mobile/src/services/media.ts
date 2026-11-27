import * as ImagePicker from 'expo-image-picker';
import { Directory, File } from 'expo-file-system';
import { attachMedia, getMediaById, setAssetCover, deleteMedia } from '../db/repo';
import { ensureDirectory, mediaFile, mediaRoot, deleteQuietly } from '../lib/paths';
import { compactStamp, folderSegment } from '../lib/slug';
import { newId } from '../lib/ids';
import type { MediaItem } from '../types';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
};

function extensionFor(asset: ImagePicker.ImagePickerAsset): string {
  const fromMime = asset.mimeType ? MIME_EXTENSIONS[asset.mimeType.toLowerCase()] : undefined;
  if (fromMime) return fromMime;
  const match = (asset.fileName ?? asset.uri).match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

export type PickedImage = ImagePicker.ImagePickerAsset;

export async function pickImages(source: 'library' | 'camera'): Promise<PickedImage[]> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Kamera izni verilmedi. Ayarlardan izin verebilirsiniz.');
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
    });
    return result.canceled ? [] : result.assets;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Galeri izni verilmedi. Ayarlardan izin verebilirsiniz.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    quality: 1,
    exif: false,
  });
  return result.canceled ? [] : result.assets;
}

/**
 * Seçilen fotoğrafları uygulamanın kalıcı medya alanına kopyalar ve
 * veritabanına bağlar. Kaynak galeri dosyalarına dokunulmaz.
 * Klasör yapısı: <varlık>/<tarih>/foto_<zaman>_<kısa-kimlik>.<uzantı>
 */
export async function importImages(
  picked: PickedImage[],
  input: {
    assetId: string;
    assetName: string;
    entryId: string | null;
    occurredAt?: string | null;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<MediaItem[]> {
  if (picked.length === 0) return [];
  const assetFolder = safeAssetFolder(input.assetName);
  const date = input.occurredAt ?? new Date().toISOString();
  const dateFolder = isoDateFolder(date);
  const directory = new Directory(mediaRoot(), assetFolder, dateFolder);
  ensureDirectory(directory);

  const created: MediaItem[] = [];
  let index = 0;
  for (const source of picked) {
    index += 1;
    try {
      const extension = extensionFor(source);
      const fileName = `foto_${compactStamp()}_${newId().slice(0, 6)}.${extension}`;
      const destination = new File(directory, fileName);
      const sourceFile = new File(source.uri);
      await sourceFile.copy(destination);
      const size = destination.exists ? destination.size : 0;
      const relativePath = `${assetFolder}/${dateFolder}/${fileName}`;
      const item = await attachMedia({
        assetId: input.assetId,
        entryId: input.entryId,
        kind: 'image',
        relativePath,
        mime: source.mimeType ?? mimeForExtension(extension),
        bytes: size,
        width: source.width ?? null,
        height: source.height ?? null,
      });
      created.push(item);
    } finally {
      input.onProgress?.(index, picked.length);
    }
  }
  return created;
}

function safeAssetFolder(name: string): string {
  return folderSegment(name, 'Varlik');
}

export function isoDateFolder(iso: string): string {
  const date = new Date(iso);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const y = safe.getFullYear();
  const m = String(safe.getMonth() + 1).padStart(2, '0');
  const d = String(safe.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function mimeForExtension(extension: string): string {
  const normalized = extension.toLowerCase();
  if (normalized === 'png') return 'image/png';
  if (normalized === 'webp') return 'image/webp';
  if (normalized === 'heic') return 'image/heic';
  if (normalized === 'heif') return 'image/heif';
  if (normalized === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export async function makeCover(assetId: string, mediaId: string): Promise<string | null> {
  const media = await getMediaById(mediaId);
  if (!media) return null;
  await setAssetCover(assetId, media.relativePath);
  return media.relativePath;
}

/** Veritabanı kaydını ve dosyayı siler. Geri alınamaz. */
export async function removeMedia(mediaId: string): Promise<void> {
  const relativePath = await deleteMedia(mediaId);
  if (relativePath) {
    deleteQuietly(mediaFile(relativePath));
  }
}

export async function fileToDataUri(relativePath: string): Promise<string | null> {
  const file = mediaFile(relativePath);
  if (!file.exists) return null;
  try {
    const base64 = await file.base64();
    const extension = relativePath.split('.').pop() ?? 'jpg';
    return `data:${mimeForExtension(extension)};base64,${base64}`;
  } catch {
    return null;
  }
}
