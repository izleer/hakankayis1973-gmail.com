import { NextResponse } from 'next/server';
import { API_URL, SESSION_COOKIE } from '@/lib/api';

export async function POST(request: Request) {
  const token = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.split('=')[1];

  if (token) {
    await fetch(`${API_URL}/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
