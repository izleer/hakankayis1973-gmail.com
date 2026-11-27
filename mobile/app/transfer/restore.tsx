import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  KeyValue,
  Notice,
  ProgressBar,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { formatBytes, formatDateTime } from '@/src/lib/format';
import { pickBackupArchive, restoreBackup } from '@/src/services/backup';
import { theme } from '@/src/theme';
import type { RestorePreview, RestoreResult } from '@/src/types';

export default function RestoreScreen() {
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [picking, setPicking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setPicking(true);
    setError(null);
    setResult(null);
    try {
      const selected = await pickBackupArchive();
      if (selected) setPreview(selected);
    } catch (caught) {
      setPreview(null);
      setError(caught instanceof Error ? caught.message : 'Yedek açılamadı.');
    } finally {
      setPicking(false);
    }
  };

  const start = () => {
    if (!preview) return;
    Alert.alert(
      'Yedekten geri yükle',
      'Mevcut verileriniz silinmez; yedekteki kayıtlar UUID’ye göre birleştirilir. İşlemden önce güvenlik yedeği alınır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Geri yükle', onPress: run },
      ],
    );
  };

  const run = async () => {
    if (!preview) return;
    setRestoring(true);
    setError(null);
    setProgress({ percent: 0, message: 'Başlıyor' });
    try {
      const restored = await restoreBackup(preview, { onProgress: setProgress, verifyMedia: true });
      setResult(restored);
      setPreview(null);
      Alert.alert(
        'Geri yükleme tamamlandı',
        `${restored.assets} varlık, ${restored.entries} kayıt ve ${restored.media} medya satırı arşivde.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Geri yükleme başarısız.');
    } finally {
      setRestoring(false);
      setProgress(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Yedekten geri yükle' }} />
      <Screen>
        <SectionTitle
          title="Başka cihazdan gelen arşivi aç"
          description=".izleer dosyasını seçin. Manifest ve SHA-256 bütünlüğü doğrulanmadan hiçbir veri değiştirilmez."
        />

        <Button
          label={preview ? 'Başka yedek seç' : 'Yedek dosyası seç'}
          onPress={pick}
          loading={picking}
          variant="secondary"
          size="lg"
        />

        {error ? <Notice title="Geri yükleme yapılmadı" tone="danger">{error}</Notice> : null}
        {progress ? <ProgressBar percent={progress.percent} label={progress.message} /> : null}

        {preview ? (
          <>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.fileName}>{preview.archiveName}</Text>
                <Badge label={`Format v${preview.manifest.formatVersion}`} tone="green" />
              </View>
              <KeyValue label="Yedek tarihi" value={formatDateTime(preview.manifest.createdAt)} />
              <KeyValue label="Uygulama sürümü" value={preview.manifest.appVersion} />
              <KeyValue label="Varlık" value={String(preview.manifest.counts.assets)} />
              <KeyValue label="Kayıt" value={String(preview.manifest.counts.entries)} />
              <KeyValue label="Medya" value={String(preview.manifest.counts.media)} />
              <KeyValue label="Veritabanı boyutu" value={formatBytes(preview.manifest.bytes.database)} />
              <KeyValue label="Toplam boyut" value={formatBytes(preview.manifest.bytes.total)} />
              <KeyValue label="Arşivdeki medya dosyası" value={String(preview.mediaCount)} />
              <KeyValue label="Cihaz" value={preview.manifest.device.platform} />
            </Card>

            {preview.missingMedia.length > 0 ? (
              <Notice title="Yedek eksik dosyalar içeriyor" tone="danger">
                {preview.missingMedia.length} medya dosyası manifestte yok. Bozuk veya yarım arşivlerin geri
                yüklenmesi engellenir. Lütfen tam bir yedek seçin.
              </Notice>
            ) : (
              <Notice title="Birleştirme modu" tone="info">
                Mevcut verileriniz silinmez. Aynı UUID’ye sahip kayıtlar güncellenir, yenileri eklenir.
                İşlemden önce mevcut arşivinizin güvenlik yedeği otomatik alınır. Abonelik yetkisi yedeğe
                dahil değildir ve geri yüklenmez.
              </Notice>
            )}

            <Button
              label="Geri yüklemeyi başlat"
              onPress={start}
              loading={restoring}
              disabled={preview.missingMedia.length > 0}
              size="lg"
            />
          </>
        ) : null}

        {result ? (
          <Card tone="green">
            <Text style={styles.resultTitle}>Geri yükleme tamamlandı</Text>
            <KeyValue label="Arşivdeki varlık" value={String(result.assets)} />
            <KeyValue label="Arşivdeki kayıt" value={String(result.entries)} />
            <KeyValue label="Medya satırı" value={String(result.media)} />
            <KeyValue label="Yeni kopyalanan dosya" value={String(result.restoredFiles)} />
            <KeyValue label="Güvenlik yedeği" value={result.preRestoreBackup?.split('/').pop() ?? 'Alındı'} />
            <Button label="Varlıklara git" onPress={() => router.replace('/assets')} />
          </Card>
        ) : null}

        <Notice title="Neler geri yüklenir?" tone="warning">
          Varlıklar, kayıtlar, ölçümler, hatırlatmalar, fotoğraflar ve varlık türleri. Aktarım işi geçmişi
          ve abonelik önbelleği geri yüklenmez; bunlar cihaza özgüdür.
        </Notice>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  fileName: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.ink },
  resultTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.green },
});
