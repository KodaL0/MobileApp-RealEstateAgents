import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootIndex() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Redirect to feed if we're at the root
    if (segments.length === 0) {
      router.replace('/(tabs)/feed');
    }
  }, [segments, router]);

  // Show loading while redirecting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0F3460" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
