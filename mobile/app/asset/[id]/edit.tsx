import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Button, Chip, Field, Loading, Notice, Screen, SectionTitle } from '@/components/ui';
import { getAsset, listAssetTypes, updateAsset } from '@/src/db/repo';
import { parseLocalInput, toDateInput } from '@/src/lib/format';
import { theme } from '@/src/theme';
import type { AssetType } from '@/src/types';

export default function EditAssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assetId = String(id);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [typeSlug, setTypeSlug] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [acquired, setAcquired] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [asset, typeRows] = await Promise.all([getAsset(assetId), listAssetTypes()]);
        if (!asset) throw new Error('Varlık bulunamadı.');
        setTypes(typeRows);
        setName(asset.name);
        setTypeSlug(asset.typeSlug);
        setDescription(asset.description ?? '');
        setLocation(asset.location ?? '');
        setAcquired(toDateInput(asset.acquiredOn));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Varlık yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [assetId]);

  const roots = useMemo(() => types.filter((type) => type.parentSlug === null), [types]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, AssetType[]>();
    for (const type of types) {
      if (!type.parentSlug) continue;
      const list = map.get(type.parentSlug) ?? [];
      list.push(type);
      map.set(type.parentSlug, list);
    }
    return map;
  }, [types]);

  const save = async () => {
    if (!name.trim()) {
      setError('Varlık adı zorunludur.');
      return;
    }
    let acquiredIso: string | null = null;
    if (acquired.trim()) {
      acquiredIso = parseLocalInput(acquired.trim());
      if (!acquiredIso) {
        setError('Edinme tarihi YYYY-AA-GG biçiminde olmalı.');
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await updateAsset(assetId, {
        name: name.trim(),
        typeSlug,
        description: description.trim() || null,
        location: location.trim() || null,
        acquiredOn: acquiredIso,
      });
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Değişiklikler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Varlığı düzenle' }} />
      <Screen>
        {loading ? <Loading label="Varlık yükleniyor…" /> : null}
        {error ? <Notice title="Hata" tone="danger">{error}</Notice> : null}
        {!loading ? (
          <>
            <Field label="Varlık adı *" value={name} onChangeText={setName} />
            <Field label="Açıklama" value={description} onChangeText={setDescription} multiline />
            <Field label="Konum" value={location} onChangeText={setLocation} />
            <Field
              label="Edinme tarihi"
              value={acquired}
              onChangeText={setAcquired}
              placeholder="YYYY-AA-GG"
              hint="Boş bırakılabilir."
            />

            <SectionTitle title="Varlık türü" />
            <View style={styles.typeList}>
              {roots.map((root) => {
                const children = childrenOf.get(root.slug) ?? [];
                const grandchildren = children.flatMap((child) => childrenOf.get(child.slug) ?? []);
                return (
                  <View key={root.slug} style={styles.typeGroup}>
                    <Text style={styles.typeGroupTitle}>{root.name}</Text>
                    <View style={styles.chips}>
                      <Chip
                        label={`${root.name} (genel)`}
                        active={typeSlug === root.slug}
                        onPress={() => setTypeSlug(typeSlug === root.slug ? null : root.slug)}
                      />
                      {[...children, ...grandchildren].map((type) => (
                        <Chip
                          key={type.slug}
                          label={type.name}
                          active={typeSlug === type.slug}
                          onPress={() => setTypeSlug(typeSlug === type.slug ? null : type.slug)}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            <Button label="Değişiklikleri kaydet" onPress={save} loading={saving} size="lg" />
            <Button label="Vazgeç" variant="ghost" onPress={() => router.back()} />
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  typeList: { gap: theme.space.md },
  typeGroup: { gap: 6 },
  typeGroupTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: theme.colors.gold, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
