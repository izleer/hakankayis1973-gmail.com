import Link from 'next/link';
import {
  formatDate,
  formatLocation,
  typeIconName,
  visibilityLabels,
} from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import type { Asset } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

const visibilityIcons = {
  private: 'lock',
  selected: 'users',
  friends: 'users',
  public: 'eye',
} as const;

export async function AssetCard({
  asset,
  shared = false,
}: {
  asset: Asset;
  shared?: boolean;
}) {
  const { t, locale } = await getI18n();
  const visibility = t(visibilityLabels[asset.visibility]);

  return (
    <Link
      href={`/varliklar/${asset.id}`}
      className="asset-card"
      aria-label={`${asset.title} · ${visibility}`}
    >
      <div className="asset-card-media">
        <MediaImage
          src={asset.coverUrl}
          alt={asset.title}
          fallbackIcon={typeIconName(asset.type.icon)}
        />
        <span className="asset-type-chip">
          <Icon name={typeIconName(asset.type.icon)} size={14} />
          {asset.type.label}
        </span>
        <span className={`asset-visibility is-${asset.visibility}`} title={visibility}>
          <Icon name={visibilityIcons[asset.visibility]} size={12} />
          {visibility}
        </span>
      </div>
      <div className="asset-card-body">
        <div className="asset-card-kicker">
          <span>{formatLocation(asset.locationName, locale) || asset.type.label}</span>
          <span>{t('{count} kayıt', { count: asset.entryCount })}</span>
        </div>
        <h3>{asset.title}</h3>
        {asset.description ? <p>{asset.description}</p> : null}
        {shared ? (
          <div className="asset-card-owner">
            <span className="avatar avatar-tiny">
              {asset.owner.avatarUrl ? (
                <img src={asset.owner.avatarUrl} alt="" />
              ) : (
                asset.owner.displayName.slice(0, 1)
              )}
            </span>
            <span>
              <strong>{asset.owner.displayName}</strong>
              <small>
                @{asset.owner.username}
                {asset.relation === 'friends'
                  ? ` · ${t('arkadaş paylaşımı')}`
                  : ` · ${t('seninle paylaşıldı')}`}
              </small>
            </span>
          </div>
        ) : null}
        <div className="asset-card-foot">
          <span>
            {t('Son iz')} · {formatDate(asset.updatedAt, locale)}
          </span>
          <span className="asset-arrow">
            <Icon name="arrow-right" size={17} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AssetGrid({ assets, shared = false }: { assets: Asset[]; shared?: boolean }) {
  return (
    <div className="asset-grid">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} shared={shared} />
      ))}
    </div>
  );
}
