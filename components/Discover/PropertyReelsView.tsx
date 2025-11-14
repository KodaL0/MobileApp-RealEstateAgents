import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  memo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
} from 'react-native';
import {
  Heart,
  MapPin,
  Square,
  UserCircle,
  MessageCircle,
  Share,
  Bed,
  Bath,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/config/api';
import { useChat } from '@/app/features/chat/context/ChatContext';
import { useUser } from '@/app/_userbase/UserContext';
import type { FeedProperty } from '@/app/features/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_URL = 'https://propertprodjango.onrender.com';

// 9:16 vertical frame – clamped so it doesn't exceed the screen
const REEL_ASPECT_RATIO = 16 / 9;
const REEL_HEIGHT = Math.min(
  SCREEN_WIDTH * REEL_ASPECT_RATIO,
  SCREEN_HEIGHT * 0.9
);

// ---------- OptimizedImage (unchanged logic, used for blur BG) ----------
const OptimizedImage = memo(
  ({
    uri,
    style,
    blurRadius = 0,
    onError,
    containerStyle,
  }: {
    uri: string;
    style: any;
    blurRadius?: number;
    onError?: () => void;
    containerStyle?: any;
  }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    const handleError = useCallback(() => {
      setImageError(true);
      setImageLoading(false);
      onError?.();
    }, [onError]);

    const handleLoad = useCallback(() => {
      setImageLoading(false);
    }, []);

    const imageUri = imageError
      ? 'https://via.placeholder.com/800x600?text=No+Image'
      : uri;

    return (
      <View style={containerStyle || style}>
        {imageLoading && !imageError && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.imageLoadingOverlay,
            ]}
          >
            <ActivityIndicator size="large" color="#6b7280" />
          </View>
        )}

        {imageError && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.imageErrorOverlay,
            ]}
          >
            <Text style={styles.imageErrorText}>Image unavailable</Text>
          </View>
        )}

        <Image
          source={{ uri: imageUri }}
          style={[StyleSheet.absoluteFillObject, style]}
          resizeMode="cover"
          onError={handleError}
          onLoad={handleLoad}
          blurRadius={blurRadius}
        />
      </View>
    );
  }
);
OptimizedImage.displayName = 'OptimizedImage';

// ---------- Main Reel Card Component ----------
function PropertyReelCard({
  property,
  onViewProperty,
  source,
}: {
  property: FeedProperty;
  onViewProperty?: () => void;
  source?: string;
}) {
  const router = useRouter();
  const getFavoriteCountValue = useCallback((value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, []);

  const [isLiked, setIsLiked] = useState(property?.is_favourite || false);
  const [favoriteCount, setFavoriteCount] = useState<number>(
    getFavoriteCountValue(property?.favorites_count) ?? 0
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const { getOrCreateThread } = useChat();
  const { isAuthenticated } = useUser();
  useEffect(() => {
    setIsLiked(property?.is_favourite || false);
  }, [property?.is_favourite]);

  useEffect(() => {
    const parsedCount = getFavoriteCountValue(property?.favorites_count);
    if (parsedCount !== null) {
      setFavoriteCount(parsedCount);
    }
  }, [property?.favorites_count, getFavoriteCountValue]);

  useEffect(() => {
    if (!property?.id) return;

    let isMounted = true;

    const fetchFavoriteMeta = async () => {
      try {
        const details = await api.properties.getById(property.id);
        if (!isMounted) return;

        const fetchedCount = getFavoriteCountValue(details?.favorites_count);
        if (fetchedCount !== null) {
          setFavoriteCount(fetchedCount);
        }
        if (typeof details?.is_favourite === 'boolean') {
          setIsLiked(details.is_favourite);
        }
      } catch (error) {
        console.warn(
          'PropertyReelCard: Failed to refresh favorite metadata',
          error
        );
      }
    };

    fetchFavoriteMeta();
    return () => {
      isMounted = false;
    };
  }, [property?.id, getFavoriteCountValue]);

  const owner = useMemo(() => property?.owner ?? {}, [property?.owner]);
  const ownerIdValue = owner?.id ?? null;
  const ownerId = useMemo(() => {
    if (ownerIdValue === null || ownerIdValue === undefined) return NaN;
    return Number(ownerIdValue);
  }, [ownerIdValue]);

  const agentName: string | null = useMemo(
    () => owner?.name ?? owner?.username ?? null,
    [owner?.name, owner?.username]
  );
  const ownerUsername: string | null = useMemo(
    () => owner?.username ?? null,
    [owner?.username]
  );

  const getValidUrl = useCallback((uri?: string) => {
    if (!uri) return 'https://via.placeholder.com/800x600?text=No+Image';
    return uri.startsWith('http') ? uri : `${BASE_URL}${uri}`;
  }, []);

  const handleAgentProfilePress = useCallback(() => {
    if (!ownerUsername) {
      Alert.alert('Unavailable', 'Agent profile is currently unavailable.');
      return;
    }

    router.push({
      pathname: '/agent/[username]',
      params: { username: ownerUsername },
    } as never);
  }, [ownerUsername, router]);

  const images = useMemo(() => {
    if (!property) return [getValidUrl()];
    if (property.images && property.images.length > 0) {
      return property.images
        .map((img: any) =>
          typeof img === 'string' ? getValidUrl(img) : getValidUrl(img.image)
        )
        .filter(Boolean);
    }
    return [getValidUrl()];
  }, [property, getValidUrl]);

  const handleScroll = useCallback((event: any) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    setCurrentIndex(index);
  }, []);

  const formatPrice = useCallback(
    (price: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
      }).format(price || 0),
    []
  );

  const parseNumericValue = useCallback(
    (value: number | string | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      const numeric = typeof value === 'string' ? parseFloat(value) : value;
      return Number.isFinite(numeric) ? numeric : null;
    },
    []
  );

  const bedroomsValue = useMemo(
    () => (property ? parseNumericValue(property.bedrooms) : null),
    [property, parseNumericValue]
  );
  const bathroomsValue = useMemo(
    () => (property ? parseNumericValue(property.bathrooms) : null),
    [property, parseNumericValue]
  );
  const areaValue = useMemo(
    () => (property ? parseNumericValue(property.area) : null),
    [property, parseNumericValue]
  );

  const formatBathrooms = useCallback((value: number | null) => {
    if (value === null) return null;
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }, []);

  const handleViewPress = useCallback(() => {
    if (onViewProperty) {
      onViewProperty();
    } else if (property?.id) {
      const queryParams = source ? `?source=${source}` : '';
      router.push(`/property/${property.id}${queryParams}`);
    }
  }, [onViewProperty, property?.id, source, router]);

  const handleTitlePress = useCallback(() => {
    handleViewPress();
  }, [handleViewPress]);

  // Heart animation
  const triggerHeartAnimation = useCallback(() => {
    setShowHeartAnimation(true);
    heartScale.setValue(0);
    heartOpacity.setValue(1);

    const useNative = Platform.OS !== 'web';

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1.2,
        friction: 3,
        tension: 40,
        useNativeDriver: useNative,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: useNative,
        }),
      ]),
    ]).start(() => {
      setShowHeartAnimation(false);
      heartScale.setValue(0);
    });
  }, [heartScale, heartOpacity]);

  const handleFavorite = useCallback(async () => {
    if (!property?.id) {
      console.warn(
        'PropertyReelCard: handleFavorite called without a property id'
      );
      return;
    }

    const propertyId = property.id;

    try {
      const response = await api.properties.toggleFavorite(propertyId);
      const nextLiked =
        typeof response?.is_favourite === 'boolean' ? response.is_favourite : !isLiked;

      setIsLiked(nextLiked);

      setFavoriteCount(prev => {
        const responseCount = getFavoriteCountValue(response?.favorites_count);
        if (responseCount !== null) {
          return responseCount;
        }

        const safePrev = typeof prev === 'number' ? prev : 0;
        return nextLiked ? safePrev + 1 : Math.max(0, safePrev - 1);
      });

      try {
        const details = await api.properties.getById(propertyId);
        const refreshedCount = getFavoriteCountValue(details?.favorites_count);
        if (refreshedCount !== null) {
          setFavoriteCount(refreshedCount);
        }
        if (typeof details?.is_favourite === 'boolean') {
          setIsLiked(details.is_favourite);
        }
      } catch (fetchError) {
        console.warn(
          'PropertyReelCard: Failed to refresh favorites_count after toggle',
          fetchError
        );
      }
    } catch (e: any) {
      console.error('Failed to toggle favorite:', e);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  }, [property?.id, isLiked]);

  // Tap / double-tap handler
  const handleTouchStart = useCallback((event: any) => {
    const touch = event.nativeEvent.touches[0];
    if (touch) {
      touchStartY.current = touch.pageY;
      touchStartX.current = touch.pageX;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (event: any) => {
      const touch = event.nativeEvent.changedTouches?.[0];
      if (!touch) return;

      const deltaY = Math.abs(touch.pageY - touchStartY.current);
      const deltaX = Math.abs(touch.pageX - touchStartX.current);

      if (deltaY > 15 || deltaX > 15) return;

      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
        if (!isLiked) {
          handleFavorite();
        }
        triggerHeartAnimation();
      } else {
        lastTap.current = now;
      }
    },
    [isLiked, handleFavorite, triggerHeartAnimation]
  );

  const handleChat = useCallback(async () => {
    if (isChatLoading) return;

    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to start a chat with the agent.'
      );
      router.push('/(tabs)/profile');
      return;
    }

    const propertyId = property?.id ? Number(property.id) : null;
    if (!ownerId || Number.isNaN(ownerId) || !propertyId || Number.isNaN(propertyId)) {
      Alert.alert('Unavailable', 'Could not identify the agent for this property.');
      return;
    }

    try {
      setIsChatLoading(true);
      const threadId = await getOrCreateThread(
        ownerId,
        propertyId,
        property?.title
      );

      api.analytics
        .trackConversion(propertyId, 'chat')
        .catch(err =>
          console.warn('Failed to track chat conversion:', err)
        );

      router.push(`/chat/${threadId}`);
    } catch (e: any) {
      console.error('Failed to initiate chat:', e);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setIsChatLoading(false);
    }
  }, [
    isChatLoading,
    isAuthenticated,
    ownerId,
    property?.id,
    property?.title,
    getOrCreateThread,
    router,
  ]);

  const handleShare = useCallback(async () => {
    try {
      Alert.alert(
        'Success',
        'Share tracked! Full sharing functionality coming soon.',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      console.error('Failed to track share:', e);
      Alert.alert('Error', 'Failed to track share. Please try again.');
    }
  }, []);

  if (!property) return null;

  // Tag line (top-left)
  const propertyType = (() => {
    if (!property?.property_type) return 'PROPERTY';
    if (property.property_type.toLowerCase() === 'residential_building') {
      return 'RESIDENTIAL';
    }
    return property.property_type.toUpperCase();
  })();
  const country = property.country || 'Unknown';
  const statusLabel =
    property.property_status === 'for_sale' ? 'For Sale' : 'For Rent';
  const tagLine = `${propertyType} · ${country} · ${statusLabel}`;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <View
        style={styles.container}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={() => false}
      >
        {/* IMAGE CAROUSEL – fixed 9:16-ish frame, blur + contain */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.imageScroll}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
        >
          {images.map((uri: string, index: number) => (
            <View key={`image-${index}`} style={styles.imageWrapper}>
              {/* Blurred BG */}
              <OptimizedImage
                uri={uri}
                style={StyleSheet.absoluteFillObject}
                containerStyle={StyleSheet.absoluteFillObject}
                blurRadius={25}
              />

              {/* Dark overlay to boost contrast */}
              <View style={styles.imageOverlay} />

              {/* Foreground 9:16 frame – full image visible (contain) */}
              <View style={styles.imageFrame}>
                <Image
                  source={{ uri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Gradient from bottom for text legibility */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          style={styles.bottomGradient}
        />

        {/* Top bar: compact tags + photo counter */}
        <View style={styles.topBar}>
          <View style={styles.tagContainer}>
            <Text style={styles.tagLine} numberOfLines={1}>
              {tagLine}
            </Text>
            {images.length > 1 && (
              <Text style={styles.photoCounterText}>
                {currentIndex + 1}/{images.length}
              </Text>
            )}
          </View>
        </View>

        {/* Heart animation overlay */}
        {showHeartAnimation && (
          <Animated.View
            style={[
              styles.heartAnimation,
              {
                opacity: heartOpacity,
                transform: [{ scale: heartScale }],
              },
            ]}
            pointerEvents="none"
          >
            <Heart size={80} color="#FF385C" fill="#FF385C" />
          </Animated.View>
        )}

        {/* RIGHT-SIDE ACTION COLUMN: Heart → Chat → Share → Agent → View */}
        <View style={styles.sideActions}>
          {/* Heart + count */}
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleFavorite}
            activeOpacity={0.8}
          >
            <Heart
              size={28}
              color="#fff"
              fill={isLiked ? '#FF385C' : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <Text style={styles.likeCount}>{favoriteCount}</Text>

          {/* Chat */}
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleChat}
            disabled={isChatLoading}
            activeOpacity={0.8}
          >
            {isChatLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MessageCircle size={28} color="#fff" strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share size={28} color="#fff" strokeWidth={2} />
          </TouchableOpacity>

          {/* Agent */}
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleAgentProfilePress}
            activeOpacity={0.8}
          >
            <UserCircle size={28} color="#fff" strokeWidth={2} />
          </TouchableOpacity>

          {/* View */}
          <TouchableOpacity
            style={styles.viewCircle}
            onPress={handleViewPress}
            activeOpacity={0.9}
          >
            <Text style={styles.viewText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM CAPTION INFO */}
        <View style={styles.bottomInfo}>
          {agentName && (
            <TouchableOpacity
              onPress={handleAgentProfilePress}
              activeOpacity={0.7}
            >
              <Text style={styles.agentName}>{agentName}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleTitlePress}
            activeOpacity={0.7}
          >
            <Text style={styles.title} numberOfLines={2}>
              {property.title || 'Untitled Property'}
            </Text>
          </TouchableOpacity>

          {/* Price row */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(property.price)}</Text>
            <Text style={styles.priceLabel}>
              {property.property_status === 'for_sale'
                ? 'Purchase Price'
                : '/month'}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={16} color="#10b981" />
            <Text style={styles.locationText} numberOfLines={1}>
              {property.location || 'Unknown Location'}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {bedroomsValue !== null && (
              <View style={styles.statPill}>
                <Bed size={14} color="#fff" />
                <Text style={styles.statText}>
                  {bedroomsValue.toString()}
                </Text>
              </View>
            )}
            {formatBathrooms(bathroomsValue) && (
              <View style={styles.statPill}>
                <Bath size={14} color="#fff" />
                <Text style={styles.statText}>
                  {formatBathrooms(bathroomsValue)}
                </Text>
              </View>
            )}
            {areaValue !== null && (
              <View style={styles.statPill}>
                <Square size={14} color="#fff" />
                <Text style={styles.statText}>
                  {areaValue.toLocaleString()} m²
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------- Feed Container Component ----------
export default function PropertyReelsView() {
  const [properties, setProperties] = useState<FeedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { isAuthenticated } = useUser();
  const flatListRef = useRef<FlatList>(null);

  const fetchFeed = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!isAuthenticated) {
      setError('Please sign in to view your personalized feed.');
      setLoading(false);
      return;
    }

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await api.feed.list({ page: pageNum, page_size: 5 });
      
      if (append) {
        setProperties(prev => [...prev, ...response.results]);
      } else {
        setProperties(response.results);
      }

      setHasNextPage(response.next !== null);
    } catch (err: any) {
      console.error('Failed to fetch feed:', err);
      setError(err?.response?.data?.detail || 'Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNextPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(nextPage, true);
    }
  }, [page, loadingMore, hasNextPage, fetchFeed]);

  const renderItem = useCallback(({ item }: { item: FeedProperty }) => {
    return (
      <View style={styles.reelItem}>
        <PropertyReelCard property={item} source="feed" />
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: FeedProperty) => {
    return item.id?.toString() || `property-${Math.random()}`;
  }, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    []
  );

  if (loading && properties.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading your feed...</Text>
      </View>
    );
  }

  if (error && properties.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchFeed(1, false)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No properties found</Text>
        <Text style={styles.emptySubtext}>Check back later for new listings</Text>
      </View>
    );
  }

  return (
    <View style={styles.feedContainer}>
      <FlatList
        ref={flatListRef}
        data={properties}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#10b981" />
            </View>
          ) : null
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />
    </View>
  );
}

const ICON_CIRCLE_SIZE = 40;

const styles = StyleSheet.create({
  feedContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    backgroundColor: '#000',
  },
  imageScroll: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#000',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  imageFrame: {
    width: SCREEN_WIDTH,
    height: REEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
  },

  // Loading / error overlay for OptimizedImage
  imageLoadingOverlay: {
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageErrorOverlay: {
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageErrorText: {
    color: '#6b7280',
    fontSize: 12,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.05,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  tagLine: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Heart animation
  heartAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Right-side actions
  sideActions: {
    position: 'absolute',
    right: 16,
    top: SCREEN_HEIGHT * 0.25,
    alignItems: 'center',
    zIndex: 20,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  likeCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  viewCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  viewText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom caption info
  bottomInfo: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    right: 92, // leave space for right actions
    zIndex: 15,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
    gap: 8,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 6,
    color: '#fff',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
