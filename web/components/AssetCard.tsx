import Link from 'next/link';
import { formatDate, typeIconName } from '@/lib/format';
import type { Asset } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link href={`/varliklar/${asset.id}`} className="asset-card">
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
        {asset.visibility === 'public' ? (
          <span className="asset-public-dot" title="Herkese açık">
            <Icon name="eye" size={13} />
          </span>
        ) : null}
      </div>
      <div className="asset-card-body">
        <div className="asset-card-kicker">
          <span>{asset.locationName ?? asset.type.label}</span>
          <span>{asset.entryCount} kayıt</span>
        </div>
        <h3>{asset.title}</h3>
        {asset.description ? <p>{asset.description}</p> : null}
        <div className="asset-card-foot">
          <span>Son iz · {formatDate(asset.updatedAt)}</span>
          <span className="asset-arrow">
            <Icon name="arrow-right" size={17} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AssetGrid({ assets }: { assets: Asset[] }) {
  return (
    <div className="asset-grid">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
