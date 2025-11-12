// File: app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Home, Search, MapPin, MessageSquare, User } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375 || SCREEN_HEIGHT < 667;

const getShadow = () =>
  Platform.select({
    web: { boxShadow: '0 -2px 3px rgba(0,0,0,0.1)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 8,
    },
  });

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F3460',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: [styles.tabBar, getShadow()],
        tabBarLabelStyle: styles.label,
        tabBarShowLabel: !IS_SMALL_SCREEN,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Search', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
});
