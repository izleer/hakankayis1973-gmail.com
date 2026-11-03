import Link from 'next/link';
import { AssetGrid } from '@/components/AssetCard';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icons';
import { MediaImage } from '@/components/MediaImage';
import { requireViewer, api } from '@/lib/api';
import {
  entryTypeLabels,
  formatDate,
  formatNumber,
  mediaSrc,
  typeIconName,
} from '@/lib/format';
import type { ArchiveResponse, Asset, Paged, Stats } from '@/lib/types';

export const metadata = { title: 'Hafıza' };

const today = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const [stats, assets, media] = await Promise.all([
    api<Stats>('/v1/stats'),
    api<Paged<Asset>>('/v1/assets?limit=6&sort=updated'),
    api<ArchiveResponse>('/v1/media?limit=6&kind=image'),
  ]);

  const heroAsset = assets.items.find((asset) => asset.coverUrl) ?? assets.items[0] ?? null;
  const firstName = viewer.displayName.split(' ')[0];

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-topline">
            <span className="eyebrow eyebrow-light">Hafıza defteri</span>
            <span className="hero-date">{today.format(new Date())}</span>
          </div>
          <div className="hero-main">
            <h1>
              Her şeyin
              <br />
              bir hafızası var.
            </h1>
            <p>
              {firstName}, büyüttüğün, baktığın ya da biriktirdiğin her şeyin izini
              burada tut. Fotoğraflar, belgeler ve küçük notlar zamanla bir hikâyeye
              dönüşsün.
            </p>
            <div className="hero-actions">
              <Link href="/varliklar/yeni" className="btn btn-paper">
                <Icon name="plus" size={18} />
                Yeni varlık
              </Link>
              <Link href="/arsiv" className="btn btn-ghost-light">
                Arşivi gör
                <Icon name="arrow-right" size={17} />
              </Link>
            </div>
          </div>
          <div className="hero-numbers">
            <span>
              <strong>{formatNumber(stats.assets)}</strong> varlık
            </span>
            <span>
              <strong>{formatNumber(stats.entries)}</strong> kayıt
            </span>
            <span>
              <strong>{formatNumber(stats.images)}</strong> fotoğraf
            </span>
          </div>
        </div>

        <div className="hero-image">
          {heroAsset ? (
            <Link href={`/varliklar/${heroAsset.id}`} className="hero-image-link">
              <MediaImage
                src={heroAsset.coverUrl}
                alt={heroAsset.title}
                fallbackIcon={typeIconName(heroAsset.type.icon)}
                loading="eager"
              />
              <span className="hero-image-caption">
                <span className="eyebrow eyebrow-light">Son iz</span>
                <strong>{heroAsset.title}</strong>
                <small>
                  {heroAsset.type.label} · {formatDate(heroAsset.updatedAt)}
                </small>
              </span>
              <span className="hero-image-mark">
                <Icon name="arrow-right" size={18} />
              </span>
            </Link>
          ) : (
            <div className="hero-image-empty">
              <Icon name="leaf" size={40} />
              <p>İlk varlığını ekle, hafızan burada başlasın.</p>
            </div>
          )}
        </div>
      </section>

      <section className="stats" aria-label="Hafıza özeti">
        <div className="stat">
          <span className="stat-icon">
            <Icon name="leaf" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.assets)}</strong>
            <span>Varlık</span>
          </div>
          <small>{stats.publicAssets} herkese açık</small>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="book" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.entries)}</strong>
            <span>Hafıza kaydı</span>
          </div>
          <small>Son 30 günde {stats.recentEntries.length} yeni iz</small>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="image" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.images)}</strong>
            <span>Fotoğraf</span>
          </div>
          <small>{stats.videos} video</small>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Icon name="file" size={18} />
          </span>
          <div>
            <strong>{formatNumber(stats.documents)}</strong>
            <span>Belge</span>
          </div>
          <small>{stats.sharedWithMe} paylaşılan varlık</small>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Sahip oldukların</span>
            <h2>Varlıkların</h2>
          </div>
          <Link href="/varliklar" className="text-link">
            Tümünü gör
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        {assets.items.length > 0 ? (
          <AssetGrid assets={assets.items} />
        ) : (
          <EmptyState
            title="Hafızan henüz boş"
            body="İlk bonsain, kedin, tablon ya da evinle başla. Bir fotoğraf ve kısa bir not yeterli."
            action={{ href: '/varliklar/yeni', label: 'İlk varlığı ekle' }}
          />
        )}
      </section>

      <div className="split-section">
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Zaman çizelgesi</span>
              <h2>Son izler</h2>
            </div>
            <Link href="/arsiv" className="text-link">
              Arşiv
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          {stats.recentEntries.length > 0 ? (
            <div className="mini-timeline">
              {stats.recentEntries.slice(0, 5).map((entry) => {
                const photo = entry.media.find((item) => item.kind === 'image');
                return (
                  <Link
                    key={entry.id}
                    href={`/varliklar/${entry.assetId}`}
                    className="mini-entry"
                  >
                    <span className="mini-entry-date">
                      <strong>{formatDate(entry.occurredAt).split(' ')[0]}</strong>
                      <small>{formatDate(entry.occurredAt).split(' ').slice(1).join(' ')}</small>
                    </span>
                    <span className="mini-entry-body">
                      <span className="mini-entry-kicker">
                        {entryTypeLabels[entry.type]} · {entry.asset?.title ?? 'Varlık'}
                      </span>
                      <strong>{entry.title ?? 'İsimsiz kayıt'}</strong>
                      {entry.body ? <small>{entry.body}</small> : null}
                    </span>
                    {photo ? (
                      <span className="mini-entry-thumb">
                        <MediaImage src={mediaSrc(photo.url)} alt="" />
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted-note">Henüz kayıt yok. İlk notunu eklediğinde burada görünecek.</p>
          )}
        </section>

        <aside className="manifesto">
          <span className="eyebrow eyebrow-light">Neden hafıza?</span>
          <blockquote>
            “Bir yaprağın açması bir günde olur; onu fark etmek için yıllarca aynı
            yere bakmak gerekir.”
          </blockquote>
          <p>
            izleer, yalnızca envanter tutmaz. Bakımın, değişimin ve
            biriktirdiğin anların arasındaki bağı görünür kılar.
          </p>
          <div className="manifesto-stats">
            <span>
              <strong>{stats.images + stats.documents}</strong>
              arşiv parçası
            </span>
            <span>
              <strong>{stats.following}</strong>
              takip edilen hafıza
            </span>
          </div>
        </aside>
      </div>

      {media.items.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Son eklenenler</span>
              <h2>Arşivden</h2>
            </div>
            <Link href="/arsiv" className="text-link">
              Tüm arşiv
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="strip">
            {media.items.map((item) => (
              <Link key={item.id} href={`/varliklar/${item.asset.id}`} className="strip-item">
                <MediaImage src={mediaSrc(item.url)} alt={item.asset.title} />
                <span>
                  <strong>{item.asset.title}</strong>
                  <small>{formatDate(item.createdAt)}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
