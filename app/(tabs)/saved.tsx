import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import PropertyCard from '@/components/property/PropertyCard';
import { PROPERTIES } from '@/data/properties';
import { Trash2 } from 'lucide-react-native';

type Property = {
  id: number;
};

type SavedSearch = {
  id: number;
  name: string;
  filters: string;
};

export default function SavedScreen() {
  const insets = useSafeAreaInsets();

  const savedProperties: Property[] = PROPERTIES.slice(0, 3);
  const searches: SavedSearch[] = [
    { id: 1, name: 'New York Apartments', filters: '2+ beds, $1500-2500/mo' },
    { id: 2, name: 'Miami Beach Houses', filters: '3+ beds, $500k-1.2M' },
    { id: 3, name: 'San Francisco Condos', filters: '1+ beds, $600k-900k' },
  ];

  const renderSavedProperty = ({ item }: { item: Property }) => (
    <PropertyCard property={item} saved />
  );

  const renderSavedSearch = ({ item }: { item: SavedSearch }) => (
    <View style={styles.savedSearchItem}>
      <View>
        <Text style={styles.savedSearchName}>{item.name}</Text>
        <Text style={styles.savedSearchFilters}>{item.filters}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton}>
        <Trash2 size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <FlatList
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: insets.top }]}>
              <Text style={styles.title}>Saved</Text>
            </View>

            <View style={styles.tabButtons}>
              <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
                <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>
                  Properties
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabButton}>
                <Text style={styles.tabButtonText}>Searches</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        data={savedProperties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSavedProperty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 10,
        }}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#0F3460',
  },
  tabButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  tabButtonActive: {
    backgroundColor: '#0F3460',
  },
  tabButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  savedSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  savedSearchName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#0F3460',
    marginBottom: 4,
  },
  savedSearchFilters: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
