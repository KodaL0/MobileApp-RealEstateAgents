import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PropertyReelsView from '../../../components/Discover/PropertyReelsView';

export default function FeedIndexScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#000" translucent />
      <PropertyReelsView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
