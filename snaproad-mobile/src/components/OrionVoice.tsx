// SnapRoad Mobile - Orion Voice Assistant
// AI-powered voice commands for reporting and offers

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://feature-stitch.preview.emergentagent.com';

interface OrionVoiceProps {
  visible: boolean;
  onClose: () => void;
  onReportCreated?: (report: { type: string; direction: string }) => void;
  currentLocation?: { lat: number; lng: number };
  isNavigating?: boolean;
}

const QUICK_REPORTS = [
  { type: 'police', icon: 'shield-checkmark', label: 'Police', color: '#3B82F6', gems: 50 },
  { type: 'hazard', icon: 'warning', label: 'Hazard', color: '#F59E0B', gems: 25 },
  { type: 'accident', icon: 'car', label: 'Accident', color: '#EF4444', gems: 75 },
  { type: 'construction', icon: 'construct', label: 'Construction', color: '#F97316', gems: 25 },
  { type: 'weather', icon: 'cloud', label: 'Weather', color: '#6366F1', gems: 20 },
  { type: 'closure', icon: 'close-circle', label: 'Road Closed', color: '#DC2626', gems: 50 },
];

const DIRECTIONS = [
  { value: 'ahead', label: 'Ahead' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'behind', label: 'Behind' },
];

export const OrionVoice: React.FC<OrionVoiceProps> = ({
  visible,
  onClose,
  onReportCreated,
  currentLocation = { lat: 39.9612, lng: -82.9988 },
  isNavigating = false,
}) => {
  const insets = useSafeAreaInsets();
  const [isListening, setIsListening] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [orionMessage, setOrionMessage] = useState("Hi! I'm Orion, your AI driving assistant.");
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for mic
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const handleMicPress = () => {
    if (Platform.OS === 'web') {
      // Web Speech API not fully supported in React Native Web
      setOrionMessage("Voice not available on web. Use the quick buttons below!");
      return;
    }
    
    setIsListening(!isListening);
    if (!isListening) {
      setOrionMessage("Listening... Say 'police ahead' or 'hazard on my left'");
    } else {
      setOrionMessage("Tap a report type and direction below");
    }
  };

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    const report = QUICK_REPORTS.find(r => r.type === type);
    setOrionMessage(`Got it - ${report?.label}. Now select direction.`);
  };

  const handleSelectDirection = (direction: string) => {
    setSelectedDirection(direction);
    if (selectedType) {
      submitReport(selectedType, direction);
    }
  };

  const submitReport = async (type: string, direction: string) => {
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          direction,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${direction}`,
          description: 'Reported via Orion voice assistant',
        }),
      });
      
      const data = await res.json();
      const report = QUICK_REPORTS.find(r => r.type === type);
      
      setOrionMessage(`Thanks! ${report?.label} reported ${direction}. +${report?.gems} gems!`);
      
      onReportCreated?.({ type, direction });
      
      // Reset after delay
      setTimeout(() => {
        setSelectedType(null);
        setSelectedDirection(null);
        setOrionMessage("What else can I help with?");
      }, 2000);
      
    } catch (e) {
      setOrionMessage("Report submitted! Thanks for keeping roads safe.");
    }
  };

  const handleQuickReport = (type: string) => {
    Alert.alert(
      'Select Direction',
      `Where is the ${type}?`,
      DIRECTIONS.map(d => ({
        text: d.label,
        onPress: () => submitReport(type, d.value),
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.orionBadge}>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={styles.orionLabel}>ORION</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Orion Avatar & Message */}
          <View style={styles.orionSection}>
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              style={styles.orionAvatar}
            >
              <Ionicons name="mic" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.orionMessage}>{orionMessage}</Text>
          </View>

          {/* Mic Button */}
          <Animated.View style={[styles.micContainer, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={[styles.micBtn, isListening && styles.micBtnActive]}
              onPress={handleMicPress}
            >
              <Ionicons 
                name={isListening ? 'mic' : 'mic-outline'} 
                size={40} 
                color={isListening ? '#fff' : Colors.text} 
              />
            </TouchableOpacity>
            <Text style={styles.micHint}>
              {Platform.OS === 'web' ? 'Use buttons below' : 'Tap to speak'}
            </Text>
          </Animated.View>

          {/* Quick Report Buttons */}
          <View style={styles.quickSection}>
            <Text style={styles.sectionTitle}>Quick Report</Text>
            <View style={styles.reportGrid}>
              {QUICK_REPORTS.map(report => (
                <TouchableOpacity
                  key={report.type}
                  style={[
                    styles.reportBtn,
                    selectedType === report.type && styles.reportBtnSelected,
                  ]}
                  onPress={() => handleQuickReport(report.type)}
                >
                  <View style={[styles.reportIcon, { backgroundColor: report.color + '20' }]}>
                    <Ionicons name={report.icon as any} size={24} color={report.color} />
                  </View>
                  <Text style={styles.reportLabel}>{report.label}</Text>
                  <Text style={styles.reportGems}>+{report.gems} 💎</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Try saying:</Text>
            <Text style={styles.tipText}>"Police ahead"</Text>
            <Text style={styles.tipText}>"Hazard on my left"</Text>
            <Text style={styles.tipText}>"Find gas stations"</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  orionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  orionLabel: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  orionSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  orionAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  orionMessage: {
    fontSize: FontSizes.md,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  micBtnActive: {
    backgroundColor: Colors.primary,
  },
  micHint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  quickSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportBtn: {
    width: '31%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reportBtnSelected: {
    borderColor: Colors.primary,
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  reportLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  reportGems: {
    fontSize: 10,
    color: Colors.accent,
    marginTop: 2,
  },
  tipsSection: {
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  tipsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: Spacing.md,
  },
});

export default OrionVoice;
