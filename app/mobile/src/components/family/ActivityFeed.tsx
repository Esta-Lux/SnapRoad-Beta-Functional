import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FamilyEvent } from '../../types';

interface Props {
  events: FamilyEvent[];
  isLoading: boolean;
  onRefresh: () => void;
  isLight: boolean;
}

function eventIcon(type: string) {
  if (type === 'arrival') return <Ionicons name="home-outline" size={16} color="#22C55E" />;
  if (type === 'departure') return <Ionicons name="business-outline" size={16} color="#F59E0B" />;
  if (type === 'start_driving') return <Ionicons name="car-outline" size={16} color="#3B82F6" />;
  return <Ionicons name="location-outline" size={16} color="#888" />;
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export default function ActivityFeed({ events, isLoading, onRefresh, isLight }: Props) {
  if (!events.length && !isLoading) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: isLight ? '#888' : '#666' }]}>No recent activity</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#3B82F6" />}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderBottomColor: isLight ? '#f0f0f0' : '#2a2a3e' }]}>
          {eventIcon(item.type)}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.msg, { color: isLight ? '#333' : '#ddd' }]}>{item.message}</Text>
            <Text style={[styles.time, { color: isLight ? '#999' : '#666' }]}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  msg: { fontSize: 13, fontWeight: '500' },
  time: { fontSize: 11, marginTop: 2 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});
