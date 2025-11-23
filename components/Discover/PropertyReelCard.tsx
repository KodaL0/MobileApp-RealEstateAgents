import React, { useState, useRef, useMemo, useCallback, memo, useEffect } from 'react';
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
} from 'react-native';
import {
  Heart,
  MapPin,
  Square,
  ArrowUpCircle,
  Layers,
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
import { Alert } from 'react-native';
import { useChat } from '@/app/features/chat/context/ChatContext';
import { useUser } from '@/app/_userbase/UserContext';
import type { FeedProperty } from '@/app/features/types';
import { analytics } from '@/services/analytics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_URL = 'https://propertprodjango.onrender.com';

// Calculate consistent image dimensions
const IMAGE_PADDING = 48;
const IMAGE_WIDTH = SCREEN_WIDTH - IMAGE_PADDING;
const IMAGE_ASPECT_RATIO = 16 / 9;
const IMAGE_MAX_HEIGHT = SCREEN_HEIGHT * 0.68;
const IMAGE_HEIGHT = Math.min(
  IMAGE_WIDTH / IMAGE_ASPECT_RATIO,
  IMAGE_MAX_HEIGHT
);

// Memoized image component for performance with consistent sizing
const OptimizedImage = memo(({ 
  uri, 
  style, 
  blurRadius = 0,
  onError,
  containerStyle
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
      {/* Loading placeholder */}
      {imageLoading && !imageError && (
        <View style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#111827',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }
        ]}>
          <ActivityIndicator size="large" color="#6b7280" />
        </View>
      )}
      
      {/* Error placeholder */}
      {imageError && (
        <View style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#111827',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }
        ]}>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>Image unavailable</Text>
        </View>
      )}
      
      <Image
        source={{ uri: imageUri }}
        style={[
          StyleSheet.absoluteFillObject,
          { width: '100%', height: '100%' },
          imageLoading && { opacity: 0 }
        ]}
        resizeMode="cover"
        onError={handleError}
        onLoad={handleLoad}
        blurRadius={blurRadius}
      />
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Memoized carousel indicator dots
const CarouselDots = memo(({ 
  count, 
  currentIndex 
}: { 
  count: number; 
  currentIndex: number;
}) => {
  if (count <= 1) return null;
  
  const dotContainerStyle = {
    position: 'absolute' as const,
    top: SCREEN_HEIGHT * 0.15,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 6,
    zIndex: 5,
  };
  
  const dotStyle = {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  };
  
  const dotActiveStyle = {
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  };
  
  return (
    <View style={dotContainerStyle}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            dotStyle,
            index === currentIndex && dotActiveStyle,
          ]}
        />
      ))}
    </View>
  );
});

CarouselDots.displayName = 'CarouselDots';

function PropertyReelCard({
  property,
  onViewProperty,
  source,
  onFavoriteMetaUpdate,
}: {
  property: FeedProperty;
  onViewProperty?: () => void;
  source?: string;
  onFavoriteMetaUpdate?: (
    propertyId: number | string,
    meta: { favorites_count?: number | null; is_favourite?: boolean | null }
  ) => void;
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
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const scrollX = useRef(new Animated.Value(0)).current;
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
    if (!property?.id) {
      return;
    }

    let isMounted = true;

    const fetchFavoriteMeta = async () => {
      try {
        // Use unified listings endpoint with _type discriminator
        const details = await api.listings.getById(property.id, 'property');
        if (!isMounted) return;

        const fetchedCount = getFavoriteCountValue(details?.favorites_count);
        if (fetchedCount !== null) {
          setFavoriteCount(fetchedCount);
        }
        if (typeof details?.is_favourite === 'boolean') {
          setIsLiked(details.is_favourite);
        }
        onFavoriteMetaUpdate?.(property.id, {
          favorites_count: fetchedCount ?? details?.favorites_count ?? null,
          is_favourite:
            typeof details?.is_favourite === 'boolean'
              ? details.is_favourite
              : null,
        });
      } catch (error) {
        console.warn('PropertyReelCard: Failed to refresh favorite metadata', error);
      }
    };

    fetchFavoriteMeta();

    return () => {
      isMounted = false;
    };
  }, [property?.id, getFavoriteCountValue]);
  
  // Memoize owner data
  const owner = useMemo(() => property?.owner ?? {}, [property?.owner]);
  const ownerIdValue = owner?.id ?? null;
  const ownerId = useMemo(() => {
    if (ownerIdValue === null || ownerIdValue === undefined) return NaN;
    return Number(ownerIdValue);
  }, [ownerIdValue]);
  
  const agentName: string | null = useMemo(() => 
    owner?.name ?? owner?.username ?? null,
    [owner?.name, owner?.username]
  );
  const ownerUsername: string | null = useMemo(() => 
    owner?.username ?? null,
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

  // Memoize images array with safe property access
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
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
    scrollX.setValue(event.nativeEvent.contentOffset.x);
  }, [scrollX]);

  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  }, []);

  const formatPrice = useCallback((price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price || 0),
    []
  );

  const getCountryColor = useCallback((country: string) => {
    switch (country) {
      case 'Greece':
        return '#2563eb';
      case 'Cyprus':
        return '#f97316';
      default:
        return '#6b7280';
    }
  }, []);

  const parseNumericValue = useCallback((value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(numeric) ? numeric : null;
  }, []);

  const bedroomsValue = useMemo(() => property ? parseNumericValue(property.bedrooms) : null, [property, parseNumericValue]);
  const bathroomsValue = useMemo(() => property ? parseNumericValue(property.bathrooms) : null, [property, parseNumericValue]);
  const areaValue = useMemo(() => property ? parseNumericValue(property.area) : null, [property, parseNumericValue]);

  const formatBathrooms = useCallback((value: number | null) => {
    if (value === null) return null;
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }, []);

  // Navigation handler for the View button with source tracking
  const handleViewPress = useCallback(() => {
    if (onViewProperty) {
      onViewProperty();
    } else if (property?.id) {
      const queryParams = source ? `?source=${source}` : '';
      router.push(`/property/${property.id}${queryParams}`);
    }
  }, [onViewProperty, property?.id, source, router]);

  // Handle title press to navigate to property page
  const handleTitlePress = useCallback(() => {
    handleViewPress();
  }, [handleViewPress]);

  // Heart animation trigger
  const triggerHeartAnimation = useCallback(() => {
    setShowHeartAnimation(true);
    heartScale.setValue(0);
    heartOpacity.setValue(1);

    // Native driver only works on iOS/Android, not on web
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

  // Favorite handler with API integration and success message
  const handleFavorite = useCallback(async () => {
    try {
      // Use unified listings endpoint with _type discriminator
      const response = await api.listings.toggleFavorite(property.id, 'property');
      setIsLiked(response.is_favourite || false);
      
      // Optimistic update
      setFavoriteCount(prev => {
        const responseCount = getFavoriteCountValue(response?.favorites_count);
        if (responseCount !== null) {
          return responseCount;
        }
        const safePrev = typeof prev === 'number' ? prev : 0;
        return response.is_favourite ? safePrev + 1 : Math.max(0, safePrev - 1);
      });
      
      // Refetch property details to get accurate favorites_count
      // (toggle API doesn't return favorites_count)
      try {
        // Use unified listings endpoint with _type discriminator
        const details = await api.listings.getById(property.id, 'property');
        const refreshedCount = getFavoriteCountValue(details?.favorites_count);
        if (refreshedCount !== null) {
          setFavoriteCount(refreshedCount);
        }
        onFavoriteMetaUpdate?.(property.id, {
          favorites_count: refreshedCount ?? details?.favorites_count ?? null,
          is_favourite:
            typeof details?.is_favourite === 'boolean'
              ? details.is_favourite
              : null,
        });
      } catch (fetchError) {
        // Silently fail - optimistic update already applied
        console.warn('PropertyReelCard: Failed to refresh favorites_count after toggle', fetchError);
      }
      
      Alert.alert(
        'Success',
        response.is_favourite 
          ? 'Property added to favorites!' 
          : 'Property removed from favorites!',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      console.error('Failed to toggle favorite:', e);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  }, [property.id]);

  // Handle touch start to detect taps vs swipes
  const handleTouchStart = useCallback((event: any) => {
    const touch = event.nativeEvent.touches[0];
    if (touch) {
      touchStartY.current = touch.pageY;
      touchStartX.current = touch.pageX;
    }
  }, []);

  // Handle touch end to detect taps vs swipes
  const handleTouchEnd = useCallback((event: any) => {
    const touch = event.nativeEvent.changedTouches?.[0];
    if (!touch) return;

    const deltaY = Math.abs(touch.pageY - touchStartY.current);
    const deltaX = Math.abs(touch.pageX - touchStartX.current);
    
    // If significant movement (>15px), it's a swipe - don't handle as tap
    if (deltaY > 15 || deltaX > 15) {
      return;
    }

    // It's a tap, check for double tap
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (!isLiked) {
        handleFavorite();
      }
      triggerHeartAnimation();
    } else {
      lastTap.current = now;
    }
  }, [isLiked, handleFavorite, triggerHeartAnimation]);

  // Chat handler: open or create thread then navigate to chat
  const handleChat = useCallback(async () => {
    if (isChatLoading) return;

    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to start a chat with the agent.');
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
      const threadId = await getOrCreateThread(ownerId, propertyId, property?.title);

      // Track chat conversion using centralized analytics service
      analytics.trackPropertyContact({
        propertyId,
        contactMethod: 'chat',
      });

      router.push(`/chat/${threadId}`);
    } catch (e: any) {
      console.error('Failed to initiate chat:', e);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setIsChatLoading(false);
    }
  }, [isChatLoading, isAuthenticated, ownerId, property?.id, property?.title, getOrCreateThread, router]);

  // Share handler with tracking and success message
  const handleShare = useCallback(async () => {
    try {
      // Track share using centralized analytics service
      analytics.trackPropertyShare({
        propertyId: property.id,
        method: 'copy_link',
      });
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

  // Defensive check after all hooks (following rules of hooks)
  if (!property) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <View 
        style={styles.container}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={() => false}
      >
        {/* Horizontal image scroll with blurred background */}
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
              {/* Blurred background - only render if not first image or if current */}
              {(index === 0 || index === currentIndex) && (
                <OptimizedImage
                  uri={uri}
                  style={StyleSheet.absoluteFillObject}
                  blurRadius={25}
                  onError={() => handleImageError(index)}
                  containerStyle={StyleSheet.absoluteFillObject}
                />
              )}

              {/* Main image - consistent sizing with fixed aspect ratio */}
              <View style={styles.image}>
                <OptimizedImage
                  uri={uri}
                  style={StyleSheet.absoluteFillObject}
                  onError={() => handleImageError(index)}
                  containerStyle={StyleSheet.absoluteFillObject}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Enhanced carousel indicators */}
        <CarouselDots count={images.length} currentIndex={currentIndex} />

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

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />

        {/* Enhanced Tags - better positioning and visual hierarchy */}
        <View style={styles.tagsContainer}>
          <View style={[styles.tag, styles.tagPrimary, { backgroundColor: '#111827' }]}>
            <Text style={styles.tagText} numberOfLines={1}>
              {property.property_type?.toUpperCase() || 'PROPERTY'}
            </Text>
          </View>
          <View
            style={[
              styles.tag,
              styles.tagSecondary,
              { backgroundColor: getCountryColor(property.country || '') },
            ]}
          >
            <Text style={styles.tagText} numberOfLines={1}>
              {property.country || 'Unknown'}
            </Text>
          </View>
          <View
            style={[
              styles.tag,
              styles.tagStatus,
              {
                backgroundColor:
                  property.property_status === 'for_sale'
                    ? '#10b981'
                    : '#3b82f6',
              },
            ]}
          >
            <Text style={styles.tagText} numberOfLines={1}>
              {property.property_status === 'for_sale'
                ? 'For Sale'
                : 'For Rent'}
            </Text>
          </View>
        </View>

        {/* Photo counter - integrated with tags */}
        {images.length > 1 && (
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {currentIndex + 1}/{images.length}
            </Text>
          </View>
        )}

        {/* Right side actions - moved lower */}
        <View style={styles.sideActions}>
          {/* Chat Button */}
          <TouchableOpacity
            style={[styles.chatButton, isChatLoading && styles.chatButtonDisabled]}
            onPress={handleChat}
            disabled={isChatLoading}
          >
            {isChatLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MessageCircle size={32} color="#fff" strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleFavorite}
          >
            <Heart
              size={32}
              color="#fff"
              fill={isLiked ? '#FF385C' : 'transparent'}
              strokeWidth={2}
            />
            <Text style={styles.actionText}>{favoriteCount}</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <Share size={32} color="#fff" strokeWidth={2} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity style={styles.actionButton} onPress={handleAgentProfilePress}>
            <UserCircle size={32} color="#fff" strokeWidth={2} />
            <Text style={styles.actionText}>Agent</Text>
          </TouchableOpacity>

          {/* View Property */}
          <TouchableOpacity
            style={styles.viewPropertyButton}
            onPress={handleViewPress} // ✅ now redirects
            activeOpacity={0.8}
          >
            <Text style={styles.viewPropertyText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info - Always visible */}
        <View style={styles.bottomInfo}>
          {/* Agent Name - Clickable */}
          {agentName && (
            <TouchableOpacity onPress={handleAgentProfilePress} activeOpacity={0.7}>
              <Text style={styles.agentName}>{agentName}</Text>
            </TouchableOpacity>
          )}

          {/* Full Title - Clickable */}
          <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
            <Text style={styles.title}>
              {property.title || 'Untitled Property'}
            </Text>
          </TouchableOpacity>

          {/* Price */}
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

          {/* Beds/Baths/Area in one line */}
          <View style={styles.statsRow}>
            {bedroomsValue !== null && (
              <View style={styles.statPill}>
                <Bed size={14} color="#fff" />
                <Text style={styles.statText}>{bedroomsValue.toString()}</Text>
              </View>
            )}
            {formatBathrooms(bathroomsValue) && (
              <View style={styles.statPill}>
                <Bath size={14} color="#fff" />
                <Text style={styles.statText}>{formatBathrooms(bathroomsValue)}</Text>
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

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  imageScroll: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  doubleTapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
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
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: SCREEN_HEIGHT * 0.08,
    paddingBottom: SCREEN_HEIGHT * 0.12,
    // Ensure consistent positioning regardless of image content
    position: 'relative',
    backgroundColor: '#000',
  },
  image: {
    // Fixed dimensions for consistency - all images render at same size
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111827',
    shadowColor: '#0F172A',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    // Ensure consistent positioning
    alignSelf: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
  },
  photoCounter: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.07,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagsContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.07,
    left: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: SCREEN_WIDTH * 0.65,
    zIndex: 5,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tagPrimary: {
    backgroundColor: '#111827',
  },
  tagSecondary: {
    backgroundColor: '#2563eb',
  },
  tagStatus: {
    backgroundColor: '#10b981',
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sideActions: {
    position: 'absolute',
    right: 16,
    bottom: SCREEN_HEIGHT * 0.22,
    alignItems: 'center',
    gap: 22,
    zIndex: 10,
  },
  chatButton: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 25,
    padding: 6,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  chatButtonDisabled: {
    opacity: 0.6,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewPropertyButton: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  viewPropertyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.11,
    left: 16,
    right: 100,
    zIndex: 10,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    marginLeft: 6,
    color: '#fff',
    fontSize: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

// Memoized component for performance
const MemoizedPropertyReelCard = memo(PropertyReelCard);

// Export memoized component
export default MemoizedPropertyReelCard;
