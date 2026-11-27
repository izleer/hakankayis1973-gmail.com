import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { getDatabase } from '@/src/db';
import { ensureAppDirectories } from '@/src/lib/paths';
import { theme } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ensureAppDirectories();
        await getDatabase();
      } catch (caught) {
        if (mounted) {
          setError(caught instanceof Error ? caught.message : 'Yerel arşiv açılamadı.');
        }
      } finally {
        if (mounted) setReady(true);
        await SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>Yerel arşiv açılamadı</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Text style={styles.errorHint}>
          Uygulamayı kapatıp yeniden açmayı deneyin. Verileriniz cihazda korunur.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.paper },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.paper },
          headerBackTitle: 'Geri',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  errorTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.danger, textAlign: 'center' },
  errorBody: { fontSize: 13, color: theme.colors.inkSoft, textAlign: 'center', lineHeight: 19 },
  errorHint: { fontSize: 11.5, color: theme.colors.muted, textAlign: 'center', lineHeight: 17 },
});
