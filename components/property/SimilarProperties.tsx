import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Bed, Bath, MapPin, Square } from 'lucide-react-native';
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

export default function SimilarProperties({ properties }) {
  const router = useRouter();

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.propertyCard}
      onPress={() => router.push(`/property/${item.id}`)}
    >
      <Image 
        source={{ uri: item.images[0] }}
        style={styles.propertyImage}
        resizeMode="cover"
      />
      
      <View style={styles.propertyContent}>
        <Text style={styles.propertyPrice}>
          ${item.price.toLocaleString()}
          {!item.forSale && <Text style={styles.period}>/mo</Text>}
        </Text>
        
        <Text style={styles.propertyTitle} numberOfLines={1}>{item.title}</Text>
        
        <View style={styles.locationRow}>
          <MapPin size={12} color="#666" />
          <Text style={styles.propertyLocation} numberOfLines={1}>{item.location}</Text>
        </View>
        
        <View style={styles.featuresRow}>
          <View style={styles.feature}>
            <Bed size={14} color="#0F3460" />
            <Text style={styles.featureText}>{item.bedrooms}</Text>
          </View>
          
          <View style={styles.feature}>
            <Bath size={14} color="#0F3460" />
            <Text style={styles.featureText}>{item.bathrooms}</Text>
          </View>
          
          <Text style={styles.size}>{item.size} ft²</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Similar Properties</Text>
      
      <FlatList
        data={properties}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 60,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#0F3460',
    marginBottom: 12,
  },
  list: {
    paddingRight: 16,
  },
  propertyCard: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...getShadowStyle(),
    marginRight: 12,
    overflow: 'hidden',
  },
  propertyImage: {
    width: '100%',
    height: 120,
  },
  propertyContent: {
    padding: 10,
  },
  propertyPrice: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#0F3460',
  },
  period: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#666',
  },
  propertyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  propertyLocation: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
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