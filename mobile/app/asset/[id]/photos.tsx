import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button, EmptyState, Loading, Notice, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { getAsset, listAssetMedia } from '@/src/db/repo';
import { importImages, makeCover, pickImages, removeMedia } from '@/src/services/media';
import { formatBytes } from '@/src/lib/format';
import { mediaUri } from '@/src/lib/paths';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';
import { Image } from 'expo-image';
import type { Asset, MediaItem } from '@/src/types';

export default function AssetPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assetId = String(id);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, reload } = useAsyncData<{ asset: Asset | null; media: MediaItem[] }>(
    async () => {
      const [asset, media] = await Promise.all([getAsset(assetId), listAssetMedia(assetId)]);
      return { asset, media };
    },
    [assetId],
  );

  const add = async (source: 'library' | 'camera') => {
    if (!data?.asset) return;
    setError(null);
    try {
      const picked = await pickImages(source);
      if (picked.length === 0) return;
      setBusy(true);
      setProgress({ done: 0, total: picked.length });
      await importImages(picked, {
        assetId,
        assetName: data.asset.name,
        entryId: null,
        occurredAt: new Date().toISOString(),
        onProgress: (done, total) => setProgress({ done, total }),
      });
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Fotoğraf eklenemedi.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const actions = (item: MediaItem) => {
    Alert.alert('Fotoğraf', item.relativePath.split('/').pop() ?? 'Fotoğraf', [
      {
        text: 'Kapak yap',
        onPress: async () => {
          await makeCover(assetId, item.id);
          await reload();
        },
      },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Fotoğrafı sil', 'Fotoğraf arşivden kaldırılacak. Emin misiniz?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Sil',
              style: 'destructive',
              onPress: async () => {
                await removeMedia(item.id);
                await reload();
              },
            },
          ]);
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const media = data?.media ?? [];
  const totalBytes = media.reduce((sum, item) => sum + item.bytes, 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Fotoğraflar' }} />
      <Screen refreshing={loading} onRefresh={reload}>
        <SectionTitle
          title={data?.asset?.name ?? 'Varlık fotoğrafları'}
          description={`${media.length} fotoğraf · ${formatBytes(totalBytes)}`}
        />
        {error ? <Notice title="Fotoğraf eklenemedi" tone="danger">{error}</Notice> : null}
        {loading && !data ? <Loading label="Fotoğraflar yükleniyor…" /> : null}

        <View style={styles.actions}>
          <Button label="Galeriden seç" onPress={() => add('library')} disabled={busy} style={styles.flex} />
          <Button label="Kamera" variant="secondary" onPress={() => add('camera')} disabled={busy} />
        </View>
        {progress ? (
          <ProgressBar
            percent={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
            label={`${progress.done} / ${progress.total} fotoğraf aktarılıyor`}
          />
        ) : null}

        {media.length === 0 ? (
          <EmptyState
            title="Henüz fotoğraf yok"
            description="Galeriden birden fazla fotoğraf seçebilir veya kamerayla çekebilirsiniz. Orijinaller cihazda saklanır."
          />
        ) : (
          <View style={styles.grid}>
            {media.map((item) => (
              <View key={item.id} style={styles.item}>
                <Image
                  source={{ uri: mediaUri(item.relativePath) }}
                  style={styles.image}
                  contentFit="cover"
                  transition={120}
                />
                <Text style={styles.size}>{formatBytes(item.bytes)}</Text>
                <Button label="İşlem" size="sm" variant="secondary" onPress={() => actions(item)} />
              </View>
            ))}
          </View>
        )}

        <Notice title="Dosya düzeni" tone="info">
          Fotoğraflar varlık ve tarih klasörlerine kopyalanır. Galerideki özgün dosyalarınız silinmez.
        </Notice>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: theme.space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  item: { width: '31%', minWidth: 96, gap: 3, alignItems: 'stretch' },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  size: { fontSize: 9.5, color: theme.colors.muted, textAlign: 'center' },
});
