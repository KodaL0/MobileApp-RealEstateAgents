import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Dimensions
} from 'react-native';
import { Stack, SplashScreen as ExpoSplash, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';

import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { api } from '@/config/api';
import { useUser } from './_userbase/UserContext';
import { OAUTH_CONFIG, generateOAuthUrl } from '@/config/oauth';
import { ChatProvider } from './features/chat/context/ChatContext';
import SplashScreen from '../components/SplashScreen';

const { width, height } = Dimensions.get('window');

ExpoSplash.preventAutoHideAsync();

// Import your UserProvider and wrap the component
import { UserProvider } from './_userbase/UserContext';

export default function RootLayout() {
  return (
    <UserProvider>
      <InnerApp />
    </UserProvider>
  );
}

function InnerApp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, login } = useUser();

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular':  Poppins_400Regular,
    'Poppins-Medium':   Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold':     Poppins_700Bold,
  });

  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [hasProcessedOAuth, setHasProcessedOAuth] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  // Framework ready hook
  useFrameworkReady();

  WebBrowser.maybeCompleteAuthSession();
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:     OAUTH_CONFIG.CLIENT_ID,
    redirectUri:  OAUTH_CONFIG.REDIRECT_URI,
    scopes:       [...OAUTH_CONFIG.SCOPES],
    responseType: ResponseType.IdToken,
  });

  // web redirect
  useEffect(() => {
    if (Platform.OS === 'web' && !hasProcessedOAuth) {
      const fragment = window.location.hash.replace('#', '');
      const idToken = new URLSearchParams(fragment).get('id_token');
      if (idToken) {
        setHasProcessedOAuth(true);
        handleTokenExchange(idToken);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [hasProcessedOAuth]);

  // native deep link
  useEffect(() => {
    const handler = ({ url }: { url: string }) => {
      const m = url.match(/(?:[#?&]id_token=)([^&]+)/);
      if (m?.[1]) handleTokenExchange(m[1]);
    };
    const sub = Linking.addEventListener('url', handler);
    Linking.getInitialURL().then(u => u && handler({ url: u }));
    return () => sub.remove();
  }, []);

  // response from promptAsync
  useEffect(() => {
    if (Platform.OS !== 'web' && response?.type === 'success') {
      const idToken = (response.params as any)?.id_token;
      if (idToken) handleTokenExchange(idToken);
    }
  }, [response]);

  async function handleTokenExchange(idToken: string) {
    try {
      const res = await api.post('users/accounts/google/login/mobile/', { id_token: idToken });
      const { access_token, refresh_token, user: u } = res.data;
      await login(access_token, refresh_token, u);
      router.replace('/');
    } catch (e) {
      console.error(e);
      Alert.alert('Login Failed', 'Please try again.');
    }
  }

  function handleGoogleLogin() {
    if (Platform.OS === 'web') {
      setHasProcessedOAuth(false);
      const nonce = Math.random().toString(36).slice(2);
      window.location.href = generateOAuthUrl(nonce, nonce);
    } else {
      promptAsync().catch(e => {
        console.error(e);
        Alert.alert('Login Failed', 'Could not start Google login.');
      });
    }
  }

  // Wait for fonts to load
  useEffect(() => {
    if (fontsLoaded) {
      ExpoSplash.hideAsync();
      // Don't hide custom splash immediately, let it run for 1.5 seconds
    }
  }, [fontsLoaded]);

  // 1) fonts
  if (!fontsLoaded && !fontError) return null;

  // 2) splash
  if (showCustomSplash && !splashFinished) {
    return (
      <SplashScreen
        onFinish={async () => {
          setSplashFinished(true);
          setShowCustomSplash(false);
        }}
      />
    );
  }

  // 3) auth loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#0F3460" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // 4) login UI - ONLY THE UI IS CHANGED HERE
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.loginWrapper}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <StatusBar style="light" />
        <SafeAreaView style={styles.loginContainer}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/propertprologo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.welcomeSubtext}>Sign in to continue to your account</Text>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSubtitle}>Choose your preferred sign-in method</Text>
            </View>

            <TouchableOpacity onPress={handleGoogleLogin} style={styles.googleButton}>
              <View style={styles.googleIconContainer}>
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleLogo}
                />
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.alternativeOptions}>
              <Text style={styles.alternativeText}>More sign-in options coming soon</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // 5) main app - YOUR ORIGINAL CODE
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ChatProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
          </Stack>
        </ChatProvider>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  container: { 
    flex: 1 
  },
  loginWrapper: {
    flex: 1,
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  loginContainer: { 
    flex: 1, 
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },
  welcomeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cardTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#374151',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#9ca3af',
    marginHorizontal: 16,
  },
  alternativeOptions: {
    alignItems: 'center',
  },
  alternativeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
});