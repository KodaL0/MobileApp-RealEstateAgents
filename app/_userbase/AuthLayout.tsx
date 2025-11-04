import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

/**
 * Shared layout component for authentication screens (login/register)
 * Provides consistent styling and structure
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <View style={styles.container}>
      {/* Logo/Brand Section */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🏢</Text>
          <Text style={styles.logoText}>PROPERTPRO</Text>
        </View>
        {subtitle && <Text style={styles.tagline}>{subtitle}</Text>}
      </View>

      {/* Form Content */}
      {children}
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

