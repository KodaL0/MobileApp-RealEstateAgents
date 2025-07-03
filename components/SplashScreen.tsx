import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  useEffect(() => {
    let afterFinishTimeout: number | null = null;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 16, useNativeDriver: true }), // 1 frame
      Animated.delay(84), // 5 frames (total ~100ms)
      Animated.timing(fadeAnim, { toValue: 0, duration: 16, useNativeDriver: true }), // 1 frame
    ]).start(() => {
      if (!finished.current) {
        finished.current = true;
        // Wait 2 frames (~33ms) after animation before calling onFinish
        afterFinishTimeout = setTimeout(onFinish, 33);
      }
    });
    // In case parent calls onFinish early (e.g., fonts loaded), exit immediately
    return () => {
      if (!finished.current) {
        finished.current = true;
        if (afterFinishTimeout) clearTimeout(afterFinishTimeout);
        // Wait 2 frames after onFinish
        setTimeout(onFinish, 33);
      }
    };
  }, [fadeAnim, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/images/propertprologo.png')}
        style={[styles.logo, { opacity: fadeAnim }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F3460', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 200, height: 200 },
});

export default SplashScreen;
