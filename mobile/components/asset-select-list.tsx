import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/theme';
import type { Asset } from '@/src/types';

export function AssetSelectList({
  assets,
  selected,
  onToggle,
  single,
}: {
  assets: Asset[];
  selected: string[];
  onToggle: (id: string) => void;
  single?: boolean;
}) {
  return (
    <View style={styles.list}>
      {assets.map((asset) => {
        const active = selected.includes(asset.id);
        return (
          <Pressable
            key={asset.id}
            onPress={() => onToggle(asset.id)}
            style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.check, active && styles.checkActive]}>
              {active ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>
                {asset.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {asset.typeName ?? 'Tür seçilmedi'} · {asset.entryCount ?? 0} kayıt ·{' '}
                {asset.mediaCount ?? 0} fotoğraf
              </Text>
            </View>
          </Pressable>
        );
      })}
      {single ? (
        <Text style={styles.hint}>Tek seçim: yeni bir varlığa dokunmak öncekini kaldırır.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  rowActive: { borderColor: theme.colors.green, backgroundColor: theme.colors.greenSoft },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkActive: { backgroundColor: theme.colors.green, borderColor: theme.colors.green },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  text: { flex: 1, gap: 1 },
  name: { fontSize: 14, color: theme.colors.ink, fontWeight: '600' },
  meta: { fontSize: 10.5, color: theme.colors.muted },
  hint: { fontSize: 10.5, color: theme.colors.muted, paddingHorizontal: 2 },
});
