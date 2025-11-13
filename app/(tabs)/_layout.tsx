// File: app/(tabs)/_layout.tsx
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Home, Search, MapPin, MessageSquare, User } from 'lucide-react-native';
import { getLastChatRoute } from '../features/chat/navigationState';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 450 || SCREEN_HEIGHT < 900;

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
  const tabBarStyle = IS_SMALL_SCREEN 
    ? [styles.tabBar, styles.tabBarSmall, getShadow()]
    : [styles.tabBar, getShadow()];
  const router = useRouter();
  const pathname = usePathname();
  const isInChatStack = useMemo(
    () => pathname?.startsWith('/(tabs)/chat') ?? false,
    [pathname]
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F3460',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: tabBarStyle,
        tabBarLabelStyle: styles.label,
        tabBarShowLabel: !IS_SMALL_SCREEN,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ 
          title: IS_SMALL_SCREEN ? '' : 'Home', 
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> 
        }}
      />
      <Tabs.Screen
        name="search"
        options={{ 
          title: IS_SMALL_SCREEN ? '' : 'Search', 
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> 
        }}
      />
      <Tabs.Screen
        name="map"
        options={{ 
          title: IS_SMALL_SCREEN ? '' : 'Map', 
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} /> 
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: IS_SMALL_SCREEN ? '' : 'Chat',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
        listeners={{
          tabPress: e => {
            if (!isInChatStack) {
              e.preventDefault();
              const target = getLastChatRoute() || '/(tabs)/chat';
              if (target !== pathname) {
                router.push(target);
              }
            } else if (pathname !== '/(tabs)/chat') {
              e.preventDefault();
              router.replace('/(tabs)/chat');
            }
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ 
          title: IS_SMALL_SCREEN ? '' : 'Profile', 
          tabBarIcon: ({ color, size }) => <User color={color} size={size} /> 
        }}
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
  tabBarSmall: {
    height: 50,
    paddingTop: 4,
    paddingBottom: 4,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
});
