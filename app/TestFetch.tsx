import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { api } from '../config/api'; // adjust path relative to this file

export default function TestFetch() {
  useEffect(() => {
    api.properties
      .featured({ page: 1, page_size: 3 })
      .then(data => {
        console.log('Featured fetch success:', data);
      })
      .catch(err => {
        console.error('Featured fetch error:', err);
      });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Testing API fetch—check console logs</Text>
    </View>
  );
}
