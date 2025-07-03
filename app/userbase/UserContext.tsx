import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      if (!token) {
        console.log('No access token found, user not authenticated');
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const data = await apiFetchUser();
      // handle nested or direct response shapes
      let userData: User | null = null;
      if (data?.user?.user) userData = data.user.user;
      else if (data?.user?.id) userData = data.user;
      else if (data?.data?.user) userData = data.data.user;
      else if (data?.id) userData = data as User;
      
      setUser(userData);
      setIsAuthenticated(!!userData);
    } catch (e: any) {
      console.error('UserContext fetchUser error', e);
      // If 401, clear tokens and set user to null
      if (e?.response?.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('mobile_access_token');
        await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (accessToken: string, refreshToken: string, userData: User) => {
    try {
      await AsyncStorage.setItem('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('mobile_access_token');
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
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
