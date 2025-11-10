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
import PropertyReelCard from './PropertyReelCard';
import { api } from '@/config/api';
import { useUser } from '@/app/_userbase/UserContext';
import type { ViewToken } from 'react-native';
import type { ViewToken } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PropertyReelsView() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(2);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { isAuthenticated, isLoading: authLoading } = useUser();
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });
  const lastVisibleIndex = useRef(0);
  const [prefetchingAhead, setPrefetchingAhead] = useState(false);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });
  const lastVisibleIndex = useRef(0);
  const [prefetchingAhead, setPrefetchingAhead] = useState(false);

  const fetchFeed = useCallback(
    async (page: number = 1, options: { append?: boolean } = {}) => {
      const append = options.append ?? page !== 1;

    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await api.feed.list({ page, page_size: 10 });
      const newProperties = response.results || [];

      if (newProperties.length) {
        if (append) {
          setProperties(prev => {
            const merged = [...prev, ...newProperties];
            return merged.length > 60 ? merged.slice(merged.length - 60) : merged;
          });
        } else {
          setProperties(newProperties);
        }
      } else if (!append && page === 1) {
        setProperties([]);
      }

      // Update pagination state
      if (response.next) {
        // Extract page number from next URL or increment
        const nextPageNum = page + 1;
        setNextPage(nextPageNum);
        setHasMore(true);
      } else if (newProperties.length) {
        // recycle from first page
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
      setProperties([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
    },
    []
  );

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextPage && isAuthenticated) {
      fetchFeed(nextPage, { append: true });
    }
  }, [loadingMore, hasMore, nextPage, fetchFeed, isAuthenticated]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (!viewableItems.length) return;
      const index = viewableItems[0].index ?? 0;
      lastVisibleIndex.current = index;

      const total = properties.length;
      if (
        isAuthenticated &&
        hasMore &&
        !loadingMore &&
        !prefetchingAhead &&
        total >= 10 &&
        index >= total - 3 &&
        nextPage
      ) {
        setPrefetchingAhead(true);
        fetchFeed(nextPage, { append: true }).finally(() => setPrefetchingAhead(false));
      }
    },
    [fetchFeed, hasMore, isAuthenticated, loadingMore, nextPage, prefetchingAhead, properties.length]
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (!viewableItems.length) {
        return;
      }
      const index = viewableItems[0].index ?? 0;
      lastVisibleIndex.current = index;

      const total = properties.length;
      if (
        isAuthenticated &&
        hasMore &&
        !loadingMore &&
        !prefetchingAhead &&
        total >= 10 &&
        index >= total - 3 &&
        nextPage
      ) {
        setPrefetchingAhead(true);
        fetchFeed(nextPage, { append: true }).finally(() => setPrefetchingAhead(false));
      }
    },
    [fetchFeed, hasMore, isAuthenticated, loadingMore, nextPage, properties.length, prefetchingAhead]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (isAuthenticated) {
      fetchFeed(1);
    } else {
      setLoading(false);
      setLoadingMore(false);
      setError('Please log in to view your property feed.');
      setProperties([]);
      setHasMore(false);
      setNextPage(null);
    }
  }, [authLoading, isAuthenticated, fetchFeed]);

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
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
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
