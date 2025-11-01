import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Star } from 'lucide-react-native';
import { PROPERTIES } from '@/data/properties';

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

export default function TrendingProperties() {
  const router = useRouter();
  const trendingProperties = PROPERTIES.slice(4, 9);

  const renderTrendingItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.trendingItem}
      onPress={() => router.push(`/property/${item.id}`)}
    >
      <Image 
        source={{ uri: item.images[0] }}
        style={styles.trendingImage}
        resizeMode="cover"
      />
      
      <View style={styles.trendingContent}>
        <Text style={styles.trendingTitle} numberOfLines={1}>{item.title}</Text>
        
        <View style={styles.trendingLocation}>
          <MapPin size={14} color="#666" />
          <Text style={styles.trendingLocationText} numberOfLines={1}>{item.location}</Text>
        </View>
        
        <View style={styles.trendingBottom}>
          <Text style={styles.trendingPrice}>
            ${item.price.toLocaleString()}
            {!item.forSale && <Text style={styles.period}>/mo</Text>}
          </Text>
          
          <View style={styles.ratingContainer}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>4.8</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={trendingProperties}
      renderItem={renderTrendingItem}
      keyExtractor={(item) => item.id.toString()}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingRight: 16,
  },
  trendingItem: {
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...getShadowStyle(),
    marginLeft: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 6,
    marginTop: 4,
  },
  trendingImage: {
    width: 100,
    height: '100%',
  },
  trendingContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  trendingTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  trendingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendingLocationText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  trendingBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendingPrice: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: '#0F3460',
  },
  period: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
});