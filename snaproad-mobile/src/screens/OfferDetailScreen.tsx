// SnapRoad Mobile - Offer Detail Screen
// Individual offer with redemption flow

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Button, Badge, Card, GemDisplay } from '../components/ui';
import { useUserStore, useOffersStore } from '../store';
import { Offer } from '../types';

interface OfferDetailScreenProps {
  navigation: any;
  route: {
    params: {
      offer: Offer;
    };
  };
}

export const OfferDetailScreen: React.FC<OfferDetailScreenProps> = ({ navigation, route }) => {
  const { offer } = route.params;
  const { user, spendGems, addGems } = useUserStore();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null);

  const gemsCost = user.isPremium ? offer.premiumGems : offer.baseGems;
  const canRedeem = user.gems >= gemsCost;

  const getOfferIcon = (type: string) => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      gas: 'car',
      cafe: 'cafe',
      restaurant: 'restaurant',
      carwash: 'water',
      retail: 'bag',
    };
    return icons[type] || 'location';
  };

  const getOfferColor = (type: string) => {
    const colors: Record<string, string> = {
      gas: Colors.gas,
      cafe: Colors.cafe,
      restaurant: Colors.restaurant,
      carwash: Colors.carwash,
      retail: Colors.retail,
    };
    return colors[type] || Colors.primary;
  };

  const handleRedeem = () => {
    if (!canRedeem) {
      Alert.alert(
        'Not Enough Gems',
        `You need ${gemsCost - user.gems} more gems to redeem this offer.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Redeem Offer',
      `Spend ${gemsCost} gems to get ${offer.discountPercent}% off at ${offer.businessName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: () => {
            setIsRedeeming(true);
            // Simulate API call
            setTimeout(() => {
              spendGems(gemsCost);
              setRedemptionCode(`SR${Date.now().toString(36).toUpperCase()}`);
              setRedeemed(true);
              setIsRedeeming(false);
            }, 1500);
          },
        },
      ]
    );
  };

  if (redeemed && redemptionCode) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.background, '#0a1929']} style={styles.gradient}>
          {/* Success Header */}
          <View style={styles.successHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.successContent}>
            <LinearGradient colors={Colors.gradientSuccess} style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={Colors.text} />
            </LinearGradient>

            <Text style={styles.successTitle}>Offer Redeemed!</Text>
            <Text style={styles.successDescription}>
              Show this code to the cashier at {offer.businessName}
            </Text>

            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Your Redemption Code</Text>
              <Text style={styles.codeValue}>{redemptionCode}</Text>
              <View style={styles.codeTimer}>
                <Ionicons name="time" size={16} color={Colors.warning} />
                <Text style={styles.codeTimerText}>Expires in 2 minutes</Text>
              </View>
            </View>

            <View style={styles.discountDisplay}>
              <Text style={styles.discountLabel}>Your Discount</Text>
              <Text style={styles.discountValue}>{offer.discountPercent}% OFF</Text>
            </View>

            <Button
              title="Navigate to Store"
              onPress={() => navigation.goBack()}
              icon="navigate"
              size="lg"
            />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, '#0a1929']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <GemDisplay amount={user.gems} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Business Info */}
          <View style={styles.businessHeader}>
            <View style={[styles.businessIcon, { backgroundColor: `${getOfferColor(offer.businessType)}20` }]}>
              <Ionicons name={getOfferIcon(offer.businessType)} size={40} color={getOfferColor(offer.businessType)} />
            </View>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{offer.discountPercent}% OFF</Text>
            </View>
          </View>

          <Text style={styles.businessName}>{offer.businessName}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{offer.distance} away</Text>
          </View>

          <Text style={styles.offerDescription}>{offer.description}</Text>

          {/* Gems Cost Card */}
          <Card style={styles.gemsCard}>
            <View style={styles.gemsCardHeader}>
              <Text style={styles.gemsCardTitle}>Redemption Cost</Text>
              {user.isPremium && (
                <Badge label="2x Premium" variant="premium" />
              )}
            </View>
            
            <View style={styles.gemsRow}>
              <Ionicons name="diamond" size={32} color={Colors.gem} />
              <Text style={styles.gemsCost}>{gemsCost}</Text>
              <Text style={styles.gemsLabel}>gems</Text>
            </View>

            {!user.isPremium && (
              <View style={styles.premiumTip}>
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Text style={styles.premiumTipText}>
                  Premium users pay only {offer.premiumGems} gems
                </Text>
              </View>
            )}
          </Card>

          {/* Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Offer Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Valid Until</Text>
                <Text style={styles.detailValue}>
                  {new Date(offer.expiresAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="pricetag-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>
                  {offer.businessType.charAt(0).toUpperCase() + offer.businessType.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Terms</Text>
                <Text style={styles.detailValue}>
                  One-time use. Cannot be combined with other offers.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomSection}>
          {!canRedeem && (
            <View style={styles.insufficientGems}>
              <Ionicons name="alert-circle" size={16} color={Colors.warning} />
              <Text style={styles.insufficientText}>
                You need {gemsCost - user.gems} more gems
              </Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.navigateBtn}>
              <Ionicons name="navigate" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.redeemBtnContainer}>
              <Button
                title={isRedeeming ? 'Redeeming...' : `Redeem for ${gemsCost} Gems`}
                onPress={handleRedeem}
                disabled={!canRedeem || isRedeeming}
                loading={isRedeeming}
                icon="diamond"
                size="lg"
              />
            </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  businessHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  businessIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: Colors.success,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  discountBadgeText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  businessName: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  locationText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  offerDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  gemsCard: {
    marginBottom: Spacing.xl,
  },
  gemsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  gemsCardTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  gemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gemsCost: {
    color: Colors.gem,
    fontSize: 48,
    fontWeight: FontWeights.bold,
  },
  gemsLabel: {
    color: Colors.gem,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.medium,
  },
  premiumTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: `${Colors.gold}15`,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
  },
  premiumTipText: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
  },
  detailsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: 2,
  },
  detailValue: {
    color: Colors.text,
    fontSize: FontSizes.md,
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  insufficientGems: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  insufficientText: {
    color: Colors.warning,
    fontSize: FontSizes.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  navigateBtn: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemBtnContainer: {
    flex: 1,
  },
  // Success screen styles
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: FontWeights.bold,
    marginBottom: 8,
  },
  successDescription: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  codeContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xl,
  },
  codeLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: 8,
  },
  codeValue: {
    color: Colors.primary,
    fontSize: 36,
    fontWeight: FontWeights.bold,
    letterSpacing: 4,
    marginBottom: Spacing.md,
  },
  codeTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeTimerText: {
    color: Colors.warning,
    fontSize: FontSizes.sm,
  },
  discountDisplay: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  discountLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginBottom: 4,
  },
  discountValue: {
    color: Colors.success,
    fontSize: 24,
    fontWeight: FontWeights.bold,
  },
});

export default OfferDetailScreen;
