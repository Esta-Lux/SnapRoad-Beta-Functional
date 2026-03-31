import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';

interface ReportData {
  safety_score: number;
  total_trips: number;
  avg_speed_mph: number;
  speed_violations: number;
  late_night_drives: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
}

const STAT_CONFIG: { key: keyof ReportData; label: string; icon: string; color?: string }[] = [
  { key: 'safety_score', label: 'Safety Score', icon: 'shield-checkmark', color: '#22C55E' },
  { key: 'total_trips', label: 'Total Trips', icon: 'car' },
  { key: 'avg_speed_mph', label: 'Average Speed', icon: 'speedometer' },
  { key: 'speed_violations', label: 'Speed Violations', icon: 'warning', color: '#F59E0B' },
  { key: 'late_night_drives', label: 'Late Night Drives', icon: 'moon', color: '#A78BFA' },
];

export default function TeenReportCard({ visible, onClose, memberId, memberName }: Props) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/api/family/teen-report/${memberId}`);
      if (res.success) {
        const data = (res.data as any)?.data ?? res.data;
        setReport(data as ReportData);
      } else {
        setError((res as any).error ?? 'Failed to load report');
      }
    } catch {
      setError('Network error loading report');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (visible && memberId) loadReport();
  }, [visible, memberId, loadReport]);

  const formatValue = (key: keyof ReportData, val: number): string => {
    if (key === 'safety_score') return `${val}/100`;
    if (key === 'avg_speed_mph') return `${val.toFixed(1)} mph`;
    return String(val);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22C55E';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Ionicons name="school" size={20} color="#3B82F6" />
            <Text style={styles.title}>{memberName}'s Report Card</Text>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading report...</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadReport}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : report ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Hero score */}
              <View style={styles.heroCard}>
                <Text style={[styles.heroScore, { color: getScoreColor(report.safety_score) }]}>
                  {report.safety_score}
                </Text>
                <Text style={styles.heroLabel}>Safety Score</Text>
              </View>

              {/* Stat rows */}
              {STAT_CONFIG.filter((s) => s.key !== 'safety_score').map((stat) => (
                <View key={stat.key} style={styles.statRow}>
                  <View style={[styles.statIcon, { backgroundColor: `${stat.color ?? '#3B82F6'}20` }]}>
                    <Ionicons name={stat.icon as any} size={18} color={stat.color ?? '#3B82F6'} />
                  </View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={[styles.statValue, stat.color ? { color: stat.color } : null]}>
                    {formatValue(stat.key, report[stat.key])}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  handle: { width: 36, height: 4, backgroundColor: '#475569', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  centered: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  errorText: { color: '#f8fafc', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  retryBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  heroCard: { alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 16, paddingVertical: 24, marginBottom: 20 },
  heroScore: { fontSize: 48, fontWeight: '900' },
  heroLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(148,163,184,0.15)' },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statLabel: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  statValue: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
});
