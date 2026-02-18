// SnapRoad Mobile - Family Screen
// Aligned with /app/frontend/src/components/figma-ui/mobile/Family.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../utils/theme';
import { Card, Avatar, Badge } from '../components/ui';

interface FamilyScreenProps {
  navigation?: any;
  onNavigate?: (screen: string) => void;
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  avatar?: string;
  isOnline: boolean;
  safetyScore: number;
  lastLocation?: string;
  lastActive?: string;
  isDriving: boolean;
}

export const FamilyScreen: React.FC<FamilyScreenProps> = ({ navigation, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('map');
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleNavigate = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else if (navigation) {
      navigation.navigate(screen);
    }
  };

  // Mock family data
  const familyMembers: FamilyMember[] = [
    {
      id: '1',
      name: 'Sarah',
      relation: 'Spouse',
      isOnline: true,
      safetyScore: 96,
      lastLocation: 'Downtown Office',
      isDriving: false,
    },
    {
      id: '2',
      name: 'Mike Jr.',
      relation: 'Son',
      isOnline: true,
      safetyScore: 88,
      lastLocation: 'On the road',
      isDriving: true,
    },
    {
      id: '3',
      name: 'Emma',
      relation: 'Daughter',
      isOnline: false,
      safetyScore: 94,
      lastLocation: 'School',
      lastActive: '2h ago',
      isDriving: false,
    },
    {
      id: '4',
      name: 'Grandma Rose',
      relation: 'Parent',
      isOnline: false,
      safetyScore: 91,
      lastLocation: 'Home',
      lastActive: 'Yesterday',
      isDriving: false,
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 95) return Colors.success;
    if (score >= 85) return Colors.primary;
    if (score >= 70) return Colors.warning;
    return Colors.error;
  };

  const MemberCard = ({ member }: { member: FamilyMember }) => (
    <TouchableOpacity
      onPress={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
      activeOpacity={0.8}
    >
      <Card style={[styles.memberCard, selectedMember === member.id && styles.memberCardSelected]}>
        <View style={styles.memberHeader}>
          {/* Avatar with status */}
          <View style={styles.avatarContainer}>
            <Avatar name={member.name} size={50} />
            <View style={[styles.onlineIndicator, { backgroundColor: member.isOnline ? Colors.success : Colors.textMuted }]} />
          </View>

          {/* Info */}
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{member.name}</Text>
              {member.isDriving && (
                <View style={styles.drivingBadge}>
                  <Ionicons name="car" size={12} color={Colors.text} />
                  <Text style={styles.drivingText}>Driving</Text>
                </View>
              )}
            </View>
            <Text style={styles.memberRelation}>{member.relation}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={Colors.textSecondary} />
              <Text style={styles.locationText}>
                {member.lastLocation}
                {!member.isOnline && member.lastActive && ` · ${member.lastActive}`}
              </Text>
            </View>
          </View>

          {/* Safety Score */}
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(member.safetyScore) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(member.safetyScore) }]}>
              {member.safetyScore}
            </Text>
          </View>
        </View>

        {/* Expanded Actions */}
        {selectedMember === member.id && (
          <View style={styles.memberActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="navigate" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="call" size={20} color={Colors.success} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble" size={20} color={Colors.accent} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
              <Text style={styles.actionText}>More</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="person-add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => handleNavigate('live-locations')}
          >
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.quickActionIcon}
            >
              <Ionicons name="location" size={24} color={Colors.text} />
            </LinearGradient>
            <Text style={styles.quickActionText}>Live{'\n'}Locations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.surface }]}>
              <Ionicons name="notifications" size={24} color={Colors.warning} />
            </View>
            <Text style={styles.quickActionText}>Safety{'\n'}Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.surface }]}>
              <Ionicons name="stats-chart" size={24} color={Colors.success} />
            </View>
            <Text style={styles.quickActionText}>Family{'\n'}Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.surface }]}>
              <Ionicons name="settings" size={24} color={Colors.textSecondary} />
            </View>
            <Text style={styles.quickActionText}>Group{'\n'}Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Family Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Family Safety Score</Text>
            <Badge label="Excellent" variant="success" />
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>92</Text>
              <Text style={styles.summaryLabel}>Avg Score</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>4</Text>
              <Text style={styles.summaryLabel}>Members</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>2</Text>
              <Text style={styles.summaryLabel}>Online</Text>
            </View>
          </View>
        </Card>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Members</Text>
          <Text style={styles.memberCount}>{familyMembers.length} members</Text>
        </View>

        {/* Members List */}
        {familyMembers.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}

        {/* Add Member Button */}
        <TouchableOpacity style={styles.addMemberButton}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.addMemberText}>Invite Family Member</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  addButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.surfaceLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  memberCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  memberCard: {
    marginBottom: Spacing.sm,
  },
  memberCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  drivingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  drivingText: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    fontWeight: FontWeights.medium,
  },
  memberRelation: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  addMemberText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
});

export default FamilyScreen;
