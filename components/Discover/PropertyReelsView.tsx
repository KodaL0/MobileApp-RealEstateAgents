import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  StatusBar,
} from 'react-native';
import PropertyReelCard from './PropertyReelCard';
import { api } from '@/config/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PropertyReelsView() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/properties/');
      const data = response.data || [];

      // Show featured first if available
      const featured = data.filter((p: any) => p.is_featured);
      setProperties(featured.length ? featured : data);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F3460" />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No properties available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <FlatList
        ref={flatListRef}
        data={properties}
        renderItem={({ item }) => <PropertyReelCard property={item} />}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF385C',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
