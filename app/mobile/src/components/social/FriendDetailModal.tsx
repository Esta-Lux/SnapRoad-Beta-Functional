import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Friend } from '../../types';
import {
  deriveFriendPresence,
  formatDistanceMeters,
  formatLastUpdatedShort,
} from '../../lib/friendPresence';
import { getMapboxRouteOptions, reverseGeocode } from '../../lib/directions';

const ETA_CACHE_MS = 60_000;

export type FriendDetailTheme = {
  text: string;
  sub: string;
  card: string;
  border: string;
  primary: string;
  danger: string;
  surface: string;
};

type Props = {
  friend: Friend;
  myLocation: { lat: number; lng: number } | null;
  theme: FriendDetailTheme;
  onNavigate: (opts: {
    friendId: string;
    name: string;
    lat: number;
    lng: number;
    isLiveFresh: boolean;
    lastUpdated?: string;
  }) => void;
  onViewOnMap: (friendId: string) => void;
  onRemove: (friendId: string) => void;
  onClose: () => void;
};

export default function FriendDetailModalContent({
  friend,
  myLocation,
  theme,
  onNavigate,
  onViewOnMap,
  onRemove,
  onClose,
}: Props) {
  const presence = deriveFriendPresence(friend, myLocation);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [nearLabel, setNearLabel] = useState<string | null>(null);
  const etaCacheRef = useRef<Map<string, { at: number; minutes: number }>>(new Map());
  const geoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initials = (friend.name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const validCoords =
    friend.lat != null &&
    friend.lng != null &&
    Number.isFinite(friend.lat) &&
    Number.isFinite(friend.lng) &&
    !(Math.abs(friend.lat) < 1e-6 && Math.abs(friend.lng) < 1e-6);

  const loadEta = useCallback(async () => {
    if (!validCoords || !myLocation || (myLocation.lat === 0 && myLocation.lng === 0)) {
      setEtaMin(null);
      return;
    }
    const key = friend.friend_id;
    const cached = etaCacheRef.current.get(key);
    const now = Date.now();
    if (cached && now - cached.at < ETA_CACHE_MS) {
      setEtaMin(cached.minutes);
      return;
    }
    setEtaLoading(true);
    try {
      const routes = await getMapboxRouteOptions(
        { lat: myLocation.lat, lng: myLocation.lng },
        { lat: friend.lat!, lng: friend.lng! },
        { mode: 'adaptive' },
      );
      const min = routes.length ? Math.max(1, Math.round(routes[0].duration / 60)) : null;
      if (min != null) etaCacheRef.current.set(key, { at: now, minutes: min });
      setEtaMin(min);
    } catch {
      setEtaMin(null);
    } finally {
      setEtaLoading(false);
    }
  }, [friend.friend_id, friend.lat, friend.lng, myLocation, validCoords]);

  useEffect(() => {
    loadEta();
  }, [loadEta]);

  useEffect(() => {
    if (!validCoords) {
      setNearLabel(null);
      return;
    }
    if (geoTimerRef.current) clearTimeout(geoTimerRef.current);
    geoTimerRef.current = setTimeout(() => {
      reverseGeocode(friend.lat!, friend.lng!)
        .then((r) => {
          const label = r?.name || r?.address || null;
          setNearLabel(label);
        })
        .catch(() => setNearLabel(null));
    }, 400);
    return () => {
      if (geoTimerRef.current) clearTimeout(geoTimerRef.current);
    };
  }, [friend.lat, friend.lng, validCoords]);

  const distLabel = formatDistanceMeters(presence.distanceFromMeM);

  const liveCaption = presence.isLiveFresh
    ? 'Live location available — route can update as they move.'
    : presence.isStale && presence.isSharing
      ? 'Location looks stale. Navigation uses last known position until they share again.'
      : !friend.is_sharing
        ? 'Not sharing live location.'
        : validCoords
          ? 'Last known position — not a live fix right now.'
          : 'No position yet.';

  const canNavigate = validCoords;

  return (
    <View>
      <View style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.avatarRow}>
          {friend.avatar ? (
            <Image source={{ uri: friend.avatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>{friend.name}</Text>
            <Text style={[styles.status, { color: theme.primary }]}>{presence.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: theme.sub }]}>Distance</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {distLabel || '—'}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: theme.sub }]}>ETA</Text>
            {etaLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 4 }} />
            ) : (
              <Text style={[styles.metaValue, { color: theme.text }]}>
                {etaMin != null ? `~${etaMin} min` : '—'}
              </Text>
            )}
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: theme.sub }]}>Updated</Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {friend.last_updated ? formatLastUpdatedShort(friend.last_updated) : '—'}
            </Text>
          </View>
        </View>

        {nearLabel ? (
          <Text style={[styles.nearLine, { color: theme.sub }]} numberOfLines={2}>
            <Ionicons name="location-outline" size={14} color={theme.sub} /> Near {nearLabel}
          </Text>
        ) : null}

        <View style={[styles.captionBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.caption, { color: theme.sub }]}>{liveCaption}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
        activeOpacity={0.88}
        disabled={!canNavigate}
        onPress={() => {
          if (!canNavigate || friend.lat == null || friend.lng == null) return;
          onNavigate({
            friendId: friend.friend_id,
            name: friend.name,
            lat: friend.lat,
            lng: friend.lng,
            isLiveFresh: presence.isLiveFresh,
            lastUpdated: friend.last_updated,
          });
        }}
      >
        <Ionicons name="navigate" size={20} color="#fff" />
        <Text style={styles.btnPrimaryText}>Navigate to</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnSecondary, { backgroundColor: theme.surface, borderColor: theme.border }]}
        activeOpacity={0.88}
        onPress={() => onViewOnMap(friend.friend_id)}
      >
        <Ionicons name="map-outline" size={20} color={theme.primary} />
        <Text style={[styles.btnSecondaryText, { color: theme.primary }]}>View on map</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnDanger, { backgroundColor: theme.danger }]}
        activeOpacity={0.88}
        onPress={() => onRemove(friend.friend_id)}
      >
        <Ionicons name="trash-outline" size={18} color="#fff" />
        <Text style={styles.btnDangerText}>Remove friend</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose} style={styles.dismissTap} hitSlop={12}>
        <Text style={[styles.dismiss, { color: theme.sub }]}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8E8ED' },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerText: { marginLeft: 14, flex: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  status: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  metaGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metaCell: { flex: 1 },
  metaLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  metaValue: { fontSize: 15, fontWeight: '800' },
  nearLine: { fontSize: 12, marginBottom: 10, lineHeight: 18 },
  captionBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  caption: { fontSize: 12, lineHeight: 17 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnSecondaryText: { fontSize: 15, fontWeight: '800' },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
  },
  btnDangerText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  dismissTap: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  dismiss: { fontSize: 14, fontWeight: '600' },
});
