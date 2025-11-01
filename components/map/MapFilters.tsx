import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Filter, X } from 'lucide-react-native';

// Platform-specific shadow styles
const getShadowStyle = () => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  };
};

type FilterOption = {
  id: string;
  label: string;
  value: any;
};

type MapFiltersProps = {
  onFiltersChange: (filters: any) => void;
  visible: boolean;
  onToggle: () => void;
};

export default function MapFilters({ 
  onFiltersChange, 
  visible, 
  onToggle 
}: MapFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<any>({
    priceRange: null,
    propertyType: null,
    bedrooms: null,
    forSale: null,
  });

  const priceRanges: FilterOption[] = [
    { id: '0-200k', label: 'Under €200k', value: { min: 0, max: 200000 } },
    { id: '200k-500k', label: '€200k - €500k', value: { min: 200000, max: 500000 } },
    { id: '500k-1m', label: '€500k - €1M', value: { min: 500000, max: 1000000 } },
    { id: '1m+', label: '€1M+', value: { min: 1000000, max: null } },
  ];

  const propertyTypes: FilterOption[] = [
    { id: 'house', label: 'House', value: 'House' },
    { id: 'apartment', label: 'Apartment', value: 'Apartment' },
    { id: 'condo', label: 'Condo', value: 'Condo' },
    { id: 'loft', label: 'Loft', value: 'Loft' },
  ];

  const bedroomOptions: FilterOption[] = [
    { id: '1', label: '1+ Bed', value: 1 },
    { id: '2', label: '2+ Beds', value: 2 },
    { id: '3', label: '3+ Beds', value: 3 },
    { id: '4', label: '4+ Beds', value: 4 },
  ];

  const handleFilterSelect = (filterType: string, option: FilterOption) => {
    const newFilters = {
      ...activeFilters,
      [filterType]: activeFilters[filterType] === option.value ? null : option.value,
    };
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      priceRange: null,
      propertyType: null,
      bedrooms: null,
      forSale: null,
    };
    setActiveFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(value => value !== null).length;
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Filter size={20} color="#0F3460" />
          <Text style={styles.headerTitle}>Filters</Text>
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onToggle} style={styles.closeButton}>
          <X size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Price Range */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.optionsContainer}>
            {priceRanges.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  activeFilters.priceRange === option.value && styles.activeOption,
                ]}
                onPress={() => handleFilterSelect('priceRange', option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    activeFilters.priceRange === option.value && styles.activeOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Property Type */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.optionsContainer}>
            {propertyTypes.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  activeFilters.propertyType === option.value && styles.activeOption,
                ]}
                onPress={() => handleFilterSelect('propertyType', option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    activeFilters.propertyType === option.value && styles.activeOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bedrooms */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Bedrooms</Text>
          <View style={styles.optionsContainer}>
            {bedroomOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  activeFilters.bedrooms === option.value && styles.activeOption,
                ]}
                onPress={() => handleFilterSelect('bedrooms', option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    activeFilters.bedrooms === option.value && styles.activeOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sale/Rent */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Listing Type</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                activeFilters.forSale === true && styles.activeOption,
              ]}
              onPress={() => handleFilterSelect('forSale', { id: 'sale', label: 'For Sale', value: true })}
            >
              <Text
                style={[
                  styles.optionText,
                  activeFilters.forSale === true && styles.activeOptionText,
                ]}
              >
                For Sale
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                activeFilters.forSale === false && styles.activeOption,
              ]}
              onPress={() => handleFilterSelect('forSale', { id: 'rent', label: 'For Rent', value: false })}
            >
              <Text
                style={[
                  styles.optionText,
                  activeFilters.forSale === false && styles.activeOptionText,
                ]}
              >
                For Rent
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {getActiveFilterCount() > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={clearAllFilters}>
          <Text style={styles.clearButtonText}>Clear All Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 400,
    ...getShadowStyle(),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#0F3460',
    marginLeft: 8,
  },
  filterCount: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  filterCountText: {
    color: '#fff',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F7FA',
  },
  activeOption: {
    backgroundColor: '#0F3460',
    borderColor: '#0F3460',
  },
  optionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
  },
  activeOptionText: {
    color: '#fff',
  },
  clearButton: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clearButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#FF6B6B',
  },
}); 