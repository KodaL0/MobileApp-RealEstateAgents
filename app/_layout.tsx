import React, { useEffect, useState } from 'react';
import { Stack, SplashScreen as ExpoSplash } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';

import { useFonts, 
         Poppins_400Regular, 
         Poppins_500Medium, 
         Poppins_600SemiBold, 
         Poppins_700Bold 
       } from '@expo-google-fonts/poppins';

import { UserProvider } from './_userbase/UserContext';
import { ChatProvider } from './features/chat/context/ChatContext';
import SplashScreen from '../components/SplashScreen';

ExpoSplash.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium':  Poppins_500Medium,
    'Poppins-SemiBold':Poppins_600SemiBold,
    'Poppins-Bold':    Poppins_700Bold,
  });

  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      ExpoSplash.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // wait until fonts load
  }

  if (showCustomSplash) {
    return <SplashScreen onFinish={() => setShowCustomSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <UserProvider>
          <ChatProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
            </Stack>
          </ChatProvider>
        </UserProvider>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
