// app/screens/SearchResearchScreen.tsx
// Research/Configuration screen - uses SearchEventForm component

import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import SearchEventForm, {
  SearchEventParams,
} from '@/components/search/SearchEventForm';
import SearchResults from '@/components/search/SearchResults';

export default function SearchResearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchParams, setSearchParams] = useState<SearchEventParams | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSearchSubmit = (params: SearchEventParams) => {
    // Set search params and show results
    setSearchParams(params);
    setShowResults(true);
  };

  const handleBackToSearch = () => {
    // Only hide results, keep searchParams to preserve filter state
    setShowResults(false);
  };

  // Show results if search has been submitted
  if (showResults && searchParams) {
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
          paddingTop: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Event Form - initialValues preserves filters when returning from results */}
        <SearchEventForm 
          onSubmit={handleSearchSubmit} 
          initialValues={searchParams || undefined}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
