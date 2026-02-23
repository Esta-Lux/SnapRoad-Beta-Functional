// SnapRoad Mobile - Challenge Screens (History + Active Modal)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights } from '../utils/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://feature-stitch.preview.emergentagent.com';

interface Challenge {
  id: number;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  status: 'active' | 'completed' | 'failed' | 'expired';
  progress: number;
  target: number;
  gems_reward: number;
  xp_reward: number;
  start_date: string;
  end_date: string;
  icon: string;
}

const CHALLENGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'safety': 'shield-checkmark',
  'distance': 'navigate',
  'speed': 'speedometer',
  'eco': 'leaf',
  'social': 'people',
  'streak': 'flame',
  'time': 'time',
  'reports': 'alert-circle',
};

export const ChallengesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'failed'>('active');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [stats, setStats] = useState({ total_won: 0, total_lost: 0, current_streak: 0, best_streak: 0 });

  useEffect(() => { loadChallenges(); }, []);

  const loadChallenges = async () => {
    try {
      const res = await fetch(`${API_URL}/api/challenges`);
      const data = await res.json();
      if (data.success) {
        setChallenges(data.data.challenges || []);
        setStats(data.data.stats || stats);
      }
    } catch {
      // Mock data
      setChallenges([
        { id: 1, name: 'Safe Driver Week', description: 'Maintain safety score above 90 for 7 days', type: 'weekly', status: 'active', progress: 5, target: 7, gems_reward: 500, xp_reward: 2000, start_date: '2026-02-18', end_date: '2026-02-25', icon: 'safety' },
        { id: 2, name: 'Early Bird', description: 'Complete 5 trips before 9 AM', type: 'weekly', status: 'active', progress: 3, target: 5, gems_reward: 300, xp_reward: 1200, start_date: '2026-02-18', end_date: '2026-02-25', icon: 'time' },
        { id: 3, name: 'Eco Warrior', description: 'Average 30+ MPG for 100 miles', type: 'special', status: 'active', progress: 67, target: 100, gems_reward: 750, xp_reward: 3000, start_date: '2026-02-15', end_date: '2026-02-28', icon: 'eco' },
        { id: 4, name: 'Road Hero', description: 'Post 10 road reports', type: 'weekly', status: 'completed', progress: 10, target: 10, gems_reward: 400, xp_reward: 1500, start_date: '2026-02-11', end_date: '2026-02-18', icon: 'reports' },
        { id: 5, name: 'Speed Demon', description: 'Never exceed speed limit for 50 miles', type: 'daily', status: 'failed', progress: 42, target: 50, gems_reward: 200, xp_reward: 800, start_date: '2026-02-20', end_date: '2026-02-21', icon: 'speed' },
        { id: 6, name: 'Social Butterfly', description: 'Add 5 new friends', type: 'weekly', status: 'completed', progress: 5, target: 5, gems_reward: 350, xp_reward: 1400, start_date: '2026-02-04', end_date: '2026-02-11', icon: 'social' },
      ]);
      setStats({ total_won: 8, total_lost: 2, current_streak: 3, best_streak: 7 });
    }
  };

  const filteredChallenges = challenges.filter(c => {
    if (activeTab === 'active') return c.status === 'active';
    if (activeTab === 'completed') return c.status === 'completed';
    return c.status === 'failed' || c.status === 'expired';
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return '#3B82F6';
      case 'weekly': return '#8B5CF6';
      case 'special': return '#F59E0B';
      default: return Colors.primary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'failed': return '#EF4444';
      case 'expired': return '#64748B';
      default: return Colors.primary;
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#8B5CF6', '#6366F1']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Challenges</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="trophy" size={18} color="#22C55E" />
            <Text style={s.statValue}>{stats.total_won}</Text>
            <Text style={s.statLabel}>Won</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={s.statValue}>{stats.total_lost}</Text>
            <Text style={s.statLabel}>Lost</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="flame" size={18} color="#F59E0B" />
            <Text style={s.statValue}>{stats.current_streak}</Text>
            <Text style={s.statLabel}>Streak</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="star" size={18} color="#FCD34D" />
            <Text style={s.statValue}>{stats.best_streak}</Text>
            <Text style={s.statLabel}>Best</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {(['active', 'completed', 'failed'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            <View style={[s.tabBadge, { backgroundColor: tab === 'active' ? '#3B82F6' : tab === 'completed' ? '#22C55E' : '#EF4444' }]}>
              <Text style={s.tabBadgeText}>{challenges.filter(c => tab === 'active' ? c.status === 'active' : tab === 'completed' ? c.status === 'completed' : c.status === 'failed' || c.status === 'expired').length}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredChallenges.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name={activeTab === 'active' ? 'flag-outline' : activeTab === 'completed' ? 'trophy-outline' : 'sad-outline'} size={48} color={Colors.textDim} />
            <Text style={s.emptyTitle}>No {activeTab} challenges</Text>
            <Text style={s.emptySubtitle}>
              {activeTab === 'active' ? 'Check back soon for new challenges!' : activeTab === 'completed' ? 'Complete challenges to see them here' : 'Keep trying, you got this!'}
            </Text>
          </View>
        ) : (
          filteredChallenges.map(challenge => (
            <TouchableOpacity
              key={challenge.id}
              style={s.challengeCard}
              onPress={() => setSelectedChallenge(challenge)}
            >
              <View style={s.challengeHeader}>
                <View style={[s.challengeIcon, { backgroundColor: `${getTypeColor(challenge.type)}20` }]}>
                  <Ionicons name={CHALLENGE_ICONS[challenge.icon] || 'flag'} size={20} color={getTypeColor(challenge.type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.challengeName}>{challenge.name}</Text>
                    <View style={[s.typeBadge, { backgroundColor: `${getTypeColor(challenge.type)}20` }]}>
                      <Text style={[s.typeText, { color: getTypeColor(challenge.type) }]}>{challenge.type.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={s.challengeDesc}>{challenge.description}</Text>
                </View>
                {challenge.status !== 'active' && (
                  <View style={[s.statusBadge, { backgroundColor: `${getStatusColor(challenge.status)}20` }]}>
                    <Ionicons name={challenge.status === 'completed' ? 'checkmark-circle' : 'close-circle'} size={14} color={getStatusColor(challenge.status)} />
                  </View>
                )}
              </View>

              {/* Progress */}
              <View style={s.progressSection}>
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${(challenge.progress / challenge.target) * 100}%`, backgroundColor: getTypeColor(challenge.type) }]} />
                </View>
                <Text style={s.progressText}>{challenge.progress}/{challenge.target}</Text>
              </View>

              {/* Rewards */}
              <View style={s.rewardsRow}>
                <View style={s.rewardItem}>
                  <Ionicons name="diamond" size={12} color="#0EA5E9" />
                  <Text style={s.rewardValue}>+{challenge.gems_reward}</Text>
                </View>
                <View style={s.rewardItem}>
                  <Ionicons name="flash" size={12} color="#F59E0B" />
                  <Text style={s.rewardValue}>+{challenge.xp_reward} XP</Text>
                </View>
                <Text style={s.dateText}>Ends {new Date(challenge.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Challenge Detail Modal */}
      <Modal visible={!!selectedChallenge} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {selectedChallenge && (
              <>
                <View style={[s.modalIcon, { backgroundColor: `${getTypeColor(selectedChallenge.type)}20` }]}>
                  <Ionicons name={CHALLENGE_ICONS[selectedChallenge.icon] || 'flag'} size={32} color={getTypeColor(selectedChallenge.type)} />
                </View>
                <Text style={s.modalTitle}>{selectedChallenge.name}</Text>
                <View style={[s.modalTypeBadge, { backgroundColor: `${getTypeColor(selectedChallenge.type)}20` }]}>
                  <Text style={[s.modalTypeText, { color: getTypeColor(selectedChallenge.type) }]}>{selectedChallenge.type.toUpperCase()} CHALLENGE</Text>
                </View>
                <Text style={s.modalDesc}>{selectedChallenge.description}</Text>

                <View style={s.modalProgressSection}>
                  <View style={s.modalProgressBar}>
                    <View style={[s.modalProgressFill, { width: `${(selectedChallenge.progress / selectedChallenge.target) * 100}%`, backgroundColor: getTypeColor(selectedChallenge.type) }]} />
                  </View>
                  <Text style={s.modalProgressText}>{selectedChallenge.progress} / {selectedChallenge.target}</Text>
                </View>

                <View style={s.modalRewards}>
                  <View style={s.modalRewardCard}>
                    <Ionicons name="diamond" size={24} color="#0EA5E9" />
                    <Text style={s.modalRewardValue}>+{selectedChallenge.gems_reward}</Text>
                    <Text style={s.modalRewardLabel}>Gems</Text>
                  </View>
                  <View style={s.modalRewardCard}>
                    <Ionicons name="flash" size={24} color="#F59E0B" />
                    <Text style={s.modalRewardValue}>+{selectedChallenge.xp_reward}</Text>
                    <Text style={s.modalRewardLabel}>XP</Text>
                  </View>
                </View>

                <Text style={s.modalDates}>
                  {new Date(selectedChallenge.start_date).toLocaleDateString()} - {new Date(selectedChallenge.end_date).toLocaleDateString()}
                </Text>

                <TouchableOpacity style={s.modalCloseBtn} onPress={() => setSelectedChallenge(null)}>
                  <Text style={s.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  tabTextActive: { color: '#fff' },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: FontWeights.bold },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, marginTop: 12 },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4, textAlign: 'center' },
  // Challenge card
  challengeCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  challengeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  challengeName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  challengeDesc: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 9, fontWeight: FontWeights.bold },
  statusBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  rewardsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardValue: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  dateText: { color: Colors.textDim, fontSize: FontSizes.xs, marginLeft: 'auto' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 24, padding: 24, alignItems: 'center' },
  modalIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  modalTypeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  modalTypeText: { fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 1 },
  modalDesc: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  modalProgressSection: { width: '100%', marginTop: 24 },
  modalProgressBar: { height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5 },
  modalProgressFill: { height: '100%', borderRadius: 5 },
  modalProgressText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, textAlign: 'center', marginTop: 8 },
  modalRewards: { flexDirection: 'row', gap: 16, marginTop: 24 },
  modalRewardCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center' },
  modalRewardValue: { color: Colors.text, fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginTop: 8 },
  modalRewardLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  modalDates: { color: Colors.textDim, fontSize: FontSizes.xs, marginTop: 16 },
  modalCloseBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 24 },
  modalCloseBtnText: { color: '#fff', fontWeight: FontWeights.bold },
});

export default ChallengesScreen;
