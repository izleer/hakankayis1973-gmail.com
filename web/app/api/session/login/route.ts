import { NextResponse } from 'next/server';
import { apiDirect, readJsonDebug, SESSION_COOKIE } from '@/lib/api';
import type { User } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const parsed = await readJsonDebug(request);
  const body = (parsed.parsed as { identifier?: string; password?: string } | null) ?? {};
  const forwardedFor = request.headers.get('x-forwarded-for');
  const result = await apiDirect<{ token: string; user: User }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: body.identifier, password: body.password }),
    ...(forwardedFor ? { headers: { 'X-Forwarded-For': forwardedFor } } : {}),
  });

  if (!result.ok || !result.data) {
    const response = NextResponse.json(
      { error: result.error ?? { message: 'Giriş yapılamadı.' } },
      { status: result.status },
    );
    response.headers.set('X-Web-Login', 'v3');
    response.headers.set('X-Body-Len', String(parsed.text?.length ?? -1));
    response.headers.set('X-Body-Err', parsed.error ?? 'none');
    return response;
  }

  const response = NextResponse.json({ data: { user: result.data.user } });
  response.cookies.set(SESSION_COOKIE, result.data.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
