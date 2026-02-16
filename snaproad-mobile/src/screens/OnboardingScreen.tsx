// SnapRoad Mobile - Onboarding Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore, useAppStore } from '../store';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, CarCategories, CarColors, PlanFeatures } from '../utils/theme';

const { width, height } = Dimensions.get('window');

type Step = 'welcome' | 'plan' | 'car-type' | 'car-color' | 'complete';

export const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectPlan, selectCar, completeOnboarding, user } = useUserStore();
  const { setShowOnboarding } = useAppStore();
  
  const [step, setStep] = useState<Step>('welcome');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic');
  const [selectedCarType, setSelectedCarType] = useState('sedan');
  const [selectedColor, setSelectedColor] = useState('ocean-blue');

  const handleContinue = () => {
    switch (step) {
      case 'welcome':
        setStep('plan');
        break;
      case 'plan':
        selectPlan(selectedPlan);
        setStep('car-type');
        break;
      case 'car-type':
        setStep('car-color');
        break;
      case 'car-color':
        selectCar(selectedCarType, `${selectedCarType}-classic`, selectedColor);
        setStep('complete');
        break;
      case 'complete':
        completeOnboarding();
        setShowOnboarding(false);
        navigation.replace('MainApp');
        break;
    }
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeIcon}>
        <LinearGradient colors={Colors.gradientPrimary} style={styles.iconGradient}>
          <Ionicons name="car-sport" size={64} color={Colors.text} />
        </LinearGradient>
      </View>
      <Text style={styles.title}>Welcome to SnapRoad</Text>
      <Text style={styles.subtitle}>
        The privacy-first navigation app that rewards safe driving
      </Text>
      <View style={styles.features}>
        {[
          { icon: 'shield-checkmark', text: 'Track your safety score' },
          { icon: 'diamond', text: 'Earn gems & rewards' },
          { icon: 'location', text: 'Discover nearby offers' },
          { icon: 'trophy', text: 'Compete with friends' },
        ].map((feature, idx) => (
          <View key={idx} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon as any} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPlanSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Your Plan</Text>
      <Text style={styles.stepSubtitle}>Select the plan that works best for you</Text>

      <View style={styles.plansContainer}>
        {/* Basic Plan */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === 'basic' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('basic')}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Basic</Text>
            <Text style={styles.planPrice}>Free</Text>
          </View>
          <View style={styles.planFeatures}>
            {PlanFeatures.basic.features.map((feature, idx) => (
              <View key={idx} style={styles.planFeatureItem}>
                <Ionicons name="checkmark" size={16} color={Colors.success} />
                <Text style={styles.planFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
          {selectedPlan === 'basic' && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
            </View>
          )}
        </TouchableOpacity>

        {/* Premium Plan */}
        <TouchableOpacity
          style={[styles.planCard, styles.planCardPremium, selectedPlan === 'premium' && styles.planCardSelected]}
          onPress={() => setSelectedPlan('premium')}
        >
          <LinearGradient
            colors={Colors.gradientGold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumBanner}
          >
            <Ionicons name="star" size={14} color={Colors.background} />
            <Text style={styles.premiumBannerText}>RECOMMENDED</Text>
          </LinearGradient>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Premium</Text>
            <Text style={styles.planPrice}>${PlanFeatures.premium.price}/mo</Text>
          </View>
          <View style={styles.planFeatures}>
            {PlanFeatures.premium.features.map((feature, idx) => (
              <View key={idx} style={styles.planFeatureItem}>
                <Ionicons name="checkmark" size={16} color={Colors.gold} />
                <Text style={styles.planFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
          {selectedPlan === 'premium' && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.gold} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCarTypeSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Your Vehicle</Text>
      <Text style={styles.stepSubtitle}>Select your vehicle type</Text>

      <View style={styles.carTypesContainer}>
        {CarCategories.map((car) => (
          <TouchableOpacity
            key={car.id}
            style={[styles.carTypeCard, selectedCarType === car.id && styles.carTypeCardSelected]}
            onPress={() => setSelectedCarType(car.id)}
          >
            <Ionicons name={car.icon as any} size={40} color={selectedCarType === car.id ? Colors.primary : Colors.textSecondary} />
            <Text style={styles.carTypeName}>{car.name}</Text>
            {selectedCarType === car.id && (
              <View style={styles.carTypeCheck}>
                <Ionicons name="checkmark" size={16} color={Colors.text} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Car Preview */}
      <View style={styles.carPreview}>
        <Ionicons name="car-sport" size={100} color={Colors.primary} />
        <Text style={styles.carPreviewText}>
          {CarCategories.find((c) => c.id === selectedCarType)?.name || 'Sedan'}
        </Text>
      </View>
    </View>
  );

  const renderCarColorSelection = () => (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Choose Your Color</Text>
        <Text style={styles.stepSubtitle}>Pick a color for your ride</Text>

        {/* Standard Colors */}
        <Text style={styles.colorSectionTitle}>Standard</Text>
        <View style={styles.colorsGrid}>
          {CarColors.filter((c) => c.tier === 'standard').map((color) => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorOption,
                { backgroundColor: color.hex },
                selectedColor === color.id && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColor(color.id)}
            >
              {selectedColor === color.id && (
                <Ionicons name="checkmark" size={24} color={color.hex === '#f8fafc' ? '#000' : '#fff'} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Metallic Colors */}
        <Text style={styles.colorSectionTitle}>Metallic</Text>
        <View style={styles.colorsGrid}>
          {CarColors.filter((c) => c.tier === 'metallic').map((color) => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorOption,
                { backgroundColor: color.hex },
                selectedColor === color.id && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColor(color.id)}
            >
              {selectedColor === color.id && (
                <Ionicons name="checkmark" size={24} color="#fff" />
              )}
              <View style={styles.colorGemBadge}>
                <Ionicons name="diamond" size={10} color={Colors.gem} />
                <Text style={styles.colorGemText}>{color.gems}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Premium Colors */}
        <Text style={styles.colorSectionTitle}>Premium</Text>
        <View style={styles.colorsGrid}>
          {CarColors.filter((c) => c.tier === 'premium').map((color) => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorOption,
                { backgroundColor: color.hex },
                selectedColor === color.id && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColor(color.id)}
            >
              {selectedColor === color.id && (
                <Ionicons name="checkmark" size={24} color="#fff" />
              )}
              <View style={styles.colorGemBadge}>
                <Ionicons name="diamond" size={10} color={Colors.gem} />
                <Text style={styles.colorGemText}>{color.gems}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Color Preview */}
        <View style={styles.selectedColorPreview}>
          <View style={[styles.previewCar, { backgroundColor: CarColors.find((c) => c.id === selectedColor)?.hex }]}>
            <Ionicons name="car-sport" size={48} color={selectedColor === 'arctic-white' ? '#000' : '#fff'} />
          </View>
          <Text style={styles.previewText}>
            {CarColors.find((c) => c.id === selectedColor)?.name || 'Ocean Blue'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <View style={styles.completeIcon}>
        <LinearGradient colors={Colors.gradientPrimary} style={styles.iconGradient}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.text} />
        </LinearGradient>
      </View>
      <Text style={styles.title}>You're All Set!</Text>
      <Text style={styles.subtitle}>
        Start driving to earn gems, track your safety score, and discover amazing offers nearby.
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Plan</Text>
          <Text style={styles.summaryValue}>
            {selectedPlan === 'premium' ? '⭐ Premium' : 'Basic'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Vehicle</Text>
          <Text style={styles.summaryValue}>
            {CarCategories.find((c) => c.id === selectedCarType)?.name}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Color</Text>
          <View style={styles.summaryColorRow}>
            <View style={[styles.summaryColorDot, { backgroundColor: CarColors.find((c) => c.id === selectedColor)?.hex }]} />
            <Text style={styles.summaryValue}>
              {CarColors.find((c) => c.id === selectedColor)?.name}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={Colors.gradientDark} style={styles.background}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {['welcome', 'plan', 'car-type', 'car-color', 'complete'].map((s, idx) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                (idx <= ['welcome', 'plan', 'car-type', 'car-color', 'complete'].indexOf(step)) && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        {step === 'welcome' && renderWelcome()}
        {step === 'plan' && renderPlanSelection()}
        {step === 'car-type' && renderCarTypeSelection()}
        {step === 'car-color' && renderCarColorSelection()}
        {step === 'complete' && renderComplete()}

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.continueGradient}>
              <Text style={styles.continueText}>
                {step === 'complete' ? 'Start Driving' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.text} />
            </LinearGradient>
          </TouchableOpacity>
          {step !== 'welcome' && step !== 'complete' && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                completeOnboarding();
                setShowOnboarding(false);
                navigation.replace('MainApp');
              }}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    paddingTop: 60,
  },
  scrollContainer: {
    flex: 1,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },

  // Step Container
  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },

  // Welcome
  welcomeIcon: {
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  features: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },

  // Step Title
  stepTitle: {
    color: Colors.text,
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  // Plans
  plansContainer: {
    gap: Spacing.md,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planCardPremium: {
    overflow: 'hidden',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginTop: -Spacing.lg,
    marginHorizontal: -Spacing.lg,
    marginBottom: Spacing.md,
    gap: 6,
  },
  premiumBannerText: {
    color: Colors.background,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planName: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  planPrice: {
    color: Colors.primary,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  planFeatures: {
    gap: 8,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },

  // Car Types
  carTypesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  carTypeCard: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3,
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  carTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  carTypeEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  carTypeName: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  carTypeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carPreview: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  carPreviewText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    marginTop: Spacing.md,
  },

  // Colors
  colorSectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  colorOptionSelected: {
    borderColor: Colors.primary,
  },
  colorGemBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  colorGemText: {
    color: Colors.gem,
    fontSize: 8,
    fontWeight: FontWeights.bold,
  },
  selectedColorPreview: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  previewCar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.md,
  },

  // Complete
  completeIcon: {
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  summaryValue: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  summaryColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  // Footer
  footer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  continueButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 8,
  },
  continueText: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
});
