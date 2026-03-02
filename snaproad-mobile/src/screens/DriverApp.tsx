// SnapRoad Mobile - Complete Driver App
// Exact replica of web UI at /app/frontend/src/pages/DriverApp

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
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import additional modals
import {
  RoadReportsModal,
  QuickPhotoModal,
  OffersFullModal,
  TripHistoryModal,
  LeaderboardModal,
  FriendsHubModal,
} from '../components/Modals';

const { width, height } = Dimensions.get('window');

// ============================================
// COLORS - Exact match from web UI
// ============================================
const Colors = {
  // Primary
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  
  // Accent colors
  emerald: '#10B981',
  teal: '#14B8A6',
  amber: '#F59E0B',
  orange: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  green: '#22C55E',
  red: '#EF4444',
  yellow: '#FBBF24',
  
  // Dark theme
  background: '#0F172A',
  backgroundDark: '#020617',
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceLighter: '#475569',
  
  // Text
  white: '#FFFFFF',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Tab bar
  tabBarBg: '#FFFFFF',
  tabInactive: '#94A3B8',
  
  // Gems
  gem: '#A855F7',
  gemGreen: '#22C55E',
};

// ============================================
// TYPES
// ============================================
type AppScreen = 'welcome' | 'auth' | 'planSelection' | 'carOnboarding' | 'main';
type AuthMode = 'signin' | 'signup';
type TabType = 'map' | 'routes' | 'rewards' | 'profile';
type RewardsTab = 'offers' | 'challenges' | 'badges' | 'carstudio';
type ProfileTab = 'overview' | 'score' | 'fuel' | 'settings';
type LocationCategory = 'favorites' | 'nearby';

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
  reports_posted: number;
  reports_upvotes_received: number;
}

interface CarData {
  category: string;
  variant: string;
  color: string;
}

interface SavedLocation {
  id: number;
  name: string;
  address: string;
  category: string;
}

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

interface Offer {
  id: number;
  business_name: string;
  business_type: string;
  description: string;
  discount_percent: number;
  gems_reward: number;
  distance: string;
  expires_at: string;
  is_premium_offer: boolean;
  redeemed: boolean;
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  progress: number;
  goal: number;
  gems: number;
  xp: number;
  type: string;
  joined: boolean;
  claimed: boolean;
}

interface Badge {
  id: number;
  name: string;
  icon: string;
  earned: boolean;
  color: string;
  description: string;
}

// ============================================
// MOCK DATA
// ============================================
const initialUserData: UserData = {
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
  reports_posted: 0,
  reports_upvotes_received: 0,
};

const mockOffers: Offer[] = [
  { id: 1, business_name: 'Shell', business_type: 'gas', description: '15¢ off per gallon', discount_percent: 6, gems_reward: 50, distance: '0.3 mi', expires_at: '2025-12-31', is_premium_offer: false, redeemed: false },
  { id: 2, business_name: 'Starbucks', business_type: 'cafe', description: 'Free drink upgrade', discount_percent: 18, gems_reward: 75, distance: '0.5 mi', expires_at: '2025-12-31', is_premium_offer: true, redeemed: false },
  { id: 3, business_name: 'Quick Clean', business_type: 'carwash', description: '20% off wash', discount_percent: 6, gems_reward: 40, distance: '0.8 mi', expires_at: '2025-12-31', is_premium_offer: false, redeemed: false },
  { id: 4, business_name: 'Chipotle', business_type: 'restaurant', description: 'Free chips & guac', discount_percent: 6, gems_reward: 60, distance: '1.2 mi', expires_at: '2025-12-31', is_premium_offer: false, redeemed: false },
];

const mockChallenges: Challenge[] = [
  { id: 1, title: 'Safe Week', description: 'Complete 7 trips with 90+ safety score', progress: 3, goal: 7, gems: 100, xp: 500, type: 'safety', joined: true, claimed: false },
  { id: 2, title: 'Mile Marker', description: 'Drive 50 miles this week', progress: 23, goal: 50, gems: 75, xp: 300, type: 'distance', joined: true, claimed: false },
  { id: 3, title: 'Early Bird', description: 'Complete 5 trips before 8am', progress: 0, goal: 5, gems: 50, xp: 200, type: 'time', joined: false, claimed: false },
];

const mockBadges: Badge[] = [
  { id: 1, name: 'Safe Driver', icon: 'shield-checkmark', earned: true, color: Colors.green, description: 'Complete 10 trips with 95+ safety' },
  { id: 2, name: 'Mile Master', icon: 'speedometer', earned: true, color: Colors.primary, description: 'Drive 100 miles' },
  { id: 3, name: 'Early Bird', icon: 'sunny', earned: false, color: Colors.amber, description: 'Complete 5 morning trips' },
  { id: 4, name: 'Night Owl', icon: 'moon', earned: false, color: Colors.purple, description: 'Complete 5 night trips' },
  { id: 5, name: 'Eco Warrior', icon: 'leaf', earned: false, color: Colors.green, description: 'Save 10 gallons of fuel' },
  { id: 6, name: 'Social Star', icon: 'people', earned: true, color: Colors.primary, description: 'Add 5 friends' },
  { id: 7, name: 'Reporter', icon: 'alert-circle', earned: false, color: Colors.orange, description: 'Post 10 road reports' },
  { id: 8, name: 'Gem Collector', icon: 'diamond', earned: false, color: Colors.gem, description: 'Earn 1000 gems' },
];

const mockLocations: SavedLocation[] = [];

const mockRoutes: SavedRoute[] = [
  { id: 1, name: 'Home → Work', origin: 'Home', destination: 'Work', departure_time: '08:00', days_active: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], estimated_time: 25, distance: 12, is_active: true, notifications: true },
  { id: 2, name: 'Work → Gym', origin: 'Work', destination: 'Gym', departure_time: '17:30', days_active: ['Mon', 'Wed', 'Fri'], estimated_time: 10, distance: 4, is_active: false, notifications: true },
];

const carTypes = [
  { id: 'sedan', name: 'Sedan', description: 'Compact & efficient' },
  { id: 'suv', name: 'SUV', description: 'Spacious & versatile' },
  { id: 'truck', name: 'Truck', description: 'Powerful & rugged' },
];

const carColors = [
  { id: 'ocean-blue', name: 'Ocean Blue', hex: '#3B82F6', free: true },
  { id: 'midnight-black', name: 'Midnight Black', hex: '#1E293B', price: 100 },
  { id: 'pearl-white', name: 'Pearl White', hex: '#F8FAFC', price: 100 },
  { id: 'racing-red', name: 'Racing Red', hex: '#EF4444', price: 150 },
  { id: 'forest-green', name: 'Forest Green', hex: '#22C55E', price: 150 },
  { id: 'sunset-gold', name: 'Sunset Gold', hex: '#FBBF24', price: 200 },
];

// Map gem markers for the map view
const gemMarkers = [
  { id: 1, percent: 6, top: 0.25, left: 0.7 },
  { id: 2, percent: 6, top: 0.38, left: 0.55 },
  { id: 3, percent: 6, top: 0.52, left: 0.4 },
  { id: 4, percent: 18, top: 0.65, left: 0.25, isPremium: true },
  { id: 5, percent: 6, top: 0.72, left: 0.65 },
];

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function DriverAppMain() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('welcome');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [userData, setUserData] = useState<UserData>(initialUserData);
  const [userCar, setUserCar] = useState<CarData>({ category: 'sedan', variant: 'sedan-classic', color: 'ocean-blue' });
  const [ownedColors, setOwnedColors] = useState<string[]>(['ocean-blue']);

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (user: any) => {
    setUserData(prev => ({
      ...prev,
      id: user.user_id || prev.id,
      name: user.name || prev.name,
    }));
    setShowAuthModal(false);
    setCurrentScreen('planSelection');
  };

  const handlePlanSelect = (plan: 'basic' | 'premium') => {
    setUserData(prev => ({
      ...prev,
      plan,
      is_premium: plan === 'premium',
      gem_multiplier: plan === 'premium' ? 2 : 1,
    }));
    setCurrentScreen('carOnboarding');
  };

  const handleCarComplete = (car: CarData) => {
    setUserCar(car);
    setCurrentScreen('main');
  };

  if (currentScreen === 'welcome') {
    return (
      <>
        <WelcomeScreen 
          onGetStarted={handleGetStarted} 
          onSignIn={handleSignIn} 
        />
        <AuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  if (currentScreen === 'planSelection') {
    return <PlanSelectionScreen onSelect={handlePlanSelect} />;
  }

  if (currentScreen === 'carOnboarding') {
    return <CarOnboardingScreen onComplete={handleCarComplete} ownedColors={ownedColors} />;
  }

  return (
    <MainApp 
      userData={userData} 
      setUserData={setUserData} 
      userCar={userCar}
      setUserCar={setUserCar}
      ownedColors={ownedColors}
      setOwnedColors={setOwnedColors}
    />
  );
}

// ============================================
// WELCOME SCREEN - Exact Web Match
// ============================================
function WelcomeScreen({ 
  onGetStarted, 
  onSignIn 
}: { 
  onGetStarted: () => void; 
  onSignIn: () => void;
}) {
  const insets = useSafeAreaInsets();

  const features = [
    { icon: 'shield-checkmark', label: 'Safety Score', desc: 'Track your driving' },
    { icon: 'diamond', label: 'Earn Gems', desc: 'Redeem rewards' },
    { icon: 'trophy', label: 'Leaderboards', desc: 'Compete locally' },
    { icon: 'flash', label: 'Premium Perks', desc: '2x gem multiplier' },
  ];

  return (
    <View style={styles.welcomeContainer}>
      {/* Background Image */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=1920&q=80' }}
        style={styles.welcomeBgImage}
        blurRadius={2}
      />
      
      {/* Gradient Overlays */}
      <LinearGradient 
        colors={['rgba(15,23,42,0.7)', 'rgba(15,23,42,0.5)', 'rgba(15,23,42,0.9)']} 
        style={styles.welcomeOverlay} 
      />
      
      {/* Content */}
      <View style={[styles.welcomeContent, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="car-sport" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.logoText}>SnapRoad</Text>
          </View>
          <TouchableOpacity onPress={onSignIn} testID="welcome-signin">
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.welcomeMain}>
          {/* Badge */}
          <View style={styles.welcomeBadge}>
            <Ionicons name="star" size={14} color={Colors.yellow} />
            <Text style={styles.welcomeBadgeText}>Join 50,000+ safe drivers</Text>
          </View>

          {/* Headline */}
          <Text style={styles.welcomeHeadline}>Safe journeys,</Text>
          <Text style={styles.welcomeHeadlineGradient}>smart rewards</Text>

          {/* Subheadline */}
          <Text style={styles.welcomeSubheadline}>
            Join thousands of drivers making roads safer while earning premium rewards. Where safety becomes the ultimate status symbol.
          </Text>

          {/* CTA Button */}
          <TouchableOpacity style={styles.welcomeCta} onPress={onGetStarted} testID="get-started-btn">
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.welcomeCtaGradient}>
              <Text style={styles.welcomeCtaText}>Start Driving</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.welcomeLoginRow}>
            <Text style={styles.welcomeLoginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSignIn}>
              <Text style={styles.welcomeLoginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Strip */}
        <View style={styles.featuresStrip}>
          <View style={styles.featuresGrid}>
            {features.map((feature, i) => (
              <View key={i} style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Ionicons name={feature.icon as any} size={20} color={Colors.primary} />
                </View>
                <Text style={styles.featureLabel}>{feature.label}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.welcomeFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.footerText}>© 2025 SnapRoad. Making roads safer, one drive at a time.</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================
// AUTH MODAL - Exact Web Match
// ============================================
function AuthModal({
  visible,
  onClose,
  mode,
  onModeChange,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (user: any) => void;
}) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use environment variable for API URL (set in .env)
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';

  const handleSubmit = async () => {
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const body = mode === 'signup' 
        ? { name, email, password }
        : { email, password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data || data);
      } else {
        setError(data.message || data.detail || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    }

    setLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent testID="auth-modal">
      <View style={styles.authOverlay}>
        <TouchableOpacity style={styles.authBackdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.authCard}>
          {/* Close Button */}
          <TouchableOpacity style={styles.authClose} onPress={onClose} testID="auth-close">
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.authHeader}>
            <View style={styles.authIconBox}>
              <Ionicons name="car-sport" size={28} color={Colors.white} />
            </View>
            <Text style={styles.authTitle}>
              {mode === 'signin' ? 'Welcome back, Driver' : 'Start Your Journey'}
            </Text>
            <Text style={styles.authSubtitle}>
              {mode === 'signin' 
                ? 'Log in to continue earning rewards' 
                : 'Create your driver account'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.authForm}>
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.authInput}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  testID="auth-name"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.authInput}
                placeholder="driver@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="auth-email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.authInput, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="auth-password"
                />
                <TouchableOpacity 
                  style={styles.passwordToggle} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={18} 
                    color={Colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity 
              style={styles.authSubmitBtn} 
              onPress={handleSubmit}
              disabled={loading}
              testID="auth-submit"
            >
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.authSubmitGradient}>
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.authSubmitText}>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.authFooter}>
            <Text style={styles.authFooterText}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity 
              onPress={() => { 
                onModeChange(mode === 'signin' ? 'signup' : 'signin');
                resetForm();
              }}
            >
              <Text style={styles.authFooterLink}>
                {mode === 'signin' ? 'Create account' : 'Log in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// PLAN SELECTION SCREEN - Exact Web Match
// ============================================
function PlanSelectionScreen({ onSelect }: { onSelect: (plan: 'basic' | 'premium') => void }) {
  const [selected, setSelected] = useState<'basic' | 'premium' | null>(null);
  const insets = useSafeAreaInsets();

  const basicFeatures = [
    { icon: 'navigate', text: 'Manual rerouting' },
    { icon: 'shield-checkmark', text: 'Privacy-first navigation' },
    { icon: 'camera', text: 'Auto-blur photos' },
    { icon: 'location', text: 'Local offers (6% off)' },
    { icon: 'diamond', text: 'Earn Gems (1×)' },
  ];

  const premiumFeatures = [
    { icon: 'checkmark', text: 'Everything in Basic', highlight: true },
    { icon: 'navigate', text: 'Automatic rerouting' },
    { icon: 'gift', text: 'Premium offers (18% off)', highlight: true },
    { icon: 'diamond', text: 'Gem multiplier (2×)', highlight: true },
    { icon: 'analytics', text: 'Smart commute analytics' },
    { icon: 'headset', text: 'Priority support' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.background, Colors.backgroundDark, Colors.background]} style={styles.flex1}>
        {/* Header */}
        <View style={styles.planHeader}>
          <View style={styles.labelRow}>
            <Ionicons name="sparkles" size={16} color={Colors.amber} />
            <Text style={styles.labelText}>CHOOSE YOUR PLAN</Text>
          </View>
          <Text style={styles.titleText}>Start Your Journey</Text>
          <Text style={styles.subtitleText}>Drive safer. Earn rewards. Privacy guaranteed.</Text>
        </View>

        <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={styles.planContent}>
          {/* Basic Plan */}
          <TouchableOpacity
            style={[styles.planCard, selected === 'basic' && styles.planCardSelected]}
            onPress={() => setSelected('basic')}
            activeOpacity={0.8}
            testID="plan-basic"
          >
            <View style={styles.planCardHeader}>
              <View>
                <Text style={styles.planName}>BASIC</Text>
                <View style={styles.priceRow}>
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

          {/* Premium Plan */}
          <TouchableOpacity
            style={[styles.planCard, styles.planCardPremium, selected === 'premium' && styles.planCardPremiumSelected]}
            onPress={() => setSelected('premium')}
            activeOpacity={0.8}
            testID="plan-premium"
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>

            <View style={styles.planCardHeader}>
              <View>
                <View style={styles.premiumNameRow}>
                  <Ionicons name="flash" size={16} color={Colors.amber} />
                  <Text style={[styles.planName, { color: Colors.amber }]}>PREMIUM</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>$10.99</Text>
                  <Text style={styles.planPeriod}>/mo</Text>
                </View>
                <View style={styles.priceRow}>
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

            <View style={styles.lockInBox}>
              <Text style={styles.lockInText}>Lock in $10.99/month for life!</Text>
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
        <View style={[styles.planFooter, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => selected && onSelect(selected)}
            disabled={!selected}
            testID="continue-btn"
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
// CAR ONBOARDING SCREEN - Exact Web Match
// ============================================
function CarOnboardingScreen({ 
  onComplete, 
  ownedColors 
}: { 
  onComplete: (car: CarData) => void;
  ownedColors: string[];
}) {
  const [step, setStep] = useState<'type' | 'color'>('type');
  const [selectedType, setSelectedType] = useState('sedan');
  const [selectedColor, setSelectedColor] = useState('ocean-blue');
  const insets = useSafeAreaInsets();

  const selectedColorData = carColors.find(c => c.id === selectedColor);

  const handleContinue = () => {
    if (step === 'type') {
      setStep('color');
    } else {
      onComplete({ category: selectedType, variant: `${selectedType}-classic`, color: selectedColor });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.background, Colors.backgroundDark, Colors.background]} style={styles.flex1}>
        {/* Header */}
        <View style={styles.carHeader}>
          <View style={styles.labelRow}>
            <Ionicons name="sparkles" size={16} color={Colors.amber} />
            <Text style={styles.labelText}>{step === 'type' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}</Text>
          </View>
          <Text style={styles.titleText}>{step === 'type' ? 'Choose your ride' : 'Pick your color'}</Text>
          <Text style={styles.subtitleText}>
            {step === 'type' ? 'Select the type of vehicle you drive' : 'Blue is free! Earn gems to unlock more'}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, step === 'color' && styles.progressActive]} />
          </View>
        </View>

        <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={styles.carContent}>
          {step === 'type' ? (
            <View style={styles.carTypesList}>
              {carTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.carTypeCard, selectedType === type.id && styles.carTypeCardSelected]}
                  onPress={() => setSelectedType(type.id)}
                  testID={`car-type-${type.id}`}
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
            <View>
              {/* Car Preview */}
              <View style={styles.carPreviewBox}>
                <View style={[styles.carPreviewGlow, { backgroundColor: `${selectedColorData?.hex}30` }]} />
                <View style={[styles.carPreviewIcon, { backgroundColor: selectedColorData?.hex || Colors.primary }]}>
                  <Ionicons name="car-sport" size={64} color={selectedColorData?.hex === '#F8FAFC' ? '#000' : '#fff'} />
                </View>
                <Text style={styles.carPreviewName}>{selectedColorData?.name}</Text>
                <Text style={styles.carPreviewType}>{selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</Text>
              </View>

              {/* Color Grid */}
              <Text style={styles.colorLabel}>Select a color</Text>
              <View style={styles.colorGrid}>
                {carColors.map((color) => {
                  const isOwned = color.free || ownedColors.includes(color.id);
                  return (
                    <TouchableOpacity
                      key={color.id}
                      style={[styles.colorSwatch, selectedColor === color.id && styles.colorSwatchSelected]}
                      onPress={() => isOwned && setSelectedColor(color.id)}
                      disabled={!isOwned}
                      testID={`color-${color.id}`}
                    >
                      <View style={[styles.colorSwatchInner, { backgroundColor: color.hex }, !isOwned && styles.colorSwatchLocked]}>
                        {!isOwned && <Ionicons name="lock-closed" size={16} color={Colors.white} />}
                        {selectedColor === color.id && isOwned && (
                          <View style={styles.colorCheckmark}>
                            <Ionicons name="checkmark" size={16} color={color.hex === '#F8FAFC' ? '#000' : '#fff'} />
                          </View>
                        )}
                      </View>
                      {!isOwned && color.price && (
                        <View style={styles.colorPrice}>
                          <Ionicons name="diamond" size={10} color={Colors.gem} />
                          <Text style={styles.colorPriceText}>{color.price}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.colorHint}>Drive safely to earn gems and unlock more colors!</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.carFooter, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.carContinueBtn} onPress={handleContinue} testID="car-continue-btn">
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
              <Text style={styles.backBtnText}>Back to vehicle selection</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================================
// MAIN APP WITH ALL TABS
// ============================================
function MainApp({ 
  userData, 
  setUserData, 
  userCar, 
  setUserCar, 
  ownedColors, 
  setOwnedColors 
}: { 
  userData: UserData; 
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  userCar: CarData;
  setUserCar: React.Dispatch<React.SetStateAction<CarData>>;
  ownedColors: string[];
  setOwnedColors: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [rewardsTab, setRewardsTab] = useState<RewardsTab>('offers');
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');
  const [locationCategory, setLocationCategory] = useState<LocationCategory>('favorites');
  
  // Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showOrionVoice, setShowOrionVoice] = useState(false);
  const [showRoadReports, setShowRoadReports] = useState(false);
  const [showQuickPhoto, setShowQuickPhoto] = useState(false);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFriendsHub, setShowFriendsHub] = useState(false);
  const [showBadgesGrid, setShowBadgesGrid] = useState(false);
  const [showCarStudio, setShowCarStudio] = useState(false);
  const [showGemHistory, setShowGemHistory] = useState(false);
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Data states
  const [locations, setLocations] = useState<SavedLocation[]>(mockLocations);
  const [routes, setRoutes] = useState<SavedRoute[]>(mockRoutes);
  const [offers, setOffers] = useState<Offer[]>(mockOffers);
  const [challenges, setChallenges] = useState<Challenge[]>(mockChallenges);
  const [badges, setBadges] = useState<Badge[]>(mockBadges);
  
  // Navigation states
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getHomeLocation = () => locations.find(l => l.category === 'home');
  const getWorkLocation = () => locations.find(l => l.category === 'work');
  const getFavoriteLocations = () => locations.filter(l => !['home', 'work'].includes(l.category));

  return (
    <View style={styles.container}>
      {/* Status Bar Padding */}
      <View style={[styles.statusBarPadding, { paddingTop: insets.top }]} />

      {/* Main Content */}
      <View style={styles.mainContent}>
        {activeTab === 'map' && (
          <MapTab
            userData={userData}
            userCar={userCar}
            locationCategory={locationCategory}
            setLocationCategory={setLocationCategory}
            onMenuPress={() => setShowMenu(true)}
            onSearchPress={() => setShowSearch(true)}
            onOrionPress={() => setShowOrionVoice(true)}
            onReportPress={() => setShowRoadReports(true)}
            onPhotoPress={() => setShowQuickPhoto(true)}
            onOfferPress={(offer) => {/* handle offer click */}}
            getHomeLocation={getHomeLocation}
            getWorkLocation={getWorkLocation}
            getFavoriteLocations={getFavoriteLocations}
            onAddLocation={() => setShowAddLocation(true)}
            isNavigating={isNavigating}
          />
        )}
        {activeTab === 'routes' && (
          <RoutesTab
            routes={routes}
            onAddRoute={() => setShowAddRoute(true)}
            onToggleRoute={(id) => setRoutes(routes.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r))}
            onDeleteRoute={(id) => setRoutes(routes.filter(r => r.id !== id))}
          />
        )}
        {activeTab === 'rewards' && (
          <RewardsTab
            userData={userData}
            rewardsTab={rewardsTab}
            setRewardsTab={setRewardsTab}
            offers={offers}
            challenges={challenges}
            badges={badges}
            userCar={userCar}
            onViewAllOffers={() => setShowOffersModal(true)}
            onLeaderboard={() => setShowLeaderboard(true)}
            onGemHistory={() => setShowGemHistory(true)}
            onCarStudio={() => setShowCarStudio(true)}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab
            userData={userData}
            profileTab={profileTab}
            setProfileTab={setProfileTab}
            userCar={userCar}
            onTripHistory={() => setShowTripHistory(true)}
            onLeaderboard={() => setShowLeaderboard(true)}
            onFriends={() => setShowFriendsHub(true)}
            onHelp={() => setShowHelp(true)}
          />
        )}
      </View>

      {/* Bottom Tab Bar - White Background */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        <TabBarItem icon="location" label="Map" active={activeTab === 'map'} onPress={() => setActiveTab('map')} />
        <TabBarItem icon="git-branch" label="Routes" active={activeTab === 'routes'} onPress={() => setActiveTab('routes')} />
        <TabBarItem icon="gift" label="Rewards" active={activeTab === 'rewards'} onPress={() => setActiveTab('rewards')} />
        <TabBarItem icon="person" label="Profile" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
      </View>

      {/* Side Menu Modal */}
      <SideMenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userData={userData}
        userCar={userCar}
        routes={routes}
        locations={locations}
        offers={offers}
        badges={badges}
        onNavigate={(tab) => { setActiveTab(tab); setShowMenu(false); }}
        onFriendsHub={() => { setShowFriendsHub(true); setShowMenu(false); }}
        onLeaderboard={() => { setShowLeaderboard(true); setShowMenu(false); }}
        onBadges={() => { setShowBadgesGrid(true); setShowMenu(false); }}
        onCarStudio={() => { setShowCarStudio(true); setShowMenu(false); }}
        onGemHistory={() => { setShowGemHistory(true); setShowMenu(false); }}
        onHelp={() => { setShowHelp(true); setShowMenu(false); }}
      />

      {/* Search Modal */}
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectDestination={(dest) => {
          setIsNavigating(true);
          setShowSearch(false);
        }}
      />

      {/* Orion Voice Modal */}
      <OrionVoiceModal
        visible={showOrionVoice}
        onClose={() => setShowOrionVoice(false)}
      />

      {/* Road Reports Modal */}
      <RoadReportsModal
        visible={showRoadReports}
        onClose={() => setShowRoadReports(false)}
        currentUserId={userData.id}
      />

      {/* Quick Photo Modal */}
      <QuickPhotoModal
        visible={showQuickPhoto}
        onClose={() => setShowQuickPhoto(false)}
        currentLocation={{ lat: 39.9612, lng: -82.9988 }}
        isMoving={false}
        currentSpeed={0}
      />

      {/* Full Offers Modal */}
      <OffersFullModal
        visible={showOffersModal}
        onClose={() => setShowOffersModal(false)}
        userPlan={userData.plan}
      />

      {/* Trip History Modal */}
      <TripHistoryModal
        visible={showTripHistory}
        onClose={() => setShowTripHistory(false)}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        visible={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        userId={userData.id}
        userGems={userData.gems}
      />

      {/* Friends Hub Modal */}
      <FriendsHubModal
        visible={showFriendsHub}
        onClose={() => setShowFriendsHub(false)}
        userId={userData.id}
        friendsCount={userData.friends_count}
      />
    </View>
  );
}

// ============================================
// TAB BAR ITEM
// ============================================
function TabBarItem({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tabBarItem} onPress={onPress} testID={`tab-${label.toLowerCase()}`}>
      <Ionicons
        name={active ? icon as any : `${icon}-outline` as any}
        size={24}
        color={active ? Colors.primary : Colors.tabInactive}
      />
      <Text style={[styles.tabBarLabel, active && styles.tabBarLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================
// MAP TAB - Exact Web Match
// ============================================
function MapTab({
  userData,
  userCar,
  locationCategory,
  setLocationCategory,
  onMenuPress,
  onSearchPress,
  onOrionPress,
  onReportPress,
  onPhotoPress,
  onOfferPress,
  getHomeLocation,
  getWorkLocation,
  getFavoriteLocations,
  onAddLocation,
  isNavigating,
}: {
  userData: UserData;
  userCar: CarData;
  locationCategory: LocationCategory;
  setLocationCategory: (cat: LocationCategory) => void;
  onMenuPress: () => void;
  onSearchPress: () => void;
  onOrionPress: () => void;
  onReportPress: () => void;
  onPhotoPress: () => void;
  onOfferPress: (offer: Offer) => void;
  getHomeLocation: () => SavedLocation | undefined;
  getWorkLocation: () => SavedLocation | undefined;
  getFavoriteLocations: () => SavedLocation[];
  onAddLocation: () => void;
  isNavigating: boolean;
}) {
  return (
    <View style={styles.mapContainer}>
      {/* Top Bar */}
      <View style={styles.mapTopBar}>
        {/* Search Bar Row */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} testID="menu-btn">
            <Ionicons name="menu" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBar} onPress={onSearchPress} testID="search-btn">
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <Text style={styles.searchPlaceholder}>{isNavigating ? 'Navigating...' : 'Search here'}</Text>
            <TouchableOpacity onPress={onOrionPress} testID="orion-btn">
              <Ionicons name="mic" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Quick Action Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={[styles.pill, locationCategory === 'favorites' && styles.pillActive]}
              onPress={() => setLocationCategory('favorites')}
              testID="tab-favorites"
            >
              <Ionicons name="star" size={16} color={locationCategory === 'favorites' ? Colors.white : Colors.yellow} />
              <Text style={[styles.pillText, locationCategory === 'favorites' && styles.pillTextActive]}>Favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, locationCategory === 'nearby' && styles.pillActive]}
              onPress={() => setLocationCategory('nearby')}
              testID="tab-nearby"
            >
              <Ionicons name="location" size={16} color={Colors.white} />
              <Text style={[styles.pillText, locationCategory === 'nearby' && styles.pillTextActive]}>Nearby</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pill, styles.pillOrange]} onPress={onReportPress} testID="report-hazard-btn">
              <Ionicons name="warning" size={16} color={Colors.white} />
              <Text style={styles.pillText}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pill, styles.pillBlue]} onPress={onPhotoPress} testID="quick-photo-btn">
              <Ionicons name="camera" size={16} color={Colors.white} />
              <Text style={styles.pillText}>Photo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Favorites Content */}
        {locationCategory === 'favorites' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationsScroll}>
            <View style={styles.locationsRow}>
              {/* Home */}
              {getHomeLocation() ? (
                <TouchableOpacity style={styles.locationCard} testID="quick-home">
                  <View style={styles.locationIcon}>
                    <Ionicons name="home" size={18} color={Colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={styles.locationName}>Home</Text>
                    <Text style={styles.locationAddress} numberOfLines={1}>{getHomeLocation()?.address}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.locationCard} onPress={onAddLocation} testID="add-home">
                  <View style={styles.locationIcon}>
                    <Ionicons name="home" size={18} color={Colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={styles.locationName}>Home</Text>
                    <Text style={styles.locationAction}>Set location</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Work */}
              {getWorkLocation() ? (
                <TouchableOpacity style={styles.locationCard} testID="quick-work">
                  <View style={styles.locationIcon}>
                    <Ionicons name="briefcase" size={18} color={Colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={styles.locationName}>Work</Text>
                    <Text style={styles.locationAddress} numberOfLines={1}>{getWorkLocation()?.address}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.locationCard} onPress={onAddLocation} testID="add-work">
                  <View style={styles.locationIcon}>
                    <Ionicons name="briefcase" size={18} color={Colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={styles.locationName}>Work</Text>
                    <Text style={styles.locationAction}>Set location</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Add More */}
              <TouchableOpacity style={styles.locationCard} onPress={onAddLocation} testID="add-favorite">
                <View style={styles.locationIcon}>
                  <Ionicons name="add" size={20} color={Colors.textSecondary} />
                </View>
                <Text style={styles.locationName}>More</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Nearby Content */}
        {locationCategory === 'nearby' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationsScroll}>
            <View style={styles.locationsRow}>
              {[
                { icon: 'flame', label: 'Gas', color: Colors.primary },
                { icon: 'cafe', label: 'Coffee', color: Colors.orange },
                { icon: 'cart', label: 'Shopping', color: Colors.pink },
                { icon: 'fitness', label: 'Gym', color: Colors.purple },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={styles.nearbyCard} testID={`nearby-${item.label.toLowerCase()}`}>
                  <Ionicons name={item.icon as any} size={16} color={item.color} />
                  <Text style={styles.nearbyText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Map Area */}
      <View style={styles.mapArea}>
        {/* Dark map background with grid */}
        <View style={styles.mapBg}>
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <View key={`h${i}`} style={[styles.mapLineH, { top: `${i * 12}%` }]} />
          ))}
          {[1, 2, 3, 4, 5].map(i => (
            <View key={`v${i}`} style={[styles.mapLineV, { left: `${i * 18}%` }]} />
          ))}
          
          {/* Street labels */}
          <Text style={[styles.mapLabel, { top: '15%', left: 16 }]}>West Spring Street</Text>
          <Text style={[styles.mapLabel, { top: '38%', left: 24 }]}>West Broad Street</Text>
          <Text style={[styles.mapLabel, { top: '72%', right: 16 }]}>South Innerbelt</Text>
        </View>

        {/* Gem Markers */}
        {gemMarkers.map((m) => (
          <TouchableOpacity key={m.id} style={[styles.gemMarker, { top: `${m.top * 100}%`, left: `${m.left * 100}%` }]}>
            <View style={[styles.gemCircle, m.isPremium && styles.gemCirclePremium]}>
              <Ionicons name="diamond" size={16} color={Colors.white} />
            </View>
            <Text style={styles.gemPercent}>{m.percent}%</Text>
          </TouchableOpacity>
        ))}

        {/* Car Marker */}
        <View style={styles.carMarker}>
          <View style={[styles.carIcon, { backgroundColor: carColors.find(c => c.id === userCar.color)?.hex || Colors.primary }]}>
            <Ionicons name="car-sport" size={20} color={Colors.white} />
          </View>
        </View>

        {/* Orion Voice Button */}
        <TouchableOpacity style={styles.orionFab} onPress={onOrionPress} testID="orion-fab">
          <LinearGradient colors={[Colors.purple, '#7C3AED']} style={styles.orionGradient}>
            <Ionicons name="mic" size={28} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Camera Button */}
        <TouchableOpacity style={styles.cameraFab} onPress={onPhotoPress} testID="camera-fab">
          <Ionicons name="camera" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// ROUTES TAB
// ============================================
function RoutesTab({
  routes,
  onAddRoute,
  onToggleRoute,
  onDeleteRoute,
}: {
  routes: SavedRoute[];
  onAddRoute: () => void;
  onToggleRoute: (id: number) => void;
  onDeleteRoute: (id: number) => void;
}) {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.tabTitle}>Saved Routes</Text>
      <Text style={styles.tabSubtitle}>{routes.length}/20 routes saved</Text>

      {routes.map((route) => (
        <TouchableOpacity key={route.id} style={styles.routeCard} testID={`route-${route.id}`}>
          <View style={styles.routeIconBox}>
            <Ionicons name="navigate" size={22} color={Colors.primary} />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{route.name}</Text>
            <Text style={styles.routeMeta}>{route.estimated_time} min • {route.distance} mi</Text>
            <View style={styles.routeDays}>
              {['M', 'T', 'W', 'T', 'F'].map((day, i) => (
                <View
                  key={i}
                  style={[
                    styles.routeDay,
                    route.days_active.includes(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]) && styles.routeDayActive,
                  ]}
                >
                  <Text style={[styles.routeDayText, route.days_active.includes(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]) && styles.routeDayTextActive]}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
          {route.is_active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addRouteBtn} onPress={onAddRoute} testID="add-route-btn">
        <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
        <Text style={styles.addRouteText}>Add New Route</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================
// REWARDS TAB
// ============================================
function RewardsTab({
  userData,
  rewardsTab,
  setRewardsTab,
  offers,
  challenges,
  badges,
  userCar,
  onViewAllOffers,
  onLeaderboard,
  onGemHistory,
  onCarStudio,
}: {
  userData: UserData;
  rewardsTab: RewardsTab;
  setRewardsTab: (tab: RewardsTab) => void;
  offers: Offer[];
  challenges: Challenge[];
  badges: Badge[];
  userCar: CarData;
  onViewAllOffers: () => void;
  onLeaderboard: () => void;
  onGemHistory: () => void;
  onCarStudio: () => void;
}) {
  return (
    <View style={styles.tabContent}>
      {/* Header with Gems */}
      <LinearGradient colors={[Colors.emerald, Colors.teal]} style={styles.rewardsHeader}>
        <View style={styles.rewardsHeaderContent}>
          <Text style={styles.rewardsTitle}>Rewards</Text>
          <TouchableOpacity style={styles.gemsBtn} onPress={onGemHistory} testID="gem-balance-btn">
            <Ionicons name="diamond" size={16} color={Colors.white} />
            <Text style={styles.gemsText}>{(userData.gems / 1000).toFixed(1)}K</Text>
          </TouchableOpacity>
        </View>

        {/* Sub-tabs */}
        <View style={styles.subTabsContainer}>
          {(['offers', 'challenges', 'badges', 'carstudio'] as RewardsTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.subTab, rewardsTab === tab && styles.subTabActive]}
              onPress={() => setRewardsTab(tab)}
              testID={`rewards-tab-${tab}`}
            >
              <Text style={[styles.subTabText, rewardsTab === tab && styles.subTabTextActive]}>
                {tab === 'carstudio' ? 'Car Studio' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.rewardsContent}>
        {rewardsTab === 'offers' && (
          <OffersContent
            userData={userData}
            offers={offers}
            onViewAll={onViewAllOffers}
            onLeaderboard={onLeaderboard}
          />
        )}
        {rewardsTab === 'challenges' && (
          <ChallengesContent challenges={challenges} />
        )}
        {rewardsTab === 'badges' && (
          <BadgesContent badges={badges} />
        )}
        {rewardsTab === 'carstudio' && (
          <CarStudioContent userCar={userCar} onCarStudio={onCarStudio} />
        )}
      </ScrollView>
    </View>
  );
}

function OffersContent({ userData, offers, onViewAll, onLeaderboard }: { userData: UserData; offers: Offer[]; onViewAll: () => void; onLeaderboard: () => void }) {
  return (
    <View style={styles.offersContent}>
      {/* Leaderboard Preview */}
      <TouchableOpacity onPress={onLeaderboard} testID="leaderboard-preview">
        <LinearGradient colors={[Colors.purple, Colors.pink]} style={styles.leaderboardCard}>
          <View>
            <Text style={styles.leaderboardLabel}>Your Rank</Text>
            <Text style={styles.leaderboardRank}>#{userData.rank || 42}</Text>
          </View>
          <View style={styles.leaderboardRight}>
            <Ionicons name="trophy" size={24} color={Colors.yellow} />
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* View All Offers */}
      <TouchableOpacity onPress={onViewAll} testID="view-all-offers">
        <LinearGradient colors={[Colors.emerald, Colors.teal]} style={styles.allOffersCard}>
          <View>
            <Text style={styles.allOffersLabel}>
              {userData.is_premium ? 'Premium: 18% off' : 'Basic: 6% off'}
            </Text>
            <Text style={styles.allOffersTitle}>View All Offers</Text>
          </View>
          <View style={styles.allOffersRight}>
            <Ionicons name="gift" size={24} color={Colors.white} />
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Nearby Offers */}
      <Text style={styles.sectionTitle}>Nearby Offers</Text>
      {offers.slice(0, 4).map((offer) => (
        <TouchableOpacity key={offer.id} style={styles.offerCard} testID={`offer-${offer.id}`}>
          <View style={styles.offerIcon}>
            <Ionicons
              name={
                offer.business_type === 'gas' ? 'flame' :
                offer.business_type === 'cafe' ? 'cafe' :
                offer.business_type === 'carwash' ? 'car' : 'gift'
              }
              size={22}
              color={Colors.primary}
            />
          </View>
          <View style={styles.offerInfo}>
            <Text style={styles.offerName}>{offer.business_name}</Text>
            <Text style={styles.offerDesc}>{offer.description}</Text>
            <View style={styles.offerMeta}>
              <Ionicons name="location" size={12} color={Colors.textMuted} />
              <Text style={styles.offerDist}>{offer.distance}</Text>
              <View style={styles.offerGems}>
                <Ionicons name="diamond" size={10} color={Colors.gem} />
                <Text style={styles.offerGemsText}>{offer.gems_reward}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.offerDiscount, offer.is_premium_offer && styles.offerDiscountPremium]}>
            <Text style={styles.offerDiscountVal}>{offer.discount_percent}%</Text>
            <Text style={styles.offerDiscountLabel}>OFF</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ChallengesContent({ challenges }: { challenges: Challenge[] }) {
  return (
    <View style={styles.challengesContent}>
      {challenges.map((ch) => (
        <View key={ch.id} style={styles.challengeCard} testID={`challenge-${ch.id}`}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIcon}>
              <Ionicons name="trophy" size={20} color={Colors.amber} />
            </View>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{ch.title}</Text>
              <Text style={styles.challengeDesc}>{ch.description}</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(ch.progress / ch.goal) * 100}%` }]} />
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
    </View>
  );
}

function BadgesContent({ badges }: { badges: Badge[] }) {
  const earned = badges.filter(b => b.earned).length;
  return (
    <View style={styles.badgesContent}>
      <View style={styles.badgeStats}>
        <View style={styles.badgeStat}>
          <Text style={styles.badgeStatVal}>{earned}</Text>
          <Text style={styles.badgeStatLabel}>Earned</Text>
        </View>
        <View style={styles.badgeStatDivider} />
        <View style={styles.badgeStat}>
          <Text style={styles.badgeStatVal}>{badges.length}</Text>
          <Text style={styles.badgeStatLabel}>Total</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Available Badges</Text>
      <View style={styles.badgesGrid}>
        {badges.map((badge) => (
          <View key={badge.id} style={styles.badgeItem}>
            <View style={[styles.badgeIcon, badge.earned && { backgroundColor: `${badge.color}30` }]}>
              <Ionicons name={badge.icon as any} size={24} color={badge.earned ? badge.color : Colors.textMuted} />
            </View>
            <Text style={styles.badgeName}>{badge.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CarStudioContent({ userCar, onCarStudio }: { userCar: CarData; onCarStudio: () => void }) {
  const colorData = carColors.find(c => c.id === userCar.color);
  return (
    <View style={styles.carStudioContent}>
      <View style={styles.carStudioPreview}>
        <View style={[styles.carStudioIcon, { backgroundColor: colorData?.hex || Colors.primary }]}>
          <Ionicons name="car-sport" size={64} color={colorData?.hex === '#F8FAFC' ? '#000' : '#fff'} />
        </View>
        <Text style={styles.carStudioName}>
          {userCar.category.charAt(0).toUpperCase() + userCar.category.slice(1)} - {colorData?.name || 'Blue'}
        </Text>
      </View>

      <TouchableOpacity style={styles.studioOption} onPress={onCarStudio}>
        <View style={[styles.studioOptionIcon, { backgroundColor: `${Colors.primary}20` }]}>
          <Ionicons name="color-palette" size={20} color={Colors.primary} />
        </View>
        <Text style={styles.studioOptionText}>Change Color</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.studioOption} onPress={onCarStudio}>
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
// PROFILE TAB
// ============================================
function ProfileTab({
  userData,
  profileTab,
  setProfileTab,
  userCar,
  onTripHistory,
  onLeaderboard,
  onFriends,
  onHelp,
}: {
  userData: UserData;
  profileTab: ProfileTab;
  setProfileTab: (tab: ProfileTab) => void;
  userCar: CarData;
  onTripHistory: () => void;
  onLeaderboard: () => void;
  onFriends: () => void;
  onHelp: () => void;
}) {
  const subTabs: { id: ProfileTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'person-outline' },
    { id: 'score', label: 'Score', icon: 'shield-checkmark-outline' },
    { id: 'fuel', label: 'Fuel', icon: 'flame-outline' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <View style={styles.tabContent}>
      {/* Sub-tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileSubTabs}>
        <View style={styles.profileSubTabsRow}>
          {subTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.profileSubTab, profileTab === tab.id && styles.profileSubTabActive]}
              onPress={() => setProfileTab(tab.id)}
              testID={`profile-tab-${tab.id}`}
            >
              <Ionicons name={tab.icon as any} size={16} color={profileTab === tab.id ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.profileSubTabText, profileTab === tab.id && styles.profileSubTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {profileTab === 'overview' && (
          <ProfileOverview
            userData={userData}
            userCar={userCar}
            onTripHistory={onTripHistory}
            onLeaderboard={onLeaderboard}
            onFriends={onFriends}
            onHelp={onHelp}
          />
        )}
        {profileTab === 'score' && <ProfileScore userData={userData} />}
        {profileTab === 'fuel' && <ProfileFuel userData={userData} />}
        {profileTab === 'settings' && <ProfileSettings />}
      </ScrollView>
    </View>
  );
}

function ProfileOverview({
  userData,
  userCar,
  onTripHistory,
  onLeaderboard,
  onFriends,
  onHelp,
}: {
  userData: UserData;
  userCar: CarData;
  onTripHistory: () => void;
  onLeaderboard: () => void;
  onFriends: () => void;
  onHelp: () => void;
}) {
  const colorData = carColors.find(c => c.id === userCar.color);
  
  return (
    <View style={styles.profileOverview}>
      {/* Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userData.name.charAt(0)}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{userData.level}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{userData.name}</Text>
        <Text style={styles.profileMeta}>Member since {userData.member_since}</Text>
        {userData.is_premium && (
          <View style={styles.premiumTag}>
            <Ionicons name="star" size={12} color={Colors.amber} />
            <Text style={styles.premiumTagText}>Premium</Text>
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="diamond" size={20} color={Colors.gem} />
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

      {/* Menu Items */}
      {[
        { icon: 'car-outline', label: 'Trip History', color: Colors.primary, onPress: onTripHistory },
        { icon: 'trophy-outline', label: 'Leaderboard', color: Colors.orange, onPress: onLeaderboard },
        { icon: 'people-outline', label: 'Friends', color: Colors.purple, onPress: onFriends },
        { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.green, onPress: onHelp },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress} testID={`menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
          <View style={[styles.menuItemIcon, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <Text style={styles.menuItemLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ProfileScore({ userData }: { userData: UserData }) {
  return (
    <View style={styles.profileScore}>
      <View style={styles.scoreCircle}>
        <Text style={styles.scoreValue}>{userData.safety_score}</Text>
        <Text style={styles.scoreLabel}>Safety Score</Text>
      </View>
      <View style={styles.scoreStats}>
        <View style={styles.scoreStat}>
          <Text style={styles.scoreStatVal}>{userData.safe_drive_streak}</Text>
          <Text style={styles.scoreStatLabel}>Safe Drive Streak</Text>
        </View>
        <View style={styles.scoreStat}>
          <Text style={styles.scoreStatVal}>{userData.total_trips}</Text>
          <Text style={styles.scoreStatLabel}>Total Trips</Text>
        </View>
      </View>
    </View>
  );
}

function ProfileFuel({ userData }: { userData: UserData }) {
  return (
    <View style={styles.profileFuel}>
      <View style={styles.fuelCard}>
        <Ionicons name="flame" size={32} color={Colors.orange} />
        <Text style={styles.fuelTitle}>Fuel Tracker</Text>
        <Text style={styles.fuelDesc}>Track your fuel efficiency and costs</Text>
        <TouchableOpacity style={styles.fuelBtn}>
          <Text style={styles.fuelBtnText}>Add Fuel Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProfileSettings() {
  return (
    <View style={styles.profileSettings}>
      {[
        { icon: 'notifications-outline', label: 'Notifications' },
        { icon: 'lock-closed-outline', label: 'Privacy' },
        { icon: 'card-outline', label: 'Subscription' },
        { icon: 'help-circle-outline', label: 'Help & Support' },
        { icon: 'information-circle-outline', label: 'About' },
      ].map((item, i) => (
        <TouchableOpacity key={i} style={styles.settingsItem} testID={`settings-${item.label.toLowerCase()}`}>
          <Ionicons name={item.icon as any} size={22} color={Colors.textSecondary} />
          <Text style={styles.settingsLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.logoutBtn} testID="logout-btn">
        <Ionicons name="log-out-outline" size={20} color={Colors.red} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// SIDE MENU MODAL
// ============================================
function SideMenuModal({
  visible,
  onClose,
  userData,
  userCar,
  routes,
  locations,
  offers,
  badges,
  onNavigate,
  onFriendsHub,
  onLeaderboard,
  onBadges,
  onCarStudio,
  onGemHistory,
  onHelp,
}: {
  visible: boolean;
  onClose: () => void;
  userData: UserData;
  userCar: CarData;
  routes: SavedRoute[];
  locations: SavedLocation[];
  offers: Offer[];
  badges: Badge[];
  onNavigate: (tab: TabType) => void;
  onFriendsHub: () => void;
  onLeaderboard: () => void;
  onBadges: () => void;
  onCarStudio: () => void;
  onGemHistory: () => void;
  onHelp: () => void;
}) {
  const insets = useSafeAreaInsets();
  const colorData = carColors.find(c => c.id === userCar.color);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menuContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.menuHeader}>
            <TouchableOpacity style={styles.menuCarIcon} onPress={onCarStudio}>
              <View style={[styles.menuCarBg, { backgroundColor: colorData?.hex || Colors.primary }]}>
                <Ionicons name="car-sport" size={24} color={Colors.white} />
              </View>
            </TouchableOpacity>
            <View style={styles.menuUserInfo}>
              <Text style={styles.menuUserName}>{userData.name}</Text>
              <Text style={styles.menuUserMeta}>Level {userData.level} • {userData.is_premium ? 'PRO' : 'Free'}</Text>
            </View>

            {/* User ID Card */}
            <View style={styles.menuIdCard}>
              <View>
                <Text style={styles.menuIdLabel}>Your ID</Text>
                <Text style={styles.menuIdValue}>{userData.id}</Text>
              </View>
              <View>
                <Text style={styles.menuIdLabel}>Friends</Text>
                <Text style={styles.menuIdValue}>{userData.friends_count}</Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.menuStatsRow}>
              <View style={styles.menuStat}>
                <Text style={styles.menuStatVal}>{(userData.gems / 1000).toFixed(1)}K</Text>
                <Text style={styles.menuStatLabel}>Gems</Text>
              </View>
              <View style={styles.menuStat}>
                <Text style={styles.menuStatVal}>{userData.safety_score}</Text>
                <Text style={styles.menuStatLabel}>Score</Text>
              </View>
              <View style={styles.menuStat}>
                <Text style={styles.menuStatVal}>#{userData.rank}</Text>
                <Text style={styles.menuStatLabel}>Rank</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Menu Items */}
          <ScrollView style={styles.menuContent}>
            <Text style={styles.menuSection}>SOCIAL</Text>
            <TouchableOpacity style={styles.menuRow} onPress={onFriendsHub} testID="menu-friends-hub">
              <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>Friends Hub</Text>
              <View style={styles.menuRowBadge}>
                <Text style={styles.menuRowBadgeText}>{userData.friends_count}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={onLeaderboard} testID="menu-leaderboard">
              <Ionicons name="bar-chart-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>Leaderboard</Text>
            </TouchableOpacity>

            <Text style={styles.menuSection}>NAVIGATION</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('map')} testID="menu-map">
              <Ionicons name="location-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('routes')} testID="menu-routes">
              <Ionicons name="git-branch-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>My Routes</Text>
              <View style={styles.menuRowBadge}>
                <Text style={styles.menuRowBadgeText}>{routes.length}/20</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.menuSection}>REWARDS</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('rewards')} testID="menu-offers">
              <Ionicons name="gift-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>Offers</Text>
              <View style={styles.menuRowBadge}>
                <Text style={styles.menuRowBadgeText}>{offers.length}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={onBadges} testID="menu-badges">
              <Ionicons name="ribbon-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>All Badges</Text>
              <View style={styles.menuRowBadge}>
                <Text style={styles.menuRowBadgeText}>{badges.filter(b => b.earned).length}/{badges.length}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={onCarStudio} testID="menu-car-studio">
              <Ionicons name="car-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>Car Studio</Text>
            </TouchableOpacity>

            <Text style={styles.menuSection}>SETTINGS</Text>
            <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('profile')} testID="menu-settings">
              <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={onHelp} testID="menu-help">
              <Ionicons name="help-circle-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.menuRowText}>Help</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Logout */}
          <View style={styles.menuFooter}>
            <TouchableOpacity style={styles.menuLogout} testID="menu-logout">
              <Ionicons name="log-out-outline" size={18} color={Colors.red} />
              <Text style={styles.menuLogoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================
// SEARCH MODAL
// ============================================
function SearchModal({
  visible,
  onClose,
  searchQuery,
  setSearchQuery,
  onSelectDestination,
}: {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectDestination: (dest: any) => void;
}) {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<any[]>([]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.searchModal, { paddingTop: insets.top }]}>
        <View style={styles.searchModalHeader}>
          <TouchableOpacity onPress={onClose} testID="search-close">
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <TextInput
            style={styles.searchModalInput}
            placeholder="Search for a place"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.searchResults}>
          {results.length === 0 && searchQuery.length === 0 && (
            <View style={styles.searchEmpty}>
              <Ionicons name="search" size={48} color={Colors.textMuted} />
              <Text style={styles.searchEmptyText}>Search for places, addresses, or businesses</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================
// ORION VOICE MODAL
// ============================================
function OrionVoiceModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [isListening, setIsListening] = useState(false);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.orionModal}>
        <TouchableOpacity style={styles.orionClose} onPress={onClose} testID="orion-close">
          <Ionicons name="close" size={28} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.orionContent}>
          <Text style={styles.orionTitle}>Orion Voice Assistant</Text>
          <Text style={styles.orionSubtitle}>Tap the mic and speak</Text>

          <TouchableOpacity
            style={[styles.orionMicBtn, isListening && styles.orionMicBtnActive]}
            onPress={() => setIsListening(!isListening)}
            testID="orion-mic"
          >
            <LinearGradient
              colors={isListening ? [Colors.green, Colors.emerald] : [Colors.purple, '#7C3AED']}
              style={styles.orionMicGradient}
            >
              <Ionicons name={isListening ? 'radio' : 'mic'} size={48} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.orionHint}>
            {isListening ? 'Listening...' : 'Try "Report pothole ahead"'}
          </Text>

          <View style={styles.orionCommands}>
            <Text style={styles.orionCommandsTitle}>Quick Commands</Text>
            {[
              'Report pothole ahead',
              'Navigate to home',
              'Find gas stations',
              'Share my trip',
            ].map((cmd, i) => (
              <TouchableOpacity key={i} style={styles.orionCommandItem}>
                <Ionicons name="mic" size={14} color={Colors.purple} />
                <Text style={styles.orionCommandText}>{cmd}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1 },

  // Welcome Screen
  welcomeContainer: { flex: 1, backgroundColor: Colors.background },
  welcomeBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  welcomeOverlay: { ...StyleSheet.absoluteFillObject },
  welcomeContent: { flex: 1 },
  welcomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: { width: 40, height: 40, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  signInText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500', paddingHorizontal: 12, paddingVertical: 8 },
  welcomeMain: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  welcomeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24, gap: 8 },
  welcomeBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  welcomeHeadline: { color: Colors.white, fontSize: 36, fontWeight: 'bold', textAlign: 'center', lineHeight: 44 },
  welcomeHeadlineGradient: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', lineHeight: 44, color: Colors.cyan },
  welcomeSubheadline: { color: Colors.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 32, lineHeight: 24, maxWidth: 320 },
  welcomeCta: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  welcomeCtaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 48, gap: 10 },
  welcomeCtaText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  welcomeLoginRow: { flexDirection: 'row', alignItems: 'center' },
  welcomeLoginText: { color: Colors.textMuted, fontSize: 14 },
  welcomeLoginLink: { color: Colors.emerald, fontSize: 14, fontWeight: '600' },
  featuresStrip: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(15,23,42,0.5)', paddingVertical: 24, paddingHorizontal: 16 },
  featuresGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  featureItem: { alignItems: 'center', flex: 1 },
  featureIconBox: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  featureLabel: { color: Colors.white, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  featureDesc: { color: Colors.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' },
  welcomeFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(15,23,42,0.8)', paddingTop: 16, paddingHorizontal: 20 },
  footerText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },

  // Auth Modal
  authOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  authBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  authCard: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(30,41,59,0.95)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative' },
  authClose: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  authHeader: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24, paddingBottom: 24 },
  authIconBox: { width: 64, height: 64, backgroundColor: Colors.primary, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  authTitle: { color: Colors.white, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  authSubtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  authForm: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  authInput: { backgroundColor: 'rgba(51,65,85,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: Colors.white, fontSize: 16 },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  passwordToggle: { position: 'absolute', right: 16, top: '50%', transform: [{ translateY: -9 }] },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: Colors.red, fontSize: 13, textAlign: 'center' },
  authSubmitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  authSubmitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  authSubmitText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  authFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  authFooterText: { color: Colors.textMuted, fontSize: 14 },
  authFooterLink: { color: Colors.emerald, fontSize: 14, fontWeight: '600' },
  
  // Plan Selection
  planHeader: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, paddingBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  labelText: { color: Colors.amber, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  titleText: { color: Colors.white, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitleText: { color: Colors.textSecondary, fontSize: 14, marginTop: 6, textAlign: 'center' },
  planContent: { padding: 16, paddingBottom: 24 },
  planCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 2, borderColor: 'transparent' },
  planCardSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  planCardPremium: { backgroundColor: 'rgba(180, 83, 9, 0.15)' },
  planCardPremiumSelected: { borderColor: Colors.amber, backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  popularBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: Colors.amber, paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 12, borderTopRightRadius: 18 },
  popularText: { color: Colors.white, fontSize: 10, fontWeight: 'bold' },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  planName: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  premiumNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginTop: 4 },
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
  planFooter: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.surface },
  continueBtn: { borderRadius: 16, overflow: 'hidden' },
  continueBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  continueBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  footerNote: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },

  // Car Onboarding
  carHeader: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 16 },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  progressSegment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceLight },
  progressActive: { backgroundColor: Colors.amber },
  carContent: { padding: 20 },
  carTypesList: { gap: 14 },
  carTypeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  carTypeCardSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  carTypePreview: { width: 72, height: 56, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  carTypePreviewSelected: { backgroundColor: `${Colors.primary}25` },
  carTypeInfo: { flex: 1, marginLeft: 14 },
  carTypeName: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  carTypeDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  carPreviewBox: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 24, padding: 24, marginBottom: 24, position: 'relative' },
  carPreviewGlow: { position: 'absolute', top: 20, width: 150, height: 150, borderRadius: 75 },
  carPreviewIcon: { width: 140, height: 100, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  carPreviewName: { color: Colors.white, fontSize: 18, fontWeight: '600', marginTop: 16 },
  carPreviewType: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  colorLabel: { color: Colors.textSecondary, fontSize: 13, marginBottom: 12 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorSwatch: { padding: 4 },
  colorSwatchSelected: { transform: [{ scale: 1.15 }] },
  colorSwatchInner: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorSwatchLocked: { opacity: 0.4 },
  colorCheckmark: { backgroundColor: 'rgba(255,255,255,0.9)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  colorPrice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 2 },
  colorPriceText: { color: Colors.gem, fontSize: 10, fontWeight: '600' },
  colorHint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 20 },
  carFooter: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.surface },
  carContinueBtn: { borderRadius: 16, overflow: 'hidden' },
  carContinueGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  carContinueText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  backBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  backBtnText: { color: Colors.textSecondary, fontSize: 14 },

  // Main App
  statusBarPadding: { backgroundColor: Colors.background },
  mainContent: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.tabBarBg, paddingTop: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  tabBarItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabBarLabel: { color: Colors.tabInactive, fontSize: 12, fontWeight: '500' },
  tabBarLabelActive: { color: Colors.primary, fontWeight: '600' },

  // Map Tab
  mapContainer: { flex: 1 },
  mapTopBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 12, paddingTop: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(15,23,42,0.95)', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 24, paddingHorizontal: 16, height: 46, gap: 10 },
  searchPlaceholder: { flex: 1, color: Colors.textSecondary, fontSize: 15 },
  pillsScroll: { marginTop: 10 },
  pillsRow: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.9)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6 },
  pillActive: { backgroundColor: Colors.primary },
  pillOrange: { backgroundColor: Colors.orange },
  pillBlue: { backgroundColor: Colors.primary },
  pillText: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  pillTextActive: { color: Colors.white },
  locationsScroll: { marginTop: 10 },
  locationsRow: { flexDirection: 'row', gap: 10 },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.9)', paddingLeft: 10, paddingRight: 14, paddingVertical: 10, borderRadius: 14, gap: 10 },
  locationIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  locationName: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  locationAddress: { color: Colors.textMuted, fontSize: 11, maxWidth: 80 },
  locationAction: { color: Colors.primary, fontSize: 11, fontWeight: '500' },
  nearbyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.9)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 8 },
  nearbyText: { color: Colors.white, fontSize: 14 },
  mapArea: { flex: 1, backgroundColor: '#151922' },
  mapBg: { ...StyleSheet.absoluteFillObject },
  mapLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#2a3040' },
  mapLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#2a3040' },
  mapLabel: { position: 'absolute', color: '#4a5568', fontSize: 10, fontStyle: 'italic' },
  gemMarker: { position: 'absolute', alignItems: 'center' },
  gemCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 },
  gemCirclePremium: { backgroundColor: Colors.green, shadowColor: Colors.green },
  gemPercent: { color: Colors.white, fontSize: 11, fontWeight: '600', marginTop: 4 },
  carMarker: { position: 'absolute', top: '45%', left: '48%' },
  carIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  orionFab: { position: 'absolute', bottom: 80, right: 16 },
  orionGradient: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.purple, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
  cameraFab: { position: 'absolute', bottom: 80, right: 86, width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },

  // Tab Content
  tabContent: { flex: 1, backgroundColor: Colors.background },
  tabTitle: { color: Colors.white, fontSize: 22, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 16 },
  tabSubtitle: { color: Colors.textSecondary, fontSize: 13, paddingHorizontal: 16, marginBottom: 16 },

  // Routes
  routeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 14, gap: 12 },
  routeIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  routeInfo: { flex: 1 },
  routeName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  routeMeta: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  routeDays: { flexDirection: 'row', gap: 4, marginTop: 6 },
  routeDay: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  routeDayActive: { backgroundColor: Colors.primary },
  routeDayText: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  routeDayTextActive: { color: Colors.white },
  activeBadge: { backgroundColor: `${Colors.green}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { color: Colors.green, fontSize: 11, fontWeight: '600' },
  addRouteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 8, paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, gap: 8 },
  addRouteText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  // Rewards
  rewardsHeader: { padding: 16, paddingBottom: 0 },
  rewardsHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rewardsTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  gemsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  gemsText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  subTabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 4, marginBottom: 16 },
  subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabActive: { backgroundColor: Colors.white },
  subTabText: { color: Colors.white, fontSize: 12, fontWeight: '500' },
  subTabTextActive: { color: Colors.emerald, fontWeight: '600' },
  rewardsContent: { flex: 1, paddingHorizontal: 16 },
  offersContent: {},
  leaderboardCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12 },
  leaderboardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  leaderboardRank: { color: Colors.white, fontSize: 28, fontWeight: 'bold' },
  leaderboardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  allOffersCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 16 },
  allOffersLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  allOffersTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  allOffersRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  offerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  offerIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  offerInfo: { flex: 1 },
  offerName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  offerDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  offerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  offerDist: { color: Colors.textMuted, fontSize: 11, marginRight: 10 },
  offerGems: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${Colors.gem}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  offerGemsText: { color: Colors.gem, fontSize: 10, fontWeight: '600' },
  offerDiscount: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  offerDiscountPremium: { backgroundColor: Colors.green },
  offerDiscountVal: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  offerDiscountLabel: { color: Colors.white, fontSize: 9, fontWeight: '500', opacity: 0.9 },

  // Challenges
  challengesContent: {},
  challengeCard: { backgroundColor: Colors.surface, padding: 16, borderRadius: 14, marginBottom: 12 },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  challengeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${Colors.amber}20`, alignItems: 'center', justifyContent: 'center' },
  challengeInfo: { flex: 1 },
  challengeTitle: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  challengeDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, marginBottom: 4 },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: { color: Colors.textSecondary, fontSize: 11, textAlign: 'right', marginBottom: 12 },
  rewardsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { color: Colors.textSecondary, fontSize: 12 },
  joinBtn: { marginTop: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, alignItems: 'center' },
  joinBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

  // Badges
  badgesContent: {},
  badgeStats: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginBottom: 20 },
  badgeStat: { flex: 1, alignItems: 'center' },
  badgeStatVal: { color: Colors.white, fontSize: 24, fontWeight: 'bold' },
  badgeStatLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  badgeStatDivider: { width: 1, backgroundColor: Colors.surfaceLight, marginHorizontal: 16 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  badgeItem: { width: (width - 64) / 3, alignItems: 'center' },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  badgeName: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center' },

  // Car Studio
  carStudioContent: {},
  carStudioPreview: { alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 20, padding: 32, marginBottom: 20 },
  carStudioIcon: { width: 120, height: 80, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  carStudioName: { color: Colors.white, fontSize: 16, fontWeight: '600', marginTop: 16 },
  studioOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  studioOptionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  studioOptionText: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '500' },

  // Profile
  profileSubTabs: { padding: 16, paddingBottom: 0 },
  profileSubTabsRow: { flexDirection: 'row', gap: 10 },
  profileSubTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6 },
  profileSubTabActive: { backgroundColor: `${Colors.primary}20`, borderWidth: 1, borderColor: Colors.primary },
  profileSubTabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  profileSubTabTextActive: { color: Colors.primary, fontWeight: '600' },
  profileOverview: { padding: 16 },
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
  profileScore: { padding: 16, alignItems: 'center' },
  scoreCircle: { width: 150, height: 150, borderRadius: 75, borderWidth: 8, borderColor: Colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  scoreValue: { color: Colors.white, fontSize: 48, fontWeight: 'bold' },
  scoreLabel: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  scoreStats: { flexDirection: 'row', gap: 24 },
  scoreStat: { alignItems: 'center' },
  scoreStatVal: { color: Colors.white, fontSize: 24, fontWeight: 'bold' },
  scoreStatLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  profileFuel: { padding: 16 },
  fuelCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, alignItems: 'center' },
  fuelTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  fuelDesc: { color: Colors.textSecondary, fontSize: 14, marginTop: 4, textAlign: 'center' },
  fuelBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  fuelBtnText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  profileSettings: { padding: 16 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 14, borderRadius: 14, marginBottom: 10, gap: 12 },
  settingsLabel: { flex: 1, color: Colors.white, fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.red, borderRadius: 14, marginTop: 16, marginBottom: 40, gap: 8 },
  logoutText: { color: Colors.red, fontSize: 14, fontWeight: '600' },

  // Side Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuContainer: { width: width * 0.8, height: '100%', backgroundColor: Colors.background },
  menuHeader: { padding: 16, paddingTop: 20 },
  menuCarIcon: { marginBottom: 12 },
  menuCarBg: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuUserInfo: { marginBottom: 12 },
  menuUserName: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  menuUserMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  menuIdCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 12 },
  menuIdLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  menuIdValue: { color: Colors.white, fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  menuStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  menuStat: { alignItems: 'center' },
  menuStatVal: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  menuStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  menuContent: { flex: 1, paddingVertical: 8 },
  menuSection: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  menuRowText: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '500' },
  menuRowBadge: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  menuRowBadgeText: { color: Colors.textSecondary, fontSize: 11 },
  menuFooter: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.surface },
  menuLogout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  menuLogoutText: { color: Colors.red, fontSize: 14, fontWeight: '500' },

  // Search Modal
  searchModal: { flex: 1, backgroundColor: Colors.background },
  searchModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.surface },
  searchModalInput: { flex: 1, color: Colors.white, fontSize: 16 },
  searchResults: { flex: 1 },
  searchEmpty: { alignItems: 'center', paddingVertical: 48 },
  searchEmptyText: { color: Colors.textMuted, fontSize: 14, marginTop: 16, textAlign: 'center' },

  // Orion Voice Modal
  orionModal: { flex: 1, backgroundColor: 'rgba(15,23,42,0.98)', alignItems: 'center', justifyContent: 'center' },
  orionClose: { position: 'absolute', top: 60, right: 20 },
  orionContent: { alignItems: 'center', padding: 24 },
  orionTitle: { color: Colors.white, fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  orionSubtitle: { color: Colors.textSecondary, fontSize: 14, marginBottom: 32 },
  orionMicBtn: {},
  orionMicBtnActive: {},
  orionMicGradient: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.purple, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  orionHint: { color: Colors.textSecondary, fontSize: 14, marginTop: 24 },
  orionCommands: { marginTop: 40, width: '100%' },
  orionCommandsTitle: { color: Colors.white, fontSize: 16, fontWeight: '600', marginBottom: 16 },
  orionCommandItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 8, gap: 10 },
  orionCommandText: { color: Colors.textSecondary, fontSize: 14 },
});
