import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import PropertyReelCard from './PropertyReelCard';
import { api } from '@/config/api';
import { useUser } from '@/app/_userbase/UserContext';
import type { ViewToken } from 'react-native';
import type { FeedProperty } from '@/app/features/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FeedListItem = FeedProperty & { __cycle?: number; __listKey?: string };

export default function PropertyReelsView() {
  const [properties, setProperties] = useState<FeedListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(2);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { isAuthenticated, isLoading: authLoading } = useUser();
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });
  const isFetchingRef = useRef(false);
  const propertiesRef = useRef<FeedListItem[]>([]);
  const nextPageRef = useRef<number | null>(2);
  const hasMoreRef = useRef(true);
  const cycleRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const scrollOffsetRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => {
    propertiesRef.current = properties;
    nextPageRef.current = nextPage;
    hasMoreRef.current = hasMore;
  }, [properties, nextPage, hasMore]);

  const fetchFeed = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        console.log(
          `[Feed] requesting page ${page} (append=${append}) | isAuthenticated=${isAuthenticated}`
        );
        if (!append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const response = await api.feed.list({ page });
        const newProperties = response.results || [];

        if (newProperties.length > 0) {
          let cycle = cycleRef.current;

          if (!append) {
            cycleRef.current = 0;
            cycle = 0;
          } else if (page === 1 && !response.next) {
            cycleRef.current += 1;
            cycle = cycleRef.current;
          }

          const decorated = newProperties.map((item: any, idx: number) => ({
            ...item,
            __cycle: cycle,
            __listKey: `cycle-${cycle}-property-${item?.id ?? idx}`,
          }));

          if (append) {
            setProperties(prev => [...prev, ...decorated]);
          } else {
            setProperties(decorated);
          }
          console.log(
            `[Feed] loaded ${decorated.length} items for page ${page} (append=${append}) | cycle=${cycle}`
          );
        } else if (!append && page === 1) {
          setProperties([]);
          console.log('[Feed] initial load returned 0 items');
        }

        // Update pagination state
        if (response.next) {
          setNextPage(page + 1);
          setHasMore(true);
        } else if (newProperties.length > 0) {
          // Loop back to page 1 for infinite scroll
          setNextPage(1);
          setHasMore(true);
        } else {
          setNextPage(null);
          setHasMore(false);
        }
      } catch (err: any) {
        console.error('Error fetching feed:', err);
        if (err.response?.status === 401) {
          setError('Please log in to view your property feed.');
        } else {
          setError('Failed to load feed. Please try again.');
        }
        if (!append) {
          setProperties([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [isAuthenticated]
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (!viewableItems.length || !isAuthenticated) return;

      const index = viewableItems[0].index ?? 0;
      const total = propertiesRef.current.length;
      const currentNextPage = nextPageRef.current;
      const currentHasMore = hasMoreRef.current;

      if (
        currentHasMore &&
        !isFetchingRef.current &&
        total >= 5 &&
        index >= total - 2 &&
        currentNextPage
      ) {
        fetchFeed(currentNextPage, true);
      }

      const currentItem = propertiesRef.current[index];
      const itemId = currentItem?.id ?? 'unknown';
      console.log(`[Feed] user viewing index ${index} of ${total} | propertyId=${itemId}`);
    },
    [isAuthenticated, fetchFeed]
  );

  // Initial fetch - only on mount and auth state change
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      // Only fetch if we haven't initialized yet
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        fetchFeed(1, false);
      }
    } else {
      // Reset only if auth state changes to unauthenticated
      if (hasInitializedRef.current) {
        hasInitializedRef.current = false;
      }
      setLoading(false);
      setLoadingMore(false);
      setError('Please log in to view your property feed.');
      setProperties([]);
      setHasMore(false);
      setNextPage(null);
    }
    // Only depend on auth state, not fetchFeed to prevent refetch on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Handle screen focus - don't refetch, just ensure we have data
  useFocusEffect(
    useCallback(() => {
      // When screen comes into focus, don't refetch if we already have data
      // This prevents refetching when navigating back from agent profile
      if (isAuthenticated && !authLoading && properties.length === 0 && !loading && !hasInitializedRef.current) {
        hasInitializedRef.current = true;
        fetchFeed(1, false);
      }
    }, [isAuthenticated, authLoading, properties.length, loading, fetchFeed])
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F3460" />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No properties available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <FlatList
        ref={flatListRef}
        data={properties}
        renderItem={({ item }) => <PropertyReelCard property={item} source="feed" />}
        keyExtractor={(item, index) => item?.__listKey ?? `property-${item?.id ?? index}-${index}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#0F3460" />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF385C',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
