import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { Stack, SplashScreen as ExpoSplash, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useUser, UserProvider } from './_userbase/UserContext';
import { ChatProvider } from './features/chat/context/ChatContext';
import SplashScreen from '../components/SplashScreen';
import { NativeLogin } from './_userbase/NativeLogin';
import GlobalOAuthHandler, { useGoogleLogin } from './_userbase/GlobalOAuthHandler';

ExpoSplash.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <UserProvider>
      <InnerApp />
    </UserProvider>
  );
}

function InnerApp() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useUser();

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular':  Poppins_400Regular,
    'Poppins-Medium':   Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold':     Poppins_700Bold,
  });

  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Framework ready hook
  useFrameworkReady();

  // Get Google login handler from hook
  const handleGoogleLogin = useGoogleLogin();

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

  // 4) login UI - Simplified flow with social login and register button
  if (!isAuthenticated || !user) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.loginWrapper}
      >
        <LinearGradient
          colors={['#0F3460', '#1a4a7a', '#f8fafc']}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <StatusBar style="light" />
        <SafeAreaView style={styles.loginContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/images/propertprologo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeText}>
                {isRegisterMode ? 'Join PropertPro' : 'Welcome Back'}
              </Text>
              <Text style={styles.welcomeSubtext}>
                {isRegisterMode 
                  ? 'Create your account to get started' 
                  : 'Sign in to your account'}
              </Text>
            </View>

            {/* Native Login/Register Form */}
            <View style={styles.loginCard}>
              <NativeLogin
                key={isRegisterMode ? 'register' : 'login'}
                onSuccess={() => {
                  // Successfully logged in, user state will update automatically
                  console.log('Auth successful from _layout.tsx');
                }}
                initialMode={isRegisterMode ? 'register' : 'login'}
                hideToggle={true}
              />

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login */}
              <TouchableOpacity onPress={handleGoogleLogin} style={styles.googleButton}>
                <View style={styles.googleIconContainer}>
                  <Image
                    source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                    style={styles.googleLogo}
                  />
                </View>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              {/* Register/Login Toggle */}
              <View style={styles.toggleModeContainer}>
                <Text style={styles.toggleModeText}>
                  {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)}>
                  <Text style={styles.toggleModeLink}>
                    {isRegisterMode ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // 5) main app - YOUR ORIGINAL CODE
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <GlobalOAuthHandler />
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
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 52, 96, 0.08)',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cardTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#0F3460',
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
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#0F3460',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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
    color: '#0F3460',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#6b7280',
    marginHorizontal: 12,
  },
  toggleModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  toggleModeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6b7280',
  },
  toggleModeLink: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#2563eb',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
});