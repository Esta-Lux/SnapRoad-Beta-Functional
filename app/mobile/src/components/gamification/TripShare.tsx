import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../common/Modal';
import { formatDuration } from '../../utils/format';

interface TripData {
  distance: number;
  /** Minutes (matches trip summary / `useDriveNavigation`). */
  duration: number;
  safety_score: number;
  gems_earned: number;
  origin: string;
  destination: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  trip: TripData | null;
}

export default function TripShare({ visible, onClose, trip }: Props) {
  const cardRef = useRef<View>(null);

  if (!trip) return <Modal visible={visible} onClose={onClose}><Text style={styles.empty}>No trip data</Text></Modal>;

  const shareMessage = [
    `🚗 SnapRoad Trip Complete!`,
    `📍 ${trip.origin} → ${trip.destination}`,
    `📏 ${trip.distance.toFixed(1)} mi · ${formatDuration(trip.duration)}`,
    `🛡️ Safety Score: ${trip.safety_score}/100`,
    `💎 Gems Earned: ${trip.gems_earned}`,
    `\nDrive smarter with SnapRoad!`,
  ].join('\n');

  const handleShare = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.92 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share trip' });
      } else {
        await Share.share({ message: shareMessage, url: uri });
      }
    } catch {
      try {
        await Share.share({ message: shareMessage });
      } catch {
        Alert.alert('Error', 'Unable to share trip.');
      }
    }
  };

  const stats: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }[] = [
    { icon: 'navigate-outline', label: 'Distance', value: `${trip.distance.toFixed(1)} mi`, color: '#3B82F6' },
    { icon: 'time-outline', label: 'Duration', value: formatDuration(trip.duration), color: '#8B5CF6' },
    { icon: 'shield-checkmark-outline', label: 'Safety', value: `${trip.safety_score}/100`, color: '#22C55E' },
    { icon: 'diamond-outline', label: 'Gems', value: `+${trip.gems_earned}`, color: '#F59E0B' },
  ];

  return (
    <Modal visible={visible} onClose={onClose}>
      <View ref={cardRef} collapsable={false} style={styles.shareCard}>
        <Text style={styles.title}>Trip Summary</Text>

        <View style={styles.route}>
          <Ionicons name="location" size={16} color="#3B82F6" />
          <Text style={styles.routeText} numberOfLines={1}>{trip.origin}</Text>
          <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
          <Text style={styles.routeText} numberOfLines={1}>{trip.destination}</Text>
        </View>

        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: `${s.color}20` }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share-outline" size={18} color="#fff" />
        <Text style={styles.shareBtnText}>Share Trip</Text>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shareCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  empty: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  routeText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
