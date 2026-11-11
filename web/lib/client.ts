import type { Media } from './types';

export class ClientError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/vh/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    window.location.assign('/giris');
    throw new ClientError('Oturumunuz sona erdi. Yeniden giriş yapın.', 401);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ClientError(payload?.error?.message ?? 'İşlem tamamlanamadı.', response.status);
  }
  return payload?.data as T;
}

export const vh = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new ClientError('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadMedia(
  file: File,
  target: { assetId?: string; entryId?: string; postId?: string } = {},
): Promise<Media> {
  if (file.size > 10 * 1024 * 1024) {
    throw new ClientError('Dosya en fazla 10 MB olabilir.');
  }
  const dataBase64 = await readAsBase64(file);
  const data = await vh.post<{ media: Media }>('media/upload', {
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    dataBase64,
    ...target,
  });
  return data.media;
}
