'use client';

import { useT } from '@/lib/i18n/client';
import { Icon } from './Icons';

export function MiniMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label?: string;
}) {
  const t = useT();
  const latSpan = 0.0045;
  const lngSpan = 0.008;
  const bbox = [
    longitude - lngSpan,
    latitude - latSpan,
    longitude + lngSpan,
    latitude + latSpan,
  ]
    .map((value) => value.toFixed(5))
    .join(',');

  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const description = label ? `${t('Haritada aç')} · ${label}` : t('Haritada aç');

  return (
    <div className="mini-map">
      <a
        className="mini-map-link"
        href={externalUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={description}
      >
        <iframe
          src={embedUrl}
          title={label ?? 'OpenStreetMap'}
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <span className="mini-map-hint">
          <Icon name="pin" size={14} />
          {t('Haritada aç')}
          <Icon name="arrow-right" size={14} />
        </span>
      </a>
      <a
        className="mini-map-credit"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap
      </a>
    </div>
  );
}
