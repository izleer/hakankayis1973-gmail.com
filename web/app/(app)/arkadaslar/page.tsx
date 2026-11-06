import type { Metadata } from 'next';
import Link from 'next/link';
import { AssetGrid } from '@/components/AssetCard';
import { EmptyState } from '@/components/EmptyState';
import { FollowButton } from '@/components/FollowButton';
import { FriendButton } from '@/components/FriendButton';
import { Icon } from '@/components/Icons';
import { api, requireViewer } from '@/lib/api';
import { formatDate, formatNumber, initials } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import { getI18n, getT } from '@/lib/i18n/server';
import type {
  Asset,
  Friend,
  FriendRequest,
  FriendStatus,
  Paged,
  UserMini,
} from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Arkadaşlar') };
}

type Suggestion = UserMini & {
  bio: string | null;
  followerCount: number;
  isFollowing: boolean;
  friendStatus: FriendStatus;
};

const tabIds = ['friends', 'requests', 'suggestions', 'assets'] as const;
type TabId = (typeof tabIds)[number];

type SearchParams = Promise<{ tab?: string; q?: string; rel?: string }>;

function tabOf(value: string | undefined): TabId {
  return tabIds.includes(value as TabId) ? (value as TabId) : 'friends';
}

function tabHref(tab: TabId) {
  return tab === 'friends' ? '/arkadaslar' : `/arkadaslar?tab=${tab}`;
}

function Avatar({ user, locale }: { user: UserMini; locale: Locale }) {
  return (
    <span className="avatar avatar-small">
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.displayName, locale)}
    </span>
  );
}

export default async function FriendsPage({ searchParams }: { searchParams: SearchParams }) {
  const { t, locale } = await getI18n();
  const viewer = await requireViewer();
  const params = await searchParams;
  const tab = tabOf(params.tab);

  const sharedQuery = new URLSearchParams({ limit: '48' });
  if (tab === 'assets' && params.q) sharedQuery.set('q', params.q);

  const [friends, requests, suggestions, shared] = await Promise.all([
    api<{ items: Friend[] }>('/v1/users/me/friends'),
    api<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
      '/v1/users/me/friend-requests',
    ),
    api<{ items: Suggestion[] }>('/v1/users/suggestions?scope=friends'),
    api<Paged<Asset>>(`/v1/assets/shared?${sharedQuery.toString()}`),
  ]);

  const rel = params.rel === 'friends' || params.rel === 'granted' ? params.rel : '';
  const sharedAssets = rel
    ? shared.items.filter((asset) => asset.relation === rel)
    : shared.items;
  const friendSharedCount = shared.items.filter((asset) => asset.relation === 'friends').length;
  const grantedCount = shared.items.length - friendSharedCount;
  const pendingCount = requests.incoming.length;

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'friends', label: 'Arkadaşlarım', count: friends.items.length },
    { id: 'requests', label: 'İstekler', count: pendingCount },
    { id: 'suggestions', label: 'Öneriler', count: suggestions.items.length },
    { id: 'assets', label: 'Varlıkları', count: shared.total },
  ];

  const sharedLink = (nextRel: string) => {
    const search = new URLSearchParams({ tab: 'assets' });
    if (nextRel) search.set('rel', nextRel);
    return `/arkadaslar?${search.toString()}`;
  };

  return (
    <main className="page friends-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Birlikte büyüyen hafızalar')}</span>
          <h1>{t('Arkadaşlar')}</h1>
          <p>
            {t(
              'Arkadaş olduğun kişiler, yalnızca arkadaşlarına açtıkları varlıkları seninle paylaşır. Sen de kendi varlıklarını aynı şekilde açabilirsin.',
            )}
          </p>
        </div>
        <Link href="/kesfet" className="btn btn-ghost">
          <Icon name="compass" size={17} />
          {t('Yeni arkadaş bul')}
        </Link>
      </header>

      <div className="toolbar">
        <div className="segmented" aria-label={t('Arkadaşlar bölümleri')}>
          {tabs.map((item) => (
            <Link
              key={item.id}
              href={tabHref(item.id)}
              className={tab === item.id ? 'is-active' : ''}
            >
              {t(item.label)}
              <span className="segmented-count">{item.count}</span>
            </Link>
          ))}
        </div>
        <span className="muted-note">
          {t('{count} arkadaş', { count: friends.items.length })}
          {pendingCount > 0
            ? ` · ${t('{count} bekleyen istek', { count: pendingCount })}`
            : ''}
        </span>
      </div>

      {tab === 'friends' ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Karşılıklı izin')}</span>
              <h2>{t('Arkadaşların')}</h2>
            </div>
            <span className="aside-count">{friends.items.length}</span>
          </div>
          {friends.items.length > 0 ? (
            <div className="friends-grid">
              {friends.items.map((friend) => (
                <article key={friend.id} className="friend-card">
                  <Link href={`/profil/${friend.username}`} className="person-link">
                    <Avatar user={friend} locale={locale} />
                    <span>
                      <strong>{friend.displayName}</strong>
                      <small>
                        @{friend.username}
                        {friend.since
                          ? ` · ${t('{date}’den beri', {
                              date: formatDate(friend.since, locale),
                            })}`
                          : ''}
                      </small>
                    </span>
                  </Link>
                  <FriendButton
                    username={friend.username}
                    initial="friends"
                    compact
                    removable
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="users"
              title={t('Henüz arkadaşın yok')}
              body={t('Önerilerden birine istek göndererek ilk bağlantını kur.')}
              action={{ href: '/arkadaslar?tab=suggestions', label: t('Önerilere git') }}
            />
          )}
        </section>
      ) : null}

      {tab === 'requests' ? (
        <div className="friends-columns">
          <section className="section">
            <div className="section-head">
              <div>
                <span className="eyebrow">{t('Sana gelen')}</span>
                <h2>{t('Gelen istekler')}</h2>
              </div>
              <span className="aside-count">{requests.incoming.length}</span>
            </div>
            {requests.incoming.length > 0 ? (
              <div className="people-list">
                {requests.incoming.map((request) => (
                  <div key={request.user.id} className="request-card">
                    <Link
                      href={`/profil/${request.user.username}`}
                      className="person-link"
                    >
                      <Avatar user={request.user} locale={locale} />
                      <span>
                        <strong>{request.user.displayName}</strong>
                        <small>
                          @{request.user.username} · {formatDate(request.requestedAt, locale)}
                        </small>
                      </span>
                    </Link>
                    <FriendButton
                      username={request.user.username}
                      initial="pending_in"
                      compact
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-note">{t('Bekleyen bir istek yok.')}</p>
            )}
          </section>

          <section className="section">
            <div className="section-head">
              <div>
                <span className="eyebrow">{t('Senin gönderdiklerin')}</span>
                <h2>{t('Gönderdiğin istekler')}</h2>
              </div>
              <span className="aside-count">{requests.outgoing.length}</span>
            </div>
            {requests.outgoing.length > 0 ? (
              <div className="people-list">
                {requests.outgoing.map((request) => (
                  <div key={request.user.id} className="request-card">
                    <Link
                      href={`/profil/${request.user.username}`}
                      className="person-link"
                    >
                      <Avatar user={request.user} locale={locale} />
                      <span>
                        <strong>{request.user.displayName}</strong>
                        <small>
                          @{request.user.username} · {formatDate(request.requestedAt, locale)}
                        </small>
                      </span>
                    </Link>
                    <FriendButton
                      username={request.user.username}
                      initial="pending_out"
                      compact
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-note">{t('Henüz bir istek göndermedin.')}</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'suggestions' ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Tanış')}</span>
              <h2>{t('Arkadaş olabileceklerin')}</h2>
            </div>
            <span className="aside-count">{suggestions.items.length}</span>
          </div>
          {suggestions.items.length > 0 ? (
            <div className="friends-grid">
              {suggestions.items.map((person) => (
                <article key={person.id} className="friend-card">
                  <Link href={`/profil/${person.username}`} className="person-link">
                    <Avatar user={person} locale={locale} />
                    <span>
                      <strong>{person.displayName}</strong>
                      <small>
                        @{person.username} ·{' '}
                        {t('{count} takipçi', { count: person.followerCount })}
                      </small>
                    </span>
                  </Link>
                  <span className="person-actions">
                    <FriendButton
                      username={person.username}
                      initial={person.friendStatus}
                      compact
                    />
                    <FollowButton
                      username={person.username}
                      initial={person.isFollowing}
                      compact
                    />
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="compass"
              title={t('Şimdilik yeni bir öneri yok')}
              body={t('Keşfet sayfasında başka hafızalara göz atabilirsin.')}
              action={{ href: '/kesfet', label: t('Keşfete git') }}
            />
          )}
        </section>
      ) : null}

      {tab === 'assets' ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Seninle paylaşılan')}</span>
              <h2>{t('Arkadaşlarının varlıkları')}</h2>
            </div>
            <span className="aside-count">{formatNumber(shared.total, locale)}</span>
          </div>

          <form className="search-form" action="/arkadaslar">
            <input type="hidden" name="tab" value="assets" />
            {rel ? <input type="hidden" name="rel" value={rel} /> : null}
            <Icon name="search" size={18} />
            <input
              name="q"
              defaultValue={params.q ?? ''}
              placeholder={t('Paylaşılan varlıklarda ara…')}
              aria-label={t('Paylaşılan varlık ara')}
            />
            {params.q ? (
              <Link
                href={sharedLink(rel)}
                className="search-clear"
                aria-label={t('Aramayı temizle')}
                title={t('Aramayı temizle')}
              >
                <Icon name="close" size={15} />
              </Link>
            ) : null}
            <button type="submit" className="search-submit">
              {t('Ara')}
            </button>
          </form>

          <div className="filter-row">
            <Link
              href="/arkadaslar?tab=assets"
              className={`chip${!rel ? ' is-active' : ''}`}
            >
              <Icon name="grid" size={15} />
              {t('Tümü')}
              <span className="chip-count">{shared.items.length}</span>
            </Link>
            <Link
              href={sharedLink('friends')}
              className={`chip${rel === 'friends' ? ' is-active' : ''}`}
            >
              <Icon name="users" size={15} />
              {t('Arkadaş paylaşımı')}
              <span className="chip-count">{friendSharedCount}</span>
            </Link>
            <Link
              href={sharedLink('granted')}
              className={`chip${rel === 'granted' ? ' is-active' : ''}`}
            >
              <Icon name="share" size={15} />
              {t('Seninle paylaşılan')}
              <span className="chip-count">{grantedCount}</span>
            </Link>
          </div>

          {sharedAssets.length > 0 ? (
            <AssetGrid assets={sharedAssets} shared />
          ) : (
            <EmptyState
              icon="users"
              title={t('Paylaşılan bir varlık yok')}
              body={t(
                'Arkadaşların varlıklarını arkadaşlarına açtığında ya da sana özellikle izin verdiğinde burada görünür.',
              )}
              action={{ href: '/arkadaslar?tab=suggestions', label: t('Yeni arkadaş bul') }}
            />
          )}

          <p className="groups-note">
            <Icon name="lock" size={16} />
            {t(
              'Yalnızca arkadaşlarına açılmış varlıklar ve sana özellikle izin verilen parçalar burada listelenir. Özel varlıklar hiçbir zaman görünmez.',
            )}
          </p>
        </section>
      ) : null}

      <span className="visually-hidden">
        {t('Görüntüleyen: {name}', { name: viewer.displayName })}
      </span>
    </main>
  );
}
