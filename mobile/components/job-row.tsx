import { StyleSheet, Text, View } from 'react-native';
import { Badge, Button, ProgressBar } from '@/components/ui';
import { formatBytes, formatDateTime } from '@/src/lib/format';
import { exportStatusMeta, exportTypeMeta, theme } from '@/src/theme';
import type { ExportJob } from '@/src/types';

export function JobRow({
  job,
  onShare,
  onDelete,
  busy,
}: {
  job: ExportJob;
  onShare?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const status = exportStatusMeta[job.status] ?? { label: job.status, tone: 'muted' as const };
  const type = exportTypeMeta[job.exportType] ?? { label: job.exportType, hint: '' };
  const inProgress = job.status === 'PROCESSING' || job.status === 'PREPARING' || job.status === 'PENDING';
  const percent =
    job.totalBytes > 0
      ? Math.round((job.processedBytes / job.totalBytes) * 100)
      : job.totalFiles > 0
        ? Math.round((job.processedFiles / job.totalFiles) * 100)
        : 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{type.label}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {job.fileName ?? 'Dosya hazırlanıyor'}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      <Text style={styles.meta}>
        {formatDateTime(job.completedAt ?? job.startedAt ?? null)}
        {job.totalBytes > 0 ? ` · ${formatBytes(job.totalBytes)}` : ''}
        {job.totalFiles > 0 ? ` · ${job.processedFiles}/${job.totalFiles} dosya` : ''}
      </Text>

      {inProgress ? <ProgressBar percent={percent} label="İlerleme" /> : null}
      {job.errorMessage ? <Text style={styles.error}>{job.errorMessage}</Text> : null}

      {job.status === 'READY' || job.status === 'SHARED' ? (
        <View style={styles.actions}>
          {onShare ? <Button label="Paylaş" size="sm" variant="secondary" onPress={onShare} loading={busy} /> : null}
          {onDelete ? <Button label="Kaydı sil" size="sm" variant="danger" onPress={onDelete} disabled={busy} /> : null}
        </View>
      ) : null}
      {job.status === 'FAILED' && onDelete ? (
        <View style={styles.actions}>
          <Button label="Kaydı sil" size="sm" variant="danger" onPress={onDelete} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    gap: 6,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  titleWrap: { flex: 1, gap: 1 },
  title: { fontSize: 13.5, fontWeight: '700', color: theme.colors.ink },
  sub: { fontSize: 10.5, color: theme.colors.muted },
  meta: { fontSize: 10.5, color: theme.colors.muted },
  error: { fontSize: 11, color: theme.colors.danger, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
});
