import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui';
import { formatShortDate } from '@/src/lib/format';
import { entryTypeMeta, theme } from '@/src/theme';
import type { Entry, MediaItem } from '@/src/types';
import { serif } from '@/components/ui';

type EntryRowData = Entry & { media?: MediaItem[] };

export function EntryRow({
  entry,
  assetName,
  onPress,
}: {
  entry: EntryRowData;
  assetName?: string;
  onPress?: () => void;
}) {
  const meta = entryTypeMeta[entry.type] ?? { label: entry.type, short: '?', tone: 'muted' as const };
  const measurement =
    entry.measurementValue !== null
      ? `${new Intl.NumberFormat('tr-TR').format(entry.measurementValue)}${
          entry.measurementUnit ? ` ${entry.measurementUnit}` : ''
        }`
      : null;
  const body = (
    <View style={styles.row}>
      <View style={styles.top}>
        <Badge label={meta.label} tone={meta.tone === 'gold' ? 'gold' : meta.tone === 'danger' ? 'danger' : meta.tone === 'green' ? 'green' : meta.tone === 'warning' ? 'warning' : 'info'} />
        <Text style={styles.date}>{formatShortDate(entry.occurredAt)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {entry.title}
      </Text>
      {assetName ? <Text style={styles.asset}>◆ {assetName}</Text> : null}
      {measurement ? <Text style={styles.measurement}>{measurement}</Text> : null}
      {entry.note ? (
        <Text style={styles.note} numberOfLines={2}>
          {entry.note}
        </Text>
      ) : null}
      <View style={styles.footer}>
        {(entry.media?.length ?? 0) > 0 ? (
          <Text style={styles.footerText}>{entry.media?.length} fotoğraf</Text>
        ) : null}
        {entry.type === 'reminder' && entry.reminderAt ? (
          <Text style={[styles.footerText, entry.reminderDone && styles.done]}>
            {entry.reminderDone ? 'Tamamlandı' : formatShortDate(entry.reminderAt)}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return <View style={styles.wrap}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  row: { padding: theme.space.md, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { fontSize: 11, color: theme.colors.muted },
  title: { fontFamily: serif, fontSize: 16.5, color: theme.colors.ink, fontWeight: '600' },
  asset: { fontSize: 11, color: theme.colors.gold },
  measurement: { fontSize: 13, fontWeight: '700', color: theme.colors.green },
  note: { fontSize: 12, color: theme.colors.inkSoft, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 2 },
  footerText: { fontSize: 10.5, color: theme.colors.muted },
  done: { color: theme.colors.green },
});
