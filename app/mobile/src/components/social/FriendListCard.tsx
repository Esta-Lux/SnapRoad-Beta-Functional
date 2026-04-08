import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Friend } from '../../types';
import type { FriendPresence } from '../../lib/friendPresence';
import { formatDistanceMeters, formatLastUpdatedShort, hasValidFriendCoords } from '../../lib/friendPresence';

export type FriendListCardTheme = {
  cardBg: string;
  text: string;
  sub: string;
  primary: string;
  border: string;
};

type Props = {
  friend: Friend;
  presence: FriendPresence;
  theme: FriendListCardTheme;
  onPress: (f: Friend) => void;
  /** Opens map at friend — does not open detail modal. */
  onAvatarPress?: (f: Friend) => void;
};

function badgeColors(
  badge: FriendPresence['badge'],
  primary: string,
): { bg: string; fg: string } {
  switch (badge) {
    case 'DRIVING':
      return { bg: `${primary}22`, fg: primary };
    case 'PARKED':
      return { bg: 'rgba(52,199,89,0.18)', fg: '#34C759' };
    case 'STALE':
      return { bg: 'rgba(255,149,0,0.2)', fg: '#FF9500' };
    case 'LIVE':
      return { bg: `${primary}28`, fg: primary };
    default:
      return { bg: 'rgba(142,142,147,0.2)', fg: '#8E8E93' };
  }
}

const FriendListCard = memo(function FriendListCard({ friend, presence, theme, onPress, onAvatarPress }: Props) {
  const initials = (friend.name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const distLabel = formatDistanceMeters(presence.distanceFromMeM);
  const awayLine =
    distLabel && presence.distanceFromMeM != null && presence.distanceFromMeM > 0
      ? `~${distLabel} away`
      : '';
  const liveBadge = badgeColors('LIVE', theme.primary);
  const stateBadge = badgeColors(presence.badge, theme.primary);

  const sharingWithCoords =
    friend.is_sharing === true && hasValidFriendCoords(friend.lat, friend.lng);
  const showBattery =
    sharingWithCoords &&
    friend.battery_pct != null &&
    Number.isFinite(friend.battery_pct);

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
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
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

      <TouchableOpacity
        style={styles.rowMain}
        onPress={() => onPress(friend)}
        activeOpacity={0.72}
      >
        <View style={styles.mid}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {friend.name}
            </Text>
            <View style={styles.pillRow}>
              {presence.showLivePill && (
                <View style={[styles.pill, { backgroundColor: liveBadge.bg }]}>
                  <View style={[styles.liveDot, { backgroundColor: liveBadge.fg }]} />
                  <Text style={[styles.pillText, { color: liveBadge.fg }]}>LIVE</Text>
                </View>
              )}
              <View style={[styles.pill, { backgroundColor: stateBadge.bg }]}>
                <Text style={[styles.pillText, { color: stateBadge.fg }]}>
                  {presence.badge === 'OFFLINE'
                    ? 'OFF'
                    : presence.badge === 'STALE'
                      ? 'STALE'
                      : presence.badge === 'DRIVING'
                        ? 'DRV'
                        : presence.badge === 'PARKED'
                          ? 'IDLE'
                          : presence.badge}
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.statusLine, { color: theme.primary }]} numberOfLines={1}>
            {presence.statusLabel}
          </Text>
          {awayLine ? (
            <Text style={[styles.awayLine, { color: theme.text }]} numberOfLines={1}>
              {awayLine}
            </Text>
          ) : null}
          <Text style={[styles.subLine, { color: theme.sub }]} numberOfLines={2}>
            {presence.sublabel}
          </Text>
          {friend.last_updated ? (
            <Text style={[styles.timeLine, { color: theme.sub }]}>
              Updated {presence.isStale ? '(stale) ' : ''}
              {formatLastUpdatedShort(friend.last_updated)}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          {distLabel ? (
            <Text style={[styles.dist, { color: theme.text }]} numberOfLines={1}>
              {distLabel}
            </Text>
          ) : (
            <Text style={[styles.distMuted, { color: theme.sub }]} numberOfLines={1}>
              —
            </Text>
          )}
          {showBattery ? (
            <View
              style={[
                styles.batRow,
                !presence.isLiveFresh && presence.isStale && styles.batRowStale,
              ]}
            >
              <Ionicons
                name={presence.isLiveFresh ? 'battery-charging-outline' : 'battery-half-outline'}
                size={14}
                color={friend.battery_pct! > 20 ? '#34C759' : '#FF9500'}
              />
              <Text style={[styles.batTxt, { color: theme.sub }]}>
                {Math.round(friend.battery_pct!)}%
              </Text>
            </View>
          ) : null}
          {showBattery && !presence.isLiveFresh && (
            <Text style={[styles.batCaption, { color: theme.sub }]}>last reported</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color={theme.sub} style={styles.chevron} />
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default FriendListCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrap: { marginRight: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  avatarImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8E8ED' },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 17, fontWeight: '800' },
  mid: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  pillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  statusLine: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  awayLine: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  subLine: { fontSize: 12, lineHeight: 16 },
  timeLine: { fontSize: 11, marginTop: 4, opacity: 0.9 },
  right: { alignItems: 'flex-end', paddingLeft: 8, minWidth: 64 },
  dist: { fontSize: 13, fontWeight: '800' },
  distMuted: { fontSize: 12, fontWeight: '600' },
  batRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  batRowStale: { opacity: 0.72 },
  batTxt: { fontSize: 10, fontWeight: '700' },
  batCaption: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  chevron: { marginTop: 6, opacity: 0.45 },
});
