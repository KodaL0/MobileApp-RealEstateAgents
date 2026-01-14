/**
 * Feed Cache Module
 * 
 * Centralized feed caching strategy for the mobile app.
 * Handles all feed cache operations with AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeedItem } from '@/app/features/types';

// ==================== CACHE CONFIGURATION ====================

export const FEED_CACHE_KEY = '@feed_cache_v1';
export const FEED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// ==================== TYPE DEFINITIONS ====================

export interface FeedCacheData {
  items: FeedItem[];
  timestamp: number;
  page: number;
  next: string | null;
}

// ==================== CACHE FUNCTIONS ====================

/**
 * Get cached feed data if valid (within TTL)
 * Returns null if cache is expired or missing
 */
export async function getCachedFeedData(): Promise<FeedCacheData | null> {
  try {
    const cached = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const data: FeedCacheData = JSON.parse(cached);
    
    // Check if cache is still valid
    if (isCacheValid(data)) {
      return data;
    }

    // Cache expired
    return null;
  } catch (error) {
    console.warn('Failed to get cached feed:', error);
    return null;
  }
}

/**
 * Store feed data in cache with current timestamp
 */
export async function setFeedCache(data: Omit<FeedCacheData, 'timestamp'>): Promise<void> {
  try {
    const cacheData: FeedCacheData = {
      ...data,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cacheData));
    console.log(`✅ Feed cached: ${data.items.length} items`);
  } catch (error) {
    console.warn('Failed to set feed cache:', error);
  }
}

/**
 * Clear feed cache from AsyncStorage
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
 * Check if cached data is still within TTL
 * Returns true if cache age < FEED_CACHE_TTL
 */
export function isCacheValid(cachedData: FeedCacheData): boolean {
  const age = getCacheAge(cachedData);
  return age < FEED_CACHE_TTL;
}

/**
 * Get age of cache in milliseconds
 */
export function getCacheAge(cachedData: FeedCacheData): number {
  return Date.now() - cachedData.timestamp;
}
