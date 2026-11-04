'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { defaultLocale, localeTags, type Locale } from './config';
import { makeT, type TFunction } from './translate';

type I18nValue = {
  locale: Locale;
  tag: string;
  t: TFunction;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({ locale, tag: localeTags[locale], t: makeT(locale) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value) return value;
  // Provider dışında kalan istemci bileşenleri için güvenli varsayılan.
  return { locale: defaultLocale, tag: localeTags[defaultLocale], t: makeT(defaultLocale) };
}

export function useT(): TFunction {
  return useI18n().t;
}
