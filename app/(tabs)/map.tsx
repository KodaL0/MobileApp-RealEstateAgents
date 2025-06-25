import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '../../components/map/LeafletMap';
import { apiClient } from '../../config/api';

// Cyprus mock coordinates for deterministic placement
const CYPRUS_MOCK_COORDINATES = [
  { city: 'Nicosia', lat: 35.1856, lng: 33.3823 },
  { city: 'Limassol', lat: 34.6851, lng: 33.0432 },
  { city: 'Larnaca', lat: 34.9207, lng: 33.6369 },
  { city: 'Paphos', lat: 34.7571, lng: 32.4298 },
  { city: 'Ayia Napa', lat: 34.9887, lng: 34.0015 },
  { city: 'Famagusta', lat: 35.1253, lng: 33.9463 },
];

// Function to get deterministic coordinates based on property ID
const getMockCoordinates = (propertyId: number) => {
  const baseCoord = CYPRUS_MOCK_COORDINATES[propertyId % CYPRUS_MOCK_COORDINATES.length];
  
  // Add small deterministic offset for realistic spread
  const offsetLat = ((propertyId * 7) % 100 - 50) * 0.001; // ±0.05 degrees
  const offsetLng = ((propertyId * 11) % 100 - 50) * 0.001;
  
  return {
    latitude: baseCoord.lat + offsetLat,
    longitude: baseCoord.lng + offsetLng,
    location: baseCoord.city,
  };
};

// Function to normalize property data to match frontend expectations
const normalizePropertyData = (properties: any[]) => {
  return properties.map((property) => {
    const coords = getMockCoordinates(property.id);
    
    return {
      id: property.id,
      title: property.title || property.name || 'Property',
      price: property.price || property.rent_price || 0,
      location: property.location || coords.location,
      latitude: coords.latitude,
      longitude: coords.longitude,
      bedrooms: property.bedrooms || property.bed_rooms || 0,
      bathrooms: property.bathrooms || property.bath_rooms || 0,
      size: property.size || property.square_meters || property.area || 100,
      images: property.images || [],
      property_status: property.property_status,
      forSale: property.property_status === 'for_sale' || property.for_sale || false,
      propertyType: property.property_type || property.type || 'apartment',
    };
  });
};

type Property = {
  id: number;
  title: string;
  price: number;
  location: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  images: string[];
  property_status?: string;
  forSale?: boolean;
  propertyType?: string;
};

type Filters = {
  priceRange: [number, number];
  propertyType: string;
  bedrooms: number;
  forSale: boolean | null;
};

export default function MapScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.1264, 33.4299]); // Cyprus center
  const [mapZoom, setMapZoom] = useState(9);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState<Filters>({
    priceRange: [0, 2000000],
    propertyType: '',
    bedrooms: 0,
    forSale: null,
  });

  // Debug logging
  console.log('🏠 MapScreen Debug Info:');
  console.log('Map zoom:', mapZoom);
  console.log('Selected property:', selectedPropertyId);
  console.log('Current filters:', filters);

  // Cyprus cities for search
  const cyprusCities = [
    { name: 'Nicosia', coordinates: [35.1856, 33.3823] as [number, number] },
    { name: 'Limassol', coordinates: [34.6851, 33.0432] as [number, number] },
    { name: 'Larnaca', coordinates: [34.9207, 33.6369] as [number, number] },
    { name: 'Paphos', coordinates: [34.7571, 32.4298] as [number, number] },
    { name: 'Ayia Napa', coordinates: [34.9887, 34.0015] as [number, number] },
    { name: 'Famagusta', coordinates: [35.1253, 33.9463] as [number, number] },
  ];

  // Fetch properties from API
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Fetching properties from API...');
        
        const response = await apiClient.get('/properties/', {
          params: {
            location__icontains: 'Cyprus',
            page_size: 50,
          },
        });
        
        console.log('📊 API Response:', response.status);
        console.log('📊 API Response data length:', response.data?.results?.length || 0);
        
        if (response.data?.results) {
          const normalizedProperties = normalizePropertyData(response.data.results);
          console.log('🏗️ Setting real Cyprus properties:', normalizedProperties.length);
          setProperties(normalizedProperties);
        } else {
          console.log('⚠️ No results in API response, using mock data');
          setProperties([]);
        }
      } catch (error) {
        console.error('❌ Error fetching properties:', error);
        
        // Fallback to mock Cyprus properties
        const mockProperties = CYPRUS_MOCK_COORDINATES.map((coord, index) => ({
          id: index + 1,
          title: `${coord.city} Villa`,
          price: Math.floor(Math.random() * 1000000) + 200000,
          location: coord.city,
          latitude: coord.lat + (Math.random() - 0.5) * 0.02,
          longitude: coord.lng + (Math.random() - 0.5) * 0.02,
          bedrooms: Math.floor(Math.random() * 4) + 2,
          bathrooms: Math.floor(Math.random() * 3) + 1,
          size: Math.floor(Math.random() * 200) + 100,
          images: [`https://picsum.photos/400/300?random=${index + 1}`],
          forSale: Math.random() > 0.3,
          propertyType: ['apartment', 'villa', 'house'][Math.floor(Math.random() * 3)],
        }));
        
        console.log('🏠 Using mock Cyprus properties:', mockProperties.length);
        setProperties(mockProperties);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Filter properties
  useEffect(() => {
    console.log('🔍 Filtering properties...');
    console.log('📋 Total properties:', properties.length);
    
    let filtered = properties;

    // Apply filters
    if (filters.forSale !== null) {
      filtered = filtered.filter(p => p.forSale === filters.forSale);
    }

    if (filters.propertyType) {
      filtered = filtered.filter(p => p.propertyType === filters.propertyType);
    }

    if (filters.bedrooms > 0) {
      filtered = filtered.filter(p => p.bedrooms >= filters.bedrooms);
    }

    filtered = filtered.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Apply search query for Cyprus cities
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.location.toLowerCase().includes(query) ||
        p.title.toLowerCase().includes(query)
      );
    }

    console.log('✅ Filtered properties:', filtered.length, 'from', properties.length);
    setFilteredProperties(filtered);
  }, [properties, filters, searchQuery]);

  const handleMarkerClick = (property: Property) => {
    console.log('🎯 Marker clicked:', property.title);
    setSelectedPropertyId(property.id);
    
    // Center map on the clicked property
    setMapCenter([property.latitude, property.longitude]);
    setMapZoom(16);
  };

  const handleMapMove = (center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  };

  const handleCitySearch = (cityName: string) => {
    const city = cyprusCities.find(c => 
      c.name.toLowerCase().includes(cityName.toLowerCase())
    );
    
    if (city) {
      console.log('🏙️ Flying to city:', city.name);
      setMapCenter(city.coordinates);
      setMapZoom(12);
      setSearchQuery(cityName);
    }
  };

  const resetFilters = () => {
    setFilters({
      priceRange: [0, 2000000],
      propertyType: '',
      bedrooms: 0,
      forSale: null,
    });
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Cyprus Properties...</Text>
      </View>
    );
  }

  return (
      <View style={styles.container}>
      {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cyprus Properties</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city (Nicosia, Limassol, etc.)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                handleCitySearch(searchQuery);
              }
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter and Location buttons */}
        <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            >
            <Ionicons name="options" size={16} color="white" />
            <Text style={styles.filterButtonText}>Filters</Text>
            </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => {
              setMapCenter([35.1264, 33.4299]);
              setMapZoom(9);
            }}
          >
            <Ionicons name="location" size={16} color="#0F3460" />
            </TouchableOpacity>
          </View>
        </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <LeafletMap
          properties={filteredProperties}
          center={mapCenter}
          zoom={mapZoom}
          onMarkerClick={handleMarkerClick}
          onMapMove={handleMapMove}
          selectedPropertyId={selectedPropertyId}
        />
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Properties</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#0F3460" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Property Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Property Type</Text>
              <View style={styles.filterOptions}>
                {['', 'apartment', 'villa', 'house'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      filters.propertyType === type && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, propertyType: type }))}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.propertyType === type && styles.filterOptionTextActive,
                      ]}
                    >
                      {type || 'All'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sale/Rent Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Listing Type</Text>
              <View style={styles.filterOptions}>
                {[
                  { label: 'All', value: null },
                  { label: 'For Sale', value: true },
                  { label: 'For Rent', value: false },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.filterOption,
                      filters.forSale === option.value && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, forSale: option.value }))}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.forSale === option.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                  </View>
                </View>

            {/* Bedrooms Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Minimum Bedrooms</Text>
              <View style={styles.filterOptions}>
                {[0, 1, 2, 3, 4, 5].map((beds) => (
                  <TouchableOpacity
                    key={beds}
                    style={[
                      styles.filterOption,
                      filters.bedrooms === beds && styles.filterOptionActive,
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, bedrooms: beds }))}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.bedrooms === beds && styles.filterOptionTextActive,
                      ]}
                    >
                      {beds === 0 ? 'Any' : `${beds}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset All Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {filteredProperties.length} properties found in Cyprus
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#0F3460',
  },
  modalContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#0F3460',
  },
  filterOptionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  resetButton: {
    padding: 16,
    backgroundColor: '#0F3460',
    borderRadius: 20,
    alignItems: 'center',
  },
  resetButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#fff',
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
});
