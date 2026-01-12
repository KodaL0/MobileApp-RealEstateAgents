// app/screens/SearchResearchScreen.tsx
// Research/Configuration screen - user configures search before performing it

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  Search as SearchIcon,
  X,
  Filter as FilterIcon,
  ArrowLeft,
} from 'lucide-react-native';

type FilterOption = 'All' | 'Buy' | 'Rent';

export default function SearchResearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('All');

  const filters: FilterOption[] = ['All', 'Buy', 'Rent'];

  const handleSearch = () => {
    // Navigate to results screen with search params
    // Search event will be tracked automatically when API is called on results screen
    const params = new URLSearchParams({
      filter: selectedFilter,
      search: searchQuery.trim(),
    }).toString();
    router.push(`/(tabs)/search-results?${params}` as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Subtle back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#0F3460" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Properties</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Guidance section */}
        <View style={styles.guidanceContainer}>
          <View style={styles.guidanceIconContainer}>
            <SearchIcon size={48} color="#0F3460" />
          </View>
          <Text style={styles.guidanceTitle}>Find Your Perfect Property</Text>
          <Text style={styles.guidanceText}>
            Configure your search filters below, then tap Search to see results.
          </Text>
        </View>

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
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <SearchIcon size={20} color="#fff" style={styles.searchButtonIcon} />
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>

        {/* Tips section */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Search Tips</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>
                Select a filter type to narrow your search
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>
                Enter a location or property name for more specific results
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipBullet} />
              <Text style={styles.tipText}>
                Use the advanced filters button for price, bedrooms, and more
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#0F3460',
    flex: 1,
    textAlign: 'center',
  },
  guidanceContainer: {
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
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
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  filtersContainer: {
    marginBottom: 24,
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
    marginBottom: 32,
  },
  searchButtonIcon: {
    marginRight: 8,
  },
  searchButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  tipsContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#0F3460',
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F3460',
    marginRight: 12,
    marginTop: 6,
  },
  tipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
});
