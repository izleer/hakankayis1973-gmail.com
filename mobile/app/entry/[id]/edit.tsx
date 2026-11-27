import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { EmptyState, Loading, Screen } from '@/components/ui';
import { EntryForm } from '@/components/entry-form';
import { getEntry } from '@/src/db/repo';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = String(id);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEntry(entryId)
      .then((entry) => setAssetId(entry?.assetId ?? null))
      .finally(() => setLoading(false));
  }, [entryId]);

  return (
    <>
      <Stack.Screen options={{ title: 'Kaydı düzenle' }} />
      <Screen>
        {loading ? <Loading label="Kayıt yükleniyor…" /> : null}
        {!loading && !assetId ? <EmptyState title="Kayıt bulunamadı" /> : null}
        {assetId ? <EntryForm assetId={assetId} entryId={entryId} /> : null}
      </Screen>
    </>
  );
}
