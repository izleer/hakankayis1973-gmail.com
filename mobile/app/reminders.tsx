import { StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Button, EmptyState, Loading, Notice, Screen, SectionTitle } from '@/components/ui';
import { EntryRow } from '@/components/entry-row';
import { listReminders, setReminderDone } from '@/src/db/repo';
import { dueLabel } from '@/src/lib/format';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';

export default function RemindersScreen() {
  const { data, loading, error, reload } = useAsyncData(
    () => listReminders({ includeDone: true, limit: 300 }),
    [],
  );

  const pending = (data ?? []).filter((item) => !item.reminderDone);
  const done = (data ?? []).filter((item) => item.reminderDone);

  const complete = async (id: string, value: boolean) => {
    await setReminderDone(id, value);
    await reload();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Hatırlatmalar' }} />
      <Screen refreshing={loading} onRefresh={reload}>
        <SectionTitle
          title="Bekleyen hatırlatmalar"
          description={pending.length > 0 ? `${pending.length} hatırlatma sizi bekliyor` : 'Bekleyen hatırlatma yok'}
        />
        {error ? <Notice title="Hatırlatmalar yüklenemedi" tone="danger">{error}</Notice> : null}
        {loading && !data ? <Loading label="Hatırlatmalar yükleniyor…" /> : null}

        {!loading && pending.length === 0 ? (
          <EmptyState
            title="Bekleyen hatırlatma yok"
            description="Yeni bir kayıt eklerken “Hatırlatma” türünü seçerek bakım veya kontrol zamanı belirleyebilirsiniz."
          />
        ) : (
          <View style={styles.list}>
            {pending.map((reminder) => (
              <View key={reminder.id} style={styles.item}>
                <EntryRow
                  entry={reminder}
                  assetName={reminder.assetName}
                  onPress={() => router.push(`/entry/${reminder.id}`)}
                />
                <View style={styles.rowBetween}>
                  <Text style={styles.due}>{dueLabel(reminder.reminderAt)}</Text>
                  <Button label="Tamamla" size="sm" variant="secondary" onPress={() => complete(reminder.id, true)} />
                </View>
              </View>
            ))}
          </View>
        )}

        {done.length > 0 ? (
          <>
            <SectionTitle title="Tamamlananlar" description="Son 300 kayıt içinde" />
            <View style={styles.list}>
              {done.map((reminder) => (
                <View key={reminder.id} style={styles.item}>
                  <EntryRow
                    entry={reminder}
                    assetName={reminder.assetName}
                    onPress={() => router.push(`/entry/${reminder.id}`)}
                  />
                  <View style={styles.rowBetween}>
                    <Text style={styles.doneText}>Tamamlandı</Text>
                    <Button label="Geri al" size="sm" variant="ghost" onPress={() => complete(reminder.id, false)} />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.space.sm },
  item: { gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  due: { fontSize: 11, color: theme.colors.warning, fontWeight: '600' },
  doneText: { fontSize: 11, color: theme.colors.green, fontWeight: '600' },
});
