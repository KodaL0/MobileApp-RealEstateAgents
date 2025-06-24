import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Search, Bell, Filter, ArrowRight } from 'lucide-react-native';
import FeaturedListings from '@/components/home/FeaturedListings';
import PropertyTypeFilters from '@/components/home/PropertyTypeFilters';
import TrendingProperties from '@/components/home/TrendingProperties';
import Promotions from '@/components/home/Promotions';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" backgroundColor="#fff" translucent={false} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 10,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hello, Guest</Text>
            <Text style={styles.subtitle}>Find your perfect property</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Bell size={24} color="#0F3460" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              placeholder="Search by location, property name..."
              style={styles.searchInput}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.filterBtn}>
              <Filter size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <PropertyTypeFilters />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Listings</Text>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <ArrowRight size={16} color="#0F3460" />
          </TouchableOpacity>
        </View>

        <FeaturedListings />
        <Promotions />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Properties</Text>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <ArrowRight size={16} color="#0F3460" />
          </TouchableOpacity>
        </View>

        <TrendingProperties />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    backgroundColor: '#fff', // no flex: 1 here!
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  welcomeText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 22,
    color: '#0F3460',
  },
  subtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
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
  filterBtn: {
    backgroundColor: '#0F3460',
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#0F3460',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#0F3460',
    marginRight: 4,
  },
});
