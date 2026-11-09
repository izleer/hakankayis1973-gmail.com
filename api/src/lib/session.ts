import { createHash, randomBytes } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { env } from '../env.js';
import { query, queryOne } from '../db.js';
import { forbidden, unauthorized } from './errors.js';
import { iso } from './http.js';
import { mediaRefUrl } from './storage.js';

export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'moderator' | 'admin';
  onboardedAt: string | null;
  email: string;
};

type SessionRow = {
  id: string;
  expires_at: Date;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: Viewer['role'];
  onboarded_at: Date | null;
  email: string;
};

export type IssuedSession = { token: string; expiresAt: string; sessionId: string };

const viewerCache = new WeakMap<FastifyRequest, Promise<Viewer | null>>();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function bearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 20 ? token : null;
}

export async function issueSession(
  userId: string,
  req: FastifyRequest,
): Promise<IssuedSession> {
  const token = randomBytes(32).toString('base64url');
  const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  const rows = await query<{ id: string }>(
    `INSERT INTO sessions (user_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, hashToken(token), req.headers['user-agent']?.slice(0, 500) ?? null, req.ip, expiresAt],
  );
  return { token, expiresAt: expiresAt.toISOString(), sessionId: rows[0]!.id };
}

export async function extendSession(req: FastifyRequest, sessionId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `UPDATE sessions SET expires_at = $1, last_used_at = now()
     WHERE id = $2 AND revoked_at IS NULL`,
    [expiresAt, sessionId],
  );
  void req;
  return expiresAt.toISOString();
}

export async function revokeCurrentSession(req: FastifyRequest): Promise<void> {
  const token = bearerToken(req);
  if (!token) return;
  await query(`UPDATE sessions SET revoked_at = now() WHERE token_hash = $1`, [hashToken(token)]);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await query(`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [
    userId,
  ]);
}

export async function resolveViewer(req: FastifyRequest): Promise<Viewer | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const row = await queryOne<SessionRow>(
    `SELECT s.id, s.expires_at, u.id AS user_id, u.email, u.username, u.display_name,
            u.avatar_url, u.role, u.onboarded_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()
       AND u.deleted_at IS NULL`,
    [hashToken(token)],
  );
  if (!row) return null;

  void query(`UPDATE sessions SET last_used_at = now() WHERE id = $1`, [row.id]).catch(() => undefined);

  return {
    id: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: mediaRefUrl(row.avatar_url),
    role: row.role,
    onboardedAt: iso(row.onboarded_at),
    email: row.email,
  };
}

export function optionalViewer(req: FastifyRequest): Promise<Viewer | null> {
  let cached = viewerCache.get(req);
  if (!cached) {
    cached = resolveViewer(req);
    viewerCache.set(req, cached);
  }
  return cached;
}

export async function requireViewer(req: FastifyRequest): Promise<Viewer> {
  const viewer = await optionalViewer(req);
  if (!viewer) unauthorized();
  return viewer;
}

export async function requireStaff(req: FastifyRequest): Promise<Viewer> {
  const viewer = await requireViewer(req);
  if (viewer.role !== 'moderator' && viewer.role !== 'admin') {
    forbidden('Bu alan yalnızca moderatörlere açıktır.');
  }
  return viewer;
}
