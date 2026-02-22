// SnapRoad Mobile - Routes Screen (matches /driver web Routes tab)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://mobile-feature-impl.preview.emergentagent.com';

interface SavedRoute {
  id: number;
  name: string;
  origin: string;
  destination: string;
  departure_time: string;
  days_active: string[];
  estimated_time: number;
  distance: number;
  is_active: boolean;
  notifications: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const RoutesScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoute, setNewRoute] = useState({
    name: '', origin: '', destination: '', departure_time: '08:00',
    days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true,
  });

  useEffect(() => { fetchRoutes(); }, []);

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/routes`);
      const data = await res.json();
      if (data.success) setRoutes(data.data);
    } catch { /* use empty */ }
  };

  const handleAddRoute = async () => {
    if (!newRoute.name || !newRoute.origin || !newRoute.destination) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoute),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRoutes([...routes, data.data]);
        setShowAddModal(false);
        setNewRoute({ name: '', origin: '', destination: '', departure_time: '08:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notifications: true });
      }
    } catch { Alert.alert('Error', 'Could not add route'); }
  };

  const handleToggleRoute = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/routes/${id}/toggle`, { method: 'PUT' });
      setRoutes(routes.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
    } catch { setRoutes(routes.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r)); }
  };

  const handleDeleteRoute = async (id: number) => {
    Alert.alert('Delete Route', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${API_URL}/api/routes/${id}`, { method: 'DELETE' });
            setRoutes(routes.filter(r => r.id !== id));
          } catch { setRoutes(routes.filter(r => r.id !== id)); }
        }
      }
    ]);
  };

  const handleToggleNotifications = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/routes/${id}/notifications`, { method: 'PUT' });
      setRoutes(routes.map(r => r.id === id ? { ...r, notifications: !r.notifications } : r));
    } catch { setRoutes(routes.map(r => r.id === id ? { ...r, notifications: !r.notifications } : r)); }
  };

  const handleStartNavigation = (destination: string) => {
    navigation?.navigate('ActiveNavigation', { destination });
  };

  const toggleDay = (day: string) => {
    setNewRoute(prev => ({
      ...prev,
      days_active: prev.days_active.includes(day)
        ? prev.days_active.filter(d => d !== day)
        : [...prev.days_active, day]
    }));
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>My Routes</Text>
          <Text style={s.subtitle}>{routes.length} of 20 routes saved</Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, routes.length >= 20 && s.addBtnDisabled]}
          onPress={() => setShowAddModal(true)}
          disabled={routes.length >= 20}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add Route</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={s.progressContainer}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(routes.length / 20) * 100}%` }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {routes.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="git-branch-outline" size={48} color={Colors.textDim} />
            <Text style={s.emptyTitle}>No saved routes</Text>
            <Text style={s.emptySubtitle}>Add your frequent destinations</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAddModal(true)}>
              <Text style={s.emptyBtnText}>Add First Route</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map(route => (
            <View key={route.id} style={[s.routeCard, !route.is_active && s.routeCardInactive]}>
              <View style={s.routeHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.routeName}>{route.name}</Text>
                    {route.notifications && <Ionicons name="notifications" size={12} color={Colors.primary} />}
                    {!route.is_active && (
                      <View style={s.pausedBadge}>
                        <Text style={s.pausedText}>Paused</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.routePath}>{route.origin} → {route.destination}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[s.actionBtn, route.is_active ? s.actionBtnActive : s.actionBtnPaused]}
                    onPress={() => handleToggleRoute(route.id)}
                  >
                    <Ionicons name={route.is_active ? 'play' : 'pause'} size={14} color={route.is_active ? '#22C55E' : Colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDeleteRoute(route.id)}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Route Details */}
              <View style={s.detailsRow}>
                <View style={s.detailItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={s.detailValue}>{route.departure_time}</Text>
                  <Text style={s.detailLabel}>Depart</Text>
                </View>
                <View style={s.detailItem}>
                  <Ionicons name="timer-outline" size={14} color="#22C55E" />
                  <Text style={s.detailValue}>{route.estimated_time} min</Text>
                  <Text style={s.detailLabel}>Duration</Text>
                </View>
                <View style={s.detailItem}>
                  <Ionicons name="navigate-outline" size={14} color="#8B5CF6" />
                  <Text style={s.detailValue}>{route.distance} mi</Text>
                  <Text style={s.detailLabel}>Distance</Text>
                </View>
              </View>

              {/* Days */}
              <View style={s.daysRow}>
                {DAYS.map(day => (
                  <View key={day} style={[s.dayBadge, route.days_active.includes(day) && s.dayBadgeActive]}>
                    <Text style={[s.dayText, route.days_active.includes(day) && s.dayTextActive]}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Actions */}
              <View style={s.actionsRow}>
                <TouchableOpacity style={s.alertsBtn} onPress={() => handleToggleNotifications(route.id)}>
                  <Ionicons name={route.notifications ? 'notifications' : 'notifications-off-outline'} size={12} color={route.notifications ? Colors.primary : Colors.textMuted} />
                  <Text style={[s.alertsText, route.notifications && { color: Colors.primary }]}>
                    {route.notifications ? 'Alerts on' : 'Alerts off'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.startBtn} onPress={() => handleStartNavigation(route.destination)}>
                  <Ionicons name="navigate" size={12} color="#fff" />
                  <Text style={s.startText}>Start</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Route Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add New Route</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Route Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Morning Commute"
                placeholderTextColor={Colors.textDim}
                value={newRoute.name}
                onChangeText={(t) => setNewRoute({ ...newRoute, name: t })}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Origin</Text>
              <TextInput
                style={s.input}
                placeholder="Start location"
                placeholderTextColor={Colors.textDim}
                value={newRoute.origin}
                onChangeText={(t) => setNewRoute({ ...newRoute, origin: t })}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Destination</Text>
              <TextInput
                style={s.input}
                placeholder="End location"
                placeholderTextColor={Colors.textDim}
                value={newRoute.destination}
                onChangeText={(t) => setNewRoute({ ...newRoute, destination: t })}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Departure Time</Text>
              <TextInput
                style={s.input}
                placeholder="08:00"
                placeholderTextColor={Colors.textDim}
                value={newRoute.departure_time}
                onChangeText={(t) => setNewRoute({ ...newRoute, departure_time: t })}
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Active Days</Text>
              <View style={s.daysSelector}>
                {DAYS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[s.daySelectorItem, newRoute.days_active.includes(day) && s.daySelectorItemActive]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[s.daySelectorText, newRoute.days_active.includes(day) && s.daySelectorTextActive]}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleAddRoute}>
              <Text style={s.saveBtnText}>Save Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  title: { color: '#0F172A', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  subtitle: { color: '#64748B', fontSize: FontSizes.xs },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  progressContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  progressBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: '#fff', borderRadius: 16, marginTop: 20 },
  emptyTitle: { color: '#0F172A', fontSize: FontSizes.md, fontWeight: FontWeights.semibold, marginTop: 12 },
  emptySubtitle: { color: '#64748B', fontSize: FontSizes.sm, marginTop: 4 },
  emptyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  emptyBtnText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  // Route card
  routeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  routeCardInactive: { opacity: 0.6 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  routeName: { color: '#0F172A', fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  routePath: { color: '#64748B', fontSize: FontSizes.sm, marginTop: 4 },
  pausedBadge: { backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pausedText: { color: '#64748B', fontSize: 10, fontWeight: FontWeights.medium },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnActive: { backgroundColor: 'rgba(34,197,94,0.1)' },
  actionBtnPaused: { backgroundColor: '#F1F5F9' },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)' },
  // Details
  detailsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailItem: { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  detailValue: { color: '#0F172A', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, marginTop: 4 },
  detailLabel: { color: '#64748B', fontSize: 10 },
  // Days
  daysRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  dayBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#F1F5F9' },
  dayBadgeActive: { backgroundColor: 'rgba(37,99,235,0.1)' },
  dayText: { color: '#94A3B8', fontSize: 10 },
  dayTextActive: { color: Colors.primary, fontWeight: FontWeights.semibold },
  // Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderColor: '#F1F5F9' },
  alertsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertsText: { color: '#64748B', fontSize: FontSizes.xs },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  startText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: FontSizes.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  daysSelector: { flexDirection: 'row', gap: 6 },
  daySelectorItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  daySelectorItemActive: { backgroundColor: Colors.primary },
  daySelectorText: { color: Colors.textMuted, fontSize: 10, fontWeight: FontWeights.medium },
  daySelectorTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});

export default RoutesScreen;
