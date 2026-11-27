import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Badge, Button, Card, EmptyState, Loading, Notice, Screen, SectionTitle, StatTile } from '@/components/ui';
import { EntryRow } from '@/components/entry-row';
import { getStats, listExportJobs, listRecentEntries, listReminders } from '@/src/db/repo';
import { formatBytes, formatDateTime, formatShortDate } from '@/src/lib/format';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { exportStatusMeta, theme } from '@/src/theme';

export default function HomeScreen() {
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [stats, reminders, recent, jobs] = await Promise.all([
      getStats(),
      listReminders({ limit: 4 }),
      listRecentEntries(6),
      listExportJobs(20),
    ]);
    return { stats, reminders, recent, jobs };
  }, []);

  const lastBackup = data?.jobs.find((job) => job.exportType === 'backup' && job.status !== 'FAILED');

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <AppHeader
        eyebrow="Yerel arşiv"
        title="İzleer"
        subtitle="Varlıklarınız, fotoğraflarınız ve kayıtlarınız telefonunuzda. İnternet olmadan da çalışır."
      />

      {loading && !data ? <Loading label="Arşiv okunuyor…" /> : null}
      {error ? <Notice title="Arşiv okunamadı" tone="danger">{error}</Notice> : null}

      {data ? (
        <>
          <View style={styles.statsGrid}>
            <StatTile label="Varlık" value={String(data.stats.assets)} />
            <StatTile label="Kayıt" value={String(data.stats.entries)} />
            <StatTile label="Fotoğraf" value={String(data.stats.media)} />
            <StatTile label="Bekleyen hatırlatma" value={String(data.stats.dueReminders)} />
          </View>

          <View style={styles.actions}>
            <Button label="Yeni varlık" onPress={() => router.push('/asset/new')} style={styles.actionButton} />
            <Button
              label="Hatırlatmalar"
              variant="secondary"
              onPress={() => router.push('/reminders')}
              style={styles.actionButton}
            />
          </View>

          {data.stats.assets === 0 ? (
            <EmptyState
              title="Arşiviniz boş"
              description="İlk varlığınızı ekleyin; bakım, ölçüm ve fotoğrafları tek zaman çizelgesinde biriktirin."
              action={<Button label="İlk varlığı ekle" onPress={() => router.push('/asset/new')} />}
            />
          ) : null}

          <SectionTitle
            title="Yaklaşan hatırlatmalar"
            description="Bakım ve kontrol zamanları"
            action={
              <Button label="Tümü" size="sm" variant="ghost" onPress={() => router.push('/reminders')} />
            }
          />
          {data.reminders.length === 0 ? (
            <Card>
              <Text style={styles.muted}>Bekleyen hatırlatma yok. Yeni bir kayıt eklerken hatırlatma tarihi verebilirsiniz.</Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {data.reminders.map((reminder) => (
                <EntryRow
                  key={reminder.id}
                  entry={reminder}
                  assetName={reminder.assetName}
                  onPress={() => router.push(`/entry/${reminder.id}`)}
                />
              ))}
            </View>
          )}

          <SectionTitle
            title="Son kayıtlar"
            description="Tüm varlıklardan en yeni hareketler"
            action={
              <Button label="Varlıklar" size="sm" variant="ghost" onPress={() => router.push('/assets')} />
            }
          />
          {data.recent.length === 0 ? (
            <Card>
              <Text style={styles.muted}>Henüz kayıt yok.</Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {data.recent.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  assetName={entry.assetName}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                />
              ))}
            </View>
          )}

          <SectionTitle
            title="Aktarım merkezi"
            description="Rapor, fotoğraf arşivi ve tam yedek"
            action={<Button label="Aç" size="sm" variant="secondary" onPress={() => router.push('/transfer')} />}
          />
          <Card onPress={() => router.push('/transfer')}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Verileriniz sizinle</Text>
                <Text style={styles.muted}>
                  {data.stats.media} fotoğraf · {formatBytes(data.stats.bytes)} yerel medya
                </Text>
              </View>
              {lastBackup ? (
                <Badge
                  label={exportStatusMeta[lastBackup.status]?.label ?? lastBackup.status}
                  tone={exportStatusMeta[lastBackup.status]?.tone ?? 'muted'}
                />
              ) : (
                <Badge label="Yedek yok" tone="warning" />
              )}
            </View>
            <Text style={styles.muted}>
              {lastBackup
                ? `Son yedek: ${formatDateTime(lastBackup.completedAt ?? lastBackup.startedAt)}`
                : 'İlk tam yedeğinizi oluşturmanız önerilir.'}
            </Text>
            {data.stats.dueReminders > 0 ? (
              <Text style={styles.today}>
                {formatShortDate(new Date().toISOString())} · {data.stats.dueReminders} hatırlatma bekliyor
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  actions: { flexDirection: 'row', gap: theme.space.sm },
  actionButton: { flex: 1 },
  list: { gap: theme.space.sm },
  muted: { fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.ink, marginBottom: 2 },
  today: { fontSize: 11, color: theme.colors.gold, fontWeight: '600' },
});
