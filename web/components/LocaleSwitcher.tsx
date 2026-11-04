'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/client';
import { Icon } from './Icons';

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState<Locale>(locale);
  const [pending, startTransition] = useTransition();

  async function change(next: Locale) {
    if (next === value) return;
    setValue(next);
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      document.documentElement.lang = next;
    } finally {
      startTransition(() => router.refresh());
    }
  }

  return (
    <label className={`locale-switcher${pending ? ' is-pending' : ''} ${className}`.trim()}>
      <Icon name="globe" size={16} />
      <select
        value={value}
        onChange={(event) => change(event.target.value as Locale)}
        aria-label={t('Dil')}
        title={t('Dili değiştir')}
        disabled={pending}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeNames[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
