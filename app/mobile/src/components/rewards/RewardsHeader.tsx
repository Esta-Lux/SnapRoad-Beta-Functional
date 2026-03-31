import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { rewardsStyles } from './styles';

type Props = {
  colors: {
    rewardsGradientStart: string;
    rewardsGradientEnd: string;
  };
  gems: number;
  level: number;
  multiplier: string;
  miles: string | number;
};

export default function RewardsHeader({
  colors,
  gems,
  level,
  multiplier,
  miles,
}: Props) {
  return (
    <LinearGradient
      colors={[colors.rewardsGradientStart, colors.rewardsGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={rewardsStyles.statsRow}
    >
      <View style={rewardsStyles.statItem}>
        <Ionicons name="gift-outline" size={20} color="#fff" />
        <Text style={[rewardsStyles.statValue, { color: '#fff' }]}>{gems}</Text>
        <Text style={[rewardsStyles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Gems</Text>
      </View>
      <View style={rewardsStyles.statItem}>
        <Ionicons name="star-outline" size={20} color="#fff" />
        <Text style={[rewardsStyles.statValue, { color: '#fff' }]}>Lvl {level}</Text>
        <Text style={[rewardsStyles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Level</Text>
      </View>
      <View style={rewardsStyles.statItem}>
        <Ionicons name="trophy-outline" size={20} color="#fff" />
        <Text style={[rewardsStyles.statValue, { color: '#fff' }]}>{multiplier}</Text>
        <Text style={[rewardsStyles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Multiplier</Text>
      </View>
      <View style={rewardsStyles.statItem}>
        <Ionicons name="ribbon-outline" size={20} color="#fff" />
        <Text style={[rewardsStyles.statValue, { color: '#fff' }]}>{miles}</Text>
        <Text style={[rewardsStyles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Miles</Text>
      </View>
    </LinearGradient>
  );
}
