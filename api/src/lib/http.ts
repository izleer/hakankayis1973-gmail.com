import type { FastifyRequest } from 'fastify';
import { z, type ZodTypeAny } from 'zod';
import { ApiError } from './errors.js';

export function parseBody<T extends ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Gönderilen bilgiler geçerli değil.', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  return parsed.data;
}

export function parseQuery<T extends ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Sorgu parametreleri geçerli değil.', {
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  return parsed.data;
}

export type Cursor = { at: string; id: string };

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed.at !== 'string' || typeof parsed.id !== 'string') return null;
    if (Number.isNaN(Date.parse(parsed.at))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function limitFrom(value: string | undefined, fallback = 20, max = 50): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

export function cursorFromRow(row: { created_at?: Date | string; occurred_at?: Date | string; id: string }): string {
  const at = row.occurred_at ?? row.created_at ?? new Date().toISOString();
  return encodeCursor({ at: new Date(at).toISOString(), id: row.id });
}

export function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function clientIp(req: FastifyRequest): string | null {
  return req.ip || null;
}

export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}
