// SnapRoad Mobile - Help Screen
// FAQ, support contacts, and app guides

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const FAQ = [
  { q: 'How does the safety score work?', a: 'Your safety score is calculated based on acceleration, braking, speed, and phone usage during trips. Smoother driving earns higher scores and more gems.' },
  { q: 'What are gems and how do I earn them?', a: 'Gems are the in-app currency. Earn them by completing safe trips, redeeming offers, hitting milestones, and winning challenges. Spend them on premium car colors and special rewards.' },
  { q: 'How do I redeem an offer?', a: 'Navigate to the Offers tab, select an offer near you, and tap "Redeem." Show the generated code at the business to get your discount.' },
  { q: 'Can I add family members?', a: 'Yes! Go to the Family screen from your Profile. Invite members via email and track everyone\'s safety scores and live locations.' },
  { q: 'How do I export my insurance report?', a: 'Go to Profile > Insurance Report. You can share the 90-day driving summary via email or download it as a PDF to send to your insurer.' },
  { q: 'Is my data private?', a: 'Absolutely. Visit the Privacy Center to control data sharing, location tracking, and photo blurring. All photos are processed with automatic face and license plate blurring.' },
];

const GUIDES = [
  { title: 'Getting Started', icon: 'rocket-outline' as const, color: Colors.primary },
  { title: 'Navigation Basics', icon: 'navigate-outline' as const, color: Colors.secondary },
  { title: 'Earning Rewards', icon: 'diamond-outline' as const, color: Colors.accent },
  { title: 'Family Safety', icon: 'people-outline' as const, color: Colors.primaryLight },
];

export const HelpScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Quick Guides */}
        <Text style={s.sectionTitle}>QUICK GUIDES</Text>
        <View style={s.guidesGrid}>
          {GUIDES.map((g, i) => (
            <TouchableOpacity key={i} style={s.guideCard}>
              <View style={[s.guideIcon, { backgroundColor: `${g.color}15` }]}>
                <Ionicons name={g.icon} size={22} color={g.color} />
              </View>
              <Text style={s.guideTitle}>{g.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ */}
        <Text style={s.sectionTitle}>FREQUENTLY ASKED</Text>
        {FAQ.map((item, i) => (
          <TouchableOpacity key={i} style={s.faqCard} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}>
            <View style={s.faqHeader}>
              <Text style={s.faqQ}>{item.q}</Text>
              <Ionicons name={expandedFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
            </View>
            {expandedFaq === i && <Text style={s.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        {/* Contact */}
        <Text style={s.sectionTitle}>CONTACT US</Text>
        <TouchableOpacity style={s.contactCard} onPress={() => Linking.openURL('mailto:support@snaproad.com')}>
          <View style={[s.contactIcon, { backgroundColor: `${Colors.primary}15` }]}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.contactTitle}>Email Support</Text>
            <Text style={s.contactSub}>support@snaproad.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.contactCard}>
          <View style={[s.contactIcon, { backgroundColor: `${Colors.secondary}15` }]}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.contactTitle}>Live Chat</Text>
            <Text style={s.contactSub}>Available 9 AM - 6 PM EST</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <Text style={s.versionText}>SnapRoad v2.1.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 16 },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, letterSpacing: 1.5, marginTop: 20, marginBottom: 12 },
  // Guides
  guidesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  guideCard: { width: '48%' as any, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.glassBorder, padding: 18, alignItems: 'center', gap: 10 },
  guideIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  guideTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, textAlign: 'center' },
  // FAQ
  faqCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: 16, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium, letterSpacing: 0.2 },
  faqA: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 22, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  // Contact
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: 16, marginBottom: 8 },
  contactIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  contactTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.medium },
  contactSub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3 },
  versionText: { color: Colors.textDim, fontSize: FontSizes.xs, textAlign: 'center', marginTop: 24 },
});

export default HelpScreen;
