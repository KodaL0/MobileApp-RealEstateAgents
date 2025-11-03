import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { NativeLogin } from '../_userbase/NativeLogin';
import { useUser } from '../_userbase/UserContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { user } = useUser();

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleRegisterSuccess = () => {
    // After registration, user will need to verify email
    // Stay on this screen to show the success message
    // The component itself handles the success message
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
        <Text style={styles.tagline}>Join Our Community</Text>
      </View>

      {/* Registration Form */}
      <NativeLogin
        onSuccess={handleRegisterSuccess}
        onCancel={handleCancel}
        initialMode="register"
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

