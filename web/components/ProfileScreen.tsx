import Link from 'next/link';
import { AssetGrid } from './AssetCard';
import { EmptyState } from './EmptyState';
import { FeedCard } from './FeedCard';
import { FollowButton } from './FollowButton';
import { Icon } from './Icons';
import { formatDate, formatNumber, initials } from '@/lib/format';
import type { Asset, FeedPost, User } from '@/lib/types';

export function ProfileScreen({
  user,
  assets,
  posts,
}: {
  user: User;
  assets: Asset[];
  posts: FeedPost[];
}) {
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
          {user.avatarUrl ? <img src={user.avatarUrl} alt={user.displayName} /> : initials(user.displayName)}
        </span>
        <div className="profile-copy">
          <span className="eyebrow">{user.isSelf ? 'Senin hafızan' : 'Bir başka hafıza'}</span>
          <h1>{user.displayName}</h1>
          <p className="profile-handle">
            @{user.username}
            {user.createdAt ? <span> · {formatDate(user.createdAt)}’den beri</span> : null}
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
                Yeni varlık
              </Link>
              <Link href="/arsiv" className="btn btn-ghost">
                <Icon name="archive" size={16} />
                Arşivim
              </Link>
            </>
          ) : user.isFollowing !== undefined ? (
            <FollowButton username={user.username} initial={user.isFollowing} />
          ) : null}
        </div>
      </header>

      <section className="profile-stats" aria-label="Profil özeti">
        <div>
          <strong>{formatNumber(stats.assets)}</strong>
          <span>Varlık</span>
        </div>
        <div>
          <strong>{formatNumber(stats.entries)}</strong>
          <span>Hafıza kaydı</span>
        </div>
        <div>
          <strong>{formatNumber(stats.posts)}</strong>
          <span>Paylaşım</span>
        </div>
        <div>
          <strong>{formatNumber(stats.followers)}</strong>
          <span>Takipçi</span>
        </div>
        <div>
          <strong>{formatNumber(stats.following)}</strong>
          <span>Takip edilen</span>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{user.isSelf ? 'Senin izlerin' : 'Herkese açık izler'}</span>
            <h2>{user.isSelf ? 'Varlıkların' : 'Varlıkları'}</h2>
          </div>
          <Link href="/varliklar" className="text-link">
            Tümü
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        {assets.length > 0 ? (
          <AssetGrid assets={assets} />
        ) : (
          <EmptyState
            title={user.isSelf ? 'Hafızan henüz boş' : 'Herkese açık bir varlık yok'}
            body={
              user.isSelf
                ? 'İlk varlığını ekleyerek hafızanı başlat.'
                : 'Bu kişi henüz bir varlığını herkese açmamış.'
            }
            {...(user.isSelf
              ? { action: { href: '/varliklar/yeni', label: 'İlk varlığı ekle' } }
              : {})}
          />
        )}
      </section>

      {posts.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Paylaşımlar</span>
              <h2>Hafızadan notlar</h2>
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
