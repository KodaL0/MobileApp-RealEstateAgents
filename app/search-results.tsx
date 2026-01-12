// app/search-results.tsx
// Route file for search results - all logic in SearchResults component

import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import SearchResults from '@/components/search/SearchResults';
import { parseSearchEventUrlParams } from '@/components/search/SearchEventForm';

export default function SearchResultsRoute() {
  const params = useLocalSearchParams();

  // Parse URL params to SearchEventParams using exported function
  const searchParams = useMemo(() => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, Array.isArray(value) ? value[0] : value);
      }
    });
    return parseSearchEventUrlParams(urlParams);
  }, [params]);

  return <SearchResults searchParams={searchParams} />;
}
