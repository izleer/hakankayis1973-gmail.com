import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  KeyValue,
  Loading,
  Notice,
  ProgressBar,
  Screen,
  SectionTitle,
  StatTile,
} from '@/components/ui';
import { JobRow } from '@/components/job-row';
import { getStats, listExportJobs } from '@/src/db/repo';
import { formatBytes, formatDateTime } from '@/src/lib/format';
import { createBackup, type BackupResult } from '@/src/services/backup';
import { shareJobFile } from '@/src/services/share';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';

export default function BackupScreen() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);
  const [result, setResult] = useState<BackupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, reload } = useAsyncData(async () => {
    const [stats, jobs] = await Promise.all([getStats(), listExportJobs(20)]);
    return { stats, jobs: jobs.filter((job) => job.exportType === 'backup') };
  }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ percent: 0, message: 'Hazırlanıyor' });
    try {
      const created = await createBackup({ reason: 'manual', label: 'Elle alınan yedek' }, setProgress);
      setResult(created);
      await reload();
      Alert.alert('Yedek hazır', `${created.fileCount} dosya paketlendi. Şimdi paylaşım ekranına gönderebilirsiniz.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Yedek oluşturulamadı.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const share = async (jobId?: string) => {
    const job = jobId ? data?.jobs.find((item) => item.id === jobId) : result?.job;
    if (!job) return;
    try {
      await shareJobFile(job);
      await reload();
      Alert.alert(
        'Paylaşım ekranına verildi',
        'Dosyanın hedef cihaza kaydedildiğini doğrulayamıyoruz. Kaydetmeyi paylaşım ekranında tamamlayın.',
      );
    } catch (caught) {
      Alert.alert('Paylaşılamadı', caught instanceof Error ? caught.message : 'Bilinmeyen hata');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Tam yedek' }} />
      <Screen refreshing={loading} onRefresh={reload}>
        <SectionTitle
          title="Tüm İzleer verilerimi yedekle"
          description="Veritabanı, fotoğraflar, ölçümler ve hatırlatmalar tek .izleer arşivinde."
        />

        {loading && !data ? <Loading label="Arşiv durumu okunuyor…" /> : null}
        {data ? (
          <View style={styles.stats}>
            <StatTile label="Varlık" value={String(data.stats.assets)} />
            <StatTile label="Kayıt" value={String(data.stats.entries)} />
            <StatTile label="Fotoğraf" value={String(data.stats.media)} />
            <StatTile label="Medya boyutu" value={formatBytes(data.stats.bytes)} />
          </View>
        ) : null}

        <Card>
          <KeyValue label="Format" value="izleer-backup v1" />
          <KeyValue label="Veritabanı" value="Tutarlı SQLite anlık görüntüsü" />
          <KeyValue label="Medya" value="assets/ altında orijinal dosyalar" />
          <KeyValue label="Bütünlük" value="Her dosya için SHA-256" />
          <KeyValue label="Uzantı" value=".izleer (ZIP tabanlı)" />
        </Card>

        {error ? <Notice title="Yedek oluşturulamadı" tone="danger">{error}</Notice> : null}
        {progress ? <ProgressBar percent={progress.percent} label={progress.message} /> : null}

        <Button label="Yedek oluştur" onPress={create} loading={busy} size="lg" />

        {result ? (
          <Card tone="green">
            <View style={styles.rowBetween}>
              <Text style={styles.resultTitle}>Yedek hazır</Text>
              <Badge label="Hazır" tone="green" />
            </View>
            <Text style={styles.fileName}>{result.job.fileName}</Text>
            <Text style={styles.resultMeta}>
              {result.fileCount} dosya · {result.manifest.counts.assets} varlık ·{' '}
              {result.manifest.counts.entries} kayıt · {formatBytes(result.manifest.bytes.total)}
            </Text>
            {result.skippedMedia > 0 ? (
              <Text style={styles.warning}>
                {result.skippedMedia} medya dosyası okunamadı ve arşive eklenmedi. Bu yedek eksik
                olabilir; geri yükleme öncesinde yeni bir yedek almanız önerilir.
              </Text>
            ) : null}
            <Button label="Paylaşım ekranına gönder" onPress={() => share()} variant="gold" />
          </Card>
        ) : null}

        <Notice title="Güvenlik kuralları" tone="info">
          Yedekleme orijinal verileri değiştirmez veya silmez. Geri yükleme öncesinde mevcut veritabanınız
          otomatik olarak yedeklenir. Aynı arşiv iki kez yüklenirse UUID sayesinde çift kayıt oluşmaz.
        </Notice>
        <Notice title="Parola koruması" tone="warning">
          Arşiv parolası bu sürümde yok. Sonraki sürümde isteğe bağlı AES parola koruması eklenecek.
          Yedeği güvenli bir yerde saklayın.
        </Notice>

        <SectionTitle title="Önceki yedekler" description="Bu cihazda üretilen .izleer arşivleri" />
        {data && data.jobs.length > 0 ? (
          <View style={styles.jobs}>
            {data.jobs.map((job) => (
              <JobRow key={job.id} job={job} onShare={() => share(job.id)} />
            ))}
          </View>
        ) : (
          <Card>
            <Text style={styles.muted}>Henüz yedek yok.</Text>
          </Card>
        )}

        {data && data.jobs[0]?.completedAt ? (
          <Text style={styles.muted}>Son yedek: {formatDateTime(data.jobs[0].completedAt)}</Text>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.green },
  resultMeta: { fontSize: 12, color: theme.colors.inkSoft },
  warning: { fontSize: 11, color: theme.colors.warning, lineHeight: 16 },
  fileName: { fontSize: 11, color: theme.colors.muted },
  jobs: { gap: theme.space.sm },
  muted: { fontSize: 12, color: theme.colors.muted },
});
