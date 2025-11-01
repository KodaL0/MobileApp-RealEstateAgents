import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from './UserContext';
import { buildBackendGoogleCallbackUrl } from '@/config/oauth';

export default function GlobalOAuthHandler() {
  const router = useRouter();
  const { refreshUser } = useUser();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || hasProcessed) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('error');
    const hasOAuthParams = params.has('code') || params.has('state');

    const cleanQueryParams = () => {
      params.delete('auth_success');
      params.delete('error');
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash || ''}`;
      window.history.replaceState({}, document.title, newUrl);
    };

    const completeLogin = async () => {
      try {
        await refreshUser();
        cleanQueryParams();
        router.replace('/');
      } catch (error) {
        console.error('GlobalOAuthHandler: Failed to refresh user after OAuth completion', error);
      } finally {
        setHasProcessed(true);
      }
    };

    if (authSuccess === 'true') {
      completeLogin();
      return;
    }

    if (authError) {
      cleanQueryParams();
      setHasProcessed(true);
      Alert.alert('Login Failed', 'Authentication was cancelled or failed. Please try again.');
      return;
    }

    if (hasOAuthParams) {
      const callbackUrl = buildBackendGoogleCallbackUrl(window.location.search);
      window.location.replace(callbackUrl);
      return;
    }
  }, [hasProcessed, refreshUser, router]);

  return null;
}