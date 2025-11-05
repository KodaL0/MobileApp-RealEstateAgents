import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MapPin, Bed, Bath, Maximize } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PropertyReelCard({ property }: { property: any }) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const images =
    property.images?.map((img: any) =>
      typeof img === 'string' ? img : img.image
    ) || [];

  const formatPrice = (price: number) => {
    if (!price) return '—';
    return `€${price.toLocaleString('en-US')}`;
  };

  const handleScroll = (event: any) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    setCurrentIndex(index);
  };

  const getCountryFlag = (country: string) => {
    switch (country) {
      case 'Greece':
        return '🇬🇷';
      case 'Cyprus':
        return '🇨🇾';
      default:
        return '🌍';
    }
  };

  const getCountryColor = (country: string) => {
    switch (country) {
      case 'Greece':
        return '#2563eb';
      case 'Cyprus':
        return '#ea580c';
      default:
        return '#4b5563';
    }
  };

  const imageData =
    images.length > 0
      ? images
      : ['https://via.placeholder.com/800x600?text=No+Image'];

  return (
    <View style={styles.container}>
      {/* Image carousel */}
      <FlatList
        data={imageData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />

      {/* Like button */}
      <TouchableOpacity
        style={styles.likeButton}
        onPress={() => setIsLiked(!isLiked)}
      >
        <Heart
          size={28}
          color={isLiked ? '#FF385C' : '#fff'}
          fill={isLiked ? '#FF385C' : 'transparent'}
        />
      </TouchableOpacity>

      {/* Country & status tags */}
      <View style={styles.tagContainer}>
        <View
          style={[
            styles.countryTag,
            { backgroundColor: getCountryColor(property.country) },
          ]}
        >
          <Text style={styles.countryText}>
            {getCountryFlag(property.country)} {property.country}
          </Text>
        </View>
        <View
          style={[
            styles.statusTag,
            {
              backgroundColor:
                property.property_status === 'for_sale' ? '#22c55e' : '#3b82f6',
            },
          ]}
        >
          <Text style={styles.statusText}>
            {property.property_status === 'for_sale' ? 'For Sale' : 'For Rent'}
          </Text>
        </View>
      </View>

      {/* Carousel indicators */}
      {imageData.length > 1 && (
        <View style={styles.indicatorContainer}>
          {imageData.map((_: string, index: number) => (
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

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{formatPrice(property.price)}</Text>
        </View>

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
            <Text style={styles.detailText}>
              {property.bedrooms ?? 0} Beds
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Bath size={18} color="#fff" />
            <Text style={styles.detailText}>
              {property.bathrooms ?? 0} Baths
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Maximize size={18} color="#fff" />
            <Text style={styles.detailText}>
              {property.area ? `${property.area} sqft` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.typeTag}>
          <Text style={styles.typeText}>
            {property.property_type || 'Property'}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {property.description || 'No description available.'}
        </Text>

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
    height: SCREEN_HEIGHT,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '65%',
  },
  likeButton: {
    position: 'absolute',
    top: 40, // ⬅️ lowered from 60 → 40 for better alignment
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  tagContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  countryTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 160,
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
    backgroundColor: '#fff',
    width: 16,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    padding: 24,
  },
  priceTag: {
    backgroundColor: '#0F3460',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  priceText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  locationText: {
    color: '#fff',
    fontSize: 16,
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
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  viewDetailsButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#0F3460',
    fontSize: 16,
    fontWeight: '700',
  },
});
