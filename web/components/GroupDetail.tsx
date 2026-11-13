'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadMedia, vh } from '@/lib/client';
import {
  entryTypeLabels,
  formatDate,
  formatNumber,
  initials,
  mediaSrc,
} from '@/lib/format';
import { useI18n, useT } from '@/lib/i18n/client';
import type {
  Asset,
  CommunityRole,
  CursorPage,
  FeedPost,
  Group,
  GroupAsset,
  GroupAssetDetail,
  GroupAssetScope,
  GroupDetailData,
  GroupJoinPolicy,
  GroupMember,
  GroupRequests,
  User,
  UserMini,
} from '@/lib/types';
import { EmptyState } from './EmptyState';
import { GroupPostCard } from './GroupPostCard';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

const roleLabels: Record<CommunityRole, string> = {
  owner: 'Kurucu',
  admin: 'Yönetici',
  moderator: 'Moderatör',
  member: 'Üye',
};

const scopeLabels: Record<GroupAssetScope, string> = {
  summary: 'Yalnızca özet',
  timeline: 'Herkese açık kayıtlar',
  all: 'Tüm hikâye',
};

const scopeHints: Record<GroupAssetScope, string> = {
  summary: 'Kapak, ad ve temel bilgiler görünür; kayıtlar görünmez.',
  timeline: 'Herkese açık işaretlediğin kayıtlar gruba açılır.',
  all: 'Özel kayıtlar dahil varlığın bütün hikâyesi grup üyelerine açılır.',
};

const categories = [
  'Bitkiler',
  'Klasik araçlar',
  'Ev & mekân',
  'Evcil hayvanlar',
  'Sanat & koleksiyon',
  'Bisiklet',
  'El işi',
  'Diğer',
];

export type Tab = 'feed' | 'assets' | 'members' | 'manage';

export function GroupDetail({
  data,
  initialPosts,
  initialAssets,
  initialRequests,
  myAssets,
  viewer,
  initialTab = 'feed',
}: {
  data: GroupDetailData;
  initialPosts: FeedPost[];
  initialAssets: GroupAsset[];
  initialRequests: GroupRequests | null;
  myAssets: Asset[];
  viewer: User;
  initialTab?: Tab;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [group, setGroup] = useState<Group>(data.community);
  const [members, setMembers] = useState<GroupMember[]>(data.members);
  const [assets, setAssets] = useState<GroupAsset[]>(initialAssets);
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [requests, setRequests] = useState<GroupRequests | null>(initialRequests);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [composerOpen, setComposerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const role = group.role;
  const isMember = group.membershipStatus === 'active';
  const isPending = group.membershipStatus === 'pending';
  const isOwner = group.owner?.id === viewer.id || role === 'owner';

  // Grubu açmak, panel özetindeki okunmamış sayaçlarını sıfırlar.
  useEffect(() => {
    if (!isMember) return;
    vh.post(`communities/${encodeURIComponent(group.slug)}/seen`).catch(() => {});
  }, [group.slug, isMember]);
  const canManage =
    isOwner || role === 'admin' || role === 'moderator' || viewer.role === 'admin';
  const canChangeRoles = isOwner || role === 'admin' || viewer.role === 'admin';

  const sharedByMe = useMemo(
    () => new Set(assets.filter((item) => item.owner.id === viewer.id).map((item) => item.id)),
    [assets, viewer.id],
  );

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }

  async function loadFeed() {
    const feed = await vh.get<CursorPage<FeedPost>>(
      `feed?community=${encodeURIComponent(group.slug)}&limit=30`,
    );
    setPosts(feed.items);
  }

  async function loadAssets() {
    const result = await vh.get<{ items: GroupAsset[] }>(
      `communities/${encodeURIComponent(group.slug)}/assets`,
    );
    setAssets(result.items);
    setGroup((current) => ({ ...current, assetCount: result.items.length }));
  }

  async function loadRequests() {
    const result = await vh.get<GroupRequests>(
      `communities/${encodeURIComponent(group.slug)}/requests`,
    );
    setRequests(result);
  }

  async function join() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await vh.post<{ joined: boolean; pending: boolean }>(
        `communities/${encodeURIComponent(group.slug)}/join`,
      );
      if (result.joined) {
        setGroup((current) => ({
          ...current,
          role: 'member',
          membershipStatus: 'active',
          memberCount: current.memberCount + 1,
        }));
        setMembers((current) => [
          ...current,
          { user: viewer, role: 'member', joinedAt: new Date().toISOString() },
        ]);
        await Promise.all([loadFeed(), loadAssets()]);
        flash(t('Gruba katıldın. Artık akışı görebilirsin.'));
      } else if (result.pending) {
        setGroup((current) => ({
          ...current,
          membershipStatus: 'pending',
        }));
        flash(t('Katılım isteğin gönderildi. Yönetici onayı bekleniyor.'));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Gruba katılınamadı.'));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!window.confirm(t('Bu gruptan ayrılmak istiyor musun? Varlıkların sende kalır.'))) return;
    setBusy(true);
    setError(null);
    try {
      await vh.delete(`communities/${encodeURIComponent(group.slug)}/join`);
      setGroup((current) => ({
        ...current,
        role: null,
        membershipStatus: null,
        memberCount: Math.max(0, current.memberCount - 1),
      }));
      setMembers((current) => current.filter((item) => item.user.id !== viewer.id));
      setPosts([]);
      setAssets([]);
      setTab('feed');
      router.refresh();
      flash(t('Gruptan ayrıldın. Varlıkların ve kişisel geçmişin yerinde.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Gruptan ayrılınamadı.'));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, nextRole: 'member' | 'moderator' | 'admin') {
    setError(null);
    try {
      await vh.patch(`communities/${encodeURIComponent(group.slug)}/members/${userId}`, {
        role: nextRole,
      });
      setMembers((current) =>
        current.map((member) =>
          member.user.id === userId ? { ...member, role: nextRole } : member,
        ),
      );
      flash(t('Üye rolü güncellendi.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Rol değiştirilemedi.'));
    }
  }

  async function removeMember(member: GroupMember) {
    if (!window.confirm(t('{name} gruptan çıkarılsın mı?', { name: member.user.displayName })))
      return;
    setError(null);
    try {
      await vh.delete(
        `communities/${encodeURIComponent(group.slug)}/members/${member.user.id}`,
      );
      setMembers((current) => current.filter((item) => item.user.id !== member.user.id));
      setGroup((current) => ({
        ...current,
        memberCount: Math.max(0, current.memberCount - 1),
      }));
      flash(t('Üye gruptan çıkarıldı.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Üye çıkarılamadı.'));
    }
  }

  async function approveRequest(user: UserMini) {
    setError(null);
    try {
      await vh.post(
        `communities/${encodeURIComponent(group.slug)}/requests/${user.id}/approve`,
      );
      setRequests((current) =>
        current
          ? { ...current, requests: current.requests.filter((item) => item.user.id !== user.id) }
          : current,
      );
      setGroup((current) => ({ ...current, memberCount: current.memberCount + 1 }));
      setMembers((current) => [
        ...current,
        { user, role: 'member', joinedAt: new Date().toISOString() },
      ]);
      flash(t('Katılım isteği onaylandı.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('İstek onaylanamadı.'));
    }
  }

  async function rejectRequest(user: UserMini) {
    setError(null);
    try {
      await vh.delete(
        `communities/${encodeURIComponent(group.slug)}/requests/${user.id}`,
      );
      setRequests((current) =>
        current
          ? { ...current, requests: current.requests.filter((item) => item.user.id !== user.id) }
          : current,
      );
      flash(t('Katılım isteği reddedildi.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('İstek reddedilemedi.'));
    }
  }

  async function removeShare(asset: GroupAsset) {
    if (
      !window.confirm(
        t('{title} bu grupla paylaşımından kaldırılsın mı?', { title: asset.title }),
      )
    )
      return;
    setError(null);
    try {
      await vh.delete(
        `communities/${encodeURIComponent(group.slug)}/assets/${asset.id}`,
      );
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setGroup((current) => ({
        ...current,
        assetCount: Math.max(0, current.assetCount - 1),
      }));
      flash(t('Varlık grubun listesinden kaldırıldı.'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Paylaşım kaldırılamadı.'));
    }
  }

  async function changeScope(asset: GroupAsset, scope: GroupAssetScope) {
    if (scope === 'all' && asset.scope !== 'all') {
      const approved = window.confirm(
        t('Özel kayıtlar dahil varlığın bütün hikâyesi grup üyelerine açılacak. Onaylıyor musun?'),
      );
      if (!approved) return false;
    }
    setError(null);
    try {
      await vh.patch(
        `communities/${encodeURIComponent(group.slug)}/assets/${asset.id}`,
        { scope },
      );
      setAssets((current) =>
        current.map((item) => (item.id === asset.id ? { ...item, scope } : item)),
      );
      flash(t('Paylaşım kapsamı güncellendi.'));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Kapsam güncellenemedi.'));
      return false;
    }
  }

  const pendingCount = requests?.requests.length ?? 0;

  return (
    <main className="page page-group">
      <Link href="/gruplar" className="back-link">
        <Icon name="arrow-left" size={16} />
        {t('Gruplar')}
      </Link>

      <header className="group-hero">
        <div className="group-hero-cover">
          <MediaImage src={group.coverUrl} alt={group.name} fallbackIcon="users" loading="eager" />
          <span className={`visibility-pill is-${group.visibility === 'private' ? 'private' : 'public'}`}>
            <Icon name={group.visibility === 'private' ? 'lock' : 'eye'} size={13} />
            {group.visibility === 'private' ? t('Özel grup') : t('Herkese açık')}
          </span>
        </div>

        <div className="group-hero-info">
          <div className="detail-kicker">
            {group.category ? <span className="group-category">{t(group.category)}</span> : null}
            <span className="status-pill">
              {group.joinPolicy === 'approval' ? t('Onaylı katılım') : t('Serbest katılım')}
            </span>
            {isPending ? <span className="status-pill is-pending">{t('Onay bekliyor')}</span> : null}
          </div>
          <h1>{group.name}</h1>
          {group.description ? <p className="detail-description">{group.description}</p> : null}

          <div className="group-stats">
            <span>
              <strong>{formatNumber(group.memberCount, locale)}</strong>{' '}
              {t('üye', { count: group.memberCount })}
            </span>
            <span>
              <strong>{formatNumber(group.postCount, locale)}</strong>{' '}
              {t('gönderi', { count: group.postCount })}
            </span>
            <span>
              <strong>{formatNumber(group.assetCount, locale)}</strong>{' '}
              {t('varlık', { count: group.assetCount })}
            </span>
            {group.owner ? (
              <span className="group-owner">
                <span className="avatar avatar-tiny">
                  {group.owner.avatarUrl ? (
                    <img src={group.owner.avatarUrl} alt="" />
                  ) : (
                    initials(group.owner.displayName, locale)
                  )}
                </span>
                {t('Kurucu: {name}', { name: group.owner.displayName })}
              </span>
            ) : null}
          </div>

          <div className="detail-actions">
            {!isMember && !isPending ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={join}
                disabled={busy || (group.visibility === 'private' && !canManage)}
              >
                <Icon name="users" size={17} />
                {group.visibility === 'private'
                  ? t('Davet gerekli')
                  : group.joinPolicy === 'approval'
                    ? t('Katılım isteği gönder')
                    : t('Gruba katıl')}
              </button>
            ) : null}
            {isPending ? (
              <span className="shared-note">
                <Icon name="clock" size={16} />
                {t('Katılım isteğin yönetici onayında')}
              </span>
            ) : null}
            {isMember && !isOwner ? (
              <button type="button" className="btn btn-ghost" onClick={leave} disabled={busy}>
                <Icon name="logout" size={16} />
                {t('Ayrıl')}
              </button>
            ) : null}
            {canManage ? (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setInviteOpen(true)}>
                  <Icon name="user" size={16} />
                  {t('Davet et')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)}>
                  <Icon name="edit" size={16} />
                  {t('Grubu düzenle')}
                </button>
              </>
            ) : null}
            {isMember ? (
              <button type="button" className="btn btn-ghost" onClick={() => setShareOpen(true)}>
                <Icon name="leaf" size={16} />
                {t('Varlık ekle')}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {notice ? (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          {notice}
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}

      <nav className="tabs" aria-label={t('Grup bölümleri')}>
        <button
          type="button"
          className={tab === 'feed' ? 'is-active' : ''}
          onClick={() => setTab('feed')}
        >
          {t('Akış')} <span>{posts.length}</span>
        </button>
        <button
          type="button"
          className={tab === 'assets' ? 'is-active' : ''}
          onClick={() => setTab('assets')}
        >
          {t('Varlıklar')} <span>{assets.length}</span>
        </button>
        <button
          type="button"
          className={tab === 'members' ? 'is-active' : ''}
          onClick={() => setTab('members')}
        >
          {t('Üyeler')} <span>{members.length}</span>
        </button>
        {canManage ? (
          <button
            type="button"
            className={tab === 'manage' ? 'is-active' : ''}
            onClick={() => setTab('manage')}
          >
            {t('Yönetim')} <span>{pendingCount}</span>
          </button>
        ) : null}
      </nav>

      {!isMember ? (
        <section className="group-locked">
          <span className="group-locked-icon">
            <Icon name={isPending ? 'clock' : 'lock'} size={26} />
          </span>
          <h2>{isPending ? t('Onay bekleniyor') : t('Grup içeriği üyelere açık')}</h2>
          <p>
            {isPending
              ? t('Katılım isteğin yöneticiye iletildi. Onaylandığında akış ve paylaşılan varlıklar burada görünecek.')
              : group.visibility === 'private'
                ? t('Bu özel gruba katılmak için bir üyeden davet alman gerekiyor.')
                : t('Katıldığında grup akışını, paylaşılan varlıkları ve üyeleri görebilirsin.')}
          </p>
          {group.rules ? (
            <div className="group-rules">
              <span className="eyebrow">{t('Grup kuralları')}</span>
              <p>{group.rules}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {isMember && tab === 'feed' ? (
        <section className="group-feed-layout">
          <div className="feed-column">
            <button
              type="button"
              className="composer-prompt"
              onClick={() => setComposerOpen(true)}
            >
              <span className="composer-prompt-icon">
                <Icon name="plus" size={18} />
              </span>
              <span>
                <strong>{t('Gruba bir iz bırak')}</strong>
                <small>{t('Bir not, fotoğraf ya da paylaştığın bir varlığın kaydı.')}</small>
              </span>
              <Icon name="arrow-right" size={18} />
            </button>

            {posts.length > 0 ? (
              posts.map((post) => (
                <GroupPostCard
                  key={post.id}
                  post={post}
                  groupSlug={group.slug}
                  viewer={viewer}
                  canModerate={canManage}
                  onDeleted={(postId) => {
                    setPosts((current) => current.filter((item) => item.id !== postId));
                    setGroup((current) => ({
                      ...current,
                      postCount: Math.max(0, current.postCount - 1),
                    }));
                  }}
                />
              ))
            ) : (
              <EmptyState
                icon="book"
                title={t('Akış henüz sessiz')}
                body={t('Grubun ilk gönderisini sen başlatabilirsin.')}
              />
            )}
          </div>

          <aside className="group-side">
            {group.rules ? (
              <section className="aside-card">
                <span className="eyebrow">{t('Grup kuralları')}</span>
                <p className="group-rules-text">{group.rules}</p>
              </section>
            ) : null}
            <section className="aside-card">
              <div className="aside-head">
                <div>
                  <span className="eyebrow">{t('Paylaşım')}</span>
                  <h2>{t('Görünürlük')}</h2>
                </div>
              </div>
              <p className="muted-note">
                {t('Gruba eklediğin varlıklarda hangi kapsamın görüneceğini sen seçersin. Kişisel notların ve paylaşmadığın kayıtlar grupta görünmez.')}
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShareOpen(true)}
              >
                <Icon name="leaf" size={15} />
                {t('Varlık paylaş')}
              </button>
            </section>
            <section className="aside-card">
              <div className="aside-head">
                <div>
                  <span className="eyebrow">{t('Üyeler')}</span>
                  <h2>{t('Topluluk')}</h2>
                </div>
                <button type="button" className="aside-count" onClick={() => setTab('members')}>
                  {members.length}
                </button>
              </div>
              <div className="people-list">
                {members.slice(0, 5).map((member) => (
                  <div key={member.user.id} className="person-row">
                    <Link href={`/profil/${member.user.username}`} className="person-link">
                      <span className="avatar avatar-small">
                        {member.user.avatarUrl ? (
                          <img src={member.user.avatarUrl} alt="" />
                        ) : (
                          initials(member.user.displayName, locale)
                        )}
                      </span>
                      <span>
                        <strong>{member.user.displayName}</strong>
                        <small>{t(roleLabels[member.role])}</small>
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      ) : null}

      {isMember && tab === 'assets' ? (
        <section className="group-assets">
          <div className="group-assets-head">
            <div>
              <span className="eyebrow">{t('Paylaşılan hafıza')}</span>
              <h2>{t('Gruptaki varlıklar')}</h2>
              <p className="muted-note">
                {t('Her varlık yalnızca sahibinin izin verdiği kapsamda görünür.')}
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setShareOpen(true)}>
              <Icon name="plus" size={17} />
              {t('Varlık ekle')}
            </button>
          </div>

          {assets.length === 0 ? (
            <EmptyState
              icon="leaf"
              title={t('Henüz paylaşılan varlık yok')}
              body={t('Kendi varlıklarından birini gruba ekleyerek başla.')}
            />
          ) : (
            <div className="group-asset-grid">
              {assets.map((asset) => (
                <article className="group-asset-card" key={asset.shareId ?? asset.id}>
                  <Link
                    href={`/gruplar/${group.slug}/varliklar/${asset.id}`}
                    className="group-asset-cover"
                  >
                    <MediaImage src={asset.coverUrl} alt={asset.title} fallbackIcon="leaf" />
                    <span className="group-asset-scope">
                      {asset.managed ? t('Ortak yönetim') : t(scopeLabels[asset.scope])}
                    </span>
                  </Link>
                  <div className="group-asset-body">
                    <span className="eyebrow">{asset.type.label}</span>
                    <Link href={`/gruplar/${group.slug}/varliklar/${asset.id}`}>
                      <strong>{asset.title}</strong>
                    </Link>
                    <small>
                      {asset.owner.id === viewer.id ? t('Senin varlığın') : asset.owner.displayName} ·{' '}
                      {formatDate(asset.sharedAt, locale)}
                    </small>
                    <div className="group-asset-actions">
                      {asset.managed ? (
                        <Link href={`/varliklar/${asset.id}`} className="btn btn-ghost btn-sm">
                          <Icon name="edit" size={14} />
                          {t('Varlığı yönet')}
                        </Link>
                      ) : null}
                      {!asset.managed && asset.owner.id === viewer.id ? (
                        <label className="inline-select">
                          <span>{t('Kapsam')}</span>
                          <select
                            value={asset.scope}
                            onChange={async (event) => {
                              const next = event.target.value as GroupAssetScope;
                              const applied = await changeScope(asset, next);
                              if (!applied) event.target.value = asset.scope;
                            }}
                          >
                            <option value="summary">{t('Özet')}</option>
                            <option value="timeline">{t('Herkese açık kayıtlar')}</option>
                            <option value="all">{t('Tüm hikâye')}</option>
                          </select>
                        </label>
                      ) : null}
                      {!asset.managed && (asset.owner.id === viewer.id || canManage) ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeShare(asset)}
                        >
                          <Icon name="trash" size={14} />
                          {t('Kaldır')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {isMember && tab === 'members' ? (
        <section className="group-members">
          <div className="group-assets-head">
            <div>
              <span className="eyebrow">{t('Topluluk')}</span>
              <h2>{t('Üyeler')}</h2>
              <p className="muted-note">
                {t('Grup yöneticileri üyeleri ve rolleri yönetir; varlık sahipliği değişmez.')}
              </p>
            </div>
            {canManage ? (
              <button type="button" className="btn btn-ghost" onClick={() => setInviteOpen(true)}>
                <Icon name="user" size={16} />
                {t('Davet et')}
              </button>
            ) : null}
          </div>
          <div className="member-list">
            {members.map((member) => (
              <div className="member-row" key={member.user.id}>
                <Link href={`/profil/${member.user.username}`} className="person-link">
                  <span className="avatar avatar-small">
                    {member.user.avatarUrl ? (
                      <img src={member.user.avatarUrl} alt="" />
                    ) : (
                      initials(member.user.displayName, locale)
                    )}
                  </span>
                  <span>
                    <strong>{member.user.displayName}</strong>
                    <small>
                      @{member.user.username} · {formatDate(member.joinedAt, locale)}
                    </small>
                  </span>
                </Link>
                <span className={`member-role is-${member.role}`}>
                  {t(roleLabels[member.role])}
                </span>
                {canChangeRoles &&
                member.role !== 'owner' &&
                member.user.id !== viewer.id &&
                !(member.role === 'admin' && !isOwner && viewer.role !== 'admin') ? (
                  <span className="member-actions">
                    <select
                      className="select select-sm"
                      value={member.role}
                      onChange={(event) =>
                        changeRole(
                          member.user.id,
                          event.target.value as 'member' | 'moderator' | 'admin',
                        )
                      }
                      aria-label={t('{name} rolü', { name: member.user.displayName })}
                    >
                      <option value="member">{t('Üye')}</option>
                      <option value="moderator">{t('Moderatör')}</option>
                      {isOwner || viewer.role === 'admin' ? (
                        <option value="admin">{t('Yönetici')}</option>
                      ) : null}
                    </select>
                    {canManage ? (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeMember(member)}
                        aria-label={t('{name} grubundan çıkar', { name: member.user.displayName })}
                        title={t('Gruptan çıkar')}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canManage && tab === 'manage' ? (
        <section className="group-manage">
          <div className="manage-grid">
            <article className="aside-card">
              <div className="aside-head">
                <div>
                  <span className="eyebrow">{t('Katılım')}</span>
                  <h2>{t('Bekleyen istekler')}</h2>
                </div>
                <span className="aside-count">{requests?.requests.length ?? 0}</span>
              </div>
              {requests && requests.requests.length > 0 ? (
                <div className="request-list">
                  {requests.requests.map((request) => (
                    <div className="request-row" key={request.user.id}>
                      <span className="avatar avatar-small">
                        {request.user.avatarUrl ? (
                          <img src={request.user.avatarUrl} alt="" />
                        ) : (
                          initials(request.user.displayName, locale)
                        )}
                      </span>
                      <span className="request-text">
                        <strong>{request.user.displayName}</strong>
                        <small>@{request.user.username}</small>
                      </span>
                      <span className="request-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => approveRequest(request.user)}
                        >
                          {t('Onayla')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => rejectRequest(request.user)}
                        >
                          {t('Reddet')}
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-note">{t('Bekleyen katılım isteği yok.')}</p>
              )}
            </article>

            <article className="aside-card">
              <div className="aside-head">
                <div>
                  <span className="eyebrow">{t('Davetler')}</span>
                  <h2>{t('Bekleyen davetler')}</h2>
                </div>
                <span className="aside-count">{requests?.invitations.length ?? 0}</span>
              </div>
              {requests && requests.invitations.length > 0 ? (
                <div className="request-list">
                  {requests.invitations.map((invitation) => (
                    <div className="request-row" key={invitation.id}>
                      <span className="avatar avatar-small">
                        {invitation.invitee.avatarUrl ? (
                          <img src={invitation.invitee.avatarUrl} alt="" />
                        ) : (
                          initials(invitation.invitee.displayName, locale)
                        )}
                      </span>
                      <span className="request-text">
                        <strong>{invitation.invitee.displayName}</strong>
                        <small>@{invitation.invitee.username}</small>
                      </span>
                      <span className="member-role is-pending">{t('Davetli')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-note">{t('Bekleyen davet yok.')}</p>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setInviteOpen(true)}
              >
                <Icon name="user" size={15} />
                {t('Yeni davet')}
              </button>
            </article>

            <article className="aside-card">
              <div className="aside-head">
                <div>
                  <span className="eyebrow">{t('Grup ayarları')}</span>
                  <h2>{t('Görünürlük ve kurallar')}</h2>
                </div>
              </div>
              <dl className="manage-facts">
                <div>
                  <dt>{t('Görünürlük')}</dt>
                  <dd>{group.visibility === 'private' ? t('Özel grup') : t('Herkese açık')}</dd>
                </div>
                <div>
                  <dt>{t('Katılım')}</dt>
                  <dd>{group.joinPolicy === 'approval' ? t('Yönetici onayı') : t('Serbest')}</dd>
                </div>
                <div>
                  <dt>{t('Kategori')}</dt>
                  <dd>{group.category ? t(group.category) : t('Belirtilmedi')}</dd>
                </div>
              </dl>
              {group.rules ? <p className="group-rules-text">{group.rules}</p> : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditOpen(true)}>
                <Icon name="edit" size={15} />
                {t('Ayarları düzenle')}
              </button>
            </article>
          </div>
        </section>
      ) : null}

      {composerOpen && isMember ? (
        <GroupComposer
          group={group}
          viewer={viewer}
          assets={assets}
          onClose={() => setComposerOpen(false)}
          onPublished={async () => {
            setComposerOpen(false);
            setGroup((current) => ({ ...current, postCount: current.postCount + 1 }));
            await loadFeed();
            flash(t('Gönderi gruba eklendi.'));
          }}
        />
      ) : null}

      {shareOpen && isMember ? (
        <ShareAssetModal
          group={group}
          myAssets={myAssets}
          sharedIds={sharedByMe}
          existing={assets.filter((item) => item.owner.id === viewer.id)}
          onClose={() => setShareOpen(false)}
          onSaved={async () => {
            setShareOpen(false);
            await loadAssets();
            flash(t('Varlık paylaşımı güncellendi.'));
          }}
        />
      ) : null}

      {inviteOpen && canManage ? (
        <InviteModal
          group={group}
          onClose={() => setInviteOpen(false)}
          onInvited={async () => {
            setInviteOpen(false);
            await loadRequests();
            flash(t('Davet gönderildi.'));
          }}
        />
      ) : null}

      {editOpen && canManage ? (
        <EditGroupModal
          group={group}
          onClose={() => setEditOpen(false)}
          onSaved={(next) => {
            setGroup(next);
            setEditOpen(false);
            flash(t('Grup ayarları güncellendi.'));
            router.refresh();
          }}
        />
      ) : null}
    </main>
  );
}

function GroupComposer({
  group,
  viewer,
  assets,
  onClose,
  onPublished,
}: {
  group: Group;
  viewer: User;
  assets: GroupAsset[];
  onClose: () => void;
  onPublished: () => Promise<void> | void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [assetId, setAssetId] = useState('');
  const [entryId, setEntryId] = useState('');
  const [entries, setEntries] = useState<GroupAssetDetail['entries']>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownAssets = assets.filter((item) => item.owner.id === viewer.id);

  async function chooseAsset(nextId: string) {
    setAssetId(nextId);
    setEntryId('');
    setEntries([]);
    if (!nextId) return;
    setLoadingEntries(true);
    try {
      const detail = await vh.get<GroupAssetDetail>(
        `communities/${encodeURIComponent(group.slug)}/assets/${nextId}`,
      );
      setEntries(detail.entries);
    } catch {
      setError(t('Varlığın kayıtları yüklenemedi.'));
    } finally {
      setLoadingEntries(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() && files.length === 0) {
      setError(t('Bir not yaz ya da fotoğraf ekle.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await vh.post<{ post: FeedPost }>('posts', {
        body: body.trim(),
        audience: 'community',
        communityId: group.id,
        assetId: assetId || null,
        entryId: entryId || null,
      });
      for (const file of files) {
        await uploadMedia(file, { postId: result.post.id });
      }
      await onPublished();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Gönderi paylaşılamadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal group-composer" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{group.name}</span>
            <h2>{t('Gruba gönderi ekle')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span>{t('Not')}</span>
            <textarea
              className="textarea"
              rows={4}
              maxLength={3000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('Bugün ne oldu? Bir gözlem, soru ya da deneyim…')}
            />
          </label>

          {ownAssets.length > 0 ? (
            <div className="form-grid">
              <label className="field">
                <span>{t('Varlık (isteğe bağlı)')}</span>
                <select
                  className="select"
                  value={assetId}
                  onChange={(event) => chooseAsset(event.target.value)}
                >
                  <option value="">{t('Varlık seçme')}</option>
                  {ownAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} · {t(scopeLabels[asset.scope])}
                    </option>
                  ))}
                </select>
              </label>
              {assetId ? (
                <label className="field">
                  <span>{t('Kayıt')}</span>
                  <select
                    className="select"
                    value={entryId}
                    onChange={(event) => setEntryId(event.target.value)}
                    disabled={loadingEntries || entries.length === 0}
                  >
                    <option value="">
                      {loadingEntries
                        ? t('Kayıtlar yükleniyor…')
                        : entries.length === 0
                          ? t('Bu kapsamda kayıt yok')
                          : t('Kayıt seçme')}
                    </option>
                    {entries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {t(entryTypeLabels[entry.type])} · {entry.title ?? t('İsimsiz kayıt')}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}

          <label className="field">
            <span>{t('Fotoğraflar')}</span>
            <span className="composer-file-row">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="image" size={15} />
                {t('Fotoğraf seç')}
              </button>
              <small>
                {files.length > 0
                  ? t('{count} dosya seçildi', { count: files.length })
                  : t('En fazla 4 görsel')}
              </small>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  const picked = Array.from(event.target.files ?? []).slice(0, 4);
                  setFiles(picked);
                }}
              />
            </span>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {t('Vazgeç')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Icon name="send" size={16} />
              {busy ? t('Paylaşılıyor…') : t('Paylaş')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ShareAssetModal({
  group,
  myAssets,
  sharedIds,
  existing,
  onClose,
  onSaved,
}: {
  group: Group;
  myAssets: Asset[];
  sharedIds: Set<string>;
  existing: GroupAsset[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const t = useT();
  const existingMap = new Map(existing.map((item) => [item.id, item.scope]));
  const [assetId, setAssetId] = useState('');
  const [scope, setScope] = useState<GroupAssetScope>('summary');
  const [allApproved, setAllApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = myAssets.find((asset) => asset.id === assetId);

  function pick(nextId: string) {
    setAssetId(nextId);
    setScope(existingMap.get(nextId) ?? 'summary');
    setAllApproved(false);
  }

  function pickScope(value: GroupAssetScope) {
    setScope(value);
    if (value !== 'all') setAllApproved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!assetId) {
      setError(t('Bir varlık seç.'));
      return;
    }
    if (scope === 'all' && !allApproved) {
      setError(t('Tüm hikâyeyi paylaşmadan önce özel kayıtların paylaşımını onaylamalısın.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await vh.post(`communities/${encodeURIComponent(group.slug)}/assets`, {
        assetId,
        scope,
      });
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Varlık gruba eklenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{group.name}</span>
            <h2>{t('Varlık paylaş')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="modal-body">
          {myAssets.length === 0 ? (
            <>
              <p className="muted-note">
                {t('Henüz bir varlığın yok. Önce bir varlık oluştur, sonra gruba ekle.')}
              </p>
              <div className="modal-actions">
                <Link href="/varliklar/yeni" className="btn btn-primary">
                  <Icon name="plus" size={16} />
                  {t('Yeni varlık')}
                </Link>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                <span>{t('Varlık')}</span>
                <select className="select" value={assetId} onChange={(event) => pick(event.target.value)}>
                  <option value="">{t('Bir varlık seç')}</option>
                  {myAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title}
                      {sharedIds.has(asset.id) ? t(' · grupta') : ''}
                    </option>
                  ))}
                </select>
              </label>

              {selected ? (
                <div className="share-selected">
                  <span className="share-selected-cover">
                    <MediaImage src={selected.coverUrl} alt={selected.title} fallbackIcon="leaf" />
                  </span>
                  <span>
                    <strong>{selected.title}</strong>
                    <small>
                      {selected.type.label} · {selected.owner.displayName}
                    </small>
                  </span>
                </div>
              ) : null}

              <fieldset className="scope-picker">
                <legend>{t('Ne kadarını görsünler?')}</legend>
                {(Object.keys(scopeLabels) as GroupAssetScope[]).map((value) => (
                  <label key={value} className={`scope-option${scope === value ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="scope"
                      value={value}
                      checked={scope === value}
                      onChange={() => pickScope(value)}
                    />
                    <span>
                      <strong>{t(scopeLabels[value])}</strong>
                      <small>{t(scopeHints[value])}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              {scope === 'all' ? (
                <div className="scope-warning" role="alert">
                  <p>
                    <Icon name="lock" size={14} />{' '}
                    {t('Bu kapsam, özel olarak işaretlediğin kayıtları da grup üyelerine açar.')}
                  </p>
                  <label className="scope-warning-check">
                    <input
                      type="checkbox"
                      checked={allApproved}
                      onChange={(event) => setAllApproved(event.target.checked)}
                    />
                    <span>
                      {t('Özel kayıtlarımın grup üyeleriyle paylaşılmasını onaylıyorum.')}
                    </span>
                  </label>
                </div>
              ) : null}

              <p className="muted-note">
                <Icon name="lock" size={14} />{' '}
                {t('Varlık sahipliği ve düzenleme hakkı sende kalır. Paylaşımı dilediğin an kaldırabilirsin.')}
              </p>

              {error ? <p className="form-error">{error}</p> : null}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                  {t('Vazgeç')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy || !assetId || (scope === 'all' && !allApproved)}
                >
                  <Icon name="leaf" size={16} />
                  {busy
                    ? t('Ekleniyor…')
                    : sharedIds.has(assetId)
                      ? t('Paylaşımı güncelle')
                      : t('Gruba ekle')}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function InviteModal({
  group,
  onClose,
  onInvited,
}: {
  group: Group;
  onClose: () => void;
  onInvited: () => Promise<void> | void;
}) {
  const t = useT();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = username.trim().replace(/^@/, '');
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await vh.post(`communities/${encodeURIComponent(group.slug)}/invitations`, {
        username: value,
      });
      await onInvited();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Davet gönderilemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{group.name}</span>
            <h2>{t('Kullanıcı davet et')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span>{t('Kullanıcı adı')}</span>
            <input
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t('orn. mert')}
              maxLength={30}
              autoFocus
            />
            <small>{t('Davet, kullanıcının bildirimlerine ve gruplar sayfasına düşer.')}</small>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {t('Vazgeç')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !username.trim()}>
              <Icon name="send" size={16} />
              {busy ? t('Gönderiliyor…') : t('Davet gönder')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function EditGroupModal({
  group,
  onClose,
  onSaved,
}: {
  group: Group;
  onClose: () => void;
  onSaved: (group: Group) => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [category, setCategory] = useState(group.category ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(group.visibility);
  const [joinPolicy, setJoinPolicy] = useState<GroupJoinPolicy>(group.joinPolicy);
  const [rules, setRules] = useState(group.rules ?? '');
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(group.coverUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseCover(file: File | null) {
    setCover(file);
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : group.coverUrl);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let coverUrl: string | null | undefined;
      if (cover) {
        const media = await uploadMedia(cover);
        coverUrl = media.url;
      }
      const result = await vh.patch<{ community: Group }>(
        `communities/${encodeURIComponent(group.slug)}`,
        {
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          rules: rules.trim() || null,
          visibility,
          joinPolicy,
          ...(coverUrl !== undefined ? { coverUrl } : {}),
        },
      );
      onSaved(result.community);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Grup güncellenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{t('Grup ayarları')}</span>
            <h2>{t('Grubu düzenle')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <label className="field wide">
              <span>{t('Grup adı')}</span>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label className="field wide">
              <span>{t('Açıklama')}</span>
              <textarea
                className="textarea"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
              />
            </label>
            <label className="field">
              <span>{t('Kategori')}</span>
              <select
                className="select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">{t('Kategori yok')}</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {t(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t('Görünürlük')}</span>
              <select
                className="select"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
              >
                <option value="public">{t('Herkese açık')}</option>
                <option value="private">{t('Özel (davetle)')}</option>
              </select>
            </label>
            <label className="field">
              <span>{t('Katılım')}</span>
              <select
                className="select"
                value={joinPolicy}
                onChange={(event) => setJoinPolicy(event.target.value as GroupJoinPolicy)}
                disabled={visibility === 'private'}
              >
                <option value="open">{t('Serbest')}</option>
                <option value="approval">{t('Yönetici onayı')}</option>
              </select>
            </label>
            <label className="field">
              <span>{t('Kapak')}</span>
              <span className="cover-picker">
                <span className="cover-preview">
                  {preview ? <img src={preview} alt="" /> : <MediaImage src={null} alt="" fallbackIcon="users" />}
                </span>
                <span className="cover-picker-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Icon name="upload" size={15} />
                    {t('Değiştir')}
                  </button>
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => chooseCover(event.target.files?.[0] ?? null)}
                />
              </span>
            </label>
            <label className="field wide">
              <span>{t('Kurallar')}</span>
              <textarea
                className="textarea"
                rows={4}
                value={rules}
                onChange={(event) => setRules(event.target.value)}
                maxLength={2000}
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {t('Vazgeç')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
              {busy ? t('Kaydediliyor…') : t('Kaydet')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
