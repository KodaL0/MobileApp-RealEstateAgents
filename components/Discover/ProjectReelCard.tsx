import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
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
  Building2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '@/config/api';
import { useChat } from '@/app/features/chat/context/ChatContext';
import { useUser } from '@/app/_userbase/UserContext';
import type { FeedProject } from '@/app/features/types';
import { analytics } from '@/services/analytics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_URL = 'https://propertprodjango.onrender.com';

// 9:16 vertical frame – clamped so it doesn't exceed the screen
const REEL_ASPECT_RATIO = 16 / 9;
const REEL_HEIGHT = Math.min(
  SCREEN_WIDTH * REEL_ASPECT_RATIO,
  SCREEN_HEIGHT * 0.9
);

// ---------- OptimizedImage (reused from PropertyReelCard) ----------
const OptimizedImage = React.memo(
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

// ---------- Main Project Reel Card Component ----------
function ProjectReelCard({
  project,
  onViewProject,
  source,
  onFavoriteMetaUpdate,
}: {
  project: FeedProject;
  onViewProject?: () => void;
  source?: string;
  onFavoriteMetaUpdate?: (
    projectId: number | string,
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

  const [isLiked, setIsLiked] = useState(project?.is_favourite || false);
  const [favoriteCount, setFavoriteCount] = useState<number>(
    getFavoriteCountValue(project?.favorites_count) ?? 0
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
    setIsLiked(project?.is_favourite || false);
  }, [project?.is_favourite]);

  useEffect(() => {
    const parsedCount = getFavoriteCountValue(project?.favorites_count);
    if (parsedCount !== null) {
      setFavoriteCount(parsedCount);
    }
  }, [project?.favorites_count, getFavoriteCountValue]);

  useEffect(() => {
    if (!project?.id) return;

    let isMounted = true;

    const fetchFavoriteMeta = async () => {
      try {
        const details = await api.projects.getById(project.id);
        if (!isMounted) return;

        const fetchedCount = getFavoriteCountValue(details?.favorites_count);
        if (fetchedCount !== null) {
          setFavoriteCount(fetchedCount);
        }
        if (typeof details?.is_favourite === 'boolean') {
          setIsLiked(details.is_favourite);
        }
        onFavoriteMetaUpdate?.(project.id, {
          favorites_count: fetchedCount ?? details?.favorites_count ?? null,
          is_favourite:
            typeof details?.is_favourite === 'boolean'
              ? details.is_favourite
              : null,
        });
      } catch (error) {
        console.warn(
          'ProjectReelCard: Failed to refresh favorite metadata',
          error
        );
      }
    };

    fetchFavoriteMeta();
    return () => {
      isMounted = false;
    };
  }, [project?.id, getFavoriteCountValue]);

  useEffect(() => {
    setShowHeartAnimation(false);
    setIsChatLoading(false);
    setCurrentIndex(0);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, animated: false });
    }
  }, [project?.id]);

  const owner = useMemo(() => project?.owner ?? {}, [project?.owner]);
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
      Alert.alert('Unavailable', 'Developer profile is currently unavailable.');
      return;
    }

    router.push({
      pathname: '/agent/[username]',
      params: { username: ownerUsername },
    } as never);
  }, [ownerUsername, router]);

  const images = useMemo(() => {
    if (!project) return [getValidUrl()];
    if (project.images && project.images.length > 0) {
      return project.images
        .map((img: any) =>
          typeof img === 'string' ? getValidUrl(img) : getValidUrl(img.image)
        )
        .filter(Boolean);
    }
    // Fallback to main_image if no images array
    if (project.main_image) {
      return [getValidUrl(project.main_image)];
    }
    return [getValidUrl()];
  }, [project, getValidUrl]);

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

  const formatPriceRange = useCallback(
    (min?: number, max?: number, isRent: boolean = false) => {
      if (min === undefined && max === undefined) return null;
      if (min === max) {
        return `${formatPrice(min!)}${isRent ? '/mo' : ''}`;
      }
      if (min && max) {
        return `${formatPrice(min)} - ${formatPrice(max)}${isRent ? '/mo' : ''}`;
      }
      if (min) {
        return `From ${formatPrice(min)}${isRent ? '/mo' : ''}`;
      }
      if (max) {
        return `Up to ${formatPrice(max)}${isRent ? '/mo' : ''}`;
      }
      return null;
    },
    [formatPrice]
  );

  const formatRange = useCallback(
    (min?: number, max?: number, unit: string = '', showDecimals: boolean = false) => {
      if (min === undefined && max === undefined) return null;
      const formatValue = (val: number) => {
        if (showDecimals) {
          const rounded = Math.round(val * 10) / 10;
          return rounded % 1 === 0
            ? rounded.toLocaleString()
            : rounded.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              });
        } else {
          return Math.round(val).toLocaleString();
        }
      };
      if (min !== undefined && max !== undefined && min === max) {
        return `${formatValue(min)}${unit}`;
      }
      if (min !== undefined && max !== undefined) {
        return `${formatValue(min)}${unit} - ${formatValue(max)}${unit}`;
      }
      if (min !== undefined) {
        return `From ${formatValue(min)}${unit}`;
      }
      if (max !== undefined) {
        return `Up to ${formatValue(max)}${unit}`;
      }
      return null;
    },
    []
  );

  // Determine listing type (sale or rent) based on available ranges
  const listingType = useMemo(() => {
    if (project.sale_price_min !== undefined || project.sale_price_max !== undefined) {
      return 'sale';
    }
    if (project.rent_price_min !== undefined || project.rent_price_max !== undefined) {
      return 'rent';
    }
    return 'sale'; // Default to sale
  }, [project]);

  // Get ranges based on listing type
  const bedroomsMin = listingType === 'sale' ? project.sale_bedrooms_min : project.rent_bedrooms_min;
  const bedroomsMax = listingType === 'sale' ? project.sale_bedrooms_max : project.rent_bedrooms_max;
  const bathroomsMin = listingType === 'sale' ? project.sale_bathrooms_min : project.rent_bathrooms_min;
  const bathroomsMax = listingType === 'sale' ? project.sale_bathrooms_max : project.rent_bathrooms_max;
  const areaMin = listingType === 'sale' ? project.sale_area_min : project.rent_area_min;
  const areaMax = listingType === 'sale' ? project.sale_area_max : project.rent_area_max;
  const priceMin = listingType === 'sale' ? project.sale_price_min : project.rent_price_min;
  const priceMax = listingType === 'sale' ? project.sale_price_max : project.rent_price_max;

  const bedroomsRange = formatRange(bedroomsMin, bedroomsMax, '', false);
  const bathroomsRange = formatRange(bathroomsMin, bathroomsMax, '', true);
  const areaRange = formatRange(areaMin, areaMax, ' m²', false);
  const priceRange = formatPriceRange(priceMin, priceMax, listingType === 'rent');

  const handleViewPress = useCallback(() => {
    if (onViewProject) {
      onViewProject();
    } else if (project?.id) {
      // Use URL from API if available, otherwise use ID-based route
      const projectUrl = project.url || `/project/${project.id}`;
      const queryParams = source ? `?source=${source}` : '';
      router.push(`${projectUrl}${queryParams}`);
    }
  }, [onViewProject, project?.id, project?.url, source, router]);

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
    if (!project?.id) {
      console.warn(
        'ProjectReelCard: handleFavorite called without a project id'
      );
      return;
    }

    const projectId = project.id;

    try {
      const response = await api.projects.toggleFavorite(projectId);
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
        const details = await api.projects.getById(projectId);
        const refreshedCount = getFavoriteCountValue(details?.favorites_count);
        if (refreshedCount !== null) {
          setFavoriteCount(refreshedCount);
        }
        if (typeof details?.is_favourite === 'boolean') {
          setIsLiked(details.is_favourite);
        }
        onFavoriteMetaUpdate?.(projectId, {
          favorites_count: refreshedCount ?? details?.favorites_count ?? null,
          is_favourite:
            typeof details?.is_favourite === 'boolean'
              ? details.is_favourite
              : null,
        });
      } catch (fetchError) {
        console.warn(
          'ProjectReelCard: Failed to refresh favorites_count after toggle',
          fetchError
        );
      }
    } catch (e: any) {
      console.error('Failed to toggle favorite:', e);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    }
  }, [project?.id, isLiked, getFavoriteCountValue, onFavoriteMetaUpdate]);

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
        'Please sign in to start a chat with the developer.'
      );
      router.push('/(tabs)/profile');
      return;
    }

    const projectId = project?.id ? Number(project.id) : null;
    if (!ownerId || Number.isNaN(ownerId) || !projectId || Number.isNaN(projectId)) {
      Alert.alert('Unavailable', 'Could not identify the developer for this project.');
      return;
    }

    try {
      setIsChatLoading(true);
      const threadId = await getOrCreateThread(
        ownerId,
        projectId,
        project?.name
      );

      // Track chat conversion
      analytics.trackPropertyContact({
        propertyId: projectId,
        contactMethod: 'chat',
      });

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
    project?.id,
    project?.name,
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

  if (!project) return null;

  // Tag line (top-left)
  const projectType = 'PROJECT';
  const country = project.country || 'Unknown';
  const statusLabels: Record<string, string> = {
    planning: 'Planning',
    construction: 'Under Construction',
    completed: 'Completed',
    available: 'Available',
  };
  const statusLabel = statusLabels[project.status] || project.status;
  const listingStatusLabel = listingType === 'sale' ? 'For Sale' : 'For Rent';
  const tagLine = `${projectType} · ${country} · ${listingStatusLabel}`;

  return (
    <View style={styles.safeContainer}>
      <View
        style={styles.container}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={() => false}
      >
        {/* IMAGE CAROUSEL */}
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
              <OptimizedImage
                uri={uri}
                style={StyleSheet.absoluteFillObject}
                containerStyle={StyleSheet.absoluteFillObject}
                blurRadius={25}
              />
              <View style={styles.imageOverlay} />
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

        {/* RIGHT-SIDE ACTION COLUMN */}
        <View style={styles.sideActions}>
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

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share size={28} color="#fff" strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircle}
            onPress={handleAgentProfilePress}
            activeOpacity={0.8}
          >
            <UserCircle size={28} color="#fff" strokeWidth={2} />
          </TouchableOpacity>

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
              {project.name || 'Untitled Project'}
            </Text>
          </TouchableOpacity>

          {/* Price range row */}
          {priceRange && (
            <View style={styles.priceRow}>
              <Text style={styles.price}>{priceRange}</Text>
              <Text style={styles.priceLabel}>
                {listingType === 'sale' ? 'Price Range' : 'Rent Range'}
              </Text>
            </View>
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <MapPin size={16} color="#10b981" />
            <Text style={styles.locationText} numberOfLines={1}>
              {project.location || 'Unknown Location'}
            </Text>
          </View>

          {/* Stats row - ranges */}
          <View style={styles.statsRow}>
            {bedroomsRange && (
              <View style={styles.statPill}>
                <Bed size={14} color="#fff" />
                <Text style={styles.statText}>{bedroomsRange}</Text>
              </View>
            )}
            {bathroomsRange && (
              <View style={styles.statPill}>
                <Bath size={14} color="#fff" />
                <Text style={styles.statText}>{bathroomsRange}</Text>
              </View>
            )}
            {areaRange && (
              <View style={styles.statPill}>
                <Square size={14} color="#fff" />
                <Text style={styles.statText}>{areaRange}</Text>
              </View>
            )}
            {/* Units available */}
            {project.total_units > 0 && (
              <View style={styles.statPill}>
                <Building2 size={14} color="#fff" />
                <Text style={styles.statText}>
                  {project.available_units}/{project.total_units}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const ICON_CIRCLE_SIZE = 40;

const styles = StyleSheet.create({
  safeContainer: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
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
    overflow: 'hidden',
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
  bottomInfo: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    right: 92,
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

export default ProjectReelCard;

