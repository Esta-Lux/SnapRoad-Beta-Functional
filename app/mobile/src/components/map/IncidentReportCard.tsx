import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, type AnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { Incident } from '../../types';
import { formatDelayLabel, isProviderTrafficIncident } from '../../utils/incidentSource';

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
  const isProvider = isProviderTrafficIncident(card);
  const isTomTom = String(card.source ?? card.provider ?? '').toLowerCase() === 'tomtom'
    || String(card.id).startsWith('tomtom-');
  const delay = formatDelayLabel(card.delay_seconds);
  const iconName =
    card.type === 'police'
      ? 'shield'
      : card.type === 'accident'
      ? 'car-sport'
      : card.type === 'traffic'
      ? 'speedometer'
      : card.type === 'construction'
      ? 'construct'
      : 'warning';

  const roadLabel = card.road_name || (card.road_numbers?.length ? card.road_numbers.join(' · ') : null);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={s.rcNewTitle} numberOfLines={1}>
              {card.title}
            </Text>
            {isTomTom ? (
              <View style={{ backgroundColor: color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>TOMTOM</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.rcNewSub}>
            {(props.haversineMeters(props.location.lat, props.location.lng, card.lat, card.lng) / 1609.34).toFixed(1)} mi{' '}
            {props.isNavigating ? 'ahead' : 'away'}
            {roadLabel ? ` · ${roadLabel}` : ''}
            {!isProvider ? ` · ${props.timeAgo(card.created_at)}` : ''}
          </Text>
          {delay ? (
            <Text style={[s.rcNewSub, { color, fontWeight: '800', marginTop: 2 }]}>Traffic delay {delay}</Text>
          ) : null}
          {isProvider ? (
            <Text style={s.rcNewVotes}>Live traffic data · {card.reported_by || 'Verified feed'}</Text>
          ) : (
            <Text style={s.rcNewVotes}>{card.upvotes ?? 0} confirmed</Text>
          )}
        </View>
        <TouchableOpacity
          style={s.rcNewDismiss}
          onPress={props.onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
      </View>
      {!isProvider ? (
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
      ) : (
        <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' }}>
            Provider-reported incident — community votes are not used for this pin.
          </Text>
        </View>
      )}
      <View style={s.rcNewTimerTrack}>
        <Animated.View style={[s.rcNewTimerBar, { backgroundColor: color }, props.reportTimerStyle]} />
      </View>
    </Animated.View>
  );
}
