import { router, Stack } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sayfa bulunamadı' }} />
      <Screen>
        <EmptyState
          title="Bu sayfa bulunamadı"
          description="Bağlantı eskimiş olabilir. Arşiviniz ve fotoğraflarınız yerinde duruyor."
          action={<Button label="Ana ekrana dön" onPress={() => router.replace('/')} />}
        />
      </Screen>
    </>
  );
}
