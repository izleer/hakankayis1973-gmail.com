import { NextResponse } from 'next/server';
import { API_URL, SESSION_COOKIE } from '@/lib/api';

const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = `${API_URL}/v1/${path.join('/')}${incoming.search}`;
  const token = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.split('=')[1];

  const method = request.method.toUpperCase();
  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return NextResponse.json({ error: { message: 'Yöntem desteklenmiyor.' } }, { status: 405 });
  }

  const body = method === 'GET' || method === 'DELETE' ? undefined : await request.text();
  try {
    const response = await fetch(target, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': request.headers.get('content-type') ?? 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: 'no-store',
    });

    const buffer = response.status === 204 ? null : await response.arrayBuffer();
    const out = new NextResponse(buffer, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    });

    if (response.status === 401) {
      out.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    }
    return out;
  } catch {
    return NextResponse.json(
      { error: { message: 'API sunucusuna ulaşılamadı.' } },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
