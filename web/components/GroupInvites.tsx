'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { initials } from '@/lib/format';
import type { GroupInvitation } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

export function GroupInvites({ initial }: { initial: GroupInvitation[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(invitation: GroupInvitation, action: 'accept' | 'decline') {
    if (busyId) return;
    setBusyId(invitation.id);
    setError(null);
    try {
      if (action === 'accept') {
        await vh.post<{ community: { slug: string } }>(
          `communities/invitations/${invitation.id}/accept`,
        );
        setItems((current) => current.filter((item) => item.id !== invitation.id));
        router.push(`/gruplar/${invitation.community.slug}`);
        router.refresh();
      } else {
        await vh.post(`communities/invitations/${invitation.id}/decline`);
        setItems((current) => current.filter((item) => item.id !== invitation.id));
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Davet yanıtlanamadı.');
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="invite-banner">
      <div className="invite-banner-head">
        <span className="eyebrow">Davetler</span>
        <h2>Seni bir gruba çağırdılar</h2>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
      <div className="invite-list">
        {items.map((invitation) => (
          <div className="invite-row" key={invitation.id}>
            <span className="invite-cover">
              <MediaImage
                src={invitation.community.coverUrl}
                alt={invitation.community.name}
                fallbackIcon="users"
              />
            </span>
            <span className="invite-text">
              <strong>{invitation.community.name}</strong>
              <small>
                <span className="avatar avatar-tiny">
                  {invitation.inviter.avatarUrl ? (
                    <img src={invitation.inviter.avatarUrl} alt="" />
                  ) : (
                    initials(invitation.inviter.displayName)
                  )}
                </span>
                {invitation.inviter.displayName} davet etti
              </small>
            </span>
            <span className="invite-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busyId === invitation.id}
                onClick={() => respond(invitation, 'accept')}
              >
                <Icon name="check" size={15} />
                Katıl
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busyId === invitation.id}
                onClick={() => respond(invitation, 'decline')}
              >
                Geç
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
