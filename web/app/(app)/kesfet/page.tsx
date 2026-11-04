import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { FeedCard } from '@/components/FeedCard';
import { FollowButton } from '@/components/FollowButton';
import { Icon } from '@/components/Icons';
import { MediaImage } from '@/components/MediaImage';
import { api, requireViewer } from '@/lib/api';
import { initials, typeIconName } from '@/lib/format';
import { getI18n, getT } from '@/lib/i18n/server';
import type { Asset, CursorPage, FeedPost, Paged, UserMini } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Keşfet') };
}

type Suggestion = UserMini & { bio: string | null; followerCount: number; isFollowing: boolean };

export default async function ExplorePage() {
  const { t, locale } = await getI18n();
  await requireViewer();
  const [feed, discover, suggestions] = await Promise.all([
    api<CursorPage<FeedPost>>('/v1/feed?scope=explore&limit=16'),
    api<Paged<Asset>>('/v1/assets/discover?limit=4&sort=recent'),
    api<{ items: Suggestion[] }>('/v1/users/suggestions'),
  ]);

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Başka hafızalara bak')}</span>
          <h1>{t('Keşfet')}</h1>
          <p>
            {t(
              'Bonsai’sinden bir yaprak, yıllardır süren bir restorasyon ya da yeni aldığı ilk fotoğraf… Başkalarının izleri burada.',
            )}
          </p>
        </div>
        <Link href="/arsiv" className="btn btn-ghost">
          <Icon name="archive" size={17} />
          {t('Kendi arşivin')}
        </Link>
      </header>

      <div className="explore-layout">
        <section className="feed-column">
          {feed.items.length > 0 ? (
            feed.items.map((post) => <FeedCard key={post.id} post={post} />)
          ) : (
            <EmptyState
              icon="compass"
              title={t('Şimdilik sessiz')}
              body={t(
                'Herkese açık paylaşılan bir iz henüz yok. Kendi varlığını herkese açarak başlayabilirsin.',
              )}
              action={{ href: '/varliklar', label: t('Varlıklarına git') }}
            />
          )}
        </section>

        <aside className="explore-aside">
          <section className="aside-card">
            <div className="aside-head">
              <div>
                <span className="eyebrow">{t('Herkese açık')}</span>
                <h2>{t('Hafıza önerileri')}</h2>
              </div>
              <span className="aside-count">{discover.items.length}</span>
            </div>
            {discover.items.length > 0 ? (
              <div className="discover-list">
                {discover.items.map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/varliklar/${asset.id}`}
                    className="discover-item"
                  >
                    <span className="discover-thumb">
                      <MediaImage
                        src={asset.coverUrl}
                        alt={asset.title}
                        fallbackIcon={typeIconName(asset.type.icon)}
                      />
                    </span>
                    <span className="discover-text">
                      <small>{asset.type.label}</small>
                      <strong>{asset.title}</strong>
                      <span>
                        {asset.owner.displayName} ·{' '}
                        {t('{count} kayıt', { count: asset.entryCount })}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted-note">{t('Henüz herkese açık bir varlık yok.')}</p>
            )}
          </section>

          <section className="aside-card">
            <div className="aside-head">
              <div>
                <span className="eyebrow">{t('Topluluk')}</span>
                <h2>{t('Tanış')}</h2>
              </div>
            </div>
            {suggestions.items.length > 0 ? (
              <div className="people-list">
                {suggestions.items.slice(0, 4).map((person) => (
                  <div key={person.id} className="person-row">
                    <Link href={`/profil/${person.username}`} className="person-link">
                      <span className="avatar avatar-small">
                        {person.avatarUrl ? (
                          <img src={person.avatarUrl} alt="" />
                        ) : (
                          initials(person.displayName, locale)
                        )}
                      </span>
                      <span>
                        <strong>{person.displayName}</strong>
                        <small>
                          @{person.username} ·{' '}
                          {t('{count} takipçi', { count: person.followerCount })}
                        </small>
                      </span>
                    </Link>
                    <FollowButton
                      username={person.username}
                      initial={person.isFollowing}
                      compact
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-note">{t('Önerilecek yeni bir kişi yok.')}</p>
            )}
          </section>

          <div className="explore-note">
            <Icon name="leaf" size={20} />
            <p>
              {t(
                'Bir varlığı herkese açtığında yalnızca seçtiğin kayıtlar ve fotoğraflar görünür. Özel notların hep sende kalır.',
              )}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
