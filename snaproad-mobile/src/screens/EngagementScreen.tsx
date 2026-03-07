// SnapRoad Mobile - Engagement Screen
// 4 sub-tabs: Badges, Skins, Progress, Reports

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';

const { width: SCREEN_W } = Dimensions.get('window');
import { API_URL } from '../config';

type EngagementTab = 'badges' | 'skins' | 'progress' | 'reports';

interface Badge {
  id: number;
  name: string;
  desc: string;
  icon: string;
  category: string;
  requirement: number;
  gems: number;
  earned: boolean;
  progress?: number;
}

interface Skin {
  id: number;
  name: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  owned: boolean;
  equipped: boolean;
}

interface EngagementScreenProps {
  navigation?: any;
}

export const EngagementScreen: React.FC<EngagementScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<EngagementTab>('badges');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [skins, setSkins] = useState<Skin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [badgeRes, skinRes] = await Promise.all([
        fetch(`${API_URL}/api/badges`),
        fetch(`${API_URL}/api/skins`),
      ]);
      
      const badgeData = await badgeRes.json();
      const skinData = await skinRes.json();
      
      if (badgeData.success) {
        const badgeArray = Array.isArray(badgeData.data) 
          ? badgeData.data 
          : badgeData.data?.badges || [];
        setBadges(badgeArray);
      }
      if (skinData.success) {
        setSkins(skinData.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch engagement data:', e);
    }
    setLoading(false);
  };

  const earnedBadges = badges.filter(b => b.earned);
  const inProgressBadges = badges.filter(b => !b.earned && (b.progress || 0) > 0);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#FBBF24';
      case 'epic': return '#A855F7';
      case 'rare': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getBadgeIcon = (icon: string) => {
    const iconMap: Record<string, string> = {
      'car': 'car-sport',
      'road': 'git-branch',
      'runner': 'flash',
      'shield': 'shield-checkmark',
      'star': 'star',
      'trophy': 'trophy',
      'medal': 'medal',
      'gem': 'diamond',
    };
    return iconMap[icon] || 'ribbon';
  };

  const renderBadgesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{earnedBadges.length}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{badges.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{inProgressBadges.length}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
      </View>

      {/* Recent Earned */}
      {earnedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Earned</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {earnedBadges.slice(0, 5).map(badge => (
              <View key={badge.id} style={styles.badgeCard}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.badgeIconBg}
                >
                  <Ionicons name={getBadgeIcon(badge.icon) as any} size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeGems}>+{badge.gems} 💎</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* In Progress */}
      {inProgressBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In Progress</Text>
          {inProgressBadges.slice(0, 3).map(badge => (
            <View key={badge.id} style={styles.progressCard}>
              <View style={styles.progressIcon}>
                <Ionicons name={getBadgeIcon(badge.icon) as any} size={20} color={Colors.primary} />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.progressName}>{badge.name}</Text>
                <Text style={styles.progressDesc}>{badge.desc}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${badge.progress || 0}%` }]} />
                </View>
              </View>
              <Text style={styles.progressPercent}>{badge.progress || 0}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* All Badges Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Badges ({badges.length})</Text>
        <View style={styles.badgesGrid}>
          {badges.map(badge => (
            <TouchableOpacity 
              key={badge.id} 
              style={[styles.gridBadge, !badge.earned && styles.gridBadgeLocked]}
            >
              <View style={[styles.gridBadgeIcon, badge.earned && styles.gridBadgeIconEarned]}>
                <Ionicons 
                  name={getBadgeIcon(badge.icon) as any} 
                  size={20} 
                  color={badge.earned ? '#fff' : Colors.textMuted} 
                />
              </View>
              <Text style={styles.gridBadgeName} numberOfLines={1}>{badge.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderSkinsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Car Skins</Text>
        <View style={styles.skinsGrid}>
          {skins.map(skin => (
            <TouchableOpacity key={skin.id} style={styles.skinCard}>
              <View style={[styles.skinPreview, { borderColor: getRarityColor(skin.rarity) }]}>
                <Ionicons name="car-sport" size={32} color={getRarityColor(skin.rarity)} />
                {skin.equipped && (
                  <View style={styles.equippedBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={styles.skinName}>{skin.name}</Text>
              <Text style={[styles.skinRarity, { color: getRarityColor(skin.rarity) }]}>
                {skin.rarity.toUpperCase()}
              </Text>
              {!skin.owned && (
                <Text style={styles.skinPrice}>{skin.price} 💎</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderProgressTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Level Card */}
      <View style={styles.levelCard}>
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.levelGradient}
        >
          <View style={styles.levelInfo}>
            <Text style={styles.levelLabel}>Current Level</Text>
            <Text style={styles.levelValue}>15</Text>
          </View>
          <View style={styles.xpInfo}>
            <Text style={styles.xpValue}>12,450 / 15,000 XP</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: '83%' }]} />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Weekly Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weeklyStats}>
          {[
            { label: 'Miles', value: '127', icon: 'speedometer' },
            { label: 'Trips', value: '23', icon: 'car' },
            { label: 'Gems', value: '450', icon: 'diamond' },
            { label: 'Score', value: '94', icon: 'shield-checkmark' },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weeklyStat}>
              <Ionicons name={stat.icon as any} size={24} color={Colors.primary} />
              <Text style={styles.weeklyValue}>{stat.value}</Text>
              <Text style={styles.weeklyLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Milestones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Milestones</Text>
        {[
          { name: '500 Miles', progress: 85, reward: 100 },
          { name: '50 Trips', progress: 46, reward: 75 },
          { name: '1000 Gems', progress: 65, reward: 50 },
        ].map((milestone, idx) => (
          <View key={idx} style={styles.milestoneCard}>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneName}>{milestone.name}</Text>
              <View style={styles.milestoneBar}>
                <View style={[styles.milestoneFill, { width: `${milestone.progress}%` }]} />
              </View>
            </View>
            <View style={styles.milestoneReward}>
              <Text style={styles.rewardValue}>+{milestone.reward}</Text>
              <Ionicons name="diamond" size={14} color={Colors.accent} />
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderReportsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Reports</Text>
        <View style={styles.reportStats}>
          <View style={styles.reportStat}>
            <Text style={styles.reportStatValue}>24</Text>
            <Text style={styles.reportStatLabel}>Submitted</Text>
          </View>
          <View style={styles.reportStat}>
            <Text style={styles.reportStatValue}>156</Text>
            <Text style={styles.reportStatLabel}>Upvotes</Text>
          </View>
          <View style={styles.reportStat}>
            <Text style={styles.reportStatValue}>450</Text>
            <Text style={styles.reportStatLabel}>Gems Earned</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {[
          { type: 'hazard', location: 'I-270 E', time: '2h ago', upvotes: 12 },
          { type: 'construction', location: 'High St', time: '1d ago', upvotes: 8 },
          { type: 'accident', location: 'Broad St', time: '3d ago', upvotes: 23 },
        ].map((report, idx) => (
          <View key={idx} style={styles.reportCard}>
            <View style={styles.reportIcon}>
              <Ionicons 
                name={report.type === 'hazard' ? 'warning' : report.type === 'construction' ? 'construct' : 'car'} 
                size={20} 
                color={Colors.warning} 
              />
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportType}>{report.type.charAt(0).toUpperCase() + report.type.slice(1)}</Text>
              <Text style={styles.reportLocation}>{report.location} · {report.time}</Text>
            </View>
            <View style={styles.reportUpvotes}>
              <Ionicons name="arrow-up" size={16} color={Colors.success} />
              <Text style={styles.upvoteCount}>{report.upvotes}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.newReportBtn} onPress={() => navigation?.navigate('HazardFeed')}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.newReportText}>Submit New Report</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Engagement</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['badges', 'skins', 'progress', 'reports'] as EngagementTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'badges' && renderBadgesTab()}
      {activeTab === 'skins' && renderSkinsTab()}
      {activeTab === 'progress' && renderProgressTab()}
      {activeTab === 'reports' && renderReportsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 8,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  badgeCard: {
    width: 100,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  badgeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    textAlign: 'center',
  },
  badgeGems: {
    fontSize: FontSizes.xs,
    color: Colors.accent,
    marginTop: 2,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  progressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  progressName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  progressDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressPercent: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridBadge: {
    width: (SCREEN_W - 32 - 32) / 5,
    alignItems: 'center',
    padding: Spacing.xs,
  },
  gridBadgeLocked: {
    opacity: 0.5,
  },
  gridBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBadgeIconEarned: {
    backgroundColor: Colors.success,
  },
  gridBadgeName: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  skinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skinCard: {
    width: (SCREEN_W - 32 - 24) / 3,
    alignItems: 'center',
  },
  skinPreview: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  equippedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinName: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  skinRarity: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
  },
  skinPrice: {
    fontSize: FontSizes.xs,
    color: Colors.accent,
    marginTop: 2,
  },
  levelCard: {
    marginBottom: Spacing.lg,
  },
  levelGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  levelInfo: {
    marginBottom: Spacing.sm,
  },
  levelLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  levelValue: {
    fontSize: 48,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  xpInfo: {},
  xpValue: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  xpBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  weeklyStat: {
    alignItems: 'center',
  },
  weeklyValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: 4,
  },
  weeklyLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginBottom: 6,
  },
  milestoneBar: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
  },
  milestoneFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },
  milestoneReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: Spacing.md,
  },
  rewardValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.accent,
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reportStat: {
    alignItems: 'center',
  },
  reportStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  reportStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  reportType: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
  },
  reportLocation: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reportUpvotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upvoteCount: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.success,
  },
  newReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  newReportText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
});

export default EngagementScreen;
