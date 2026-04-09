import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { Incident } from '../../types';

type Props = {
  activeReportCard: Incident | null;
  insetsTop: number;
  isNavigating: boolean;
  styles: Record<string, any>;
  incidentColors: Record<string, string>;
  location: { lat: number; lng: number };
  haversineMeters: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  timeAgo: (iso: string) => string;
  onDismiss: () => void;
  onUpvote: (incident: Incident) => void;
  onDownvote: (incident: Incident) => void;
  reportTimerStyle: AnimatedStyle<Record<string, unknown>>;
};

export default function IncidentReportCard(props: Props) {
  const card = props.activeReportCard;
  if (!card) return null;

  const s = props.styles;
  const color = props.incidentColors[card.type] ?? '#F59E0B';
  const iconName =
    card.type === 'police'
      ? 'shield'
      : card.type === 'accident'
      ? 'car-sport'
      : card.type === 'construction'
      ? 'construct'
      : 'warning';

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(250)}
      style={[
        s.reportCardNew,
        { top: props.isNavigating ? props.insetsTop + 130 : props.insetsTop + 90 },
      ]}
    >
      <View style={s.rcNewContent}>
        <View style={[s.rcNewIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={iconName} size={22} color={color} />
        </View>
        <View style={s.rcNewTextBlock}>
          <Text style={s.rcNewTitle} numberOfLines={1}>
            {card.title}
          </Text>
          <Text style={s.rcNewSub}>
            {(props.haversineMeters(props.location.lat, props.location.lng, card.lat, card.lng) / 1609.34).toFixed(1)} mi{' '}
            {props.isNavigating ? 'ahead' : 'away'} · {props.timeAgo(card.created_at)}
          </Text>
          <Text style={s.rcNewVotes}>{card.upvotes ?? 0} confirmed</Text>
        </View>
        <TouchableOpacity
          style={s.rcNewDismiss}
          onPress={props.onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
      </View>
      <View style={s.rcNewVoteRow}>
        <TouchableOpacity style={[s.rcNewVoteBtn, s.rcUpvote]} onPress={() => props.onUpvote(card)} activeOpacity={0.85}>
          <Ionicons name="thumbs-up" size={15} color="#fff" />
          <Text style={s.rcNewVoteBtnT}>Still there</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.rcNewVoteBtn, s.rcDownvote]} onPress={() => props.onDownvote(card)} activeOpacity={0.85}>
          <Ionicons name="thumbs-down" size={15} color="#fff" />
          <Text style={s.rcNewVoteBtnT}>Gone</Text>
        </TouchableOpacity>
      </View>
      <View style={s.rcNewTimerTrack}>
        <Animated.View style={[s.rcNewTimerBar, { backgroundColor: color }, props.reportTimerStyle]} />
      </View>
    </Animated.View>
  );
}
