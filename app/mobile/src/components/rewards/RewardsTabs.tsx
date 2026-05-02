import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../contexts/ThemeContext';
import { rewardsStyles } from './styles';
import type { WalletTab } from './types';

type Props = {
  colors: ThemeColors;
  walletTab: WalletTab;
  onTabChange: (tab: WalletTab) => void;
};

const TABS: { key: WalletTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'balance', label: 'Balance', icon: 'wallet-outline' },
  { key: 'activity', label: 'Activity', icon: 'pulse-outline' },
  { key: 'redemptions', label: 'Redemptions', icon: 'receipt-outline' },
  { key: 'badges', label: 'Badges', icon: 'ribbon-outline' },
];

export default function RewardsTabs({ colors, walletTab, onTabChange }: Props) {
  const border = colors.border;
  const sub = colors.textSecondary;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[rewardsStyles.tabsRow, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: border, flexGrow: 1 }]}
    >
      {TABS.map(({ key, label, icon }) => {
        const active = walletTab === key;
        return (
          <TouchableOpacity key={key} style={{ flexGrow: 1, minWidth: 88 }} onPress={() => onTabChange(key)} activeOpacity={0.85}>
            {active ? (
              <LinearGradient
                colors={[colors.ctaGradientStart, colors.ctaGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 11,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 5,
                }}
              >
                <Ionicons name={icon} size={14} color="#fff" />
                <Text style={[rewardsStyles.tabText, { color: '#fff' }]} numberOfLines={2}>
                  {label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                <Ionicons name={icon} size={14} color={sub} />
                <Text style={[rewardsStyles.tabText, { color: sub }]} numberOfLines={2}>
                  {label}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
