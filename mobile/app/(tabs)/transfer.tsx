import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppHeader, Badge, Button, Card, Loading, Notice, Screen, SectionTitle, StatTile } from '@/components/ui';
import { JobRow } from '@/components/job-row';
import { getStats, listExportJobs } from '@/src/db/repo';
import { formatBytes } from '@/src/lib/format';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { shareJobFile } from '@/src/services/share';
import { theme } from '@/src/theme';

const TRANSFER_CARDS = [
  {
    key: 'report',
    title: 'Raporları aktar',
    description: 'PDF, CSV veya Excel raporları oluştur. Varlık geçmişi, ölçümler ve fotoğraf gelişimi.',
    route: '/transfer/report',
    badge: 'Ücretsiz',
  },
  {
    key: 'photos',
    title: 'Fotoğrafları aktar',
    description: 'Orijinal fotoğrafları anlamlı klasör yapısıyla ZIP arşivi olarak dışa çıkar.',
    route: '/transfer/photos',
    badge: 'Ücretsiz',
  },
  {
    key: 'backup',
    title: 'Tüm verilerimi yedekle',
    description: 'SQLite anlık görüntüsü, fotoğraflar ve metadata tek .izleer arşivinde.',
    route: '/transfer/backup',
    badge: 'Ücretsiz',
  },
  {
    key: 'restore',
    title: 'Yedekten geri yükle',
    description: 'Başka telefondan veya bilgisayardan alınmış arşivi birleştirerek geri yükle.',
    route: '/transfer/restore',
    badge: 'Ücretsiz',
  },
] as const;

export default function TransferScreen() {
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [stats, jobs] = await Promise.all([getStats(), listExportJobs(6)]);
    return { stats, jobs };
  }, []);

  const share = async (jobId: string) => {
    const job = data?.jobs.find((item) => item.id === jobId);
    if (!job) return;
    try {
      await shareJobFile(job);
      Alert.alert(
        'Paylaşım ekranına verildi',
        'Dosyanın hedef cihaza kaydedildiğini doğrulayamıyoruz. Kaydetme işlemini paylaşım ekranında tamamlayın.',
      );
      await reload();
    } catch (caught) {
      Alert.alert('Paylaşılamadı', caught instanceof Error ? caught.message : 'Bilinmeyen hata');
    }
  };

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <AppHeader
        eyebrow="Veri ve Aktarım Merkezi"
        title="Aktarım"
        subtitle="Verilerinizi bilgisayarınıza aktarın, yedekleyin veya raporlarınızı dışa çıkarın. Hepsi cihaz üzerinde üretilir."
      />

      {error ? <Notice title="Arşiv durumu okunamadı" tone="danger">{error}</Notice> : null}
      {loading && !data ? <Loading label="Arşiv durumu okunuyor…" /> : null}

      {data ? (
        <>
          <View style={styles.stats}>
            <StatTile label="Varlık" value={String(data.stats.assets)} />
            <StatTile label="Hareket kaydı" value={String(data.stats.entries)} />
            <StatTile label="Medya boyutu" value={formatBytes(data.stats.bytes)} />
          </View>

          <View style={styles.cards}>
            {TRANSFER_CARDS.map((item) => (
              <Card key={item.key} onPress={() => router.push(item.route)}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Badge label={item.badge} tone="green" />
                </View>
                <Text style={styles.cardDescription}>{item.description}</Text>
                <Text style={styles.cardLink}>Aç →</Text>
              </Card>
            ))}
          </View>

          <Notice title="Aktarım nasıl çalışır?" tone="info">
            İlk sürümde dosya, işletim sisteminin paylaşım ekranına verilir. Bu ekrandan bilgisayarınıza,
            bulut sürücünüze veya bir dosya yöneticisine gönderebilirsiniz. “Paylaşıldı” durumu, dosyanın
            hedef cihaza kaydedildiğini kanıtlamaz. QR/Wi-Fi aktarımı sonraki sürümde planlanıyor.
          </Notice>

          <SectionTitle
            title="Son aktarımlar"
            description="Rapor, fotoğraf arşivi ve yedek işleri"
            action={
              <Button label="Tümü" size="sm" variant="ghost" onPress={() => router.push('/transfer/jobs')} />
            }
          />
          {data.jobs.length === 0 ? (
            <Card>
              <Text style={styles.muted}>Henüz aktarım işi yok. İlk yedeğinizi oluşturun.</Text>
            </Card>
          ) : (
            <View style={styles.jobs}>
              {data.jobs.slice(0, 4).map((job) => (
                <JobRow key={job.id} job={job} onShare={() => share(job.id)} />
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  cards: { gap: theme.space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontFamily: 'serif', fontSize: 18, color: theme.colors.ink, fontWeight: '600' },
  cardDescription: { fontSize: 12, color: theme.colors.inkSoft, lineHeight: 18 },
  cardLink: { fontSize: 11.5, color: theme.colors.green, fontWeight: '700', marginTop: 2 },
  jobs: { gap: theme.space.sm },
  muted: { fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
});
