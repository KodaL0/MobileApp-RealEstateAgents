// app/screens/SearchResearchScreen.tsx
// Research/Configuration screen - uses SearchEventForm component

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Search as SearchIcon } from 'lucide-react-native';
import SearchEventForm, {
  SearchEventParams,
} from '@/components/search/SearchEventForm';
import SearchResults from '@/components/search/SearchResults';

export default function SearchResearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchParams, setSearchParams] = useState<SearchEventParams | null>(null);

  const handleSearchSubmit = (params: SearchEventParams) => {
    // Set search params to show results inline
    setSearchParams(params);
  };

  const handleBackToSearch = () => {
    setSearchParams(null);
  };

  // Show results if search has been submitted
  if (searchParams) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <SearchResults searchParams={searchParams} onBack={handleBackToSearch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

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

        {/* Search Event Form */}
        <SearchEventForm onSubmit={handleSearchSubmit} />

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
                Use advanced filters for price, bedrooms, bathrooms, and more
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
  tipsContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
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
