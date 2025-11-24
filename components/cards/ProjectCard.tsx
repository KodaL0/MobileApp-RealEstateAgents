import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Bed, Bath, Square, Heart, Building2 } from 'lucide-react-native';
import type { FeedProject } from '@/app/features/types';

interface ProjectCardProps {
  project: FeedProject;
  onPress?: () => void;
  onFavorite?: () => void;
  isLiked?: boolean;
  favoriteCount?: number;
  compact?: boolean;
  listingType?: 'sale' | 'rent';
}

export function ProjectCard({
  project,
  onPress,
  onFavorite,
  isLiked = false,
  favoriteCount = 0,
  compact = false,
  listingType = 'sale',
}: ProjectCardProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price || 0);

  const formatPriceRange = (min?: number, max?: number) => {
    if (min === undefined && max === undefined) return null;
    if (min === max) {
      return formatPrice(min!);
    }
    if (min && max) {
      return `${formatPrice(min)} - ${formatPrice(max)}`;
    }
    if (min) {
      return `From ${formatPrice(min)}`;
    }
    if (max) {
      return `Up to ${formatPrice(max)}`;
    }
    return null;
  };

  const formatRange = (min?: number, max?: number, showDecimals: boolean = false) => {
    if (min === undefined && max === undefined) return null;
    const formatValue = (val: number) => {
      if (showDecimals) {
        const rounded = Math.round(val * 10) / 10;
        return rounded % 1 === 0
          ? rounded.toLocaleString()
          : rounded.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
      } else {
        return Math.round(val).toLocaleString();
      }
    };
    if (min !== undefined && max !== undefined && min === max) {
      return `${formatValue(min)}`;
    }
    if (min !== undefined && max !== undefined) {
      return `${formatValue(min)} - ${formatValue(max)}`;
    }
    if (min !== undefined) {
      return `From ${formatValue(min)}`;
    }
    if (max !== undefined) {
      return `Up to ${formatValue(max)}`;
    }
    return null;
  };

  // Get ranges based on listing type
  const bedroomsMin = listingType === 'sale' ? project.sale_bedrooms_min : project.rent_bedrooms_min;
  const bedroomsMax = listingType === 'sale' ? project.sale_bedrooms_max : project.rent_bedrooms_max;
  const bathroomsMin = listingType === 'sale' ? project.sale_bathrooms_min : project.rent_bathrooms_min;
  const bathroomsMax = listingType === 'sale' ? project.sale_bathrooms_max : project.rent_bathrooms_max;
  const areaMin = listingType === 'sale' ? project.sale_area_min : project.rent_area_min;
  const areaMax = listingType === 'sale' ? project.sale_area_max : project.rent_area_max;
  const priceMin = listingType === 'sale' ? project.sale_price_min : project.rent_price_min;
  const priceMax = listingType === 'sale' ? project.sale_price_max : project.rent_price_max;

  const bedroomsRange = formatRange(bedroomsMin, bedroomsMax, false);
  const bathroomsRange = formatRange(bathroomsMin, bathroomsMax, true);
  const areaRange = formatRange(areaMin, areaMax, false);
  const priceRange = formatPriceRange(priceMin, priceMax);

  const getImageUrl = () => {
    if (project.images && project.images.length > 0) {
      const img = project.images[0];
      const url = typeof img === 'string' ? img : img.image;
      return url?.startsWith('http') ? url : `https://propertprodjango.onrender.com${url}`;
    }
    if (project.main_image) {
      return project.main_image.startsWith('http')
        ? project.main_image
        : `https://propertprodjango.onrender.com${project.main_image}`;
    }
    return 'https://via.placeholder.com/400x300?text=No+Image';
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.8}>
        <Image source={{ uri: getImageUrl() }} style={styles.compactImage} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {project.name}
          </Text>
          {priceRange && (
            <Text style={styles.compactPrice}>{priceRange}</Text>
          )}
          <View style={styles.compactLocation}>
            <MapPin size={12} color="#6b7280" />
            <Text style={styles.compactLocationText} numberOfLines={1}>
              {project.location}
            </Text>
          </View>
        </View>
        {onFavorite && (
          <TouchableOpacity
            style={styles.compactFavorite}
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Heart
              size={18}
              color="#fff"
              fill={isLiked ? '#FF385C' : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: getImageUrl() }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {project.name}
          </Text>
          {onFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
            >
              <Heart
                size={20}
                color="#6b7280"
                fill={isLiked ? '#FF385C' : 'transparent'}
                strokeWidth={2}
              />
              {favoriteCount > 0 && (
                <Text style={styles.favoriteCount}>{favoriteCount}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.locationRow}>
          <MapPin size={14} color="#3b82f6" />
          <Text style={styles.location} numberOfLines={1}>
            {project.location}
          </Text>
        </View>

        {priceRange && (
          <Text style={styles.price}>{priceRange}</Text>
        )}

        <View style={styles.stats}>
          {bedroomsRange && (
            <View style={styles.stat}>
              <Bed size={14} color="#6b7280" />
              <Text style={styles.statText}>{bedroomsRange}</Text>
            </View>
          )}
          {bathroomsRange && (
            <View style={styles.stat}>
              <Bath size={14} color="#6b7280" />
              <Text style={styles.statText}>{bathroomsRange}</Text>
            </View>
          )}
          {areaRange && (
            <View style={styles.stat}>
              <Square size={14} color="#6b7280" />
              <Text style={styles.statText}>{areaRange} m²</Text>
            </View>
          )}
          {project.total_units > 0 && (
            <View style={styles.stat}>
              <Building2 size={14} color="#6b7280" />
              <Text style={styles.statText}>
                {project.available_units}/{project.total_units}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  compactImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f3f4f6',
  },
  compactContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  compactPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  compactLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactLocationText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  compactFavorite: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


