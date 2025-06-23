import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
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
  Filter,
} from 'lucide-react-native';
import PropertyCard from '@/components/property/PropertyCard';
import { PROPERTIES } from '@/data/properties';

type FilterOption = 'All' | 'Buy' | 'Rent' | 'Commercial';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('All');
  const [showResults, setShowResults] = useState(true);

  const filters: FilterOption[] = ['All', 'Buy', 'Rent', 'Commercial'];
  const filterProperties = PROPERTIES.slice(0, 6);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 10,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Find Properties</Text>
        </View>

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
            <Filter size={22} color="#0F3460" />
          </TouchableOpacity>
        </View>

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

        {!showResults ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Popular Searches</Text>
            {[
              'New York Real Estate',
              'Apartments in San Francisco',
              'Houses for rent in Miami',
              'Luxury condos in Los Angeles',
            ].map((text, index) => (
              <TouchableOpacity key={index} style={styles.suggestionItem}>
                <SearchIcon size={16} color="#666" />
                <Text style={styles.suggestionText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filterProperties.length} Results
              </Text>
              <TouchableOpacity style={styles.sortButton}>
                <Text style={styles.sortText}>Sort by: Featured</Text>
                <ArrowDown size={14} color="#0F3460" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filterProperties}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => <PropertyCard property={item} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: insets.bottom + 10,
              }}
            />
          </>
        )}
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
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsCount: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#0F3460',
    marginRight: 4,
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
});
