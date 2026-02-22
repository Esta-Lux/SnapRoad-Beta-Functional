// SnapRoad Mobile - Map Screen (matches /driver web preview)
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Animated, Dimensions, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, BorderRadius, Spacing } from '../utils/theme';
import { DrawerMenu } from '../components/DrawerMenu';

const { width: SCREEN_W } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://snaproad-driver-1.preview.emergentagent.com';

// Types
interface Offer {
  id: number; business_name: string; business_type: string; description: string;
  discount_percent: number; gems_reward: number; address?: string; lat: number; lng: number;
  offer_url?: string | null; redeemed: boolean;
}

// Mock data matching web
const QUICK_LOCATIONS = [
  { id: 1, icon: 'home-outline' as const, label: 'Home', subtitle: 'Set location' },
  { id: 2, icon: 'business-outline' as const, label: 'Work', subtitle: 'Set location' },
];

export const MapScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'favorites' | 'nearby'>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [offersExpanded, setOffersExpanded] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showOfferDetail, setShowOfferDetail] = useState<Offer | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/offers`);
      const data = await res.json();
      if (data.success) setOffers(data.data);
    } catch { /* use empty */ }
  };

  const handleRedeem = async (offerId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/offers/${offerId}/redeem`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, redeemed: true } : o));
        setShowOfferDetail(null);
      }
    } catch { /* ignore */ }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Drawer Menu */}
      <DrawerMenu visible={showDrawer} onClose={() => setShowDrawer(false)} navigation={navigation} />
      
      {/* Search Bar */}
      <View style={s.searchRow}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setShowDrawer(true)}>
          <Ionicons name="menu" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={s.searchBar} onPress={() => navigation?.navigate('SearchDestination')} activeOpacity={0.8}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <Text style={s.searchPlaceholder}>Search here</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.voiceBtn} onPress={() => navigation?.navigate('OrionCoach')}>
          <Ionicons name="mic" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons: Favorites / Nearby / Report */}
      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterBtn, activeFilter === 'favorites' && s.filterBtnActive]}
          onPress={() => setActiveFilter('favorites')}
        >
          <Ionicons name="star" size={14} color={activeFilter === 'favorites' ? '#fff' : Colors.textMuted} />
          <Text style={[s.filterText, activeFilter === 'favorites' && s.filterTextActive]}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterBtn, activeFilter === 'nearby' && s.filterBtnNearby]}
          onPress={() => setActiveFilter('nearby')}
        >
          <Ionicons name="location" size={14} color={activeFilter === 'nearby' ? '#fff' : Colors.textMuted} />
          <Text style={[s.filterText, activeFilter === 'nearby' && s.filterTextActive]}>Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.reportBtn} onPress={() => navigation?.navigate('HazardFeed')}>
          <Ionicons name="alert-triangle" size={14} color="#fff" />
          <Text style={s.reportText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Locations */}
      <View style={s.quickLocRow}>
        {QUICK_LOCATIONS.map(loc => (
          <TouchableOpacity key={loc.id} style={s.quickLocCard}>
            <View style={s.quickLocIcon}>
              <Ionicons name={loc.icon} size={18} color={Colors.textMuted} />
            </View>
            <View>
              <Text style={s.quickLocLabel}>{loc.label}</Text>
              <Text style={s.quickLocSub}>{loc.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.addLocBtn}>
          <Ionicons name="add" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Map Area with offer markers */}
      <View style={s.mapArea}>
        {/* Simulated map background */}
        <View style={s.mapGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`h${i}`} style={[s.gridLine, { top: `${(i + 1) * 12}%` }]} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`v${i}`} style={[s.gridLineV, { left: `${(i + 1) * 16}%` }]} />
          ))}
        </View>

        {/* Offer Diamond Markers */}
        {offers.slice(0, 3).map((offer, i) => {
          const positions = [
            { top: '20%', right: '15%' },
            { top: '40%', right: '30%' },
            { top: '60%', left: '40%' },
          ];
          const pos = positions[i] || positions[0];
          return (
            <TouchableOpacity
              key={offer.id}
              style={[s.offerMarker, pos as any]}
              onPress={() => setShowOfferDetail(offer)}
            >
              <View style={s.offerDiamond}>
                <Ionicons name="diamond" size={16} color="#fff" />
              </View>
              <Text style={s.offerMarkerText}>{offer.discount_percent}%</Text>
            </TouchableOpacity>
          );
        })}

        {/* Car icon */}
        <View style={s.carIcon}>
          <Ionicons name="car-sport" size={28} color={Colors.primary} />
        </View>

        {/* Side buttons */}
        <View style={s.sideButtons}>
          <TouchableOpacity style={s.sideBtn} onPress={() => navigation?.navigate('PhotoCapture')}>
            <Ionicons name="camera-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Nearby Offers Panel */}
      <View style={s.offersPanel}>
        <TouchableOpacity style={s.offersPanelHeader} onPress={() => setOffersExpanded(!offersExpanded)}>
          <View style={s.offersPanelTitle}>
            <Ionicons name="gift" size={18} color={Colors.primary} />
            <Text style={s.offersPanelLabel}>Nearby Offers</Text>
            <View style={s.offersBadge}>
              <Text style={s.offersBadgeText}>{offers.length}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={offersExpanded ? 'chevron-down' : 'chevron-up'} size={18} color={Colors.textMuted} />
            <TouchableOpacity onPress={() => setOffersExpanded(false)}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {offersExpanded && (
          <>
            <View style={s.premiumBanner}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={s.premiumText}>Premium: 18% off all offers</Text>
            </View>
            <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
              {offers.map(offer => (
                <TouchableOpacity key={offer.id} style={s.offerCard} onPress={() => setShowOfferDetail(offer)}>
                  <View style={s.offerCardIcon}>
                    <Ionicons name={offer.business_type === 'cafe' ? 'cafe' : offer.business_type === 'gas' ? 'car' : 'gift'} size={18} color={Colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.offerName}>{offer.business_name}</Text>
                      <View style={s.discountBadge}>
                        <Text style={s.discountText}>{offer.discount_percent}% off</Text>
                      </View>
                    </View>
                    <Text style={s.offerMeta}>0.5 km  ·  4d left  ·  +{offer.gems_reward}</Text>
                  </View>
                  <TouchableOpacity style={s.navBtn} onPress={() => navigation?.navigate('RoutePreview', { destination: offer.business_name })}>
                    <Ionicons name="navigate" size={16} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {/* Offer Detail Modal */}
      <Modal visible={!!showOfferDetail} transparent animationType="slide">
        {showOfferDetail && (
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{showOfferDetail.business_name}</Text>
                <TouchableOpacity onPress={() => setShowOfferDetail(null)}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={s.modalDesc}>{showOfferDetail.description}</Text>
              {showOfferDetail.address && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Ionicons name="location" size={14} color={Colors.primary} />
                  <Text style={s.modalAddress}>{showOfferDetail.address}</Text>
                </View>
              )}
              <View style={s.modalStats}>
                <View style={s.modalStat}>
                  <Text style={s.modalStatValue}>{showOfferDetail.discount_percent}%</Text>
                  <Text style={s.modalStatLabel}>Discount</Text>
                </View>
                <View style={s.modalStat}>
                  <Text style={[s.modalStatValue, { color: Colors.primary }]}>+{showOfferDetail.gems_reward}</Text>
                  <Text style={s.modalStatLabel}>Gems</Text>
                </View>
              </View>
              {showOfferDetail.offer_url && (
                <TouchableOpacity style={s.viewDealBtn}>
                  <Ionicons name="open-outline" size={16} color="#60A5FA" />
                  <Text style={{ color: '#60A5FA', fontWeight: FontWeights.semibold, fontSize: FontSizes.sm }}>View Deal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.redeemBtn, showOfferDetail.redeemed && s.redeemBtnDone]}
                onPress={() => !showOfferDetail.redeemed && handleRedeem(showOfferDetail.id)}
                disabled={showOfferDetail.redeemed}
              >
                <Text style={s.redeemText}>{showOfferDetail.redeemed ? 'Redeemed' : 'Redeem Offer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E16' },
  // Search bar
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  menuBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flex: 1, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  searchPlaceholder: { color: Colors.textMuted, fontSize: FontSizes.md },
  voiceBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterBtnNearby: { backgroundColor: '#374151' },
  filterText: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  filterTextActive: { color: '#fff' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F59E0B' },
  reportText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  // Quick locations
  quickLocRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  quickLocCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  quickLocIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  quickLocLabel: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  quickLocSub: { color: Colors.primary, fontSize: FontSizes.xs },
  addLocBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  // Map
  mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  mapGrid: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  offerMarker: { position: 'absolute', alignItems: 'center', zIndex: 10 },
  offerDiamond: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '0deg' }] },
  offerMarkerText: { color: '#22C55E', fontSize: 10, fontWeight: FontWeights.bold, marginTop: 2 },
  carIcon: { position: 'absolute', top: '50%', left: '48%', zIndex: 5 },
  sideButtons: { position: 'absolute', right: 12, bottom: 12, gap: 8 },
  sideBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(10,14,22,0.85)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  // Offers Panel
  offersPanel: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  offersPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  offersPanelTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offersPanelLabel: { color: Colors.text, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  offersBadge: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  offersBadgeText: { color: '#fff', fontSize: 11, fontWeight: FontWeights.bold },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  premiumText: { color: '#F59E0B', fontSize: FontSizes.xs },
  offerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, marginBottom: 6 },
  offerCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  offerName: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  discountBadge: { backgroundColor: '#22C55E20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { color: '#22C55E', fontSize: 10, fontWeight: FontWeights.bold },
  offerMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  modalDesc: { color: Colors.textSecondary, fontSize: FontSizes.sm, lineHeight: 20 },
  modalAddress: { color: Colors.textMuted, fontSize: FontSizes.xs },
  modalStats: { flexDirection: 'row', gap: 16, marginTop: 16, marginBottom: 16 },
  modalStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, alignItems: 'center' },
  modalStatValue: { color: '#22C55E', fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  modalStatLabel: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  viewDealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: 12, paddingVertical: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)' },
  redeemBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  redeemBtnDone: { backgroundColor: '#374151' },
  redeemText: { color: '#fff', fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});

export default MapScreen;
