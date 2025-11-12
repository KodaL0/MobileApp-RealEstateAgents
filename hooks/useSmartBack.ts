import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Smart back navigation hook that handles refresh scenarios
 * Falls back to home if there's no history to go back to
 */
export function useSmartBack(fallbackRoute: string = '/(tabs)') {
  const router = useRouter();

  const handleBack = useCallback(() => {
    // On web, check if we can go back in history
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // If there's no previous history entry, go to fallback
      if (window.history.length <= 1 || document.referrer === '') {
        router.replace(fallbackRoute as any);
        return;
      }
    }
    // Try to go back, fallback if it fails
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  }, [router, fallbackRoute]);

  return handleBack;
}

