/**
 * App Initialization Service
 * Handles initialization of all tabs and critical data during splash screen
 */
import { apiClient } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearFeedCache, setFeedCache } from '@/data/feedCache';
import { setChatThreadsCache, setChatMessagesCache } from '@/data/chatCache';

export interface InitializationResult {
  success: boolean;
  error?: string;
  duration: number;
}

export interface AppInitializationStatus {
  feed: InitializationResult;
  chat: InitializationResult;
  search: InitializationResult;
  profile: InitializationResult;
  totalDuration: number;
  allSuccessful: boolean;
}

/**
 * Initialize feed with new generation (force refresh)
 * Clears cache and fetches fresh feed data
 */
async function initializeFeed(): Promise<InitializationResult> {
  const startTime = Date.now();
  
  try {
    // Clear existing cache to force new generation
    await clearFeedCache();
    console.log('📱 Feed cache cleared for new generation');

    // Fetch fresh feed (first page)
    const response = await apiClient.get('feed/properties/', {
      params: { page: 1, page_size: 10 }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Feed initialized: ${response.data.results?.length || 0} items in ${duration}ms`);
    
    // Cache the results for instant display
    await setFeedCache({
      items: response.data.results || [],
      page: 1,
      next: response.data.next,
    });

    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.warn('⚠️ Feed initialization failed:', error?.message);
    
    return {
      success: false,
      error: error?.response?.data?.detail || error?.message || 'Failed to load feed',
      duration,
    };
  }
}

/**
 * Initialize chat - fetch threads and pre-fetch messages for recent threads
 */
async function initializeChat(): Promise<InitializationResult> {
  const startTime = Date.now();
  
  try {
    // Prefetch chat threads
    const threadsResponse = await apiClient.get('chat/');
    const threads = threadsResponse.data || [];
    
    // Cache threads for instant display
    await setChatThreadsCache(threads);

    // Pre-fetch messages for the top 10 most recent threads
    // This ensures the messages tab is fully cached and ready
    const messagesCache: Record<string, any[]> = {};
    const threadsToPrefetch = threads.slice(0, 10); // Top 10 most recent threads
    
    if (threadsToPrefetch.length > 0) {
      console.log(`📨 Pre-fetching messages for ${threadsToPrefetch.length} recent threads...`);
      
      // Fetch messages for each thread in parallel (but limit concurrency)
      const messagePromises = threadsToPrefetch.map(async (thread: any) => {
        try {
          const messagesResponse = await apiClient.get(`chat/${thread.id}/messages/`, {
            params: { limit: 30 }
          });
          
          // Messages come in reverse chronological order, reverse them for proper display
          const messages = (messagesResponse.data.results || []).reverse();
          messagesCache[thread.id] = messages;
          
          return { threadId: thread.id, success: true, count: messages.length };
        } catch (error: any) {
          console.warn(`⚠️ Failed to pre-fetch messages for thread ${thread.id}:`, error?.message);
          return { threadId: thread.id, success: false };
        }
      });
      
      const results = await Promise.allSettled(messagePromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const totalMessages = Object.values(messagesCache).reduce((sum, msgs) => sum + msgs.length, 0);
      
      console.log(`✅ Pre-fetched messages for ${successful}/${threadsToPrefetch.length} threads (${totalMessages} total messages)`);
      
      // Cache messages
      await setChatMessagesCache(messagesCache);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Chat initialized: ${threads.length} threads, ${Object.keys(messagesCache).length} threads with cached messages in ${duration}ms`);
    
    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.warn('⚠️ Chat initialization failed:', error?.message);
    
    // Chat initialization failure is not critical
    return {
      success: false,
      error: error?.response?.data?.detail || error?.message || 'Failed to load chat',
      duration,
    };
  }
}

/**
 * Initialize search - lightweight, just marks as ready
 */
async function initializeSearch(): Promise<InitializationResult> {
  const startTime = Date.now();
  
  try {
    // Search doesn't need prefetching - it's form-based
    // Just mark as initialized
    const duration = Date.now() - startTime;
    console.log(`✅ Search initialized in ${duration}ms`);

    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      error: error?.message || 'Failed to initialize search',
      duration,
    };
  }
}

/**
 * Initialize profile - user data already loaded in UserContext
 */
async function initializeProfile(): Promise<InitializationResult> {
  const startTime = Date.now();
  
  try {
    // Profile data is already loaded during auth check
    // This can be extended for additional profile-related data
    const duration = Date.now() - startTime;
    console.log(`✅ Profile initialized in ${duration}ms`);

    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      error: error?.message || 'Failed to initialize profile',
      duration,
    };
  }
}

/**
 * Initialize all tabs in parallel
 * This is called during splash screen after authentication
 */
export async function initializeAllTabs(): Promise<AppInitializationStatus> {
  const overallStartTime = Date.now();

  console.log('🚀 Starting app initialization...');

  // Initialize all tabs in parallel for faster loading
  const [feedResult, chatResult, searchResult, profileResult] = await Promise.allSettled([
    initializeFeed(),
    initializeChat(),
    initializeSearch(),
    initializeProfile(),
  ]);

  // Extract results
  const feed: InitializationResult = 
    feedResult.status === 'fulfilled' 
      ? feedResult.value 
      : { success: false, error: String(feedResult.reason), duration: 0 };

  const chat: InitializationResult = 
    chatResult.status === 'fulfilled' 
      ? chatResult.value 
      : { success: false, error: String(chatResult.reason), duration: 0 };

  const search: InitializationResult = 
    searchResult.status === 'fulfilled' 
      ? searchResult.value 
      : { success: false, error: String(searchResult.reason), duration: 0 };

  const profile: InitializationResult = 
    profileResult.status === 'fulfilled' 
      ? profileResult.value 
      : { success: false, error: String(profileResult.reason), duration: 0 };

  const totalDuration = Date.now() - overallStartTime;
  const allSuccessful = feed.success && chat.success && search.success && profile.success;

  const status: AppInitializationStatus = {
    feed,
    chat,
    search,
    profile,
    totalDuration,
    allSuccessful,
  };

  // Log summary
  const successCount = [feed.success, chat.success, search.success, profile.success].filter(Boolean).length;
  console.log(`${allSuccessful ? '✅' : '⚠️'} App initialization complete: ${successCount}/4 tabs ready in ${totalDuration}ms`);
  
  if (!feed.success) {
    console.warn('⚠️ Feed initialization failed - will load on first tab visit');
  }
  if (!chat.success) {
    console.warn('⚠️ Chat initialization failed - will load on first chat visit');
  }

  return status;
}
