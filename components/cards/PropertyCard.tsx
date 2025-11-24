import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Bed, Bath, Square, Heart } from 'lucide-react-native';
import type { FeedProperty } from '@/app/features/types';

interface PropertyCardProps {
  property: FeedProperty;
  onPress?: () => void;
  onFavorite?: () => void;
  isLiked?: boolean;
  favoriteCount?: number;
  compact?: boolean;
}

export function PropertyCard({
  property,
  onPress,
  onFavorite,
  isLiked = false,
  favoriteCount = 0,
  compact = false,
}: PropertyCardProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price || 0);

  const getImageUrl = () => {
    if (property.images && property.images.length > 0) {
      const img = property.images[0];
      const url = typeof img === 'string' ? img : img.image;
      return url?.startsWith('http') ? url : `https://propertprodjango.onrender.com${url}`;
    }
    return 'https://via.placeholder.com/400x300?text=No+Image';
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.8}>
        <Image source={{ uri: getImageUrl() }} style={styles.compactImage} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {property.title}
          </Text>
          <Text style={styles.compactPrice}>{formatPrice(property.price || 0)}</Text>
          <View style={styles.compactLocation}>
            <MapPin size={12} color="#6b7280" />
            <Text style={styles.compactLocationText} numberOfLines={1}>
              {property.location}
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
            {property.title}
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
          <MapPin size={14} color="#10b981" />
          <Text style={styles.location} numberOfLines={1}>
            {property.location}
          </Text>
        </View>

        <Text style={styles.price}>{formatPrice(property.price || 0)}</Text>

        <View style={styles.stats}>
          {property.bedrooms && (
            <View style={styles.stat}>
              <Bed size={14} color="#6b7280" />
              <Text style={styles.statText}>{property.bedrooms}</Text>
            </View>
          )}
          {property.bathrooms && (
            <View style={styles.stat}>
              <Bath size={14} color="#6b7280" />
              <Text style={styles.statText}>
                {Number(property.bathrooms).toFixed(1)}
              </Text>
            </View>
          )}
          {property.area && (
            <View style={styles.stat}>
              <Square size={14} color="#6b7280" />
              <Text style={styles.statText}>{property.area} m²</Text>
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
    gap: 16,
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


