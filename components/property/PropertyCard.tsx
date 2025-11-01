// components/PropertyCard.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bed, Bath, Heart, MapPin, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { api } from '../../config/api';
import { useUser } from '../../app/_userbase/UserContext';

// Platform-specific shadow styles
const getShadowStyle = () => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  };
};

type Property = {
  id: number;
  images: (string | { image: string })[];
  forSale: boolean;
  price: number;
  title: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  propertyType: string;
};

export default function PropertyCard({ property, saved = false }: { property: Property; saved?: boolean }) {
  const router = useRouter();
  const { user } = useUser();
  const [isFavorite, setIsFavorite] = useState(saved);
  const [isLoading, setIsLoading] = useState(false);

  // Slideshow state - handle both string arrays and image objects
  const images = Array.isArray(property.images) 
    ? property.images
        .map(img => {
          // Handle both string URLs and image objects
          if (typeof img === 'string') return img;
          if (img && typeof img === 'object' && img.image) return img.image;
          return null;
        })
        .filter((img): img is string => img !== null && typeof img === 'string' && img.trim() !== '')
    : [];
  const imgCount = images.length;
  const [currentIndex, setCurrentIndex] = useState(0);



  // Ensure currentIndex is within bounds
  useEffect(() => {
    if (currentIndex >= imgCount && imgCount > 0) {
      setCurrentIndex(0);
    }
  }, [imgCount, currentIndex]);

  // Handlers
  const goPrev = (e: any) => {
    e.stopPropagation?.();
    if (imgCount > 0) {
      setCurrentIndex(i => (i - 1 + imgCount) % imgCount);
    }
  };
  const goNext = (e: any) => {
    e.stopPropagation?.();
    if (imgCount > 0) {
      setCurrentIndex(i => (i + 1) % imgCount);
    }
  };
  const jumpTo = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Handle favorite button press
  const handleFavoritePress = useCallback(async (e: any) => {
    e.stopPropagation?.();
    
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save properties to your favorites.');
      return;
    }

    if (isLoading) return;

    const previousState = isFavorite;
    const newState = !previousState;

    // Optimistic update
    setIsFavorite(newState);
    setIsLoading(true);

    try {
      await api.properties.toggleFavorite(property.id);
      console.log(`Property ${property.id} favorite status toggled to: ${newState}`);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert optimistic update on error
      setIsFavorite(previousState);
      Alert.alert('Error', 'Failed to update favorite status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isFavorite, isLoading, property.id]);

  // Derive URI for current image
  let imageUri = '';
  if (imgCount > 0) {
    const raw = images[currentIndex];
    
    // Check if raw exists and is a string before calling startsWith
    if (raw && typeof raw === 'string') {
      imageUri = raw.startsWith('http') ? raw : `https://api.propertpro.com${raw}`;
    } else {
      console.warn('Invalid image data at index', currentIndex, ':', raw);
      imageUri = ''; // Fallback to empty string
    }
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/property/${property.id}`)}
      activeOpacity={0.9}
    >
      {/* Image slideshow section */}
      <View style={styles.imageContainer}>
        {imgCount > 0 ? (
          <>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
              onError={e => console.error('Image load failed:', imageUri, e.nativeEvent.error)}
            />

            {/* Left arrow */}
            {imgCount > 1 && (
              <TouchableOpacity style={styles.arrowLeft} onPress={goPrev} activeOpacity={0.7}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {/* Right arrow */}
            {imgCount > 1 && (
              <TouchableOpacity style={styles.arrowRight} onPress={goNext} activeOpacity={0.7}>
                <ArrowRight size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {/* Indicator "1/3" */}
            {imgCount > 1 && (
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {currentIndex + 1}/{imgCount}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Image
            source={{ uri: 'https://placehold.co/400x200/E5E7EB/6B7280?text=No+Image' }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {/* Type Tag */}
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>
            {property.forSale ? 'FOR SALE' : 'FOR RENT'}
          </Text>
        </View>
        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Heart
            size={20}
            color={isFavorite ? '#FF6B6B' : '#fff'}
            fill={isFavorite ? '#FF6B6B' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Thumbnail strip */}
      {imgCount > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScroll}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {images.map((imgUriRaw: string, idx: number) => {
            // Check if imgUriRaw exists and is a string before calling startsWith
            const uri = (imgUriRaw && typeof imgUriRaw === 'string') 
              ? (imgUriRaw.startsWith('http') ? imgUriRaw : `https://api.propertpro.com${imgUriRaw}`)
              : '';
            const isActive = idx === currentIndex;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => jumpTo(idx)}
                style={[
                  styles.thumbnailWrapper,
                  isActive && styles.thumbnailActiveWrapper,
                ]}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri }}
                  style={[styles.thumbnailImage, isActive && styles.thumbnailActiveImage]}
                  resizeMode="cover"
                  onError={e => console.error('Thumbnail load failed:', uri, e.nativeEvent.error)}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Content below images */}
      <View style={styles.content}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            €{Number(property.price).toLocaleString()}
            {!property.forSale && <Text style={styles.period}>/mo</Text>}
          </Text>
          <View style={styles.propertyType}>
            <Text style={styles.propertyTypeText}>{property.propertyType}</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {property.title}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={14} color="#666" />
          <Text style={styles.location} numberOfLines={1}>
            {property.location}
          </Text>
        </View>

        <View style={styles.featuresRow}>
          <View style={styles.feature}>
            <Bed size={16} color="#0F3460" />
            <Text style={styles.featureText}>{property.bedrooms} beds</Text>
          </View>

          <View style={styles.feature}>
            <Bath size={16} color="#0F3460" />
            <Text style={styles.featureText}>{property.bathrooms} baths</Text>
          </View>

          <Text style={styles.size}>{property.size} m²</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    ...getShadowStyle(),
    marginBottom: 16,
  },
  imageContainer: {
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EEE',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  // Arrows overlay
  arrowLeft: {
    position: 'absolute',
    top: '45%',
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  arrowRight: {
    position: 'absolute',
    top: '45%',
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  // Counter "1/3"
  counter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
  },
  // Type tag (For Sale / For Rent)
  typeTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#0F3460',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    color: '#fff',
  },
  // Favorite heart
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Thumbnail strip
  thumbnailScroll: {
    marginTop: 8,
    maxHeight: 50,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
  },
  thumbnailWrapper: {
    marginRight: 8,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thumbnailActiveWrapper: {
    borderColor: '#0F3460',
  },
  thumbnailImage: {
    width: 50,
    height: 50,
  },
  thumbnailActiveImage: {
    // you can add slight scale or overlay if desired
  },

  content: {
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#0F3460',
  },
  period: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  propertyType: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  propertyTypeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  size: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
});
