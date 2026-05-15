import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import type { DashboardStackParamList } from '../navigation/types';

type DashboardSection = 'friends' | 'family';
type DashboardRoute = RouteProp<DashboardStackParamList, 'DashboardMain'>;

type PreviewPerson = {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: string;
  detail: string;
  battery: number;
  speedMph: number;
  eta: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  top: number;
  left: number;
};

type PreviewEvent = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  time: string;
  color: string;
};

const FRIENDS: PreviewPerson[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    initials: 'MC',
    role: 'Close friend',
    status: 'Live on I-405',
    detail: 'Sharing until arrival at Culver City.',
    battery: 86,
    speedMph: 54,
    eta: '12 min',
    color: '#0EA5E9',
    icon: 'car-sport-outline',
    top: 34,
    left: 58,
  },
  {
    id: 'jordan',
    name: 'Jordan Lee',
    initials: 'JL',
    role: 'Road trip crew',
    status: 'Parked nearby',
    detail: 'Last update 4 min ago near Santa Monica.',
    battery: 63,
    speedMph: 0,
    eta: 'Near',
    color: '#8B5CF6',
    icon: 'location-outline',
    top: 82,
    left: 186,
  },
  {
    id: 'amara',
    name: 'Amara Patel',
    initials: 'AP',
    role: 'Trusted driver',
    status: 'En route',
    detail: 'Heading to the meetup with traffic alerts on.',
    battery: 71,
    speedMph: 38,
    eta: '24 min',
    color: '#10B981',
    icon: 'navigate-outline',
    top: 132,
    left: 105,
  },
];

const FAMILY: PreviewPerson[] = [
  {
    id: 'mom',
    name: 'Aisha',
    initials: 'AM',
    role: 'Parent',
    status: 'Arrived home',
    detail: 'Home zone check-in completed automatically.',
    battery: 92,
    speedMph: 0,
    eta: 'Home',
    color: '#EC4899',
    icon: 'home-outline',
    top: 38,
    left: 52,
  },
  {
    id: 'dad',
    name: 'Ryan',
    initials: 'RA',
    role: 'Parent',
    status: 'Driving',
    detail: 'Cruising below the family speed alert threshold.',
    battery: 78,
    speedMph: 42,
    eta: '18 min',
    color: '#2563EB',
    icon: 'shield-checkmark-outline',
    top: 92,
    left: 182,
  },
  {
    id: 'teen',
    name: 'Noah',
    initials: 'NA',
    role: 'Teen driver',
    status: 'At school',
    detail: 'School zone arrived 32 min ago.',
    battery: 64,
    speedMph: 0,
    eta: 'School',
    color: '#F59E0B',
    icon: 'school-outline',
    top: 142,
    left: 100,
  },
];

const FRIEND_EVENTS: PreviewEvent[] = [
  {
    id: 'share',
    icon: 'radio-outline',
    title: 'Maya started a live share',
    body: 'Visible to close friends until the trip ends.',
    time: '2 min',
    color: '#0EA5E9',
  },
  {
    id: 'arrival',
    icon: 'flag-outline',
    title: 'Jordan arrived nearby',
    body: 'Meetup radius reached near the boardwalk.',
    time: '8 min',
    color: '#8B5CF6',
  },
  {
    id: 'traffic',
    icon: 'alert-circle-outline',
    title: 'Traffic nudge shared',
    body: 'Amara saw a faster route and sent it to the group.',
    time: '14 min',
    color: '#10B981',
  },
];

const FAMILY_EVENTS: PreviewEvent[] = [
  {
    id: 'home',
    icon: 'home-outline',
    title: 'Aisha arrived home',
    body: 'Home zone check-in completed.',
    time: '2 min',
    color: '#EC4899',
  },
  {
    id: 'speed',
    icon: 'speedometer-outline',
    title: 'Ryan stayed under limit',
    body: 'No alerts triggered on the evening commute.',
    time: '11 min',
    color: '#2563EB',
  },
  {
    id: 'school',
    icon: 'school-outline',
    title: 'Noah reached school',
    body: 'Arrival confirmed inside the school zone.',
    time: '32 min',
    color: '#F59E0B',
  },
];

const FRIEND_FEATURES = [
  { icon: 'people-outline', label: 'Trusted Circles', text: 'Organize close friends, coworkers, and road trip crews.' },
  { icon: 'time-outline', label: 'Timed Sharing', text: 'Share during a drive, for an hour, or until arrival.' },
  { icon: 'map-outline', label: 'Meetup Map', text: 'See live ETAs, traffic context, and safe arrival states.' },
  { icon: 'trophy-outline', label: 'Challenges', text: 'Driver goals and trip highlights with friends.' },
] as const;

const FAMILY_FEATURES = [
  { icon: 'shield-checkmark-outline', label: 'Safety Zones', text: 'Home, school, and commute geofences with quiet alerts.' },
  { icon: 'speedometer-outline', label: 'Teen Insights', text: 'Speed, braking, night driving, and trip report summaries.' },
  { icon: 'notifications-outline', label: 'Family Alerts', text: 'SOS, arrivals, low battery, and traffic-aware nudges.' },
  { icon: 'calendar-outline', label: 'Routine Drives', text: 'Recurring school and work routes with expected arrival windows.' },
] as const;

export default function DashboardScreen() {
  const route = useRoute<DashboardRoute>();
  const { colors, isLight } = useTheme();
  const insets = useSafeAreaInsets();
  const initialSection = route.params?.section === 'family' ? 'family' : 'friends';
  const [section, setSection] = useState<DashboardSection>(initialSection);

  useEffect(() => {
    setSection(route.params?.section === 'family' ? 'family' : 'friends');
  }, [route.params?.section]);

  const data = useMemo(() => {
    const family = section === 'family';
    return {
      title: family ? 'Family Safety' : 'Friends',
      eyebrow: family ? 'Coming soon family dashboard' : 'Coming soon friends dashboard',
      subtitle: family
        ? 'A polished household command center for arrivals, teen driving, zones, SOS, and calm daily coordination.'
        : 'A polished social driving hub for trusted location sharing, live ETAs, meetup coordination, and group challenges.',
      gradient: family ? (['#0F172A', '#1D4ED8', '#EC4899'] as const) : (['#0F172A', '#0EA5E9', '#8B5CF6'] as const),
      accent: family ? '#2563EB' : '#0EA5E9',
      softAccent: family ? 'rgba(37,99,235,0.12)' : 'rgba(14,165,233,0.12)',
      people: family ? FAMILY : FRIENDS,
      events: family ? FAMILY_EVENTS : FRIEND_EVENTS,
      features: family ? FAMILY_FEATURES : FRIEND_FEATURES,
      primaryMetric: family ? '3 zones' : '3 live',
      secondaryMetric: family ? '98 safety' : '12 min',
      tertiaryMetric: family ? '0 alerts' : '2 meetups',
    };
  }, [section]);

  const bg = colors.background;
  const cardBg = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.055)';
  const cardBorder = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)';
  const mutedPanel = isLight ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.06)';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <Animated.View entering={FadeInDown.duration(280)}>
          <LinearGradient colors={data.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroTopRow}>
              <View style={styles.launchPill}>
                <Ionicons name="sparkles-outline" size={13} color="#FFFFFF" />
                <Text style={styles.launchPillText}>PREVIEW</Text>
              </View>
              <View style={styles.launchPill}>
                <Ionicons name="server-outline" size={13} color="#FFFFFF" />
                <Text style={styles.launchPillText}>NO LIVE BACKEND</Text>
              </View>
            </View>
            <Text style={styles.eyebrow}>{data.eyebrow}</Text>
            <Text style={styles.heroTitle}>{data.title}</Text>
            <Text style={styles.heroSubtitle}>{data.subtitle}</Text>
            <View style={styles.metricsRow}>
              <Metric label={section === 'family' ? 'Zones' : 'Live friends'} value={data.primaryMetric} />
              <Metric label={section === 'family' ? 'Score' : 'Best ETA'} value={data.secondaryMetric} />
              <Metric label={section === 'family' ? 'Today' : 'Plans'} value={data.tertiaryMetric} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(280).delay(50)}
          style={[styles.toggleRow, { backgroundColor: mutedPanel, borderColor: cardBorder }]}
        >
          {(['friends', 'family'] as DashboardSection[]).map((item) => {
            const active = section === item;
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.86}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSection(item);
                }}
                style={[styles.toggleButton, active && { backgroundColor: data.accent }]}
              >
                <Ionicons
                  name={item === 'friends' ? 'people-outline' : 'shield-checkmark-outline'}
                  size={16}
                  color={active ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.toggleText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                  {item === 'friends' ? 'Friends' : 'Family'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(280).delay(90)} style={[styles.truthCard, { backgroundColor: data.softAccent, borderColor: cardBorder }]}>
          <View style={[styles.truthIcon, { backgroundColor: data.accent }]}>
            <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.truthTitle, { color: colors.text }]}>Launch-safe preview</Text>
            <Text style={[styles.truthText, { color: colors.textSecondary }]}>
              This screen is intentionally mock-rendered for product review. It does not create friends, family members, tracking records, or family API calls.
            </Text>
          </View>
        </Animated.View>

        <SectionTitle title="Live Map Preview" color={colors.text} />
        <Animated.View entering={FadeInDown.duration(280).delay(120)} style={[styles.mapCard, { backgroundColor: isLight ? '#E8EEF6' : '#121A2D', borderColor: cardBorder }]}>
          <View style={styles.mapGrid} />
          <View style={[styles.routeLine, { backgroundColor: data.accent }]} />
          <View style={[styles.routeLineAlt, { backgroundColor: section === 'family' ? '#EC4899' : '#8B5CF6' }]} />
          {data.people.map((person) => (
            <View
              key={person.id}
              style={[styles.mapPin, { backgroundColor: person.color, top: person.top, left: person.left }]}
            >
              <Text style={styles.mapPinText}>{person.initials.slice(0, 1)}</Text>
            </View>
          ))}
          <View style={styles.mapOverlay}>
            <Ionicons name={section === 'family' ? 'shield-outline' : 'people-outline'} size={20} color="#FFFFFF" />
            <Text style={styles.mapOverlayTitle}>{section === 'family' ? 'Household view' : 'Trusted drive view'}</Text>
            <Text style={styles.mapOverlayText}>3D-style pins, live ETAs, battery, and privacy state at launch.</Text>
          </View>
        </Animated.View>

        <SectionTitle title={section === 'family' ? 'Household' : 'Friends'} color={colors.text} />
        <View style={styles.peopleList}>
          {data.people.map((person, index) => (
            <Animated.View key={person.id} entering={FadeInDown.duration(260).delay(150 + index * 45)}>
              <View style={[styles.personCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.avatar, { backgroundColor: person.color }]}>
                  <Text style={styles.avatarText}>{person.initials}</Text>
                </View>
                <View style={styles.flex}>
                  <View style={styles.personHeader}>
                    <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
                    <View style={[styles.rolePill, { backgroundColor: data.softAccent }]}>
                      <Text style={[styles.roleText, { color: data.accent }]}>{person.role}</Text>
                    </View>
                  </View>
                  <Text style={[styles.personStatus, { color: colors.text }]}>{person.status}</Text>
                  <Text style={[styles.personDetail, { color: colors.textSecondary }]}>{person.detail}</Text>
                  <View style={styles.statRow}>
                    <MiniStat icon={person.icon} text={person.speedMph > 0 ? `${person.speedMph} mph` : 'Stopped'} color={data.accent} />
                    <MiniStat icon="battery-half-outline" text={`${person.battery}%`} color={person.battery > 70 ? '#10B981' : '#F59E0B'} />
                    <MiniStat icon="time-outline" text={person.eta} color={colors.textSecondary} />
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        <SectionTitle title="What It Will Include" color={colors.text} />
        <View style={styles.featureGrid}>
          {data.features.map((feature, index) => (
            <Animated.View key={feature.label} entering={FadeInDown.duration(260).delay(240 + index * 45)} style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.featureIcon, { backgroundColor: data.softAccent }]}>
                <Ionicons name={feature.icon} size={22} color={data.accent} />
              </View>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.label}</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature.text}</Text>
            </Animated.View>
          ))}
        </View>

        <SectionTitle title="Activity" color={colors.text} />
        <View style={styles.eventsList}>
          {data.events.map((event, index) => (
            <Animated.View key={event.id} entering={FadeInDown.duration(260).delay(320 + index * 45)} style={[styles.eventRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={[styles.eventIcon, { backgroundColor: `${event.color}18` }]}>
                <Ionicons name={event.icon} size={18} color={event.color} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                <Text style={[styles.eventBody, { color: colors.textSecondary }]}>{event.body}</Text>
              </View>
              <Text style={[styles.eventTime, { color: colors.textTertiary }]}>{event.time}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={[styles.footerPanel, { backgroundColor: mutedPanel, borderColor: cardBorder }]}>
          <Ionicons name="construct-outline" size={18} color={data.accent} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Backend integration stays off until the production launch path is approved. The hamburger menu is the entry point, keeping the bottom navigation focused on Drive, Offers, Wallet, and Profile.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{title}</Text>;
}

function MiniStat({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.miniStatText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 10 },
  hero: {
    borderRadius: 28,
    padding: 20,
    minHeight: 238,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  launchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  launchPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0 },
  eyebrow: { color: 'rgba(255,255,255,0.76)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  heroTitle: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: 0, marginTop: 5 },
  heroSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 8 },
  metricsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  metric: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  metricValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0 },
  metricLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 18,
    padding: 5,
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  toggleText: { fontSize: 13, fontWeight: '900', letterSpacing: 0 },
  truthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  truthIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  truthTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0 },
  truthText: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 0, marginTop: 24, marginBottom: 10 },
  mapCard: {
    height: 218,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.32,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  routeLine: {
    position: 'absolute',
    width: 210,
    height: 8,
    borderRadius: 999,
    left: 34,
    top: 112,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.9,
  },
  routeLineAlt: {
    position: 'absolute',
    width: 158,
    height: 6,
    borderRadius: 999,
    left: 105,
    top: 82,
    transform: [{ rotate: '26deg' }],
    opacity: 0.72,
  },
  mapPin: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  mapPinText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  mapOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 18,
    padding: 13,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  mapOverlayTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 5 },
  mapOverlayText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 3 },
  peopleList: { gap: 10 },
  personCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  personHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  personName: { flex: 1, fontSize: 16, fontWeight: '900', letterSpacing: 0 },
  rolePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  roleText: { fontSize: 10, fontWeight: '900' },
  personStatus: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  personDetail: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 2 },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontSize: 11, fontWeight: '900' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: {
    width: '48.5%',
    minHeight: 142,
    borderRadius: 20,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0 },
  featureText: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 5 },
  eventsList: { gap: 9 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 18,
    padding: 13,
    borderWidth: StyleSheet.hairlineWidth,
  },
  eventIcon: { width: 38, height: 38, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0 },
  eventBody: { fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  eventTime: { fontSize: 11, fontWeight: '800' },
  footerPanel: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 22,
  },
  footerText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  flex: { flex: 1 },
});
