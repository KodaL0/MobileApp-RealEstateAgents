// app/screens/SearchScreen.tsx

import React, { useState, useCallback } from 'react';
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
  Filter as FilterIcon,
} from 'lucide-react-native';
import PropertyCard from '@/components/property/PropertyCard';
import { api } from '../../config/api';

type FilterOption = 'All' | 'Buy' | 'Rent' | 'Commercial';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('All');
  
  // Track if user has performed a search
  const [hasSearched, setHasSearched] = useState(false);

  // Data state:
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Infinite scroll state
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20; // Increased for better infinite scroll experience

  // Total count for display
  const [totalCount, setTotalCount] = useState(0);

  const filters: FilterOption[] = ['All', 'Buy', 'Rent', 'Commercial'];

  // Build query params - optimized to use 'search' parameter
  const buildQueryParams = useCallback((page: number = 1) => {
    const qp: Record<string, any> = {
      page_size: PAGE_SIZE,
      page: page,
    };
    
    // Priority 1: Use 'search' instead of 'location' for broader matching
    // 'search' matches: title, description, location
    // 'location' only matches: location field
    if (searchQuery.trim()) {
      qp.search = searchQuery.trim();
    }
    
    // Priority 2: Property type (if not already filtered by endpoint)
    if (selectedFilter === 'Commercial') {
      qp.property_type = 'commercial';
    }
    
    // Phase 2: Additional filters will be added here
    // if (filters.priceMin) qp.price_min = filters.priceMin;
    // if (filters.priceMax) qp.price_max = filters.priceMax;
    // if (filters.bedrooms) qp.bedrooms = filters.bedrooms;
    // if (filters.bathrooms) qp.bathrooms = filters.bathrooms;
    // if (filters.propertyType) qp.property_type = filters.propertyType;
    // if (filters.amenities?.length) qp.amenities = filters.amenities.join(',');
    
    return qp;
  }, [searchQuery, selectedFilter]);

  // Fetch function - supports both initial search and loading more
  const fetchListings = useCallback(async (page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    const qp = buildQueryParams(page);
    try {
      let respData;
      if (selectedFilter === 'Buy') {
        const paginated = await api.properties.buy(qp);
        respData = paginated;
      } else if (selectedFilter === 'Rent') {
        const paginated = await api.properties.rent(qp);
        respData = paginated;
      } else if (selectedFilter === 'Commercial') {
        const paginatedRaw = await api.properties.list({ property_type: 'commercial', ...qp });
        respData = {
          results: Array.isArray(paginatedRaw) ? paginatedRaw : paginatedRaw.results || [],
          count: paginatedRaw.count ?? (Array.isArray(paginatedRaw) ? paginatedRaw.length : 0),
          next: paginatedRaw.next ?? null,
        };
      } else {
        const paginatedRaw = await api.properties.list(buildQueryParams(page));
        respData = {
          results: Array.isArray(paginatedRaw) ? paginatedRaw : paginatedRaw.results || [],
          count: paginatedRaw.count ?? (Array.isArray(paginatedRaw) ? paginatedRaw.length : 0),
          next: paginatedRaw.next ?? null,
        };
      }

      const items: any[] = respData.results || [];
      
      if (append) {
        // Append to existing listings
        setListings(prev => [...prev, ...items]);
      } else {
        // Replace listings for new search
        setListings(items);
        setHasSearched(true);
      }

      const cnt = respData.count ?? (append ? totalCount : items.length);
      setTotalCount(cnt);
      
      // Determine if there are more pages
      const hasNext = respData.next !== null && respData.next !== undefined;
      setHasMore(hasNext);
      
      if (hasNext) {
        setNextPage(page + 1);
      } else {
        setNextPage(null);
      }
    } catch (e: any) {
      console.error('Error fetching listings:', e);
      if (!append) {
        setError('Failed to load properties. Please try again.');
        setListings([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedFilter, buildQueryParams, totalCount]);

  // Handle search button press - new search
  const handleSearch = useCallback(() => {
    setNextPage(1);
    setHasMore(false);
    fetchListings(1, false);
  }, [fetchListings]);

  // Handle filter change - reset state and prompt new search
  const handleFilterChange = useCallback((filter: FilterOption) => {
    setSelectedFilter(filter);
    setNextPage(1);
    setHasMore(false);
    // Clear results when filter changes to guide user to search again
    if (hasSearched) {
      setListings([]);
      setTotalCount(0);
      setHasSearched(false);
      setError(null);
    }
  }, [hasSearched]);

  // Load more items for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextPage && hasSearched) {
      fetchListings(nextPage, true);
    }
  }, [loadingMore, hasMore, nextPage, hasSearched, fetchListings]);

  // Render item for FlatList
  const renderItem = ({ item }: { item: any }) => {
    // Image normalization
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
      }).filter((uri: any) => uri);
    }
    
    // Prepare property object for PropertyCard
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
      size: item.area,
      propertyType: item.property_type || '',
    };

    return <PropertyCard property={propForCard} />;
  };

  // Footer for infinite scroll loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color="#0F3460" />
        <Text style={styles.loadMoreText}>Loading more properties...</Text>
      </View>
    );
  };

  // Guidance component shown when user hasn't searched
  const renderSearchGuidance = () => (
    <View style={styles.guidanceContainer}>
      <View style={styles.guidanceIconContainer}>
        <SearchIcon size={48} color="#0F3460" />
      </View>
      <Text style={styles.guidanceTitle}>Find Your Perfect Property</Text>
      <Text style={styles.guidanceText}>
        Use the filters and search to find exactly what you're looking for. Your search results will load as you scroll.
      </Text>
      <View style={styles.guidanceTips}>
        <View style={styles.tipItem}>
          <View style={styles.tipBullet} />
          <Text style={styles.tipText}>Select a filter: All, Buy, Rent, or Commercial</Text>
        </View>
        <View style={styles.tipItem}>
          <View style={styles.tipBullet} />
          <Text style={styles.tipText}>Enter a location or property name (optional)</Text>
        </View>
        <View style={styles.tipItem}>
          <View style={styles.tipBullet} />
          <Text style={styles.tipText}>Tap the Search button to see results</Text>
        </View>
        <View style={styles.tipItem}>
          <View style={styles.tipBullet} />
          <Text style={styles.tipText}>Scroll down to load more properties</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />

      <FlatList
        data={hasSearched ? listings : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 10,
          paddingHorizontal: 16,
        }}
        // Infinite scroll
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        // HEADER: filters first, then search bar, then search button
        ListHeaderComponent={() => (
          <>
            {/* Filter pills - prioritized at the top */}
            <View style={styles.filtersContainer}>
              <Text style={styles.filtersLabel}>Filter by Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterPill,
                      selectedFilter === filter && styles.filterPillActive,
                    ]}
                    onPress={() => handleFilterChange(filter)}
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

            {/* Search bar with search button */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <SearchIcon size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  placeholder="Search by location, property name..."
                  style={styles.searchInput}
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={20} color="#666" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => {
                  // TODO: Phase 2 - Open advanced filters modal (price, bedrooms, etc.)
                }}
              >
                <FilterIcon size={22} color="#0F3460" />
              </TouchableOpacity>
            </View>

            {/* Search button */}
            <TouchableOpacity
              style={[
                styles.searchButton,
                loading && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <SearchIcon size={20} color="#fff" style={styles.searchButtonIcon} />
                  <Text style={styles.searchButtonText}>Search</Text>
                </>
              )}
            </TouchableOpacity>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={handleSearch} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {hasSearched && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {totalCount > 0 ? `${totalCount} ${totalCount === 1 ? 'property' : 'properties'} found` : 'No results'}
                </Text>
                {loading && !loadingMore && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#0F3460" />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        // EMPTY: guidance or no results
        ListEmptyComponent={() => {
          if (!hasSearched) {
            return renderSearchGuidance();
          }
          if (loading && !loadingMore) {
            return (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0F3460" />
                <Text style={styles.loadingText}>Searching properties...</Text>
              </View>
            );
          }
          if (listings.length === 0 && !loading) {
            return (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No properties found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search criteria or filters.
                </Text>
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('All');
                    setHasSearched(false);
                    setListings([]);
                    setTotalCount(0);
                    setNextPage(1);
                    setHasMore(false);
                    setError(null);
                  }}
                >
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return null;
        }}

        // HEADER spacing
        ListHeaderComponentStyle={{ marginBottom: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filtersContainer: {
    marginBottom: 16,
    paddingTop: 8,
  },
  filtersLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#0F3460',
    marginBottom: 12,
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
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 12,
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
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3460',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonIcon: {
    marginRight: 8,
  },
  searchButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
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
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    color: '#b91c1c',
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 8,
  },
  retryText: {
    color: '#0F3460',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  guidanceContainer: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  guidanceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  guidanceTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#0F3460',
    marginBottom: 12,
    textAlign: 'center',
  },
  guidanceText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  guidanceTips: {
    width: '100%',
    alignItems: 'flex-start',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  tipBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F3460',
    marginRight: 12,
  },
  tipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#0F3460',
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearSearchButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
  },
  clearSearchText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#0F3460',
  },
});
