import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { api } from '../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Skeleton from '../common/Skeleton';
import { DRIVING_MODES } from '../../constants/modes';
import type { DrivingMode, PlanTier, SavedLocation, SavedRoute, User } from '../../types';
import type { ProfileOverviewActionItem } from './types';
export type {
  ProfileBadgeItem,
  ProfileGemTxItem,
  ProfileLeaderboardEntry,
  ProfileOverviewActionItem,
  ProfileTripHistoryItem,
  ProfileWeeklyRecap,
} from './types';
export {
  AddPlaceModal,
  BadgesModal,
  GemHistoryModal,
  IncidentReportModal,
  DrivingScoreModal,
  LeaderboardModal,
  LevelProgressModal,
  PlanModal,
  TripHistoryModal,
  WeeklyRecapModal,
} from './ProfileModals';

type NotificationItem = { label: string; val: boolean; set: (v: boolean) => void };
type HeightPreset = { label: string; value: string };

export function SectionHeader({ title, isLight }: { title: string; isLight: boolean }) {
  return <Text style={[sStyles.sectionTitle, { color: isLight ? '#111' : '#fff' }]}>{title}</Text>;
}

export function ProfileHeader({
  user,
  initials,
  planName,
  level,
}: {
  user: User | null;
  initials: string;
  planName: string;
  level: number;
}) {
  return (
    <LinearGradient colors={user?.isPremium ? ['#D97706', '#F59E0B'] : ['#1D4ED8', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerCard}>
      <TouchableOpacity style={styles.avatarCircle} accessibilityRole="button" accessibilityLabel="Profile avatar">
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>
      <Text style={[styles.userName, { color: '#fff' }]}>{user?.name ?? 'Driver'}</Text>
      <View style={styles.headerLevelRow}>
        <Text style={styles.headerLevelText}>Level {level}</Text>
        <View style={[styles.planBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name="diamond-outline" size={12} color="#fff" />
          <Text style={styles.planBadgeText}>{planName}</Text>
        </View>
      </View>
      <Text style={[styles.userEmail, { color: 'rgba(255,255,255,0.7)' }]}>{user?.email ?? ''}</Text>
    </LinearGradient>
  );
}

/** Compact “My Car” row — customize is coming soon; matches native list + CTA pattern. */
export function MyCarRow({
  cardBg,
  text,
  sub,
  accent,
  subtitle,
}: {
  cardBg: string;
  text: string;
  sub: string;
  accent: string;
  subtitle?: string;
}) {
  const line = subtitle ?? 'Ocean Blue sedan';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[myCarStyles.wrap, { backgroundColor: cardBg }]}
      onPress={() =>
        Alert.alert('My Car', 'Vehicle customization is coming soon. You’ll be able to save make, model, and color here.')
      }
      accessibilityRole="button"
      accessibilityLabel="My Car, coming soon"
    >
      <View style={myCarStyles.iconWrap}>
        <Ionicons name="car-sport-outline" size={22} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={myCarStyles.titleRow}>
          <Text style={[myCarStyles.title, { color: text }]}>My Car</Text>
          <View style={myCarStyles.badgeSoon}>
            <Text style={myCarStyles.badgeSoonText}>Coming soon</Text>
          </View>
        </View>
        <Text style={[myCarStyles.sub, { color: sub }]} numberOfLines={1}>
          {line}
        </Text>
      </View>
      <Text style={[myCarStyles.cta, { color: accent }]} pointerEvents="none">
        Customize <Text style={myCarStyles.ctaArrow}>→</Text>
      </Text>
    </TouchableOpacity>
  );
}

const myCarStyles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59,130,246,0.12)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  badgeSoon: {
    backgroundColor: 'rgba(245,158,11,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSoonText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  sub: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  cta: { fontSize: 13, fontWeight: '700' },
  ctaArrow: { fontWeight: '600' },
});

export function ProfileOverviewSection({
  actions,
  cardBg,
  text,
  sub,
  level,
  totalXp,
  onPressLevelProgress,
  onPressShareScore,
}: {
  actions: ProfileOverviewActionItem[];
  cardBg: string;
  text: string;
  sub: string;
  level: number;
  totalXp: number;
  onPressLevelProgress?: () => void;
  onPressShareScore?: () => void | Promise<void>;
}) {
  return (
    <>
      <TouchableOpacity activeOpacity={0.9} onPress={onPressLevelProgress} style={[styles.progressCard, { backgroundColor: cardBg }]}>
        <LinearGradient colors={['#2563EB', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.progressGradient}>
          <View style={styles.progressLevelIcon}>
            <Text style={styles.progressLevelText}>{level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>Level</Text>
            <Text style={styles.progressSub}>{`${totalXp.toLocaleString()} XP total`}</Text>
          </View>
          <Text style={styles.progressAction}>View Progress</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ marginTop: -2 }}>
        {actions.map((item) => (
          <TouchableOpacity key={item.key} style={[styles.actionRow, { backgroundColor: cardBg }]} onPress={item.onPress}>
            <View style={styles.actionIconWrap}>
              <Ionicons name={item.icon} size={16} color="#60A5FA" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.actionTitleRow}>
                <Text style={[styles.actionTitle, { color: text }]}>{item.label}</Text>
                {!!item.badgeText && <Text style={styles.actionBadge}>{item.badgeText}</Text>}
              </View>
              <Text style={[styles.actionSub, { color: sub }]}>{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={sub} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={onPressShareScore} style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 2 }}>
        <LinearGradient colors={['#3B82F6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shareScoreCta}>
          <Ionicons name="share-social-outline" size={16} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.shareScoreTitle}>Share driving snapshot</Text>
            <Text style={styles.shareScoreSub}>Opens sheet · preview · system share</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
      </TouchableOpacity>
    </>
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

export function PremiumUpsellCard({
  cardBg,
  onUpgrade,
}: {
  cardBg: string;
  onUpgrade: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: cardBg, padding: 0, overflow: 'hidden' }]}>
      <LinearGradient colors={['#2563EB', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upsellTop}>
        <Ionicons name="flash-outline" size={34} color="#fff" />
        <Text style={styles.upsellTitle}>Premium Feature</Text>
        <Text style={styles.upsellSub}>Unlock deeper score insights and Orion-powered driving tips</Text>
      </LinearGradient>
      <View style={styles.upsellBody}>
        {[
          'Detailed driving score breakdown',
          'Personalized improvement tips',
          'Voice coaching from Orion',
          'Track progress over time',
        ].map((feature) => (
          <View key={feature} style={styles.upsellRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#34D399" />
            <Text style={styles.upsellRowText}>{feature}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.upsellBtn} onPress={onUpgrade}>
          <Text style={styles.upsellBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
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
            <Ionicons name="git-branch-outline" size={16} color="#3B82F6" />
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

function extraConfig(): { supportEmail?: string; iosAppStoreId?: string; androidPackage?: string } {
  return (Constants.expoConfig?.extra ?? {}) as {
    supportEmail?: string;
    iosAppStoreId?: string;
    androidPackage?: string;
  };
}

export function AboutCard({ cardBg, text, sub }: { cardBg: string; text: string; sub: string }) {
  const [legalDocs, setLegalDocs] = React.useState<{ id: string; name: string; type?: string }[]>([]);
  const [legalModal, setLegalModal] = React.useState<{ title: string; body: string } | null>(null);
  const [legalLoading, setLegalLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/legal/documents');
        const payload = res.data as { data?: { id: string; name: string; type?: string }[] };
        if (res.success && Array.isArray(payload?.data)) setLegalDocs(payload.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const openLegalDoc = async (doc: { id: string; name: string }) => {
    setLegalLoading(true);
    try {
      const res = await api.get(`/api/legal/documents/${doc.id}`);
      const row = (res.data as { data?: Record<string, string> })?.data;
      const body =
        String(row?.content ?? row?.body ?? row?.text ?? row?.description ?? '').trim() ||
        'No text has been published for this document yet. Ask your admin to publish content in Legal Compliance.';
      setLegalModal({ title: doc.name, body });
    } catch {
      Alert.alert(doc.name, 'Could not load this document. Check your connection and try again.');
    } finally {
      setLegalLoading(false);
    }
  };

  const supportEmail = (extraConfig().supportEmail || 'support@snaproad.co').trim();
  const androidPkg = (extraConfig().androidPackage || 'com.snaproad.app').trim();
  const iosStoreId = (extraConfig().iosAppStoreId || '').trim();

  const openRate = () => {
    if (Platform.OS === 'android') {
      const market = `market://details?id=${encodeURIComponent(androidPkg)}`;
      const web = `https://play.google.com/store/apps/details?id=${encodeURIComponent(androidPkg)}`;
      Linking.canOpenURL(market).then((ok) => Linking.openURL(ok ? market : web)).catch(() => Linking.openURL(web));
      return;
    }
    if (Platform.OS === 'ios' && iosStoreId) {
      Linking.openURL(`itms-apps://itunes.apple.com/app/id${iosStoreId}`).catch(() =>
        Linking.openURL(`https://apps.apple.com/app/id${iosStoreId}`),
      );
      return;
    }
    Alert.alert(
      'Rate SnapRoad',
      iosStoreId
        ? 'Open the App Store listing from your device.'
        : 'Set iosAppStoreId in app.json extra after your App Store listing is live.',
    );
  };

  const openSupport = () => {
    const mail = `mailto:${supportEmail}?subject=${encodeURIComponent('SnapRoad support')}`;
    Linking.openURL(mail).catch(() => Alert.alert('Contact support', `Email us at ${supportEmail}`));
  };

  const legalRows =
    legalDocs.length > 0
      ? legalDocs.map((d) => ({ label: d.name, docId: d.id }))
      : [
          { label: 'Privacy Policy', docId: '' as const },
          { label: 'Terms of Service', docId: '' as const },
        ];

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.aboutRow}>
        <Text style={[styles.settingLabel, { color: text }]}>App Version</Text>
        <Text style={{ color: sub, fontSize: 13 }}>{String(Constants.expoConfig?.version ?? '1.0.0')}</Text>
      </View>
      <TouchableOpacity style={styles.aboutRow} onPress={openRate} activeOpacity={0.7}>
        <Text style={[styles.settingLabel, { color: text }]}>Rate SnapRoad</Text>
        <Ionicons name="star-outline" size={16} color={sub} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.aboutRow} onPress={openSupport} activeOpacity={0.7}>
        <Text style={[styles.settingLabel, { color: text }]}>Contact Support</Text>
        <Ionicons name="mail-outline" size={16} color={sub} />
      </TouchableOpacity>
      {legalRows.map((item, i) => (
        <TouchableOpacity
          key={`legal-${i}`}
          style={styles.aboutRow}
          onPress={() => {
            if (item.docId) openLegalDoc({ id: item.docId, name: item.label });
            else Alert.alert(item.label, 'Your team has not published this document yet. It will appear here once it is set to Published in the admin portal.');
          }}
          activeOpacity={0.7}
          disabled={legalLoading}
        >
          <Text style={[styles.settingLabel, { color: text }]}>{item.label}</Text>
          {legalLoading ? <ActivityIndicator size="small" color={sub} /> : <Ionicons name="document-text-outline" size={16} color={sub} />}
        </TouchableOpacity>
      ))}

      <Modal visible={!!legalModal} transparent animationType="slide" onRequestClose={() => setLegalModal(null)}>
        <View style={aboutStyles.modalBackdrop}>
          <View style={[aboutStyles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[aboutStyles.modalTitle, { color: text }]}>{legalModal?.title}</Text>
            <ScrollView style={aboutStyles.modalScroll} showsVerticalScrollIndicator>
              <Text style={[aboutStyles.modalBody, { color: text }]}>{legalModal?.body}</Text>
            </ScrollView>
            <TouchableOpacity style={aboutStyles.modalClose} onPress={() => setLegalModal(null)} activeOpacity={0.85}>
              <Text style={aboutStyles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const aboutStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  modalScroll: { maxHeight: 420 },
  modalBody: { fontSize: 14, lineHeight: 22 },
  modalClose: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

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


const sStyles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
});

const styles = StyleSheet.create({
  headerCard: { margin: 16, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  userName: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  headerLevelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  headerLevelText: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '700' },
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
  progressCard: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  progressGradient: { paddingHorizontal: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLevelIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  progressLevelText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  progressTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  progressSub: { color: 'rgba(255,255,255,0.86)', fontSize: 11, marginTop: 1 },
  progressAction: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionRow: { marginHorizontal: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionBadge: { color: '#F59E0B', fontSize: 9, fontWeight: '800', backgroundColor: 'rgba(245,158,11,0.14)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  actionSub: { fontSize: 11, marginTop: 1 },
  shareScoreCta: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareScoreTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  shareScoreSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  upsellTop: { paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center' },
  upsellTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 6 },
  upsellSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 8, textAlign: 'center' },
  upsellBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: '#0F172A' },
  upsellRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  upsellRowText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  upsellBtn: { marginTop: 16, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  upsellBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
