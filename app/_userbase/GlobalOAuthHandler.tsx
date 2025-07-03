import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from './UserContext';
import { api } from '@/config/api';
import { OAUTH_CONFIG } from '@/config/oauth';

/**
 * GlobalOAuthHandler
 * ------------------
 * Runs once on app start (web only). Detects an `id_token` in the URL
 * fragment after Google OAuth, exchanges it for backend JWT tokens, stores
 * them via UserContext.login, cleans the URL, and finally redirects to `/`.
 * 
 * Works with localhost redirects (http://localhost:8081) to keep the app
 * on localhost during development.
 */
export default function GlobalOAuthHandler() {
  const { login } = useUser();
  const router = useRouter();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    console.log('=== GLOBAL OAUTH HANDLER START ===');
    console.log('GlobalOAuthHandler: Component mounted');
    console.log('GlobalOAuthHandler: Platform:', Platform.OS);
    console.log('GlobalOAuthHandler: hasProcessed:', hasProcessed);
    
    if (Platform.OS !== 'web') {
      console.log('GlobalOAuthHandler: Not web platform, skipping');
      return; // Only relevant on web
    }
    if (hasProcessed) {
      console.log('GlobalOAuthHandler: Already processed, skipping');
      return;
    }

    const currentUrl = window.location.href;
    console.log('GlobalOAuthHandler: Current URL:', currentUrl);
    const fragmentStart = currentUrl.indexOf('#');
    console.log('GlobalOAuthHandler: Fragment start index:', fragmentStart);
    
    if (fragmentStart === -1) {
      console.log('GlobalOAuthHandler: No fragment found in URL');
      return; // No fragment
    }

    const fragment = currentUrl.substring(fragmentStart + 1);
    console.log('GlobalOAuthHandler: URL fragment:', fragment);
    const params = new URLSearchParams(fragment);
    const idToken = params.get('id_token');
    console.log('GlobalOAuthHandler: ID token found:', !!idToken);
    
    if (!idToken) {
      console.log('GlobalOAuthHandler: No ID token in fragment');
      return;
    }

    const exchangeToken = async () => {
      console.log('GlobalOAuthHandler: Starting token exchange');
      console.log('GlobalOAuthHandler: ID token length:', idToken.length);
      console.log('GlobalOAuthHandler: ID token preview:', idToken.substring(0, 50) + '...');
      
      try {
        console.log('GlobalOAuthHandler: Setting hasProcessed to true');
        setHasProcessed(true);
        
        console.log('GlobalOAuthHandler: Making API call to backend');
        const res = await api.post(OAUTH_CONFIG.TOKEN_EXCHANGE_ENDPOINT, {
          id_token: idToken,
        });
        console.log('GlobalOAuthHandler: Backend response received');
        console.log('GlobalOAuthHandler: Response status:', res.status);
        console.log('GlobalOAuthHandler: Response data keys:', Object.keys(res.data));
        
        const { access_token, refresh_token, user: userData } = res.data;
        console.log('GlobalOAuthHandler: Extracted tokens and user data');
        console.log('GlobalOAuthHandler: Access token length:', access_token?.length);
        console.log('GlobalOAuthHandler: Refresh token length:', refresh_token?.length);
        console.log('GlobalOAuthHandler: User data:', userData);
        
        console.log('GlobalOAuthHandler: Calling UserContext.login');
        await login(access_token, refresh_token, userData);
        console.log('GlobalOAuthHandler: Login successful');
        
        console.log('GlobalOAuthHandler: Cleaning URL fragment');
        // Clean URL fragment
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('GlobalOAuthHandler: URL cleaned');
        
        console.log('GlobalOAuthHandler: Navigating to home');
        // Navigate to home
        router.replace('/');
        console.log('=== GLOBAL OAUTH HANDLER COMPLETE ===');
      } catch (error: any) {
        console.error('=== GLOBAL OAUTH HANDLER ERROR ===');
        console.error('GlobalOAuthHandler: token exchange failed', error);
        console.error('GlobalOAuthHandler: Error details:', {
          message: error?.message,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          stack: error?.stack
        });
        console.log('GlobalOAuthHandler: Resetting hasProcessed flag');
        setHasProcessed(false);
      }
    };

    console.log('GlobalOAuthHandler: Executing token exchange');
    exchangeToken();
  }, [hasProcessed, login, router]);

  return null; // This component does not render anything
} 