import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, MapPin } from 'lucide-react-native';

import { api } from '@/config/api';
import type { Property } from '@/app/features/types';

export default function AgentListingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ agentId?: string }>();
  const username = useMemo(() => params.agentId?.toString() ?? '', [params.agentId]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    if (!username) {
      setError('Agent username missing.');
      setLoading(false);
      return;
    }

    try {
      // Get properties for this user
      const userProperties = await api.properties.getUserProps(username);
      const normalizedProperties = Array.isArray(userProperties)
        ? userProperties.map((p: any) => ({
            ...p,
            price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
            area: typeof p.area === 'string' ? parseFloat(p.area) : p.area ?? null,
            bedrooms: typeof p.bedrooms === 'string' ? parseInt(p.bedrooms, 10) : p.bedrooms ?? null,
            bathrooms: typeof p.bathrooms === 'string' ? parseFloat(p.bathrooms) : p.bathrooms ?? null,
          }))
        : [];
      
      // Filter to only published properties
      const published = normalizedProperties.filter((p: Property) => p.is_published);
      setProperties(published);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load listings:', err);
      setError('Unable to load listings at this time.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, [fetchListings]);

  const handlePropertyPress = (property: Property) => {
    router.push({
      pathname: '/property/[id]',
      params: { id: property.id.toString() },
    } as never);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F3460" />
          <Text style={styles.loadingText}>Loading listings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchListings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Published Listings ({properties.length})
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F3460" />
        }
      >
        {properties.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySubtitle}>
              This agent has not published any properties yet. Check back soon!
            </Text>
          </View>
        ) : (
          <View style={styles.propertyList}>
            {properties.map(property => {
              const image =
                property.images?.[0]?.image ??
                property.image ??
                'https://via.placeholder.com/300x200?text=Property';
              const price = Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
              }).format(property.price || 0);

              return (
                <TouchableOpacity
                  key={property.id}
                  style={styles.propertyCard}
                  onPress={() => handlePropertyPress(property)}
                >
                  <Image source={{ uri: image }} style={styles.propertyImage} />
                  <View style={styles.propertyOverlay}>
                    <View style={styles.propertyBadgeRow}>
                      <View style={styles.propertyBadge}>
                        <Text style={styles.propertyBadgeText}>
                          {property.property_type || 'Listing'}
                        </Text>
                      </View>
                      <View style={styles.propertyBadge}>
                        <Text style={styles.propertyBadgeText}>
                          {property.property_status === 'for_sale' ? 'For Sale' : 'For Rent'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.propertyTitle}>{property.title}</Text>
                    <Text style={styles.propertyPrice}>{price}</Text>
                    <View style={styles.propertyMetaRow}>
                      <MapPin size={14} color="#E5E7EB" />
                      <Text style={styles.propertyMetaText} numberOfLines={1}>
                        {property.location ||
                          [property.city, property.country].filter(Boolean).join(', ') ||
                          'Location not provided'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#0F172A',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  propertyList: {
    gap: 14,
  },
  propertyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111827',
    minHeight: 180,
  },
  propertyImage: {
    width: '100%',
    height: 180,
  },
  propertyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  propertyBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  propertyBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  propertyBadgeText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '600',
  },
  propertyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  propertyPrice: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  propertyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyMetaText: {
    color: '#E5E7EB',
    fontSize: 13,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0F3460',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

