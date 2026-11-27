import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Ekran odaklandığında veriyi yeniden yükler. `loader` kimliği değişmemeli;
 * filtre gibi bağımlılıkları `deps` ile verin.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: (value: T | null) => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    try {
      setError(null);
      const value = await loader();
      setData(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Veri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, deps);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void run();
    }, [run]),
  );

  return {
    data,
    loading,
    error,
    reload: run,
    setData,
  };
}
