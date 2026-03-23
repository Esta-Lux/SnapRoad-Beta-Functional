// SnapRoad Mobile - Payment Screen
// Stripe checkout integration for subscription upgrades

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';
import { useUserStore } from '../store';

import { API_URL } from '../config';

interface Plan {
  name: string;
  price: number;
  period: string;
  features: string[];
}

interface PaymentScreenProps {
  navigation?: any;
  route?: any;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useUserStore();
  
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [selectedPlan, setSelectedPlan] = useState<string>(route?.params?.planId || 'premium');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    fetchPlans();
    
    // Check if returning from Stripe payment
    const sessionId = route?.params?.session_id;
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [route?.params?.session_id]);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payments/plans`);
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch plans:', e);
    }
    setLoading(false);
  };

  const checkPaymentStatus = async (sessionId: string) => {
    setCheckingStatus(true);
    
    // Poll for status
    let attempts = 0;
    const maxAttempts = 5;
    
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/checkout/status/${sessionId}`);
        const data = await res.json();
        
        if (data.success && data.data.payment_status === 'paid') {
          // Payment successful!
          const planId = data.data.metadata?.plan_id;
          if (planId) {
            updateUser({ 
              isPremium: planId !== 'basic',
              plan: planId,
            });
          }
          
          Alert.alert(
            'Payment Successful! 🎉',
            `You're now on the ${data.data.metadata?.plan_name || 'Premium'} plan. Enjoy your upgraded features!`,
            [{ text: 'Awesome!', onPress: () => navigation?.goBack() }]
          );
          setCheckingStatus(false);
          return;
        }
        
        if (data.data.status === 'expired') {
          Alert.alert('Payment Expired', 'Your payment session expired. Please try again.');
          setCheckingStatus(false);
          return;
        }
        
        // Keep polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setCheckingStatus(false);
        }
      } catch (e) {
        setCheckingStatus(false);
      }
    };
    
    poll();
  };

  const handleSubscribe = async () => {
    if (selectedPlan === 'basic') {
      // Basic is free
      updateUser({ isPremium: false, plan: 'basic' });
      Alert.alert('Plan Updated', 'You are now on the Basic plan.');
      navigation?.goBack();
      return;
    }
    
    setProcessing(true);
    
    try {
      // Get current origin URL for redirects
      const originUrl = Platform.OS === 'web' 
        ? window.location.origin 
        : API_URL; // For native, we'll handle differently
      
      const res = await fetch(`${API_URL}/api/payments/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan,
          origin_url: originUrl,
          user_id: user?.id || 'anonymous',
          user_email: user?.email || '',
        }),
      });
      
      const data = await res.json();
      
      if (data.url) {
        // Open Stripe checkout
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          // For native, open in browser
          const supported = await Linking.canOpenURL(data.url);
          if (supported) {
            await Linking.openURL(data.url);
          } else {
            Alert.alert('Error', 'Unable to open payment page');
          }
        }
      } else {
        Alert.alert('Error', 'Failed to create checkout session');
      }
    } catch (e) {
      Alert.alert('Error', 'Payment initialization failed. Please try again.');
    }
    
    setProcessing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (checkingStatus) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.success} />
        <Text style={styles.loadingText}>Verifying your payment...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade Your Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Plan Badge */}
        {user?.plan && (
          <View style={styles.currentPlanBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.currentPlanText}>
              Current: {plans[user.plan]?.name || 'Basic'}
            </Text>
          </View>
        )}

        {/* Plan Cards */}
        {Object.entries(plans).map(([planId, plan]) => (
          <TouchableOpacity
            key={planId}
            style={[
              styles.planCard,
              selectedPlan === planId && styles.planCardSelected,
              planId === 'premium' && styles.planCardPopular,
            ]}
            onPress={() => setSelectedPlan(planId)}
            disabled={processing}
          >
            {planId === 'premium' && (
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
                    {plan.price === 0 ? 'Free' : plan.price.toFixed(2)}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={styles.period}>/{plan.period}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.radio, selectedPlan === planId && styles.radioSelected]}>
                {selectedPlan === planId && <View style={styles.radioInner} />}
              </View>
            </View>

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Subscribe Button */}
        <TouchableOpacity 
          style={styles.subscribeBtn} 
          onPress={handleSubscribe}
          disabled={processing}
        >
          <LinearGradient
            colors={selectedPlan === 'basic' ? ['#6B7280', '#4B5563'] : Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeBtnGradient}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeBtnText}>
                {selectedPlan === 'basic' 
                  ? 'Continue with Basic' 
                  : `Subscribe to ${plans[selectedPlan]?.name}`}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Security note */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
          <Text style={styles.securityText}>
            Secure payment powered by Stripe. Cancel anytime.
          </Text>
        </View>

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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
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
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  currentPlanText: {
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: FontWeights.medium,
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
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  securityText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
});

export default PaymentScreen;
