import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bed, Bath, MapPin } from 'lucide-react-native';

export default function PropertyMapCard({ property }) {
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push(`/property/${property.id}`)}
    >
      <Image 
        source={{ uri: property.images[0] }}
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.content}>
        <Text style={styles.price}>
          ${property.price.toLocaleString()}
          {!property.forSale && <Text style={styles.period}>/mo</Text>}
        </Text>
        
        <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
        
        <View style={styles.location}>
          <MapPin size={12} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>{property.location}</Text>
        </View>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <Bed size={14} color="#0F3460" />
            <Text style={styles.featureText}>{property.bedrooms}</Text>
          </View>
          
          <View style={styles.feature}>
            <Bath size={14} color="#0F3460" />
            <Text style={styles.featureText}>{property.bathrooms}</Text>
          </View>
          
          <Text style={styles.size}>{property.size} ft²</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#0F3460',
  },
  period: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#666',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  features: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  featureText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  size: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
});