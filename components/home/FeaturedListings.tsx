import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bed, Bath, Heart } from 'lucide-react-native';
import { PROPERTIES } from '@/data/properties';

export default function FeaturedListings() {
  const router = useRouter();
  const featuredProperties = PROPERTIES.slice(0, 5);

  const renderFeaturedItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.featuredItem}
      onPress={() => router.push(`/property/${item.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: item.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{item.forSale ? 'FOR SALE' : 'FOR RENT'}</Text>
        </View>
        <TouchableOpacity style={styles.favoriteButton}>
          <Heart size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.price}>
          ${item.price.toLocaleString()}
          {!item.forSale && <Text style={styles.period}>/mo</Text>}
        </Text>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.location} numberOfLines={1}>{item.location}</Text>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <Bed size={16} color="#0F3460" />
            <Text style={styles.featureText}>{item.bedrooms}</Text>
          </View>
          
          <View style={styles.feature}>
            <Bath size={16} color="#0F3460" />
            <Text style={styles.featureText}>{item.bathrooms}</Text>
          </View>
          
          <Text style={styles.size}>{item.size} sq ft</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={featuredProperties}
      renderItem={renderFeaturedItem}
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
  featuredItem: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});