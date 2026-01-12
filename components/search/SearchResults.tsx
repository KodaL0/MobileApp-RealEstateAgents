// components/search/SearchResults.tsx
// Search results component - displays results and tracks search events

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import PropertyCard from '@/components/property/PropertyCard';
import { api } from '../../config/api';
import {
  buildSearchQueryParams,
  SearchEventParams,
} from './SearchEventForm';

const PAGE_SIZE = 20;

export interface SearchResultsProps {
  searchParams: SearchEventParams;
  onBack?: () => void;
}

export default function SearchResults({ searchParams, onBack }: SearchResultsProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Data state:
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Infinite scroll state
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [hasMore, setHasMore] = useState(false);

  // Total count for display
  const [totalCount, setTotalCount] = useState(0);

  // Build query params using exported function
  const buildQueryParams = useCallback(
    (page: number = 1) => {
      return buildSearchQueryParams(searchParams, page, PAGE_SIZE);
    },
    [searchParams]
  );

  // Fetch function - supports both initial search and loading more
  // This API call automatically tracks search events on the backend
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
      if (searchParams.filter === 'Buy') {
        const paginated = await api.properties.buy(qp);
        respData = paginated;
      } else if (searchParams.filter === 'Rent') {
        const paginated = await api.properties.rent(qp);
        respData = paginated;
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
  }, [searchParams, buildQueryParams, totalCount]);

  // Load initial results on mount (this triggers search event tracking)
  useEffect(() => {
    setNextPage(1);
    setHasMore(false);
    fetchListings(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams.filter,
    searchParams.search,
    searchParams.location,
    searchParams.country,
    searchParams.property_type,
    searchParams.bedrooms,
    searchParams.bathrooms,
    searchParams.area_min,
    searchParams.area_max,
    searchParams.price_min,
    searchParams.price_max,
    searchParams.sort,
  ]); // Re-fetch if any params change

  // Load more items for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextPage) {
      fetchListings(nextPage, true);
    }
  }, [loadingMore, hasMore, nextPage, fetchListings]);

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

  return (
    <View style={styles.container}>

      {/* Header with back button */}
      {onBack && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
          >
            <ArrowLeft size={24} color="#0F3460" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Search Results</Text>
            {searchParams.search && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {searchParams.search}
              </Text>
            )}
          </View>
          <View style={styles.backButtonPlaceholder} />
        </View>
      )}

      <FlatList
        data={listings}
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
        // Header: Results count and filter badge
        ListHeaderComponent={() => (
          <>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => fetchListings(1, false)} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && (
              <View style={styles.resultsHeader}>
                <View style={styles.resultsInfo}>
                  <Text style={styles.resultsCount}>
                    {totalCount > 0 ? `${totalCount} ${totalCount === 1 ? 'property' : 'properties'} found` : 'No results'}
                  </Text>
                  {searchParams.filter !== 'All' && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{searchParams.filter}</Text>
                    </View>
                  )}
                  {searchParams.property_type && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {searchParams.property_type.charAt(0).toUpperCase() + searchParams.property_type.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        // Empty: loading or no results
        ListEmptyComponent={() => {
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
                {onBack && (
                  <TouchableOpacity 
                    style={styles.backToSearchButton}
                    onPress={onBack}
                  >
                    <Text style={styles.backToSearchText}>Modify Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }
          return null;
        }}

        // Header spacing
        ListHeaderComponentStyle={{ marginBottom: 16 }}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#0F3460',
  },
  headerSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultsCount: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  filterBadge: {
    backgroundColor: '#0F3460',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#FFF',
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
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
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
  backToSearchButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0F3460',
    borderRadius: 8,
  },
  backToSearchText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
  },
});
