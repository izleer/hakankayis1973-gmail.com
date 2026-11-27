import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Button, Chip, EmptyState, Loading, Notice, Screen } from '@/components/ui';
import { AssetCard } from '@/components/asset-card';
import { listAssets, listAssetTypes } from '@/src/db/repo';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';

export default function AssetsScreen() {
  const [search, setSearch] = useState('');
  const [typeSlug, setTypeSlug] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [assets, types] = await Promise.all([
      listAssets({ search, typeSlug, status: showArchived ? 'archived' : 'active' }),
      listAssetTypes(),
    ]);
    return { assets, types };
  }, [search, typeSlug, showArchived]);

  const topTypes = useMemo(
    () => (data?.types ?? []).filter((type) => type.parentSlug === null),
    [data?.types],
  );

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <AppHeader
        eyebrow="Koleksiyon"
        title="Varlıklar"
        subtitle="Canlılar, eşyalar, taşıtlar ve daha fazlası. Her varlığın kendi zaman çizelgesi vardır."
      />

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Ad, açıklama veya konum ara"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <View style={styles.chips}>
        <Chip label="Tümü" active={typeSlug === null} onPress={() => setTypeSlug(null)} />
        {topTypes.map((type) => (
          <Chip
            key={type.slug}
            label={type.name}
            active={typeSlug === type.slug}
            onPress={() => setTypeSlug(typeSlug === type.slug ? null : type.slug)}
          />
        ))}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.segment}>
          <Chip label="Aktif" active={!showArchived} onPress={() => setShowArchived(false)} />
          <Chip label="Arşiv" active={showArchived} onPress={() => setShowArchived(true)} />
        </View>
        <Button label="Yeni varlık" size="sm" onPress={() => router.push('/asset/new')} />
      </View>

      {loading && !data ? <Loading label="Varlıklar yükleniyor…" /> : null}
      {error ? <Notice title="Varlıklar yüklenemedi" tone="danger">{error}</Notice> : null}

      {data ? (
        data.assets.length === 0 ? (
          <EmptyState
            title={showArchived ? 'Arşivde varlık yok' : search || typeSlug ? 'Eşleşen varlık yok' : 'Henüz varlık eklenmedi'}
            description={
              showArchived
                ? 'Arşive aldığınız varlıklar burada listelenir. Verileri silinmez.'
                : 'Bir bitki, araç, eşya veya mekân ekleyerek başlayın. Fotoğraf ve ölçümler cihazda kalır.'
            }
            action={
              !showArchived ? (
                <Button label="Varlık ekle" onPress={() => router.push('/asset/new')} />
              ) : undefined
            }
          />
        ) : (
          <View style={styles.list}>
            {data.assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onPress={() => router.push(`/asset/${asset.id}`)}
              />
            ))}
            <Text style={styles.count}>{data.assets.length} varlık gösteriliyor</Text>
          </View>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.lineStrong,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 17, color: theme.colors.muted },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: theme.colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  segment: { flexDirection: 'row', gap: 6 },
  list: { gap: theme.space.sm },
  count: { fontSize: 10.5, color: theme.colors.muted, textAlign: 'center', marginTop: 4 },
});
