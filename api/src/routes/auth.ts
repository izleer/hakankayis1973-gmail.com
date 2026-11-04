import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db.js';
import { ApiError, conflict, unauthorized } from '../lib/errors.js';
import { parseBody } from '../lib/http.js';
import { hashPassword, passwordIssues, verifyPassword } from '../lib/password.js';
import {
  issueSession,
  requireViewer,
  revokeCurrentSession,
} from '../lib/session.js';
import { audit } from '../lib/audit.js';
import { notify } from '../lib/notify.js';

const credentials = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin.').max(200),
  password: z.string().min(1).max(200),
});

const registerBody = credentials.extend({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir.'),
  displayName: z.string().trim().min(1).max(80),
});

const loginBody = z.object({
  identifier: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

type UserRow = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'moderator' | 'admin';
  onboarded_at: Date | null;
  password_hash: string;
};

function sessionUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    onboardedAt: row.onboarded_at ? row.onboarded_at.toISOString() : null,
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/register',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const body = parseBody(registerBody, req.body);
      const issues = passwordIssues(body.password);
      if (issues.length > 0) {
        throw new ApiError(422, 'VALIDATION_ERROR', 'Şifre kuralları karşılanmıyor.', {
          fields: { password: issues },
        });
      }

      const email = body.email.toLowerCase();
      const username = body.username.toLowerCase();
      const existing = await queryOne<{ email: string; username: string }>(
        `SELECT email, username FROM users WHERE email = $1 OR username = $2 LIMIT 1`,
        [email, username],
      );
      if (existing) {
        conflict('Bu e-posta veya kullanıcı adı zaten kullanılıyor.');
      }

      const passwordHash = await hashPassword(body.password);
      const rows = await query<UserRow>(
        `INSERT INTO users (email, username, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, password_hash, display_name, avatar_url, role, onboarded_at`,
        [email, username, passwordHash, body.displayName],
      );
      const user = rows[0]!;
      const session = await issueSession(user.id, req);
      await notify({
        userId: user.id,
        type: 'system',
        messageKey: 'izleer’a hoş geldin. İlk varlığını oluşturmak birkaç saniye sürer.',
      });
      await audit(user.id, 'auth.register', 'user', user.id, {}, req.ip);

      return reply.status(201).send({
        data: { token: session.token, expiresAt: session.expiresAt, user: sessionUser(user) },
      });
    },
  );

  app.post(
    '/login',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (req) => {
      const body = parseBody(loginBody, req.body);
      const row = await queryOne<UserRow>(
        `SELECT id, email, username, password_hash, display_name, avatar_url, role, onboarded_at
         FROM users
         WHERE deleted_at IS NULL AND (email = $1 OR username = $2)
         LIMIT 1`,
        [body.identifier, body.identifier],
      );
      if (!row || !(await verifyPassword(body.password, row.password_hash))) {
        unauthorized('E-posta/kullanıcı adı veya şifre hatalı.');
      }

      const session = await issueSession(row.id, req);
      await query(`UPDATE sessions SET last_used_at = now() WHERE id = $1`, [session.sessionId]);
      await audit(row.id, 'auth.login', 'user', row.id, {}, req.ip);
      return {
        data: { token: session.token, expiresAt: session.expiresAt, user: sessionUser(row) },
      };
    },
  );

  app.get('/session', async (req) => {
    const viewer = await requireViewer(req);
    return {
      data: {
        user: {
          id: viewer.id,
          email: viewer.email,
          username: viewer.username,
          displayName: viewer.displayName,
          avatarUrl: viewer.avatarUrl,
          role: viewer.role,
          onboardedAt: viewer.onboardedAt,
        },
      },
    };
  });

  app.post('/logout', async (req) => {
    const viewer = await requireViewer(req);
    await revokeCurrentSession(req);
    await audit(viewer.id, 'auth.logout', 'user', viewer.id, {}, req.ip);
    return { data: { ok: true } };
  });
}
