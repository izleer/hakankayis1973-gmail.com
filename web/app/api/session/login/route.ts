import { NextResponse } from 'next/server';
import { apiDirect, SESSION_COOKIE } from '@/lib/api';
import type { User } from '@/lib/types';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await apiDirect<{ token: string; user: User }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: body.identifier, password: body.password }),
  });

  if (!result.ok || !result.data) {
    return NextResponse.json(
      { error: result.error ?? { message: 'Giriş yapılamadı.' } },
      { status: result.status },
    );
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
