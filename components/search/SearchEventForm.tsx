// components/search/SearchEventForm.tsx
// Comprehensive search form component that exports all search event initialization logic

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  Search as SearchIcon,
  X,
  Filter as FilterIcon,
  ChevronDown,
} from 'lucide-react-native';

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
 */
export const buildSearchQueryParams = (
  params: SearchEventParams,
  page: number = 1,
  pageSize: number = 20
): Record<string, any> => {
  const qp: Record<string, any> = {
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
  const [filter, setFilter] = useState<FilterOption>(initialValues?.filter || 'All');
  const [search, setSearch] = useState(initialValues?.search || '');
  const [location, setLocation] = useState(initialValues?.location || '');
  const [country, setCountry] = useState(initialValues?.country || '');
  const [showAdvanced, setShowAdvanced] = useState(showAdvancedFilters);

  // Advanced filters
  const [propertyType, setPropertyType] = useState<PropertyType | undefined>(
    initialValues?.property_type
  );
  const [bedrooms, setBedrooms] = useState<string>(
    initialValues?.bedrooms?.toString() || ''
  );
  const [bathrooms, setBathrooms] = useState<string>(
    initialValues?.bathrooms?.toString() || ''
  );
  const [areaMin, setAreaMin] = useState<string>(
    initialValues?.area_min?.toString() || ''
  );
  const [areaMax, setAreaMax] = useState<string>(
    initialValues?.area_max?.toString() || ''
  );
  const [priceMin, setPriceMin] = useState<string>(
    initialValues?.price_min?.toString() || ''
  );
  const [priceMax, setPriceMax] = useState<string>(
    initialValues?.price_max?.toString() || ''
  );
  const [sort, setSort] = useState<SortOption>(initialValues?.sort || 'recommended');

  const filters: FilterOption[] = ['All', 'Buy', 'Rent'];
  const propertyTypes: PropertyType[] = ['apartment', 'house', 'villa', 'land'];
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
  ];

  const handleSubmit = useCallback(() => {
    const params: SearchEventParams = {
      filter,
      ...(search.trim() && { search: search.trim() }),
      ...(location.trim() && { location: location.trim() }),
      ...(country.trim() && { country: country.trim() }),
      ...(propertyType && { property_type: propertyType }),
      ...(bedrooms && { bedrooms: parseInt(bedrooms, 10) }),
      ...(bathrooms && { bathrooms: parseFloat(bathrooms) }),
      ...(areaMin && { area_min: parseInt(areaMin, 10) }),
      ...(areaMax && { area_max: parseInt(areaMax, 10) }),
      ...(priceMin && { price_min: parseInt(priceMin, 10) }),
      ...(priceMax && { price_max: parseInt(priceMax, 10) }),
      ...(sort && sort !== 'recommended' && { sort }),
    };

    onSubmit(params);
  }, [filter, search, location, country, propertyType, bedrooms, bathrooms, areaMin, areaMax, priceMin, priceMax, sort, onSubmit]);

  const activeFilterCount = [
    search.trim(),
    location.trim(),
    country.trim(),
    propertyType,
    bedrooms,
    bathrooms,
    areaMin,
    areaMax,
    priceMin,
    priceMax,
    sort !== 'recommended' ? sort : null,
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* Filter Type Pills */}
      <View style={styles.section}>
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

      {/* Search Input */}
      <View style={styles.section}>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by location, property name..."
            style={styles.searchInput}
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Location & Country Inputs */}
      <View style={styles.row}>
        <View style={[styles.section, styles.halfWidth]}>
          <TextInput
            placeholder="Location"
            style={styles.input}
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
        </View>
        <View style={[styles.section, styles.halfWidth]}>
          <TextInput
            placeholder="Country"
            style={styles.input}
            placeholderTextColor="#999"
            value={country}
            onChangeText={setCountry}
          />
        </View>
      </View>

      {/* Advanced Filters Toggle */}
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <View style={styles.advancedToggleContent}>
          <FilterIcon size={20} color="#0F3460" />
          <Text style={styles.advancedToggleText}>
            Advanced Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
        </View>
        <ChevronDown
          size={20}
          color="#0F3460"
          style={[styles.chevron, showAdvanced && styles.chevronRotated]}
        />
      </TouchableOpacity>

      {/* Advanced Filters */}
      {showAdvanced && (
        <View style={styles.advancedSection}>
          {/* Property Type */}
          <View style={styles.section}>
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

          {/* Bedrooms & Bathrooms */}
          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <TextInput
                placeholder="Bedrooms (min)"
                style={styles.input}
                placeholderTextColor="#999"
                value={bedrooms}
                onChangeText={setBedrooms}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.section, styles.halfWidth]}>
              <TextInput
                placeholder="Bathrooms (min)"
                style={styles.input}
                placeholderTextColor="#999"
                value={bathrooms}
                onChangeText={setBathrooms}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Area Range */}
          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <TextInput
                placeholder="Min Area (m²)"
                style={styles.input}
                placeholderTextColor="#999"
                value={areaMin}
                onChangeText={setAreaMin}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.section, styles.halfWidth]}>
              <TextInput
                placeholder="Max Area (m²)"
                style={styles.input}
                placeholderTextColor="#999"
                value={areaMax}
                onChangeText={setAreaMax}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <TextInput
                placeholder="Min Price (€)"
                style={styles.input}
                placeholderTextColor="#999"
                value={priceMin}
                onChangeText={setPriceMin}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.section, styles.halfWidth]}>
              <TextInput
                placeholder="Max Price (€)"
                style={styles.input}
                placeholderTextColor="#999"
                value={priceMax}
                onChangeText={setPriceMax}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Sort */}
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterPill,
                    sort === option.value && styles.filterPillActive,
                  ]}
                  onPress={() => setSort(option.value)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      sort === option.value && styles.filterTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <SearchIcon size={20} color="#fff" style={styles.submitButtonIcon} />
        <Text style={styles.submitButtonText}>Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  section: {
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: '#0F3460',
  },
  filterText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F5F7FA',
    marginBottom: 20,
  },
  advancedToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advancedToggleText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#0F3460',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  advancedSection: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3460',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  submitButtonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
});
