import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { FamilyMember } from '../../types';

interface Props {
  member: FamilyMember;
  onPress: (member: FamilyMember) => void;
  isLight: boolean;
}

function getStatus(m: FamilyMember): string {
  if (m.sos_active) return 'SOS ACTIVE';
  if (!m.is_sharing) return 'Location off';
  if ((m.speed_mph ?? 0) > 3) return `Driving · ${Math.round(m.speed_mph ?? 0)} mph`;
  if (m.lat && m.lng) return 'Stationary';
  return 'Offline';
}

export default function MemberCard({ member, onPress, isLight }: Props) {
  const safeName = member.name || member.email || 'User';
  const initials = safeName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const status = getStatus(member);
  const isOnline = member.is_sharing && (member.lat != null);
  const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899'];
  const bgColor = colors[safeName.charCodeAt(0) % colors.length];

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: isLight ? '#fff' : '#1e1e2e' }]} onPress={() => onPress(member)} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: bgColor }]}>
        <Text style={styles.initials}>{initials}</Text>
        {isOnline && <View style={styles.onlineDot} />}
      </View>
      <Text style={[styles.name, { color: isLight ? '#111' : '#fff' }]} numberOfLines={1}>{safeName}</Text>
      <Text style={[styles.status, { color: member.sos_active ? '#EF4444' : isLight ? '#888' : '#666' }]} numberOfLines={1}>{status}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: 90, borderRadius: 12, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  initials: { color: '#fff', fontSize: 18, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#1e1e2e' },
  name: { fontSize: 12, fontWeight: '700' },
  status: { fontSize: 9, marginTop: 2 },
});
