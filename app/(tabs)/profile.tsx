import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Settings, Heart, Calculator, Calendar, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';

import { api } from '@/config/api'; // mobile API client
import { useUser, User } from '@/app/_userbase/UserContext';

console.log('Expo Redirect URI:', AuthSession.makeRedirectUri());

const CLIENT_ID = '447376864792-hle5fodoponi9c8do50ppn639f6fhbso.apps.googleusercontent.com';
const REDIRECT_URI = AuthSession.makeRedirectUri();

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

  const handleGoogleLogin = async () => {
    try {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=id_token&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `response_mode=fragment&` +
        `prompt=select_account&` +
        `nonce=${Math.random().toString(36).substring(2, 15)}`;

      console.log('Opening Google OAuth URL:', authUrl);
      
      if (Platform.OS === 'web') {
        // Reset the flag to allow processing the new OAuth flow
        setHasProcessedOAuth(false);
        // On web, redirect to the auth URL
        window.location.href = authUrl;
      } else {
        // On native, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
        
        if (result.type === 'success') {
          const url = result.url;
          const fragmentStart = url.indexOf('#');
          if (fragmentStart !== -1) {
            const fragment = url.substring(fragmentStart + 1);
            const params = new URLSearchParams(fragment);
            const idToken = params.get('id_token');
            
            if (idToken) {
              console.log('Google ID Token obtained:', idToken);
              await handleTokenExchange(idToken);
            }
          }
        }
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
    }
  };

  const handleTokenExchange = async (idToken: string) => {
    try {
      const res = await api.post('users/accounts/google/login/mobile/', { id_token: idToken });
      const { access_token, refresh_token, user: userData } = res.data;
      console.log('Backend response:', { access_token: access_token?.substring(0, 20) + '...', user: userData });
      await login(access_token, refresh_token, userData);
      console.log('Login successful, user:', userData);
      // Navigate to Home tab after login
      router.replace('/');
    } catch (error) {
      console.error('Backend login failed:', error);
    }
  };

  const menuItems = [
    { icon: Heart, label: 'Saved Properties', count: 3 },
    { icon: Calendar, label: 'Property Tours', count: 1 },
    { icon: Calculator, label: 'Mortgage Calculator' },
    { icon: HelpCircle, label: 'Help Center' },
    { icon: Settings, label: 'Settings' },
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
            
            <TouchableOpacity
              onPress={() => {
                const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                  `client_id=${CLIENT_ID}&` +
                  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
                  `response_type=id_token&` +
                  `scope=${encodeURIComponent('openid profile email')}&` +
                  `response_mode=fragment&` +
                  `prompt=select_account&` +
                  `nonce=${Math.random().toString(36).substring(2, 15)}`;
                console.log('Test OAuth URL:', testUrl);
                if (Platform.OS === 'web') {
                  window.open(testUrl, '_blank');
                }
              }}
              style={[styles.googleButton, { backgroundColor: '#f0f0f0', marginTop: 10 }]}
            >
              <Text style={[styles.googleButtonText, { color: '#333' }]}>Test OAuth (Get Fresh Token)</Text>
            </TouchableOpacity>
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
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <item.icon size={20} color="#0F3460" />
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {item.count && (
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
});
