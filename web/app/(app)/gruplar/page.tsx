import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { GroupCard } from '@/components/GroupCard';
import { GroupInvites } from '@/components/GroupInvites';
import { Icon } from '@/components/Icons';
import { api, requireViewer } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { Group, GroupInvitation, Paged } from '@/lib/types';

export const metadata = { title: 'Gruplar' };

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

type SearchParams = Promise<{ q?: string; category?: string }>;

export default async function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const query = new URLSearchParams({ limit: '48' });
  if (params.q) query.set('q', params.q);
  if (params.category) query.set('category', params.category);

  const [mine, discover, invitations] = await Promise.all([
    api<Paged<Group>>('/v1/communities?mine=true&limit=48'),
    api<Paged<Group>>(`/v1/communities?${query.toString()}`),
    api<{ items: GroupInvitation[] }>('/v1/communities/invitations/mine'),
  ]);

  const search = params.q?.toLocaleLowerCase('tr') ?? '';
  const mineFiltered = mine.items.filter((group) => {
    if (params.category && group.category !== params.category) return false;
    if (!search) return true;
    return `${group.name} ${group.description ?? ''}`.toLocaleLowerCase('tr').includes(search);
  });

  return (
    <main className="page groups-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Birlikte hatırlamak</span>
          <h1>Gruplar</h1>
          <p>
            Varlıkların kendi hafızanda kalır; seçtiğin parçaları benzer ilgi
            alanlarındaki insanlarla paylaşırsın.
          </p>
        </div>
        <Link href="/gruplar/yeni" className="btn btn-primary">
          <Icon name="plus" size={18} />
          Yeni grup
        </Link>
      </header>

      <GroupInvites initial={invitations.items} />

      <div className="toolbar">
        <form className="search-form" action="/gruplar">
          {params.category ? (
            <input type="hidden" name="category" value={params.category} />
          ) : null}
          <Icon name="search" size={18} />
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Grup, konu ya da topluluk ara…"
            aria-label="Grup ara"
          />
          <button type="submit" className="search-submit">
            Ara
          </button>
        </form>
        <span className="muted-note">
          {formatNumber(discover.total)} topluluk · {formatNumber(mine.total)} üyeliğin
        </span>
      </div>

      <div className="filter-row">
        <Link
          href={params.q ? `/gruplar?q=${encodeURIComponent(params.q)}` : '/gruplar'}
          className={`chip${!params.category ? ' is-active' : ''}`}
        >
          <Icon name="grid" size={15} />
          Tüm kategoriler
        </Link>
        {categories.map((category) => {
          const href = new URLSearchParams();
          if (params.q) href.set('q', params.q);
          href.set('category', category);
          return (
            <Link
              key={category}
              href={`/gruplar?${href.toString()}`}
              className={`chip${params.category === category ? ' is-active' : ''}`}
            >
              {category}
            </Link>
          );
        })}
      </div>

      <section className="groups-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Hafızanda</span>
            <h2>Üyesi olduğun gruplar</h2>
          </div>
          <span className="aside-count">{mineFiltered.length}</span>
        </div>
        {mineFiltered.length > 0 ? (
          <div className="group-grid">
            {mineFiltered.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="users"
            title="Henüz bir grubun yok"
            body="İlgi alanına uyan bir topluluk bul ya da kendi grubunu kur."
            action={{ href: '/gruplar/yeni', label: 'Grup oluştur' }}
          />
        )}
      </section>

      <section className="groups-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Keşfet</span>
            <h2>Yeni topluluklar</h2>
          </div>
          <span className="aside-count">{discover.items.length}</span>
        </div>
        {discover.items.length > 0 ? (
          <div className="group-grid">
            {discover.items.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="compass"
            title="Bu aramada grup yok"
            body="Farklı bir kelime dene ya da kendi topluluğunu başlat."
            action={{ href: '/gruplar/yeni', label: 'Grup oluştur' }}
          />
        )}
      </section>

      <p className="groups-note">
        <Icon name="lock" size={16} />
        Bir varlığı gruba eklemek sahipliğini değiştirmez. Paylaşımı istediğin an
        daraltabilir veya geri çekebilirsin.
      </p>

      <span className="visually-hidden">Görüntüleyen: {viewer.displayName}</span>
    </main>
  );
}
