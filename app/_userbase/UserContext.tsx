import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { fetchUser as apiFetchUser, logout as apiLogout } from './middleware';
import { prefetchFeed, clearFeedCache } from '@/services/feedPrefetch';


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
  refreshUser: (forceCheck?: boolean) => Promise<void>;
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

  const fetchUser = async (forceCheck: boolean = false) => {
    setIsLoading(true);
    try {
      // Check for authentication
      if (Platform.OS !== 'web') {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }
      } else {
        // On web, HttpOnly cookies aren't visible in document.cookie.
        // Even if we can't detect cookies client-side, attempt to fetch the user.
        // The request will succeed if auth cookies exist and return 401 otherwise.
        if (!forceCheck && !hasAuthCookies()) {
          console.debug('UserContext: Auth cookies not detectable, attempting fetch anyway.');
        }
      }

      // Fetch user data - fetchUser now returns user object directly or null
      const userData = await apiFetchUser();
      console.log('UserContext: fetchUser returned:', userData);

      if (!userData || !userData.id) {
        console.warn('UserContext: No valid user data found');
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      console.log('UserContext: Setting user and isAuthenticated to true');
      setUser(userData);
      setIsAuthenticated(true);
      
      // Prefetch feed in background for instant display later
      prefetchFeed().catch(err => console.warn('Feed prefetch failed:', err));
    } catch (e: any) {
      // Clear auth on 401
      if (e?.response?.status === 401) {
        if (Platform.OS !== 'web') {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('mobile_access_token');
          await deleteRefreshToken();
        } else {
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
      
      // Prefetch feed in background for instant display
      prefetchFeed().catch(err => console.warn('Feed prefetch failed:', err));
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint
      await apiLogout();
      
      // Clear feed cache on logout
      await clearFeedCache();
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
