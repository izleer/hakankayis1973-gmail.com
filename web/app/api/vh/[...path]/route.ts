import { NextResponse } from 'next/server';
import { API_URL, SESSION_COOKIE } from '@/lib/api';
import { LOCALE_COOKIE, isLocale, negotiateLocale } from '@/lib/i18n/config';

const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const;

/** Proxy'nin kendi ürettiği hata mesajları (API'ye hiç ulaşılamadığında). */
const proxyMessages = {
  method: {
    tr: 'Yöntem desteklenmiyor.',
    en: 'Method not supported.',
    de: 'Methode wird nicht unterstützt.',
    fr: 'Méthode non prise en charge.',
    es: 'Método no compatible.',
  },
  unavailable: {
    tr: 'API sunucusuna ulaşılamadı.',
    en: 'Could not reach the API server.',
    de: 'Der API-Server ist nicht erreichbar.',
    fr: "Impossible de joindre le serveur de l'API.",
    es: 'No se pudo contactar con el servidor de la API.',
  },
} as const;

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  return cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')[1];
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const incoming = new URL(request.url);
  const target = `${API_URL}/v1/${path.join('/')}${incoming.search}`;
  const cookieHeader = request.headers.get('cookie');
  const token = cookieValue(cookieHeader, SESSION_COOKIE);

  // Kullanıcının seçtiği dil çerezde tutulur; yoksa tarayıcı dili esas alınır.
  const selected = cookieValue(cookieHeader, LOCALE_COOKIE);
  const locale = isLocale(selected)
    ? selected
    : negotiateLocale(request.headers.get('accept-language'));

  const method = request.method.toUpperCase();
  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return NextResponse.json(
      { error: { message: proxyMessages.method[locale] } },
      { status: 405 },
    );
  }

  const body = method === 'GET' || method === 'DELETE' ? undefined : await request.text();
  try {
    const response = await fetch(target, {
      method,
      headers: {
        Accept: 'application/json',
        'Accept-Language': locale,
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
      { error: { message: proxyMessages.unavailable[locale] } },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
