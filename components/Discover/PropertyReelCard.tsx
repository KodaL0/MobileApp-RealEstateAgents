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
import { Heart, MapPin, Square, ArrowUpCircle, Layers } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PropertyReelCard({ property }: { property: any }) {
  const [isLiked, setIsLiked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ✅ FIX: Handle both absolute and relative URLs
  const BASE_URL = 'https://propertprodjango.onrender.com';

  const images =
    property.images && property.images.length > 0
      ? property.images.map((img: any) => {
          const uri = typeof img === 'string' ? img : img.image;
          // If URI starts with http → keep it; else prepend backend URL
          return uri?.startsWith('http') ? uri : `${BASE_URL}${uri}`;
        })
      : [property.image_url || 'https://via.placeholder.com/800x600?text=No+Image'];

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
        return '#2563eb';
      case 'Cyprus':
        return '#f97316';
      default:
        return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      {/* CARD */}
      <View style={styles.card}>
        {/* TAGS */}
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: '#111827' }]}>
            <Text style={styles.tagText}>
              {property.property_type?.toUpperCase() || 'PROPERTY'}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: getCountryColor(property.country) }]}>
            <Text style={styles.tagText}>{property.country || 'Unknown'}</Text>
          </View>
          <View
            style={[
              styles.tag,
              {
                backgroundColor:
                  property.property_status === 'for_sale' ? '#10b981' : '#3b82f6',
              },
            ]}
          >
            <Text style={styles.tagText}>
              {property.property_status === 'for_sale' ? 'For Sale' : 'For Rent'}
            </Text>
          </View>
        </View>

        {/* IMAGE SECTION */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {images.map((uri: string, index: number) => (
              <View key={index} style={{ flex: 1, backgroundColor: '#000' }}>
                <Image
                  source={{ uri }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>

          {/* Heart */}
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => setIsLiked(!isLiked)}
          >
            <Heart
              size={26}
              color={isLiked ? '#FF385C' : '#fff'}
              fill={isLiked ? '#FF385C' : 'transparent'}
            />
          </TouchableOpacity>

          {/* Dots */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_: string, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* DETAILS SECTION */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {property.title || 'Untitled Property'}
          </Text>

          <View style={styles.locationRow}>
            <MapPin size={16} color="#059669" />
            <Text style={styles.locationText} numberOfLines={1}>
              {property.location || 'Unknown Location'}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatPrice(property.price)}</Text>
            {property.property_status === 'for_sale' && (
              <Text style={styles.purchasePrice}>Purchase Price</Text>
            )}
            {property.property_status !== 'for_sale' && (
              <Text style={styles.rentPrice}>Monthly Rent</Text>
            )}
          </View>

          {/* STATS BOX */}
          <View style={styles.statsBox}>
            <View style={styles.statItem}>
              <View style={[styles.iconBubble, { backgroundColor: '#ede9fe' }]}>
                <Square size={18} color="#7c3aed" />
              </View>
              <Text style={styles.statValue}>
                {property.area ?? property.size ?? '—'}
              </Text>
              <Text style={styles.statLabel}>sq m</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.iconBubble, { backgroundColor: '#f0fdf4' }]}>
                <ArrowUpCircle size={18} color="#059669" />
              </View>
              <Text style={styles.statValue}>
                {property.floor_level ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Floor</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.iconBubble, { backgroundColor: '#eef2ff' }]}>
                <Layers size={18} color="#4f46e5" />
              </View>
              <Text style={styles.statValue}>
                {property.total_floors ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Total Floors</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    overflow: 'hidden',
    shadowColor: 'transparent',
    elevation: 0,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: SCREEN_HEIGHT * 0.55,
  },
  image: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.55,
  },
  likeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 25,
    padding: 8,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 16,
  },
  detailsContainer: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 4,
    color: '#4b5563',
    fontSize: 14,
  },
  priceContainer: {
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  purchasePrice: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  rentPrice: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  statsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  iconBubble: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
});
