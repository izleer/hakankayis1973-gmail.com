import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { LOCALE_COOKIE, isLocale, type Locale } from './i18n/config';
import type { SessionResponse, User } from './types';

export const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000';
export const SESSION_COOKIE = 'vh_token';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ApiEnvelope<T> = { data: T };

/**
 * Route handler gövdesini metin olarak okuyup JSON'a çevirir.
 * Bazı üretim çalışma zamanlarında `request.json()` gövdeyi boş döndürüyor;
 * `request.text()` aynı ortamda güvenilir çalışıyor.
 */
export async function readJsonDebug(
  request: Request,
): Promise<{ text?: string; parsed?: unknown; error?: string }> {
  try {
    const text = await request.text();
    try {
      return { text, parsed: text ? JSON.parse(text) : null };
    } catch (error) {
      return { text, error: `parse: ${error instanceof Error ? error.message : String(error)}` };
    }
  } catch (error) {
    return { error: `read: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function readJson<T>(request: Request): Promise<T | null> {
  const result = await readJsonDebug(request);
  return (result.parsed as T) ?? null;
}

async function tokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

async function localeFromCookies(): Promise<Locale | null> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : null;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const [token, locale] = await Promise.all([tokenFromCookies(), localeFromCookies()]);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(locale ? { 'Accept-Language': locale } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = 'İstek tamamlanamadı.';
    let code: string | undefined;
    try {
      const payload = (await response.json()) as { error?: { message?: string; code?: string } };
      message = payload.error?.message ?? message;
      code = payload.error?.code;
    } catch {
      // JSON olmayan hata yanıtı
    }
    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export const getViewer = cache(async (): Promise<User | null> => {
  const token = await tokenFromCookies();
  if (!token) return null;
  try {
    const data = await api<SessionResponse>('/v1/auth/session');
    return data.user;
  } catch {
    return null;
  }
});

export async function requireViewer(): Promise<User> {
  const viewer = await getViewer();
  if (!viewer) redirect('/giris');
  return viewer;
}

export async function apiDirect<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data?: T; error?: { message: string; code?: string } }> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload?.error ?? { message: 'İstek tamamlanamadı.' },
      };
    }
    return { ok: true, status: response.status, data: payload?.data as T };
  } catch {
    return { ok: false, status: 503, error: { message: 'API şu anda yanıt vermiyor.' } };
  }
}
