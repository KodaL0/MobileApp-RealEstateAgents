import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MapPin, Bed, Bath, Maximize } from 'lucide-react-native';
import { useState } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PropertyReelCard({ property }: { property: any }) {
  const [isLiked, setIsLiked] = useState(false);

  const formatPrice = (price: number) => {
    if (!price) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatArea = (area: number) => {
    if (!area) return '—';
    return new Intl.NumberFormat('en-US').format(area);
  };

  // ✅ Adjust image field to match your backend (array of images)
  const mainImage =
    property.image_url ||
    property.image ||
    (property.images?.[0]?.image
      ? property.images[0].image
      : property.images?.[0]) ||
    'https://via.placeholder.com/800x600?text=No+Image';

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: mainImage }}
        style={styles.image}
        resizeMode="cover"
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      />

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
              {formatArea(property.area || property.size)} sqft
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
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  likeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
  },
  priceTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F3460',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  priceText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 34,
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
