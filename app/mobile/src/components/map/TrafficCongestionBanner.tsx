import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type TrafficSummary = {
  level: 'heavy' | 'moderate' | 'low';
  delayMin: number;
};

type Props = {
  visible: boolean;
  topInset: number;
  congestion?: string[];
  analyzeCongestion: (congestion?: string[]) => TrafficSummary | null;
  setDismissed: (v: boolean) => void;
  fetchReroute: () => Promise<{ ok: boolean; message?: string }>;
  styles: Record<string, any>;
};

export default function TrafficCongestionBanner(props: Props) {
  if (!props.visible) return null;
  const traffic = props.analyzeCongestion(props.congestion);
  if (!traffic || traffic.level === 'low') return null;

  const isHeavy = traffic.level === 'heavy';
  const s = props.styles;
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={[
        s.trafficBanner,
        { top: props.topInset },
        {
          backgroundColor: isHeavy ? '#FEF2F2' : '#FFFBEB',
          borderColor: isHeavy ? '#FECACA' : '#FDE68A',
        },
      ]}
    >
      <View style={s.trafficBannerLeft}>
        <Ionicons
          name={isHeavy ? 'warning' : 'information-circle'}
          size={20}
          color={isHeavy ? '#DC2626' : '#D97706'}
          style={{ marginRight: 10 }}
        />
        <View>
          <Text style={[s.trafficBannerTitle, { color: isHeavy ? '#991B1B' : '#92400E' }]}>
            {isHeavy ? 'Heavy traffic ahead' : 'Moderate traffic ahead'}
          </Text>
          <Text style={[s.trafficBannerSub, { color: isHeavy ? '#DC2626' : '#D97706' }]}>
            {traffic.delayMin > 0 ? `~${traffic.delayMin} min delay on your route` : 'Congestion on your route'}
          </Text>
        </View>
      </View>
      <View style={s.trafficBannerActions}>
        <TouchableOpacity
          style={[s.trafficRerouteBtn, { backgroundColor: isHeavy ? '#DC2626' : '#D97706' }]}
          onPress={() => {
            props.setDismissed(true);
            void props.fetchReroute().then((r) => {
              if (!r.ok) Alert.alert('Reroute failed', r.message ?? 'Could not fetch a new route.');
            });
          }}
          activeOpacity={0.85}
        >
          <Text style={s.trafficRerouteBtnT}>Reroute</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.trafficDismissBtn}
          onPress={() => props.setDismissed(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
