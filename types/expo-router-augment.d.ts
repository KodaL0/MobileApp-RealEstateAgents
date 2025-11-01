import type { Router } from 'expo-router/build/imperative-api';

declare module 'expo-router' {
  export const router: Router;
  export function useRouter(): Router;
}

