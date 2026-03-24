import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Incident } from '../../types';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  incident: Incident;
  distanceMiles: number;
  onConfirm?: (confirmed: boolean) => void;
  showConfirm?: boolean;
  onDismiss?: () => void;
  colors: ThemeColors;
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.round(diff / 60)}h ago`;
}

export default function ReportCard({ incident, distanceMiles, onConfirm, showConfirm, onDismiss, colors }: Props) {
  return (
    <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown.duration(200)} style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <Ionicons name="warning-outline" size={18} color={colors.warning} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {incident.title} {distanceMiles.toFixed(1)} mi ahead
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>
            Reported {timeAgo(incident.created_at)} · {incident.upvotes} confirmed
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {showConfirm && onConfirm && (
        <View style={styles.confirmRow}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Still there?</Text>
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.success }]} onPress={() => onConfirm(true)}>
            <Text style={styles.confirmText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.danger }]} onPress={() => onConfirm(false)}>
            <Text style={styles.confirmText}>No</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  confirmBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  confirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
