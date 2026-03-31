import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { rewardsStyles } from './styles';
import type { RewardsTab } from './types';

type Props = {
  cardBg: string;
  subText: string;
  rewardsTab: RewardsTab;
  onTabChange: (tab: RewardsTab) => void;
};

export default function RewardsTabs({
  cardBg,
  subText,
  rewardsTab,
  onTabChange,
}: Props) {
  return (
    <View style={[rewardsStyles.tabsRow, { backgroundColor: cardBg }]}>
      {(['offers', 'challenges', 'badges'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[rewardsStyles.tabBtn, rewardsTab === tab && rewardsStyles.tabBtnActive]}
          onPress={() => onTabChange(tab)}
        >
          <Text style={[rewardsStyles.tabText, { color: rewardsTab === tab ? '#fff' : subText }]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
