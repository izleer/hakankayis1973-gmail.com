'use client';

import Link from 'next/link';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { entryTypeLabels, formatDate, initials, mediaSrc } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import type { FeedPost } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

export function FeedCard({ post }: { post: FeedPost }) {
  const { t, locale } = useI18n();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [busy, setBusy] = useState(false);

  const image = post.media.find((item) => item.kind === 'image');
  const document = post.media.find((item) => item.kind === 'document');

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => count + (next ? 1 : -1));
    try {
      const data = next
        ? await vh.post<{ liked: boolean; likeCount: number }>(`posts/${post.id}/like`)
        : await vh.delete<{ liked: boolean; likeCount: number }>(`posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((count) => count + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="feed-card">
      <header className="feed-head">
        <Link href={`/profil/${post.author.username}`} className="feed-author">
          <span className="avatar">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt="" />
            ) : (
              initials(post.author.displayName, locale)
            )}
          </span>
          <span>
            <strong>{post.author.displayName}</strong>
            <small>
              @{post.author.username} · {formatDate(post.createdAt, locale)}
            </small>
          </span>
        </Link>
        {post.asset ? (
          <Link href={`/varliklar/${post.asset.id}`} className="feed-asset-chip">
            <Icon name="leaf" size={13} />
            {post.asset.title}
          </Link>
        ) : null}
      </header>

      <p className="feed-body">{post.body}</p>

      {image ? (
        <Link href={post.asset ? `/varliklar/${post.asset.id}` : '#'} className="feed-media">
          <MediaImage src={mediaSrc(image.url)} alt={post.asset?.title ?? ''} />
        </Link>
      ) : null}

      {document ? (
        <a
          className="feed-doc"
          href={mediaSrc(document.url) ?? '#'}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="file" size={16} />
          {document.originalName ?? t('Belge')}
        </a>
      ) : null}

      {post.entry || post.asset ? (
        <Link href={post.asset ? `/varliklar/${post.asset.id}` : '#'} className="feed-source">
          <span>
            <Icon name="book" size={14} />
            {post.entry
              ? `${t(entryTypeLabels[post.entry.type])} · ${post.entry.title ?? t('İsimsiz kayıt')}`
              : t('Varlık hafızası')}
          </span>
          {post.asset?.typeLabel ? (
            <span className="feed-source-type">
              <Icon name="leaf" size={13} />
              {post.asset.typeLabel}
            </span>
          ) : null}
          <Icon name="arrow-right" size={15} />
        </Link>
      ) : null}

      <footer className="feed-foot">
        <button
          type="button"
          className={`feed-action${liked ? ' is-liked' : ''}`}
          onClick={toggleLike}
          disabled={busy}
          aria-pressed={liked}
        >
          <Icon name="heart" size={17} />
          {likeCount > 0 ? likeCount : t('Beğen')}
        </button>
        <Link href={post.asset ? `/varliklar/${post.asset.id}` : '#'} className="feed-action">
          <Icon name="message" size={17} />
          {post.commentCount > 0 ? post.commentCount : t('Yorum')}
        </Link>
        {post.community ? (
          <span className="feed-community">
            <Icon name="users" size={14} />
            {post.community.name}
          </span>
        ) : (
          <span className="feed-community">
            <Icon name="eye" size={14} />
            {t('Herkese açık')}
          </span>
        )}
      </footer>
    </article>
  );
}
