// SnapRoad Mobile - Pricing/Subscription Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';
import { useUserStore } from '../store';

interface Props {
  navigation?: any;
}

const PLANS = [
  {
    id: 'free',
    name: 'Basic',
    price: 0,
    period: 'Forever free',
    features: [
      { text: 'Standard navigation', included: true },
      { text: 'Basic rewards (1x gems)', included: true },
      { text: 'Safety score tracking', included: true },
      { text: 'Community incident reports', included: true },
      { text: 'Premium offers', included: false },
      { text: '2x gem multiplier', included: false },
      { text: 'Family location sharing', included: false },
      { text: 'Fuel price tracking', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 4.99,
    period: '/month',
    popular: true,
    features: [
      { text: 'All Basic features', included: true },
      { text: '2x gem multiplier', included: true },
      { text: 'Premium exclusive offers', included: true },
      { text: 'Advanced driving analytics', included: true },
      { text: 'Fuel price tracking', included: true },
      { text: 'Ad-free experience', included: true },
      { text: 'Priority support', included: true },
      { text: 'Family location sharing', included: false },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    price: 14.99,
    period: '/month',
    features: [
      { text: 'All Premium features', included: true },
      { text: 'Up to 6 family members', included: true },
      { text: 'Real-time location sharing', included: true },
      { text: 'Teen driver monitoring', included: true },
      { text: 'Family leaderboard', included: true },
      { text: 'Arrival notifications', included: true },
      { text: 'Emergency SOS alerts', included: true },
      { text: 'Shared family rewards', included: true },
    ],
  },
];

export const PricingScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, selectPlan } = useUserStore();
  const [selectedPlan, setSelectedPlan] = useState(user?.plan || 'free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = () => {
    selectPlan(selectedPlan as 'basic' | 'premium');
    navigation?.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingText, billingCycle === 'monthly' && styles.billingTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text style={[styles.billingText, billingCycle === 'yearly' && styles.billingTextActive]}>
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>Save 20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        {PLANS.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan === plan.id && styles.planCardSelected,
              plan.popular && styles.planCardPopular,
            ]}
            onPress={() => handleSelectPlan(plan.id)}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Ionicons name="star" size={12} color="#78350F" />
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  {plan.price > 0 && <Text style={styles.currency}>$</Text>}
                  <Text style={styles.price}>
                    {plan.price === 0 ? 'Free' : (billingCycle === 'yearly' ? (plan.price * 0.8 * 12).toFixed(0) : plan.price.toFixed(2))}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={styles.period}>{billingCycle === 'yearly' ? '/year' : plan.period}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.radioOuter, selectedPlan === plan.id && styles.radioOuterSelected]}>
                {selectedPlan === plan.id && <View style={styles.radioInner} />}
              </View>
            </View>

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons
                    name={feature.included ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={feature.included ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.featureText, !feature.included && styles.featureTextDisabled]}>
                    {feature.text}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Subscribe Button */}
        <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeBtnGradient}
          >
            <Text style={styles.subscribeBtnText}>
              {selectedPlan === 'free' ? 'Continue with Basic' : `Subscribe to ${PLANS.find(p => p.id === selectedPlan)?.name}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Cancel anytime. Subscriptions auto-renew until cancelled.
          By subscribing, you agree to our Terms of Service.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: Colors.primary,
  },
  billingText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textMuted,
  },
  billingTextActive: {
    color: '#fff',
  },
  saveBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  saveText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planCardPopular: {
    borderColor: Colors.warning,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  popularText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
    color: '#78350F',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.primary,
  },
  price: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
  },
  period: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textMuted,
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
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  featureTextDisabled: {
    color: Colors.textMuted,
  },
  subscribeBtn: {
    marginTop: Spacing.md,
  },
  subscribeBtnGradient: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  subscribeBtnText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  disclaimer: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});

export default PricingScreen;
