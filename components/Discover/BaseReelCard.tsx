import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Heart,
  UserCircle,
  MessageCircle,
  Share,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate consistent image dimensions
const IMAGE_PADDING = 48;
const IMAGE_WIDTH = SCREEN_WIDTH - IMAGE_PADDING;
const IMAGE_ASPECT_RATIO = 16 / 9;
const IMAGE_MAX_HEIGHT = SCREEN_HEIGHT * 0.68;
const IMAGE_HEIGHT = Math.min(
  IMAGE_WIDTH / IMAGE_ASPECT_RATIO,
  IMAGE_MAX_HEIGHT
);

// Memoized image component
const OptimizedImage = React.memo(
  ({
    uri,
    style,
    blurRadius = 0,
    onError,
    containerStyle,
  }: {
    uri: string;
    style: StyleProp<ImageStyle>;
    blurRadius?: number;
    onError?: () => void;
    containerStyle?: StyleProp<ViewStyle>;
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

// Carousel dots component
const CarouselDots = React.memo(
  ({
    count,
    currentIndex,
  }: {
    count: number;
    currentIndex: number;
  }) => {
    if (count <= 1) return null;

    return (
      <View style={styles.carouselDots}>
        {Array.from({ length: count }, (_, i) => i).map((dotIndex) => (
          <View
            key={`dot-${dotIndex}`}
            style={[
              styles.dot,
              dotIndex === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    );
  }
);
CarouselDots.displayName = 'CarouselDots';

export interface BaseReelCardProps {
  // Images
  images: string[];
  // Top bar content
  topBarContent?: ReactNode;
  // Bottom content
  bottomContent: ReactNode;
  // Actions
  onFavorite: () => void;
  onChat?: () => void;
  onShare?: () => void;
  onAgentPress?: () => void;
  onView: () => void;
  // State
  isLiked: boolean;
  favoriteCount: number;
  isChatLoading?: boolean;
  // Optional handlers
  onImageChange?: (index: number) => void;
  // Base URL for images
  baseUrl?: string;
}

export function BaseReelCard({
  images,
  topBarContent,
  bottomContent,
  onFavorite,
  onChat,
  onShare,
  onAgentPress,
  onView,
  isLiked,
  favoriteCount,
  isChatLoading = false,
  onImageChange,
  baseUrl = 'https://propertprodjango.onrender.com',
}: BaseReelCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    setShowHeartAnimation(false);
    setCurrentIndex(0);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, animated: false });
    }
  }, []);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH
      );
      setCurrentIndex(index);
      onImageChange?.(index);
    },
    [onImageChange]
  );

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

  // Tap / double-tap handler
  const handleTouchStart = useCallback((event: { nativeEvent: { touches: Array<{ pageY: number; pageX: number }> } }) => {
    const touch = event.nativeEvent.touches[0];
    if (touch) {
      touchStartY.current = touch.pageY;
      touchStartX.current = touch.pageX;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (event: { nativeEvent: { changedTouches?: Array<{ pageY: number; pageX: number }> } }) => {
      const touch = event.nativeEvent.changedTouches?.[0];
      if (!touch) return;

      const deltaY = Math.abs(touch.pageY - touchStartY.current);
      const deltaX = Math.abs(touch.pageX - touchStartX.current);

      if (deltaY > 15 || deltaX > 15) return;

      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
        if (!isLiked) {
          onFavorite();
        }
        triggerHeartAnimation();
      } else {
        lastTap.current = now;
      }
    },
    [isLiked, onFavorite, triggerHeartAnimation]
  );

  const getValidUrl = useCallback(
    (uri?: string) => {
      if (!uri) return 'https://via.placeholder.com/800x600?text=No+Image';
      return uri.startsWith('http') ? uri : `${baseUrl}${uri}`;
    },
    [baseUrl]
  );

  const validImages = images.map(getValidUrl).filter(Boolean);
  const displayImages = validImages.length > 0 ? validImages : [getValidUrl()];

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
          {displayImages.map((uri: string) => (
            <View key={uri} style={styles.imageWrapper}>
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

        {/* Carousel dots */}
        <CarouselDots count={displayImages.length} currentIndex={currentIndex} />

        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          style={styles.bottomGradient}
        />

        {/* Top bar */}
        {topBarContent && (
          <View style={styles.topBar}>{topBarContent}</View>
        )}

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
            onPress={onFavorite}
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

          {onChat && (
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={onChat}
              disabled={isChatLoading}
              activeOpacity={0.8}
            >
              {isChatLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <MessageCircle size={28} color="#fff" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          )}

          {onShare && (
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={onShare}
              activeOpacity={0.8}
            >
              <Share size={28} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          )}

          {onAgentPress && (
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={onAgentPress}
              activeOpacity={0.8}
            >
              <UserCircle size={28} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.viewCircle}
            onPress={onView}
            activeOpacity={0.9}
          >
            <Text style={styles.viewText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* BOTTOM CONTENT */}
        <View style={styles.bottomInfo}>{bottomContent}</View>
      </View>
    </View>
  );
}

const ICON_CIRCLE_SIZE = 40;
const SIDE_ACTIONS_WIDTH = 56; // Icon column width to avoid image overlap

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
    width: SCREEN_WIDTH - SIDE_ACTIONS_WIDTH * 2,
    height: IMAGE_HEIGHT,
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
  carouselDots: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
});


