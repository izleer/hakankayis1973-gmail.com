import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { Directory, File } from 'expo-file-system';
import {
  Badge,
  Button,
  Card,
  Divider,
  KeyValue,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  StatTile,
} from '@/components/ui';
import { getStats, listExportJobs } from '@/src/db/repo';
import { databaseFileUri, databaseSchemaVersion } from '@/src/db';
import { formatBytes, formatDateTime } from '@/src/lib/format';
import { ensureDirectory, exportsRoot, mediaRoot, workRoot } from '@/src/lib/paths';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';
import { SCHEMA_VERSION } from '@/src/db/schema';

function directorySize(directory: Directory): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  try {
    if (!directory.exists) return { bytes, files };
    for (const entry of directory.list()) {
      if (entry instanceof File) {
        bytes += entry.size ?? 0;
        files += 1;
      } else {
        const nested = directorySize(entry);
        bytes += nested.bytes;
        files += nested.files;
      }
    }
  } catch {
    // Erişilemeyen klasörler toplamı bozmaz.
  }
  return { bytes, files };
}

function fileSize(uri: string): number {
  try {
    const file = new File(uri);
    return file.exists ? file.size ?? 0 : 0;
  } catch {
    return 0;
  }
}

export default function SettingsScreen() {
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [stats, jobs, schemaVersion, dbUri] = await Promise.all([
      getStats(),
      listExportJobs(200),
      databaseSchemaVersion(),
      databaseFileUri(),
    ]);
    const media = directorySize(mediaRoot());
    const exports = directorySize(exportsRoot());
    const cache = directorySize(workRoot());
    return { stats, jobs, schemaVersion, dbUri, media, exports, cache };
  }, []);

  const clearCache = () => {
    Alert.alert(
      'Geçici dosyaları temizle',
      'Yarım kalan aktarım işlerinin geçici kopyaları silinir. Arşiviniz, fotoğraflarınız ve hazır raporlarınız etkilenmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          onPress: async () => {
            setCleaning(true);
            setMessage(null);
            try {
              const root = workRoot();
              if (root.exists) root.delete();
              ensureDirectory(root);
              setMessage('Geçici dosyalar temizlendi.');
              await reload();
            } catch (caught) {
              setMessage(caught instanceof Error ? caught.message : 'Temizlik yapılamadı.');
            } finally {
              setCleaning(false);
            }
          },
        },
      ],
    );
  };

  const dbBytes = data ? fileSize(data.dbUri) : 0;
  const backupJobs = data?.jobs.filter((job) => job.exportType === 'backup') ?? [];
  const lastBackup = backupJobs.find((job) => job.status !== 'FAILED');
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <>
      <Stack.Screen options={{ title: 'Ayarlar' }} />
      <Screen refreshing={loading} onRefresh={reload}>
        <SectionTitle title="Abonelik" description="Yerel arşiv ve dışa aktarma her zaman ücretsizdir." />
        <Card tone="green">
          <View style={styles.rowBetween}>
            <Text style={styles.plan}>Ücretsiz plan</Text>
            <Badge label="Etkin" tone="green" />
          </View>
          <Text style={styles.muted}>
            Varlıklar, kayıtlar, ölçümler, hatırlatmalar, fotoğraflar, raporlar ve tam yedek bu planda
            sınırsız çalışır. Kendi verinizi dışa aktarmak hiçbir zaman ücretli olmayacak.
          </Text>
        </Card>

        <Notice title="Premium ve Premium Plus yakında" tone="info">
          Abonelikler Google Play / App Store üzerinden yönetilecek ve sunucuda doğrulanacak. Sunucu
          tarafı doğrulama altyapısı hazır; bu sürümde satın alma ekranı ve mağaza bağlantısı yok,
          hiçbir ücret alınmaz. Abonelik sona erdiğinde verileriniz silinmez.
        </Notice>

        <SectionTitle title="Depolama" description="Tüm veriler bu cihazda tutulur." />
        {loading && !data ? <Loading label="Depolama ölçülüyor…" /> : null}
        {error ? <Notice title="Depolama okunamadı" tone="danger">{error}</Notice> : null}
        {data ? (
          <>
            <View style={styles.stats}>
              <StatTile label="Veritabanı" value={formatBytes(dbBytes)} />
              <StatTile label="Fotoğraf" value={formatBytes(data.media.bytes)} />
            </View>
            <View style={styles.stats}>
              <StatTile label="Hazır dosyalar" value={formatBytes(data.exports.bytes)} />
              <StatTile label="Geçici" value={formatBytes(data.cache.bytes)} />
            </View>

            <Card>
              <KeyValue label="Varlık" value={String(data.stats.assets)} />
              <KeyValue label="Kayıt" value={String(data.stats.entries)} />
              <KeyValue label="Medya satırı" value={String(data.stats.media)} />
              <KeyValue label="Medya dosyası" value={String(data.media.files)} />
              <KeyValue label="Arşivdeki varlık" value={String(data.stats.archived)} />
              <KeyValue label="Hazır aktarım dosyası" value={String(data.exports.files)} />
              <Divider />
              <Button
                label={cleaning ? 'Temizleniyor…' : 'Geçici dosyaları temizle'}
                variant="secondary"
                onPress={clearCache}
                loading={cleaning}
              />
              {message ? <Text style={styles.muted}>{message}</Text> : null}
            </Card>
          </>
        ) : null}

        <SectionTitle title="Yedekleme" description="Veritabanı ve fotoğraflar tek arşivde." />
        <Card>
          <KeyValue label="Son yedek" value={lastBackup ? formatDateTime(lastBackup.completedAt ?? lastBackup.startedAt) : 'Henüz yok'} />
          <KeyValue label="Yedek sayısı" value={String(backupJobs.length)} />
          <KeyValue label="Arşiv biçimi" value=".izleer (ZIP tabanlı)" />
          <KeyValue label="Bütünlük" value="SHA-256" />
          <KeyValue label="Şema sürümü" value={`v${data?.schemaVersion ?? SCHEMA_VERSION}`} />
          <Divider />
          <Text style={styles.muted}>
            Yedek, tutarlı bir SQLite anlık görüntüsü, orijinal fotoğraflar ve metadata içerir. Geri
            yükleme öncesinde mevcut arşivin güvenlik yedeği otomatik alınır.
          </Text>
        </Card>

        <SectionTitle title="Gizlilik ve güvenlik" />
        <Card>
          <Text style={styles.muted}>
            İzleer yerel öncelikli çalışır: internet bağlantısı olmadan varlık, kayıt, ölçüm, fotoğraf ve
            rapor işlemleri tamamlanır. Bu sürümde hiçbir veri sunucuya yüklenmez, reklam veya analitik
            ağı kullanılmaz.
          </Text>
          <Divider />
          <Text style={styles.muted}>
            Dosyalar uygulamanın özel belge klasöründe saklanır. Cihaz yedeğinden çıkarılan .izleer
            dosyaları parola korumalı değildir; güvenli bir yerde saklayın.
          </Text>
        </Card>

        <SectionTitle title="Hakkında" />
        <Card>
          <KeyValue label="Uygulama" value="izleer" />
          <KeyValue label="Sürüm" value={version} />
          <KeyValue label="Paket" value={Constants.expoConfig?.android?.package ?? 'app.izleer.mobile'} />
          <KeyValue label="Platform" value={String(Constants.platform?.android ? 'Android' : Constants.platform?.ios ? 'iOS' : 'Web')} />
          <KeyValue label="Çalışma biçimi" value="Yerel öncelikli (local-first)" />
        </Card>

        <Notice title="Sonraki sürüm" tone="warning">
          Bulut eşitleme, seçili kişilerle paylaşım, QR/Wi-Fi ile aktarım, parola korumalı yedek ve
          abonelik yönetimi planlanıyor. Bu sürüm yalnızca yerel çekirdek ve aktarım merkezini içerir.
        </Notice>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  plan: { fontFamily: 'serif', fontSize: 20, color: theme.colors.green, fontWeight: '700' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  muted: { fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
});
