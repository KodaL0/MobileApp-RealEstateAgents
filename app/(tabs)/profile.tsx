import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Settings, Heart, Calculator, LogOut, ChevronRight, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import { router } from 'expo-router';

import { api } from '@/config/api'; // mobile API client
import { useUser } from '@/app/_userbase/UserContext';
import { OAUTH_CONFIG, buildBackendGoogleCallbackUrl, buildBackendGoogleLoginUrl } from '@/config/oauth';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, isAuthenticated, login, logout, refreshUser } = useUser();
  const [hasProcessedOAuth, setHasProcessedOAuth] = useState(false);
  const [savedPropertiesCount, setSavedPropertiesCount] = useState<number>(0);
  const [hasFetchedSavedCount, setHasFetchedSavedCount] = useState<boolean>(false);
  
  // Email/Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Register-specific fields
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

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

  const handleAuthCodeExchange = useCallback(async (code: string) => {
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
      setHasProcessedOAuth(true);
      router.replace('/');
    } catch (error) {
      console.error('Code exchange failed:', error);
      Alert.alert('Login Failed', 'There was an error logging you in. Please try again.', [{ text: 'OK' }]);
    }
  }, [login]);

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

  // OAuth redirect on web - mirror propertprofrontend flow
  useEffect(() => {
    if (Platform.OS !== 'web' || hasProcessedOAuth) {
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
        await refreshUser();
        cleanQueryParams();
        router.replace('/');
      } catch (error) {
        console.error('Failed to refresh user after OAuth completion', error);
      } finally {
        setHasProcessedOAuth(true);
      }
    };

    if (authSuccess === 'true') {
      completeLoginFromCookies();
      return;
    }

    if (authError) {
      cleanQueryParams();
      setHasProcessedOAuth(true);
      Alert.alert('Login Failed', 'Authentication was cancelled or failed. Please try again.');
      return;
    }

    if (hasOAuthParams) {
      const callbackUrl = buildBackendGoogleCallbackUrl(window.location.search);
      window.location.replace(callbackUrl);
      return;
    }
  }, [hasProcessedOAuth, refreshUser]);

  // Deep links for OAuth
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

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
  }, [handleAuthCodeExchange]);

  const handleEmailPasswordLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await api.auth.login({ email, password });
      console.log('Email login response:', response);
      
      const { access_token, refresh_token, user: userData } = response;
      await login(access_token, refresh_token, userData);
      
      Alert.alert('Success', 'Logged in successfully!');
      router.replace('/');
    } catch (error: any) {
      console.error('Email login failed:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Invalid email or password';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Error', 'Please accept the Terms & Conditions and Privacy Policy');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await api.auth.register({
        username,
        email,
        password,
        accepted_terms: acceptedTerms,
        accepted_privacy: acceptedTerms, // Linked to same checkbox
        marketing_consent: marketingConsent,
      });

      console.log('Registration response:', response);

      Alert.alert(
        'Success!',
        `Account created! Please check ${email} for a verification email.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form and switch to login
              setEmail('');
              setPassword('');
              setUsername('');
              setConfirmPassword('');
              setAcceptedTerms(false);
              setMarketingConsent(false);
              setIsRegisterMode(false);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Registration failed:', error);
      const errorData = error?.response?.data;
      let errorMessage = 'Registration failed';

      if (errorData?.details) {
        // Handle field-specific errors from backend
        const details = errorData.details;
        if (details.email) {
          errorMessage = Array.isArray(details.email) ? details.email[0] : details.email;
        } else if (details.username) {
          errorMessage = Array.isArray(details.username) ? details.username[0] : details.username;
        } else if (details.password) {
          errorMessage = Array.isArray(details.password) ? details.password[0] : details.password;
        }
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      setHasProcessedOAuth(false);
      const nextTarget = `${window.location.origin}${window.location.pathname}${window.location.search || ''}`;
      const loginUrl = buildBackendGoogleLoginUrl(nextTarget);
      window.location.href = loginUrl;
    } else {
      try {
        await promptAsync();
      } catch (error) {
        console.error('handleGoogleLogin: Unable to start AuthSession', error);
        Alert.alert('Login Failed', 'Could not start Google login.');
      }
    }
  };

  // Handle AuthSession response (also covers web)
  useEffect(() => {
    if (!response || Platform.OS === 'web') return;

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
  }, [response, handleAuthCodeExchange]);

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
      await logout();
      setSavedPropertiesCount(0);
      setHasFetchedSavedCount(false);
    } catch (error) {
      console.error('Logout failed:', error);
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.loginContainer}
        >
          <ScrollView 
            contentContainerStyle={styles.loginScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.loginCard}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your PropertPro account</Text>
              
              {/* Email/Password Login Form */}
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoggingIn}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Lock size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoggingIn}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#666" />
                    ) : (
                      <Eye size={20} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
                  onPress={handleEmailPasswordLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google OAuth Button */}
              <TouchableOpacity onPress={handleGoogleLogin} style={styles.googleButton} disabled={isLoggingIn}>
                <Image 
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1200px-Google_%22G%22_Logo.png' }} 
                  style={styles.googleLogo} 
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  loginContainer: { flex: 1, backgroundColor: '#f4f6fa' },
  loginScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loginCard: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontFamily: 'Poppins-Bold', fontSize: 26, color: '#0F3460', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' },
  
  // Form styles
  formContainer: { width: '100%', marginBottom: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16, borderWidth: 1, borderColor: '#e9ecef' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 15, color: '#333', paddingVertical: 12 },
  eyeIcon: { padding: 4 },
  loginButton: { backgroundColor: '#0F3460', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  loginButtonDisabled: { backgroundColor: '#8899aa' },
  loginButtonText: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#fff' },
  
  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e9ecef' },
  dividerText: { fontFamily: 'Poppins-Medium', fontSize: 13, color: '#999', marginHorizontal: 16 },
  
  // Google button
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: '#ddd', width: '100%' },
  googleLogo: { width: 20, height: 20, marginRight: 12 },
  googleButtonText: { fontFamily: 'Poppins-Medium', fontSize: 15, color: '#333' },
  
  // Register link
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666' },
  registerLink: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#0F3460' },
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
