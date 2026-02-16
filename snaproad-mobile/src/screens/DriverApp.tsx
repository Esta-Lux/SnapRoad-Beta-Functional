// SnapRoad Mobile - Complete Driver App
// Main app entry with navigation matching web UI

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Theme colors matching web app
const Colors = {
  // Primary
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  accent: '#D946EF',
  
  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Dark theme
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceLighter: '#475569',
  
  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Gems & rewards
  gem: '#A855F7',
  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#F97316',
  
  // Business types
  gas: '#EF4444',
  cafe: '#F59E0B',
  restaurant: '#22C55E',
  carwash: '#3B82F6',
  retail: '#A855F7',
};

// Types matching web app
type TabType = 'map' | 'routes' | 'rewards' | 'profile';
type RewardsTab = 'offers' | 'challenges' | 'badges' | 'carstudio';
type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings';

interface UserData {
  id: string;
  name: string;
  gems: number;
  level: number;
  xp: number;
  safety_score: number;
  streak: number;
  total_miles: number;
  total_trips: number;
  badges_earned_count: number;
  rank: number;
  is_premium: boolean;
  member_since: string;
  friends_count: number;
  state: string;
  plan: 'basic' | 'premium' | null;
  gem_multiplier: number;
  safe_drive_streak: number;
}

interface Offer {
  id: number;
  name: string;
  business_name: string;
  business_type: string;
  discount: number;
  gems_cost: number;
  distance: string;
  lat: number;
  lng: number;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  type: string;
  progress: number;
  goal: number;
  reward_gems: number;
  reward_xp: number;
  ends_at: string;
  participants: number;
  joined: boolean;
}

// Mock data
const mockUserData: UserData = {
  id: '123456',
  name: 'Driver',
  gems: 0,
  level: 1,
  xp: 0,
  safety_score: 100,
  streak: 0,
  total_miles: 0,
  total_trips: 0,
  badges_earned_count: 0,
  rank: 0,
  is_premium: false,
  member_since: 'Dec 2025',
  friends_count: 0,
  state: 'OH',
  plan: null,
  gem_multiplier: 1,
  safe_drive_streak: 0,
};

const mockOffers: Offer[] = [
  { id: 1, name: '15% Off Gas', business_name: 'Shell', business_type: 'gas', discount: 15, gems_cost: 50, distance: '0.3 mi', lat: 39.962, lng: -82.999 },
  { id: 2, name: 'Free Coffee', business_name: 'Starbucks', business_type: 'cafe', discount: 100, gems_cost: 75, distance: '0.5 mi', lat: 39.963, lng: -83.001 },
  { id: 3, name: '20% Off Wash', business_name: 'Quick Clean', business_type: 'carwash', discount: 20, gems_cost: 40, distance: '0.8 mi', lat: 39.958, lng: -82.995 },
  { id: 4, name: '$5 Off Lunch', business_name: 'Chipotle', business_type: 'restaurant', discount: 25, gems_cost: 60, distance: '1.2 mi', lat: 39.965, lng: -82.990 },
];

const mockChallenges: Challenge[] = [
  { id: 1, title: 'Safe Week', description: 'Complete 7 trips with 90+ safety score', type: 'weekly', progress: 3, goal: 7, reward_gems: 100, reward_xp: 500, ends_at: '2025-12-22', participants: 1247, joined: true },
  { id: 2, title: 'Mile Marker', description: 'Drive 50 miles this week', type: 'weekly', progress: 23, goal: 50, reward_gems: 75, reward_xp: 300, ends_at: '2025-12-22', participants: 892, joined: true },
  { id: 3, title: 'Early Bird', description: 'Complete 5 trips before 8am', type: 'weekly', progress: 0, goal: 5, reward_gems: 50, reward_xp: 200, ends_at: '2025-12-22', participants: 456, joined: false },
];

// Main App Component
export default function DriverAppMain() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [rewardsTab, setRewardsTab] = useState<RewardsTab>('offers');
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');
  const [userData, setUserData] = useState<UserData>(mockUserData);
  const [offers, setOffers] = useState<Offer[]>(mockOffers);
  const [challenges, setChallenges] = useState<Challenge[]>(mockChallenges);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(true);
  const [showCarOnboarding, setShowCarOnboarding] = useState(false);
  const [userCar, setUserCar] = useState({ category: 'sedan', variant: 'sedan-classic', color: 'midnight-black' });
  const [searchQuery, setSearchQuery] = useState('');

  // Handle plan selection
  const handlePlanSelect = (plan: 'basic' | 'premium') => {
    setUserData(prev => ({
      ...prev,
      plan,
      is_premium: plan === 'premium',
      gem_multiplier: plan === 'premium' ? 2 : 1,
    }));
    setShowPlanSelection(false);
    setShowCarOnboarding(true);
  };

  // Handle car selection
  const handleCarSelect = (car: { category: string; variant: string; color: string }) => {
    setUserCar(car);
    setShowCarOnboarding(false);
  };

  // Plan Selection Modal
  if (showPlanSelection) {
    return <PlanSelectionScreen onSelect={handlePlanSelect} />;
  }

  // Car Onboarding Modal
  if (showCarOnboarding) {
    return <CarOnboardingScreen onComplete={handleCarSelect} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Phone Frame */}
      <View style={styles.phoneFrame}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusIcons}>
            <Text style={styles.statusText}>5G</Text>
            <Ionicons name="battery-full" size={16} color={Colors.text} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="menu" size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search here"
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.voiceButton}>
              <Ionicons name="mic" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === 'map' && (
            <MapTab 
              userData={userData} 
              offers={offers}
              userCar={userCar}
            />
          )}
          {activeTab === 'routes' && (
            <RoutesTab userData={userData} />
          )}
          {activeTab === 'rewards' && (
            <RewardsTab 
              userData={userData}
              offers={offers}
              challenges={challenges}
              activeSubTab={rewardsTab}
              onSubTabChange={setRewardsTab}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileTab 
              userData={userData}
              activeSubTab={profileTab}
              onSubTabChange={setProfileTab}
            />
          )}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          {[
            { id: 'map', icon: 'location', label: 'Map' },
            { id: 'routes', icon: 'git-branch', label: 'Routes' },
            { id: 'rewards', icon: 'gift', label: 'Rewards' },
            { id: 'profile', icon: 'settings', label: 'Profile' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.id as TabType)}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.activeTabBg}
                  >
                    <Ionicons name={tab.icon as any} size={20} color={Colors.text} />
                    <Text style={styles.activeTabLabel}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <Ionicons name={tab.icon as any} size={22} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Menu Modal */}
      <MenuModal visible={showMenu} onClose={() => setShowMenu(false)} userData={userData} />
    </View>
  );
}

// Plan Selection Screen
function PlanSelectionScreen({ onSelect }: { onSelect: (plan: 'basic' | 'premium') => void }) {
  const [selected, setSelected] = useState<'basic' | 'premium'>('basic');

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, '#0a1929']} style={styles.fullScreen}>
        <SafeAreaView style={styles.planContainer}>
          {/* Header */}
          <View style={styles.planHeader}>
            <View style={styles.planHeaderIcon}>
              <Ionicons name="flash" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.planHeaderLabel}>CHOOSE YOUR PLAN</Text>
            <Text style={styles.planTitle}>Start Your Journey</Text>
            <Text style={styles.planSubtitle}>Drive safer. Earn rewards. Privacy guaranteed.</Text>
          </View>

          <ScrollView style={styles.planScroll} showsVerticalScrollIndicator={false}>
            {/* Basic Plan */}
            <TouchableOpacity
              style={[styles.planCard, selected === 'basic' && styles.planCardSelected]}
              onPress={() => setSelected('basic')}
            >
              <View style={styles.planCardHeader}>
                <View>
                  <Text style={styles.planName}>BASIC</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>$0</Text>
                    <Text style={styles.planPeriod}>/mo</Text>
                  </View>
                </View>
                <View style={[styles.planRadio, selected === 'basic' && styles.planRadioSelected]}>
                  {selected === 'basic' && <View style={styles.planRadioInner} />}
                </View>
              </View>
              <Text style={styles.planDescription}>Privacy-first navigation for everyday driving.</Text>
              <View style={styles.planFeatures}>
                {['Manual rerouting', 'Privacy-first navigation', 'Auto-blur photos', 'Local offers', 'Earn Gems (1x)'].map((f, i) => (
                  <View key={i} style={styles.planFeatureRow}>
                    <Ionicons name="checkmark" size={16} color={Colors.primary} />
                    <Text style={styles.planFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Premium Plan */}
            <TouchableOpacity
              style={[styles.planCard, selected === 'premium' && styles.planCardSelected]}
              onPress={() => setSelected('premium')}
            >
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>MOST POPULAR</Text>
              </View>
              <View style={styles.planCardHeader}>
                <View>
                  <View style={styles.premiumNameRow}>
                    <Ionicons name="flash" size={16} color={Colors.gold} />
                    <Text style={[styles.planName, { color: Colors.gold }]}>PREMIUM</Text>
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
                    <Ionicons name="star" size={12} color={Colors.gold} />
                    <Text style={styles.foundersText}>Founders pricing</Text>
                  </View>
                </View>
                <View style={[styles.planRadio, selected === 'premium' && styles.planRadioSelected]}>
                  {selected === 'premium' && <View style={styles.planRadioInner} />}
                </View>
              </View>
              <Text style={styles.planDescription}>Auto-routing, insights, and faster rewards.</Text>
              
              <TouchableOpacity style={styles.lockInButton}>
                <Ionicons name="rocket" size={14} color={Colors.primary} />
                <Text style={styles.lockInText}>Lock in $10.99/month for life!</Text>
              </TouchableOpacity>

              <View style={styles.planFeatures}>
                {[
                  'Everything in Basic',
                  'Automatic rerouting',
                  'Advanced local offers',
                  'Gem multiplier (2x)',
                  'Smart commute analytics',
                  'Priority support'
                ].map((f, i) => (
                  <View key={i} style={styles.planFeatureRow}>
                    <Ionicons name="checkmark" size={16} color={Colors.gold} />
                    <Text style={styles.planFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Continue Button */}
          <View style={styles.planFooter}>
            <TouchableOpacity style={styles.continueButton} onPress={() => onSelect(selected)}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.continueGradient}>
                <Text style={styles.continueText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.text} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// Car Onboarding Screen
function CarOnboardingScreen({ onComplete }: { onComplete: (car: { category: string; variant: string; color: string }) => void }) {
  const [step, setStep] = useState<'type' | 'color'>('type');
  const [selectedType, setSelectedType] = useState('sedan');
  const [selectedColor, setSelectedColor] = useState('midnight-black');

  const carTypes = [
    { id: 'sedan', name: 'Sedan', icon: 'car-sport' },
    { id: 'suv', name: 'SUV', icon: 'car' },
    { id: 'truck', name: 'Truck', icon: 'bus' },
  ];

  const carColors = [
    { id: 'midnight-black', name: 'Midnight Black', hex: '#1a1a2e' },
    { id: 'arctic-white', name: 'Arctic White', hex: '#f8fafc' },
    { id: 'ocean-blue', name: 'Ocean Blue', hex: '#0ea5e9' },
    { id: 'ruby-red', name: 'Ruby Red', hex: '#dc2626' },
    { id: 'forest-green', name: 'Forest Green', hex: '#16a34a' },
    { id: 'sunset-orange', name: 'Sunset Orange', hex: '#f97316' },
    { id: 'royal-purple', name: 'Royal Purple', hex: '#9333ea' },
    { id: 'champagne-gold', name: 'Champagne Gold', hex: '#d4af37' },
  ];

  const handleContinue = () => {
    if (step === 'type') {
      setStep('color');
    } else {
      onComplete({ category: selectedType, variant: `${selectedType}-classic`, color: selectedColor });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, '#0a1929']} style={styles.fullScreen}>
        <SafeAreaView style={styles.carContainer}>
          {/* Progress */}
          <View style={styles.carProgress}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, step === 'color' && styles.progressDotActive]} />
          </View>

          {step === 'type' ? (
            <>
              <Text style={styles.carTitle}>Choose Your Vehicle</Text>
              <Text style={styles.carSubtitle}>Select the type that matches your ride</Text>

              <View style={styles.carTypesGrid}>
                {carTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.carTypeCard, selectedType === type.id && styles.carTypeCardSelected]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <View style={[styles.carTypeIcon, selectedType === type.id && styles.carTypeIconSelected]}>
                      <Ionicons name={type.icon as any} size={36} color={selectedType === type.id ? Colors.primary : Colors.textSecondary} />
                    </View>
                    <Text style={[styles.carTypeName, selectedType === type.id && styles.carTypeNameSelected]}>
                      {type.name}
                    </Text>
                    {selectedType === type.id && (
                      <View style={styles.carTypeCheck}>
                        <Ionicons name="checkmark" size={14} color={Colors.text} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.carTitle}>Pick Your Color</Text>
              <Text style={styles.carSubtitle}>Express yourself with your favorite color</Text>

              {/* Preview */}
              <View style={styles.carPreview}>
                <View style={[styles.carPreviewCircle, { backgroundColor: carColors.find(c => c.id === selectedColor)?.hex }]}>
                  <Ionicons name="car-sport" size={64} color={selectedColor === 'arctic-white' ? '#000' : '#fff'} />
                </View>
                <Text style={styles.carPreviewName}>{carColors.find(c => c.id === selectedColor)?.name}</Text>
              </View>

              {/* Color Grid */}
              <View style={styles.colorGrid}>
                {carColors.map((color) => (
                  <TouchableOpacity
                    key={color.id}
                    style={[styles.colorOption, selectedColor === color.id && styles.colorOptionSelected]}
                    onPress={() => setSelectedColor(color.id)}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: color.hex }]}>
                      {selectedColor === color.id && (
                        <Ionicons name="checkmark" size={18} color={color.id === 'arctic-white' ? '#000' : '#fff'} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Continue Button */}
          <View style={styles.carFooter}>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.continueGradient}>
                <Text style={styles.continueText}>{step === 'color' ? 'Start Driving' : 'Continue'}</Text>
                <Ionicons name={step === 'color' ? 'car-sport' : 'arrow-forward'} size={20} color={Colors.text} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// Map Tab Component
function MapTab({ userData, offers, userCar }: { userData: UserData; offers: Offer[]; userCar: any }) {
  return (
    <View style={styles.mapContainer}>
      {/* Location Buttons */}
      <View style={styles.locationButtons}>
        <TouchableOpacity style={styles.locationBtnActive}>
          <Ionicons name="star" size={16} color={Colors.text} />
          <Text style={styles.locationBtnText}>Favorites</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationBtn}>
          <Ionicons name="location" size={16} color={Colors.textSecondary} />
          <Text style={styles.locationBtnTextInactive}>Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationBtn}>
          <Ionicons name="warning" size={16} color={Colors.warning} />
          <Text style={styles.locationBtnTextInactive}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Locations */}
      <View style={styles.quickLocations}>
        <TouchableOpacity style={styles.quickLocation}>
          <View style={styles.quickLocationIcon}>
            <Ionicons name="home" size={18} color={Colors.success} />
          </View>
          <View>
            <Text style={styles.quickLocationName}>Home</Text>
            <Text style={styles.quickLocationAddress}>Set location</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLocation}>
          <View style={[styles.quickLocationIcon, { backgroundColor: `${Colors.info}20` }]}>
            <Ionicons name="briefcase" size={18} color={Colors.info} />
          </View>
          <View>
            <Text style={styles.quickLocationName}>Work</Text>
            <Text style={styles.quickLocationAddress}>Set location</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addLocationBtn}>
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Image
          source={{ uri: 'https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-82.9988,39.9612,13,0/400x600?access_token=pk.placeholder' }}
          style={styles.mapImage}
          resizeMode="cover"
        />
        
        {/* Car Icon on Map */}
        <View style={styles.carMarker}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.carMarkerBg}>
            <Ionicons name="car-sport" size={20} color={Colors.text} />
          </LinearGradient>
        </View>

        {/* Offer Markers */}
        {offers.map((offer, i) => (
          <View key={offer.id} style={[styles.offerMarker, { top: 150 + i * 80, left: 100 + i * 50 }]}>
            <View style={[styles.offerMarkerBg, { backgroundColor: Colors[offer.business_type as keyof typeof Colors] || Colors.primary }]}>
              <Ionicons name={offer.business_type === 'gas' ? 'car' : offer.business_type === 'cafe' ? 'cafe' : 'location'} size={14} color="#fff" />
            </View>
            <View style={styles.offerMarkerDiscount}>
              <Text style={styles.offerMarkerText}>{offer.discount}%</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Orion Voice Button */}
      <TouchableOpacity style={styles.orionButton}>
        <LinearGradient colors={[Colors.accent, '#9333ea']} style={styles.orionGradient}>
          <Ionicons name="mic" size={24} color={Colors.text} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick Report Button */}
      <TouchableOpacity style={styles.quickReportButton}>
        <Ionicons name="camera" size={22} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// Routes Tab Component
function RoutesTab({ userData }: { userData: UserData }) {
  const savedRoutes = [
    { id: 1, name: 'Home → Work', time: '25 min', distance: '12 mi', active: true },
    { id: 2, name: 'Work → Gym', time: '10 min', distance: '4 mi', active: false },
  ];

  return (
    <ScrollView style={styles.routesContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Saved Routes</Text>
      
      {savedRoutes.map((route) => (
        <TouchableOpacity key={route.id} style={styles.routeCard}>
          <View style={styles.routeIcon}>
            <Ionicons name="navigate" size={20} color={Colors.primary} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeMeta}>{route.time} • {route.distance}</Text>
          </View>
          {route.active && (
            <View style={styles.routeActiveBadge}>
              <Text style={styles.routeActiveText}>Active</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addRouteButton}>
        <Ionicons name="add-circle" size={22} color={Colors.primary} />
        <Text style={styles.addRouteText}>Add New Route</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Rewards Tab Component
function RewardsTab({ userData, offers, challenges, activeSubTab, onSubTabChange }: { 
  userData: UserData; 
  offers: Offer[];
  challenges: Challenge[];
  activeSubTab: RewardsTab;
  onSubTabChange: (tab: RewardsTab) => void;
}) {
  const subTabs = [
    { id: 'offers', label: 'Offers', icon: 'gift' },
    { id: 'challenges', label: 'Challenges', icon: 'trophy' },
    { id: 'badges', label: 'Badges', icon: 'ribbon' },
    { id: 'carstudio', label: 'Car Studio', icon: 'color-palette' },
  ];

  return (
    <View style={styles.rewardsContainer}>
      {/* Sub Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsScroll}>
        <View style={styles.subTabs}>
          {subTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.subTab, activeSubTab === tab.id && styles.subTabActive]}
              onPress={() => onSubTabChange(tab.id as RewardsTab)}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeSubTab === tab.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.subTabText, activeSubTab === tab.id && styles.subTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.rewardsContent} showsVerticalScrollIndicator={false}>
        {activeSubTab === 'offers' && (
          <>
            <View style={styles.gemsRow}>
              <Ionicons name="diamond" size={20} color={Colors.gem} />
              <Text style={styles.gemsAmount}>{userData.gems}</Text>
              <Text style={styles.gemsLabel}>gems available</Text>
            </View>

            {offers.map((offer) => (
              <TouchableOpacity key={offer.id} style={styles.offerCard}>
                <View style={[styles.offerIcon, { backgroundColor: `${Colors[offer.business_type as keyof typeof Colors]}20` }]}>
                  <Ionicons 
                    name={offer.business_type === 'gas' ? 'car' : offer.business_type === 'cafe' ? 'cafe' : 'restaurant'} 
                    size={24} 
                    color={Colors[offer.business_type as keyof typeof Colors] || Colors.primary} 
                  />
                </View>
                <View style={styles.offerInfo}>
                  <Text style={styles.offerName}>{offer.business_name}</Text>
                  <Text style={styles.offerDescription}>{offer.name}</Text>
                  <View style={styles.offerMeta}>
                    <Ionicons name="location" size={12} color={Colors.textSecondary} />
                    <Text style={styles.offerDistance}>{offer.distance}</Text>
                    <View style={styles.offerGems}>
                      <Ionicons name="diamond" size={12} color={Colors.gem} />
                      <Text style={styles.offerGemsText}>{offer.gems_cost}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.offerDiscount}>
                  <Text style={styles.offerDiscountText}>{offer.discount}%</Text>
                  <Text style={styles.offerDiscountLabel}>OFF</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {activeSubTab === 'challenges' && (
          <>
            {challenges.map((challenge) => (
              <View key={challenge.id} style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeIcon}>
                    <Ionicons name="trophy" size={20} color={Colors.gold} />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>{challenge.description}</Text>
                  </View>
                </View>
                
                <View style={styles.challengeProgress}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(challenge.progress / challenge.goal) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{challenge.progress}/{challenge.goal}</Text>
                </View>

                <View style={styles.challengeRewards}>
                  <View style={styles.rewardItem}>
                    <Ionicons name="diamond" size={14} color={Colors.gem} />
                    <Text style={styles.rewardText}>{challenge.reward_gems}</Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Ionicons name="star" size={14} color={Colors.gold} />
                    <Text style={styles.rewardText}>{challenge.reward_xp} XP</Text>
                  </View>
                  <View style={styles.participantsInfo}>
                    <Ionicons name="people" size={14} color={Colors.textSecondary} />
                    <Text style={styles.participantsText}>{challenge.participants.toLocaleString()}</Text>
                  </View>
                </View>

                {!challenge.joined && (
                  <TouchableOpacity style={styles.joinButton}>
                    <Text style={styles.joinButtonText}>Join Challenge</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {activeSubTab === 'badges' && (
          <View style={styles.badgesContainer}>
            <View style={styles.badgeStats}>
              <View style={styles.badgeStat}>
                <Text style={styles.badgeStatValue}>{userData.badges_earned_count}</Text>
                <Text style={styles.badgeStatLabel}>Earned</Text>
              </View>
              <View style={styles.badgeStatDivider} />
              <View style={styles.badgeStat}>
                <Text style={styles.badgeStatValue}>24</Text>
                <Text style={styles.badgeStatLabel}>Total</Text>
              </View>
            </View>

            <Text style={styles.badgeSectionTitle}>Available Badges</Text>
            <View style={styles.badgesGrid}>
              {['Safe Driver', 'Mile Master', 'Early Bird', 'Night Owl', 'Eco Warrior', 'Social Star'].map((badge, i) => (
                <View key={i} style={styles.badgeItem}>
                  <View style={[styles.badgeIcon, i < userData.badges_earned_count && styles.badgeIconEarned]}>
                    <Ionicons name="ribbon" size={24} color={i < userData.badges_earned_count ? Colors.gold : Colors.textMuted} />
                  </View>
                  <Text style={styles.badgeName}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeSubTab === 'carstudio' && (
          <View style={styles.carStudioContainer}>
            <View style={styles.carStudioPreview}>
              <Ionicons name="car-sport" size={80} color={Colors.primary} />
              <Text style={styles.carStudioName}>Sedan - Midnight Black</Text>
            </View>

            <TouchableOpacity style={styles.carStudioOption}>
              <View style={styles.carStudioOptionIcon}>
                <Ionicons name="color-palette" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.carStudioOptionText}>Change Color</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.carStudioOption}>
              <View style={styles.carStudioOptionIcon}>
                <Ionicons name="car" size={20} color={Colors.accent} />
              </View>
              <Text style={styles.carStudioOptionText}>Change Vehicle</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Profile Tab Component
function ProfileTab({ userData, activeSubTab, onSubTabChange }: {
  userData: UserData;
  activeSubTab: ProfileTab;
  onSubTabChange: (tab: ProfileTab) => void;
}) {
  const subTabs = [
    { id: 'overview', label: 'Overview', icon: 'person' },
    { id: 'score', label: 'Score', icon: 'shield-checkmark' },
    { id: 'fuel', label: 'Fuel', icon: 'flame' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <View style={styles.profileContainer}>
      {/* Sub Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsScroll}>
        <View style={styles.subTabs}>
          {subTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.subTab, activeSubTab === tab.id && styles.subTabActive]}
              onPress={() => onSubTabChange(tab.id as ProfileTab)}
            >
              <Ionicons name={tab.icon as any} size={16} color={activeSubTab === tab.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.subTabText, activeSubTab === tab.id && styles.subTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
        {activeSubTab === 'overview' && (
          <>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userData.name.charAt(0)}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{userData.level}</Text>
                </View>
              </View>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.memberSince}>Member since {userData.member_since}</Text>
              {userData.is_premium && (
                <View style={styles.premiumBadgeSmall}>
                  <Ionicons name="star" size={12} color={Colors.gold} />
                  <Text style={styles.premiumBadgeSmallText}>Premium</Text>
                </View>
              )}
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="diamond" size={20} color={Colors.gem} />
                <Text style={styles.statValue}>{userData.gems}</Text>
                <Text style={styles.statLabel}>Gems</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                <Text style={styles.statValue}>{userData.safety_score}</Text>
                <Text style={styles.statLabel}>Safety</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="speedometer" size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{userData.total_miles}</Text>
                <Text style={styles.statLabel}>Miles</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="flag" size={20} color={Colors.info} />
                <Text style={styles.statValue}>{userData.total_trips}</Text>
                <Text style={styles.statLabel}>Trips</Text>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {[
                { icon: 'car', label: 'Trip History', color: Colors.primary },
                { icon: 'trophy', label: 'Leaderboard', color: Colors.gold },
                { icon: 'people', label: 'Friends', color: Colors.info },
                { icon: 'help-circle', label: 'Help & Support', color: Colors.success },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={styles.menuItem}>
                  <View style={[styles.menuItemIcon, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {activeSubTab === 'settings' && (
          <View style={styles.settingsContainer}>
            {[
              { icon: 'notifications', label: 'Notifications' },
              { icon: 'lock-closed', label: 'Privacy' },
              { icon: 'card', label: 'Subscription' },
              { icon: 'help-circle', label: 'Help & Support' },
              { icon: 'information-circle', label: 'About' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.settingsItem}>
                <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.logoutButton}>
              <Ionicons name="log-out" size={20} color={Colors.error} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Menu Modal Component
function MenuModal({ visible, onClose, userData }: { visible: boolean; onClose: () => void; userData: UserData }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.menuOverlay}>
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{userData.name.charAt(0)}</Text>
            </View>
            <Text style={styles.menuUserName}>{userData.name}</Text>
            <TouchableOpacity style={styles.menuCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.menuContent}>
            {[
              { icon: 'person', label: 'Profile' },
              { icon: 'car', label: 'Trip History' },
              { icon: 'diamond', label: 'Gem History' },
              { icon: 'trophy', label: 'Leaderboard' },
              { icon: 'people', label: 'Friends' },
              { icon: 'ribbon', label: 'Badges' },
              { icon: 'settings', label: 'Settings' },
              { icon: 'help-circle', label: 'Help & Support' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.menuItemRow}>
                <Ionicons name={item.icon as any} size={22} color={Colors.textSecondary} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    width: '100%',
  },
  phoneFrame: {
    width: Math.min(width, 430),
    height: Math.min(height, 932),
    backgroundColor: Colors.background,
    borderRadius: 40,
    overflow: 'hidden',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statusTime: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: Colors.text,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  voiceButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: 28,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeTabBg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  activeTabLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Plan Selection Styles
  planContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  planHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  planHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  planHeaderLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
  },
  planTitle: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  planSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  planScroll: {
    flex: 1,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  planPrice: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  planPeriod: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  originalPrice: {
    color: Colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  discountBadge: {
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  discountText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  premiumNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  foundersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  foundersText: {
    color: Colors.gold,
    fontSize: 11,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    borderColor: Colors.primary,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  lockInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  lockInText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  planFeatures: {
    gap: 8,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planFeatureText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  planFooter: {
    paddingVertical: 16,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Car Onboarding Styles
  carContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  carProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 32,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceLight,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.surfaceLight,
  },
  carTitle: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  carSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  carTypesGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  carTypeCard: {
    width: (width - 80) / 3,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  carTypeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  carTypeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  carTypeIconSelected: {
    backgroundColor: `${Colors.primary}20`,
  },
  carTypeName: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  carTypeNameSelected: {
    color: Colors.text,
  },
  carTypeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  carPreviewCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  carPreviewName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorOption: {
    padding: 4,
  },
  colorOptionSelected: {
    transform: [{ scale: 1.15 }],
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  carFooter: {
    marginTop: 'auto',
    paddingVertical: 16,
  },

  // Map Tab Styles
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  locationButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  locationBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  locationBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  locationBtnTextInactive: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  quickLocations: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  quickLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
  },
  quickLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLocationName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  quickLocationAddress: {
    color: Colors.primary,
    fontSize: 11,
  },
  addLocationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  carMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  carMarkerBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerMarker: {
    position: 'absolute',
  },
  offerMarkerBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerMarkerDiscount: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -12,
    backgroundColor: Colors.success,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offerMarkerText: {
    color: Colors.text,
    fontSize: 8,
    fontWeight: 'bold',
  },
  orionButton: {
    position: 'absolute',
    bottom: 90,
    right: 16,
  },
  orionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReportButton: {
    position: 'absolute',
    bottom: 90,
    right: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Routes Tab Styles
  routesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  routeMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  routeActiveBadge: {
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeActiveText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  addRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
  },
  addRouteText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Rewards Tab Styles
  rewardsContainer: {
    flex: 1,
  },
  subTabsScroll: {
    maxHeight: 50,
  },
  subTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  subTabText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  subTabTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  rewardsContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  gemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  gemsAmount: {
    color: Colors.gem,
    fontSize: 24,
    fontWeight: 'bold',
  },
  gemsLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  offerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerInfo: {
    flex: 1,
  },
  offerName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  offerDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  offerDistance: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginRight: 8,
  },
  offerGems: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.gem}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  offerGemsText: {
    color: Colors.gem,
    fontSize: 10,
    fontWeight: '600',
  },
  offerDiscount: {
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  offerDiscountText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  offerDiscountLabel: {
    color: Colors.text,
    fontSize: 9,
    opacity: 0.9,
  },
  challengeCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  challengeDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  challengeProgress: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'right',
  },
  challengeRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  participantsText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  joinButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  badgesContainer: {
    paddingBottom: 20,
  },
  badgeStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  badgeStat: {
    flex: 1,
    alignItems: 'center',
  },
  badgeStatValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  badgeStatLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  badgeStatDivider: {
    width: 1,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 16,
  },
  badgeSectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  badgeItem: {
    width: (width - 80) / 3,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  badgeIconEarned: {
    backgroundColor: `${Colors.gold}20`,
  },
  badgeName: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  carStudioContainer: {
    paddingBottom: 20,
  },
  carStudioPreview: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    marginBottom: 20,
  },
  carStudioName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  carStudioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  carStudioOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carStudioOptionText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },

  // Profile Tab Styles
  profileContainer: {
    flex: 1,
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  levelText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  memberSince: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.gold}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  premiumBadgeSmallText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  menuItems: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  settingsContainer: {
    gap: 8,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  settingsLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
  },

  // Menu Modal Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContainer: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: Colors.background,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuUserName: {
    flex: 1,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  menuCloseBtn: {
    padding: 4,
  },
  menuContent: {
    flex: 1,
    padding: 16,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
    gap: 16,
  },
  menuItemText: {
    color: Colors.text,
    fontSize: 15,
  },
});
