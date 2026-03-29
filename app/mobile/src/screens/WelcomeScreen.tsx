import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  navigation: any;
};

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.center}>
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Image source={require('../../assets/brand-logo.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.duration(500).delay(250)} style={styles.title}>
          Drive smarter.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.duration(500).delay(400)} style={styles.subtitle}>
          Safer trips, rewards, and real-time road awareness.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Auth', { mode: 'signin' }); }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Auth', { mode: 'signup' }); }}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryText}>Create Account</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },
  center: { alignItems: 'center' },
  logo: { width: 150, height: 150, marginBottom: 20 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.88)', fontSize: 15, textAlign: 'center', marginTop: 12, maxWidth: 300, lineHeight: 22 },
  actions: { gap: 12 },
  primaryBtn: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  secondaryBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  secondaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
