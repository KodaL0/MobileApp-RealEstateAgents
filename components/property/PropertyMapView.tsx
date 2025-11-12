import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import LeafletMap from '../map/LeafletMap';

interface PropertyMapViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  location?: string;
}

export default function PropertyMapView({
  latitude,
  longitude,
  title,
  location,
}: PropertyMapViewProps) {
  // Create a single property object for the map
  const property = {
    id: 0,
    title: title || 'Property Location',
    price: 0,
    location: location || '',
    latitude,
    longitude,
    bedrooms: 0,
    bathrooms: 0,
    size: 0,
    images: [],
    property_status: '',
    forSale: false,
    propertyType: '',
  };

  return (
    <View style={styles.container}>
      <LeafletMap
        properties={[property]}
        center={[latitude, longitude]}
        zoom={15}
        selectedPropertyId={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
});

