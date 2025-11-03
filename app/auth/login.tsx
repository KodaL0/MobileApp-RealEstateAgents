import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { NativeLogin } from '../_userbase/NativeLogin';
import { useUser } from '../_userbase/UserContext';

export default function LoginScreen() {
  const router = useRouter();
  const { user } = useUser();

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleLoginSuccess = () => {
    // Navigate to main app after successful login
    router.replace('/(tabs)');
  };

  const handleCancel = () => {
    // Navigate back
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Logo/Brand Section */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🏢</Text>
          <Text style={styles.logoText}>PROPERTPRO</Text>
        </View>
        <Text style={styles.tagline}>Find Your Perfect Property</Text>
      </View>

      {/* Login Form */}
      <NativeLogin
        onSuccess={handleLoginSuccess}
        onCancel={handleCancel}
        initialMode="login"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff', // Light blue gradient equivalent
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoIcon: {
    fontSize: 32,
    marginRight: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af', // Blue-700
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});

