// SnapRoad Mobile - Weekly Recap Screen (Premium Feature)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights } from '../utils/theme';
import { useUserStore } from '../store';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gamified-nav.preview.emergentagent.com';

interface WeeklyStats {
  total_trips: number;
  total_miles: number;
  total_time_minutes: number;
  gems_earned: number;
  xp_earned: number;
  safety_score_avg: number;
  safety_score_change: number;
  challenges_won: number;
  challenges_lost: number;
  offers_redeemed: number;
  reports_posted: number;
  streak_days: number;
  rank_change: number;
  highlights: string[];
}

const SLIDES = [
  { id: 'overview', gradient: ['#9333EA', '#EC4899'] },
  { id: 'safety', gradient: ['#059669', '#14B8A6'] },
  { id: 'challenges', gradient: ['#F97316', '#EF4444'] },
  { id: 'highlights', gradient: ['#3B82F6', '#6366F1'] },
  { id: 'community', gradient: ['#0EA5E9', '#3B82F6'] },
];

export const WeeklyRecapScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const isPremium = user?.isPremium || false;

  useEffect(() => {
    if (isPremium) loadWeeklyStats();
  }, [isPremium]);

  const loadWeeklyStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/weekly-recap`);
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      // Mock data
      setStats({
        total_trips: 12,
        total_miles: 187.5,
        total_time_minutes: 420,
        gems_earned: 2450,
        xp_earned: 15600,
        safety_score_avg: 94,
        safety_score_change: 3,
        challenges_won: 2,
        challenges_lost: 1,
        offers_redeemed: 4,
        reports_posted: 7,
        streak_days: 5,
        rank_change: 8,
        highlights: [
          'Best safety score: 98 on Wednesday',
          'Longest trip: 45 miles on Saturday',
          'Helped 23 drivers with your reports',
        ],
      });
    }
    setLoading(false);
  };

  // Non-premium gate
  if (!isPremium) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#9333EA', '#EC4899']} style={s.premiumGate}>
          <Ionicons name="trophy" size={56} color="#FCD34D" />
          <Text style={s.premiumTitle}>Weekly Recap</Text>
          <Text style={s.premiumBadge}>PREMIUM FEATURE</Text>
          <Text style={s.premiumDesc}>
            Get personalized weekly summaries of your driving stats, achievements, and progress!
          </Text>
          <TouchableOpacity style={s.upgradeBtn} onPress={() => navigation?.goBack()}>
            <Text style={s.upgradeBtnText}>Upgrade to Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.closeBtn} onPress={() => navigation?.goBack()}>
            <Text style={s.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (loading || !stats) {
    return (
      <View style={[s.container, s.loadingContainer]}>
        <View style={s.spinner} />
      </View>
    );
  }

  const renderSlide = () => {
    switch (SLIDES[currentSlide].id) {
      case 'overview':
        return (
          <View style={s.slideContent}>
            <Text style={s.slideSubtitle}>Your Week in Review</Text>
            <Text style={s.slideTitle}>Week Recap</Text>
            <View style={s.statsGrid}>
              <View style={s.statBox}>
                <Ionicons name="car" size={24} color="#fff" />
                <Text style={s.statValue}>{stats.total_trips}</Text>
                <Text style={s.statLabel}>Trips</Text>
              </View>
              <View style={s.statBox}>
                <Ionicons name="location" size={24} color="#fff" />
                <Text style={s.statValue}>{stats.total_miles.toFixed(0)}</Text>
                <Text style={s.statLabel}>Miles</Text>
              </View>
              <View style={s.statBox}>
                <Ionicons name="diamond" size={24} color="#67E8F9" />
                <Text style={s.statValue}>+{stats.gems_earned.toLocaleString()}</Text>
                <Text style={s.statLabel}>Gems</Text>
              </View>
              <View style={s.statBox}>
                <Ionicons name="flash" size={24} color="#FCD34D" />
                <Text style={s.statValue}>+{(stats.xp_earned / 1000).toFixed(1)}K</Text>
                <Text style={s.statLabel}>XP</Text>
              </View>
            </View>
          </View>
        );
      case 'safety':
        const circumference = 2 * Math.PI * 56;
        const strokeDashoffset = circumference - (stats.safety_score_avg / 100) * circumference;
        return (
          <View style={s.slideContent}>
            <Ionicons name="shield-checkmark" size={48} color="#fff" style={{ marginBottom: 16 }} />
            <Text style={s.slideSubtitle}>Average Safety Score</Text>
            <View style={s.scoreCircle}>
              <Svg width={140} height={140}>
                <Circle cx={70} cy={70} r={56} stroke="rgba(255,255,255,0.2)" strokeWidth={8} fill="none" />
                <Circle
                  cx={70} cy={70} r={56}
                  stroke="#fff"
                  strokeWidth={8}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  rotation={-90}
                  origin="70, 70"
                />
              </Svg>
              <Text style={s.scoreValue}>{stats.safety_score_avg}</Text>
            </View>
            <View style={[s.scoreBadge, stats.safety_score_change >= 0 ? s.scoreBadgeUp : s.scoreBadgeDown]}>
              <Ionicons name={stats.safety_score_change >= 0 ? 'trending-up' : 'trending-down'} size={14} color={stats.safety_score_change >= 0 ? '#A7F3D0' : '#FCA5A5'} />
              <Text style={[s.scoreBadgeText, stats.safety_score_change >= 0 ? s.scoreBadgeTextUp : s.scoreBadgeTextDown]}>
                {stats.safety_score_change >= 0 ? '+' : ''}{stats.safety_score_change} from last week
              </Text>
            </View>
          </View>
        );
      case 'challenges':
        return (
          <View style={s.slideContent}>
            <Ionicons name="trophy" size={48} color="#FCD34D" style={{ marginBottom: 16 }} />
            <Text style={s.slideSubtitle}>Challenge Results</Text>
            <View style={s.challengeStats}>
              <View style={s.challengeStat}>
                <Text style={s.challengeValue}>{stats.challenges_won}</Text>
                <Text style={s.challengeLabel}>Won</Text>
              </View>
              <View style={s.challengeDivider} />
              <View style={s.challengeStat}>
                <Text style={s.challengeValue}>{stats.challenges_lost}</Text>
                <Text style={s.challengeLabel}>Lost</Text>
              </View>
            </View>
            {stats.streak_days > 0 && (
              <View style={s.streakBadge}>
                <Ionicons name="flame" size={18} color="#FDBA74" />
                <Text style={s.streakText}>{stats.streak_days} Day Streak!</Text>
              </View>
            )}
            {stats.rank_change > 0 && (
              <Text style={s.rankChange}>
                <Ionicons name="trending-up" size={14} color="#FDBA74" /> Moved up {stats.rank_change} spots in rankings!
              </Text>
            )}
          </View>
        );
      case 'highlights':
        return (
          <View style={s.slideContent}>
            <Ionicons name="star" size={48} color="#FCD34D" style={{ marginBottom: 16 }} />
            <Text style={s.slideSubtitle}>Weekly Highlights</Text>
            <View style={s.highlightsList}>
              {stats.highlights.map((highlight, i) => (
                <View key={i} style={s.highlightItem}>
                  <View style={s.highlightIcon}>
                    <Ionicons name="medal" size={16} color="#FCD34D" />
                  </View>
                  <Text style={s.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      case 'community':
        return (
          <View style={s.slideContent}>
            <Ionicons name="people" size={48} color="#fff" style={{ marginBottom: 16 }} />
            <Text style={s.slideSubtitle}>Community Impact</Text>
            <Text style={s.impactValue}>{stats.reports_posted}</Text>
            <Text style={s.impactLabel}>Road Reports Posted</Text>
            <View style={s.impactCard}>
              <Text style={s.impactCardText}>
                Your reports helped keep the roads safer for everyone! 🛣️
              </Text>
            </View>
            <View style={s.impactStats}>
              <View style={s.impactStat}>
                <Text style={s.impactStatValue}>{stats.offers_redeemed}</Text>
                <Text style={s.impactStatLabel}>Offers Redeemed</Text>
              </View>
              <View style={s.impactStat}>
                <Text style={s.impactStatValue}>{Math.round(stats.total_time_minutes / 60)}h</Text>
                <Text style={s.impactStatLabel}>Drive Time</Text>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={SLIDES[currentSlide].gradient as [string, string]} style={s.slideContainer}>
        {/* Close Button */}
        <TouchableOpacity style={s.closeIcon} onPress={() => navigation?.goBack()}>
          <View style={s.closeIconBg}>
            <Ionicons name="close" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Slide Content */}
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {renderSlide()}
        </ScrollView>

        {/* Navigation */}
        <View style={s.navigation}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCurrentSlide(i)}
                style={[s.dot, i === currentSlide && s.dotActive]}
              />
            ))}
          </View>
          <View style={s.navButtons}>
            {currentSlide > 0 && (
              <TouchableOpacity style={s.navBtn} onPress={() => setCurrentSlide(currentSlide - 1)}>
                <Text style={s.navBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.navBtnPrimary}
              onPress={() => {
                if (currentSlide < SLIDES.length - 1) {
                  setCurrentSlide(currentSlide + 1);
                } else {
                  navigation?.goBack();
                }
              }}
            >
              <Text style={s.navBtnPrimaryText}>
                {currentSlide < SLIDES.length - 1 ? 'Next' : 'Done'}
              </Text>
              {currentSlide < SLIDES.length - 1 && <Ionicons name="chevron-forward" size={16} color="#1E293B" />}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#9333EA', borderTopColor: 'transparent' },
  // Premium gate
  premiumGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  premiumTitle: { color: '#fff', fontSize: 28, fontWeight: FontWeights.bold, marginTop: 16 },
  premiumBadge: { color: '#E9D5FF', fontSize: 12, letterSpacing: 2, marginTop: 8 },
  premiumDesc: { color: '#E9D5FF', fontSize: FontSizes.sm, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  upgradeBtn: { backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 32 },
  upgradeBtnText: { color: '#9333EA', fontWeight: FontWeights.bold, fontSize: FontSizes.md },
  closeBtn: { marginTop: 16 },
  closeBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm },
  // Slide
  slideContainer: { flex: 1 },
  closeIcon: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  closeIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 140 },
  slideContent: { alignItems: 'center' },
  slideSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  slideTitle: { color: '#fff', fontSize: 32, fontWeight: FontWeights.bold, marginTop: 4 },
  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 32, justifyContent: 'center' },
  statBox: { width: (SCREEN_W - 80) / 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: FontWeights.bold, marginTop: 8 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs, marginTop: 4 },
  // Safety
  scoreCircle: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  scoreValue: { position: 'absolute', color: '#fff', fontSize: 40, fontWeight: FontWeights.bold },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  scoreBadgeUp: { backgroundColor: 'rgba(16,185,129,0.3)' },
  scoreBadgeDown: { backgroundColor: 'rgba(239,68,68,0.3)' },
  scoreBadgeText: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  scoreBadgeTextUp: { color: '#A7F3D0' },
  scoreBadgeTextDown: { color: '#FCA5A5' },
  // Challenges
  challengeStats: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  challengeStat: { alignItems: 'center' },
  challengeValue: { color: '#fff', fontSize: 48, fontWeight: FontWeights.bold },
  challengeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs },
  challengeDivider: { width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 32 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  streakText: { color: '#fff', fontWeight: FontWeights.medium },
  rankChange: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm, marginTop: 16 },
  // Highlights
  highlightsList: { marginTop: 24, gap: 12 },
  highlightItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14 },
  highlightIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(253,224,71,0.2)', alignItems: 'center', justifyContent: 'center' },
  highlightText: { flex: 1, color: '#fff', fontSize: FontSizes.sm },
  // Community
  impactValue: { color: '#fff', fontSize: 64, fontWeight: FontWeights.bold, marginVertical: 8 },
  impactLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm },
  impactCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginTop: 24 },
  impactCardText: { color: '#E0F2FE', fontSize: FontSizes.sm, textAlign: 'center' },
  impactStats: { flexDirection: 'row', gap: 32, marginTop: 24 },
  impactStat: { alignItems: 'center' },
  impactStatValue: { color: '#fff', fontSize: 28, fontWeight: FontWeights.bold },
  impactStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs, marginTop: 4 },
  // Navigation
  navigation: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, paddingBottom: 32 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
  navButtons: { flexDirection: 'row', gap: 12 },
  navBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  navBtnText: { color: '#fff', fontWeight: FontWeights.medium },
  navBtnPrimary: { flex: 1, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  navBtnPrimaryText: { color: '#1E293B', fontWeight: FontWeights.bold },
});

export default WeeklyRecapScreen;
