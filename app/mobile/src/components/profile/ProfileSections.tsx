import React from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../common/Skeleton';
import { DRIVING_MODES } from '../../constants/modes';
import { PLANS } from '../../constants/plans';
import type { DrivingMode, PlanTier, SavedLocation, SavedRoute, User } from '../../types';
import type { ThemeColors } from '../../contexts/ThemeContext';

type NotificationItem = { label: string; val: boolean; set: (v: boolean) => void };
type HeightPreset = { label: string; value: string };

export function SectionHeader({ title, isLight }: { title: string; isLight: boolean }) {
  return <Text style={[sStyles.sectionTitle, { color: isLight ? '#111' : '#fff' }]}>{title}</Text>;
}

export function ProfileHeader({
  user,
  initials,
  colors,
  planName,
}: {
  user: User | null;
  initials: string;
  colors: ThemeColors;
  planName: string;
}) {
  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCard}>
      <TouchableOpacity style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
      <Text style={[styles.userName, { color: '#fff' }]}>{user?.name ?? 'Driver'}</Text>
      <Text style={[styles.userEmail, { color: 'rgba(255,255,255,0.7)' }]}>{user?.email ?? ''}</Text>
      <View style={[styles.planBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Ionicons name="diamond-outline" size={12} color="#fff" />
        <Text style={styles.planBadgeText}>{planName}</Text>
      </View>
    </LinearGradient>
  );
}

export function PlanCard({
  cardBg,
  text,
  sub,
  planName,
  planPrice,
  planFeatures,
  currentPlan,
  onUpgrade,
}: {
  cardBg: string;
  text: string;
  sub: string;
  planName: string;
  planPrice: string;
  planFeatures: string[];
  currentPlan: PlanTier;
  onUpgrade: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.planName, { color: text }]}>{planName} - {planPrice}</Text>
      {planFeatures.slice(0, 3).map((f, i) => (
        <Text key={i} style={{ color: sub, fontSize: 12, marginTop: 2 }}>- {f}</Text>
      ))}
      {currentPlan === 'basic' && (
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function VehicleCard(props: {
  cardBg: string;
  text: string;
  sub: string;
  tallVehicle: boolean;
  vehicleHeight: string;
  setTallVehicle: (v: boolean) => void;
  setVehicleHeight: (v: string) => void;
  heightPresets: HeightPreset[];
  onSave: () => void;
}) {
  const { cardBg, text, sub, tallVehicle, vehicleHeight, setTallVehicle, setVehicleHeight, heightPresets, onSave } = props;
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.settingRow}>
        <Ionicons name="car-outline" size={18} color={text} />
        <Text style={[styles.settingLabel, { color: text }]}>I drive a tall vehicle</Text>
        <Switch value={tallVehicle} onValueChange={setTallVehicle} trackColor={{ false: '#ccc', true: '#3B82F6' }} />
      </View>
      {tallVehicle && (
        <>
          <View style={styles.presetsRow}>
            {heightPresets.map((p) => (
              <TouchableOpacity key={p.value} style={[styles.presetChip, vehicleHeight === p.value && styles.presetChipActive]} onPress={() => setVehicleHeight(p.value)}>
                <Text style={[styles.presetChipText, vehicleHeight === p.value && { color: '#fff' }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.heightInput, { color: text, borderColor: sub }]}
            value={vehicleHeight}
            onChangeText={setVehicleHeight}
            keyboardType="decimal-pad"
            placeholder="Height in meters"
            placeholderTextColor={sub}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>Save Vehicle Settings</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export function PlacesCard({
  cardBg,
  text,
  sub,
  places,
  loading,
  onDelete,
  onAdd,
}: {
  cardBg: string;
  text: string;
  sub: string;
  places: SavedLocation[];
  loading: boolean;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {loading ? <Skeleton width="100%" height={40} /> : places.length === 0 ? (
        <Text style={{ color: sub, fontSize: 13 }}>No saved places</Text>
      ) : (
        places.map((p) => (
          <View key={p.id} style={styles.listRow}>
            <Ionicons name="location-outline" size={16} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.listTitle, { color: text }]}>{p.name}</Text>
              <Text style={{ color: sub, fontSize: 11 }}>{p.address}</Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(p.id)}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))
      )}
      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Ionicons name="add" size={16} color="#3B82F6" /><Text style={styles.addBtnText}>Add Place</Text>
      </TouchableOpacity>
    </View>
  );
}

export function RoutesCard({
  cardBg,
  text,
  sub,
  routes,
  loading,
  onDelete,
}: {
  cardBg: string;
  text: string;
  sub: string;
  routes: SavedRoute[];
  loading: boolean;
  onDelete: (id: number) => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {loading ? <Skeleton width="100%" height={40} /> : routes.length === 0 ? (
        <Text style={{ color: sub, fontSize: 13 }}>No saved routes</Text>
      ) : (
        routes.map((r) => (
          <View key={r.id} style={styles.listRow}>
            <Ionicons name="git-branch-outline" size={16} color="#8B5CF6" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.listTitle, { color: text }]}>{r.name}</Text>
              <Text style={{ color: sub, fontSize: 11 }}>{r.origin}{' -> '}{r.destination}</Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(r.id)}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

export function NotificationsCard({
  cardBg,
  text,
  sub,
  items,
}: {
  cardBg: string;
  text: string;
  sub: string;
  items: NotificationItem[];
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {items.map((item, i) => (
        <View key={i} style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={16} color={sub} />
          <Text style={[styles.settingLabel, { color: text }]}>{item.label}</Text>
          <Switch value={item.val} onValueChange={item.set} trackColor={{ false: '#ccc', true: '#3B82F6' }} />
        </View>
      ))}
    </View>
  );
}

export function AppearanceCard({
  cardBg,
  text,
  sub,
  darkEnabled,
  onToggle,
}: {
  cardBg: string;
  text: string;
  sub: string;
  darkEnabled: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.settingRow}>
        <Ionicons name="moon-outline" size={16} color={sub} />
        <Text style={[styles.settingLabel, { color: text }]}>Dark Mode</Text>
        <Switch value={darkEnabled} onValueChange={onToggle} trackColor={{ false: '#ccc', true: '#3B82F6' }} />
      </View>
    </View>
  );
}

export function DrivingModeCard({
  cardBg,
  text,
  defaultMode,
  setDefaultMode,
}: {
  cardBg: string;
  text: string;
  defaultMode: DrivingMode;
  setDefaultMode: (mode: DrivingMode) => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {(Object.entries(DRIVING_MODES) as [DrivingMode, any][]).map(([mode, config]) => (
        <TouchableOpacity key={mode} style={styles.modeRow} onPress={() => setDefaultMode(mode)}>
          <View style={[styles.modeDot, { backgroundColor: config.color }]} />
          <Text style={[styles.settingLabel, { color: text }]}>{config.label}</Text>
          {defaultMode === mode && <Ionicons name="star" size={16} color="#3B82F6" />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function AboutCard({ cardBg, text, sub }: { cardBg: string; text: string; sub: string }) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {[
        { label: 'App Version', value: '1.0.0' },
        { label: 'Rate SnapRoad', link: true },
        { label: 'Contact Support', link: true },
        { label: 'Privacy Policy', link: true },
        { label: 'Terms of Service', link: true },
      ].map((item, i) => (
        <View key={i} style={styles.aboutRow}>
          <Text style={[styles.settingLabel, { color: text }]}>{item.label}</Text>
          {item.value ? <Text style={{ color: sub, fontSize: 13 }}>{item.value}</Text> : <Ionicons name="open-outline" size={14} color={sub} />}
        </View>
      ))}
    </View>
  );
}

export function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <TouchableOpacity
      style={styles.signOutBtn}
      onPress={() => {
        Alert.alert('Sign Out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
        ]);
      }}
    >
      <Ionicons name="log-out-outline" size={18} color="#EF4444" />
      <Text style={styles.signOutText}>Sign Out</Text>
    </TouchableOpacity>
  );
}

export function PlanModal(props: {
  visible: boolean;
  onClose: () => void;
  cardBg: string;
  text: string;
  sub: string;
  currentPlan: PlanTier;
  onSelectPlan: (tier: PlanTier) => void;
}) {
  const { visible, onClose, cardBg, text, sub, currentPlan, onSelectPlan } = props;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: text }]}>Choose Your Plan</Text>
          {(Object.entries(PLANS) as [PlanTier, any][]).map(([tier, plan]) => (
            <TouchableOpacity key={tier} style={[styles.planCard, currentPlan === tier && styles.planCardActive]} onPress={() => onSelectPlan(tier)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.planCardName, { color: text }]}>{plan.name}</Text>
                <Text style={[styles.planCardPrice, { color: '#3B82F6' }]}>{plan.price}</Text>
              </View>
              {plan.features.slice(0, 3).map((f: string, i: number) => (
                <Text key={i} style={{ color: sub, fontSize: 11, marginTop: 2 }}>- {f}</Text>
              ))}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function AddPlaceModal(props: {
  visible: boolean;
  onClose: () => void;
  cardBg: string;
  isLight: boolean;
  text: string;
  sub: string;
  newPlaceName: string;
  setNewPlaceName: (v: string) => void;
  newPlaceAddress: string;
  setNewPlaceAddress: (v: string) => void;
  onSave: () => void;
}) {
  const {
    visible, onClose, cardBg, isLight, text, sub,
    newPlaceName, setNewPlaceName, newPlaceAddress, setNewPlaceAddress, onSave,
  } = props;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: text }]}>Add Place</Text>
          <TextInput
            style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]}
            placeholder="Name"
            placeholderTextColor={sub}
            value={newPlaceName}
            onChangeText={setNewPlaceName}
          />
          <TextInput
            style={[styles.modalInput, { color: text, backgroundColor: isLight ? '#f5f5f7' : '#2a2a3e' }]}
            placeholder="Address"
            placeholderTextColor={sub}
            value={newPlaceAddress}
            onChangeText={setNewPlaceAddress}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>Save Place</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const sStyles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
});

const styles = StyleSheet.create({
  headerCard: { margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  userName: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  userEmail: { fontSize: 13, marginBottom: 8 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  planBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: { marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  presetsRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  presetChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(128,128,128,0.12)' },
  presetChipActive: { backgroundColor: '#3B82F6' },
  presetChipText: { fontSize: 12, fontWeight: '600', color: '#888' },
  heightInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  saveBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  listTitle: { fontSize: 14, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 10 },
  addBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  modeDot: { width: 10, height: 10, borderRadius: 5 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, marginBottom: 20, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)' },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  planName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  upgradeBtn: { backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  modalHandle: { width: 36, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
  planCard: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', padding: 16, marginBottom: 10 },
  planCardActive: { borderColor: '#3B82F6', borderWidth: 2 },
  planCardName: { fontSize: 16, fontWeight: '700' },
  planCardPrice: { fontSize: 16, fontWeight: '800' },
});
