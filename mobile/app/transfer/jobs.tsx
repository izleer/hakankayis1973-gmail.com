import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { File } from 'expo-file-system';
import { Chip, EmptyState, Loading, Notice, Screen, SectionTitle } from '@/components/ui';
import { JobRow } from '@/components/job-row';
import { deleteExportJob, listExportJobs } from '@/src/db/repo';
import { formatBytes } from '@/src/lib/format';
import { useAsyncData } from '@/src/hooks/useAsyncData';
import { shareJobFile } from '@/src/services/share';
import { exportTypeMeta, theme } from '@/src/theme';
import type { ExportType } from '@/src/types';

const FILTERS: Array<{ value: ExportType | 'all'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'report', label: 'Raporlar' },
  { value: 'photos', label: 'Fotoğraflar' },
  { value: 'backup', label: 'Yedekler' },
];

export default function JobsScreen() {
  const [filter, setFilter] = useState<ExportType | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncData(() => listExportJobs(300), []);

  const jobs = useMemo(() => {
    const rows = data ?? [];
    return filter === 'all' ? rows : rows.filter((job) => job.exportType === filter);
  }, [data, filter]);

  const totalBytes = (data ?? []).reduce((sum, job) => sum + (job.filePath ? job.totalBytes : 0), 0);

  const share = async (id: string) => {
    const job = data?.find((item) => item.id === id);
    if (!job) return;
    setBusyId(id);
    try {
      await shareJobFile(job);
      Alert.alert(
        'Paylaşım ekranına verildi',
        'Dosyanın hedef cihaza kaydedildiğini doğrulayamıyoruz. Kaydetmeyi paylaşım ekranında tamamlayın.',
      );
      await reload();
    } catch (caught) {
      Alert.alert('Paylaşılamadı', caught instanceof Error ? caught.message : 'Bilinmeyen hata');
    } finally {
      setBusyId(null);
    }
  };

  const remove = (id: string) => {
    const job = data?.find((item) => item.id === id);
    if (!job) return;
    Alert.alert('Aktarım kaydı', job.fileName ?? exportTypeMeta[job.exportType]?.label ?? 'Kayıt', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Yalnızca kaydı sil',
        onPress: async () => {
          await deleteExportJob(id);
          await reload();
        },
      },
      {
        text: 'Dosyayı da sil',
        style: 'destructive',
        onPress: async () => {
          const filePath = await deleteExportJob(id);
          if (filePath) {
            try {
              const file = new File(filePath);
              if (file.exists) file.delete();
            } catch {
              // Dosya zaten silinmiş olabilir; kayıt silindi.
            }
          }
          await reload();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Aktarım işleri' }} />
      <Screen refreshing={loading} onRefresh={reload}>
        <SectionTitle
          title="Tüm aktarımlar"
          description={`${data?.length ?? 0} iş · ${formatBytes(totalBytes)} hazır dosya`}
        />

        <View style={styles.chips}>
          {FILTERS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              active={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </View>

        {loading && !data ? <Loading label="Aktarım işleri yükleniyor…" /> : null}
        {error ? <Notice title="Aktarım işleri yüklenemedi" tone="danger">{error}</Notice> : null}

        {data && jobs.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'Henüz aktarım yok' : 'Bu türde aktarım yok'}
            description="Rapor, fotoğraf arşivi veya tam yedek oluşturduğunuzda işler burada listelenir."
          />
        ) : null}

        {jobs.length > 0 ? (
          <View style={styles.list}>
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                busy={busyId === job.id}
                onShare={job.status === 'READY' || job.status === 'SHARED' ? () => share(job.id) : undefined}
                onDelete={() => remove(job.id)}
              />
            ))}
          </View>
        ) : null}

        <Notice title="Dosyalar nerede?" tone="info">
          Hazır dosyalar uygulamanın dışa aktarım klasöründe tutulur. Paylaşım ekranına göndermek
          dosyayı silmez; “Dosyayı da sil” seçeneği hem kaydı hem yerel kopyayı kaldırır. Arşiviniz ve
          fotoğraflarınız bu işlemden etkilenmez.
        </Notice>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  list: { gap: theme.space.sm },
});
