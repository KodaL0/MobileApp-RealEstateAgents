import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import axios from 'axios';
import { router } from 'expo-router';

const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const REDIRECT_URI = AuthSession.makeRedirectUri();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export default function LoginScreen() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ['openid', 'profile', 'email'],
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      console.log('Google ID Token obtained:', id_token);
      handleBackendLogin(id_token);
    }
  }, [response]);

  const handleBackendLogin = async (idToken: string) => {
    try {
      const res = await axios.post('https://api.propertpro.com/accounts/google/login/mobile/', {
        id_token: idToken,
      });

      const { access_token, refresh_token, user } = res.data;
      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('refresh_token', refresh_token);

      console.log('Login success, user:', user);

      router.replace('/profile');
    } catch (error) {
      console.error('Error during backend login:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to your account</Text>
      <Text style={styles.subtitle}>Secure sign-in with your Google account</Text>

      <TouchableOpacity
        onPress={() => promptAsync()}
        style={styles.googleButton}
        disabled={!request}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F0F4FA' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F3460', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32, textAlign: 'center' },
  googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, elevation: 2 },
  googleButtonText: { fontSize: 16, color: '#333', fontWeight: '500' },
});
