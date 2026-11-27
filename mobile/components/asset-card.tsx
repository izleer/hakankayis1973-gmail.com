import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Badge } from '@/components/ui';
import { mediaUri } from '@/src/lib/paths';
import { theme } from '@/src/theme';
import type { Asset } from '@/src/types';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('');
}

export function AssetCard({ asset, onPress }: { asset: Asset; onPress: () => void }) {
  const cover = asset.coverPath ? mediaUri(asset.coverPath) : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.87 }]}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={120} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.initials}>{initials(asset.name) || 'İ'}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {asset.name}
          </Text>
          {asset.status === 'archived' ? <Badge label="Arşivde" tone="muted" /> : null}
        </View>
        <Text style={styles.type} numberOfLines={1}>
          {asset.typeName ?? 'Tür seçilmedi'}
          {asset.location ? ` · ${asset.location}` : ''}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{asset.entryCount ?? 0} kayıt</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{asset.mediaCount ?? 0} fotoğraf</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
  },
  cover: { width: 62, height: 62, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted },
  placeholder: {
    width: 62,
    height: 62,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: 'serif', fontSize: 22, color: theme.colors.green, fontWeight: '700' },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontFamily: 'serif', fontSize: 17, color: theme.colors.ink, fontWeight: '600' },
  type: { fontSize: 11.5, color: theme.colors.gold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  meta: { fontSize: 11, color: theme.colors.muted },
  dot: { fontSize: 11, color: theme.colors.lineStrong },
  chevron: { fontSize: 26, color: theme.colors.lineStrong, marginLeft: 2 },
});
