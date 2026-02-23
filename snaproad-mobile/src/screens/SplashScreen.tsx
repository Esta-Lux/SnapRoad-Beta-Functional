// SnapRoad Mobile - Splash Screen
// Initial loading screen with animated logo

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, FontWeights } from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo animation sequence
    Animated.sequence([
      // Fade in and scale up logo
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Fade in text
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
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
    ).start();

    // Auto-navigate after splash
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, '#0a1929', Colors.background]}
        style={styles.gradient}
      >
        {/* Decorative rings */}
        <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: pulseAnim }] }]} />
        <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: pulseAnim }] }]} />

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <LinearGradient
            colors={Colors.gradientPrimary}
            style={styles.logoBg}
          >
            <Ionicons name="car-sport" size={48} color={Colors.text} />
          </LinearGradient>
        </Animated.View>

        {/* App Name */}
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.title}>SnapRoad</Text>
          <Text style={styles.subtitle}>Drive Safer. Earn Rewards.</Text>
        </Animated.View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <Animated.View style={[styles.loadingFill, { transform: [{ scaleX: pulseAnim }] }]} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  ring1: {
    width: 200,
    height: 200,
  },
  ring2: {
    width: 300,
    height: 300,
  },
  ring3: {
    width: 400,
    height: 400,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBg: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    width: 120,
  },
  loadingBar: {
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    width: '60%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});

export default SplashScreen;
