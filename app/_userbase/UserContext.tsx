import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { fetchUser as apiFetchUser } from './middleware';


export type User = {
  id: number;
  username: string;
  email: string;
  name?: string;
  profile_picture?: string;
  is_premium?: boolean;
};

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  login: (accessToken: string, refreshToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Platform-specific secure storage helpers
const setRefreshToken = async (token: string) => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem('refresh_token', token);
  } else {
    await SecureStore.setItemAsync('refresh_token', token);
  }
};

const deleteRefreshToken = async () => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem('refresh_token');
  } else {
    await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
  }
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      // Check if we have a token first
      const token = await AsyncStorage.getItem('access_token');
      console.log('fetchUser: token found?', !!token, token ? token.substring(0, 20) + '...' : 'none');
      
      if (!token) {
        console.log('No access token found, user not authenticated');
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      console.log('fetchUser: calling apiFetchUser with token');
      const data = await apiFetchUser();
      console.log('fetchUser: apiFetchUser response:', data);
      
      // handle nested or direct response shapes
      let userData: User | null = null;
      if (data?.user?.user) userData = data.user.user;
      else if (data?.user?.id) userData = data.user;
      else if (data?.data?.user) userData = data.data.user;
      else if (data?.id) userData = data as User;
      
      console.log('fetchUser: processed userData:', userData);
      setUser(userData);
      setIsAuthenticated(!!userData);
    } catch (e: any) {
      console.error('UserContext fetchUser error', e);
      console.error('Error response status:', e?.response?.status);
      console.error('Error response data:', e?.response?.data);
      // If 401, clear tokens and set user to null
      if (e?.response?.status === 401) {
        console.log('401 error, clearing tokens');
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('mobile_access_token');
        await deleteRefreshToken();
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (accessToken: string, refreshToken: string, userData: User) => {
    console.log('=== USERCONTEXT LOGIN START ===');
    console.log('UserContext.login: Starting login process');
    console.log('UserContext.login: Access token length:', accessToken?.length);
    console.log('UserContext.login: Refresh token length:', refreshToken?.length);
    console.log('UserContext.login: User data:', userData);
    
    try {
      console.log('UserContext.login: Storing tokens and user data');
      console.log('UserContext.login: accessToken length:', accessToken?.length);
      console.log('UserContext.login: refreshToken length:', refreshToken?.length);
      console.log('UserContext.login: userData:', userData);
      
      // Store tokens first
      console.log('UserContext.login: Storing access token in AsyncStorage');
      await AsyncStorage.setItem('access_token', accessToken);
      console.log('UserContext.login: Access token stored successfully');
      
      console.log('UserContext.login: Storing refresh token');
      await setRefreshToken(refreshToken);
      console.log('UserContext.login: Refresh token stored successfully');
      
      // Verify token was stored
      console.log('UserContext.login: Verifying token storage');
      const storedToken = await AsyncStorage.getItem('access_token');
      console.log('UserContext.login: token verification - stored?', !!storedToken, storedToken ? storedToken.substring(0, 20) + '...' : 'none');
      
      // Set user state immediately from the data we already have
      console.log('UserContext.login: Updating user state');
      setUser(userData);
      console.log('UserContext.login: User state updated');
      
      console.log('UserContext.login: Setting authentication state');
      setIsAuthenticated(true);
      console.log('UserContext.login: Authentication state updated');
      
      console.log('UserContext.login: tokens stored successfully, user state updated');
      console.log('=== USERCONTEXT LOGIN COMPLETE ===');
    } catch (error: any) {
      console.error('=== USERCONTEXT LOGIN ERROR ===');
      console.error('UserContext.login: Error storing tokens:', error);
      console.error('UserContext.login: Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('mobile_access_token');
      await deleteRefreshToken();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      isLoading, 
      isAuthenticated,
      refreshUser: fetchUser, 
      login,
      logout
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
