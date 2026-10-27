'use client';

import { useState } from 'react';
import { Icon, type IconName } from './Icons';

export function MediaImage({
  src,
  alt,
  className,
  fallbackIcon = 'image',
  loading = 'lazy',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: IconName;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={`media-fallback${className ? ` ${className}` : ''}`} aria-hidden="true">
        <Icon name={fallbackIcon} size={26} />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
