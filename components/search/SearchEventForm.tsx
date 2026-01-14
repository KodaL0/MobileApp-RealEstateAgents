// components/search/SearchEventForm.tsx
// Comprehensive search form component that exports all search event initialization logic

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  Search as SearchIcon,
  X as ClearIcon,
  MapPin,
  Home,
  Bed,
  Bath,
  Maximize,
  DollarSign,
} from 'lucide-react-native';
import type { ListingQueryParams } from '@/types/listings';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type FilterOption = 'All' | 'Buy' | 'Rent';

export type PropertyType = 'apartment' | 'house' | 'villa' | 'commercial' | 'land';

export type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'newest' | 'oldest';

export interface SearchEventParams {
  // Core filters
  filter: FilterOption;
  search?: string;
  location?: string;
  country?: string;
  
  // Property details
  property_type?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  area_min?: number;
  area_max?: number;
  
  // Price range
  price_min?: number;
  price_max?: number;
  
  // Amenities (comma-separated string for API)
  amenities?: string[];
  
  // Sorting
  sort?: SortOption;
}

export interface SearchEventFormProps {
  initialValues?: Partial<SearchEventParams>;
  onSubmit: (params: SearchEventParams) => void;
  showAdvancedFilters?: boolean;
}

// ============================================================================
// QUERY PARAMS BUILDER
// ============================================================================

/**
 * Builds query parameters object for API calls from SearchEventParams
 * Exported for use in search results screen
 * 
 * @param params - Search event parameters from the form
 * @param page - Page number for pagination (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Query parameters compatible with ListingQueryParams type and unified listings API
 */
export const buildSearchQueryParams = (
  params: SearchEventParams,
  page: number = 1,
  pageSize: number = 20
): ListingQueryParams => {
  const qp: ListingQueryParams = {
    page_size: pageSize,
    page: page,
  };

  // Search query (searches title, description, location)
  if (params.search?.trim()) {
    qp.search = params.search.trim();
  }

  // Location filter (partial match)
  if (params.location?.trim()) {
    qp.location = params.location.trim();
  }

  // Country filter (exact match)
  if (params.country?.trim()) {
    qp.country = params.country.trim();
  }

  // Property type
  if (params.property_type) {
    qp.property_type = params.property_type;
  }

  // Bedrooms (minimum)
  if (params.bedrooms !== undefined && params.bedrooms > 0) {
    qp.bedrooms = params.bedrooms;
  }

  // Bathrooms (minimum)
  if (params.bathrooms !== undefined && params.bathrooms > 0) {
    qp.bathrooms = params.bathrooms;
  }

  // Area range
  if (params.area_min !== undefined && params.area_min > 0) {
    qp.area_min = params.area_min;
  }
  if (params.area_max !== undefined && params.area_max > 0) {
    qp.area_max = params.area_max;
  }

  // Price range
  if (params.price_min !== undefined && params.price_min > 0) {
    qp.price_min = params.price_min;
  }
  if (params.price_max !== undefined && params.price_max > 0) {
    qp.price_max = params.price_max;
  }

  // Amenities (comma-separated)
  if (params.amenities && params.amenities.length > 0) {
    qp.amenities = params.amenities.join(',');
  }

  // Sort
  if (params.sort && params.sort !== 'recommended') {
    qp.sort = params.sort;
  }

  return qp;
};

/**
 * Converts SearchEventParams to URL search params string
 * Exported for navigation
 */
export const buildSearchEventUrlParams = (params: SearchEventParams): string => {
  const urlParams = new URLSearchParams();
  
  urlParams.set('filter', params.filter);
  
  if (params.search?.trim()) {
    urlParams.set('search', params.search.trim());
  }
  if (params.location?.trim()) {
    urlParams.set('location', params.location.trim());
  }
  if (params.country?.trim()) {
    urlParams.set('country', params.country.trim());
  }
  if (params.property_type) {
    urlParams.set('property_type', params.property_type);
  }
  if (params.bedrooms !== undefined && params.bedrooms > 0) {
    urlParams.set('bedrooms', params.bedrooms.toString());
  }
  if (params.bathrooms !== undefined && params.bathrooms > 0) {
    urlParams.set('bathrooms', params.bathrooms.toString());
  }
  if (params.area_min !== undefined && params.area_min > 0) {
    urlParams.set('area_min', params.area_min.toString());
  }
  if (params.area_max !== undefined && params.area_max > 0) {
    urlParams.set('area_max', params.area_max.toString());
  }
  if (params.price_min !== undefined && params.price_min > 0) {
    urlParams.set('price_min', params.price_min.toString());
  }
  if (params.price_max !== undefined && params.price_max > 0) {
    urlParams.set('price_max', params.price_max.toString());
  }
  if (params.amenities && params.amenities.length > 0) {
    urlParams.set('amenities', params.amenities.join(','));
  }
  if (params.sort && params.sort !== 'recommended') {
    urlParams.set('sort', params.sort);
  }

  return urlParams.toString();
};

/**
 * Parses URL search params back to SearchEventParams
 * Exported for use in search results screen
 */
export const parseSearchEventUrlParams = (urlParams: URLSearchParams): SearchEventParams => {
  const params: SearchEventParams = {
    filter: (urlParams.get('filter') as FilterOption) || 'All',
  };

  const search = urlParams.get('search');
  if (search) params.search = search;

  const location = urlParams.get('location');
  if (location) params.location = location;

  const country = urlParams.get('country');
  if (country) params.country = country;

  const propertyType = urlParams.get('property_type');
  if (propertyType) params.property_type = propertyType as PropertyType;

  const bedrooms = urlParams.get('bedrooms');
  if (bedrooms) params.bedrooms = parseInt(bedrooms, 10);

  const bathrooms = urlParams.get('bathrooms');
  if (bathrooms) params.bathrooms = parseFloat(bathrooms);

  const areaMin = urlParams.get('area_min');
  if (areaMin) params.area_min = parseInt(areaMin, 10);

  const areaMax = urlParams.get('area_max');
  if (areaMax) params.area_max = parseInt(areaMax, 10);

  const priceMin = urlParams.get('price_min');
  if (priceMin) params.price_min = parseInt(priceMin, 10);

  const priceMax = urlParams.get('price_max');
  if (priceMax) params.price_max = parseInt(priceMax, 10);

  const amenities = urlParams.get('amenities');
  if (amenities) params.amenities = amenities.split(',').filter(a => a.trim());

  const sort = urlParams.get('sort');
  if (sort) params.sort = sort as SortOption;

  return params;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function SearchEventForm({
  initialValues,
  onSubmit,
  showAdvancedFilters = false,
}: SearchEventFormProps) {
  // Core filters
  const [filter, setFilter] = useState<FilterOption>(initialValues?.filter || 'All');
  const [searchText, setSearchText] = useState<string>(initialValues?.search || '');
  const [location, setLocation] = useState<string>(initialValues?.location || '');
  const [country, setCountry] = useState<string>(initialValues?.country || '');
  
  // Property details
  const [propertyType, setPropertyType] = useState<PropertyType | undefined>(
    initialValues?.property_type
  );
  const [bedrooms, setBedrooms] = useState<number | undefined>(
    initialValues?.bedrooms
  );
  const [bathrooms, setBathrooms] = useState<number | undefined>(
    initialValues?.bathrooms
  );
  
  // Area range
  const [areaMin, setAreaMin] = useState<number | undefined>(
    initialValues?.area_min
  );
  const [areaMax, setAreaMax] = useState<number | undefined>(
    initialValues?.area_max
  );
  
  // Price range
  const [priceMin, setPriceMin] = useState<number | undefined>(
    initialValues?.price_min
  );
  const [priceMax, setPriceMax] = useState<number | undefined>(
    initialValues?.price_max
  );
  
  // Amenities (future implementation)
  const [amenities, setAmenities] = useState<string[]>(initialValues?.amenities || []);

  // Options
  const filters: FilterOption[] = ['All', 'Buy', 'Rent'];
  const propertyTypes: PropertyType[] = ['apartment', 'house', 'villa', 'commercial', 'land'];
  const bedroomOptions = [1, 2, 3, 4, 5, 6];
  const bathroomOptions = [1, 2, 3, 4, 5];
  const areaOptions = [50, 100, 150, 200, 300, 500];
  const priceOptions = [50000, 100000, 200000, 300000, 500000, 1000000];
  const countries = ['Cyprus', 'Greece', 'Spain', 'Portugal', 'Italy'];

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setLocation('');
    setCountry('');
    setPropertyType(undefined);
    setBedrooms(undefined);
    setBathrooms(undefined);
    setAreaMin(undefined);
    setAreaMax(undefined);
    setPriceMin(undefined);
    setPriceMax(undefined);
    setAmenities([]);
  }, []);

  // Submit handler
  const handleSubmit = useCallback(() => {
    const params: SearchEventParams = {
      filter,
      ...(searchText.trim() && { search: searchText.trim() }),
      ...(location.trim() && { location: location.trim() }),
      ...(country.trim() && { country: country.trim() }),
      ...(propertyType && { property_type: propertyType }),
      ...(bedrooms && { bedrooms }),
      ...(bathrooms && { bathrooms }),
      ...(areaMin && { area_min: areaMin }),
      ...(areaMax && { area_max: areaMax }),
      ...(priceMin && { price_min: priceMin }),
      ...(priceMax && { price_max: priceMax }),
      ...(amenities.length > 0 && { amenities }),
    };

    onSubmit(params);
  }, [
    filter, 
    searchText, 
    location, 
    country, 
    propertyType, 
    bedrooms, 
    bathrooms, 
    areaMin, 
    areaMax, 
    priceMin, 
    priceMax, 
    amenities,
    onSubmit
  ]);

  // Count active filters
  const activeFilterCount = [
    searchText.trim(),
    location.trim(),
    country.trim(),
    propertyType,
    bedrooms,
    bathrooms,
    areaMin,
    areaMax,
    priceMin,
    priceMax,
    amenities.length > 0 && amenities,
  ].filter(Boolean).length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with active filter count */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Filters</Text>
        {activeFilterCount > 0 && (
          <View style={styles.filterCountBadge}>
            <Text style={styles.filterCountText}>{activeFilterCount}</Text>
          </View>
        )}
      </View>

      {/* Listing Type (Buy/Rent/All) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Listing Type</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Text Input */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SearchIcon size={16} color="#0F3460" />
          <Text style={styles.sectionTitle}>Search Keywords</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Search by title, description..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.inputClearButton}>
              <ClearIcon size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location Input */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MapPin size={16} color="#0F3460" />
          <Text style={styles.sectionTitle}>Location</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="City, area, or address..."
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
          {location.length > 0 && (
            <TouchableOpacity onPress={() => setLocation('')} style={styles.inputClearButton}>
              <ClearIcon size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Country Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Country</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {countries.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.filterPill, country === c && styles.filterPillActive]}
              onPress={() => setCountry(country === c ? '' : c)}
            >
              <Text style={[styles.filterText, country === c && styles.filterTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Property Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Home size={16} color="#0F3460" />
          <Text style={styles.sectionTitle}>Property Type</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {propertyTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterPill,
                propertyType === type && styles.filterPillActive,
              ]}
              onPress={() => setPropertyType(propertyType === type ? undefined : type)}
            >
              <Text
                style={[
                  styles.filterText,
                  propertyType === type && styles.filterTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bedrooms */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Bed size={16} color="#0F3460" />
          <Text style={styles.sectionTitle}>Bedrooms (minimum)</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {bedroomOptions.map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.filterPill,
                bedrooms === count && styles.filterPillActive,
              ]}
              onPress={() => setBedrooms(bedrooms === count ? undefined : count)}
            >
              <Text
                style={[
                  styles.filterText,
                  bedrooms === count && styles.filterTextActive,
                ]}
              >
                {count}+
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bathrooms */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Bath size={16} color="#0F3460" />
          <Text style={styles.sectionTitle}>Bathrooms (minimum)</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {bathroomOptions.map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.filterPill,
                bathrooms === count && styles.filterPillActive,
              ]}
              onPress={() => setBathrooms(bathrooms === count ? undefined : count)}
            >
              <Text
                style={[
                  styles.filterText,
                  bathrooms === count && styles.filterTextActive,
                ]}
              >
                {count}+
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Area Range */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Maximize size={16} color="#0F3460" />
          <Text style={styles.sectionTitle}>Area (m²)</Text>
          {(areaMin || areaMax) && (
            <Text style={styles.rangeIndicator}>
              {areaMin && areaMax ? `${areaMin} - ${areaMax}` : areaMin ? `${areaMin}+` : `up to ${areaMax}`}
            </Text>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {areaOptions.map((area) => (
            <TouchableOpacity
              key={area}
              style={[
                styles.filterPill,
                (areaMin === area || areaMax === area) && styles.filterPillActive,
              ]}
              onPress={() => {
                if (areaMin === area) {
                  setAreaMin(undefined);
                } else if (areaMax === area) {
                  setAreaMax(undefined);
                } else if (!areaMin) {
                  setAreaMin(area);
                } else if (!areaMax && area > areaMin) {
                  setAreaMax(area);
                } else {
                  setAreaMin(area);
                  setAreaMax(undefined);
                }
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  (areaMin === area || areaMax === area) && styles.filterTextActive,
                ]}
              >
                {area}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Price Range */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <DollarSign size={16} color="#0F3460" />
          <Text style={styles.sectionTitle}>Price (€)</Text>
          {(priceMin || priceMax) && (
            <Text style={styles.rangeIndicator}>
              {priceMin && priceMax 
                ? `€${(priceMin / 1000).toFixed(0)}k - €${(priceMax / 1000).toFixed(0)}k` 
                : priceMin 
                  ? `€${(priceMin / 1000).toFixed(0)}k+` 
                  : `up to €${(priceMax! / 1000).toFixed(0)}k`}
            </Text>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {priceOptions.map((price) => (
            <TouchableOpacity
              key={price}
              style={[
                styles.filterPill,
                (priceMin === price || priceMax === price) && styles.filterPillActive,
              ]}
              onPress={() => {
                if (priceMin === price) {
                  setPriceMin(undefined);
                } else if (priceMax === price) {
                  setPriceMax(undefined);
                } else if (!priceMin) {
                  setPriceMin(price);
                } else if (!priceMax && price > priceMin) {
                  setPriceMax(price);
                } else {
                  setPriceMin(price);
                  setPriceMax(undefined);
                }
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  (priceMin === price || priceMax === price) && styles.filterTextActive,
                ]}
              >
                {price / 1000}k
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {activeFilterCount > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={handleClearFilters}
          >
            <ClearIcon size={18} color="#0F3460" />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.submitButton, activeFilterCount === 0 && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
        >
          <SearchIcon size={20} color="#fff" style={styles.submitButtonIcon} />
          <Text style={styles.submitButtonText}>
            Search {activeFilterCount > 0 ? `(${activeFilterCount} filters)` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: '#0F3460',
  },
  filterCountBadge: {
    backgroundColor: '#0F3460',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#0F3460',
    flex: 1,
  },
  rangeIndicator: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    paddingVertical: 12,
  },
  inputClearButton: {
    padding: 4,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterPillActive: {
    backgroundColor: '#0F3460',
    borderColor: '#0F3460',
  },
  filterText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  clearButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#0F3460',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3460',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonIcon: {
    marginRight: 0,
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  bottomSpacing: {
    height: 40,
  },
});
