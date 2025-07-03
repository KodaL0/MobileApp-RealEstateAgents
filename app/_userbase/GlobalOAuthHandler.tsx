import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from './UserContext';
import { api } from '@/config/api';

/**
 * GlobalOAuthHandler
 * ------------------
 * Runs once on app start (web only). Detects an `id_token` in the URL
 * fragment after Google OAuth, exchanges it for backend JWT tokens, stores
 * them via UserContext.login, cleans the URL, and finally redirects to `/`.
 */
export default function GlobalOAuthHandler() {
  const { login } = useUser();
  const router = useRouter();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return; // Only relevant on web
    if (hasProcessed) return;

    const currentUrl = window.location.href;
    const fragmentStart = currentUrl.indexOf('#');
    if (fragmentStart === -1) return; // No fragment

    const fragment = currentUrl.substring(fragmentStart + 1);
    const params = new URLSearchParams(fragment);
    const idToken = params.get('id_token');
    if (!idToken) return;

    const exchangeToken = async () => {
      try {
        setHasProcessed(true);
        const res = await api.post('users/accounts/google/login/mobile/', {
          id_token: idToken,
        });
        const { access_token, refresh_token, user: userData } = res.data;
        await login(access_token, refresh_token, userData);
        // Clean URL fragment
        window.history.replaceState({}, document.title, window.location.pathname);
        // Navigate to home
        router.replace('/');
      } catch (error) {
        console.error('GlobalOAuthHandler token exchange failed', error);
        setHasProcessed(false);
      }
    };

    exchangeToken();
  }, [hasProcessed, login, router]);

  return null; // This component does not render anything
} 