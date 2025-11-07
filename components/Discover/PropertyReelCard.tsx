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
} from 'react-native';
import {
  Heart,
  MapPin,
  Square,
  ArrowUpCircle,
  Layers,
  Share2,
  MessageCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_URL = 'https://propertprodjango.onrender.com';

export default function PropertyReelCard({
  property,
  onViewProperty,
}: {
  property: any;
  onViewProperty?: () => void;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const getValidUrl = (uri?: string) => {
    if (!uri) return 'https://via.placeholder.com/800x600?text=No+Image';
    return uri.startsWith('http') ? uri : `${BASE_URL}${uri}`;
  };

  const images =
    property.images && property.images.length > 0
      ? property.images
          .map((img: any) =>
            typeof img === 'string' ? getValidUrl(img) : getValidUrl(img.image)
          )
          .filter(Boolean)
      : [getValidUrl(property.image_url)];

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

              {/* Main clear image */}
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

        {/* Gradient overlay for better text contrast */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />

        {/* Tags */}
        <View style={styles.tagsContainer}>
          <View style={[styles.tag, { backgroundColor: '#111827' }]}>
            <Text style={styles.tagText}>
              {property.property_type?.toUpperCase() || 'PROPERTY'}
            </Text>
          </View>
          <View
            style={[
              styles.tag,
              { backgroundColor: getCountryColor(property.country) },
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

        {/* Right side actions */}
        <View style={styles.sideActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsLiked(!isLiked)}
          >
            <Heart
              size={32}
              color="#fff"
              fill={isLiked ? '#FF385C' : 'transparent'}
              strokeWidth={2}
            />
            <Text style={styles.actionText}>234</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle size={32} color="#fff" strokeWidth={2} />
            <Text style={styles.actionText}>12</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={32} color="#fff" strokeWidth={2} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {property.title || 'Untitled Property'}
          </Text>

          <View style={styles.locationRow}>
            <MapPin size={16} color="#10b981" />
            <Text style={styles.locationText} numberOfLines={1}>
              {property.location || 'Unknown Location'}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(property.price)}</Text>
            <Text style={styles.priceLabel}>
              {property.property_status === 'for_sale'
                ? 'Purchase Price'
                : '/month'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Square size={14} color="#fff" />
              <Text style={styles.statText}>
                {property.area ?? property.size ?? '—'} m²
              </Text>
            </View>
            <View style={styles.statPill}>
              <ArrowUpCircle size={14} color="#fff" />
              <Text style={styles.statText}>
                Floor {property.floor_level ?? '—'}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Layers size={14} color="#fff" />
              <Text style={styles.statText}>
                {property.total_floors ?? '—'} Floors
              </Text>
            </View>
          </View>

          {/* View Property Button */}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={onViewProperty}
            activeOpacity={0.8}
          >
            <Text style={styles.viewButtonText}>View Property</Text>
          </TouchableOpacity>
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
    width: SCREEN_WIDTH * 0.98, // slightly smaller for safer fit
    height: SCREEN_HEIGHT * 0.85, // adjusted to prevent cutoffs
    resizeMode: 'contain',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    pointerEvents: 'none',
  },
  photoCounter: {
    position: 'absolute',
    top: 50,
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
    top: Platform.OS === 'ios' ? 40 : 20,
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
    bottom: SCREEN_HEIGHT * 0.25, // moved higher for visibility
    gap: 24,
    alignItems: 'center',
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
  bottomInfo: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.12, // ensures it's above nav bar
    left: 16,
    right: 80,
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
    marginBottom: 12,
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
    marginBottom: 12,
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
  viewButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    textTransform: 'uppercase',
  },
});
