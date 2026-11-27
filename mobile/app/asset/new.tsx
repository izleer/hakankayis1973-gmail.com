import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { AppHeader, Button, Chip, Field, Loading, Notice, Screen, SectionTitle } from '@/components/ui';
import { createAsset, listAssetTypes } from '@/src/db/repo';
import { parseLocalInput, todayInput } from '@/src/lib/format';
import { theme } from '@/src/theme';
import type { AssetType } from '@/src/types';

export default function NewAssetScreen() {
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
    listAssetTypes()
      .then(setTypes)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Türler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

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
      const asset = await createAsset({
        name: name.trim(),
        typeSlug,
        description: description.trim() || null,
        location: location.trim() || null,
        acquiredOn: acquiredIso,
        visibility: 'private',
      });
      router.replace(`/asset/${asset.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Varlık oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Yeni varlık' }} />
      <Screen>
        <AppHeader
          eyebrow="Yeni kayıt"
          title="Varlık ekle"
          subtitle="Varlık bilgileri yalnızca bu cihazda saklanır. Sonradan fotoğraf ve hareket ekleyebilirsiniz."
        />

        {loading ? <Loading label="Varlık türleri yükleniyor…" /> : null}
        {error ? <Notice title="Kaydedilemedi" tone="danger">{error}</Notice> : null}

        <Field label="Varlık adı *" value={name} onChangeText={setName} placeholder="Örn. Delice Zeytin" autoFocus />
        <Field
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Kısa not, köken, özel bilgiler"
          multiline
        />
        <Field label="Konum" value={location} onChangeText={setLocation} placeholder="Örn. Balkon, İzmir" />
        <Field
          label="Edinme tarihi"
          value={acquired}
          onChangeText={setAcquired}
          placeholder="YYYY-AA-GG"
          hint="Boş bırakılabilir."
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.quickRow}>
          <Button label="Bugün" size="sm" variant="secondary" onPress={() => setAcquired(todayInput())} />
          <Button label="Temizle" size="sm" variant="ghost" onPress={() => setAcquired('')} />
        </View>

        <SectionTitle title="Varlık türü" description="Tür, rapor ve klasör adlarında kullanılır." />
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

        <Notice title="Görünürlük" tone="info">
          Bu sürümde tüm varlıklar yalnızca size özeldir. Seçili kişilerle paylaşım sonraki sürümde açılacak.
        </Notice>

        <Button label="Varlığı oluştur" onPress={save} loading={saving} size="lg" />
        <Button label="Vazgeç" variant="ghost" onPress={() => router.back()} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 8 },
  typeList: { gap: theme.space.md },
  typeGroup: { gap: 6 },
  typeGroupTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: theme.colors.gold, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
