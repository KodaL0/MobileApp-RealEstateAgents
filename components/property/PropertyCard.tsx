import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bed, Bath, Heart, MapPin } from 'lucide-react-native';

export default function PropertyCard({ property, saved = false }) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(saved);

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push(`/property/${property.id}`)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: property.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{property.forSale ? 'FOR SALE' : 'FOR RENT'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
        >
          <Heart 
            size={20} 
            color={isFavorite ? "#FF6B6B" : "#fff"} 
            fill={isFavorite ? "#FF6B6B" : "transparent"} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            ${property.price.toLocaleString()}
            {!property.forSale && <Text style={styles.period}>/mo</Text>}
          </Text>
          <View style={styles.propertyType}>
            <Text style={styles.propertyTypeText}>{property.propertyType}</Text>
          </View>
        </View>
        
        <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
        
        <View style={styles.locationRow}>
          <MapPin size={14} color="#666" />
          <Text style={styles.location} numberOfLines={1}>{property.location}</Text>
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
          
          <Text style={styles.size}>{property.size} sq ft</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  imageContainer: {
    height: 180,
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