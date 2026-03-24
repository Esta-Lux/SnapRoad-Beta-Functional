import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Alert,
  TextInput, Modal, SafeAreaView, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import FamilyDashboard from '../components/family/FamilyDashboard';
import Skeleton from '../components/common/Skeleton';
import type { Friend } from '../types';

type Section = 'friends' | 'family';

export default function DashboardScreen() {
  const { isLight, colors } = useTheme();
  const { user } = useAuth();
  const [section, setSection] = useState<Section>('friends');
  const bg = colors.background;
  const cardBg = colors.card;
  const text = colors.text;
  const sub = colors.textSecondary;

  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Family state
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const res = await api.get<any>('/api/friends/list');
      const data = (res.data as any)?.data ?? res.data;
      setFriends(Array.isArray(data) ? data : []);
    } catch {} finally { setFriendsLoading(false); }
  }, []);

  const checkFamily = useCallback(async () => {
    setFamilyLoading(true);
    try {
      const res = await api.get<any>('/api/family/members');
      const data = (res.data as any)?.data ?? res.data;
      const hasMems = Array.isArray(data) ? data.length > 0 : !!(data as any)?.group_id;
      setHasFamily(hasMems);
    } catch { setHasFamily(false); } finally { setFamilyLoading(false); }
  }, []);

  useEffect(() => {
    if (section === 'friends') loadFriends();
    else checkFamily();
  }, [section, loadFriends, checkFamily]);

  const handleAddFriend = useCallback(async () => {
    if (!friendCode.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const res = await api.post('/api/friends/add', { user_id: friendCode.trim() });
    if (res.success) { Alert.alert('Sent', 'Friend request sent!'); setShowAddFriend(false); setFriendCode(''); loadFriends(); }
    else Alert.alert('Error', res.error ?? 'Could not add friend');
  }, [friendCode, loadFriends]);

  const handleRemoveFriend = useCallback(async (id: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await api.post(`/api/friends/remove`, { friend_id: id });
        setSelectedFriend(null);
        loadFriends();
      }},
    ]);
  }, [loadFriends]);

  const handleCreateFamily = useCallback(async () => {
    if (!familyName.trim()) return;
    const res = await api.post('/api/family/create', { name: familyName.trim() });
    if (res.success) { setShowCreateFamily(false); setHasFamily(true); checkFamily(); }
    else Alert.alert('Error', res.error ?? 'Could not create group');
  }, [familyName, checkFamily]);

  const handleJoinFamily = useCallback(async () => {
    if (!joinCode.trim()) return;
    const res = await api.post('/api/family/join', { invite_code: joinCode.trim() });
    if (res.success) { setShowJoinFamily(false); setHasFamily(true); checkFamily(); }
    else Alert.alert('Error', res.error ?? 'Invalid invite code');
  }, [joinCode, checkFamily]);

  const onlineCount = friends.filter((f) => f.status === 'accepted' && f.is_sharing).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Section toggle */}
      <View style={[styles.toggleRow, { backgroundColor: colors.surfaceSecondary }]}>
        {(['friends', 'family'] as Section[]).map((s) => (
          <TouchableOpacity key={s} style={[styles.togglePill, section === s && { backgroundColor: colors.primary }]} onPress={() => setSection(s)}>
            <Text style={[styles.toggleText, { color: section === s ? '#fff' : sub }]}>{s === 'friends' ? 'Friends' : 'Family'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Friends section */}
      {section === 'friends' && (
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: text }]}>Friends{onlineCount > 0 ? ` · ${onlineCount} online` : ''}</Text>
          </View>
          {friendsLoading ? (
            <View style={{ padding: 16, gap: 12 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={60} borderRadius={12} />)}
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={40} color={sub} />
              <Text style={[styles.emptyTitle, { color: text }]}>No friends yet</Text>
              <Text style={[styles.emptySub, { color: sub }]}>Add friends to see them on the map</Text>
            </View>
          ) : (
            <FlatList data={friends} keyExtractor={(f) => f.id}
              refreshControl={<RefreshControl refreshing={friendsLoading} onRefresh={loadFriends} tintColor="#3B82F6" />}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
              renderItem={({ item: f }) => {
                const initials = (f.name ?? 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const online = f.status === 'accepted' && f.is_sharing;
                return (
                  <TouchableOpacity style={[styles.friendCard, { backgroundColor: cardBg }]} onPress={() => setSelectedFriend(f)}>
                    <View style={styles.friendAvatar}><Text style={styles.friendInitials}>{initials}</Text></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.friendName, { color: text }]}>{f.name}</Text>
                      <Text style={{ color: sub, fontSize: 12 }}>
                        {online && (f.speed_mph ?? 0) > 3 ? `Driving · ${Math.round(f.speed_mph ?? 0)} mph` : online ? 'Online' : f.status === 'pending' ? 'Pending' : 'Offline'}
                      </Text>
                    </View>
                    {online && <View style={styles.onlineDot} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
          <TouchableOpacity style={styles.addFriendBtn} onPress={() => setShowAddFriend(true)}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.addFriendText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Family section */}
      {section === 'family' && (
        <View style={{ flex: 1 }}>
          {familyLoading ? (
            <View style={{ padding: 16, gap: 12 }}>
              <Skeleton width="60%" height={20} />
              <Skeleton width="100%" height={180} borderRadius={12} />
              <Skeleton width="100%" height={80} borderRadius={12} />
            </View>
          ) : hasFamily ? (
            <FamilyDashboard userId={user?.id ?? ''} isLight={isLight} />
          ) : (
            <View style={styles.familyOnboarding}>
              <Text style={[styles.familyOnboardTitle, { color: text }]}>Family Safety</Text>
              <Text style={[styles.familyOnboardSub, { color: sub }]}>Track your family, get alerts, and keep everyone safe.</Text>
              <TouchableOpacity style={styles.createFamilyBtn} onPress={() => setShowCreateFamily(true)}>
                <Text style={styles.createFamilyText}>Create Family Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.joinFamilyBtn, { borderColor: sub }]} onPress={() => setShowJoinFamily(true)}>
                <Text style={[styles.joinFamilyText, { color: text }]}>Join with Invite Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Add friend modal */}
      <Modal visible={showAddFriend} transparent animationType="slide" onRequestClose={() => setShowAddFriend(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddFriend(false)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: text }]}>Add Friend</Text>
            <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]}
              placeholder="Enter friend code or email" placeholderTextColor={sub}
              value={friendCode} onChangeText={setFriendCode} autoCapitalize="none" />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddFriend}>
              <Text style={styles.modalBtnText}>Send Request</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create family modal */}
      <Modal visible={showCreateFamily} transparent animationType="slide" onRequestClose={() => setShowCreateFamily(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreateFamily(false)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: text }]}>Create Family Group</Text>
            <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]}
              placeholder="Family name (e.g. Ahmed Family)" placeholderTextColor={sub}
              value={familyName} onChangeText={setFamilyName} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleCreateFamily}>
              <Text style={styles.modalBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Join family modal */}
      <Modal visible={showJoinFamily} transparent animationType="slide" onRequestClose={() => setShowJoinFamily(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowJoinFamily(false)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: text }]}>Join Family Group</Text>
            <TextInput style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]}
              placeholder="Enter invite code" placeholderTextColor={sub}
              value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" />
            <TouchableOpacity style={styles.modalBtn} onPress={handleJoinFamily}>
              <Text style={styles.modalBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Friend detail modal */}
      <Modal visible={!!selectedFriend} transparent animationType="slide" onRequestClose={() => setSelectedFriend(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedFriend(null)}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            {selectedFriend && (
              <>
                <Text style={[styles.modalTitle, { color: text }]}>{selectedFriend.name}</Text>
                <TouchableOpacity style={[styles.friendAction, { backgroundColor: '#3B82F6' }]}><Ionicons name="navigate-outline" size={16} color="#fff" /><Text style={styles.friendActionText}>Navigate to</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.friendAction, { backgroundColor: '#EF4444', marginTop: 8 }]} onPress={() => handleRemoveFriend(selectedFriend.friend_id)}>
                  <Ionicons name="trash-outline" size={16} color="#fff" /><Text style={styles.friendActionText}>Remove Friend</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', margin: 16, borderRadius: 12, padding: 4 },
  togglePill: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: '#3B82F6' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  friendCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  friendInitials: { color: '#fff', fontSize: 16, fontWeight: '800' },
  friendName: { fontSize: 15, fontWeight: '700' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  addFriendBtn: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3B82F6', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  addFriendText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  familyOnboarding: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  familyOnboardTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  familyOnboardSub: { fontSize: 14, textAlign: 'center', marginBottom: 28 },
  createFamilyBtn: { backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 12 },
  createFamilyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  joinFamilyBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, borderWidth: 1.5 },
  joinFamilyText: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  modalBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  friendAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, marginTop: 12 },
  friendActionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
