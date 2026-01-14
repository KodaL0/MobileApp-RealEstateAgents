/**
 * Chat Cache Module
 * 
 * Centralized chat caching strategy for the mobile app.
 * Handles all chat cache operations with AsyncStorage for both threads and messages.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Thread, Message } from '@/app/features/types';

// ==================== CACHE CONFIGURATION ====================

export const CHAT_CACHE_KEY = '@chat_threads_cache';
export const CHAT_MESSAGES_CACHE_KEY = '@chat_messages_cache';
export const CHAT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// ==================== TYPE DEFINITIONS ====================

export interface ChatThreadsCacheData {
  threads: Thread[];
  timestamp: number;
}

export interface ChatMessagesCacheData {
  messages: Record<string, Message[]>;
  timestamp: number;
}

// ==================== THREAD CACHE FUNCTIONS ====================

/**
 * Get cached chat threads if valid (within TTL)
 * Returns null if cache is expired or missing
 */
export async function getCachedChatThreads(): Promise<ChatThreadsCacheData | null> {
  try {
    const cached = await AsyncStorage.getItem(CHAT_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const data: ChatThreadsCacheData = JSON.parse(cached);
    
    // Check if cache is still valid
    if (isChatCacheValid(data)) {
      return data;
    }

    // Cache expired
    return null;
  } catch (error) {
    console.warn('Failed to get cached chat threads:', error);
    return null;
  }
}

/**
 * Store chat threads in cache with current timestamp
 */
export async function setChatThreadsCache(threads: Thread[]): Promise<void> {
  try {
    const cacheData: ChatThreadsCacheData = {
      threads,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(cacheData));
    console.log(`✅ Chat threads cached: ${threads.length} threads`);
  } catch (error) {
    console.warn('Failed to set chat threads cache:', error);
  }
}

/**
 * Clear chat threads cache from AsyncStorage
 */
export async function clearChatThreadsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_CACHE_KEY);
    console.log('Chat threads cache cleared');
  } catch (error) {
    console.warn('Failed to clear chat threads cache:', error);
  }
}

// ==================== MESSAGES CACHE FUNCTIONS ====================

/**
 * Get cached chat messages if valid (within TTL)
 * Returns empty object if cache is expired or missing (maintains compatibility)
 */
export async function getCachedChatMessages(): Promise<Record<string, Message[]>> {
  try {
    const cached = await AsyncStorage.getItem(CHAT_MESSAGES_CACHE_KEY);
    if (!cached) {
      return {};
    }

    const data: ChatMessagesCacheData = JSON.parse(cached);
    
    // Check if cache is still valid
    if (isChatCacheValid(data)) {
      return data.messages || {};
    }

    // Cache expired
    return {};
  } catch (error) {
    console.warn('Failed to get cached chat messages:', error);
    return {};
  }
}

/**
 * Store chat messages in cache with current timestamp
 */
export async function setChatMessagesCache(messages: Record<string, Message[]>): Promise<void> {
  try {
    const cacheData: ChatMessagesCacheData = {
      messages,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(CHAT_MESSAGES_CACHE_KEY, JSON.stringify(cacheData));
    const threadCount = Object.keys(messages).length;
    const messageCount = Object.values(messages).reduce((sum, msgs) => sum + msgs.length, 0);
    console.log(`✅ Chat messages cached: ${threadCount} threads with ${messageCount} messages`);
  } catch (error) {
    console.warn('Failed to set chat messages cache:', error);
  }
}

/**
 * Clear chat messages cache from AsyncStorage
 */
export async function clearChatMessagesCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_MESSAGES_CACHE_KEY);
    console.log('Chat messages cache cleared');
  } catch (error) {
    console.warn('Failed to clear chat messages cache:', error);
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Clear both threads and messages cache
 */
export async function clearAllChatCache(): Promise<void> {
  await Promise.all([
    clearChatThreadsCache(),
    clearChatMessagesCache(),
  ]);
  console.log('All chat cache cleared');
}

/**
 * Check if cached data is still within TTL
 * Returns true if cache age < CHAT_CACHE_TTL
 */
export function isChatCacheValid(cachedData: { timestamp: number }): boolean {
  const age = getChatCacheAge(cachedData);
  return age < CHAT_CACHE_TTL;
}

/**
 * Get age of cache in milliseconds
 */
export function getChatCacheAge(cachedData: { timestamp: number }): number {
  return Date.now() - cachedData.timestamp;
}
