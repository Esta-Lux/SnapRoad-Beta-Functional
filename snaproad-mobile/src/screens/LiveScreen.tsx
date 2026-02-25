// SnapRoad Mobile - Live Screen (Family Location Tracking)
// Real-time family member location sharing

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';
import { WebMap } from '../components/WebMap';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://feature-stitch.preview.emergentagent.com';

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  status: 'driving' | 'parked' | 'offline';
  lastLocation?: {
    lat: number;
    lng: number;
    address?: string;
    timestamp: string;
  };
  batteryLevel?: number;
  speed?: number;
  safetyScore?: number;
}

interface LiveScreenProps {
  navigation?: any;
}

export const LiveScreen: React.FC<LiveScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/family/members`);
      const data = await res.json();
      if (data.success) {
        // Add mock location data for demo
        const membersWithLocations = (data.data || []).map((m: any, idx: number) => ({
          ...m,
          status: idx === 0 ? 'driving' : idx === 1 ? 'parked' : 'offline',
          lastLocation: {
            lat: 39.9612 + (Math.random() - 0.5) * 0.05,
            lng: -82.9988 + (Math.random() - 0.5) * 0.05,
            address: idx === 0 ? 'I-270 near Easton' : idx === 1 ? 'Home' : 'Unknown',
            timestamp: new Date().toISOString(),
          },
          batteryLevel: Math.floor(Math.random() * 60) + 40,
          speed: idx === 0 ? Math.floor(Math.random() * 30) + 55 : 0,
          safetyScore: Math.floor(Math.random() * 15) + 85,
        }));
        setFamilyMembers(membersWithLocations);
        if (membersWithLocations.length > 0) {
          setSelectedMember(membersWithLocations[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch family:', e);
      // Mock data for demo
      setFamilyMembers([
        {
          id: '1',
          name: 'Sarah',
          status: 'driving',
          lastLocation: { lat: 39.9612, lng: -82.9988, address: 'I-270 near Easton', timestamp: new Date().toISOString() },
          batteryLevel: 75,
          speed: 62,
          safetyScore: 94,
        },
        {
          id: '2',
          name: 'Mike',
          status: 'parked',
          lastLocation: { lat: 39.955, lng: -82.995, address: 'Home', timestamp: new Date().toISOString() },
          batteryLevel: 45,
          speed: 0,
          safetyScore: 88,
        },
      ]);
    }
    setLoading(false);
  };

  const handleInvite = () => {
    Alert.alert(
      'Invite Family Member',
      'Share your invite link to add family members to your plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share Link', onPress: () => console.log('Share invite') },
      ]
    );
  };

  const handleSOS = (member: FamilyMember) => {
    Alert.alert(
      'Emergency SOS',
      `Send emergency alert to ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: () => console.log('SOS sent') },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'driving': return Colors.success;
      case 'parked': return Colors.warning;
      default: return Colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'driving': return 'car-sport';
      case 'parked': return 'location';
      default: return 'ellipse';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Live</Text>
        <TouchableOpacity onPress={handleInvite} style={styles.addBtn}>
          <Ionicons name="person-add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <WebMap
            center={selectedMember?.lastLocation || { lat: 39.9612, lng: -82.9988 }}
            zoom={13}
            markers={familyMembers.filter(m => m.lastLocation).map(m => ({
              id: m.id,
              lat: m.lastLocation!.lat,
              lng: m.lastLocation!.lng,
              type: m.status === 'driving' ? 'user' : 'offer',
              label: m.name,
              onPress: () => setSelectedMember(m),
            }))}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={48} color={Colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>Map View</Text>
          </View>
        )}
      </View>

      {/* Family Members List */}
      <View style={styles.membersPanel}>
        <Text style={styles.panelTitle}>Family Members</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersList}>
          {familyMembers.map(member => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberCard,
                selectedMember?.id === member.id && styles.memberCardSelected,
              ]}
              onPress={() => setSelectedMember(member)}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>{member.name[0]}</Text>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
              </View>
              <Text style={styles.memberName}>{member.name}</Text>
              <View style={styles.memberStatus}>
                <Ionicons 
                  name={getStatusIcon(member.status) as any} 
                  size={12} 
                  color={getStatusColor(member.status)} 
                />
                <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
                  {member.status === 'driving' ? `${member.speed} mph` : member.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Add Member Button */}
          <TouchableOpacity style={styles.addMemberCard} onPress={handleInvite}>
            <Ionicons name="add" size={28} color={Colors.primary} />
            <Text style={styles.addMemberText}>Invite</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Selected Member Details */}
      {selectedMember && (
        <View style={styles.detailsPanel}>
          <View style={styles.detailsHeader}>
            <View>
              <Text style={styles.detailsName}>{selectedMember.name}</Text>
              <Text style={styles.detailsLocation}>
                {selectedMember.lastLocation?.address || 'Location unknown'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.sosBtn}
              onPress={() => handleSOS(selectedMember)}
            >
              <Ionicons name="alert-circle" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="speedometer" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>{selectedMember.speed || 0}</Text>
              <Text style={styles.statLabel}>mph</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
              <Text style={styles.statValue}>{selectedMember.safetyScore || 0}</Text>
              <Text style={styles.statLabel}>score</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons 
                name={selectedMember.batteryLevel! > 20 ? 'battery-half' : 'battery-dead'} 
                size={20} 
                color={selectedMember.batteryLevel! > 20 ? Colors.success : Colors.error} 
              />
              <Text style={styles.statValue}>{selectedMember.batteryLevel || 0}%</Text>
              <Text style={styles.statLabel}>battery</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="call" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="navigate" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  addBtn: {
    padding: Spacing.xs,
  },
  mapContainer: {
    flex: 1,
    minHeight: 250,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    marginTop: Spacing.sm,
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  membersPanel: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
  },
  panelTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  membersList: {
    paddingHorizontal: Spacing.md,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    width: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberCardSelected: {
    borderColor: Colors.primary,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
  },
  memberName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: FontWeights.medium,
  },
  addMemberCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    width: 80,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addMemberText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
    marginTop: 4,
  },
  detailsPanel: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  detailsName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  detailsLocation: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sosBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  actionText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: FontWeights.medium,
    marginTop: 4,
  },
});

export default LiveScreen;
