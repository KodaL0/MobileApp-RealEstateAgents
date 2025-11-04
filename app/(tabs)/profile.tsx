import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Settings, Heart, Calculator, LogOut, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

import { api } from '@/config/api';
import { useUser } from '@/app/_userbase/UserContext';
import { useGoogleLogin } from '@/app/_userbase/GlobalOAuthHandler';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, isAuthenticated, logout } = useUser();
  const [savedPropertiesCount, setSavedPropertiesCount] = useState<number>(0);
  const [hasFetchedSavedCount, setHasFetchedSavedCount] = useState<boolean>(false);
  const handleGoogleLogin = useGoogleLogin();

  useEffect(() => {
    const fetchSavedCount = async () => {
      if (user && !hasFetchedSavedCount) {
        try {
          const data = await api.properties.myFavorites();
          setSavedPropertiesCount(data?.length || 0);
          setHasFetchedSavedCount(true);
        } catch (error) {
          console.error('Failed to fetch saved properties count:', error);
        }
      }
    };
    fetchSavedCount();
  }, [user, hasFetchedSavedCount]);

  const handleLogout = async () => {
    try {
      await logout();
      setSavedPropertiesCount(0);
      setHasFetchedSavedCount(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { icon: Heart, label: 'Saved Properties', count: savedPropertiesCount },
    { icon: Calculator, label: 'Mortgage Calculator' },
    { icon: Calculator, label: 'Rent vs Buy Calculator' },
    { icon: Settings, label: 'Settings' },
  ];

  const handleMenuItemPress = (label: string) => {
    switch (label) {
      case 'Saved Properties': router.push('/saved-properties'); break;
      case 'Mortgage Calculator': router.push('/mortgage-calculator'); break;
      case 'Rent vs Buy Calculator': router.push('/RentVsBuyScreen'); break;
      case 'Settings': console.log('Settings pressed'); break;
      default: console.log(`${label} pressed`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#0F3460" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView 
          contentContainerStyle={styles.loginScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loginCard}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your PropertPro account</Text>
            
            {/* Login Button */}
            <TouchableOpacity 
              onPress={() => router.push('/auth/login')}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth Button */}
            <TouchableOpacity onPress={handleGoogleLogin} style={styles.googleButton}>
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1200px-Google_%22G%22_Logo.png' }} 
                style={styles.googleLogo} 
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 10 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color="#0F3460" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <Image source={{ uri: user.profile_picture || 'https://placehold.co/60x60?text=PP' }} style={styles.profileImage} />
            <View>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push('/EditProfileScreen')}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.membershipCard}>
          <View>
            <Text style={styles.memberType}>{user.is_premium ? 'Premium Member' : 'Free Member'}</Text>
            {!user.is_premium && <Text style={styles.membershipText}>Upgrade to access premium features</Text>}
          </View>
          {!user.is_premium && <TouchableOpacity style={styles.upgradeButton}><Text style={styles.upgradeButtonText}>Upgrade</Text></TouchableOpacity>}
        </View>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => handleMenuItemPress(item.label)}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}><item.icon size={20} color="#0F3460" /></View>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <View style={styles.menuItemRight}>
                {typeof item.count === 'number' && item.count > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{item.count}</Text></View>}
                <ChevronRight size={20} color="#999" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF6B6B" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={styles.footer}><Text style={styles.footerText}>PropertPro v1.0.0</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { backgroundColor: '#fff' },
  loginScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loginCard: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  title: { fontFamily: 'Poppins-Bold', fontSize: 26, color: '#0F3460', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' },
  
  // Primary button
  primaryButton: { backgroundColor: '#0F3460', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16, width: '100%' },
  primaryButtonText: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#fff' },
  
  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e9ecef' },
  dividerText: { fontFamily: 'Poppins-Medium', fontSize: 13, color: '#999', marginHorizontal: 16 },
  
  // Google button
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: '#ddd', width: '100%' },
  googleLogo: { width: 20, height: 20, marginRight: 12 },
  googleButtonText: { fontFamily: 'Poppins-Medium', fontSize: 15, color: '#333' },
  
  // Register link
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666' },
  registerLink: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#0F3460' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  settingsButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center' },
  profileCard: { backgroundColor: '#F5F7FA', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileImage: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  profileName: { fontFamily: 'Poppins-SemiBold', fontSize: 18, color: '#0F3460' },
  profileEmail: { fontFamily: 'Poppins-Regular', fontSize: 14, color: '#666' },
  editButton: { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  editButtonText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#0F3460' },
  membershipCard: { backgroundColor: '#0F3460', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberType: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#fff', marginBottom: 4 },
  membershipText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#ccc' },
  upgradeButton: { backgroundColor: '#FF6B6B', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  upgradeButtonText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#fff' },
  menuContainer: { marginBottom: 24 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuText: { fontFamily: 'Poppins-Medium', fontSize: 16, color: '#333' },
  countBadge: { backgroundColor: '#0F3460', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  countText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#fff' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, backgroundColor: '#F5F7FA', marginHorizontal: 16, marginBottom: 24 },
  logoutText: { fontFamily: 'Poppins-Medium', fontSize: 16, color: '#FF6B6B', marginLeft: 8 },
  footer: { alignItems: 'center', marginBottom: 24 },
  footerText: { fontFamily: 'Poppins-Regular', fontSize: 12, color: '#999' },
});
