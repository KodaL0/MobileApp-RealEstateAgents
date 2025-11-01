// components/home/FeaturedListings.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bed, Bath, Heart } from 'lucide-react-native';
import { api } from '../../config/api'; // adjust the relative path if needed

/**
 * The normalized shape for each property as expected by PropertyCard / renderItem.
 * Adjust fields if you need more.
 */
type PropertyItem = {
  id: number | string;
  images: string[];       // array of absolute URLs for images
  forSale: boolean;       // boolean flag
  price: number;
  title: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  size: number | string;  // in sq ft (converted) or string fallback
  isFavorite: boolean;    // initial favorite state (optional)
  propertyType: string;   // formatted, e.g. 'Apartment'
};

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

export default function FeaturedListings({
  initialPage = 1,
  pageSize = 5,         // fetch 5 featured items by default
  horizontal = true,
}: {
  initialPage?: number;
  pageSize?: number;
  horizontal?: boolean;
}) {
  const router = useRouter();
  const [listings, setListings] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.properties.featured({
          page: initialPage,
          page_size: pageSize,
        });
        if (!isMounted) return;

        // Normalize each raw item into PropertyItem
        const normalized: PropertyItem[] = data.results.map((item: any) => {
          // 1) Extract images array: API gives array of objects with `image` field
          const rawImages = Array.isArray(item.images) ? item.images : [];
          const images: string[] = rawImages
            .map((imgObj: any) => {
              const raw = imgObj?.image;
              if (!raw) return '';
              // If raw is full URL, use it; else prefix with backend host
              // Adjust the host if images are served from a CDN or different domain
              return raw.startsWith('http')
                ? raw
                : `https://api.propertpro.com${raw}`;
            })
            .filter((uri: string) => !!uri);

          // 2) Determine forSale boolean like web logic
          let forSale: boolean;
          if (item.property_status) {
            forSale = item.property_status === 'for_sale';
          } else if (typeof item.forSale === 'boolean') {
            forSale = item.forSale;
          } else if (item.listing_type) {
            forSale = item.listing_type.toLowerCase() === 'sale';
          } else {
            forSale = false;
          }

          // 3) Map propertyType: capitalize first letter
          const rawType: string = item.property_type || '';
          const propertyType =
            rawType.charAt(0).toUpperCase() + rawType.slice(1);

          // 4) Map size: use raw area from backend
          let size = item.area;

          // 5) Favorite status
          const isFavorite: boolean = item.is_favourite ?? false;

          return {
            id: item.id,
            images,
            forSale,
            price: item.price,
            title: item.title,
            location: item.location,
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            size,
            isFavorite,
            propertyType,
          };
        });

        // Optional: log sample normalized item for debugging
        // console.log('Normalized featured item example:', normalized[0]);

        setListings(normalized);
      } catch (e: any) {
        console.error('Error fetching featured listings:', e);
        if (isMounted) {
          // If the error has a specific message, you could extract:
          // const msg = e.response?.data?.message || 'Failed to load featured listings.';
          setError('Failed to load featured listings.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeatured();
    return () => {
      isMounted = false;
    };
  }, [initialPage, pageSize]);

  const renderItem = ({ item }: { item: PropertyItem }) => (
    <TouchableOpacity
      style={styles.featuredItem}
      onPress={() => router.push(`/property/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.image}
            resizeMode="cover"
            onError={(e) => {
              console.error('Image load error:', item.images[0], e.nativeEvent.error);
            }}
          />
        ) : (
          // Placeholder if no image
          <View style={[styles.image, styles.noImagePlaceholder]}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>
            {item.forSale ? 'FOR SALE' : 'FOR RENT'}
          </Text>
        </View>
        <TouchableOpacity style={styles.favoriteButton} activeOpacity={0.7}>
          <Heart size={20} color={item.isFavorite ? "#FF6B6B" : "#fff"} fill={item.isFavorite ? "#FF6B6B" : "transparent"} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.price}>
          ${Number(item.price).toLocaleString()}
          {!item.forSale && <Text style={styles.period}>/mo</Text>}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.location}
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Bed size={16} color="#0F3460" />
            <Text style={styles.featureText}>{item.bedrooms}</Text>
          </View>

          <View style={styles.feature}>
            <Bath size={16} color="#0F3460" />
            <Text style={styles.featureText}>{item.bathrooms}</Text>
          </View>

          <Text style={styles.size}>{item.size} m²</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#0F3460" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!listings.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No featured listings available.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listings}
      renderItem={renderItem}
      keyExtractor={(item) => String(item.id)}
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingRight: 16,
  },
  featuredItem: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...getShadowStyle(),
    marginLeft: 16,
    marginBottom: 6,
    marginTop: 4,
  },
  imageContainer: {
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImagePlaceholder: {
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#666',
  },
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
  contentContainer: {
    padding: 12,
  },
  price: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#0F3460',
    marginBottom: 4,
  },
  period: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  location: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  features: {
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
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  size: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  centered: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  emptyText: {
    color: '#666',
  },
});
