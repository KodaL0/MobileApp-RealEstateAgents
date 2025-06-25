import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Search, X, MapPin } from 'lucide-react-native';

// Platform-specific shadow styles
const getShadowStyle = () => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  };
};

type MapSearchProps = {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
};

export default function MapSearch({ 
  onSearch, 
  onClear, 
  placeholder = "Search locations..." 
}: MapSearchProps) {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={16} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Quick location buttons */}
      <View style={styles.quickLocations}>
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => {
            setQuery('Nicosia');
            onSearch('Nicosia');
          }}
        >
          <MapPin size={14} color="#0F3460" />
          <Text style={styles.quickButtonText}>Nicosia</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => {
            setQuery('Limassol');
            onSearch('Limassol');
          }}
        >
          <MapPin size={14} color="#0F3460" />
          <Text style={styles.quickButtonText}>Limassol</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => {
            setQuery('Larnaca');
            onSearch('Larnaca');
          }}
        >
          <MapPin size={14} color="#0F3460" />
          <Text style={styles.quickButtonText}>Larnaca</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickButton}
          onPress={() => {
            setQuery('Paphos');
            onSearch('Paphos');
          }}
        >
          <MapPin size={14} color="#0F3460" />
          <Text style={styles.quickButtonText}>Paphos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    ...getShadowStyle(),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  quickLocations: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#0F3460',
    marginLeft: 4,
  },
}); 