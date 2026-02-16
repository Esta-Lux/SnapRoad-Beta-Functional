// SnapRoad Mobile - COMPLETE Flutter/Web UI Recreation
// All screens matching the web app exactly

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Animated,
  StatusBar,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// ============================================
// THEME - EXACT Colors from Flutter/Web UI
// ============================================
const Colors = {
  // Primary
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  
  // Accent  
  amber: '#F59E0B',
  orange: '#F97316',
  purple: '#8B5CF6',
  green: '#22C55E',
  red: '#EF4444',
  
  // Dark theme backgrounds
  background: '#0F172A',
  backgroundDark: '#0B1120',
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceLighter: '#475569',
  
  // Text
  white: '#FFFFFF',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Tab bar (white/light)
  tabBarBg: '#F8FAFC',
  tabInactive: '#94A3B8',
  
  // Gems
  gem: '#A855F7',
  gemBlue: '#3B82F6',
};

// ============================================
// TYPES
// ============================================
type AppScreen = 'planSelection' | 'carOnboarding' | 'main';
type TabType = 'map' | 'routes' | 'rewards' | 'profile';
type RewardsTab = 'offers' | 'challenges' | 'badges' | 'carstudio';
type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings';
type LocationFilter = 'favorites' | 'nearby' | 'report';

interface UserData {
  name: string;
  gems: number;
  level: number;
  xp: number;
  safety_score: number;
  total_miles: number;
  total_trips: number;
  is_premium: boolean;
  gem_multiplier: number;
  plan: 'basic' | 'premium' | null;
  car: { category: string; variant: string; color: string };
}

// ============================================
// MOCK DATA
// ============================================
const initialUserData: UserData = {
  name: 'Driver',
  gems: 0,
  level: 1,
  xp: 0,
  safety_score: 100,
  total_miles: 0,
  total_trips: 0,
  is_premium: false,
  gem_multiplier: 1,
  plan: null,
  car: { category: 'sedan', variant: 'sedan-classic', color: 'ocean-blue' },
};

const mockOffers = [
  { id: 1, name: 'Shell', type: 'Gas Station', discount: 15, gems: 50, distance: '0.3 mi', color: 'blue' },
  { id: 2, name: 'Starbucks', type: 'Coffee', discount: 100, gems: 75, distance: '0.5 mi', color: 'blue' },
  { id: 3, name: 'Quick Clean', type: 'Car Wash', discount: 20, gems: 40, distance: '0.8 mi', color: 'green' },
  { id: 4, name: 'Chipotle', type: 'Restaurant', discount: 25, gems: 60, distance: '1.2 mi', color: 'blue' },
];

const mockChallenges = [
  { id: 1, title: 'Safe Week', description: 'Complete 7 trips with 90+ safety', progress: 3, goal: 7, gems: 100, xp: 500, joined: true },
  { id: 2, title: 'Mile Marker', description: 'Drive 50 miles this week', progress: 23, goal: 50, gems: 75, xp: 300, joined: true },
  { id: 3, title: 'Early Bird', description: 'Complete 5 trips before 8am', progress: 0, goal: 5, gems: 50, xp: 200, joined: false },
];

const mockBadges = [
  { id: 1, name: 'Safe Driver', icon: 'shield-checkmark', earned: true, color: Colors.green },
  { id: 2, name: 'Mile Master', icon: 'speedometer', earned: true, color: Colors.primary },
  { id: 3, name: 'Early Bird', icon: 'sunny', earned: false, color: Colors.amber },
  { id: 4, name: 'Night Owl', icon: 'moon', earned: false, color: Colors.purple },
  { id: 5, name: 'Eco Warrior', icon: 'leaf', earned: false, color: Colors.green },
  { id: 6, name: 'Social Star', icon: 'people', earned: true, color: Colors.primary },
];

const carTypes = [
  { id: 'sedan', name: 'Sedan', description: 'Compact & efficient' },
  { id: 'suv', name: 'SUV', description: 'Spacious & versatile' },
  { id: 'truck', name: 'Truck', description: 'Powerful & rugged' },
];

const carColors = [
  { id: 'ocean-blue', name: 'Ocean Blue', hex: '#3B82F6', free: true },
  { id: 'midnight-black', name: 'Midnight Black', hex: '#1E293B', free: false },
  { id: 'pearl-white', name: 'Pearl White', hex: '#F8FAFC', free: false },
  { id: 'racing-red', name: 'Racing Red', hex: '#EF4444', free: false },
  { id: 'forest-green', name: 'Forest Green', hex: '#22C55E', free: false },
  { id: 'sunset-gold', name: 'Sunset Gold', hex: '#FBBF24', free: false },
];

const gemMarkers = [
  { id: 1, percent: 6, top: 0.25, left: 0.7, color: 'blue' },
  { id: 2, percent: 6, top: 0.38, left: 0.55, color: 'blue' },
  { id: 3, percent: 6, top: 0.52, left: 0.4, color: 'blue' },
  { id: 4, percent: 18, top: 0.65, left: 0.25, color: 'green' },
  { id: 5, percent: 6, top: 0.72, left: 0.65, color: 'blue' },
];

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function DriverAppMain() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('planSelection');
  const [userData, setUserData] = useState<UserData>(initialUserData);
  const insets = useSafeAreaInsets();

  // Plan selection handler
  const handlePlanSelect = (plan: 'basic' | 'premium') => {
    setUserData(prev => ({
      ...prev,
      plan,
      is_premium: plan === 'premium',
      gem_multiplier: plan === 'premium' ? 2 : 1,
    }));
    setCurrentScreen('carOnboarding');
  };

  // Car selection handler
  const handleCarComplete = (car: { category: string; variant: string; color: string }) => {
    setUserData(prev => ({ ...prev, car }));
    setCurrentScreen('main');
  };

  // Render based on current screen
  if (currentScreen === 'planSelection') {
    return <PlanSelectionScreen onSelect={handlePlanSelect} />;
  }

  if (currentScreen === 'carOnboarding') {
    return <CarOnboardingScreen onComplete={handleCarComplete} />;
  }

  return <MainApp userData={userData} setUserData={setUserData} />;
}

// ============================================
// PLAN SELECTION SCREEN - Exact Match
// ============================================
function PlanSelectionScreen({ onSelect }: { onSelect: (plan: 'basic' | 'premium') => void }) {
  const [selected, setSelected] = useState<'basic' | 'premium' | null>(null);
  const insets = useSafeAreaInsets();

  const basicFeatures = [
    { icon: 'navigate', text: 'Manual rerouting' },
    { icon: 'shield-checkmark', text: 'Privacy-first navigation' },
    { icon: 'camera', text: 'Auto-blur photos' },
    { icon: 'location', text: 'Local offers' },
    { icon: 'diamond', text: 'Earn Gems (1×)' },
  ];

  const premiumFeatures = [
    { icon: 'checkmark', text: 'Everything in Basic', highlight: true },
    { icon: 'navigate', text: 'Automatic rerouting' },
    { icon: 'gift', text: 'Advanced local offers' },
    { icon: 'diamond', text: 'Gem multiplier (2×)', highlight: true },
    { icon: 'analytics', text: 'Smart commute analytics' },
    { icon: 'headset', text: 'Priority support' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.background, Colors.backgroundDark, Colors.background]} style={styles.fullScreen}>
        {/* Header */}
        <View style={styles.planHeader}>
          <View style={styles.planHeaderIconRow}>
            <Ionicons name="sparkles" size={18} color={Colors.amber} />
            <Text style={styles.planHeaderLabel}>CHOOSE YOUR PLAN</Text>
          </View>
          <Text style={styles.planTitle}>Start Your Journey</Text>
          <Text style={styles.planSubtitle}>Drive safer. Earn rewards. Privacy guaranteed.</Text>
        </View>

        <ScrollView style={styles.planScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.planScrollContent}>
          {/* Basic Plan Card */}
          <TouchableOpacity
            style={[styles.planCard, selected === 'basic' && styles.planCardSelected]}
            onPress={() => setSelected('basic')}
            activeOpacity={0.8}
          >
            <View style={styles.planCardHeader}>
              <View>
                <Text style={styles.planName}>BASIC</Text>
                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>$0</Text>
                  <Text style={styles.planPeriod}>/mo</Text>
                </View>
              </View>
              <View style={[styles.radioOuter, selected === 'basic' && styles.radioSelected]}>
                {selected === 'basic' && <View style={styles.radioInner} />}
              </View>
            </View>
            <Text style={styles.planDesc}>Privacy-first navigation for everyday driving.</Text>
            <View style={styles.featuresList}>
              {basicFeatures.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name={f.icon as any} size={14} color={Colors.textMuted} />
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>

          {/* Premium Plan Card */}
          <TouchableOpacity
            style={[styles.planCard, styles.planCardPremium, selected === 'premium' && styles.planCardPremiumSelected]}
            onPress={() => setSelected('premium')}
            activeOpacity={0.8}
          >
            {/* Most Popular Badge */}
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
            </View>

            <View style={styles.planCardHeader}>
              <View>
                <View style={styles.premiumNameRow}>
                  <Ionicons name="flash" size={16} color={Colors.amber} />
                  <Text style={[styles.planName, { color: Colors.amber }]}>PREMIUM</Text>
                </View>
                <View style={styles.planPriceRow}>
                  <Text style={styles.planPrice}>$10.99</Text>
                  <Text style={styles.planPeriod}>/mo</Text>
                  <Text style={styles.originalPrice}>$16.99/mo</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>35% OFF</Text>
                  </View>
                </View>
                <View style={styles.foundersRow}>
                  <Ionicons name="star" size={10} color={Colors.amber} />
                  <Text style={styles.foundersText}>Founders pricing</Text>
                </View>
              </View>
              <View style={[styles.radioOuter, selected === 'premium' && styles.radioSelectedPremium]}>
                {selected === 'premium' && <View style={[styles.radioInner, { backgroundColor: Colors.amber }]} />}
              </View>
            </View>

            <Text style={styles.planDesc}>Auto-routing, insights, and faster rewards.</Text>

            {/* Lock in price */}
            <View style={styles.lockInBox}>
              <Text style={styles.lockInText}>🎉 Lock in $10.99/month for life!</Text>
            </View>

            <View style={styles.featuresList}>
              {premiumFeatures.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name={f.icon as any} size={14} color={f.highlight ? Colors.amber : Colors.textMuted} />
                  <Text style={[styles.featureText, f.highlight && { color: '#FCD34D' }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View style={styles.planFooter}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              selected === 'premium' && styles.continueBtnPremium,
              !selected && styles.continueBtnDisabled,
            ]}
            onPress={() => selected && onSelect(selected)}
            disabled={!selected}
          >
            <LinearGradient
              colors={selected === 'premium' ? [Colors.amber, Colors.orange] : selected === 'basic' ? [Colors.primary, Colors.primaryDark] : [Colors.surfaceLight, Colors.surface]}
              style={styles.continueBtnGradient}
            >
              {selected === 'premium' ? (
                <>
                  <Ionicons name="flash" size={20} color={Colors.white} />
                  <Text style={styles.continueBtnText}>Continue with Premium</Text>
                </>
              ) : selected === 'basic' ? (
                <>
                  <Ionicons name="checkmark" size={20} color={Colors.white} />
                  <Text style={styles.continueBtnText}>Choose Basic</Text>
                </>
              ) : (
                <Text style={[styles.continueBtnText, { color: Colors.textMuted }]}>Select a Plan</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.footerNote}>No contracts - cancel anytime</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================================
// CAR ONBOARDING SCREEN - Exact Match
// ============================================
function CarOnboardingScreen({ onComplete }: { onComplete: (car: { category: string; variant: string; color: string }) => void }) {
  const [step, setStep] = useState<'type' | 'color'>('type');
  const [selectedType, setSelectedType] = useState('sedan');
  const [selectedColor, setSelectedColor] = useState('ocean-blue');
  const insets = useSafeAreaInsets();

  const handleContinue = () => {
    if (step === 'type') {
      setStep('color');
    } else {
      onComplete({ category: selectedType, variant: `${selectedType}-classic`, color: selectedColor });
    }
  };

  const selectedColorData = carColors.find(c => c.id === selectedColor);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.background, Colors.backgroundDark, Colors.background]} style={styles.fullScreen}>
        {/* Header */}
        <View style={styles.carHeader}>
          <View style={styles.carHeaderRow}>
            <View style={styles.planHeaderIconRow}>
              <Ionicons name="sparkles" size={18} color={Colors.amber} />
              <Text style={styles.planHeaderLabel}>{step === 'type' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}</Text>
            </View>
          </View>
          <Text style={styles.carTitle}>{step === 'type' ? 'Choose your ride' : 'Pick your color'}</Text>
          <Text style={styles.carSubtitle}>
            {step === 'type' ? 'Select the type of vehicle you drive' : 'Blue is free! Earn gems to unlock more'}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressBarRow}>
            <View style={[styles.progressBarSegment, styles.progressBarActive]} />
            <View style={[styles.progressBarSegment, step === 'color' && styles.progressBarActive]} />
          </View>
        </View>

        <ScrollView style={styles.carContent} showsVerticalScrollIndicator={false}>
          {step === 'type' ? (
            /* Car Type Selection */
            <View style={styles.carTypesList}>
              {carTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.carTypeCard, selectedType === type.id && styles.carTypeCardSelected]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <View style={[styles.carTypePreview, selectedType === type.id && styles.carTypePreviewSelected]}>
                    <Ionicons name="car-sport" size={36} color={selectedType === type.id ? Colors.primary : Colors.textSecondary} />
                  </View>
                  <View style={styles.carTypeInfo}>
                    <Text style={styles.carTypeName}>{type.name}</Text>
                    <Text style={styles.carTypeDesc}>{type.description}</Text>
                  </View>
                  <View style={[styles.radioOuter, selectedType === type.id && styles.radioSelected]}>
                    {selectedType === type.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* Color Selection */
            <View style={styles.colorContent}>
              {/* Car Preview */}
              <View style={styles.carPreviewBox}>
                <View style={styles.carPreviewGlow} />
                <View style={[styles.carPreviewIcon, { backgroundColor: selectedColorData?.hex || Colors.primary }]}>
                  <Ionicons name="car-sport" size={64} color={selectedColorData?.hex === '#F8FAFC' ? '#000' : '#fff'} />
                </View>
                <Text style={styles.carPreviewName}>{selectedColorData?.name}</Text>
                <Text style={styles.carPreviewType}>{selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</Text>
              </View>

              {/* Color Grid */}
              <Text style={styles.colorGridLabel}>Select a color</Text>
              <View style={styles.colorGrid}>
                {carColors.map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    style={[styles.colorSwatch, selectedColor === color.id && styles.colorSwatchSelected]}
                    onPress={() => color.free && setSelectedColor(color.id)}
                    disabled={!color.free}
                  >
                    <View style={[styles.colorSwatchInner, { backgroundColor: color.hex }, !color.free && styles.colorSwatchLocked]}>
                      {!color.free && <Text style={styles.lockEmoji}>🔒</Text>}
                      {selectedColor === color.id && color.free && (
                        <View style={styles.colorCheckmark}>
                          <Ionicons name="checkmark" size={16} color={color.hex === '#F8FAFC' ? '#000' : '#fff'} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.colorHint}>💎 Drive safely to earn gems and unlock more colors!</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.carFooter}>
          <TouchableOpacity style={styles.carContinueBtn} onPress={handleContinue}>
            <LinearGradient colors={[Colors.amber, Colors.orange]} style={styles.carContinueGradient}>
              {step === 'type' ? (
                <>
                  <Text style={styles.carContinueText}>Continue</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.white} />
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={Colors.white} />
                  <Text style={styles.carContinueText}>Let's Go!</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {step === 'color' && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('type')}>
              <Text style={styles.backBtnText}>← Back to vehicle selection</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================================
// MAIN APP - With all 4 Tabs
// ============================================
function MainApp({ userData, setUserData }: { userData: UserData; setUserData: any }) {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [rewardsTab, setRewardsTab] = useState<RewardsTab>('offers');
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Status Bar Area */}
      <View style={[styles.statusBarArea, { paddingTop: insets.top }]}>
        <Text style={styles.statusTime}>9:41</Text>
        <View style={styles.statusRight}>
          <Text style={styles.statusText}>5G</Text>
          <Ionicons name="cellular" size={14} color={Colors.white} />
          <Ionicons name="battery-full" size={18} color={Colors.white} />
        </View>
      </View>

      {/* Header with Search */}
      <View style={styles.mainHeader}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setShowMenu(true)}>
          <Ionicons name="menu" size={26} color={Colors.white} />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search here"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity style={styles.micBtn}>
          <Ionicons name="mic-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.mainContent}>
        {activeTab === 'map' && <MapTab userData={userData} />}
        {activeTab === 'routes' && <RoutesTab />}
        {activeTab === 'rewards' && <RewardsTabContent activeSubTab={rewardsTab} onSubTabChange={setRewardsTab} userData={userData} />}
        {activeTab === 'profile' && <ProfileTabContent activeSubTab={profileTab} onSubTabChange={setProfileTab} userData={userData} />}
      </View>

      {/* Bottom Tab Bar - WHITE BACKGROUND */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        <TabBarItem icon="location" label="Map" active={activeTab === 'map'} onPress={() => setActiveTab('map')} />
        <TabBarItem icon="git-branch" label="Routes" active={activeTab === 'routes'} onPress={() => setActiveTab('routes')} />
        <TabBarItem icon="gift" label="Rewards" active={activeTab === 'rewards'} onPress={() => setActiveTab('rewards')} />
        <TabBarItem icon="settings" label="Profile" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
      </View>

      {/* Side Menu */}
      <SideMenuModal visible={showMenu} onClose={() => setShowMenu(false)} userData={userData} />
    </View>
  );
}

// Tab Bar Item
function TabBarItem({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tabBarItem} onPress={onPress}>
      <Ionicons name={active ? icon as any : `${icon}-outline` as any} size={24} color={active ? Colors.primary : Colors.tabInactive} />
      <Text style={[styles.tabBarLabel, active && styles.tabBarLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================
// MAP TAB - Exact Flutter/Web UI Match
// ============================================
function MapTab({ userData }: { userData: UserData }) {
  const [filter, setFilter] = useState<LocationFilter>('favorites');

  return (
    <View style={styles.mapContainer}>
      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'favorites' && styles.filterBtnActive]}
          onPress={() => setFilter('favorites')}
        >
          <Ionicons name="star" size={16} color={Colors.white} />
          <Text style={styles.filterBtnText}>Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, styles.filterBtnInactive]}
          onPress={() => setFilter('nearby')}
        >
          <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.filterBtnTextInactive}>Nearby</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, styles.filterBtnOrange]}
          onPress={() => setFilter('report')}
        >
          <Ionicons name="warning" size={16} color={Colors.white} />
          <Text style={styles.filterBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Locations */}
      <View style={styles.quickLocRow}>
        <TouchableOpacity style={styles.quickLocCard}>
          <View style={styles.quickLocIcon}>
            <Ionicons name="home-outline" size={20} color={Colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.quickLocName}>Home</Text>
            <Text style={styles.quickLocAction}>Set location</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickLocCard}>
          <View style={styles.quickLocIcon}>
            <Ionicons name="briefcase-outline" size={20} color={Colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.quickLocName}>Work</Text>
            <Text style={styles.quickLocAction}>Set location</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addLocBtn}>
          <Ionicons name="add" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Map Area */}
      <View style={styles.mapArea}>
        {/* Dark map background */}
        <View style={styles.mapBg}>
          {/* Street grid lines */}
          {[1,2,3,4,5,6,7].map(i => <View key={`h${i}`} style={[styles.mapLine, { top: `${i * 12}%` }]} />)}
          {[1,2,3,4,5].map(i => <View key={`v${i}`} style={[styles.mapLineV, { left: `${i * 18}%` }]} />)}
          
          {/* Street labels */}
          <Text style={[styles.mapLabel, { top: '15%', left: '5%' }]}>West Spring Street</Text>
          <Text style={[styles.mapLabel, { top: '38%', left: '8%' }]}>West Broad Street</Text>
          <Text style={[styles.mapLabel, { top: '72%', right: '5%' }]}>South Innerbelt</Text>
        </View>

        {/* Gem Markers */}
        {gemMarkers.map(m => (
          <View key={m.id} style={[styles.gemMarker, { top: `${m.top * 100}%`, left: `${m.left * 100}%` }]}>
            <View style={[styles.gemCircle, m.color === 'green' && styles.gemCircleGreen]}>
              <Ionicons name="diamond" size={16} color={Colors.white} />
            </View>
            <Text style={styles.gemPercent}>{m.percent}%</Text>
          </View>
        ))}

        {/* Car Icon */}
        <View style={styles.carMarker}>
          <Text style={styles.carEmoji}>🚙</Text>
        </View>

        {/* Orion Voice Button - Purple */}
        <TouchableOpacity style={styles.orionBtn}>
          <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.orionGradient}>
            <Ionicons name="mic" size={28} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Camera Button */}
        <TouchableOpacity style={styles.cameraBtn}>
          <Ionicons name="camera-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// ROUTES TAB
// ============================================
function RoutesTab() {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.tabTitle}>Saved Routes</Text>
      
      <TouchableOpacity style={styles.routeCard}>
        <View style={styles.routeIconBox}>
          <Ionicons name="navigate" size={22} color={Colors.primary} />
        </View>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>Home → Work</Text>
          <Text style={styles.routeMeta}>25 min • 12 mi</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.routeCard}>
        <View style={styles.routeIconBox}>
          <Ionicons name="navigate" size={22} color={Colors.primary} />
        </View>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>Work → Gym</Text>
          <Text style={styles.routeMeta}>10 min • 4 mi</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addRouteBtn}>
        <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
        <Text style={styles.addRouteText}>Add New Route</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================
// REWARDS TAB CONTENT
// ============================================
function RewardsTabContent({ activeSubTab, onSubTabChange, userData }: { activeSubTab: RewardsTab; onSubTabChange: (t: RewardsTab) => void; userData: UserData }) {
  const subTabs = [
    { id: 'offers', label: 'Offers', icon: 'gift-outline' },
    { id: 'challenges', label: 'Challenges', icon: 'trophy-outline' },
    { id: 'badges', label: 'Badges', icon: 'ribbon-outline' },
    { id: 'carstudio', label: 'Car Studio', icon: 'color-palette-outline' },
  ];

  return (
    <View style={styles.tabContent}>
      {/* Sub Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsScroll}>
        <View style={styles.subTabsRow}>
          {subTabs.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.subTab, activeSubTab === t.id && styles.subTabActive]}
              onPress={() => onSubTabChange(t.id as RewardsTab)}
            >
              <Ionicons name={t.icon as any} size={16} color={activeSubTab === t.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.subTabText, activeSubTab === t.id && styles.subTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeSubTab === 'offers' && <OffersContent userData={userData} />}
        {activeSubTab === 'challenges' && <ChallengesContent />}
        {activeSubTab === 'badges' && <BadgesContent />}
        {activeSubTab === 'carstudio' && <CarStudioContent userData={userData} />}
      </ScrollView>
    </View>
  );
}

function OffersContent({ userData }: { userData: UserData }) {
  return (
    <>
      <View style={styles.gemsBox}>
        <Ionicons name="diamond" size={22} color={Colors.primary} />
        <Text style={styles.gemsAmount}>{userData.gems}</Text>
        <Text style={styles.gemsLabel}>gems available</Text>
      </View>

      {mockOffers.map(offer => (
        <TouchableOpacity key={offer.id} style={styles.offerCard}>
          <View style={styles.offerIcon}>
            <Ionicons name="location" size={24} color={Colors.primary} />
          </View>
          <View style={styles.offerInfo}>
            <Text style={styles.offerName}>{offer.name}</Text>
            <Text style={styles.offerType}>{offer.type}</Text>
            <View style={styles.offerMeta}>
              <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.offerDist}>{offer.distance}</Text>
              <View style={styles.offerGemsBadge}>
                <Ionicons name="diamond" size={10} color={Colors.primary} />
                <Text style={styles.offerGemsText}>{offer.gems}</Text>
              </View>
            </View>
          </View>
          <View style={styles.offerDiscount}>
            <Text style={styles.offerDiscountVal}>{offer.discount}%</Text>
            <Text style={styles.offerDiscountLabel}>OFF</Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
}

function ChallengesContent() {
  return (
    <>
      {mockChallenges.map(ch => (
        <View key={ch.id} style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIcon}>
              <Ionicons name="trophy" size={20} color={Colors.amber} />
            </View>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{ch.title}</Text>
              <Text style={styles.challengeDesc}>{ch.description}</Text>
            </View>
          </View>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(ch.progress / ch.goal) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{ch.progress}/{ch.goal}</Text>

          <View style={styles.rewardsRow}>
            <View style={styles.rewardItem}>
              <Ionicons name="diamond" size={14} color={Colors.gem} />
              <Text style={styles.rewardText}>{ch.gems}</Text>
            </View>
            <View style={styles.rewardItem}>
              <Ionicons name="star" size={14} color={Colors.amber} />
              <Text style={styles.rewardText}>{ch.xp} XP</Text>
            </View>
          </View>

          {!ch.joined && (
            <TouchableOpacity style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Join Challenge</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </>
  );
}

function BadgesContent() {
  const earned = mockBadges.filter(b => b.earned).length;
  return (
    <>
      <View style={styles.badgeStats}>
        <View style={styles.badgeStat}>
          <Text style={styles.badgeStatVal}>{earned}</Text>
          <Text style={styles.badgeStatLabel}>Earned</Text>
        </View>
        <View style={styles.badgeStatDivider} />
        <View style={styles.badgeStat}>
          <Text style={styles.badgeStatVal}>{mockBadges.length}</Text>
          <Text style={styles.badgeStatLabel}>Total</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Available Badges</Text>
      <View style={styles.badgesGrid}>
        {mockBadges.map(badge => (
          <View key={badge.id} style={styles.badgeItem}>
            <View style={[styles.badgeIcon, badge.earned && { backgroundColor: `${badge.color}30` }]}>
              <Ionicons name={badge.icon as any} size={24} color={badge.earned ? badge.color : Colors.textMuted} />
            </View>
            <Text style={styles.badgeName}>{badge.name}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function CarStudioContent({ userData }: { userData: UserData }) {
  return (
    <View style={styles.carStudioContent}>
      <View style={styles.carStudioPreview}>
        <Ionicons name="car-sport" size={80} color={Colors.primary} />
        <Text style={styles.carStudioName}>
          {userData.car.category.charAt(0).toUpperCase() + userData.car.category.slice(1)} - {userData.car.color.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </Text>
      </View>

      <TouchableOpacity style={styles.studioOption}>
        <View style={[styles.studioOptionIcon, { backgroundColor: `${Colors.primary}20` }]}>
          <Ionicons name="color-palette" size={20} color={Colors.primary} />
        </View>
        <Text style={styles.studioOptionText}>Change Color</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.studioOption}>
        <View style={[styles.studioOptionIcon, { backgroundColor: `${Colors.purple}20` }]}>
          <Ionicons name="car" size={20} color={Colors.purple} />
        </View>
        <Text style={styles.studioOptionText}>Change Vehicle</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// PROFILE TAB CONTENT
// ============================================
function ProfileTabContent({ activeSubTab, onSubTabChange, userData }: { activeSubTab: ProfileTab; onSubTabChange: (t: ProfileTab) => void; userData: UserData }) {
  const subTabs = [
    { id: 'overview', label: 'Overview', icon: 'person-outline' },
    { id: 'score', label: 'Score', icon: 'shield-checkmark-outline' },
    { id: 'fuel', label: 'Fuel', icon: 'flame-outline' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <View style={styles.tabContent}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsScroll}>
        <View style={styles.subTabsRow}>
          {subTabs.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.subTab, activeSubTab === t.id && styles.subTabActive]}
              onPress={() => onSubTabChange(t.id as ProfileTab)}
            >
              <Ionicons name={t.icon as any} size={16} color={activeSubTab === t.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.subTabText, activeSubTab === t.id && styles.subTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeSubTab === 'overview' && <ProfileOverview userData={userData} />}
        {activeSubTab === 'settings' && <ProfileSettings />}
      </ScrollView>
    </View>
  );
}

function ProfileOverview({ userData }: { userData: UserData }) {
  return (
    <>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userData.name.charAt(0)}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{userData.level}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{userData.name}</Text>
        <Text style={styles.profileMeta}>Member since Dec 2025</Text>
        {userData.is_premium && (
          <View style={styles.premiumTag}>
            <Ionicons name="star" size={12} color={Colors.amber} />
            <Text style={styles.premiumTagText}>Premium</Text>
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="diamond" size={20} color={Colors.primary} />
          <Text style={styles.statVal}>{userData.gems}</Text>
          <Text style={styles.statLabel}>Gems</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.green} />
          <Text style={styles.statVal}>{userData.safety_score}</Text>
          <Text style={styles.statLabel}>Safety</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="speedometer" size={20} color={Colors.primary} />
          <Text style={styles.statVal}>{userData.total_miles}</Text>
          <Text style={styles.statLabel}>Miles</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flag" size={20} color={Colors.orange} />
          <Text style={styles.statVal}>{userData.total_trips}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
      </View>

      {[
        { icon: 'car-outline', label: 'Trip History', color: Colors.primary },
        { icon: 'trophy-outline', label: 'Leaderboard', color: Colors.orange },
        { icon: 'people-outline', label: 'Friends', color: Colors.purple },
        { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.green },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={styles.menuItem}>
          <View style={[styles.menuItemIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <Text style={styles.menuItemLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </>
  );
}

function ProfileSettings() {
  return (
    <>
      {[
        { icon: 'notifications-outline', label: 'Notifications' },
        { icon: 'lock-closed-outline', label: 'Privacy' },
        { icon: 'card-outline', label: 'Subscription' },
        { icon: 'help-circle-outline', label: 'Help & Support' },
        { icon: 'information-circle-outline', label: 'About' },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={styles.settingsItem}>
          <Ionicons name={item.icon as any} size={22} color={Colors.textSecondary} />
          <Text style={styles.settingsLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={20} color={Colors.red} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </>
  );
}

// ============================================
// SIDE MENU MODAL
// ============================================
function SideMenuModal({ visible, onClose, userData }: { visible: boolean; onClose: () => void; userData: UserData }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{userData.name.charAt(0)}</Text>
            </View>
            <View style={styles.menuUserInfo}>
              <Text style={styles.menuUserName}>{userData.name}</Text>
              <Text style={styles.menuUserEmail}>driver@snaproad.com</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.menuContent}>
            {[
              { icon: 'person-outline', label: 'Profile' },
              { icon: 'car-outline', label: 'Trip History' },
              { icon: 'diamond-outline', label: 'Gem History' },
              { icon: 'trophy-outline', label: 'Leaderboard' },
              { icon: 'people-outline', label: 'Friends' },
              { icon: 'ribbon-outline', label: 'Badges' },
              { icon: 'notifications-outline', label: 'Notifications' },
              { icon: 'settings-outline', label: 'Settings' },
              { icon: 'help-circle-outline', label: 'Help & Support' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuRow}>
                <Ionicons name={item.icon as any} size={22} color={Colors.textSecondary} />
                <Text style={styles.menuRowText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  fullScreen: { flex: 1 },

  // Plan Selection
  planHeader: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, paddingBottom: 16 },
  planHeaderIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  planHeaderLabel: { color: Colors.amber, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  planTitle: { color: Colors.white, fontSize: 24, fontWeight: 'bold' },
  planSubtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 6 },
  planScroll: { flex: 1 },
  planScrollContent: { padding: 16, paddingBottom: 24 },
  planCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 2, borderColor: 'transparent' },
  planCardSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  planCardPremium: { backgroundColor: 'rgba(180, 83, 9, 0.15)' },
  planCardPremiumSelected: { borderColor: Colors.amber, backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  popularBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.amber, paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 12 },
  popularBadgeText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  planName: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  premiumNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  planPrice: { color: Colors.white, fontSize: 28, fontWeight: 'bold' },
  planPeriod: { color: Colors.textSecondary, fontSize: 14 },
  originalPrice: { color: Colors.textMuted, fontSize: 12, textDecorationLine: 'line-through', marginLeft: 8 },
  discountBadge: { backgroundColor: 'rgba(34, 197, 94, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  discountText: { color: Colors.green, fontSize: 10, fontWeight: 'bold' },
  foundersRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  foundersText: { color: Colors.amber, fontSize: 11, opacity: 0.9 },
  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.surfaceLighter, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Colors.primary },
  radioSelectedPremium: { borderColor: Colors.amber },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  planDesc: { color: Colors.textSecondary, fontSize: 12, marginBottom: 12 },
  lockInBox: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: 10, marginBottom: 12 },
  lockInText: { color: Colors.amber, fontSize: 12, fontWeight: '500' },
  featuresList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: Colors.textSecondary, fontSize: 13 },
  planFooter: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.surface, backgroundColor: 'rgba(15, 23, 42, 0.9)' },
  continueBtn: { borderRadius: 16, overflow: 'hidden' },
  continueBtnPremium: {},
  continueBtnDisabled: {},
  continueBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  continueBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  footerNote: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },

  // Car Onboarding
  carHeader: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 16 },
  carHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carTitle: { color: Colors.white, fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  carSubtitle: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  progressBarRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  progressBarSegment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceLight },
  progressBarActive: { backgroundColor: Colors.amber },
  carContent: { flex: 1, paddingHorizontal: 20 },
  carTypesList: { gap: 14 },
  carTypeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  carTypeCardSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  carTypePreview: { width: 72, height: 56, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  carTypePreviewSelected: { backgroundColor: `${Colors.primary}25` },
  carTypeInfo: { flex: 1, marginLeft: 14 },
  carTypeName: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  carTypeDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  colorContent: {},
  carPreviewBox: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 24, padding: 24, marginBottom: 24, position: 'relative' },
  carPreviewGlow: { position: 'absolute', top: 20, width: 150, height: 150, borderRadius: 75, backgroundColor: `${Colors.primary}20` },
  carPreviewIcon: { width: 140, height: 100, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  carPreviewName: { color: Colors.white, fontSize: 18, fontWeight: '600', marginTop: 16 },
  carPreviewType: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  colorGridLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 12 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorSwatch: { padding: 4 },
  colorSwatchSelected: { transform: [{ scale: 1.15 }] },
  colorSwatchInner: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorSwatchLocked: { opacity: 0.4 },
  lockEmoji: { fontSize: 20 },
  colorCheckmark: { backgroundColor: 'rgba(255,255,255,0.9)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  colorHint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 20 },
  carFooter: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.surface, backgroundColor: 'rgba(15, 23, 42, 0.95)' },
  carContinueBtn: { borderRadius: 16, overflow: 'hidden' },
  carContinueGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  carContinueText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  backBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  backBtnText: { color: Colors.textSecondary, fontSize: 14 },

  // Main App
  statusBarArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8, backgroundColor: Colors.background },
  statusTime: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: Colors.white, fontSize: 13, fontWeight: '500' },
  mainHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.background, gap: 12 },
  menuBtn: { padding: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 24, paddingHorizontal: 16, height: 46, gap: 10 },
  searchInput: { flex: 1, color: Colors.white, fontSize: 16 },
  micBtn: { padding: 8 },
  mainContent: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.tabBarBg, paddingTop: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  tabBarItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabBarLabel: { color: Colors.tabInactive, fontSize: 12, fontWeight: '500' },
  tabBarLabelActive: { color: Colors.primary, fontWeight: '600' },

  // Map Tab
  mapContainer: { flex: 1 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8 },
  filterBtnActive: {},
  filterBtnInactive: { backgroundColor: Colors.surface },
  filterBtnOrange: { backgroundColor: Colors.orange },
  filterBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  filterBtnTextInactive: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  quickLocRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  quickLocCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, gap: 12 },
  quickLocIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  quickLocName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  quickLocAction: { color: Colors.primary, fontSize: 12, fontWeight: '500' },
  addLocBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  mapArea: { flex: 1, backgroundColor: '#151922', position: 'relative' },
  mapBg: { ...StyleSheet.absoluteFillObject },
  mapLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#2a3040' },
  mapLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#2a3040' },
  mapLabel: { position: 'absolute', color: '#4a5568', fontSize: 10, fontStyle: 'italic' },
  gemMarker: { position: 'absolute', alignItems: 'center' },
  gemCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 },
  gemCircleGreen: { backgroundColor: Colors.green, shadowColor: Colors.green },
  gemPercent: { color: Colors.white, fontSize: 11, fontWeight: '600', marginTop: 4 },
  carMarker: { position: 'absolute', top: '45%', left: '48%' },
  carEmoji: { fontSize: 24 },
  orionBtn: { position: 'absolute', bottom: 80, right: 16 },
  orionGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.purple, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
  cameraBtn: { position: 'absolute', bottom: 80, right: 86, width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },

  // Tab Content
  tabContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  tabTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  subTabsScroll: { marginBottom: 16, maxHeight: 44 },
  subTabsRow: { flexDirection: 'row', gap: 10 },
  subTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6 },
  subTabActive: { backgroundColor: `${Colors.primary}20`, borderWidth: 1, borderColor: Colors.primary },
  subTabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  subTabTextActive: { color: Colors.primary, fontWeight: '600' },

  // Routes
  routeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 12, gap: 12 },
  routeIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  routeInfo: { flex: 1 },
  routeName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  routeMeta: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  activeBadge: { backgroundColor: `${Colors.green}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { color: Colors.green, fontSize: 11, fontWeight: '600' },
  addRouteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, marginTop: 8, gap: 8 },
  addRouteText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  // Offers
  gemsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 14, marginBottom: 16, gap: 10 },
  gemsAmount: { color: Colors.primary, fontSize: 26, fontWeight: 'bold' },
  gemsLabel: { color: Colors.textSecondary, fontSize: 14 },
  offerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 12, gap: 12 },
  offerIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  offerInfo: { flex: 1 },
  offerName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  offerType: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  offerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  offerDist: { color: Colors.textSecondary, fontSize: 11, marginRight: 10 },
  offerGemsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.primary}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  offerGemsText: { color: Colors.primary, fontSize: 10, fontWeight: '600' },
  offerDiscount: { backgroundColor: Colors.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  offerDiscountVal: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  offerDiscountLabel: { color: Colors.white, fontSize: 9, fontWeight: '500', opacity: 0.9 },

  // Challenges
  challengeCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 14, marginBottom: 12 },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  challengeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${Colors.amber}20`, alignItems: 'center', justifyContent: 'center' },
  challengeInfo: { flex: 1 },
  challengeTitle: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  challengeDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  progressBar: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: { color: Colors.textSecondary, fontSize: 11, textAlign: 'right', marginBottom: 12 },
  rewardsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { color: Colors.textSecondary, fontSize: 12 },
  joinBtn: { marginTop: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, alignItems: 'center' },
  joinBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  // Badges
  badgeStats: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 20 },
  badgeStat: { flex: 1, alignItems: 'center' },
  badgeStatVal: { color: Colors.white, fontSize: 24, fontWeight: 'bold' },
  badgeStatLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  badgeStatDivider: { width: 1, backgroundColor: Colors.surfaceLight, marginHorizontal: 16 },
  sectionLabel: { color: Colors.white, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  badgeItem: { width: (width - 64) / 3, alignItems: 'center' },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  badgeName: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center' },

  // Car Studio
  carStudioContent: {},
  carStudioPreview: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 20, padding: 32, marginBottom: 20 },
  carStudioName: { color: Colors.white, fontSize: 16, fontWeight: '600', marginTop: 16 },
  studioOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  studioOptionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  studioOptionText: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '500' },

  // Profile
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { color: Colors.white, fontSize: 32, fontWeight: 'bold' },
  levelBadge: { position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.background },
  levelText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  profileName: { color: Colors.white, fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  profileMeta: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  premiumTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.amber}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8, gap: 6 },
  premiumTagText: { color: Colors.amber, fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: (width - 44) / 2, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, alignItems: 'center' },
  statVal: { color: Colors.white, fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  menuItemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  menuItemLabel: { flex: 1, color: Colors.white, fontSize: 15, fontWeight: '500' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  settingsLabel: { flex: 1, color: Colors.white, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.red, borderRadius: 14, marginTop: 16, marginBottom: 40, gap: 8 },
  logoutText: { color: Colors.red, fontSize: 14, fontWeight: '600' },

  // Side Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuContainer: { width: width * 0.8, height: '100%', backgroundColor: Colors.background },
  menuHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: Colors.surface, gap: 12 },
  menuAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  menuAvatarText: { color: Colors.white, fontSize: 22, fontWeight: 'bold' },
  menuUserInfo: { flex: 1 },
  menuUserName: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  menuUserEmail: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  menuContent: { flex: 1, paddingVertical: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 16 },
  menuRowText: { color: Colors.white, fontSize: 15, fontWeight: '500' },
});
