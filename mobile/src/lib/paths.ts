import { Directory, File, Paths } from 'expo-file-system';

export const MEDIA_DIR_NAME = 'media';
export const EXPORTS_DIR_NAME = 'exports';
export const CACHE_DIR_NAME = 'izleer-work';

export function mediaRoot(): Directory {
  return new Directory(Paths.document, MEDIA_DIR_NAME);
}

export function exportsRoot(): Directory {
  return new Directory(Paths.document, EXPORTS_DIR_NAME);
}

export function workRoot(): Directory {
  return new Directory(Paths.cache, CACHE_DIR_NAME);
}

export function ensureDirectory(directory: Directory): void {
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
}

export async function ensureAppDirectories(): Promise<void> {
  ensureDirectory(mediaRoot());
  ensureDirectory(exportsRoot());
  ensureDirectory(workRoot());
}

export function mediaUri(relativePath: string): string {
  return new File(mediaRoot(), relativePath).uri;
}

export function mediaFile(relativePath: string): File {
  return new File(mediaRoot(), relativePath);
}

export function exportFile(fileName: string): File {
  return new File(exportsRoot(), fileName);
}

export function workDirectory(name: string): Directory {
  return new Directory(workRoot(), name);
}

export function resetDirectory(directory: Directory): Directory {
  if (directory.exists) directory.delete();
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

export function fileSize(uri: string): number {
  try {
    const file = new File(uri);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

export function deleteQuietly(file: File | Directory): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Dosya zaten silinmiş veya erişilemiyor; sessizce devam et.
  }
}
