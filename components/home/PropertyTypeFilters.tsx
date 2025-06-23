import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Home, Building, Hotel, Warehouse, Waves } from 'lucide-react-native';

type PropertyType = 'Houses' | 'Apartments' | 'Condos' | 'Commercial' | 'Beach' | 'Vacation';

export default function PropertyTypeFilters() {
  const [selectedType, setSelectedType] = useState<PropertyType>('Houses');

  const propertyTypes = [
    { type: 'Houses' as PropertyType, icon: Home },
    { type: 'Apartments' as PropertyType, icon: Building },
    { type: 'Condos' as PropertyType, icon: Hotel },
    { type: 'Commercial' as PropertyType, icon: Warehouse },
    { type: 'Beach' as PropertyType, icon: Waves },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
      >
        {propertyTypes.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.filterItem,
              selectedType === item.type && styles.filterItemSelected
            ]}
            onPress={() => setSelectedType(item.type)}
          >
            <View 
              style={[
                styles.iconContainer,
                selectedType === item.type && styles.iconContainerSelected
              ]}
            >
              <item.icon 
                size={24} 
                color={selectedType === item.type ? '#fff' : '#0F3460'} 
              />
            </View>
            <Text 
              style={[
                styles.filterText,
                selectedType === item.type && styles.filterTextSelected
              ]}
            >
              {item.type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  filterItemSelected: {
    // No specific style needed for container when selected
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: '#0F3460',
  },
  filterText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#666',
  },
  filterTextSelected: {
    color: '#0F3460',
  },
});