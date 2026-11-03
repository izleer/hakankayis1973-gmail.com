import { NextResponse } from 'next/server';
import { API_URL, SESSION_COOKIE } from '@/lib/api';

function sessionToken(request: Request): string | null {
  return (
    request.headers
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.split('=')[1] ?? null
  );
}

export async function GET(request: Request) {
  const token = sessionToken(request);
  if (!token) {
    return NextResponse.redirect(new URL('/giris', request.url));
  }

  const fallback = new URL('/ayarlar/sosyal', request.url);
  try {
    const response = await fetch(`${API_URL}/v1/social/facebook/start`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: { url?: string };
    } | null;

    if (!response.ok || !payload?.data?.url) {
      fallback.searchParams.set('social', 'error');
      fallback.searchParams.set('reason', response.status === 503 ? 'config' : 'token');
      return NextResponse.redirect(fallback);
    }
    return NextResponse.redirect(payload.data.url);
  } catch {
    fallback.searchParams.set('social', 'error');
    fallback.searchParams.set('reason', 'network');
    return NextResponse.redirect(fallback);
  }
}
