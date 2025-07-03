import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUser as apiFetchUser } from '../../../middleware/auth';


export type User = {
  id: number;
  username: string;
  email: string;
};

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetchUser();
      // handle nested or direct response shapes
      if (data?.user?.user) setUser(data.user.user);
      else if (data?.user?.id) setUser(data.user);
      else if (data?.data?.user) setUser(data.data.user);
      else if (data?.id) setUser(data as User);
      else setUser(null);
    } catch (e: any) {
      console.error('UserContext fetchUser error', e);
      // If 401, clear tokens and set user to null
      if (e?.response?.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('mobile_access_token');
        await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
