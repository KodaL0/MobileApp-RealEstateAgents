import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Search, Filter } from 'lucide-react-native';
import PropertyMapCard from '@/components/property/PropertyMapCard';
import { PROPERTIES } from '@/data/properties';

export default function MapScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Properties Map</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.searchButton}>
              <Search size={20} color="#0F3460" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={20} color="#0F3460" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <Image
            source={{
              uri: 'https://images.pexels.com/photos/2850350/pexels-photo-2850350.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
            }}
            style={styles.mapImage}
            resizeMode="cover"
          />

          <View style={[styles.locationPin, { top: '30%', left: '40%' }]}>
            <View style={styles.pinPrice}>
              <Text style={styles.pinPriceText}>$450k</Text>
            </View>
            <MapPin size={24} color="#FF6B6B" />
          </View>

          <View style={[styles.locationPin, { top: '45%', left: '65%' }]}>
            <View style={styles.pinPrice}>
              <Text style={styles.pinPriceText}>$325k</Text>
            </View>
            <MapPin size={24} color="#FF6B6B" />
          </View>

          <View style={[styles.locationPin, { top: '60%', left: '25%' }]}>
            <View style={styles.pinPrice}>
              <Text style={styles.pinPriceText}>$560k</Text>
            </View>
            <MapPin size={24} color="#FF6B6B" />
          </View>

          <View style={[styles.locationPin, { top: '20%', left: '80%' }]}>
            <View style={styles.pinPrice}>
              <Text style={styles.pinPriceText}>$750k</Text>
            </View>
            <MapPin size={24} color="#FF6B6B" />
          </View>
        </View>

        <View style={[styles.propertyListContainer, { paddingBottom: insets.bottom + 10 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {PROPERTIES.slice(0, 5).map((property) => (
              <PropertyMapCard key={property.id} property={property} />
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#0F3460',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  locationPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinPrice: {
    backgroundColor: '#0F3460',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 2,
  },
  pinPriceText: {
    color: '#fff',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  propertyListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});
