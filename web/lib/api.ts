import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
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

async function tokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await tokenFromCookies();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
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
