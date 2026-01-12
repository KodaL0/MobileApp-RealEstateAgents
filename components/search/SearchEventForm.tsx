// components/search/SearchEventForm.tsx
// Comprehensive search form component that exports all search event initialization logic

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Search as SearchIcon,
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
  const [propertyType, setPropertyType] = useState<PropertyType | undefined>(
    initialValues?.property_type
  );
  const [bedrooms, setBedrooms] = useState<number | undefined>(
    initialValues?.bedrooms
  );
  const [bathrooms, setBathrooms] = useState<number | undefined>(
    initialValues?.bathrooms
  );
  const [areaMin, setAreaMin] = useState<number | undefined>(
    initialValues?.area_min
  );
  const [areaMax, setAreaMax] = useState<number | undefined>(
    initialValues?.area_max
  );
  const [priceMin, setPriceMin] = useState<number | undefined>(
    initialValues?.price_min
  );
  const [priceMax, setPriceMax] = useState<number | undefined>(
    initialValues?.price_max
  );

  const filters: FilterOption[] = ['All', 'Buy', 'Rent'];
  const propertyTypes: PropertyType[] = ['apartment', 'house', 'villa', 'land'];
  const bedroomOptions = [1, 2, 3, 4, 5, 6];
  const bathroomOptions = [1, 2, 3, 4, 5];
  const areaOptions = [50, 100, 150, 200, 300, 500];
  const priceOptions = [50000, 100000, 200000, 300000, 500000, 1000000];

  const handleSubmit = useCallback(() => {
    const params: SearchEventParams = {
      filter,
      ...(propertyType && { property_type: propertyType }),
      ...(bedrooms && { bedrooms }),
      ...(bathrooms && { bathrooms }),
      ...(areaMin && { area_min: areaMin }),
      ...(areaMax && { area_max: areaMax }),
      ...(priceMin && { price_min: priceMin }),
      ...(priceMax && { price_max: priceMax }),
    };

    onSubmit(params);
  }, [filter, propertyType, bedrooms, bathrooms, areaMin, areaMax, priceMin, priceMax, onSubmit]);

  const activeFilterCount = [
    propertyType,
    bedrooms,
    bathrooms,
    areaMin,
    areaMax,
    priceMin,
    priceMax,
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

      {/* Bedrooms */}
      <View style={styles.section}>
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
                {count}+ Bed
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bathrooms */}
      <View style={styles.section}>
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
                {count}+ Bath
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Area Range */}
      <View style={styles.section}>
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
                {area}m²+
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Price Range */}
      <View style={styles.section}>
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
                €{(price / 1000).toFixed(0)}k+
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
