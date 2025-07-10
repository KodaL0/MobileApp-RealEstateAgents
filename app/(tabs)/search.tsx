// app/screens/SearchScreen.tsx (or wherever your screen lives)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Search as SearchIcon,
  X,
  ArrowDown,
  Filter as FilterIcon,
} from 'lucide-react-native';
import PropertyCard from '@/components/property/PropertyCard';
import { api } from '../../config/api'; // adjust if needed

type FilterOption = 'All' | 'Buy' | 'Rent' | 'Commercial';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('All');
  const [showResults, setShowResults] = useState(true);

  // Data state:
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pagination if desired:
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10; // or whatever

  // (Optional) total count/pages for pagination controls:
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const filters: FilterOption[] = ['All', 'Buy', 'Rent', 'Commercial'];

  // Build query params depending on searchQuery, currentPage, etc.
  const buildQueryParams = useCallback(() => {
    const qp: Record<string, any> = {
      page_size: PAGE_SIZE,
      page: currentPage,
    };
    if (searchQuery.trim()) {
      // your backend might accept a `search` or `location` param:
      // for simplicity, assume `location` or `search`
      qp.location = searchQuery.trim();
    }
    // If you have additional filters (minPrice, bedrooms, etc.), include here.
    return qp;
  }, [searchQuery, currentPage]);

  // Fetch function:
  const fetchListings = useCallback(async () => {
    // If filter is "All", you might decide: fetch both Buy and Rent, or fetch only featured? 
    // For simplicity, here if "All" we fetch first Buy page. You can adjust as needed.
    setLoading(true);
    setError(null);

    const qp = buildQueryParams();
    try {
      let respData;
      if (selectedFilter === 'Buy') {
        const paginated = await api.properties.buy(qp);
        // paginated: { results: [...], count, next, previous }
        respData = paginated;
      } else if (selectedFilter === 'Rent') {
        const paginated = await api.properties.rent(qp);
        respData = paginated;
      } else if (selectedFilter === 'Commercial') {
        // If you have a commercial endpoint, call it here:
        // e.g. api.properties.list({ property_type: 'commercial', ...qp })
        // Fallback: use a general list endpoint with filter param:
        const paginatedRaw = await api.properties.list({ property_type: 'commercial', ...qp });
        // Note: your web’s list endpoint returns array or { results, count }?
        // Adjust here to match shape:
        respData = {
          results: Array.isArray(paginatedRaw) ? paginatedRaw : paginatedRaw.results || [],
          count: paginatedRaw.count ?? (Array.isArray(paginatedRaw) ? paginatedRaw.length : 0),
        };
      } else {
        // 'All': you could combine buy + rent, or just fetch featured or all properties.
        // For demonstration, fetch all properties via list endpoint:
        const paginatedRaw = await api.properties.list(buildQueryParams());
        respData = {
          results: Array.isArray(paginatedRaw) ? paginatedRaw : paginatedRaw.results || [],
          count: paginatedRaw.count ?? (Array.isArray(paginatedRaw) ? paginatedRaw.length : 0),
        };
      }

      const items: any[] = respData.results || [];
      setListings(items);
      const cnt = respData.count ?? items.length;
      setTotalCount(cnt);
      setTotalPages(Math.max(1, Math.ceil(cnt / PAGE_SIZE)));
    } catch (e: any) {
      console.error('Error fetching listings:', e);
      setError('Failed to load properties. Please try again.');
      setListings([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, buildQueryParams]);

  // Trigger fetch when filter/search/page changes:
  useEffect(() => {
    // reset to page 1 when filter or search changes:
    setCurrentPage(1);
  }, [selectedFilter, searchQuery]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings, currentPage]);

  // Render item for FlatList:
  const renderItem = ({ item }: { item: any }) => {
    // `item` should be in shape your PropertyCard expects:
    // If your backend returns fields with different names, you may need to normalize here.
    // E.g., item.images might be array of objects {image: "url"}; PropertyCard expects property.images[0] = url string.
    // You can do a quick normalization inline or wrap in a helper.
    // For brevity, assume item.images is array of URL strings OR array of objects { image: string }:

    // Quick normalization example:
    let imagesArr: string[] = [];
    if (Array.isArray(item.images)) {
      imagesArr = item.images.map((img: any) => {
        if (typeof img === 'string') return img;
        if (img.image) {
          return img.image.startsWith('http')
            ? img.image
            : `https://api.propertpro.com${img.image}`;
        }
        return '';
      }).filter(uri => uri);
    }
    // Prepare a “property” object shape:
    const propForCard = {
      id: item.id,
      images: imagesArr,
      forSale:
        item.property_status === 'for_sale' ||
        (typeof item.forSale === 'boolean' && item.forSale) ||
        (item.listing_type && item.listing_type.toLowerCase() === 'sale'),
      price: Number(item.price) || 0,
      title: item.title || '',
      location: item.location || '',
      bedrooms: Number(item.bedrooms) || 0,
      bathrooms: Number(item.bathrooms) || 0,
      size: item.area, // Use raw area from backend
      propertyType: item.property_type || '',
      // plus any other fields your mobile card uses
    };

    return <PropertyCard property={propForCard} />;
  };

  // Pagination controls (simple previous/next buttons)
  const renderFooter = () => {
    if (loading) return null;
    if (totalPages <= 1) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          onPress={() => {
            if (currentPage > 1) setCurrentPage(p => p - 1);
          }}
          disabled={currentPage === 1}
          style={[
            styles.pageButton,
            currentPage === 1 && styles.pageButtonDisabled,
          ]}
        >
          <Text style={styles.pageButtonText}>{'< Prev'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          {currentPage} / {totalPages}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (currentPage < totalPages) setCurrentPage(p => p + 1);
          }}
          disabled={currentPage === totalPages}
          style={[
            styles.pageButton,
            currentPage === totalPages && styles.pageButtonDisabled,
          ]}
        >
          <Text style={styles.pageButtonText}>{'Next >'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />

      <FlatList
        data={showResults ? listings : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 10,
          paddingHorizontal: 16,
        }}

        // 1. HEADER: title, search bar, filters
        ListHeaderComponent={() => (
          <>
            {/* Title */}
            <View style={styles.header}>
              <Text style={styles.title}>Find Properties</Text>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <SearchIcon size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  placeholder="Search by location, property name..."
                  style={styles.searchInput}
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setShowResults(false)}
                  onBlur={() => setShowResults(true)}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={20} color="#666" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.filterButton}>
                <FilterIcon size={22} color="#0F3460" />
              </TouchableOpacity>
            </View>

            {/* Filter pills */}
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterPill,
                      selectedFilter === filter && styles.filterPillActive,
                    ]}
                    onPress={() => setSelectedFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selectedFilter === filter && styles.filterTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        // 2. EMPTY: either popular suggestions or “no results”
        ListEmptyComponent={() =>
          !showResults ? (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Popular Searches</Text>
              {[
                'New York Real Estate',
                'Apartments in San Francisco',
                'Houses for rent in Miami',
                'Luxury condos in Los Angeles',
              ].map((text, i) => (
                <TouchableOpacity key={i} style={styles.suggestionItem}>
                  <SearchIcon size={16} color="#666" />
                  <Text style={styles.suggestionText}>{text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : !loading && listings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No properties found.</Text>
            </View>
          ) : null
        }

        // 3. FOOTER: pagination controls
        ListFooterComponent={renderFooter}

        // 4. HEADER/FOOTER spacing
        ListHeaderComponentStyle={{ marginBottom: 16 }}
        ListFooterComponentStyle={{ marginTop: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#0F3460',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginRight: 8,
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
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    marginRight: 8,
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
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  suggestionsTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#0F3460',
    marginBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  resultsCount: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  // error
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    color: '#b91c1c',
  },
  retryText: {
    marginTop: 8,
    color: '#0F3460',
    fontFamily: 'Poppins-Medium',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#F5F7FA',
    marginHorizontal: 8,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontFamily: 'Poppins-Medium',
    color: '#0F3460',
  },
  pageInfo: {
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
});

