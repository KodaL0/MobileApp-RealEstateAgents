import React, { useState, useRef, useMemo, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  MapPin,
  Square,
  Bed,
  Bath,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/config/api';
import { Alert } from 'react-native';
import { useChat } from '@/app/features/chat/context/ChatContext';
import { useUser } from '@/app/_userbase/UserContext';
import type { FeedProperty } from '@/app/features/types';
import { analytics } from '@/services/analytics';
import { BaseReelCard } from './BaseReelCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_URL = 'https://propertprodjango.onrender.com';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
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

  const handleImageChange = useCallback((index: number) => {
    setCurrentImageIndex(index);
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

  // Top bar content (tags)
  const topBarContent = (
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
      {images.length > 1 && (
        <View style={styles.photoCounter}>
          <Text style={styles.photoCounterText}>
            {currentImageIndex + 1}/{images.length}
          </Text>
        </View>
      )}
    </View>
  );

  // Bottom content
  const bottomContent = (
    <>
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
    </>
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <BaseReelCard
        images={images}
        topBarContent={topBarContent}
        bottomContent={bottomContent}
        onFavorite={handleFavorite}
        onChat={handleChat}
        onShare={handleShare}
        onAgentPress={handleAgentProfilePress}
        onView={handleViewPress}
        isLiked={isLiked}
        favoriteCount={favoriteCount}
        isChatLoading={isChatLoading}
        onImageChange={handleImageChange}
        baseUrl={BASE_URL}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
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
  photoCounter: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    marginLeft: 'auto',
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
