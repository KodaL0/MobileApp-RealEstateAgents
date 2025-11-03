import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { fetchUser as apiFetchUser, logout as apiLogout } from './middleware';


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

// Check if auth cookies exist (for web platform)
const hasAuthCookies = (): boolean => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const cookieString = document.cookie;
    // Check for any auth-related cookies
    const authCookieNames = [
      'access_token',
      'refresh_token',
      'mobile_access_token',
      'mobile_refresh_token',
      'sessionid'
    ];
    
    return authCookieNames.some(name => {
      const regex = new RegExp(`(^|; )${name}=`);
      return regex.test(cookieString);
    });
  }
  return false;
};

// Clear authentication cookies (for web platform)
const clearAuthCookies = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const cookieNames = [
      'access_token',
      'refresh_token',
      'mobile_access_token',
      'mobile_refresh_token',
      'csrftoken',
      'sessionid'
    ];
    
    // Get current hostname to determine domains
    const hostname = window.location.hostname;
    
    // Define all possible domain combinations
    // Cookies can only be set with: undefined (host-only) or '.propertpro.com' (with leading dot)
    // Specific subdomains like 'm.propertpro.com' are NOT valid cookie domains
    const domains: (string | undefined)[] = [
      undefined,  // Host-only (no domain) - covers current domain
    ];
    
    // Add .propertpro.com domain if we're on a propertpro.com domain (covers all subdomains)
    if (hostname.includes('propertpro.com')) {
      domains.push('.propertpro.com');
    }
    
    // Clear each cookie with all domain combinations and SameSite attributes
    cookieNames.forEach(name => {
      domains.forEach(domain => {
        // Clear with SameSite=None; Secure (for cross-origin cookies in production)
        let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=None; Secure`;
        if (domain) {
          cookieString += `; domain=${domain}`;
        }
        document.cookie = cookieString;
        
        // Clear with SameSite=Lax (for mobile browsers and same-site cookies)
        cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
        if (domain) {
          cookieString += `; domain=${domain}`;
        }
        document.cookie = cookieString;
      });
    });
    
    console.log('✅ Web cookies cleared with all domain combinations');
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
      let token: string | null = null;

      if (Platform.OS !== 'web') {
        // Native platforms rely on stored tokens
        token = await AsyncStorage.getItem('access_token');
        console.log('fetchUser: token found?', !!token, token ? token.substring(0, 20) + '...' : 'none');

        if (!token) {
          console.log('No access token found, user not authenticated');
          setUser(null);
          setIsAuthenticated(false);
          return;
        }
      } else {
        // Web platform: check if auth cookies exist before making API call
        console.log('fetchUser: running on web, checking for auth cookies');
        const hasAuth = hasAuthCookies();
        console.log('fetchUser: auth cookies present?', hasAuth);
        
        if (!hasAuth) {
          console.log('No auth cookies found, user not authenticated');
          setUser(null);
          setIsAuthenticated(false);
          return;
        }
        
        console.log('fetchUser: auth cookies found, proceeding with API call');
      }

      console.log('fetchUser: calling apiFetchUser');
      const data = await apiFetchUser();
      console.log('fetchUser: apiFetchUser response:', data);
      
      // handle nested or direct response shapes
      let userData: User | null = null;
      if (data?.user?.user) userData = data.user.user;
      else if (data?.user?.id) userData = data.user;
      else if (data?.data?.user) userData = data.data.user;
      else if (data?.id) userData = data as User;
      
      console.log('fetchUser: processed userData:', userData);

      if (!userData) {
        console.log('fetchUser: no user data returned, treating as unauthenticated');
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      setUser(userData);
      setIsAuthenticated(true);
    } catch (e: any) {
      console.error('UserContext fetchUser error', e);
      console.error('Error response status:', e?.response?.status);
      console.error('Error response data:', e?.response?.data);
      // If 401, clear tokens and set user to null
      if (e?.response?.status === 401) {
        console.log('401 error, clearing authentication');
        if (Platform.OS !== 'web') {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('mobile_access_token');
          await deleteRefreshToken();
        } else {
          // On web, also clear cookies on 401
          clearAuthCookies();
        }
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (accessToken: string, refreshToken: string, userData: User) => {
    try {
      // Store tokens
      await AsyncStorage.setItem('access_token', accessToken);
      await setRefreshToken(refreshToken);
      await AsyncStorage.setItem('mobile_access_token', accessToken);
      
      // Set user state
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await apiLogout();
    } catch (error) {
      console.error('Backend logout failed (will still clear local storage):', error);
    } finally {
      // Always clear all storage, regardless of backend API success
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('mobile_access_token');
      await deleteRefreshToken();
      
      // Clear cookies (for web platform)
      clearAuthCookies();
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
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
