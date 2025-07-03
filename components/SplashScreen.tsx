import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(onFinish);
  }, []);

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
