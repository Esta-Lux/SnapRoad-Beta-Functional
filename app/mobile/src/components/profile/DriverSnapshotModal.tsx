import React, { useRef } from 'react';
import { Alert, Dimensions, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SheetModal from '../common/Modal';
import { useTheme } from '../../contexts/ThemeContext';
import type { User } from '../../types';
import type { ProfileWeeklyRecap } from './types';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  weeklyRecap: ProfileWeeklyRecap;
};

function formatGems(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** Bottom sheet: preview stats, then system share — matches app sheet + theme tokens. */
export default function DriverSnapshotModal({ visible, onClose, user, weeklyRecap }: Props) {
  const cardRef = useRef<View>(null);
  const { colors, spacing, typography } = useTheme();
  const w = Dimensions.get('window').width;
  const score = Math.round(user?.safetyScore ?? 0);
  const ringSize = Math.min(160, w * 0.4);

  const shareMessage = [
    `SnapRoad — ${user?.name ?? 'Driver'}`,
    `Safety score: ${score}`,
    `Gems ${user?.gems ?? 0} · Trips ${user?.totalTrips ?? 0} · Miles ${(user?.totalMiles ?? 0).toFixed(1)}`,
    user?.isPremium && weeklyRecap.totalTrips > 0
      ? `This week: ${weeklyRecap.totalTrips} trips, ${weeklyRecap.totalMiles.toFixed(1)} mi, avg safety ${weeklyRecap.avgSafetyScore}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const handleShare = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.92 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'My SnapRoad snapshot' });
      } else {
        await Share.share({ message: shareMessage, title: 'My SnapRoad snapshot', url: uri });
      }
    } catch {
      try {
        await Share.share({ message: shareMessage, title: 'My SnapRoad snapshot' });
      } catch {
        Alert.alert('Share', 'Could not open the share sheet.');
      }
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={[styles.headerRow, { marginBottom: spacing.md }]}>
        <Text style={[typography.h2, { color: colors.text, flex: 1 }]} numberOfLines={2}>
          Driving snapshot
        </Text>
      </View>

      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
        Review your stats, then share with the system sheet.
      </Text>

      <View
        ref={cardRef}
        collapsable={false}
        style={[styles.summaryCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
      >
        <View style={styles.routeRow}>
          <Ionicons name="navigate-outline" size={22} color={colors.primary} />
          <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={2}>
            {weeklyRecap.totalTrips > 0
              ? `${weeklyRecap.totalTrips} trips this week · ${weeklyRecap.totalMiles.toFixed(1)} mi`
              : 'Keep driving to build your snapshot'}
          </Text>
        </View>

        <View style={styles.ringWrap}>
          <View
            style={[
              styles.ringOuter,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderColor: colors.warning,
                backgroundColor: `${colors.warning}18`,
              },
            ]}
          >
            <Text style={[styles.scoreNum, { color: colors.text }]}>{score}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>Safety score</Text>
          </View>
          <View style={[styles.safePill, { backgroundColor: `${colors.success}22` }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.success} />
            <Text style={[typography.caption, { color: colors.success }]}>Safe driving focus</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {(
            [
              { icon: 'diamond-outline' as const, val: formatGems(user?.gems ?? 0), lbl: 'Gems' },
              { icon: 'trending-up-outline' as const, val: String(user?.level ?? 1), lbl: 'Level' },
              { icon: 'car-outline' as const, val: String(user?.totalTrips ?? 0), lbl: 'Trips' },
              {
                icon: 'location-outline' as const,
                val:
                  (user?.totalMiles ?? 0) >= 1000
                    ? `${((user?.totalMiles ?? 0) / 1000).toFixed(1)}K`
                    : (user?.totalMiles ?? 0).toFixed(1),
                lbl: 'Miles',
              },
            ] as const
          ).map((s) => (
            <View key={s.lbl} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={s.icon} size={20} color={colors.primary} />
              <Text style={[styles.statVal, { color: colors.text }]}>{s.val}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.xpBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Ionicons name="flash-outline" size={18} color={colors.primary} />
          <Text style={[typography.body, { color: colors.text, flex: 1, fontWeight: '600' }]}>XP total</Text>
          <Text style={[typography.body, { color: colors.primary, fontWeight: '800' }]}>+{(user?.xp ?? 0).toLocaleString()}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={handleShare} activeOpacity={0.85} accessibilityRole="button" style={{ marginTop: spacing.md }}>
        <LinearGradient colors={[colors.ctaGradientStart, colors.ctaGradientEnd]} style={styles.shareGrad}>
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.shareBtnText}>Share</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  summaryCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  ringWrap: { alignItems: 'center', marginBottom: 16 },
  ringOuter: { borderWidth: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  scoreNum: { fontSize: 40, fontWeight: '900' },
  safePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, marginTop: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statBox: {
    flexGrow: 1,
    minWidth: '22%',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statVal: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  xpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shareGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, minHeight: 48 },
  shareBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
