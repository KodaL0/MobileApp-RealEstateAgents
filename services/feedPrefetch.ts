/**
 * Feed Prefetch Service
 * Pre-loads feed data in the background for instant display
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/config/api';

const FEED_CACHE_KEY = '@feed_cache_v1';
const PREFETCH_IN_PROGRESS_KEY = '@feed_prefetch_in_progress';

let prefetchPromise: Promise<void> | null = null;

/**
 * Prefetch feed data in background
 * Called on app initialization to warm up the cache
 */
export async function prefetchFeed(): Promise<void> {
  // Prevent multiple simultaneous prefetches
  if (prefetchPromise) {
    return prefetchPromise;
  }

  prefetchPromise = (async () => {
    try {
      // Check if a prefetch is already in progress
      const inProgress = await AsyncStorage.getItem(PREFETCH_IN_PROGRESS_KEY);
      if (inProgress === 'true') {
        console.log('Feed prefetch already in progress');
        return;
      }

      // Mark prefetch as in progress
      await AsyncStorage.setItem(PREFETCH_IN_PROGRESS_KEY, 'true');

      console.log('Starting feed prefetch...');
      const startTime = Date.now();

      // Fetch first page of feed
      const response = await api.feed.list({ page: 1, page_size: 10 });

      // Cache the results
      await AsyncStorage.setItem(
        FEED_CACHE_KEY,
        JSON.stringify({
          items: response.results,
          timestamp: Date.now(),
          page: 1,
        })
      );

      const duration = Date.now() - startTime;
      console.log(`Feed prefetch completed in ${duration}ms (${response.results.length} items)`);
    } catch (error) {
      console.warn('Feed prefetch failed:', error);
    } finally {
      // Clear the in-progress flag
      await AsyncStorage.removeItem(PREFETCH_IN_PROGRESS_KEY);
      prefetchPromise = null;
    }
  })();

  return prefetchPromise;
}

/**
 * Clear feed cache
 */
export async function clearFeedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FEED_CACHE_KEY);
    console.log('Feed cache cleared');
  } catch (error) {
    console.warn('Failed to clear feed cache:', error);
  }
}

/**
 * Get cached feed
 */
export async function getCachedFeed(): Promise<any | null> {
  try {
    const cachedData = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.warn('Failed to get cached feed:', error);
  }
  return null;
}
