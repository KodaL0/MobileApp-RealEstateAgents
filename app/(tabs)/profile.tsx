import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Settings, Heart, Calculator, Calendar, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import { useRouter } from 'expo-router';

import { api } from '@/config/api'; // mobile API client
import { useUser } from '@/app/_userbase/UserContext';
import { OAUTH_CONFIG, generateOAuthUrl } from '@/config/oauth';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, login, logout } = useUser();
  const [hasProcessedOAuth, setHasProcessedOAuth] = useState(false);
  const [savedPropertiesCount, setSavedPropertiesCount] = useState<number>(0);
  const [hasFetchedSavedCount, setHasFetchedSavedCount] = useState<boolean>(false);

  // Configure AuthSession (native platforms)
  WebBrowser.maybeCompleteAuthSession();

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      clientId: OAUTH_CONFIG.CLIENT_ID, // Web client ID while using Expo proxy
      redirectUri: OAUTH_CONFIG.REDIRECT_URI,
      scopes: [...OAUTH_CONFIG.SCOPES] as string[],
      responseType: ResponseType.Code, // use authorization code flow
      usePKCE: false,
    }
  );

  // Log when the auth request object is ready
  useEffect(() => {
    console.log('=== AUTH REQUEST INITIALISED ===');
    console.log('Platform:', Platform.OS);
    console.log('Client ID:', OAUTH_CONFIG.CLIENT_ID);
    console.log('Redirect URI:', OAUTH_CONFIG.REDIRECT_URI);
    console.log('Scopes:', OAUTH_CONFIG.SCOPES);
    console.log('Request loaded?', !!request);
    console.log('===============================');
  }, [request]);

  // OAuth redirect on web
  useEffect(() => {
    if (Platform.OS === 'web' && !hasProcessedOAuth) {
      const handleWebOAuthRedirect = async () => {
        const currentUrl = window.location.href;
        const fragmentStart = currentUrl.indexOf('#');
        if (fragmentStart !== -1) {
          const fragment = currentUrl.substring(fragmentStart + 1);
          const params = new URLSearchParams(fragment);
          const idToken = params.get('id_token');
          if (idToken) {
            console.log('Google ID Token found in URL:', idToken);
            setHasProcessedOAuth(true);
            try {
              const res = await api.post('users/accounts/google/login/mobile/', { id_token: idToken });
              const { access_token, refresh_token, user: userData } = res.data;
              await login(access_token, refresh_token, userData);
              window.history.replaceState({}, document.title, window.location.pathname);
              router.replace('/');
            } catch (error) {
              console.error('Backend login failed:', error);
              setHasProcessedOAuth(false);
            }
          }
        }
      };
      handleWebOAuthRedirect();
    }
  }, [login, hasProcessedOAuth, router]);

  // Deep links for OAuth
  useEffect(() => {
    const handleDeepLink = (url: string) => {
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
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    return () => { subscription?.remove(); };
  }, []);

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      // Existing web flow
      setHasProcessedOAuth(false);
      const nonce = Math.random().toString(36).substring(2, 15);
      const state = nonce;
      const authUrl = generateOAuthUrl(nonce, state);
      window.location.href = authUrl;
    } else {
      // For native, just open the browser and rely on the deep-link listener to
      // capture the redirect from the Expo proxy.  Running a second AuthSession
      // flow at the same time caused the redirect to be swallowed.

      const nonce = Math.random().toString(36).substring(2, 15);
      const state = nonce;
      const authUrl = generateOAuthUrl(nonce, state);

      console.log('handleGoogleLogin: Opening OAuth URL with WebBrowser.openBrowserAsync');
      console.log('handleGoogleLogin: Auth URL:', authUrl);

      await WebBrowser.openBrowserAsync(authUrl);
    }
  };

  // Handle AuthSession response (also covers web)
  useEffect(() => {
    if (!response) return;

    console.log('=== AUTH RESPONSE RECEIVED ===');
    console.log('Response type:', response.type);
    console.log('Response params:', (response as any).params);
    console.log('================================');

    if (response.type === 'success') {
      const authCode = (response as any)?.params?.code;
      if (authCode) {
        handleAuthCodeExchange(authCode);
      }
    }
  }, [response]);

  // Exchange authorization code for backend JWT tokens
  const handleAuthCodeExchange = async (code: string) => {
    console.log('handleAuthCodeExchange: Exchanging code with backend');
    try {
      const res = await api.post('users/accounts/google/login/mobile/', {
        code,
        redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
        client_id: OAUTH_CONFIG.CLIENT_ID,
      });
      console.log('handleAuthCodeExchange: Backend response status:', res.status);
      console.log('handleAuthCodeExchange: Backend response keys:', Object.keys(res.data));
      const { access_token, refresh_token, user: userData } = res.data;
      await login(access_token, refresh_token, userData);
      router.replace('/');
    } catch (error) {
      console.error('Code exchange failed:', error);
      Alert.alert('Login Failed', 'There was an error logging you in. Please try again.', [{ text: 'OK' }]);
    }
  };

  useEffect(() => {
    const fetchSavedCount = async () => {
      if (user && !hasFetchedSavedCount) {
        try {
          const data = await api.properties.myFavorites();
          setSavedPropertiesCount(data?.length || 0);
          setHasFetchedSavedCount(true);
        } catch (error) {
          console.error('Failed to fetch saved properties count:', error);
        }
      }
    };
    fetchSavedCount();
  }, [user, hasFetchedSavedCount]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      await logout();
      setSavedPropertiesCount(0);
      setHasFetchedSavedCount(false);
    } catch (error) {
      console.error('Logout failed:', error);
      await logout();
    }
  };

  const menuItems = [
    { icon: Heart, label: 'Saved Properties', count: savedPropertiesCount },
    { icon: Calculator, label: 'Mortgage Calculator' },
    { icon: Calculator, label: 'Rent vs Buy Calculator' },
    { icon: Settings, label: 'Settings' },
  ];

  const handleMenuItemPress = (label: string) => {
    switch (label) {
      case 'Saved Properties': router.push('/saved-properties'); break;
      case 'Mortgage Calculator': router.push('/mortgage-calculator'); break;
      case 'Rent vs Buy Calculator': router.push('/RentVsBuyScreen'); break;
      case 'Settings': console.log('Settings pressed'); break;
      default: console.log(`${label} pressed`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#0F3460" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loginContainer}>
          <View style={styles.loginCard}>
            <Text style={styles.title}>Sign in to your account</Text>
            <Text style={styles.subtitle}>Secure sign-in with your Google account</Text>
            <TouchableOpacity onPress={handleGoogleLogin} style={styles.googleButton}>
              <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1200px-Google_%22G%22_Logo.png' }} style={styles.googleLogo} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 10 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color="#0F3460" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <Image source={{ uri: user.profile_picture || 'https://placehold.co/60x60?text=PP' }} style={styles.profileImage} />
            <View>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/EditProfileScreen')}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.membershipCard}>
          <View>
            <Text style={styles.memberType}>{user.is_premium ? 'Premium Member' : 'Free Member'}</Text>
            {!user.is_premium && <Text style={styles.membershipText}>Upgrade to access premium features</Text>}
          </View>
          {!user.is_premium && <TouchableOpacity style={styles.upgradeButton}><Text style={styles.upgradeButtonText}>Upgrade</Text></TouchableOpacity>}
        </View>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => handleMenuItemPress(item.label)}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}><item.icon size={20} color="#0F3460" /></View>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {typeof item.count === 'number' && item.count > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{item.count}</Text></View>}
                <ChevronRight size={20} color="#999" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={styles.footer}><Text style={styles.footerText}>PropertPro v1.0.0</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { backgroundColor: '#fff' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f6fa' },
  loginCard: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, alignItems: 'center' },
  title: { fontFamily: 'Poppins-Bold', fontSize: 24, color: '#0F3460', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666', marginBottom: 32, textAlign: 'center' },
  googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, marginTop: 20, borderWidth: 1, borderColor: '#ccc' },
  googleLogo: { width: 20, height: 20, marginRight: 12 },
  googleButtonText: { fontSize: 16, color: '#333', fontWeight: '500' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  settingsButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center' },
  profileCard: { backgroundColor: '#F5F7FA', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileImage: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  profileName: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#0F3460' },
  profileEmail: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666' },
  editButton: { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  editButtonText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#0F3460' },
  membershipCard: { backgroundColor: '#0F3460', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberType: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#fff', marginBottom: 4 },
  membershipText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#ccc' },
  upgradeButton: { backgroundColor: '#FF6B6B', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  upgradeButtonText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#fff' },
  menuContainer: { marginBottom: 24 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuText: { fontFamily: 'Poppins-Medium', fontSize: 16, color: '#333' },
  countBadge: { backgroundColor: '#0F3460', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  countText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#fff' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, backgroundColor: '#F5F7FA', marginHorizontal: 16, marginBottom: 24 },
  logoutText: { fontFamily: 'Poppins-Medium', fontSize: 16, color: '#FF6B6B', marginLeft: 8 },
  footer: { alignItems: 'center', marginBottom: 24 },
  footerText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#999' },
});
