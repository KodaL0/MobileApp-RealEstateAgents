import { useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import { useUser } from './UserContext';
import { api } from '@/config/api';
import { OAUTH_CONFIG, buildBackendGoogleCallbackUrl, buildBackendGoogleLoginUrl } from '@/config/oauth';

/**
 * GlobalOAuthHandler - Centralized OAuth handling for all platforms
 * 
 * Handles:
 * - Web OAuth (cookies-based)
 * - Native OAuth (ID token flow)
 * - Native OAuth (authorization code flow)
 * - Deep link handling
 * - Token exchange
 */
export default function GlobalOAuthHandler() {
  const router = useRouter();
  const { login, refreshUser } = useUser();
  const [hasProcessed, setHasProcessed] = useState(false);

  // Setup Google AuthRequest for native platforms (ID token flow)
  WebBrowser.maybeCompleteAuthSession();
  const [, idTokenResponse, promptAsyncIdToken] = Google.useAuthRequest({
    clientId: OAUTH_CONFIG.CLIENT_ID,
    redirectUri: OAUTH_CONFIG.REDIRECT_URI,
    scopes: [...OAUTH_CONFIG.SCOPES],
    responseType: ResponseType.IdToken,
  });

  // Setup Google AuthRequest for native platforms (authorization code flow)
  const [, codeResponse, promptAsyncCode] = Google.useAuthRequest({
    clientId: OAUTH_CONFIG.CLIENT_ID,
    redirectUri: OAUTH_CONFIG.REDIRECT_URI,
    scopes: [...OAUTH_CONFIG.SCOPES] as string[],
    responseType: ResponseType.Code,
    usePKCE: false,
  });

  // Handle ID token exchange (native mobile)
  const handleIdTokenExchange = useCallback(async (idToken: string) => {
    try {
      const res = await api.post('users/accounts/google/login/mobile/', { id_token: idToken });
      const { access_token, refresh_token, user: userData } = res.data;
      await login(access_token, refresh_token, userData);
      router.replace('/');
    } catch (e) {
      console.error('ID token exchange failed:', e);
      Alert.alert('Login Failed', 'Please try again.');
    }
  }, [login, router]);

  // Handle authorization code exchange (native mobile)
  const handleAuthCodeExchange = useCallback(async (code: string) => {
    try {
      const res = await api.post('users/accounts/google/login/mobile/', {
        code,
        redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
        client_id: OAUTH_CONFIG.CLIENT_ID,
      });
      const { access_token, refresh_token, user: userData } = res.data;
      await login(access_token, refresh_token, userData);
      router.replace('/');
    } catch (error) {
      console.error('Authorization code exchange failed:', error);
      Alert.alert('Login Failed', 'There was an error logging you in. Please try again.');
    }
  }, [login, router]);

  // Handle web OAuth callback (cookies-based)
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

    const completeLoginFromCookies = async () => {
      try {
        // Pass true to force check - HttpOnly cookies aren't visible in document.cookie
        // but will be sent automatically with the API request
        await refreshUser(true);
        // Small delay to ensure state updates propagate before navigation
        setTimeout(() => {
          cleanQueryParams();
          router.replace('/');
        }, 200);
      } catch (error) {
        console.error('GlobalOAuthHandler: Failed to refresh user after OAuth completion', error);
        Alert.alert('Login Failed', 'Failed to retrieve user data after OAuth login');
        setHasProcessed(true);
      }
    };

    if (authSuccess === 'true') {
      completeLoginFromCookies();
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

  // Handle native deep links (ID token flow)
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handler = ({ url }: { url: string }) => {
      // Check for ID token in URL
      const idTokenMatch = url.match(/(?:[#?&]id_token=)([^&]+)/);
      if (idTokenMatch?.[1]) {
        handleIdTokenExchange(idTokenMatch[1]);
        return;
      }

      // Check for authorization code in URL (Expo proxy)
      const isOAuthRedirect = url.includes('auth.expo.io') && url.includes('code=');
      if (isOAuthRedirect) {
        const queryStart = url.indexOf('?');
        if (queryStart !== -1) {
          const query = url.substring(queryStart + 1);
          const params = new URLSearchParams(query);
          const authCode = params.get('code');
          if (authCode) {
            handleAuthCodeExchange(authCode);
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handler);
    Linking.getInitialURL().then(u => u && handler({ url: u }));
    return () => subscription.remove();
  }, [handleIdTokenExchange, handleAuthCodeExchange]);

  // Handle ID token response from promptAsync (native)
  useEffect(() => {
    if (Platform.OS !== 'web' && idTokenResponse?.type === 'success') {
      const idToken = (idTokenResponse.params as any)?.id_token;
      if (idToken) {
        handleIdTokenExchange(idToken);
      }
    }
  }, [idTokenResponse, handleIdTokenExchange]);

  // Handle authorization code response from promptAsync (native)
  useEffect(() => {
    if (Platform.OS !== 'web' && codeResponse?.type === 'success') {
      const authCode = (codeResponse.params as any)?.code;
      if (authCode) {
        handleAuthCodeExchange(authCode);
      }
    }
  }, [codeResponse, handleAuthCodeExchange]);

  return null;
}

/**
 * Hook to get Google login handler function
 * This can be used by components to trigger Google OAuth
 */
export function useGoogleLogin() {
  WebBrowser.maybeCompleteAuthSession();
  const [, , promptAsyncIdToken] = Google.useAuthRequest({
    clientId: OAUTH_CONFIG.CLIENT_ID,
    redirectUri: OAUTH_CONFIG.REDIRECT_URI,
    scopes: [...OAUTH_CONFIG.SCOPES],
    responseType: ResponseType.IdToken,
  });

  const handleGoogleLogin = useCallback(async () => {
    if (Platform.OS === 'web') {
      const nextTarget = `${window.location.origin}${window.location.pathname}${window.location.search || ''}`;
      const loginUrl = buildBackendGoogleLoginUrl(nextTarget);
      window.location.href = loginUrl;
    } else {
      try {
        await promptAsyncIdToken();
      } catch (e) {
        console.error(e);
        Alert.alert('Login Failed', 'Could not start Google login.');
      }
    }
  }, [promptAsyncIdToken]);

  return handleGoogleLogin;
}
