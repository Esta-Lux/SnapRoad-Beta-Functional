// SnapRoad Mobile - Plan Selection Screen
// Choose between Basic (free) and Premium subscription

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Button } from '../components/ui';
import { useUserStore } from '../store';

const { width } = Dimensions.get('window');

interface PlanSelectionScreenProps {
  navigation: any;
}

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    period: '/mo',
    description: 'Privacy-first navigation for everyday driving.',
    features: [
      { icon: 'navigate', text: 'Manual rerouting', included: true },
      { icon: 'eye-off', text: 'Privacy-first navigation', included: true },
      { icon: 'camera', text: 'Auto-blur photos', included: true },
      { icon: 'location', text: 'Local offers', included: true },
      { icon: 'diamond', text: 'Earn Gems (1x)', included: true },
    ],
    gradient: [Colors.surfaceLight, Colors.surface],
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 10.99,
    originalPrice: 16.99,
    discount: '35% OFF',
    period: '/mo',
    description: 'Auto-routing, insights, and faster rewards.',
    badge: 'MOST POPULAR',
    foundersPricing: true,
    features: [
      { icon: 'checkmark', text: 'Everything in Basic', included: true },
      { icon: 'git-branch', text: 'Automatic rerouting', included: true },
      { icon: 'globe', text: 'Advanced local offers', included: true },
      { icon: 'diamond', text: 'Gem multiplier (2x)', included: true },
      { icon: 'analytics', text: 'Smart commute analytics', included: true },
      { icon: 'headset', text: 'Priority support', included: true },
    ],
    gradient: Colors.gradientPrimary,
    popular: true,
  },
];

export const PlanSelectionScreen: React.FC<PlanSelectionScreenProps> = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const { selectPlan } = useUserStore();

  const handleContinue = () => {
    selectPlan(selectedPlan as 'basic' | 'premium');
    navigation.replace('CarSetup');
  };

  const renderPlanCard = (plan: typeof plans[0]) => {
    const isSelected = selectedPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[styles.planCard, isSelected && styles.planCardSelected]}
        onPress={() => setSelectedPlan(plan.id)}
        activeOpacity={0.8}
      >
        {plan.badge && (
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>{plan.badge}</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.planPrice}>${plan.price.toFixed(2)}</Text>
              <Text style={styles.planPeriod}>{plan.period}</Text>
              {plan.originalPrice && (
                <Text style={styles.originalPrice}>${plan.originalPrice.toFixed(2)}/mo</Text>
              )}
              {plan.discount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{plan.discount}</Text>
                </View>
              )}
            </View>
            {plan.foundersPricing && (
              <View style={styles.foundersRow}>
                <Ionicons name="star" size={12} color={Colors.gold} />
                <Text style={styles.foundersText}>Founders pricing</Text>
              </View>
            )}
          </View>
          
          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>

        <Text style={styles.planDescription}>{plan.description}</Text>

        {plan.foundersPricing && (
          <TouchableOpacity style={styles.lockInButton}>
            <Ionicons name="rocket" size={14} color={Colors.primary} />
            <Text style={styles.lockInText}>Lock in ${plan.price.toFixed(2)}/month for life!</Text>
          </TouchableOpacity>
        )}

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons
                name={feature.icon as any}
                size={18}
                color={feature.included ? Colors.primary : Colors.textMuted}
              />
              <Text style={[
                styles.featureText,
                !feature.included && styles.featureTextDisabled
              ]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, '#0a1929']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="flash" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.headerLabel}>CHOOSE YOUR PLAN</Text>
            <Text style={styles.title}>Start Your Journey</Text>
            <Text style={styles.subtitle}>
              Drive safer. Earn rewards. Privacy guaranteed.
            </Text>
          </View>

          {/* Plan Cards */}
          <View style={styles.plansContainer}>
            {plans.map(renderPlanCard)}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.bottomSection}>
          <Button
            title="Continue"
            onPress={handleContinue}
            icon="arrow-forward"
            size="lg"
          />
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
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headerLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  plansContainer: {
    gap: Spacing.md,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  badgeContainer: {
    position: 'absolute',
    top: -12,
    right: Spacing.lg,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  planName: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  planPrice: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: FontWeights.bold,
  },
  planPeriod: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  originalPrice: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  discountBadge: {
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: 8,
  },
  discountText: {
    color: Colors.success,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  foundersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  foundersText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },
  lockInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginBottom: Spacing.md,
  },
  lockInText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  featuresContainer: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  featureTextDisabled: {
    color: Colors.textMuted,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
});

export default PlanSelectionScreen;
