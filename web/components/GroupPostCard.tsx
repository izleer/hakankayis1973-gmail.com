'use client';

import Link from 'next/link';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { entryTypeLabels, formatDate, formatDateTime, initials, mediaSrc } from '@/lib/format';
import type { FeedPost, PostComment, User } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

export function GroupPostCard({
  post,
  groupSlug,
  viewer,
  canModerate,
  onDeleted,
}: {
  post: FeedPost;
  groupSlug: string;
  viewer: User;
  canModerate: boolean;
  onDeleted: (postId: string) => void;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceHref = post.asset
    ? `/gruplar/${groupSlug}/varliklar/${post.asset.id}`
    : null;
  const image = post.media.find((item) => item.kind === 'image');
  const document = post.media.find((item) => item.kind === 'document');
  const canDelete = post.author.id === viewer.id || canModerate || viewer.role === 'admin';

  async function toggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    try {
      const data = next
        ? await vh.post<{ liked: boolean; likeCount: number }>(`posts/${post.id}/like`)
        : await vh.delete<{ liked: boolean; likeCount: number }>(`posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
      setError('Beğeni kaydedilemedi.');
    } finally {
      setLikeBusy(false);
    }
  }

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !commentsLoaded) {
      try {
        const data = await vh.get<{ items: PostComment[] }>(`posts/${post.id}/comments`);
        setComments(data.items);
        setCommentsLoaded(true);
      } catch {
        setError('Yorumlar yüklenemedi.');
      }
    }
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body || commentBusy) return;
    setCommentBusy(true);
    setError(null);
    try {
      const data = await vh.post<{ comment: PostComment }>(`posts/${post.id}/comments`, {
        body,
      });
      setComments((current) => [...current, data.comment]);
      setCommentCount((count) => count + 1);
      setCommentBody('');
      setCommentsLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Yorum eklenemedi.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function deleteComment(comment: PostComment) {
    if (!window.confirm('Bu yorum silinsin mi?')) return;
    try {
      await vh.delete(`comments/${comment.id}`);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setCommentCount((count) => Math.max(0, count - 1));
    } catch {
      setError('Yorum silinemedi.');
    }
  }

  async function deletePost() {
    if (!window.confirm('Bu gönderi gruptan kaldırılsın mı?')) return;
    try {
      await vh.delete(`posts/${post.id}`);
      onDeleted(post.id);
    } catch {
      setError('Gönderi silinemedi.');
    }
  }

  async function reportPost() {
    const reason = window.prompt('Bildirim nedeni (örn. saygısız dil, reklam):');
    if (!reason || reason.trim().length < 3) return;
    try {
      await vh.post('reports', {
        targetType: 'post',
        targetId: post.id,
        reason: reason.trim(),
      });
      window.alert('Bildiriminiz yöneticilere iletildi.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bildirim gönderilemedi.');
    }
  }

  return (
    <article className="feed-card group-post">
      <header className="feed-head">
        <Link href={`/profil/${post.author.username}`} className="feed-author">
          <span className="avatar">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt="" />
            ) : (
              initials(post.author.displayName)
            )}
          </span>
          <span>
            <strong>{post.author.displayName}</strong>
            <small>
              @{post.author.username} · {formatDate(post.createdAt)}
            </small>
          </span>
        </Link>
        {post.asset ? (
          <Link href={sourceHref ?? '#'} className="feed-asset-chip">
            <Icon name="leaf" size={13} />
            {post.asset.title}
          </Link>
        ) : null}
      </header>

      {post.body ? <p className="feed-body">{post.body}</p> : null}

      {image ? (
        sourceHref ? (
          <Link href={sourceHref} className="feed-media">
            <MediaImage src={mediaSrc(image.url)} alt={post.asset?.title ?? ''} />
          </Link>
        ) : (
          <span className="feed-media">
            <MediaImage src={mediaSrc(image.url)} alt="" />
          </span>
        )
      ) : null}

      {document ? (
        <a
          className="feed-doc"
          href={mediaSrc(document.url) ?? '#'}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="file" size={16} />
          {document.originalName ?? 'Belge'}
        </a>
      ) : null}

      {post.entry || post.asset ? (
        <Link href={sourceHref ?? '#'} className="feed-source">
          <span>
            <Icon name="book" size={14} />
            {post.entry
              ? `${entryTypeLabels[post.entry.type]} · ${post.entry.title ?? 'İsimsiz kayıt'}`
              : 'Varlık hafızası'}
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
          disabled={likeBusy}
          aria-pressed={liked}
        >
          <Icon name="heart" size={17} />
          {likeCount > 0 ? likeCount : 'Beğen'}
        </button>
        <button
          type="button"
          className={`feed-action${commentsOpen ? ' is-liked' : ''}`}
          onClick={toggleComments}
          aria-expanded={commentsOpen}
        >
          <Icon name="message" size={17} />
          {commentCount > 0 ? commentCount : 'Yorum'}
        </button>
        <span className="feed-community">
          <Icon name="users" size={14} />
          Grup akışı
        </span>
        <span className="post-menu">
          {post.author.id !== viewer.id ? (
            <button type="button" className="post-menu-btn" onClick={reportPost}>
              Bildir
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className="post-menu-btn is-danger" onClick={deletePost}>
              Sil
            </button>
          ) : null}
        </span>
      </footer>

      {error ? <p className="form-error">{error}</p> : null}

      {commentsOpen ? (
        <div className="post-comments">
          {comments.length === 0 ? (
            <p className="muted-note">
              {commentsLoaded ? 'İlk yorumu sen bırak.' : 'Yorumlar yükleniyor…'}
            </p>
          ) : (
            <ul className="comment-list">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <span className="avatar avatar-tiny">
                    {comment.author.avatarUrl ? (
                      <img src={comment.author.avatarUrl} alt="" />
                    ) : (
                      initials(comment.author.displayName)
                    )}
                  </span>
                  <span className="comment-body">
                    <strong>{comment.author.displayName}</strong>
                    <span>{comment.body}</span>
                    <small>{formatDateTime(comment.createdAt)}</small>
                  </span>
                  {comment.author.id === viewer.id || canModerate ? (
                    <button
                      type="button"
                      className="icon-btn comment-delete"
                      onClick={() => deleteComment(comment)}
                      aria-label="Yorumu sil"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <form className="comment-form" onSubmit={addComment}>
            <input
              className="input"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Bir yorum bırak…"
              maxLength={1000}
              aria-label="Yorum"
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={commentBusy || commentBody.trim().length === 0}
            >
              <Icon name="send" size={15} />
              Gönder
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
