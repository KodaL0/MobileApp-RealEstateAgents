import React, { useState } from 'react';
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
import { Property } from '@/app/features/chat/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_URL = 'https://propertprodjango.onrender.com';

export default function PropertyReelCard({
  property,
  onViewProperty,
  source,
}: {
  property: Property;
  onViewProperty?: () => void;
  source?: string;
}) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(property.is_favourite || false);
  const [favoriteCount, setFavoriteCount] = useState<number>(() => {
    return property?.favorites_count ?? 0;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { getOrCreateThread, threads } = useChat();
  const { isAuthenticated, user } = useUser();
  const owner = property?.owner ?? {};
  const ownerIdValue = owner?.id ?? null;
  const ownerId =
    ownerIdValue !== null && ownerIdValue !== undefined
      ? Number(ownerIdValue)
      : NaN;
  // Agent name: prefer name, fallback to username
  const agentName: string | null =
    owner?.name ?? owner?.username ?? null;
  const ownerUsername: string | null =
    owner?.username ?? null;

  const getValidUrl = (uri?: string) => {
    if (!uri) return 'https://via.placeholder.com/800x600?text=No+Image';
    return uri.startsWith('http') ? uri : `${BASE_URL}${uri}`;
  };

  const handleAgentProfilePress = () => {
    if (!ownerUsername) {
      Alert.alert('Unavailable', 'Agent profile is currently unavailable.');
      return;
    }

    router.push({
      pathname: '/agent/[username]',
      params: { username: ownerUsername },
    } as never);
  };

  const images =
    property.images && property.images.length > 0
      ? property.images
          .map((img: any) =>
            typeof img === 'string' ? getValidUrl(img) : getValidUrl(img.image)
          )
          .filter(Boolean)
      : [getValidUrl()];

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleError = () => setImageError(true);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price || 0);

  const getCountryColor = (country: string) => {
    switch (country) {
      case 'Greece':
        return '#2563eb';
      case 'Cyprus':
        return '#f97316';
      default:
        return '#6b7280';
    }
  };

  // Navigation handler for the View button with source tracking
  const handleViewPress = () => {
    if (onViewProperty) {
      onViewProperty();
    } else if (property?.id) {
      const queryParams = source ? `?source=${source}` : '';
      router.push(`/property/${property.id}${queryParams}`);
    }
  };

  // Favorite handler with API integration and success message
  const handleFavorite = async () => {
    try {
      const response = await api.properties.toggleFavorite(property.id);
      setIsLiked(response.is_favourite || false);
      setFavoriteCount(prev =>
        response.is_favourite ? prev + 1 : Math.max(0, prev - 1)
      );
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
  };

  // Chat handler: open or create thread then navigate to chat
  const handleChat = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to start a chat with the agent.');
      router.push('/(tabs)/profile');
      return;
    }

    const propertyId = property?.id ? Number(property.id) : null;
    if (!ownerId || Number.isNaN(ownerId)) {
      Alert.alert('Unavailable', 'Could not identify the agent for this property.');
      return;
    }

    // If a thread already exists, navigate directly without creating another
    let existingThreadId: string | null = null;
    if (propertyId) {
      const existing = threads.find(
        thread => thread.property != null && Number(thread.property) === propertyId
      );
      if (existing) {
        existingThreadId = existing.id;
      }
    }

    if (!existingThreadId) {
      const userId = user?.id ?? null;
      const dmThread = threads.find(
        thread =>
          thread.property === null &&
          userId !== null &&
          ((thread.user1 === ownerId && thread.user2 === userId) ||
            (thread.user2 === ownerId && thread.user1 === userId))
      );
      if (dmThread) {
        existingThreadId = dmThread.id;
      }
    }

    if (existingThreadId) {
      if (propertyId) {
        api.analytics.trackConversion(propertyId, 'chat').catch(err =>
          console.warn('Failed to track chat conversion:', err)
        );
      }
      router.push(`/chat/${existingThreadId}`);
      return;
    }

    if (isChatLoading) return;

    try {
      setIsChatLoading(true);
      const threadId = await getOrCreateThread(ownerId, propertyId, property?.title);

      // Track conversion for analytics (non-blocking)
      if (propertyId) {
        api.analytics.trackConversion(propertyId, 'chat').catch(err =>
          console.warn('Failed to track chat conversion:', err)
        );
      }

      router.push(`/chat/${threadId}`);
    } catch (e: any) {
      console.error('Failed to initiate chat:', e);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Share handler with tracking and success message
  const handleShare = async () => {
    try {
      // Note: Share tracking endpoint doesn't exist yet, but we'll show success message
      // When backend endpoint is ready, uncomment:
      // await api.analytics.trackShare(property.id, 'copy_link');
      Alert.alert(
        'Success',
        'Share tracked! Full sharing functionality coming soon.',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      console.error('Failed to track share:', e);
      Alert.alert('Error', 'Failed to track share. Please try again.');
    }
  };


  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Horizontal image scroll with blurred background */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.imageScroll}
        >
          {images.map((uri: string, index: number) => (
            <View key={index} style={styles.imageWrapper}>
              {/* Blurred background */}
              <Image
                source={{
                  uri: imageError
                    ? 'https://via.placeholder.com/800x600?text=No+Image'
                    : uri,
                }}
                style={StyleSheet.absoluteFillObject}
                blurRadius={25}
                resizeMode="cover"
              />

              {/* Main image */}
              <Image
                source={{
                  uri: imageError
                    ? 'https://via.placeholder.com/800x600?text=No+Image'
                    : uri,
                }}
                style={styles.image}
                resizeMode="contain"
                onError={handleError}
              />

              {/* Photo counter */}
              {images.length > 1 && (
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {index + 1}/{images.length}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />

        {/* Tags - aligned with photo counter */}
        <View style={styles.tagsContainer}>
          <View style={[styles.tag, { backgroundColor: '#111827' }]}>
            <Text style={styles.tagText}>
              {property.property_type?.toUpperCase() || 'PROPERTY'}
            </Text>
          </View>
          <View
            style={[
              styles.tag,
              { backgroundColor: getCountryColor(property.country || '') },
            ]}
          >
            <Text style={styles.tagText}>{property.country || 'Unknown'}</Text>
          </View>
          <View
            style={[
              styles.tag,
              {
                backgroundColor:
                  property.property_status === 'for_sale'
                    ? '#10b981'
                    : '#3b82f6',
              },
            ]}
          >
            <Text style={styles.tagText}>
              {property.property_status === 'for_sale'
                ? 'For Sale'
                : 'For Rent'}
            </Text>
          </View>
        </View>

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
          {/* Agent Name */}
          {agentName && (
            <Text style={styles.agentName}>{agentName}</Text>
          )}

          {/* Full Title */}
          <Text style={styles.title}>
            {property.title || 'Untitled Property'}
          </Text>

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
            {property.bedrooms !== null && property.bedrooms !== undefined && (
              <View style={styles.statPill}>
                <Bed size={14} color="#fff" />
                <Text style={styles.statText}>
                  {property.bedrooms}
                </Text>
              </View>
            )}
            {property.bathrooms !== null && property.bathrooms !== undefined && (
              <View style={styles.statPill}>
                <Bath size={14} color="#fff" />
                <Text style={styles.statText}>
                  {property.bathrooms % 1 === 0 
                    ? property.bathrooms.toString() 
                    : property.bathrooms.toFixed(1)}
                </Text>
              </View>
            )}
            {property.area !== null && property.area !== undefined && (
              <View style={styles.statPill}>
                <Square size={14} color="#fff" />
                <Text style={styles.statText}>
                  {typeof property.area === 'number' 
                    ? property.area.toLocaleString() 
                    : property.area} m²
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
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH * 0.98,
    height: SCREEN_HEIGHT * 0.85,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tagsContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.07,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  sideActions: {
    position: 'absolute',
    right: 16,
    bottom: SCREEN_HEIGHT * 0.22,
    alignItems: 'center',
    gap: 22,
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
    bottom: SCREEN_HEIGHT * 0.07,
    left: 16,
    right: 100,
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
