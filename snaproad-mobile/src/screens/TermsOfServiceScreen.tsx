// SnapRoad Mobile - Terms of Service Screen
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';

interface Props {
  navigation?: any;
}

export const TermsOfServiceScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Effective: December 2025</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using SnapRoad, you agree to be bound by these Terms of Service. 
            If you do not agree, please do not use the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            SnapRoad provides navigation services, driving behavior tracking, rewards programs, 
            and local business offers. Features may vary based on your subscription tier.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            You are responsible for maintaining the security of your account credentials. 
            You must be at least 16 years old to use SnapRoad. One person may not have 
            multiple accounts.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Gems & Rewards</Text>
          <Text style={styles.paragraph}>
            Gems earned through the app have no cash value and cannot be transferred. 
            SnapRoad reserves the right to modify the rewards program at any time. 
            Gems expire 12 months after earning if not redeemed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Premium Subscriptions</Text>
          <Text style={styles.paragraph}>
            Premium subscriptions are billed monthly or annually. Cancellation takes effect 
            at the end of the current billing period. Refunds are available within 14 days 
            of initial purchase.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Safe Driving</Text>
          <Text style={styles.paragraph}>
            Always prioritize safe driving. Do not interact with the app while driving. 
            Use voice commands or pull over safely. SnapRoad is not liable for accidents 
            resulting from distracted driving.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Content Guidelines</Text>
          <Text style={styles.paragraph}>
            User-submitted content (incident reports, photos) must be accurate and not 
            contain illegal, harmful, or misleading information. We reserve the right to 
            remove content violating these guidelines.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            SnapRoad is provided "as is" without warranties. We are not liable for 
            navigation errors, missed offers, or data loss. Maximum liability is limited 
            to fees paid in the last 12 months.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these terms periodically. Continued use after changes constitutes 
            acceptance. Material changes will be notified via email or in-app notification.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact</Text>
          <Text style={styles.paragraph}>
            Questions about these terms? Contact us at:{'\n'}
            Email: legal@snaproad.co{'\n'}
            SnapRoad Inc., Columbus, OH
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
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
  section: {
    marginTop: Spacing.lg,
  },
  lastUpdated: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});

export default TermsOfServiceScreen;
