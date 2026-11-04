import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { GroupCard } from '@/components/GroupCard';
import { GroupInvites } from '@/components/GroupInvites';
import { Icon } from '@/components/Icons';
import { api, requireViewer } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { getI18n, getT } from '@/lib/i18n/server';
import type { Group, GroupInvitation, Paged } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Gruplar') };
}

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
  const { t, locale } = await getI18n();
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
  const mineIds = new Set(mine.items.map((group) => group.id));
  const discoverFiltered = discover.items.filter((group) => !mineIds.has(group.id));

  return (
    <main className="page groups-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{t('Birlikte hatırlamak')}</span>
          <h1>{t('Gruplar')}</h1>
          <p>
            {t('Varlıkların kendi hafızanda kalır; seçtiğin parçaları benzer ilgi alanlarındaki insanlarla paylaşırsın.')}
          </p>
        </div>
        <Link href="/gruplar/yeni" className="btn btn-primary">
          <Icon name="plus" size={18} />
          {t('Yeni grup')}
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
            placeholder={t('Grup, konu ya da topluluk ara…')}
            aria-label={t('Grup ara')}
          />
          <button type="submit" className="search-submit">
            {t('Ara')}
          </button>
        </form>
        <span className="muted-note">
          {t('{communities} topluluk · {memberships} üyeliğin', {
            communities: formatNumber(discover.total, locale),
            memberships: formatNumber(mine.total, locale),
          })}
        </span>
      </div>

      <div className="filter-row">
        <Link
          href={params.q ? `/gruplar?q=${encodeURIComponent(params.q)}` : '/gruplar'}
          className={`chip${!params.category ? ' is-active' : ''}`}
        >
          <Icon name="grid" size={15} />
          {t('Tüm kategoriler')}
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
              {t(category)}
            </Link>
          );
        })}
      </div>

      <section className="groups-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t('Hafızanda')}</span>
            <h2>{t('Üyesi olduğun gruplar')}</h2>
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
            title={t('Henüz bir grubun yok')}
            body={t('İlgi alanına uyan bir topluluk bul ya da kendi grubunu kur.')}
            action={{ href: '/gruplar/yeni', label: t('Grup oluştur') }}
          />
        )}
      </section>

      <section className="groups-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t('Keşfet')}</span>
            <h2>{t('Keşfedilecek topluluklar')}</h2>
          </div>
          <span className="aside-count">{discoverFiltered.length}</span>
        </div>
        {discoverFiltered.length > 0 ? (
          <div className="group-grid">
            {discoverFiltered.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="compass"
            title={t('Bu aramada yeni grup yok')}
            body={t('Farklı bir kelime dene ya da kendi topluluğunu başlat.')}
            action={{ href: '/gruplar/yeni', label: t('Grup oluştur') }}
          />
        )}
      </section>

      <p className="groups-note">
        <Icon name="lock" size={16} />
        {t('Bir varlığı gruba eklemek sahipliğini değiştirmez. Paylaşımı istediğin an daraltabilir veya geri çekebilirsin.')}
      </p>

      <span className="visually-hidden">
        {t('Görüntüleyen: {name}', { name: viewer.displayName })}
      </span>
    </main>
  );
}
