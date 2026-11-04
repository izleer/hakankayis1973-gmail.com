import { NextResponse, type NextRequest } from 'next/server';
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  negotiateLocale,
} from './lib/i18n/config';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const requested = url.searchParams.get('lang');

  // Paylaşılan bağlantılarda ?lang=de gibi açık bir tercih desteklenir.
  if (requested && isLocale(requested)) {
    url.searchParams.delete('lang');
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE, requested, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    return response;
  }

  const current = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(current)) return NextResponse.next();

  const locale = negotiateLocale(request.headers.get('accept-language'));
  request.cookies.set(LOCALE_COOKIE, locale);
  const response = NextResponse.next({ request });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|files|favicon.ico|icon.svg).*)'],
};
