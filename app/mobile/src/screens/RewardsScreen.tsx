import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, FlatList, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../hooks/useLocation';
import { api } from '../api/client';
import Skeleton, { SkeletonCard } from '../components/common/Skeleton';
import { formatDuration } from '../utils/format';
import type { Challenge, Badge, Offer, Trip, WeeklyInsights } from '../types';

export default function RewardsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { location } = useLocation();
  const bg = colors.background;
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [insights, setInsights] = useState<WeeklyInsights | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, bRes, oRes, tRes, iRes] = await Promise.all([
        api.get<any>('/api/challenges'),
        api.get<any>('/api/badges'),
        api.get<any>(`/api/offers?lat=${location.lat}&lng=${location.lng}`),
        api.get<any>('/api/trips?limit=10'),
        api.get<any>('/api/trips/weekly-insights'),
      ]);
      const unwrap = (r: any) => r?.data?.data ?? r?.data ?? [];
      setChallenges(Array.isArray(unwrap(cRes)) ? unwrap(cRes) : []);
      const bData = unwrap(bRes);
      setBadges(Array.isArray(bData) ? bData : (bData?.badges ?? []));
      setOffers(Array.isArray(unwrap(oRes)) ? unwrap(oRes) : []);
      setTrips(Array.isArray(unwrap(tRes)) ? unwrap(tRes) : []);
      const iData = iRes?.data?.data ?? iRes?.data;
      setInsights(iData && typeof iData === 'object' ? iData as WeeklyInsights : null);
    } catch {} finally { setLoading(false); }
  }, [location.lat, location.lng]);

  useEffect(() => { loadAll(); }, []);

  const earnedBadges = badges.filter((b) => b.earned).length;
  const multiplier = user?.isPremium ? '2x' : '1x';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAll} tintColor="#3B82F6" />}>
      {/* Top stats -- gradient header matching web */}
      <LinearGradient colors={[colors.rewardsGradientStart, colors.rewardsGradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="gift-outline" size={20} color="#fff" />
          <Text style={[styles.statValue, { color: '#fff' }]}>{user?.gems ?? 0}</Text>
          <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Gems</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={20} color="#fff" />
          <Text style={[styles.statValue, { color: '#fff' }]}>Lvl {user?.level ?? 1}</Text>
          <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Level</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="trophy-outline" size={20} color="#fff" />
          <Text style={[styles.statValue, { color: '#fff' }]}>{multiplier}</Text>
          <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Multiplier</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="ribbon-outline" size={20} color="#fff" />
          <Text style={[styles.statValue, { color: '#fff' }]}>{user?.totalMiles?.toFixed(0) ?? 0}</Text>
          <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>Miles</Text>
        </View>
      </LinearGradient>

      {/* Challenges */}
      <Text style={[styles.sectionTitle, { color: text }]}>Active Challenges</Text>
      {loading ? (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={70} borderRadius={12} />)}</View>
      ) : challenges.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No active challenges</Text></View>
      ) : (
        challenges.slice(0, 5).map((c) => (
          <View key={c.id} style={[styles.challengeCard, { backgroundColor: cardBg }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.challengeTitle, { color: text }]}>{c.title}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${Math.min(100, (c.progress / c.goal) * 100)}%` }]} />
              </View>
              <Text style={{ color: sub, fontSize: 11 }}>{c.progress}/{c.goal} · +{c.gems} gems</Text>
            </View>
            {c.completed && <Ionicons name="ribbon-outline" size={20} color="#22C55E" />}
          </View>
        ))
      )}

      {/* Badges */}
      <Text style={[styles.sectionTitle, { color: text }]}>Badges · {earnedBadges}/{badges.length}</Text>
      {loading ? (
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 8 }}>{[1, 2, 3].map((i) => <Skeleton key={i} width={100} height={100} borderRadius={12} />)}</View>
      ) : (
        <View style={styles.badgesGrid}>
          {badges.slice(0, 12).map((b) => (
            <TouchableOpacity key={b.id} style={[styles.badgeItem, { backgroundColor: cardBg, opacity: b.earned ? 1 : 0.4 }]} onPress={() => setSelectedBadge(b)}>
              <Text style={{ fontSize: 28 }}>{b.earned ? '🏆' : '🔒'}</Text>
              <Text style={[styles.badgeName, { color: text }]} numberOfLines={1}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Nearby Offers */}
      <Text style={[styles.sectionTitle, { color: text }]}>Nearby Offers</Text>
      {loading ? (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={70} borderRadius={12} />)}</View>
      ) : offers.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No offers nearby</Text></View>
      ) : (
        offers.slice(0, 5).map((o) => (
          <TouchableOpacity key={o.id} style={[styles.offerCard, { backgroundColor: cardBg }]} onPress={() => setSelectedOffer(o)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.offerBiz, { color: text }]}>{o.business_name}</Text>
              <Text style={{ color: sub, fontSize: 12 }}>{o.description ?? `${o.discount_percent}% off`}</Text>
              {o.distance_km != null && <Text style={{ color: sub, fontSize: 11, marginTop: 2 }}>{o.distance_km} km away</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={sub} />
          </TouchableOpacity>
        ))
      )}

      {/* Trip History */}
      <Text style={[styles.sectionTitle, { color: text }]}>Recent Trips</Text>
      {loading ? (
        <View style={{ paddingHorizontal: 16, gap: 8 }}>{[1, 2].map((i) => <Skeleton key={i} width="100%" height={60} borderRadius={12} />)}</View>
      ) : trips.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: sub }}>No trips yet</Text></View>
      ) : (
        trips.slice(0, 5).map((t) => (
          <View key={t.id} style={[styles.tripCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.tripRoute, { color: text }]}>{t.origin} {'→'} {t.destination}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Text style={{ color: sub, fontSize: 11 }}>{t.distance_miles?.toFixed(1)} mi</Text>
              <Text style={{ color: sub, fontSize: 11 }}>{t.duration_minutes} min</Text>
              <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700' }}>{t.safety_score}</Text>
              <Text style={{ color: '#F59E0B', fontSize: 11 }}>+{t.gems_earned}</Text>
            </View>
          </View>
        ))
      )}

      {/* Weekly Insights */}
      {insights && (
        <>
          <Text style={[styles.sectionTitle, { color: text }]}>This Week</Text>
          <View style={[styles.insightsCard, { backgroundColor: cardBg }]}>
            <View style={styles.insightsRow}>
              <View style={styles.insightItem}><Text style={[styles.insightVal, { color: text }]}>{insights.total_trips}</Text><Text style={{ color: sub, fontSize: 10 }}>Trips</Text></View>
              <View style={styles.insightItem}><Text style={[styles.insightVal, { color: text }]}>{Math.round(insights.total_miles ?? 0)}</Text><Text style={{ color: sub, fontSize: 10 }}>Miles</Text></View>
              <View style={styles.insightItem}><Text style={[styles.insightVal, { color: '#F59E0B' }]}>{insights.gems_earned_week}</Text><Text style={{ color: sub, fontSize: 10 }}>Gems</Text></View>
              <View style={styles.insightItem}><Text style={[styles.insightVal, { color: '#22C55E' }]}>{insights.safety_score_avg}</Text><Text style={{ color: sub, fontSize: 10 }}>Safety</Text></View>
            </View>
            {insights.ai_tip && <Text style={{ color: sub, fontSize: 12, marginTop: 10 }}>{insights.ai_tip}</Text>}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />

      {/* Badge detail modal */}
      <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedBadge(null)}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>{selectedBadge?.earned ? '🏆' : '🔒'}</Text>
            <Text style={[styles.modalTitle, { color: text }]}>{selectedBadge?.name}</Text>
            <Text style={{ color: sub, textAlign: 'center', fontSize: 13 }}>{selectedBadge?.description}</Text>
            {!selectedBadge?.earned && <Text style={{ color: '#F59E0B', textAlign: 'center', fontSize: 12, marginTop: 8 }}>Progress: {selectedBadge?.progress}%</Text>}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Offer detail modal */}
      <Modal visible={!!selectedOffer} transparent animationType="slide" onRequestClose={() => setSelectedOffer(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedOffer(null)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: text }]}>{selectedOffer?.business_name}</Text>
            <Text style={{ color: sub, fontSize: 14, marginBottom: 12 }}>{selectedOffer?.description ?? `${selectedOffer?.discount_percent}% off`}</Text>
            <TouchableOpacity style={styles.navBtn}><Text style={styles.navBtnText}>Navigate to Business</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', margin: 16, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  emptyCard: { marginHorizontal: 16, borderRadius: 12, padding: 20, alignItems: 'center' },
  challengeCard: { marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  challengeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.15)', marginBottom: 4 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  badgeItem: { width: '30%' as any, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  badgeName: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  offerCard: { marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  offerBiz: { fontSize: 15, fontWeight: '700' },
  tripCard: { marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  tripRoute: { fontSize: 14, fontWeight: '600' },
  insightsCard: { marginHorizontal: 16, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  insightsRow: { flexDirection: 'row' },
  insightItem: { flex: 1, alignItems: 'center' },
  insightVal: { fontSize: 20, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '75%', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  navBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
