import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetAccessRow, EntryAccessRow } from '../src/lib/access.js';
import type { Viewer } from '../src/lib/session.js';

/**
 * Görünürlük kararlarını gerçek veritabanına bağlanmadan doğrular. db.js
 * taklit edilir; sorgular bellek içi bir duruma yönlendirilir. Böylece
 * canViewAsset / canViewEntry / postIsVisibleTo tutarlılığı regresyona karşı
 * korunur (engel, arkadaşlık, seçili erişim ve silinme davranışları dahil).
 */
const mocks = vi.hoisted(() => {
  const state = {
    blocks: new Set<string>(),
    friends: new Set<string>(),
    rules: new Set<string>(),
    members: new Set<string>(),
  };
  const pair = (a: string, b: string) => [a, b].sort().join('|');
  const queryOne = vi.fn(async (text: string, params: unknown[] = []) => {
    const [p0, p1, p2] = params as [string, string, string];
    if (text.includes('FROM blocks')) {
      return state.blocks.has(pair(p0, p1)) ? { exists: true } : null;
    }
    if (text.includes('FROM friendships')) {
      return state.friends.has(pair(p0, p1)) ? { exists: true } : null;
    }
    if (text.includes('FROM access_rules')) {
      return state.rules.has(`${p0}|${p1}|${p2}`) ? { exists: true } : null;
    }
    if (text.includes('is_member')) {
      return { is_member: state.members.has(`${p0}|${p1}`) };
    }
    return null;
  });
  return { state, pair, queryOne, query: vi.fn(async () => []) };
});

vi.mock('../src/db.js', () => ({
  query: mocks.query,
  queryOne: mocks.queryOne,
}));

const { canViewAsset, canViewEntry, postIsVisibleTo } = await import('../src/lib/access.js');

function viewer(id: string, role: Viewer['role'] = 'user'): Viewer {
  return {
    id,
    username: id,
    displayName: id,
    avatarUrl: null,
    role,
    onboardedAt: null,
    email: `${id}@test.local`,
  };
}

function asset(over: Partial<AssetAccessRow> = {}): AssetAccessRow {
  return {
    id: 'asset1',
    owner_id: 'owner',
    visibility: 'private',
    status: 'active',
    deleted_at: null,
    ...over,
  };
}

function entry(over: Partial<EntryAccessRow> = {}): EntryAccessRow {
  return {
    id: 'entry1',
    asset_id: 'asset1',
    author_id: 'owner',
    visibility: 'private',
    deleted_at: null,
    ...over,
  };
}

beforeEach(() => {
  mocks.state.blocks.clear();
  mocks.state.friends.clear();
  mocks.state.rules.clear();
  mocks.state.members.clear();
  mocks.queryOne.mockClear();
});

describe('canViewAsset', () => {
  it('oturum yoksa herkese açık varlık bile görüntülenemez', async () => {
    expect(await canViewAsset(null, asset({ visibility: 'public' }))).toBe(false);
  });

  it('sahip kendi özel varlığını her zaman görür', async () => {
    expect(await canViewAsset(viewer('owner'), asset({ visibility: 'private' }))).toBe(true);
  });

  it('yetkili personel özel varlığı görebilir', async () => {
    expect(await canViewAsset(viewer('mod', 'moderator'), asset())).toBe(true);
    expect(await canViewAsset(viewer('adm', 'admin'), asset())).toBe(true);
  });

  it('özel varlık yabancıya kapalıdır', async () => {
    expect(await canViewAsset(viewer('stranger'), asset())).toBe(false);
  });

  it('herkese açık varlık oturumlu kullanıcıya açıktır', async () => {
    expect(await canViewAsset(viewer('stranger'), asset({ visibility: 'public' }))).toBe(true);
  });

  it('silinmiş varlık sahip olmayan herkese kapalıdır', async () => {
    expect(
      await canViewAsset(viewer('stranger'), asset({ visibility: 'public', deleted_at: new Date() })),
    ).toBe(false);
  });

  it('engel her iki yönde de herkese açık varlığı kapatır', async () => {
    mocks.state.blocks.add(mocks.pair('stranger', 'owner'));
    expect(await canViewAsset(viewer('stranger'), asset({ visibility: 'public' }))).toBe(false);
  });

  it('arkadaş varlığı yalnızca kabul edilmiş arkadaşa açar', async () => {
    const row = asset({ visibility: 'friends' });
    expect(await canViewAsset(viewer('stranger'), row)).toBe(false);
    mocks.state.friends.add(mocks.pair('stranger', 'owner'));
    expect(await canViewAsset(viewer('stranger'), row)).toBe(true);
  });

  it('engel arkadaş varlığını da kapatır', async () => {
    mocks.state.friends.add(mocks.pair('stranger', 'owner'));
    mocks.state.blocks.add(mocks.pair('stranger', 'owner'));
    expect(await canViewAsset(viewer('stranger'), asset({ visibility: 'friends' }))).toBe(false);
  });

  it('seçili varlık yalnızca erişim kuralı olana açılır', async () => {
    const row = asset({ visibility: 'selected' });
    expect(await canViewAsset(viewer('stranger'), row)).toBe(false);
    mocks.state.rules.add('asset|asset1|stranger');
    expect(await canViewAsset(viewer('stranger'), row)).toBe(true);
  });
});

describe('canViewEntry', () => {
  it('oturum yoksa kayıt görüntülenemez', async () => {
    expect(await canViewEntry(null, entry({ visibility: 'public' }), asset({ visibility: 'public' }))).toBe(false);
  });

  it('sahip ve yazar kendi kaydını görür', async () => {
    expect(await canViewEntry(viewer('owner'), entry(), asset())).toBe(true);
    expect(
      await canViewEntry(viewer('author'), entry({ author_id: 'author' }), asset()),
    ).toBe(true);
  });

  it('silinmiş kayıt sahip olmayanlara kapalıdır', async () => {
    expect(
      await canViewEntry(viewer('stranger'), entry({ deleted_at: new Date(), visibility: 'public' }), asset({ visibility: 'public' })),
    ).toBe(false);
  });

  it('varlık görülemiyorsa kayıt da görülemez', async () => {
    expect(
      await canViewEntry(viewer('stranger'), entry({ visibility: 'public' }), asset({ visibility: 'private' })),
    ).toBe(false);
  });

  it('herkese açık kayıt, herkese açık varlıkta yabancıya açıktır', async () => {
    expect(
      await canViewEntry(viewer('stranger'), entry({ visibility: 'public' }), asset({ visibility: 'public' })),
    ).toBe(true);
  });

  it('arkadaş kaydı arkadaş varlıkta yalnızca arkadaşa açılır', async () => {
    const a = asset({ visibility: 'friends' });
    const e = entry({ visibility: 'friends' });
    expect(await canViewEntry(viewer('stranger'), e, a)).toBe(false);
    mocks.state.friends.add(mocks.pair('stranger', 'owner'));
    expect(await canViewEntry(viewer('stranger'), e, a)).toBe(true);
  });

  it('engel arkadaş kaydını da kapatır', async () => {
    mocks.state.friends.add(mocks.pair('stranger', 'owner'));
    mocks.state.blocks.add(mocks.pair('stranger', 'owner'));
    expect(
      await canViewEntry(viewer('stranger'), entry({ visibility: 'friends' }), asset({ visibility: 'friends' })),
    ).toBe(false);
  });

  it('seçili kayıt, kayıt veya varlık erişim kuralıyla açılır', async () => {
    // Varlık zaten görülebilir (public); kayıt seçili olduğundan ek kural gerekir.
    const a = asset({ visibility: 'public' });
    const e = entry({ visibility: 'selected' });
    expect(await canViewEntry(viewer('stranger'), e, a)).toBe(false);
    mocks.state.rules.add('entry|entry1|stranger');
    expect(await canViewEntry(viewer('stranger'), e, a)).toBe(true);
    mocks.state.rules.clear();
    mocks.state.rules.add('asset|asset1|stranger');
    expect(await canViewEntry(viewer('stranger'), e, a)).toBe(true);
  });

  it('seçili varlıkta yalnızca kayıt kuralı yetmez, varlık erişimi de gerekir', async () => {
    const a = asset({ visibility: 'selected' });
    const e = entry({ visibility: 'selected' });
    mocks.state.rules.add('entry|entry1|stranger');
    expect(await canViewEntry(viewer('stranger'), e, a)).toBe(false);
    mocks.state.rules.add('asset|asset1|stranger');
    expect(await canViewEntry(viewer('stranger'), e, a)).toBe(true);
  });
});

describe('postIsVisibleTo', () => {
  const post = {
    author_id: 'author',
    audience: 'public' as const,
    community_id: null,
    status: 'visible' as const,
  };

  it('gizli/silinmiş gönderi yalnızca personele açıktır', async () => {
    expect(await postIsVisibleTo(viewer('stranger'), { ...post, status: 'hidden' })).toBe(false);
    expect(await postIsVisibleTo(viewer('mod', 'moderator'), { ...post, status: 'hidden' })).toBe(true);
  });

  it('oturum yoksa görünür gönderi bile görüntülenemez', async () => {
    expect(await postIsVisibleTo(null, post)).toBe(false);
  });

  it('yazar kendi gönderisini görür', async () => {
    expect(await postIsVisibleTo(viewer('author'), post)).toBe(true);
  });

  it('herkese açık gönderi yabancıya açıktır', async () => {
    expect(await postIsVisibleTo(viewer('stranger'), post)).toBe(true);
  });

  it('engel herkese açık gönderiyi kapatır', async () => {
    mocks.state.blocks.add(mocks.pair('stranger', 'author'));
    expect(await postIsVisibleTo(viewer('stranger'), post)).toBe(false);
  });

  it('grup gönderisi yalnızca etkin üyeye açıktır', async () => {
    const communityPost = { ...post, audience: 'community' as const, community_id: 'c1' };
    expect(await postIsVisibleTo(viewer('stranger'), communityPost)).toBe(false);
    mocks.state.members.add('c1|stranger');
    expect(await postIsVisibleTo(viewer('stranger'), communityPost)).toBe(true);
  });

  it('topluluğu olmayan grup gönderisi yabancıya kapalıdır', async () => {
    expect(
      await postIsVisibleTo(viewer('stranger'), { ...post, audience: 'community', community_id: null }),
    ).toBe(false);
  });
});