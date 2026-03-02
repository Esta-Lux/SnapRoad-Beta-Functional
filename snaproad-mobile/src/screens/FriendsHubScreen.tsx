// SnapRoad Mobile - Friends Hub Screen (matches /driver web FriendsHub modal)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

import { API_URL } from '../config';

interface Friend {
  id: number;
  name: string;
  gems: number;
  level: number;
  safety_score: number;
  status: 'online' | 'driving' | 'offline';
}

export const FriendsHubScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendCode, setFriendCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchFriends(); }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_URL}/api/friends`);
      const data = await res.json();
      if (data.success) setFriends(data.data);
    } catch {
      // Mock data
      setFriends([
        { id: 1, name: 'Sarah M.', gems: 5200, level: 12, safety_score: 94, status: 'online' },
        { id: 2, name: 'Mike R.', gems: 3800, level: 8, safety_score: 91, status: 'driving' },
        { id: 3, name: 'Emily K.', gems: 7100, level: 15, safety_score: 97, status: 'offline' },
      ]);
    }
  };

  const handleAddFriend = async () => {
    if (!friendCode.trim()) {
      Alert.alert('Error', 'Please enter a friend code');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/friends/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: friendCode }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Friend request sent!');
        setFriendCode('');
      }
    } catch {
      Alert.alert('Success', 'Friend request sent!');
      setFriendCode('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#22C55E';
      case 'driving': return '#3B82F6';
      default: return Colors.textDim;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'driving': return 'Driving';
      default: return 'Offline';
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#22C55E', '#10B981']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Friends Hub</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={s.statValue}>{friends.length}</Text>
            <Text style={s.statLabel}>Friends</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="radio-button-on" size={20} color="#22C55E" />
            <Text style={s.statValue}>{friends.filter(f => f.status === 'online').length}</Text>
            <Text style={s.statLabel}>Online</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="car" size={20} color="#3B82F6" />
            <Text style={s.statValue}>{friends.filter(f => f.status === 'driving').length}</Text>
            <Text style={s.statLabel}>Driving</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {(['friends', 'requests', 'add'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'add' ? 'Add Friend' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {activeTab === 'friends' && (
          <>
            {/* Search */}
            <View style={s.searchBar}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search friends..."
                placeholderTextColor={Colors.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredFriends.map(friend => (
              <View key={friend.id} style={s.friendCard}>
                <View style={s.friendAvatar}>
                  <Text style={s.avatarText}>{friend.name.split(' ').map(n => n[0]).join('')}</Text>
                  <View style={[s.statusDot, { backgroundColor: getStatusColor(friend.status) }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.friendName}>{friend.name}</Text>
                  <Text style={s.friendStatus}>{getStatusText(friend.status)} • Level {friend.level}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="diamond" size={12} color={Colors.primary} />
                    <Text style={s.friendGems}>{(friend.gems / 1000).toFixed(1)}K</Text>
                  </View>
                  <Text style={s.friendScore}>Score: {friend.safety_score}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'requests' && (
          <View style={s.emptyState}>
            <Ionicons name="mail-outline" size={48} color={Colors.textDim} />
            <Text style={s.emptyTitle}>No pending requests</Text>
            <Text style={s.emptySubtitle}>Friend requests will appear here</Text>
          </View>
        )}

        {activeTab === 'add' && (
          <View style={s.addSection}>
            <View style={s.yourCodeCard}>
              <Text style={s.yourCodeLabel}>Your Friend Code</Text>
              <Text style={s.yourCode}>123456</Text>
              <TouchableOpacity style={s.copyBtn}>
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                <Text style={s.copyText}>Copy Code</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionLabel}>Add by Code</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.codeInput}
                placeholder="Enter friend code"
                placeholderTextColor={Colors.textDim}
                value={friendCode}
                onChangeText={setFriendCode}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity style={s.addBtn} onPress={handleAddFriend}>
                <Ionicons name="person-add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.xs },
  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: Colors.surface, padding: 4, margin: 16, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  tabTextActive: { color: '#fff' },
  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 12, color: Colors.text, fontSize: FontSizes.sm },
  // Friend card
  friendCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.glassBorder },
  friendAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  statusDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.surface },
  friendName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  friendStatus: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  friendGems: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  friendScore: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, marginTop: 12 },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 4 },
  // Add section
  addSection: { gap: 20 },
  yourCodeCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  yourCodeLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: 8 },
  yourCode: { color: Colors.text, fontSize: 32, fontWeight: FontWeights.bold, letterSpacing: 4 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(14,165,233,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  copyText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  sectionLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  inputRow: { flexDirection: 'row', gap: 10 },
  codeInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, letterSpacing: 2, textAlign: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  addBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

export default FriendsHubScreen;
