import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    // Start animations sequence
    const animationSequence = Animated.sequence([
      // Initial fade in and scale
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      
      // Logo subtle rotation
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    // Pulse animation (continuous)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer effect
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: width,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Start all animations
    animationSequence.start();
    pulseAnimation.start();
    shimmerAnimation.start();

    // Finish after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [fadeAnim, scaleAnim, logoRotateAnim, pulseAnim, shimmerAnim, onFinish]);

  const logoRotate = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#0F3460', '#1a4a7a', '#2563eb']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Animated background circles */}
      <View style={styles.backgroundElements}>
        <Animated.View 
          style={[
            styles.circle,
            styles.circle1,
            { 
              transform: [
                { scale: pulseAnim },
                { rotate: logoRotate }
              ] 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.circle,
            styles.circle2,
            { 
              transform: [
                { scale: pulseAnim },
                { rotate: logoRotate }
              ] 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.circle,
            styles.circle3,
            { 
              transform: [
                { scale: pulseAnim }
              ] 
            }
          ]} 
        />
      </View>

      {/* Main logo container */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: logoRotate }
            ]
          }
        ]}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/images/propertprologo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerAnim }]
              }
            ]}
          />
        </View>
        
        {/* Glow effect */}
        <View style={styles.glowEffect} />
      </Animated.View>

      {/* Floating particles */}
      <View style={styles.particles}>
        {[...Array(6)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${15 + index * 12}%`,
                top: `${20 + (index % 3) * 20}%`,
                transform: [
                  { 
                    translateY: Animated.multiply(
                      pulseAnim,
                      index % 2 === 0 ? -10 : 10
                    )
                  }
                ]
              }
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.08,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: '#ffffff',
    top: '10%',
    left: '60%',
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
    bottom: '20%',
    left: '10%',
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: '#ffffff',
    top: '60%',
    right: '15%',
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  logo: {
    width: 100,
    height: 100,
    zIndex: 2,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    transform: [{ skewX: '-20deg' }],
  },
  glowEffect: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 30,
  },
  particles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
});