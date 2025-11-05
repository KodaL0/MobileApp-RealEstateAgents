import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MapPin, Bed, Bath, Maximize } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PropertyReelCard({ property }: { property: any }) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const images =
    property.images && property.images.length > 0
      ? property.images.map((img: any) => img.image || img)
      : [property.image_url || property.image || 'https://via.placeholder.com/800x600?text=No+Image'];

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price || 0);

  const getCountryColor = (country: string) => {
    switch (country) {
      case 'Greece':
        return { backgroundColor: '#2563eb' }; // blue
      case 'Cyprus':
        return { backgroundColor: '#f97316' }; // orange
      default:
        return { backgroundColor: '#6b7280' }; // gray
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'for_sale'
      ? { backgroundColor: '#10b981' } // green
      : { backgroundColor: '#3b82f6' }; // blue
  };

  return (
    <View style={styles.container}>
      {/* IMAGE CAROUSEL */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((uri: string, index: number) => (
          <Image key={index} source={{ uri }} style={styles.image} resizeMode="cover" />
        ))}
      </ScrollView>

      {/* GRADIENT OVERLAY */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* TAGS TOP ROW */}
      <View style={styles.topTagsContainer}>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: '#111827' }]}>
            <Text style={styles.tagText}>
              {property.property_type?.toUpperCase() || 'PROPERTY'}
            </Text>
          </View>
          <View style={[styles.tag, getCountryColor(property.country || '')]}>
            <Text style={styles.tagText}>{property.country || 'Unknown'}</Text>
          </View>
          <View style={[styles.tag, getStatusColor(property.property_status || '')]}>
            <Text style={styles.tagText}>
              {property.property_status === 'for_sale' ? 'For Sale' : 'For Rent'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => setIsLiked(!isLiked)}
        >
          <Heart
            size={24}
            color={isLiked ? '#FF385C' : '#fff'}
            fill={isLiked ? '#FF385C' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* INDICATORS */}
      {images.length > 1 && (
        <View style={styles.indicatorContainer}>
          {images.map((_: string, index: number) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      )}

      {/* BOTTOM CONTENT */}
      <View style={styles.contentContainer}>
        <Text style={styles.priceText}>{formatPrice(property.price)}</Text>

        <Text style={styles.title} numberOfLines={2}>
          {property.title || 'Untitled Property'}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={16} color="#fff" />
          <Text style={styles.locationText} numberOfLines={1}>
            {property.location || 'Unknown Location'}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Bed size={18} color="#fff" />
            <Text style={styles.detailText}>{property.bedrooms ?? 0} Beds</Text>
          </View>

          <View style={styles.detailItem}>
            <Bath size={18} color="#fff" />
            <Text style={styles.detailText}>{property.bathrooms ?? 0} Baths</Text>
          </View>

          <View style={styles.detailItem}>
            <Maximize size={18} color="#fff" />
            <Text style={styles.detailText}>
              {property.area ?? property.size ?? 0} m²
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.55,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  topTagsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.47,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeIndicator: {
    width: 20,
    backgroundColor: '#fff',
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    padding: 20,
  },
  priceText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  viewDetailsButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  viewDetailsText: {
    color: '#0F3460',
    fontSize: 16,
    fontWeight: '700',
  },
});
