import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useUser } from '../UserContext';

/**
 * Hook that requires authentication for a screen
 * Automatically redirects to login if user is not authenticated
 * 
 * @param redirectTo - Optional custom redirect path (default: '/auth/login')
 * @returns User object if authenticated, null otherwise
 */
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, redirectTo, router]);

  return { user, isLoading };
}

