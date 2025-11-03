// app/middleware/auth.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import apiService from '@/config/api';

export async function login(email: string, password: string) {
  const res = await apiService.auth.login({ email, password });
  if (Platform.OS !== 'web') {
    if (res?.access_token && res?.refresh_token) {
      await AsyncStorage.setItem('access_token', res.access_token);
      await AsyncStorage.setItem('refresh_token', res.refresh_token);
      await AsyncStorage.setItem('mobile_access_token', res.access_token);
    } else {
      console.warn('login: tokens not present in response payload');
    }
  }
  return res;
}

export async function logout() {
  await apiService.auth.logout();
  if (Platform.OS !== 'web') {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    await AsyncStorage.removeItem('mobile_access_token');
  }
}

export async function register(
  username: string,
  email: string,
  password: string,
  acceptedTerms: boolean = false,
  acceptedPrivacy: boolean = false,
  marketingConsent: boolean = false
) {
  const res = await apiService.auth.register({
    username: username.toLowerCase(),
    email,
    password,
    accepted_terms: acceptedTerms,
    accepted_privacy_policy: acceptedPrivacy,
    marketing_consent: marketingConsent,
    terms_accepted_at: new Date().toISOString(),
  });
  return res;
}

export async function fetchUser() {
  const res = await apiService.auth.getUser();
  return res.user ?? null;
}
