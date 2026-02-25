// SnapRoad Mobile - Quick Start Guide Modal
// First-time user onboarding walkthrough

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface QuickStartGuideProps {
  visible: boolean;
  onDismiss: () => void;
}

const GUIDE_STEPS = [
  {
    icon: 'diamond' as const,
    iconColor: '#A855F7',
    title: 'Earn Gems',
    subtitle: 'Every Safe Mile Counts',
    description: 'Drive safely and earn gems automatically. Smooth braking, steady speeds, and safe following distances all contribute to your gem earnings.',
    tip: '💡 Premium users earn 2x gems!',
  },
  {
    icon: 'gift' as const,
    iconColor: '#10B981',
    title: 'Redeem Offers',
    subtitle: 'Local Business Rewards',
    description: 'Use your gems at partner businesses near you. Gas stations, coffee shops, restaurants - all with exclusive discounts just for SnapRoad drivers.',
    tip: '💡 Tap offer markers on the map to see deals!',
  },
  {
    icon: 'shield-checkmark' as const,
    iconColor: '#2563EB',
    title: 'Safety Score',
    subtitle: 'Track Your Driving',
    description: 'Your Safety Score reflects your driving habits. Higher scores unlock better rewards, lower insurance rates, and special badges.',
    tip: '💡 Check your score in the Profile tab!',
  },
  {
    icon: 'people' as const,
    iconColor: '#F59E0B',
    title: 'Family & Friends',
    subtitle: 'Stay Connected',
    description: 'Share your location with family, compete on leaderboards with friends, and earn bonus gems through referrals.',
    tip: '💡 Family plan includes location sharing!',
  },
  {
    icon: 'mic' as const,
    iconColor: '#8B5CF6',
    title: 'Meet Orion',
    subtitle: 'Your AI Coach',
    description: 'Orion is your personal driving assistant. Ask questions, get route suggestions, and receive real-time tips to improve your driving.',
    tip: '💡 Tap the mic button to talk to Orion!',
  },
];

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ visible, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('@snaproad_quickstart_complete', 'true');
    } catch (e) {
      console.log('Failed to save quickstart state');
    }
    onDismiss();
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const step = GUIDE_STEPS[currentStep];
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          {/* Skip button */}
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            {GUIDE_STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentStep && styles.dotActive,
                  idx < currentStep && styles.dotComplete,
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${step.iconColor}20` }]}>
              <Ionicons name={step.icon} size={48} color={step.iconColor} />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.subtitle}>{step.subtitle}</Text>

            {/* Description */}
            <Text style={styles.description}>{step.description}</Text>

            {/* Tip */}
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>{step.tip}</Text>
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navContainer}>
            {currentStep > 0 ? (
              <TouchableOpacity style={styles.prevBtn} onPress={handlePrev}>
                <Ionicons name="chevron-back" size={24} color={Colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 50 }} />
            )}

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <LinearGradient
                colors={isLastStep ? ['#10B981', '#059669'] : Colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtnGradient}
              >
                <Text style={styles.nextBtnText}>
                  {isLastStep ? "Let's Go!" : 'Next'}
                </Text>
                {!isLastStep && <Ionicons name="chevron-forward" size={20} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ width: 50 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Helper function to check if quickstart should show
export const shouldShowQuickStart = async (): Promise<boolean> => {
  try {
    const complete = await AsyncStorage.getItem('@snaproad_quickstart_complete');
    return complete !== 'true';
  } catch (e) {
    return true;
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_W - 40,
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  skipBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: Spacing.sm,
    zIndex: 10,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLighter,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  dotComplete: {
    backgroundColor: Colors.success,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  tipContainer: {
    backgroundColor: Colors.backgroundLighter,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  tipText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  prevBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  nextBtnText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
});

export default QuickStartGuide;
