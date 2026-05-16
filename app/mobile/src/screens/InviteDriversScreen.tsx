import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getMyReferrals } from '../api/referrals';
import {
  formatStatusLabel,
  type ReferralAchievement,
  type ReferralDashboard,
  type ReferralStatus,
  type RecentReferral,
} from '../api/dto/referrals';
import type { ProfileStackParamList } from '../navigation/types';

type Nav = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const SHARE_MESSAGE = (url: string) =>
  `Join me on SnapRoad — drive smarter, earn gems, and unlock rewards on the road: ${url}`;

const EMPTY_DASHBOARD: ReferralDashboard = {
  code: '',
  inviteUrl: '',
  invitedCount: 0,
  verifiedCount: 0,
  pendingCount: 0,
  declinedCount: 0,
  gemsEarned: 0,
  rewardPerSignup: 100,
  nextRewardTarget: 1,
  nextRewardLabel: 'First Invite',
  progressPercent: 0,
  achievements: [],
  recentReferrals: [],
};

export default function InviteDriversScreen() {
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { isAuthenticated } = useAuth();

  const [dashboard, setDashboard] = useState<ReferralDashboard>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setError(null);
    const res = await getMyReferrals();
    if (res.success && res.data) {
      setDashboard(res.data);
    } else if (!res.success) {
      setError(res.error ?? 'Could not load your referrals');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [isAuthenticated, loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard({ silent: true });
  }, [loadDashboard]);

  const codeDisplay = dashboard.code ? `SNAP-${dashboard.code}` : '';
  const inviteUrl = dashboard.inviteUrl;
  const canShare = Boolean(inviteUrl);

  const handleCopyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await Clipboard.setStringAsync(inviteUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Link copied', 'Your invite link is on the clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Could not copy the link. Try sharing it instead.');
    }
  }, [inviteUrl]);

  const handleCopyCode = useCallback(async () => {
    if (!codeDisplay) return;
    try {
      await Clipboard.setStringAsync(codeDisplay);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Code copied', `${codeDisplay} is on the clipboard.`);
    } catch {
      Alert.alert('Copy failed', 'Could not copy the code.');
    }
  }, [codeDisplay]);

  const handleShare = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      const message = SHARE_MESSAGE(inviteUrl);
      const result = await Share.share(
        { message, url: inviteUrl, title: 'Join me on SnapRoad' },
        { dialogTitle: 'Invite a driver' },
      );
      if (result.action === Share.dismissedAction) {
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Fall back to copying the link if the share sheet fails.
      handleCopyLink();
    }
  }, [inviteUrl, handleCopyLink]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.signedOutWrap, { backgroundColor: colors.background }]}>
        <Ionicons name="person-add-outline" size={56} color={colors.textSecondary} />
        <Text style={[styles.signedOutTitle, { color: colors.text }]}>Sign in to invite drivers</Text>
        <Text style={[styles.signedOutSubtitle, { color: colors.textSecondary }]}>
          Create an account to get your unique invite link and earn gems for every driver you bring on board.
        </Text>
        <TouchableOpacity
          style={[styles.signedOutCta, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Auth', { mode: 'signup' })}
        >
          <Text style={styles.signedOutCtaText}>Create account</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invite Drivers</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name="warning-outline" size={16} color={colors.danger} />
                <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700', flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            <HeroCard
              gemsEarned={dashboard.gemsEarned}
              rewardPerSignup={dashboard.rewardPerSignup}
              colors={colors}
            />

            <CodeCard
              code={codeDisplay}
              inviteUrl={inviteUrl}
              colors={colors}
              isLight={isLight}
              onCopyLink={handleCopyLink}
              onCopyCode={handleCopyCode}
              onShare={handleShare}
              canShare={canShare}
            />

            <StatsRow
              invited={dashboard.invitedCount}
              verified={dashboard.verifiedCount}
              gems={dashboard.gemsEarned}
              colors={colors}
            />

            <ProgressCard
              verified={dashboard.verifiedCount}
              target={dashboard.nextRewardTarget}
              label={dashboard.nextRewardLabel}
              progressPercent={dashboard.progressPercent}
              colors={colors}
            />

            <AchievementsRow achievements={dashboard.achievements} colors={colors} />

            <RecentReferralsList recent={dashboard.recentReferrals} colors={colors} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ───────────────────────────── Pieces ─────────────────────────────

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function HeroCard({
  gemsEarned,
  rewardPerSignup,
  colors,
}: Readonly<{
  gemsEarned: number;
  rewardPerSignup: number;
  colors: ThemeColors;
}>) {
  return (
    <LinearGradient
      colors={[colors.rewardsGradientStart, colors.rewardsGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="gift-outline" size={26} color="#fff" />
        </View>
        <View style={styles.heroGemPill}>
          <Ionicons name="diamond" size={12} color="#FFD166" />
          <Text style={styles.heroGemPillText}>+{rewardPerSignup} per signup</Text>
        </View>
      </View>
      <Text style={styles.heroTitle}>Invite Drivers</Text>
      <Text style={styles.heroSubtitle}>Share SnapRoad and earn gems when friends join.</Text>
      <View style={styles.heroBalanceRow}>
        <Ionicons name="diamond" size={18} color="#FFD166" />
        <Text style={styles.heroBalanceValue}>{gemsEarned.toLocaleString()}</Text>
        <Text style={styles.heroBalanceLabel}>gems earned</Text>
      </View>
    </LinearGradient>
  );
}

function CodeCard({
  code,
  inviteUrl,
  colors,
  isLight,
  onCopyLink,
  onCopyCode,
  onShare,
  canShare,
}: Readonly<{
  code: string;
  inviteUrl: string;
  colors: ThemeColors;
  isLight: boolean;
  onCopyLink: () => void;
  onCopyCode: () => void;
  onShare: () => void;
  canShare: boolean;
}>) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Your invite link</Text>
      <View
        style={[
          styles.linkBox,
          { backgroundColor: isLight ? '#F4F4F8' : 'rgba(255,255,255,0.06)', borderColor: colors.border },
        ]}
      >
        <Text numberOfLines={1} style={[styles.linkText, { color: colors.text }]}>
          {inviteUrl || 'Generating your link…'}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: canShare ? 1 : 0.5 }]}
          onPress={onShare}
          disabled={!canShare}
        >
          <Ionicons name="share-social-outline" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Share Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          onPress={onCopyLink}
          disabled={!canShare}
        >
          <Ionicons name="link-outline" size={16} color={colors.text} />
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Copy Link</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.codeChipRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        onPress={onCopyCode}
        disabled={!code}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.codeChipLabel, { color: colors.textSecondary }]}>Referral code</Text>
          <Text style={[styles.codeChipValue, { color: colors.text }]} numberOfLines={1}>
            {code || '—'}
          </Text>
        </View>
        <Ionicons name="copy-outline" size={18} color={colors.text} />
        <Text style={[styles.codeChipCta, { color: colors.text }]}>Copy Code</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatsRow({
  invited,
  verified,
  gems,
  colors,
}: Readonly<{
  invited: number;
  verified: number;
  gems: number;
  colors: ThemeColors;
}>) {
  return (
    <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <StatItem icon="people-outline" value={invited} label="Drivers Invited" colors={colors} />
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <StatItem icon="checkmark-circle-outline" value={verified} label="Verified" colors={colors} />
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <StatItem icon="diamond-outline" value={gems} label="Gems Earned" colors={colors} />
    </View>
  );
}

function StatItem({
  icon,
  value,
  label,
  colors,
}: Readonly<{
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  colors: ThemeColors;
}>) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value.toLocaleString()}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function ProgressCard({
  verified,
  target,
  label,
  progressPercent,
  colors,
}: Readonly<{
  verified: number;
  target: number | null;
  label: string | null;
  progressPercent: number;
  colors: ThemeColors;
}>) {
  if (!target) {
    return (
      <View style={[styles.card, styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>All achievements unlocked!</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          You're a SnapRoad Road Builder — keep inviting to grow the SnapRoad community.
        </Text>
      </View>
    );
  }
  const percent = Math.max(0, Math.min(100, progressPercent));
  return (
    <View style={[styles.card, styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {verified} / {target} verified invites
      </Text>
      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
        toward your next badge{label ? ` · ${label}` : ''}
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: 'rgba(148,163,184,0.25)' }]}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.progressPercentText, { color: colors.textSecondary }]}>{percent}%</Text>
    </View>
  );
}

function AchievementsRow({
  achievements,
  colors,
}: Readonly<{
  achievements: ReferralAchievement[];
  colors: ThemeColors;
}>) {
  const items = achievements.length
    ? achievements
    : [
        { key: 'first_invite', label: 'First Invite', requirement: 1, unlocked: false },
        { key: 'five_drivers', label: '5 Drivers', requirement: 5, unlocked: false },
        { key: 'ten_drivers', label: '10 Drivers', requirement: 10, unlocked: false },
        { key: 'road_builder', label: 'Road Builder', requirement: 25, unlocked: false },
      ];
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {items.map((a) => (
          <View
            key={a.key}
            style={[
              styles.badgeTile,
              {
                backgroundColor: colors.card,
                borderColor: a.unlocked ? colors.primary : colors.border,
                opacity: a.unlocked ? 1 : 0.65,
              },
            ]}
          >
            <View
              style={[
                styles.badgeIconWrap,
                { backgroundColor: a.unlocked ? colors.primary : colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name={achievementIcon(a.key)}
                size={20}
                color={a.unlocked ? '#fff' : colors.textSecondary}
              />
            </View>
            <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>
              {a.label}
            </Text>
            <Text style={[styles.badgeRequirement, { color: colors.textSecondary }]}>
              {a.requirement} {a.requirement === 1 ? 'invite' : 'invites'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function achievementIcon(key: string): keyof typeof Ionicons.glyphMap {
  switch (key) {
    case 'first_invite':
      return 'sparkles-outline';
    case 'five_drivers':
      return 'people-circle-outline';
    case 'ten_drivers':
      return 'trophy-outline';
    case 'road_builder':
      return 'medal-outline';
    default:
      return 'ribbon-outline';
  }
}

function RecentReferralsList({
  recent,
  colors,
}: Readonly<{
  recent: RecentReferral[];
  colors: ThemeColors;
}>) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Referrals</Text>
      {recent.length === 0 ? (
        <View
          style={[
            styles.card,
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="people-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No invites yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your invites will show up here once friends sign up using your link.
          </Text>
        </View>
      ) : (
        recent.map((row, idx) => (
          <RecentRow key={`${row.email || 'guest'}-${idx}`} row={row} colors={colors} />
        ))
      )}
    </View>
  );
}

function RecentRow({
  row,
  colors,
}: Readonly<{
  row: RecentReferral;
  colors: ThemeColors;
}>) {
  const pillColors = statusPillColors(row.status, colors);
  return (
    <View
      style={[
        styles.recentRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentEmail, { color: colors.text }]} numberOfLines={1}>
          {row.email || 'Pending driver'}
        </Text>
        <Text style={[styles.recentSub, { color: colors.textSecondary }]}>
          {formatJoinedDate(row.joinedAt)}
          {row.status === 'verified' && row.gemsAwarded > 0
            ? ` · +${row.gemsAwarded} gems`
            : ''}
        </Text>
      </View>
      <View
        style={[
          styles.statusPill,
          { backgroundColor: pillColors.bg, borderColor: pillColors.border },
        ]}
      >
        <Text style={[styles.statusPillText, { color: pillColors.text }]}>
          {formatStatusLabel(row.status)}
        </Text>
      </View>
    </View>
  );
}

function statusPillColors(
  status: ReferralStatus,
  colors: ThemeColors,
): { bg: string; border: string; text: string } {
  switch (status) {
    case 'verified':
      return { bg: 'rgba(52,199,89,0.15)', border: 'rgba(52,199,89,0.4)', text: colors.success };
    case 'declined':
      return { bg: 'rgba(255,59,48,0.12)', border: 'rgba(255,59,48,0.35)', text: colors.danger };
    case 'pending':
    default:
      return { bg: 'rgba(255,149,0,0.12)', border: 'rgba(255,149,0,0.35)', text: colors.warning };
  }
}

function formatJoinedDate(joinedAt: string | null): string {
  if (!joinedAt) return 'Awaiting signup';
  try {
    const d = new Date(joinedAt);
    if (Number.isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroGemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroGemPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 18 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  heroBalanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 },
  heroBalanceValue: { fontSize: 30, fontWeight: '900', color: '#fff' },
  heroBalanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

  card: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSubtitle: { fontSize: 12, marginTop: 4 },
  linkBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkText: { fontSize: 13, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },

  codeChipRow: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeChipLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  codeChipValue: { fontSize: 16, fontWeight: '800', marginTop: 2, letterSpacing: 1.5 },
  codeChipCta: { fontSize: 12, fontWeight: '800' },

  statsRow: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 14,
  },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4 },
  statItem: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },

  progressCard: { marginTop: 14 },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', borderRadius: 999 },
  progressPercentText: { fontSize: 11, marginTop: 6, fontWeight: '700', textAlign: 'right' },

  sectionTitle: { fontSize: 14, fontWeight: '800', marginHorizontal: 16, marginBottom: 8 },

  badgeTile: {
    width: 120,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 6,
  },
  badgeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  badgeRequirement: { fontSize: 10, fontWeight: '600' },

  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyTitle: { fontSize: 14, fontWeight: '800' },
  emptySubtitle: { fontSize: 12, textAlign: 'center', paddingHorizontal: 12 },

  recentRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentEmail: { fontSize: 14, fontWeight: '700' },
  recentSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  signedOutWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 12 },
  signedOutTitle: { fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  signedOutSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  signedOutCta: { marginTop: 16, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  signedOutCtaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
