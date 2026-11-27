import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui';
import { EntryForm } from '@/components/entry-form';

export default function NewEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: 'Yeni kayıt' }} />
      <Screen>
        <EntryForm assetId={String(id)} />
      </Screen>
    </>
  );
}
