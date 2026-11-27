import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Loading,
  Notice,
  ProgressBar,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { AssetSelectList } from '@/components/asset-select-list';
import { listAllAssetsForExport } from '@/src/db/repo';
import { formatBytes, parseLocalInput } from '@/src/lib/format';
import { createPhotoArchive, photoArchiveSummary, type PhotoArchiveResult } from '@/src/services/photos';
import { shareJobFile } from '@/src/services/share';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';
import type { PhotoExportOptions } from '@/src/types';

export default function PhotoExportScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includeIndex, setIncludeIndex] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);
  const [result, setResult] = useState<PhotoArchiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: assets, loading } = useAsyncData(() => listAllAssetsForExport(), []);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
    setResult(null);
  };

  const buildOptions = (): PhotoExportOptions | null => {
    let fromIso: string | null = null;
    let toIso: string | null = null;
    if (from.trim()) {
      fromIso = parseLocalInput(from.trim());
      if (!fromIso) {
        setError('Başlangıç tarihi YYYY-AA-GG biçiminde olmalı.');
        return null;
      }
    }
    if (to.trim()) {
      const text = to.trim();
      toIso = parseLocalInput(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text} 23:59` : text);
      if (!toIso) {
        setError('Bitiş tarihi YYYY-AA-GG biçiminde olmalı.');
        return null;
      }
    }
    return { assetIds: selected, from: fromIso, to: toIso, includeIndex };
  };

  const create = async () => {
    setError(null);
    setResult(null);
    const options = buildOptions();
    if (!options) return;
    setBusy(true);
    setProgress({ percent: 0, message: 'Hazırlanıyor' });
    try {
      const created = await createPhotoArchive(options, setProgress);
      setResult(created);
      Alert.alert('Fotoğraf arşivi hazır', photoArchiveSummary(created));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Fotoğraf arşivi oluşturulamadı.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const share = async () => {
    if (!result) return;
    try {
      await shareJobFile(result.job);
      setResult({ ...result, job: { ...result.job, status: 'SHARED' } });
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
      <Stack.Screen options={{ title: 'Fotoğrafları aktar' }} />
      <Screen>
        <SectionTitle
          title="Fotoğraf arşivi"
          description="Orijinal fotoğraflar anlamlı klasör yapısıyla ZIP olarak paketlenir. Hiç seçim yapmazsanız tüm varlıklar dahil edilir."
        />

        {loading ? <Loading label="Varlıklar yükleniyor…" /> : null}
        {assets && assets.length > 0 ? (
          <AssetSelectList assets={assets} selected={selected} onToggle={toggle} />
        ) : null}
        {assets && assets.length === 0 ? <Notice title="Fotoğraf yok" tone="warning">Önce varlık ve fotoğraf ekleyin.</Notice> : null}

        <SectionTitle title="Tarih aralığı" description="Kayıt tarihine göre filtreler. Boş bırakılırsa tümü." />
        <View style={styles.twoCols}>
          <Field label="Başlangıç" value={from} onChangeText={setFrom} placeholder="YYYY-AA-GG" style={styles.flex} />
          <Field label="Bitiş" value={to} onChangeText={setTo} placeholder="YYYY-AA-GG" style={styles.flex} />
        </View>

        <View style={styles.chips}>
          <Chip
            label="Metadata CSV ekle"
            active={includeIndex}
            onPress={() => setIncludeIndex(!includeIndex)}
          />
        </View>

        <Notice title="Klasör yapısı" tone="info">
          Bonsai/Delice-Zeytin/2026-04-20_Budama/foto_001.jpg{'\n'}
          Varlık türü / varlık adı / tarih_kayıt başlığı. Özgün dosya adları yerine sıralı adlar kullanılır;
          tüm bilgiler metadata/kayitlar.csv içinde korunur.
        </Notice>

        {error ? <Notice title="Arşiv oluşturulamadı" tone="danger">{error}</Notice> : null}
        {progress ? <ProgressBar percent={progress.percent} label={progress.message} /> : null}

        <Button label="Fotoğraf arşivini oluştur" onPress={create} loading={busy} size="lg" />

        {result ? (
          <Card tone="green">
            <View style={styles.rowBetween}>
              <Text style={styles.resultTitle}>Arşiv hazır</Text>
              <Badge label={result.job.status === 'SHARED' ? 'Paylaşıldı' : 'Hazır'} tone="green" />
            </View>
            <Text style={styles.resultMeta}>{photoArchiveSummary(result)}</Text>
            <Text style={styles.fileName}>{result.job.fileName}</Text>
            {result.missing.length > 0 ? (
              <Text style={styles.warning}>{result.missing.length} dosya okunamadı ve arşive eklenmedi.</Text>
            ) : null}
            <Button label="Paylaşım ekranına gönder" onPress={share} variant="gold" />
            <Text style={styles.caveat}>
              “Paylaşıldı” yalnızca dosyanın işletim sistemi paylaşım ekranına verildiğini gösterir.
            </Text>
          </Card>
        ) : null}

        <Notice title="Orijinaller korunur" tone="green">
          Bu işlem fotoğrafları silmez veya değiştirmez; yalnızca okur ve ZIP içine kopyalar.
        </Notice>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  twoCols: { flexDirection: 'row', gap: theme.space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.green },
  resultMeta: { fontSize: 12, color: theme.colors.inkSoft },
  fileName: { fontSize: 11, color: theme.colors.muted },
  warning: { fontSize: 11, color: theme.colors.warning },
  caveat: { fontSize: 10.5, color: theme.colors.muted, lineHeight: 15 },
});
