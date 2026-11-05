'use client';

import { useT } from '@/lib/i18n/client';
import { Icon } from './Icons';

export function ReportActions({ title }: { title: string }) {
  const t = useT();

  return (
    <div className="report-toolbar no-print">
      <div className="report-toolbar-text">
        <span className="eyebrow">{t('Varlık raporu')}</span>
        <strong>{title}</strong>
        <small>{t('Yazdır penceresinde “PDF olarak kaydet” seçeneğini kullan.')}</small>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => window.print()}>
        <Icon name="download" size={17} />
        {t('PDF olarak indir')}
      </button>
    </div>
  );
}
