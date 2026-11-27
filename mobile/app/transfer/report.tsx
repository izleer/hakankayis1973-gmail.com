import { useEffect, useMemo, useState } from 'react';
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
import { parseLocalInput } from '@/src/lib/format';
import { createReport, reportDescription, reportLabel, type ProgressEvent } from '@/src/services/report';
import { shareJobFile } from '@/src/services/share';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { theme } from '@/src/theme';
import type { ExportJob, ReportFormat, ReportKind, ReportOptions } from '@/src/types';

const KINDS: ReportKind[] = ['asset-history', 'photo-growth', 'measurements', 'all-assets'];
const FORMATS: Array<{ value: ReportFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
];

export default function ReportScreen() {
  const [kind, setKind] = useState<ReportKind>('asset-history');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeEntries, setIncludeEntries] = useState(true);
  const [includeMeasurements, setIncludeMeasurements] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<{ job: ExportJob; entries: number; assets: number; photos: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: assets, loading } = useAsyncData(() => listAllAssetsForExport(), []);

  useEffect(() => {
    if (kind === 'measurements') {
      setIncludeMeasurements(true);
      setIncludePhotos(false);
    }
    if (kind === 'photo-growth') {
      setIncludePhotos(true);
    }
  }, [kind]);

  const single = kind === 'asset-history' || kind === 'photo-growth';
  const needsSelection = single || kind === 'measurements';

  const toggle = (id: string) => {
    setSelected((current) => {
      if (single) return current.includes(id) ? [] : [id];
      return current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    });
    setResult(null);
  };

  const buildOptions = (): ReportOptions | null => {
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
    if (needsSelection && selected.length === 0) {
      setError('Lütfen en az bir varlık seçin.');
      return null;
    }
    return {
      kind,
      format,
      assetIds: selected,
      from: fromIso,
      to: toIso,
      includePhotos,
      includeEntries,
      includeMeasurements,
      includeNotes,
    };
  };

  const create = async () => {
    setError(null);
    setResult(null);
    const options = buildOptions();
    if (!options) return;
    setBusy(true);
    setProgress({ percent: 0, message: 'Hazırlanıyor' });
    try {
      const created = await createReport(options, setProgress);
      setResult({
        job: created.job,
        entries: created.entryCount,
        assets: created.assetCount,
        photos: created.photoCount,
      });
      Alert.alert(
        'Rapor hazır',
        `${created.assetCount} varlık ve ${created.entryCount} kayıt işlendi. Şimdi paylaşım ekranına gönderebilirsiniz.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Rapor oluşturulamadı.');
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
        'Dosyanın bilgisayarınıza kaydedildiğini doğrulayamıyoruz. Kaydetmeyi paylaşım ekranında tamamlayın.',
      );
    } catch (caught) {
      Alert.alert('Paylaşılamadı', caught instanceof Error ? caught.message : 'Bilinmeyen hata');
    }
  };

  const description = useMemo(() => reportDescription(kind), [kind]);

  return (
    <>
      <Stack.Screen options={{ title: 'Rapor oluştur' }} />
      <Screen>
        <SectionTitle title="Rapor türü" description={description} />
        <View style={styles.chips}>
          {KINDS.map((value) => (
            <Chip
              key={value}
              label={reportLabel(value)}
              active={kind === value}
              onPress={() => {
                setKind(value);
                setResult(null);
                setSelected([]);
              }}
            />
          ))}
        </View>

        <SectionTitle title="Dosya biçimi" />
        <View style={styles.chips}>
          {FORMATS.map((item) => (
            <Chip key={item.value} label={item.label} active={format === item.value} onPress={() => setFormat(item.value)} />
          ))}
        </View>

        <SectionTitle
          title="Kapsam"
          description={
            single
              ? 'Tek bir varlık seçin.'
              : kind === 'all-assets'
                ? 'Hiç seçim yapmazsanız tüm varlıklar dahil edilir.'
                : 'Ölçüm raporu için varlık seçin.'
          }
        />
        {loading ? <Loading label="Varlıklar yükleniyor…" /> : null}
        {assets && assets.length > 0 ? (
          <AssetSelectList assets={assets} selected={selected} onToggle={toggle} single={single} />
        ) : null}
        {assets && assets.length === 0 ? <Notice title="Varlık yok" tone="warning">Önce bir varlık ekleyin.</Notice> : null}

        <SectionTitle title="Tarih aralığı" description="Boş bırakılırsa tüm zamanlar dahil edilir." />
        <View style={styles.twoCols}>
          <Field label="Başlangıç" value={from} onChangeText={setFrom} placeholder="YYYY-AA-GG" style={styles.flex} />
          <Field label="Bitiş" value={to} onChangeText={setTo} placeholder="YYYY-AA-GG" style={styles.flex} />
        </View>

        <SectionTitle title="İçerik" />
        <View style={styles.chips}>
          <Chip label="Fotoğraflar" active={includePhotos} onPress={() => setIncludePhotos(!includePhotos)} />
          <Chip label="Hareketler" active={includeEntries} onPress={() => setIncludeEntries(!includeEntries)} />
          <Chip
            label="Ölçümler"
            active={includeMeasurements}
            onPress={() => setIncludeMeasurements(!includeMeasurements)}
          />
          <Chip label="Notlar" active={includeNotes} onPress={() => setIncludeNotes(!includeNotes)} />
        </View>

        {error ? <Notice title="Rapor oluşturulamadı" tone="danger">{error}</Notice> : null}
        {progress ? <ProgressBar percent={progress.percent} label={progress.message} /> : null}

        <Button
          label={format === 'pdf' ? 'PDF raporu oluştur' : format === 'csv' ? 'CSV raporu oluştur' : 'Excel raporu oluştur'}
          onPress={create}
          loading={busy}
          size="lg"
        />

        {result ? (
          <Card tone="green">
            <View style={styles.rowBetween}>
              <Text style={styles.resultTitle}>Rapor hazır</Text>
              <Badge label={result.job.status === 'SHARED' ? 'Paylaşıldı' : 'Hazır'} tone="green" />
            </View>
            <Text style={styles.resultMeta}>
              {result.assets} varlık · {result.entries} kayıt · {result.photos} fotoğraf
            </Text>
            <Text style={styles.fileName}>{result.job.fileName}</Text>
            <Button label="Paylaşım ekranına gönder" onPress={share} variant="gold" />
            <Text style={styles.caveat}>
              “Paylaşıldı” yalnızca dosyanın işletim sistemi paylaşım ekranına verildiğini gösterir.
            </Text>
          </Card>
        ) : null}

        <Notice title="Rapor nerede üretilir?" tone="info">
          Rapor tamamen cihazınızda hazırlanır. Fotoğraflar sunucuya yüklenmez. PDF’e en fazla 28 fotoğraf
          eklenir; tam fotoğraf arşivi için “Fotoğrafları aktar” ekranını kullanın.
        </Notice>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  twoCols: { flexDirection: 'row', gap: theme.space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.green },
  resultMeta: { fontSize: 12, color: theme.colors.inkSoft },
  fileName: { fontSize: 11, color: theme.colors.muted },
  caveat: { fontSize: 10.5, color: theme.colors.muted, lineHeight: 15 },
});
