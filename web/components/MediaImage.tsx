'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icons';

export function MediaImage({
  src,
  alt,
  className,
  fallbackIcon = 'image',
  fallbackLabel,
  loading = 'lazy',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: IconName;
  fallbackLabel?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setFailed(false);
    const img = imgRef.current;
    // Önbellekteki bir görsel hata verdiginde onError hidrasyondan önce
    // tetiklenmis olabilir; tamamlanmis ama boyutsuz görseli yakala.
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [src]);

  if (!src || failed) {
    return (
      <span className={`media-fallback${className ? ` ${className}` : ''}`} aria-hidden="true">
        {fallbackLabel ? (
          <span className="media-fallback-label">{fallbackLabel}</span>
        ) : (
          <Icon name={fallbackIcon} size={26} />
        )}
      </span>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
