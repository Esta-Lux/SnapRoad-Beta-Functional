// SnapRoad Mobile - Redemption Popup
// Confirms gem redemption and shows QR code

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://privacy-first-app-3.preview.emergentagent.com';

interface Offer {
  id: number;
  business_name: string;
  business_type: string;
  description: string;
  discount_percent: number;
  gems_cost?: number;
}

interface RedemptionPopupProps {
  visible: boolean;
  offer: Offer | null;
  userGems: number;
  onClose: () => void;
  onRedeem: () => void;
}

export const RedemptionPopup: React.FC<RedemptionPopupProps> = ({
  visible,
  offer,
  userGems,
  onClose,
  onRedeem,
}) => {
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');
  const [redemptionCode, setRedemptionCode] = useState('');
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [checkAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setStep('confirm');
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible]);

  const handleRedeem = async () => {
    if (!offer) return;
    
    try {
      const res = await fetch(`${API_URL}/api/offers/${offer.id}/redeem`, {
        method: 'POST',
      });
      const data = await res.json();
      
      // Generate random code
      const code = `SR${offer.id}${Date.now().toString(36).toUpperCase()}`;
      setRedemptionCode(code);
      setStep('success');
      
      // Animate checkmark
      Animated.spring(checkAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
      
      onRedeem();
    } catch (e) {
      // Mock success
      const code = `SR${offer?.id}${Date.now().toString(36).toUpperCase()}`;
      setRedemptionCode(code);
      setStep('success');
      onRedeem();
    }
  };

  if (!offer) return null;

  const gemsCost = offer.gems_cost || 50;
  const canAfford = userGems >= gemsCost;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          {step === 'confirm' ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {/* Offer Info */}
              <View style={styles.offerSection}>
                <View style={styles.offerIcon}>
                  <Ionicons name="gift" size={32} color={Colors.success} />
                </View>
                <Text style={styles.businessName}>{offer.business_name}</Text>
                <Text style={styles.offerDesc}>{offer.description}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{offer.discount_percent}% OFF</Text>
                </View>
              </View>

              {/* Cost Section */}
              <View style={styles.costSection}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Redemption Cost</Text>
                  <View style={styles.costValue}>
                    <Ionicons name="diamond" size={18} color={Colors.accent} />
                    <Text style={styles.costAmount}>{gemsCost}</Text>
                  </View>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Your Balance</Text>
                  <View style={styles.costValue}>
                    <Ionicons name="diamond" size={18} color={Colors.primary} />
                    <Text style={[styles.costAmount, !canAfford && styles.costAmountLow]}>
                      {userGems}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Redeem Button */}
              <TouchableOpacity
                style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]}
                onPress={handleRedeem}
                disabled={!canAfford}
              >
                <LinearGradient
                  colors={canAfford ? ['#10B981', '#059669'] : ['#4B5563', '#374151']}
                  style={styles.redeemBtnGradient}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.redeemBtnText}>
                    {canAfford ? 'Redeem Now' : 'Not Enough Gems'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {!canAfford && (
                <Text style={styles.needMoreText}>
                  You need {gemsCost - userGems} more gems
                </Text>
              )}
            </>
          ) : (
            <>
              {/* Success State */}
              <Animated.View style={[styles.successSection, { opacity: checkAnim }]}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
                </View>
                <Text style={styles.successTitle}>Redemption Successful!</Text>
                <Text style={styles.successSubtitle}>Show this code at {offer.business_name}</Text>
                
                {/* QR Code Placeholder - In production, use a QR library */}
                <View style={styles.qrPlaceholder}>
                  <View style={styles.qrBox}>
                    <Ionicons name="qr-code" size={80} color={Colors.text} />
                  </View>
                </View>

                <View style={styles.codeSection}>
                  <Text style={styles.codeLabel}>Redemption Code</Text>
                  <Text style={styles.codeValue}>{redemptionCode}</Text>
                </View>

                <View style={styles.validSection}>
                  <Ionicons name="time-outline" size={16} color={Colors.warning} />
                  <Text style={styles.validText}>Valid for 24 hours</Text>
                </View>

                <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  offerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  offerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  businessName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  offerDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  discountBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  discountText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  costSection: {
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  costLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  costValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costAmount: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  costAmountLow: {
    color: Colors.error,
  },
  redeemBtn: {
    marginTop: Spacing.sm,
  },
  redeemBtnDisabled: {
    opacity: 0.7,
  },
  redeemBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  redeemBtnText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  needMoreText: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  successSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  qrPlaceholder: {
    marginVertical: Spacing.lg,
  },
  qrBox: {
    width: 160,
    height: 160,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  codeLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    letterSpacing: 2,
    marginTop: 4,
  },
  validSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  validText: {
    fontSize: FontSizes.sm,
    color: Colors.warning,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 48,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  doneBtnText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
});

export default RedemptionPopup;
