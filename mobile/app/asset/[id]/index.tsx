import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  KeyValue,
  Loading,
  Notice,
  PhotoThumb,
  Screen,
  SectionTitle,
  StatTile,
} from '@/components/ui';
import { EntryRow } from '@/components/entry-row';
import { getAsset, listAssetMedia, listEntries, setAssetStatus, softDeleteAsset } from '@/src/db/repo';
import { makeCover, removeMedia } from '@/src/services/media';
import { formatBytes, formatDate, formatNumber } from '@/src/lib/format';
import { mediaUri } from '@/src/lib/paths';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';
import type { Asset, MediaItem, TimelineEntry } from '@/src/types';

type DetailData = { asset: Asset; entries: TimelineEntry[]; media: MediaItem[] };

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assetId = String(id);

  const { data, loading, error, reload } = useAsyncData<DetailData | null>(async () => {
    const asset = await getAsset(assetId);
    if (!asset) return null;
    const [entries, media] = await Promise.all([listEntries(assetId), listAssetMedia(assetId)]);
    return { asset, entries, media };
  }, [assetId]);

  const confirmDelete = () => {
    Alert.alert(
      'Varlığı sil',
      'Varlık, kayıtları ve fotoğrafları arşivden kaldırılır. Dosyalar hemen silinmez; yedekleriniz etkilenmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await softDeleteAsset(assetId);
              router.replace('/assets');
            } catch (caught) {
              Alert.alert('Silinemedi', caught instanceof Error ? caught.message : 'Bilinmeyen hata');
            }
          },
        },
      ],
    );
  };

  const toggleArchive = async () => {
    if (!data) return;
    const next = data.asset.status === 'archived' ? 'active' : 'archived';
    await setAssetStatus(assetId, next);
    await reload();
  };

  const photoActions = (item: MediaItem) => {
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
          Alert.alert('Fotoğrafı sil', 'Bu fotoğraf arşivden kaldırılacak. Emin misiniz?', [
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

  const asset = data?.asset;
  const media = data?.media ?? [];
  const entries = data?.entries ?? [];
  const measurements = entries.filter((entry) => entry.type === 'measurement').length;
  const totalMediaBytes = media.reduce((sum, item) => sum + item.bytes, 0);

  return (
    <>
      <Stack.Screen options={{ title: asset?.name ?? 'Varlık' }} />
      <Screen refreshing={loading} onRefresh={reload}>
        {loading && !data ? <Loading label="Varlık yükleniyor…" /> : null}
        {error ? <Notice title="Varlık yüklenemedi" tone="danger">{error}</Notice> : null}
        {!loading && !data ? (
          <EmptyState
            title="Varlık bulunamadı"
            description="Bu varlık silinmiş veya taşınmış olabilir."
            action={<Button label="Varlıklara dön" onPress={() => router.replace('/assets')} />}
          />
        ) : null}

        {asset ? (
          <>
            {asset.coverPath ? (
              <Image
                source={{ uri: mediaUri(asset.coverPath) }}
                style={styles.cover}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverMark}>{asset.name.slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
                <Text style={styles.coverHint}>Kapak fotoğrafı eklemek için aşağıdan bir fotoğrafı kapak yapın.</Text>
              </View>
            )}

            <View style={styles.titleBlock}>
              <View style={styles.badgeRow}>
                <Badge label={asset.typeName ?? 'Tür seçilmedi'} tone="gold" />
                {asset.status === 'archived' ? <Badge label="Arşivde" tone="muted" /> : null}
              </View>
              <Text style={styles.name}>{asset.name}</Text>
              <Text style={styles.meta}>
                {[asset.location, asset.acquiredOn ? `Edinme: ${formatDate(asset.acquiredOn)}` : null]
                  .filter(Boolean)
                  .join(' · ') || 'Konum ve edinme tarihi eklenmedi'}
              </Text>
              {asset.description ? <Text style={styles.description}>{asset.description}</Text> : null}
            </View>

            <View style={styles.statsRow}>
              <StatTile label="Kayıt" value={formatNumber(entries.length)} />
              <StatTile label="Fotoğraf" value={formatNumber(media.length)} />
              <StatTile label="Ölçüm" value={formatNumber(measurements)} />
            </View>

            <View style={styles.actions}>
              <Button
                label="Kayıt ekle"
                onPress={() => router.push(`/asset/${assetId}/entry`)}
                style={styles.actionPrimary}
              />
              <Button
                label="Fotoğraf"
                variant="secondary"
                onPress={() => router.push(`/asset/${assetId}/photos`)}
              />
              <Button
                label="Düzenle"
                variant="secondary"
                onPress={() => router.push(`/asset/${assetId}/edit`)}
              />
            </View>

            <SectionTitle
              title="Fotoğraf galerisi"
              description={`${media.length} fotoğraf · ${formatBytes(totalMediaBytes)}`}
              action={
                <Button
                  label="Ekle"
                  size="sm"
                  variant="ghost"
                  onPress={() => router.push(`/asset/${assetId}/photos`)}
                />
              }
            />
            {media.length === 0 ? (
              <Card>
                <Text style={styles.muted}>Henüz fotoğraf yok. Galeriden seçin veya kamerayla çekin.</Text>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
                {media.map((item) => (
                  <View key={item.id} style={styles.galleryItem}>
                    <PhotoThumb uri={mediaUri(item.relativePath)} size={96} onPress={() => photoActions(item)} />
                    {asset.coverPath === item.relativePath ? <Text style={styles.coverTag}>Kapak</Text> : null}
                  </View>
                ))}
              </ScrollView>
            )}

            <SectionTitle
              title="Zaman çizelgesi"
              description="En yeni kayıt üstte"
              action={
                <Button
                  label="Kayıt ekle"
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push(`/asset/${assetId}/entry`)}
                />
              }
            />
            {entries.length === 0 ? (
              <EmptyState
                title="Henüz kayıt yok"
                description="Bakım, ölçüm, sağlık notu veya dönüm noktası ekleyin."
                action={<Button label="İlk kaydı ekle" onPress={() => router.push(`/asset/${assetId}/entry`)} />}
              />
            ) : (
              <View style={styles.timeline}>
                {entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onPress={() => router.push(`/entry/${entry.id}`)}
                  />
                ))}
              </View>
            )}

            <SectionTitle title="Yönetim" />
            <Card>
              <KeyValue label="Oluşturma" value={formatDate(asset.createdAt)} />
              <KeyValue label="Son güncelleme" value={formatDate(asset.updatedAt)} />
              <Divider />
              <Button
                label={asset.status === 'archived' ? 'Arşivden çıkar' : 'Arşive al'}
                variant="secondary"
                onPress={toggleArchive}
              />
              <Text style={styles.muted}>
                Arşive almak verileri silmez. Varlık “Arşiv” sekmesinde görünmeye devam eder.
              </Text>
              <Button label="Varlığı sil" variant="danger" onPress={confirmDelete} />
            </Card>
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 210, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceMuted },
  coverPlaceholder: {
    height: 160,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.greenSoft,
    borderWidth: 1,
    borderColor: '#C9DCD1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.lg,
    gap: 6,
  },
  coverMark: { fontFamily: 'serif', fontSize: 52, color: theme.colors.green, fontWeight: '700' },
  coverHint: { fontSize: 11, color: theme.colors.muted, textAlign: 'center' },
  titleBlock: { gap: 4, paddingTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  name: { fontFamily: 'serif', fontSize: 28, lineHeight: 32, color: theme.colors.ink, fontWeight: '600' },
  meta: { fontSize: 12, color: theme.colors.muted },
  description: { fontSize: 13, color: theme.colors.inkSoft, lineHeight: 19, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: theme.space.sm },
  actions: { flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap' },
  actionPrimary: { flexGrow: 1 },
  gallery: { gap: theme.space.sm, paddingVertical: 2 },
  galleryItem: { alignItems: 'center', gap: 2 },
  coverTag: { fontSize: 9, color: theme.colors.gold, fontWeight: '700' },
  timeline: { gap: theme.space.sm },
  muted: { fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
});
