import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../contexts/ThemeContext';
import { rewardsStyles } from './styles';
import type { RewardsTab } from './types';

type Props = {
  colors: ThemeColors;
  rewardsTab: RewardsTab;
  onTabChange: (tab: RewardsTab) => void;
};

const TABS: { key: RewardsTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'offers', label: 'Offers', icon: 'pricetag-outline' },
  { key: 'challenges', label: 'Challenges', icon: 'flag-outline' },
  { key: 'badges', label: 'Badges', icon: 'ribbon-outline' },
];

export default function RewardsTabs({ colors, rewardsTab, onTabChange }: Props) {
  const border = colors.border;
  const sub = colors.textSecondary;

  return (
    <View style={[rewardsStyles.tabsRow, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: border }]}>
      {TABS.map(({ key, label, icon }) => {
        const active = rewardsTab === key;
        return (
          <TouchableOpacity key={key} style={{ flex: 1 }} onPress={() => onTabChange(key)} activeOpacity={0.85}>
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
                <Text style={[rewardsStyles.tabText, { color: '#fff' }]} numberOfLines={1}>{label}</Text>
              </LinearGradient>
            ) : (
              <View style={{ paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                <Ionicons name={icon} size={14} color={sub} />
                <Text style={[rewardsStyles.tabText, { color: sub }]} numberOfLines={1}>{label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
