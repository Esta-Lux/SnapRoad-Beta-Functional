import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Friend } from '../../types';
import type { FriendPresence } from '../../lib/friendPresence';
import { formatDistanceMeters, hasValidFriendCoords, formatLastUpdatedShort } from '../../lib/friendPresence';

export type FriendListCardTheme = {
  cardBg: string;
  text: string;
  sub: string;
  primary: string;
  border: string;
  /** Optional hairline between rows */
  separator?: string;
};

type Props = {
  friend: Friend;
  presence: FriendPresence;
  theme: FriendListCardTheme;
  onPress: (f: Friend) => void;
  /** Opens map at friend — does not open detail modal. */
  onAvatarPress?: (f: Friend) => void;
  /** Bucket / assign collections */
  onAssignBucket?: (f: Friend) => void;
  /** Omit bottom divider on last row */
  isLast?: boolean;
};

function pillStyle(
  tone: 'live' | 'active' | 'muted' | 'warn',
  primary: string,
): { bg: string; fg: string } {
  switch (tone) {
    case 'live':
      return { bg: 'rgba(52,199,89,0.14)', fg: '#34C759' };
    case 'active':
      return { bg: `${primary}18`, fg: primary };
    case 'warn':
      return { bg: 'rgba(255,149,0,0.16)', fg: '#FF9500' };
    default:
      return { bg: 'rgba(142,142,147,0.14)', fg: '#8E8E93' };
  }
}

function pillToneAndLabel(presence: FriendPresence, friend: Friend): { text: string; tone: 'live' | 'active' | 'muted' | 'warn' } {
  if (friend.status === 'pending') return { text: 'Pending', tone: 'muted' };
  if (presence.showLivePill) return { text: 'Live', tone: 'live' };
  switch (presence.badge) {
    case 'DRIVING':
      return { text: 'Driving', tone: 'active' };
    case 'PARKED':
      return { text: 'Parked', tone: 'active' };
    case 'STALE':
      return { text: 'Stale', tone: 'warn' };
    default:
      return { text: presence.statusLabel, tone: 'muted' };
  }
}

const FriendListCard = memo(function FriendListCard({
  friend,
  presence,
  theme,
  onPress,
  onAvatarPress,
  onAssignBucket,
  isLast,
}: Props) {
  const initials = (friend.name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const distLabel = formatDistanceMeters(presence.distanceFromMeM);
  const lastUpdatedLabel = formatLastUpdatedShort(friend.last_updated);
  const parts = [presence.sublabel].filter(Boolean);
  if (distLabel && presence.distanceFromMeM != null && presence.distanceFromMeM > 0) {
    parts.push(`~${distLabel}`);
  }
  const secondaryLine = parts.join(' · ');

  const sharingWithCoords = friend.is_sharing === true && hasValidFriendCoords(friend.lat, friend.lng);
  const showBattery =
    sharingWithCoords && friend.battery_pct != null && Number.isFinite(friend.battery_pct);
  const showLastUpdated = lastUpdatedLabel && friend.status !== 'pending';

  const { text: pillText, tone: pillTone } = pillToneAndLabel(presence, friend);
  const { bg: pillBg, fg: pillFg } = pillStyle(pillTone, theme.primary);

  const sep = theme.separator ?? theme.border;

  const AvatarInner = (
    <>
      {friend.avatar ? (
        <Image source={{ uri: friend.avatar }} style={styles.avatarImg} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.cell, { backgroundColor: theme.cardBg }, !isLast && { borderBottomColor: sep, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {onAvatarPress ? (
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => onAvatarPress(friend)}
          activeOpacity={0.82}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`View ${friend.name} on map`}
        >
          {AvatarInner}
        </TouchableOpacity>
      ) : (
        <View style={styles.avatarWrap}>{AvatarInner}</View>
      )}

      <Pressable
        style={({ pressed }) => [styles.rowPress, pressed && styles.rowPressActive]}
        onPress={() => onPress(friend)}
        accessibilityRole="button"
        accessibilityLabel={`${friend.name}, details`}
      >
        <View style={styles.mid}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {friend.name}
          </Text>
          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            {presence.showLivePill ? <View style={[styles.liveDot, { backgroundColor: pillFg }]} /> : null}
            <Text style={[styles.pillText, { color: pillFg }]}>{pillText}</Text>
          </View>
          {secondaryLine ? (
            <Text style={[styles.secondary, { color: theme.sub }]} numberOfLines={2}>
              {secondaryLine}
            </Text>
          ) : null}
          {(showBattery || showLastUpdated) ? (
            <View style={styles.metaRow}>
              {showBattery ? (
                <View style={styles.batRow}>
                  <Ionicons
                    name={presence.isLiveFresh ? 'battery-charging-outline' : 'battery-half-outline'}
                    size={13}
                    color={friend.battery_pct! > 20 ? '#34C759' : '#FF9500'}
                  />
                  <Text style={[styles.batTxt, { color: theme.sub }]}>{Math.round(friend.battery_pct!)}%</Text>
                </View>
              ) : null}
              {showLastUpdated && !presence.isLiveFresh ? (
                <Text style={[styles.metaTimestamp, { color: theme.sub }]}>{lastUpdatedLabel}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.trailing}>
          {onAssignBucket ? (
            <TouchableOpacity
              onPress={() => onAssignBucket(friend)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
              style={styles.moreHit}
              accessibilityRole="button"
              accessibilityLabel={`Assign ${friend.name} to a bucket`}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.sub} style={{ opacity: 0.55 }} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={theme.sub} style={styles.chevron} />
        </View>
      </Pressable>
    </View>
  );
});

export default FriendListCard;

const styles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  avatarWrap: { marginRight: 14 },
  avatarImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8E8ED' },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 18, fontWeight: '700' },
  rowPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    borderRadius: 12,
  },
  rowPressActive: { opacity: 0.88 },
  mid: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontSize: 17, fontWeight: '600', letterSpacing: -0.25 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  secondary: { fontSize: 13, fontWeight: '500', lineHeight: 18, opacity: 0.92 },
  batRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  batTxt: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  metaTimestamp: { fontSize: 11, fontWeight: '500', opacity: 0.7 },
  trailing: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4 },
  moreHit: { paddingVertical: 8, paddingHorizontal: 4 },
  chevron: { marginLeft: 2, opacity: 0.38 },
});
