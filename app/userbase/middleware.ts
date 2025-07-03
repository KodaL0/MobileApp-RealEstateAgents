// app/middleware/auth.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/config/api';

export async function login(email: string, password: string) {
  const res = await api.auth.login({ email, password });
  // assume res.access_token and res.refresh_token
  await AsyncStorage.setItem('access_token', res.access_token);
  await AsyncStorage.setItem('refresh_token', res.refresh_token);
  return res;
}

export async function logout() {
  await api.auth.logout();
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
}

export async function fetchUser() {
  try {
    const res = await api.auth.getUser();
    return res.user ?? null;
  } catch {
    await AsyncStorage.removeItem('access_token');
    return null;
  }
}
