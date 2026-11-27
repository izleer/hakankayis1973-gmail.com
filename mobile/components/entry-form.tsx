import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Loading,
  Notice,
  PhotoThumb,
  SectionTitle,
} from '@/components/ui';
import {
  createEntry,
  getAsset,
  getEntry,
  listEntryMedia,
  updateEntry,
} from '@/src/db/repo';
import { daysFromNow, nowInput, parseLocalInput, toDateTimeInput } from '@/src/lib/format';
import { mediaUri } from '@/src/lib/paths';
import { importImages, pickImages, removeMedia, type PickedImage } from '@/src/services/media';
import { ENTRY_TYPES, type EntryType, type MediaItem } from '@/src/types';
import { entryTypeMeta, theme } from '@/src/theme';

export function EntryForm({ assetId, entryId }: { assetId: string; entryId?: string }) {
  const [loading, setLoading] = useState(true);
  const [assetName, setAssetName] = useState('');
  const [type, setType] = useState<EntryType>('note');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(nowInput());
  const [measurement, setMeasurement] = useState('');
  const [unit, setUnit] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [reminderDone, setReminderDone] = useState(false);
  const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
  const [picked, setPicked] = useState<PickedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const asset = await getAsset(assetId);
        if (!asset) throw new Error('Varlık bulunamadı.');
        setAssetName(asset.name);
        if (entryId) {
          const entry = await getEntry(entryId);
          if (!entry) throw new Error('Kayıt bulunamadı.');
          setType(entry.type);
          setTitle(entry.title);
          setNote(entry.note ?? '');
          setOccurredAt(toDateTimeInput(entry.occurredAt));
          setMeasurement(entry.measurementValue !== null ? String(entry.measurementValue) : '');
          setUnit(entry.measurementUnit ?? '');
          setReminderAt(entry.reminderAt ? toDateTimeInput(entry.reminderAt) : '');
          setReminderDone(entry.reminderDone);
          setExistingMedia(await listEntryMedia(entryId));
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Form yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [assetId, entryId]);

  const measurementRequired = type === 'measurement';
  const reminderRequired = type === 'reminder';

  const addPhotos = async (source: 'library' | 'camera') => {
    try {
      const images = await pickImages(source);
      if (images.length > 0) setPicked((current) => [...current, ...images]);
    } catch (caught) {
      Alert.alert('Fotoğraf eklenemedi', caught instanceof Error ? caught.message : 'Bilinmeyen hata');
    }
  };

  const removeExisting = (item: MediaItem) => {
    Alert.alert('Fotoğrafı sil', 'Bu fotoğraf kayıttan kaldırılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await removeMedia(item.id);
          setExistingMedia((current) => current.filter((media) => media.id !== item.id));
        },
      },
    ]);
  };

  const save = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Başlık zorunludur.');
      return;
    }
    const occurredIso = parseLocalInput(occurredAt);
    if (!occurredIso) {
      setError('Tarih “YYYY-AA-GG SS:DD” biçiminde olmalı.');
      return;
    }
    let measurementValue: number | null = null;
    if (measurement.trim()) {
      const normalized = measurement.replace(',', '.').trim();
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed)) {
        setError('Ölçüm değeri sayı olmalı.');
        return;
      }
      measurementValue = parsed;
    }
    if (measurementRequired && measurementValue === null) {
      setError('Ölçüm kaydı için bir değer girin.');
      return;
    }
    let reminderIso: string | null = null;
    if (reminderAt.trim()) {
      reminderIso = parseLocalInput(reminderAt);
      if (!reminderIso) {
        setError('Hatırlatma tarihi “YYYY-AA-GG SS:DD” biçiminde olmalı.');
        return;
      }
    }
    if (reminderRequired && !reminderIso) {
      setError('Hatırlatma kaydı için bir tarih girin.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        assetId,
        type,
        title: title.trim(),
        note: note.trim() || null,
        occurredAt: occurredIso,
        measurementValue,
        measurementUnit: measurementValue !== null ? unit.trim() || null : null,
        reminderAt: reminderIso,
        reminderDone,
      };
      const entry = entryId ? await updateEntry(entryId, payload) : await createEntry(payload);

      if (picked.length > 0) {
        setImporting(`0 / ${picked.length} fotoğraf`);
        await importImages(picked, {
          assetId,
          assetName,
          entryId: entry.id,
          occurredAt: occurredIso,
          onProgress: (done, total) => setImporting(`${done} / ${total} fotoğraf`),
        });
      }
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Kayıt kaydedilemedi.');
    } finally {
      setSaving(false);
      setImporting(null);
    }
  };

  const typeOptions = useMemo(
    () => ENTRY_TYPES.map((value) => ({ value, ...entryTypeMeta[value] })),
    [],
  );

  if (loading) return <Loading label="Form hazırlanıyor…" />;

  return (
    <>
      {error ? <Notice title="Kaydedilemedi" tone="danger">{error}</Notice> : null}
      <Badge label={assetName} tone="gold" />

      <SectionTitle title="Kayıt türü" />
      <View style={styles.chips}>
        {typeOptions.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={type === option.value}
            onPress={() => setType(option.value)}
          />
        ))}
      </View>

      <Field
        label="Başlık *"
        value={title}
        onChangeText={setTitle}
        placeholder={type === 'measurement' ? 'Örn. Gövde çapı ölçümü' : 'Kısa ve açıklayıcı bir başlık'}
      />

      <Field
        label="Tarih ve saat *"
        value={occurredAt}
        onChangeText={setOccurredAt}
        placeholder="YYYY-AA-GG SS:DD"
        hint="Yerel saat. Örn. 2026-04-20 14:30"
        keyboardType="numbers-and-punctuation"
      />
      <View style={styles.quickRow}>
        <Button label="Şimdi" size="sm" variant="secondary" onPress={() => setOccurredAt(nowInput())} />
        <Button label="Yarın" size="sm" variant="secondary" onPress={() => setOccurredAt(daysFromNow(1))} />
      </View>

      {measurementRequired ? (
        <View style={styles.twoCols}>
          <Field
            label="Ölçüm değeri *"
            value={measurement}
            onChangeText={setMeasurement}
            placeholder="12,5"
            keyboardType="decimal-pad"
            style={styles.flex}
          />
          <Field
            label="Birim"
            value={unit}
            onChangeText={setUnit}
            placeholder="cm, kg, ml"
            style={styles.flex}
          />
        </View>
      ) : null}

      {reminderRequired ? (
        <>
          <Field
            label="Hatırlatma zamanı *"
            value={reminderAt}
            onChangeText={setReminderAt}
            placeholder="YYYY-AA-GG SS:DD"
            hint="Yaklaşan hatırlatmalar Ana ekranda görünür."
            keyboardType="numbers-and-punctuation"
          />
          <View style={styles.quickRow}>
            <Button label="7 gün sonra" size="sm" variant="secondary" onPress={() => setReminderAt(daysFromNow(7))} />
            <Button label="30 gün sonra" size="sm" variant="secondary" onPress={() => setReminderAt(daysFromNow(30))} />
            <Chip
              label={reminderDone ? 'Tamamlandı' : 'Bekliyor'}
              active={reminderDone}
              onPress={() => setReminderDone(!reminderDone)}
            />
          </View>
        </>
      ) : null}

      <Field
        label="Not"
        value={note}
        onChangeText={setNote}
        placeholder="Gözlem, bakım detayı veya hatırlanması gerekenler"
        multiline
      />

      <SectionTitle title="Fotoğraflar" description="Orijinaller cihazda saklanır; boyut küçültülmez." />
      {existingMedia.length > 0 ? (
        <View style={styles.photoGrid}>
          {existingMedia.map((item) => (
            <View key={item.id} style={styles.photoItem}>
              <PhotoThumb uri={mediaUri(item.relativePath)} size={88} />
              <Button label="Sil" size="sm" variant="danger" onPress={() => removeExisting(item)} />
            </View>
          ))}
        </View>
      ) : null}
      {picked.length > 0 ? (
        <View style={styles.photoGrid}>
          {picked.map((image, index) => (
            <View key={`${image.uri}-${index}`} style={styles.photoItem}>
              <Image source={{ uri: image.uri }} style={styles.pickedImage} contentFit="cover" />
              <Button
                label="Çıkar"
                size="sm"
                variant="ghost"
                onPress={() => setPicked((current) => current.filter((_, i) => i !== index))}
              />
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.quickRow}>
        <Button label="Galeriden seç" size="sm" variant="secondary" onPress={() => addPhotos('library')} />
        <Button label="Kamera" size="sm" variant="secondary" onPress={() => addPhotos('camera')} />
      </View>
      {importing ? <Text style={styles.importing}>{importing} aktarılıyor…</Text> : null}

      <Button
        label={entryId ? 'Değişiklikleri kaydet' : 'Kaydı oluştur'}
        onPress={save}
        loading={saving}
        size="lg"
      />
      <Button label="Vazgeç" variant="ghost" onPress={() => router.back()} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  twoCols: { flexDirection: 'row', gap: theme.space.sm },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  photoItem: { alignItems: 'center', gap: 4 },
  pickedImage: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  importing: { fontSize: 11.5, color: theme.colors.gold, fontWeight: '600' },
});
