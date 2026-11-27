import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
} from '@/components/ui';
import { getAsset, getEntry, listEntryMedia, setReminderDone, softDeleteEntry } from '@/src/db/repo';
import { formatDate, formatDateTime, formatNumber } from '@/src/lib/format';
import { mediaUri } from '@/src/lib/paths';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { entryTypeMeta, theme } from '@/src/theme';
import type { Asset, Entry, MediaItem } from '@/src/types';

type EntryDetail = { entry: Entry; asset: Asset | null; media: MediaItem[] };

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = String(id);

  const { data, loading, error, reload } = useAsyncData<EntryDetail | null>(async () => {
    const entry = await getEntry(entryId);
    if (!entry) return null;
    const [asset, media] = await Promise.all([getAsset(entry.assetId), listEntryMedia(entryId)]);
    return { entry, asset, media };
  }, [entryId]);

  const entry = data?.entry;
  const meta = entry ? entryTypeMeta[entry.type] : null;

  const remove = () => {
    Alert.alert('Kaydı sil', 'Bu kayıt arşivden kaldırılacak. Fotoğrafları hemen silinmez.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await softDeleteEntry(entryId);
          router.back();
        },
      },
    ]);
  };

  const toggleDone = async () => {
    if (!entry) return;
    await setReminderDone(entry.id, !entry.reminderDone);
    await reload();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Kayıt' }} />
      <Screen refreshing={loading} onRefresh={reload}>
        {loading && !data ? <Loading label="Kayıt yükleniyor…" /> : null}
        {error ? <Notice title="Kayıt yüklenemedi" tone="danger">{error}</Notice> : null}
        {!loading && !data ? (
          <EmptyState
            title="Kayıt bulunamadı"
            description="Bu kayıt silinmiş olabilir."
            action={<Button label="Geri" onPress={() => router.back()} />}
          />
        ) : null}

        {entry && data ? (
          <>
            <View style={styles.head}>
              <View style={styles.badgeRow}>
                {meta ? (
                  <Badge
                    label={meta.label}
                    tone={
                      meta.tone === 'gold'
                        ? 'gold'
                        : meta.tone === 'danger'
                          ? 'danger'
                          : meta.tone === 'green'
                            ? 'green'
                            : meta.tone === 'warning'
                              ? 'warning'
                              : 'info'
                    }
                  />
                ) : null}
                {entry.type === 'reminder' ? (
                  <Badge label={entry.reminderDone ? 'Tamamlandı' : 'Bekliyor'} tone={entry.reminderDone ? 'green' : 'warning'} />
                ) : null}
              </View>
              <Text style={styles.title}>{entry.title}</Text>
              <Text style={styles.date}>{formatDateTime(entry.occurredAt)}</Text>
              {data.asset ? (
                <Button
                  label={data.asset.name}
                  size="sm"
                  variant="ghost"
                  onPress={() => router.push(`/asset/${data.asset?.id}`)}
                />
              ) : null}
            </View>

            {entry.measurementValue !== null ? (
              <Card tone="green">
                <Text style={styles.measureLabel}>Ölçüm</Text>
                <Text style={styles.measureValue}>
                  {formatNumber(entry.measurementValue)}
                  {entry.measurementUnit ? ` ${entry.measurementUnit}` : ''}
                </Text>
              </Card>
            ) : null}

            {entry.note ? (
              <Card>
                <Text style={styles.noteLabel}>Not</Text>
                <Text style={styles.note}>{entry.note}</Text>
              </Card>
            ) : null}

            {entry.reminderAt ? (
              <Card tone={entry.reminderDone ? 'green' : 'gold'}>
                <KeyValue label="Hatırlatma" value={formatDateTime(entry.reminderAt)} />
                <KeyValue label="Durum" value={entry.reminderDone ? 'Tamamlandı' : 'Bekliyor'} />
                <Button
                  label={entry.reminderDone ? 'Yeniden bekliyor yap' : 'Tamamlandı olarak işaretle'}
                  size="sm"
                  variant="secondary"
                  onPress={toggleDone}
                />
              </Card>
            ) : null}

            <SectionTitle
              title="Fotoğraflar"
              description={`${data.media.length} fotoğraf`}
              action={
                <Button
                  label="Fotoğraf ekle"
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push(`/asset/${entry.assetId}/photos`)}
                />
              }
            />
            {data.media.length === 0 ? (
              <Card>
                <Text style={styles.muted}>Bu kayda bağlı fotoğraf yok.</Text>
              </Card>
            ) : (
              <View style={styles.grid}>
                {data.media.map((item) => (
                  <PhotoThumb key={item.id} uri={mediaUri(item.relativePath)} size={108} />
                ))}
              </View>
            )}

            <Card>
              <KeyValue label="Oluşturma" value={formatDate(entry.createdAt)} />
              <KeyValue label="Son güncelleme" value={formatDate(entry.updatedAt)} />
              <Divider />
              <Button
                label="Düzenle"
                variant="secondary"
                onPress={() => router.push(`/entry/${entry.id}/edit`)}
              />
              <Button label="Kaydı sil" variant="danger" onPress={remove} />
            </Card>
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  head: { gap: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  title: { fontFamily: 'serif', fontSize: 27, lineHeight: 32, color: theme.colors.ink, fontWeight: '600' },
  date: { fontSize: 12, color: theme.colors.muted },
  measureLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: theme.colors.green, fontWeight: '700' },
  measureValue: { fontFamily: 'serif', fontSize: 28, color: theme.colors.green, fontWeight: '700' },
  noteLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: theme.colors.gold, fontWeight: '700' },
  note: { fontSize: 13.5, color: theme.colors.inkSoft, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  muted: { fontSize: 12, color: theme.colors.muted },
});
