// SnapRoad Mobile - Car Studio Screen (Premium 3D Car Customization)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights } from '../utils/theme';
import { useUserStore } from '../store';

const { width: SCREEN_W } = Dimensions.get('window');

interface CarColor {
  key: string;
  name: string;
  hex: string;
  type: 'standard' | 'metallic' | 'matte' | 'premium';
  price?: number;
  owned?: boolean;
}

const CAR_COLORS: CarColor[] = [
  // Standard
  { key: 'midnight-black', name: 'Midnight Black', hex: '#1E293B', type: 'standard' },
  { key: 'pearl-white', name: 'Pearl White', hex: '#F1F5F9', type: 'standard' },
  { key: 'silver-grey', name: 'Silver Grey', hex: '#94A3B8', type: 'standard' },
  { key: 'navy-blue', name: 'Navy Blue', hex: '#1E3A8A', type: 'standard' },
  { key: 'forest-green', name: 'Forest Green', hex: '#166534', type: 'standard' },
  { key: 'burgundy-red', name: 'Burgundy Red', hex: '#991B1B', type: 'standard' },
  // Metallic
  { key: 'ocean-blue', name: 'Ocean Blue', hex: '#3B82F6', type: 'metallic' },
  { key: 'racing-red', name: 'Racing Red', hex: '#EF4444', type: 'metallic' },
  { key: 'emerald-green', name: 'Emerald Green', hex: '#10B981', type: 'metallic' },
  { key: 'sunset-gold', name: 'Sunset Gold', hex: '#F59E0B', type: 'metallic' },
  { key: 'purple-haze', name: 'Purple Haze', hex: '#8B5CF6', type: 'metallic' },
  // Matte
  { key: 'matte-black', name: 'Matte Black', hex: '#0F172A', type: 'matte' },
  { key: 'matte-grey', name: 'Matte Grey', hex: '#475569', type: 'matte' },
  { key: 'matte-army', name: 'Matte Army', hex: '#4D7C0F', type: 'matte' },
  // Premium
  { key: 'chrome-silver', name: 'Chrome Silver', hex: '#E2E8F0', type: 'premium', price: 2500 },
  { key: 'candy-apple', name: 'Candy Apple', hex: '#DC2626', type: 'premium', price: 3000 },
  { key: 'chameleon', name: 'Chameleon', hex: '#14B8A6', type: 'premium', price: 5000 },
];

const CAR_TYPES = [
  { key: 'sedan', name: 'Sedan', icon: 'car-sport' },
  { key: 'suv', name: 'SUV', icon: 'car' },
  { key: 'truck', name: 'Truck', icon: 'bus' },
];

export const CarStudioScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<'garage' | 'paint' | 'upgrades'>('paint');
  const [selectedColor, setSelectedColor] = useState('ocean-blue');
  const [selectedCarType, setSelectedCarType] = useState('sedan');
  const [ownedColors, setOwnedColors] = useState(['midnight-black', 'pearl-white', 'ocean-blue']);
  const [showPurchaseModal, setShowPurchaseModal] = useState<CarColor | null>(null);
  const gems = user?.gems || 2450;

  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 8000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 8000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  const handlePurchaseColor = (color: CarColor) => {
    if (color.price && gems >= color.price) {
      setOwnedColors([...ownedColors, color.key]);
      setSelectedColor(color.key);
      setShowPurchaseModal(null);
    }
  };

  const currentColor = CAR_COLORS.find(c => c.key === selectedColor) || CAR_COLORS[0];

  const renderColorGroup = (type: string, title: string, badge?: string) => {
    const colors = CAR_COLORS.filter(c => c.type === type);
    return (
      <View style={s.colorSection}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{title}</Text>
          {badge && <Text style={s.sectionBadge}>{badge}</Text>}
        </View>
        <View style={s.colorGrid}>
          {colors.map(color => {
            const isOwned = ownedColors.includes(color.key) || !color.price;
            const isSelected = selectedColor === color.key;
            return (
              <TouchableOpacity
                key={color.key}
                style={[
                  s.colorSwatch,
                  { backgroundColor: color.hex },
                  isSelected && s.colorSwatchSelected,
                  color.type === 'premium' && s.colorSwatchPremium,
                ]}
                onPress={() => {
                  if (isOwned) {
                    setSelectedColor(color.key);
                  } else {
                    setShowPurchaseModal(color);
                  }
                }}
              >
                {color.type === 'metallic' && <View style={s.metallicShine} />}
                {!isOwned && (
                  <View style={s.lockedOverlay}>
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                  </View>
                )}
                {isSelected && (
                  <View style={s.selectedCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Ambient Background */}
      <View style={s.ambientBg}>
        <View style={[s.glowOrb, { backgroundColor: currentColor.hex, left: '20%', top: '10%' }]} />
        <View style={[s.glowOrb, { backgroundColor: '#8B5CF6', right: '10%', bottom: '20%' }]} />
      </View>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={s.titleRow}>
          <LinearGradient colors={['#F59E0B', '#F97316']} style={s.titleIcon}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </LinearGradient>
          <Text style={s.title}>CAR STUDIO</Text>
        </View>
        <View style={s.gemsContainer}>
          <Ionicons name="flash" size={14} color="#F59E0B" />
          <Text style={s.gemsText}>{gems.toLocaleString()}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[
          { key: 'garage', label: 'GARAGE', icon: '🏠', disabled: true },
          { key: 'paint', label: 'PAINT SHOP', icon: '🎨', disabled: false },
          { key: 'upgrades', label: 'UPGRADES', icon: '⚡', disabled: true },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive, tab.disabled && s.tabDisabled]}
            onPress={() => !tab.disabled && setActiveTab(tab.key as any)}
            disabled={tab.disabled}
          >
            <Text style={s.tabIcon}>{tab.icon}</Text>
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
            {tab.disabled && <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.3)" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Car Display */}
      <View style={s.carDisplay}>
        <View style={s.spotlight} />
        <View style={s.platform} />
        
        {/* Car Visualization */}
        <View style={s.carContainer}>
          <View style={[s.carBody, { backgroundColor: currentColor.hex }]}>
            <View style={s.carRoof} />
            <View style={s.carWindshield} />
            <View style={s.carHood} />
            <View style={[s.carWheel, s.wheelFront]} />
            <View style={[s.carWheel, s.wheelBack]} />
            <View style={s.carHeadlight} />
            <View style={s.carTaillight} />
            {currentColor.type === 'metallic' && <View style={s.carShine} />}
          </View>
        </View>

        {/* Car Info Badge */}
        <View style={s.carInfoBadge}>
          <Text style={s.carInfoText}>
            {currentColor.name} <Text style={s.carInfoDot}>•</Text> {CAR_TYPES.find(c => c.key === selectedCarType)?.name}
          </Text>
        </View>

        <View style={s.betaBadge}>
          <Text style={s.betaText}>BETA</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'paint' && (
          <>
            {/* Current Color */}
            <View style={s.currentColorCard}>
              <View>
                <Text style={s.currentLabel}>CURRENT FINISH</Text>
                <Text style={s.currentName}>{currentColor.name}</Text>
                <Text style={s.currentType}>{currentColor.type} finish</Text>
              </View>
              <View style={[s.currentSwatch, { backgroundColor: currentColor.hex }]} />
            </View>

            {renderColorGroup('standard', 'STANDARD')}
            {renderColorGroup('metallic', 'METALLIC', '✦')}
            {renderColorGroup('matte', 'MATTE')}
            {renderColorGroup('premium', 'PREMIUM', '⚡')}
          </>
        )}

        {(activeTab === 'garage' || activeTab === 'upgrades') && (
          <View style={s.comingSoon}>
            <Text style={s.comingSoonIcon}>{activeTab === 'garage' ? '🚗' : '⚡'}</Text>
            <Text style={s.comingSoonTitle}>Coming Soon</Text>
            <Text style={s.comingSoonText}>
              {activeTab === 'garage' 
                ? 'Choose your vehicle type in a future update.' 
                : 'Rims, spoilers, and decals will be available soon.'}
            </Text>
            <TouchableOpacity style={s.goToPaintBtn} onPress={() => setActiveTab('paint')}>
              <Text style={s.goToPaintText}>Go to Paint Shop →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={[s.modalColorPreview, { backgroundColor: showPurchaseModal.hex }]} />
            <Text style={s.modalTitle}>{showPurchaseModal.name}</Text>
            <Text style={s.modalType}>{showPurchaseModal.type.toUpperCase()} FINISH</Text>
            <View style={s.modalPrice}>
              <Ionicons name="flash" size={18} color="#F59E0B" />
              <Text style={s.modalPriceText}>{showPurchaseModal.price?.toLocaleString()}</Text>
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowPurchaseModal(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.modalBuyBtn, gems < (showPurchaseModal.price || 0) && s.modalBuyBtnDisabled]} 
                onPress={() => handlePurchaseColor(showPurchaseModal)}
                disabled={gems < (showPurchaseModal.price || 0)}
              >
                <Text style={s.modalBuyText}>
                  {gems >= (showPurchaseModal.price || 0) ? 'Purchase' : 'Not Enough Gems'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  ambientBg: { position: 'absolute', width: '100%', height: '100%' },
  glowOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.1, transform: [{ scale: 1.5 }] },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold, letterSpacing: 1 },
  gemsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  gemsText: { color: '#fff', fontWeight: FontWeights.bold, fontSize: FontSizes.sm },
  // Tabs
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  tabDisabled: { opacity: 0.5 },
  tabIcon: { fontSize: 12 },
  tabLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: FontWeights.bold, letterSpacing: 0.5 },
  tabLabelActive: { color: '#fff' },
  // Car Display
  carDisplay: { height: 220, marginHorizontal: 16, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', position: 'relative' },
  spotlight: { position: 'absolute', top: 0, left: '50%', marginLeft: -100, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' },
  platform: { position: 'absolute', bottom: 30, left: '50%', marginLeft: -80, width: 160, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  carContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -60, marginTop: -30 },
  carBody: { width: 120, height: 45, borderRadius: 8, position: 'relative' },
  carRoof: { position: 'absolute', top: -15, left: 25, width: 50, height: 20, borderRadius: 6, backgroundColor: 'inherit' },
  carWindshield: { position: 'absolute', top: -12, left: 28, width: 20, height: 14, borderRadius: 3, backgroundColor: '#0F172A' },
  carHood: { position: 'absolute', top: -12, left: 52, width: 20, height: 14, borderRadius: 3, backgroundColor: '#0F172A' },
  carWheel: { position: 'absolute', bottom: -8, width: 18, height: 18, borderRadius: 9, backgroundColor: '#1E293B', borderWidth: 3, borderColor: '#374151' },
  wheelFront: { left: 15 },
  wheelBack: { right: 15 },
  carHeadlight: { position: 'absolute', right: 5, top: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FEF3C7' },
  carTaillight: { position: 'absolute', left: 5, top: 14, width: 6, height: 6, borderRadius: 2, backgroundColor: '#EF4444' },
  carShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
  carInfoBadge: { position: 'absolute', top: 12, left: '50%', transform: [{ translateX: -60 }], backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  carInfoText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  carInfoDot: { color: 'rgba(255,255,255,0.3)' },
  betaBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  betaText: { color: '#F59E0B', fontSize: 10, fontWeight: FontWeights.bold },
  // Content
  content: { flex: 1, paddingHorizontal: 16 },
  currentColorCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  currentLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 1 },
  currentName: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, marginTop: 4 },
  currentType: { color: 'rgba(255,255,255,0.4)', fontSize: FontSizes.xs, textTransform: 'capitalize', marginTop: 2 },
  currentSwatch: { width: 56, height: 56, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  // Color sections
  colorSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 1 },
  sectionBadge: { color: '#F59E0B', fontSize: 10 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: { width: 40, height: 40, borderRadius: 10, position: 'relative', overflow: 'hidden' },
  colorSwatchSelected: { borderWidth: 2, borderColor: '#F59E0B', transform: [{ scale: 1.1 }] },
  colorSwatchPremium: { width: (SCREEN_W - 64) / 3, height: 60 },
  metallicShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.25)' },
  lockedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  selectedCheck: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  // Coming soon
  comingSoon: { alignItems: 'center', paddingVertical: 60 },
  comingSoonIcon: { fontSize: 48, marginBottom: 16 },
  comingSoonTitle: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold, marginBottom: 8 },
  comingSoonText: { color: 'rgba(255,255,255,0.4)', fontSize: FontSizes.sm, textAlign: 'center', maxWidth: 250 },
  goToPaintBtn: { marginTop: 24, backgroundColor: '#F59E0B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  goToPaintText: { color: '#fff', fontWeight: FontWeights.semibold },
  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1E293B', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 320 },
  modalColorPreview: { width: 80, height: 80, borderRadius: 20, marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  modalType: { color: 'rgba(255,255,255,0.4)', fontSize: FontSizes.xs, letterSpacing: 1, marginTop: 4 },
  modalPrice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 24 },
  modalPriceText: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: 'rgba(255,255,255,0.6)', fontWeight: FontWeights.semibold },
  modalBuyBtn: { flex: 1, backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBuyBtnDisabled: { opacity: 0.5 },
  modalBuyText: { color: '#fff', fontWeight: FontWeights.bold },
});

export default CarStudioScreen;
