import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Settings, Heart, Calculator, Calendar, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import { api } from '@/config/api'; // mobile API client
import { useUser, User } from '@/app/_userbase/UserContext';
import { OAUTH_CONFIG, generateOAuthUrl, logOAuthConfig } from '@/config/oauth';

// OAuth configuration is handled in config/oauth.ts

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, login, logout, refreshUser } = useUser();
  const [hasProcessedOAuth, setHasProcessedOAuth] = useState(false);

  // Handle OAuth redirect on web
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
            setHasProcessedOAuth(true); // Prevent re-processing
            try {
              const res = await api.post('users/accounts/google/login/mobile/', { id_token: idToken });
              const { access_token, refresh_token, user: userData } = res.data;
              console.log('Backend response:', { access_token: access_token?.substring(0, 20) + '...', user: userData });
              await login(access_token, refresh_token, userData);
              console.log('Login successful, user:', userData);
              
              // Clean up the URL fragment
              window.history.replaceState({}, document.title, window.location.pathname);
              // Navigate to Home tab after login
              router.replace('/');
            } catch (error) {
              console.error('Backend login failed:', error);
              setHasProcessedOAuth(false); // Reset flag on error
            }
          }
        }
      };
      
      handleWebOAuthRedirect();
    }
  }, [login, hasProcessedOAuth, router]);

  // Handle deep links from OAuth redirect
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log('=== DEEP LINK HANDLER ===');
      console.log('Deep link received:', url);
      
      // Check if this is an OAuth redirect (support multiple formats)
      const isOAuthRedirect = url.includes('auth.expo.io') || 
                            url.includes('#id_token=') || 
                            url.includes('&id_token=') ||
                            url.includes('?id_token=');
      
      if (isOAuthRedirect) {
        console.log('OAuth redirect detected, processing...');
        console.log('Full URL:', url);
        
        // Extract id_token from the URL (check both fragment and query)
        let idToken = null;
        
        // Try fragment first (#)
        const fragmentStart = url.indexOf('#');
        if (fragmentStart !== -1) {
          const fragment = url.substring(fragmentStart + 1);
          console.log('URL fragment:', fragment);
          const params = new URLSearchParams(fragment);
          idToken = params.get('id_token');
          console.log('ID token from fragment:', idToken ? idToken.substring(0, 20) + '...' : 'not found');
        }
        
        // Try query parameters if fragment didn't work
        if (!idToken) {
          const queryStart = url.indexOf('?');
          if (queryStart !== -1) {
            const query = url.substring(queryStart + 1);
            console.log('URL query:', query);
            const params = new URLSearchParams(query);
            idToken = params.get('id_token');
            console.log('ID token from query:', idToken ? idToken.substring(0, 20) + '...' : 'not found');
          }
        }
        
        if (idToken) {
          console.log('ID token found in deep link, exchanging with backend');
          handleTokenExchange(idToken);
        } else {
          console.error('No id_token found in deep link. URL parts:');
          console.error('- Fragment:', url.indexOf('#') !== -1 ? url.substring(url.indexOf('#') + 1) : 'none');
          console.error('- Query:', url.indexOf('?') !== -1 ? url.substring(url.indexOf('?') + 1) : 'none');
        }
      } else {
        console.log('Not an OAuth redirect, ignoring');
      }
      console.log('=== DEEP LINK HANDLER END ===');
    };

    // Set up deep link listener
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App opened with initial URL:', url);
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Manual test function for OAuth token
  const testManualToken = () => {
    const testUrl = 'https://auth.expo.io/@dalmiraskon/propertpro-mobile#state=s9jammvzk5n&id_token=eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg4MjUwM2E1ZmQ1NmU5ZjczNGRmYmE1YzUwZDdiZjQ4ZGIyODRhZTkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI0NDczNzY4NjQ3OTItaGxlNWZvZG9wb25pOWM4ZG81MHBwbjYzOWY2Zmhic28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0NDczNzY4NjQ3OTItaGxlNWZvZG9wb25pOWM4ZG81MHBwbjYzOWY2Zmhic28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTU3MzUyNTQ5NTkxNDc4MTE5OTMiLCJlbWFpbCI6ImtvbnN0YW50aW5vc2V2YW5nQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJub25jZSI6InM5amFtbXZ6azVuIiwibmJmIjoxNzUxNTc0NjE0LCJuYW1lIjoiS29uc3RhbnRpbm9zIEV2YW5nZWxpZGVzIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0lWZmpwVHNyMmE1R1dJSDVqTVQ3aFlHSTc5UXRRYksxdFBGNzdzUWdhMUluQXFJd3c9czk2LWMiLCJnaXZlbl9uYW1lIjoiS29uc3RhbnRpbm9zIiwiZmFtaWx5X25hbWUiOiJFdmFuZ2VsaWRlcyIsImlhdCI6MTc1MTU3NDkxNCwiZXhwIjoxNzUxNTc4NTE0LCJqdGkiOiI5OWMzNjRlNjcyNTgyZWMzOGQ0MDM5ZTg1Yjg5NDIzM2EyM2I2OWM3In0.ViV6agth9abMw4EDWd_Dv_wGIGRxfapBJXqjXv4gJ63r434bc0SqT6TD18jnbaANOTniAD_BDMBWzaP0lQtf1MNc6ciMzQxMYHjivzRHoYygoUbh9JOhvbSJKJ0bdciBopP7OQPVcHkmwE8sxZySB63R_W48qS94UA6cd9lIMhY1mFurzekrtMMfBGY0oAPCqiLUMyF8Dejn_tKbraoWqgeRxvUpIaMkBmoF7aVJL2SYWjDNH0wvduli2cJVMoV5UYIDqXgOVOHYMpUJj-ma5Hb3UcYfNhm_XpTHPw0hB2Pco0dsozlvI6kxz-L9J6tGWk7tXoPPOV7GWgoNibxx9g&authuser=0&prompt=none';
    
    Alert.alert(
      'Test OAuth Token',
      'This will test the OAuth token from your successful login',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Test', onPress: () => {
          console.log('=== MANUAL TOKEN TEST ===');
          console.log('Testing with URL:', testUrl);
          
          const fragmentStart = testUrl.indexOf('#');
          if (fragmentStart !== -1) {
            const fragment = testUrl.substring(fragmentStart + 1);
            const params = new URLSearchParams(fragment);
            const idToken = params.get('id_token');
            
            if (idToken) {
              console.log('Extracted token:', idToken.substring(0, 30) + '...');
              handleTokenExchange(idToken);
            } else {
              console.error('Failed to extract token');
            }
          }
        }}
      ]
    );
  };

  const handleGoogleLogin = async () => {
    console.log('=== ACCOUNT SELECTION FLOW START ===');
    console.log('handleGoogleLogin: Starting Google OAuth flow');
    console.log('Platform:', Platform.OS);
    console.log('Client ID:', OAUTH_CONFIG.CLIENT_ID);
    console.log('Redirect URI:', OAUTH_CONFIG.REDIRECT_URI);
    
    try {
      if (Platform.OS === 'web') {
        console.log('handleGoogleLogin: Web platform detected');
        console.log('handleGoogleLogin: Resetting hasProcessedOAuth flag');
        setHasProcessedOAuth(false);
        
        // For web, use manual URL generation (keep existing working flow)
        const nonce = Math.random().toString(36).substring(2, 15);
        const state = nonce;
        const authUrl = generateOAuthUrl(nonce, state);
        console.log('handleGoogleLogin: Redirecting to Google OAuth URL');
        window.location.href = authUrl;
      } else {
        console.log('handleGoogleLogin: Native platform detected');
        console.log('handleGoogleLogin: Using WebBrowser.openBrowserAsync');
        
        // For native, use AuthSession for better OAuth handling
        console.log('handleGoogleLogin: Using AuthSession for OAuth flow');
        
        try {
          // Create AuthSession request
          const request = new AuthSession.AuthRequest({
            clientId: OAUTH_CONFIG.CLIENT_ID,
            scopes: [...OAUTH_CONFIG.SCOPES], // Convert readonly array to mutable
            redirectUri: OAUTH_CONFIG.REDIRECT_URI,
            responseType: AuthSession.ResponseType.IdToken,
            prompt: AuthSession.Prompt.SelectAccount,
            extraParams: {
              nonce: Math.random().toString(36).substring(2, 15),
            },
          });
          
          console.log('handleGoogleLogin: AuthSession request created');
          console.log('handleGoogleLogin: Redirect URI:', OAUTH_CONFIG.REDIRECT_URI);
          
          // Start the OAuth flow
          const result = await request.promptAsync({
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          });
          
          console.log('handleGoogleLogin: AuthSession result:', result);
          
          if (result.type === 'success') {
            console.log('handleGoogleLogin: OAuth successful, checking for token');
            // Check if we have the id_token in the result
            const idToken = (result as any).params?.id_token;
            
            if (idToken) {
              console.log('handleGoogleLogin: ID token found, length:', idToken.length);
              // Exchange token with backend
              await handleTokenExchange(idToken);
            } else {
              console.error('handleGoogleLogin: No id_token in successful result');
              console.error('handleGoogleLogin: Result:', result);
              Alert.alert(
                'OAuth Error',
                'Authentication completed but no token received. Please try again.',
                [{ text: 'OK' }]
              );
            }
          } else if (result.type === 'cancel') {
            console.log('handleGoogleLogin: User cancelled OAuth flow');
          } else {
            console.error('handleGoogleLogin: OAuth failed');
            console.error('handleGoogleLogin: Result type:', result.type);
            console.error('handleGoogleLogin: Result:', result);
            
            Alert.alert(
              'OAuth Error',
              'Authentication was not completed. Please try again.',
              [{ text: 'OK' }]
            );
          }
        } catch (authError) {
          console.error('handleGoogleLogin: AuthSession error:', authError);
          Alert.alert(
            'OAuth Error',
            'Failed to start authentication. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('=== ACCOUNT SELECTION FLOW ERROR ===');
      console.error('handleGoogleLogin: Google OAuth error:', error);
      console.error('handleGoogleLogin: Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      Alert.alert(
        'OAuth Error',
        'Failed to start Google authentication. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTokenExchange = async (idToken: string) => {
    try {
      console.log('=== TOKEN EXCHANGE START ===');
      console.log('Exchanging token with backend...');
      console.log('Token preview:', idToken.substring(0, 30) + '...');
      
      const res = await api.post('users/accounts/google/login/mobile/', { id_token: idToken });
      const { access_token, refresh_token, user: userData } = res.data;
      console.log('Backend response:', { access_token: access_token?.substring(0, 20) + '...', user: userData });
      
      await login(access_token, refresh_token, userData);
      console.log('Login successful, user:', userData);
      
      // Navigate to Home tab after login
      router.replace('/');
      console.log('=== TOKEN EXCHANGE SUCCESS ===');
    } catch (error) {
      console.error('=== TOKEN EXCHANGE FAILED ===');
      console.error('Backend login failed:', error);
      
      // Show user-friendly error
      Alert.alert(
        'Login Failed',
        'There was an error logging you in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const [savedPropertiesCount, setSavedPropertiesCount] = useState<number>(0);

  // Fetch saved properties count
  useEffect(() => {
    const fetchSavedCount = async () => {
      if (user) {
        try {
          const data = await api.properties.myFavorites();
          setSavedPropertiesCount(data?.length || 0);
        } catch (error) {
          console.error('Failed to fetch saved properties count:', error);
        }
      } else {
        setSavedPropertiesCount(0);
      }
    };

    fetchSavedCount();
  }, [user]);

  const menuItems = [
    { icon: Heart, label: 'Saved Properties', count: savedPropertiesCount || 0 },
    { icon: Calendar, label: 'Property Tours', count: 1 },
    { icon: Calculator, label: 'Mortgage Calculator', count: undefined },
    { icon: HelpCircle, label: 'Help Center', count: undefined },
    { icon: Settings, label: 'Settings', count: undefined },
  ];

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Still logout locally even if backend call fails
      await logout();
    }
  };

  const handleMenuItemPress = (label: string) => {
    switch (label) {
      case 'Saved Properties':
        router.push('/saved-properties');
        break;
      case 'Property Tours':
        // TODO: Implement property tours
        console.log('Property Tours pressed');
        break;
      case 'Mortgage Calculator':
        // TODO: Implement mortgage calculator
        console.log('Mortgage Calculator pressed');
        break;
      case 'Help Center':
        // TODO: Implement help center
        console.log('Help Center pressed');
        break;
      case 'Settings':
        // TODO: Implement settings
        console.log('Settings pressed');
        break;
      default:
        console.log(`${label} pressed`);
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
            
            {Platform.OS !== 'web' && (
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionTitle}>Mobile OAuth Instructions:</Text>
                <Text style={styles.instructionText}>
                  1. Tap "Continue with Google" below{'\n'}
                  2. Complete sign-in in the opened browser{'\n'}
                  3. The browser will redirect back to this app{'\n'}
                  4. You'll be automatically logged in
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleGoogleLogin}
              style={styles.googleButton}
            >
              <Image
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1200px-Google_%22G%22_Logo.png' }}
                style={styles.googleLogo}
              />

              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
            
            {Platform.OS !== 'web' && (
            <TouchableOpacity
                onPress={testManualToken}
                style={[styles.googleButton, { backgroundColor: '#f8f9fa', marginTop: 10 }]}
            >
                <Text style={[styles.googleButtonText, { color: '#666' }]}>Test OAuth Token</Text>
            </TouchableOpacity>
            )}

          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 10 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color="#0F3460" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <Image
              source={{ uri: user.profile_picture || 'https://placehold.co/60x60?text=PP' }}
              style={styles.profileImage}
            />
            <View>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => console.log('Edit profile pressed')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.membershipCard}>
          <View>
            <Text style={styles.memberType}>
              {user.is_premium ? 'Premium Member' : 'Free Member'}
            </Text>
            {!user.is_premium && (
              <Text style={styles.membershipText}>
                Upgrade to access premium features
              </Text>
            )}
          </View>
          {!user.is_premium && (
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.label)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <item.icon size={20} color="#0F3460" />
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {typeof item.count === 'number' && item.count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.count}</Text>
                  </View>
                )}
                <ChevronRight size={20} color="#999" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>PropertPro v1.0.0</Text>
        </View>
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
  instructionContainer: { marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef' },
  instructionTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#0F3460', marginBottom: 8 },
  instructionText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666', lineHeight: 20 },
});
