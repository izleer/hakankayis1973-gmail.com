import { cookies } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_COOKIE, localeTags, type Locale } from './config';
import { makeT, type TFunction } from './translate';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getI18n(): Promise<{ locale: Locale; tag: string; t: TFunction }> {
  const locale = await getLocale();
  return { locale, tag: localeTags[locale], t: makeT(locale) };
}

export async function getT(): Promise<TFunction> {
  const locale = await getLocale();
  return makeT(locale);
}
