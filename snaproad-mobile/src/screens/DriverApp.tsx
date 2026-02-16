// SnapRoad Mobile - EXACT Flutter/Web UI Recreation
// Matching the web app design pixel-perfectly

import React, { useState } from 'react';
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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// EXACT Colors from Flutter/Web UI
const Colors = {
  // Primary colors
  primary: '#3B82F6',        // Blue for active states
  primaryDark: '#2563EB',
  
  // Accent colors
  orange: '#F97316',         // Report button orange
  purple: '#8B5CF6',         // Orion voice button
  green: '#22C55E',          // Success/high percentage marker
  
  // Dark theme
  background: '#0F172A',     // Main dark background
  headerBg: '#171B23',       // Header dark background
  surface: '#1E293B',        // Card surfaces
  surfaceLight: '#334155',   // Lighter surface elements
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Tab bar
  tabBarBg: '#F8FAFC',       // WHITE/Light tab bar background
  tabInactive: '#94A3B8',    // Gray inactive tabs
  
  // Gems
  gem: '#3B82F6',            // Blue gem markers
  gemGreen: '#22C55E',       // Green high-value gem
};

// Types
type TabType = 'map' | 'routes' | 'rewards' | 'profile';

interface UserData {
  name: string;
  gems: number;
  level: number;
}

// Mock data
const mockOffers = [
  { id: 1, discount: 6, lat: 0.7, lng: 0.8, color: 'blue' },
  { id: 2, discount: 6, lat: 0.5, lng: 0.6, color: 'blue' },
  { id: 3, discount: 6, lat: 0.35, lng: 0.45, color: 'blue' },
  { id: 4, discount: 18, lat: 0.25, lng: 0.15, color: 'green' },
  { id: 5, discount: 6, lat: 0.75, lng: 0.85, color: 'blue' },
];

// Main App Component
export default function DriverAppMain() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerBg} />
      
      {/* Phone Frame with exact styling */}
      <View style={styles.phoneFrame}>
        
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusRight}>
            <Text style={styles.statusText}>5G</Text>
            <Ionicons name="cellular" size={14} color={Colors.text} />
            <Ionicons name="battery-full" size={18} color={Colors.text} />
          </View>
        </View>

        {/* Header with Search */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="menu" size={26} color={Colors.text} />
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
          
          <TouchableOpacity style={styles.voiceButton}>
            <Ionicons name="mic-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Main Content based on active tab */}
        <View style={styles.content}>
          {activeTab === 'map' && <MapScreen />}
          {activeTab === 'routes' && <RoutesScreen />}
          {activeTab === 'rewards' && <RewardsScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </View>

        {/* Bottom Tab Bar - WHITE/LIGHT background */}
        <View style={styles.tabBar}>
          <TabItem 
            icon="location" 
            label="Map" 
            active={activeTab === 'map'} 
            onPress={() => setActiveTab('map')} 
          />
          <TabItem 
            icon="git-branch" 
            label="Routes" 
            active={activeTab === 'routes'} 
            onPress={() => setActiveTab('routes')} 
          />
          <TabItem 
            icon="gift" 
            label="Rewards" 
            active={activeTab === 'rewards'} 
            onPress={() => setActiveTab('rewards')} 
          />
          <TabItem 
            icon="settings" 
            label="Profile" 
            active={activeTab === 'profile'} 
            onPress={() => setActiveTab('profile')} 
          />
        </View>
      </View>

      {/* Side Menu Modal */}
      <SideMenu visible={showMenu} onClose={() => setShowMenu(false)} />
    </View>
  );
}

// Tab Item Component - EXACT styling from Flutter
function TabItem({ icon, label, active, onPress }: { 
  icon: string; 
  label: string; 
  active: boolean; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
      <Ionicons 
        name={active ? icon as any : `${icon}-outline` as any} 
        size={24} 
        color={active ? Colors.primary : Colors.tabInactive} 
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Map Screen - EXACT Flutter/Web UI
function MapScreen() {
  const [locationFilter, setLocationFilter] = useState<'favorites' | 'nearby' | 'report'>('favorites');

  return (
    <View style={styles.mapContainer}>
      {/* Filter Buttons Row - Favorites, Nearby, Report */}
      <View style={styles.filterRow}>
        {/* Favorites - Blue filled button */}
        <TouchableOpacity 
          style={[styles.filterButton, locationFilter === 'favorites' && styles.filterButtonActive]}
          onPress={() => setLocationFilter('favorites')}
        >
          <Ionicons name="star" size={16} color={Colors.text} />
          <Text style={styles.filterButtonText}>Favorites</Text>
        </TouchableOpacity>

        {/* Nearby - Dark outlined button */}
        <TouchableOpacity 
          style={[styles.filterButton, styles.filterButtonInactive]}
          onPress={() => setLocationFilter('nearby')}
        >
          <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.filterButtonTextInactive}>Nearby</Text>
        </TouchableOpacity>

        {/* Report - ORANGE button */}
        <TouchableOpacity 
          style={[styles.filterButton, styles.filterButtonReport]}
          onPress={() => setLocationFilter('report')}
        >
          <Ionicons name="warning" size={16} color={Colors.text} />
          <Text style={styles.filterButtonText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Locations - Home, Work, Add */}
      <View style={styles.quickLocationsRow}>
        {/* Home */}
        <TouchableOpacity style={styles.quickLocationCard}>
          <View style={styles.quickLocationIcon}>
            <Ionicons name="home-outline" size={20} color={Colors.textSecondary} />
          </View>
          <View style={styles.quickLocationText}>
            <Text style={styles.quickLocationName}>Home</Text>
            <Text style={styles.quickLocationAction}>Set location</Text>
          </View>
        </TouchableOpacity>

        {/* Work */}
        <TouchableOpacity style={styles.quickLocationCard}>
          <View style={styles.quickLocationIcon}>
            <Ionicons name="briefcase-outline" size={20} color={Colors.textSecondary} />
          </View>
          <View style={styles.quickLocationText}>
            <Text style={styles.quickLocationName}>Work</Text>
            <Text style={styles.quickLocationAction}>Set location</Text>
          </View>
        </TouchableOpacity>

        {/* Add Button */}
        <TouchableOpacity style={styles.addLocationButton}>
          <Ionicons name="add" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Map Area with Dark Theme */}
      <View style={styles.mapArea}>
        {/* Dark map background image placeholder */}
        <View style={styles.mapBackground}>
          {/* Grid lines to simulate map */}
          {[...Array(8)].map((_, i) => (
            <View key={`h${i}`} style={[styles.mapGridLine, { top: `${(i + 1) * 12}%` }]} />
          ))}
          {[...Array(6)].map((_, i) => (
            <View key={`v${i}`} style={[styles.mapGridLineV, { left: `${(i + 1) * 15}%` }]} />
          ))}
          
          {/* Street labels */}
          <Text style={[styles.mapStreetLabel, { top: '15%', left: '5%' }]}>West Spring Street</Text>
          <Text style={[styles.mapStreetLabel, { top: '35%', left: '10%' }]}>West Broad Street</Text>
          <Text style={[styles.mapStreetLabel, { top: '70%', right: '5%' }]}>South Innerbelt</Text>
        </View>

        {/* Gem Offer Markers */}
        {mockOffers.map((offer) => (
          <View 
            key={offer.id} 
            style={[
              styles.gemMarker, 
              { 
                top: `${offer.lat * 70 + 10}%`, 
                left: `${offer.lng * 80 + 5}%` 
              }
            ]}
          >
            <View style={[
              styles.gemMarkerCircle,
              offer.color === 'green' && styles.gemMarkerGreen
            ]}>
              <Ionicons name="diamond" size={16} color={Colors.text} />
            </View>
            <Text style={styles.gemMarkerPercent}>{offer.discount}%</Text>
          </View>
        ))}

        {/* Car Icon in center */}
        <View style={styles.carMarker}>
          <View style={styles.carIcon}>
            <Text style={styles.carEmoji}>🚙</Text>
          </View>
        </View>

        {/* Orion Voice Button - Purple */}
        <TouchableOpacity style={styles.orionButton}>
          <LinearGradient 
            colors={['#8B5CF6', '#7C3AED']} 
            style={styles.orionGradient}
          >
            <Ionicons name="mic" size={28} color={Colors.text} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Photo Report Button */}
        <TouchableOpacity style={styles.cameraButton}>
          <Ionicons name="camera-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Routes Screen
function RoutesScreen() {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Saved Routes</Text>
      
      <TouchableOpacity style={styles.routeCard}>
        <View style={styles.routeIconContainer}>
          <Ionicons name="navigate" size={22} color={Colors.primary} />
        </View>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>Home → Work</Text>
          <Text style={styles.routeMeta}>25 min • 12 mi</Text>
        </View>
        <View style={styles.routeActiveBadge}>
          <Text style={styles.routeActiveText}>Active</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.routeCard}>
        <View style={styles.routeIconContainer}>
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

// Rewards Screen
function RewardsScreen() {
  const [activeSubTab, setActiveSubTab] = useState<'offers' | 'challenges' | 'badges' | 'carstudio'>('offers');

  return (
    <View style={styles.screenContainer}>
      {/* Sub tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsRow}>
        {[
          { id: 'offers', label: 'Offers', icon: 'gift-outline' },
          { id: 'challenges', label: 'Challenges', icon: 'trophy-outline' },
          { id: 'badges', label: 'Badges', icon: 'ribbon-outline' },
          { id: 'carstudio', label: 'Car Studio', icon: 'color-palette-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.subTab, activeSubTab === tab.id && styles.subTabActive]}
            onPress={() => setActiveSubTab(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeSubTab === tab.id ? Colors.primary : Colors.textSecondary} 
            />
            <Text style={[styles.subTabText, activeSubTab === tab.id && styles.subTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeSubTab === 'offers' && (
          <>
            <View style={styles.gemsDisplay}>
              <Ionicons name="diamond" size={22} color={Colors.primary} />
              <Text style={styles.gemsAmount}>0</Text>
              <Text style={styles.gemsLabel}>gems available</Text>
            </View>

            {[
              { name: 'Shell', type: 'Gas Station', discount: 15, gems: 50, distance: '0.3 mi' },
              { name: 'Starbucks', type: 'Coffee', discount: 100, gems: 75, distance: '0.5 mi' },
              { name: 'Quick Clean', type: 'Car Wash', discount: 20, gems: 40, distance: '0.8 mi' },
            ].map((offer, i) => (
              <TouchableOpacity key={i} style={styles.offerCard}>
                <View style={styles.offerIcon}>
                  <Ionicons name="location" size={24} color={Colors.primary} />
                </View>
                <View style={styles.offerInfo}>
                  <Text style={styles.offerName}>{offer.name}</Text>
                  <Text style={styles.offerType}>{offer.type}</Text>
                  <View style={styles.offerMeta}>
                    <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.offerDistance}>{offer.distance}</Text>
                    <View style={styles.offerGemsBadge}>
                      <Ionicons name="diamond" size={10} color={Colors.primary} />
                      <Text style={styles.offerGemsText}>{offer.gems}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.offerDiscountBadge}>
                  <Text style={styles.offerDiscountValue}>{offer.discount}%</Text>
                  <Text style={styles.offerDiscountLabel}>OFF</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Profile Screen
function ProfileScreen() {
  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>D</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>1</Text>
          </View>
        </View>
        <Text style={styles.profileName}>Driver</Text>
        <Text style={styles.profileMeta}>Member since Dec 2025</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="diamond" size={20} color={Colors.primary} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Gems</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.green} />
          <Text style={styles.statValue}>100</Text>
          <Text style={styles.statLabel}>Safety</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="speedometer" size={20} color={Colors.primary} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Miles</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flag" size={20} color={Colors.orange} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
      </View>

      {/* Menu Items */}
      {[
        { icon: 'car-outline', label: 'Trip History', color: Colors.primary },
        { icon: 'trophy-outline', label: 'Leaderboard', color: Colors.orange },
        { icon: 'people-outline', label: 'Friends', color: Colors.purple },
        { icon: 'settings-outline', label: 'Settings', color: Colors.textSecondary },
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

      <TouchableOpacity style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Side Menu Component
function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>D</Text>
            </View>
            <View style={styles.menuHeaderText}>
              <Text style={styles.menuUserName}>Driver</Text>
              <Text style={styles.menuUserEmail}>driver@snaproad.com</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={Colors.text} />
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

// EXACT Styles matching Flutter/Web UI
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  phoneFrame: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Status Bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: Colors.headerBg,
  },
  statusTime: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.headerBg,
    gap: 12,
  },
  menuButton: {
    padding: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  voiceButton: {
    padding: 8,
  },
  
  // Content
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Tab Bar - WHITE/LIGHT background
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.tabBarBg,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    color: Colors.tabInactive,
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // Map Screen
  mapContainer: {
    flex: 1,
  },
  
  // Filter Buttons
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterButtonInactive: {
    backgroundColor: Colors.surface,
  },
  filterButtonReport: {
    backgroundColor: Colors.orange,
  },
  filterButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextInactive: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Quick Locations
  quickLocationsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  quickLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 12,
  },
  quickLocationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLocationText: {
    gap: 2,
  },
  quickLocationName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  quickLocationAction: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  addLocationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  
  // Map Area
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#1a1f2e',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#151922',
  },
  mapGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#2a3040',
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#2a3040',
  },
  mapStreetLabel: {
    position: 'absolute',
    color: '#4a5568',
    fontSize: 10,
    fontStyle: 'italic',
  },
  
  // Gem Markers
  gemMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  gemMarkerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  gemMarkerGreen: {
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
  },
  gemMarkerPercent: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Car Marker
  carMarker: {
    position: 'absolute',
    top: '45%',
    left: '48%',
  },
  carIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carEmoji: {
    fontSize: 24,
  },
  
  // Orion Voice Button - Purple
  orionButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
  },
  orionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  
  // Camera Button
  cameraButton: {
    position: 'absolute',
    bottom: 80,
    right: 86,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Screen Container
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  screenTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  
  // Routes
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  routeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  routeMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  routeActiveBadge: {
    backgroundColor: `${Colors.green}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeActiveText: {
    color: Colors.green,
    fontSize: 11,
    fontWeight: '600',
  },
  addRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1.5,
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
  
  // Rewards Sub Tabs
  subTabsRow: {
    marginBottom: 16,
    maxHeight: 44,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
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
    fontWeight: '500',
  },
  subTabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // Gems Display
  gemsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    gap: 10,
  },
  gemsAmount: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: 'bold',
  },
  gemsLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  
  // Offer Card
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  offerIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerInfo: {
    flex: 1,
  },
  offerName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  offerType: {
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
    marginRight: 10,
  },
  offerGemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  offerGemsText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  offerDiscountBadge: {
    backgroundColor: Colors.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  offerDiscountValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  offerDiscountLabel: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.9,
  },
  
  // Profile Header
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
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  levelText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileName: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  profileMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  
  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 40,
    gap: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Side Menu
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  menuHeaderText: {
    flex: 1,
  },
  menuUserName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  menuUserEmail: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  menuContent: {
    flex: 1,
    paddingVertical: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  menuRowText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
});
