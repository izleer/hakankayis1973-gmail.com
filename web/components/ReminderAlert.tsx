'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { vh } from '@/lib/client';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import type { ReminderItem } from '@/lib/types';
import { Icon } from './Icons';

const DISMISSED_KEY = 'izleer.reminderAlerts.dismissed';
const POLL_MS = 60_000;

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * Zamanı gelen hatırlatmayı ekranda uyarı olarak gösterir. Sunucu bildirim
 * kutusu ayrıca doldurulur; bu bileşen yalnızca görünür uyarıyı üstlenir.
 */
export function ReminderAlert() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const dismissedRef = useRef<string[]>([]);

  useEffect(() => {
    dismissedRef.current = readDismissed();
    setDismissed(dismissedRef.current);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await vh.get<{ items: ReminderItem[] }>('reminders');
      setItems(data.items ?? []);
    } catch {
      // Sessiz yenileme; uyarı bir sonraki turda tekrar denenir.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Zamanı yaklaşan hatırlatma için tam saatte bir yenileme planla.
  useEffect(() => {
    const now = Date.now();
    const upcoming = items
      .filter((item) => !item.doneAt && item.dueAt)
      .map((item) => new Date(item.dueAt as string).getTime())
      .filter((time) => time > now)
      .sort((a, b) => a - b)[0];
    if (!upcoming) return;
    const delay = Math.min(upcoming - now + 1500, 12 * 60 * 60 * 1000);
    const timer = window.setTimeout(() => void refresh(), Math.max(delay, 1000));
    return () => window.clearTimeout(timer);
  }, [items, refresh]);

  function dismiss(key: string) {
    const next = Array.from(new Set([...dismissedRef.current, key]));
    dismissedRef.current = next;
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Depolama kapalıysa uyarı yalnızca bu sekmede kapanır.
    }
  }

  const now = Date.now();
  const due = items.find((item) => {
    if (item.doneAt || !item.dueAt) return false;
    if (new Date(item.dueAt).getTime() > now) return false;
    return !dismissed.includes(`${item.id}:${item.dueAt}`);
  });

  if (!due) return null;

  const alertKey = `${due.id}:${due.dueAt}`;
  const detail = due.title?.trim() || due.body?.trim();

  return (
    <div className="reminder-alert" role="alert" aria-live="assertive">
      <span className="reminder-alert-icon">
        <Icon name="clock" size={20} />
      </span>
      <div className="reminder-alert-body">
        <span className="reminder-alert-kicker">{t('Hatırlatma zamanı')}</span>
        <strong>{due.assetTitle || t('Varlık')}</strong>
        <p>{detail || t('Hatırlatmanın zamanı geldi.')}</p>
        {due.dueAt ? <small>{formatDateTime(due.dueAt, locale)}</small> : null}
        <div className="reminder-alert-actions">
          <Link
            href={`/varliklar/${due.assetId}`}
            className="btn btn-primary btn-sm"
            onClick={() => dismiss(alertKey)}
          >
            {t('Varlığa git')}
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dismiss(alertKey)}
          >
            {t('Tamam')}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="icon-btn reminder-alert-close"
        aria-label={t('Kapat')}
        onClick={() => dismiss(alertKey)}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
