import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  navigation: any;
};

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.center}>
        <Image source={require('../../assets/brand-logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Drive smarter.</Text>
        <Text style={styles.subtitle}>Safer trips, rewards, and real-time road awareness.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Auth', { mode: 'signin' })}>
          <Text style={styles.primaryText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Auth', { mode: 'signup' })}>
          <Text style={styles.secondaryText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 90, paddingBottom: 44 },
  center: { alignItems: 'center' },
  logo: { width: 150, height: 150, marginBottom: 20 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.88)', fontSize: 15, textAlign: 'center', marginTop: 12, maxWidth: 300, lineHeight: 22 },
  actions: { gap: 12 },
  primaryBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  secondaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
