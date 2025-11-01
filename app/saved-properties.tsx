import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from './_userbase/UserContext';
import { api } from '../config/api';
import PropertyCard from '../components/property/PropertyCard';

// Property type definition (matches what PropertyCard expects)
interface Property {
  id: number;
  images: (string | { image: string })[];
  forSale: boolean;
  price: number;
  title: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  propertyType: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  features?: string[];
  agent?: {
    name: string;
    photo: string;
    company: string;
  };
  is_favourite?: boolean;
  created_at?: string;
  updated_at?: string;
}

const SavedPropertiesPage: React.FC = () => {
  const { user, isLoading: userLoading } = useUser();
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSavedProperties = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setSavedProperties([]);
      setError(null);
      return;
    }

    try {
      setError(null);
      const data = await api.properties.myFavorites();
      console.log('Fetched saved properties:', data.length);
      console.log('Sample property data:', data[0]); // Debug first property
      setSavedProperties(data || []);
    } catch (err: any) {
      console.error('Failed to fetch saved properties:', err);
      setError('Failed to load your saved properties. Please try again.');
      setSavedProperties([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (userLoading) {
      setLoading(true);
      return;
    }
    fetchSavedProperties();
  }, [user, userLoading, fetchSavedProperties]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSavedProperties();
    setRefreshing(false);
  }, [fetchSavedProperties]);

  const handleLoginPress = useCallback(() => {
    // Navigate to login/auth page
    router.push('/(tabs)/profile');
  }, [router]);

  const handleRetryPress = useCallback(() => {
    setLoading(true);
    fetchSavedProperties();
  }, [fetchSavedProperties]);

  const renderProperty = useCallback(({ item }: { item: Property }) => {
    // Ensure property has all required fields
    const safeProperty = {
      ...item,
      id: item.id || 0,
      images: Array.isArray(item.images) ? item.images : [],
      forSale: item.forSale !== undefined ? item.forSale : true,
      price: item.price || 0,
      title: item.title || 'Untitled Property',
      location: item.location || 'Location not specified',
      bedrooms: item.bedrooms || 0,
      bathrooms: item.bathrooms || 0,
      size: item.size || 0,
      propertyType: item.propertyType || 'Property',
    };

    return (
      <PropertyCard
        property={safeProperty}
        saved={true}
      />
    );
  }, []);

  const renderEmptyState = () => {
    if (loading || userLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading saved properties...</Text>
        </View>
      );
    }

    if (!user) {
      return (
        <View style={styles.centerContainer}>
          <Heart size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>Sign in to save properties</Text>
          <Text style={styles.emptyDescription}>
            Create an account or sign in to save your favorite properties and access them anytime.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetryPress}>
            <RefreshCw size={20} color="#007AFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (savedProperties.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Heart size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No saved properties</Text>
          <Text style={styles.emptyDescription}>
            Properties you save will appear here. Start browsing to find your favorites!
          </Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.browseButtonText}>Browse Properties</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Saved Properties</Text>
          <Text style={styles.subtitle}>
            {savedProperties.length} {savedProperties.length === 1 ? 'property' : 'properties'}
          </Text>
        </View>
      </View>

      <FlatList
        data={savedProperties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContainer,
          savedProperties.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
});

export default SavedPropertiesPage; 