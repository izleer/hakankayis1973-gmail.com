import Link from 'next/link';
import { AssetGrid } from './AssetCard';
import { EmptyState } from './EmptyState';
import { FeedCard } from './FeedCard';
import { FollowButton } from './FollowButton';
import { Icon } from './Icons';
import { formatDate, formatNumber, initials } from '@/lib/format';
import { getI18n } from '@/lib/i18n/server';
import type { Asset, FeedPost, User } from '@/lib/types';

export async function ProfileScreen({
  user,
  assets,
  posts,
}: {
  user: User;
  assets: Asset[];
  posts: FeedPost[];
}) {
  const { t, locale } = await getI18n();
  const stats = user.stats ?? {
    assets: 0,
    entries: 0,
    posts: 0,
    followers: 0,
    following: 0,
  };

  return (
    <main className="page">
      <header className="profile-head">
        <span className="profile-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} />
          ) : (
            initials(user.displayName, locale)
          )}
        </span>
        <div className="profile-copy">
          <span className="eyebrow">
            {user.isSelf ? t('Senin hafızan') : t('Bir başka hafıza')}
          </span>
          <h1>{user.displayName}</h1>
          <p className="profile-handle">
            @{user.username}
            {user.createdAt ? (
              <span> · {t('{date}’den beri', { date: formatDate(user.createdAt, locale) })}</span>
            ) : null}
          </p>
          {user.bio ? <p className="profile-bio">{user.bio}</p> : null}
          {user.interests && user.interests.length > 0 ? (
            <div className="profile-interests">
              {user.interests.map((interest) => (
                <span key={interest} className="chip">
                  {interest}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="profile-actions">
          {user.isSelf ? (
            <>
              <Link href="/varliklar/yeni" className="btn btn-primary">
                <Icon name="plus" size={17} />
                {t('Yeni varlık')}
              </Link>
              <Link href="/arsiv" className="btn btn-ghost">
                <Icon name="archive" size={16} />
                {t('Arşivim')}
              </Link>
            </>
          ) : user.isFollowing !== undefined ? (
            <FollowButton username={user.username} initial={user.isFollowing} />
          ) : null}
        </div>
      </header>

      <section className="profile-stats" aria-label={t('Profil özeti')}>
        <div>
          <strong>{formatNumber(stats.assets, locale)}</strong>
          <span>{t('Varlık')}</span>
        </div>
        <div>
          <strong>{formatNumber(stats.entries, locale)}</strong>
          <span>{t('Hafıza kaydı')}</span>
        </div>
        <div>
          <strong>{formatNumber(stats.posts, locale)}</strong>
          <span>{t('Gönderi')}</span>
        </div>
        <div>
          <strong>{formatNumber(stats.followers, locale)}</strong>
          <span>{t('Takipçi')}</span>
        </div>
        <div>
          <strong>{formatNumber(stats.following, locale)}</strong>
          <span>{t('Takip edilen')}</span>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">
              {user.isSelf ? t('Senin izlerin') : t('Herkese açık izler')}
            </span>
            <h2>{user.isSelf ? t('Varlıkların') : t('Varlıkları')}</h2>
          </div>
          <Link href="/varliklar" className="text-link">
            {t('Tümü')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        {assets.length > 0 ? (
          <AssetGrid assets={assets} />
        ) : (
          <EmptyState
            title={user.isSelf ? t('Hafızan henüz boş') : t('Herkese açık bir varlık yok')}
            body={
              user.isSelf
                ? t('İlk varlığını ekleyerek hafızanı başlat.')
                : t('Bu kişi henüz bir varlığını herkese açmamış.')
            }
            {...(user.isSelf
              ? { action: { href: '/varliklar/yeni', label: t('İlk varlığı ekle') } }
              : {})}
          />
        )}
      </section>

      {posts.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Paylaşımlar')}</span>
              <h2>{t('Hafızadan notlar')}</h2>
            </div>
          </div>
          <div className="profile-feed">
            {posts.slice(0, 6).map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
