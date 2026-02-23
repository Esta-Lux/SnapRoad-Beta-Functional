// SnapRoad Mobile - Navigation Configuration
// Stack + Tab navigation with Flutter-style flow

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, FontWeights } from '../utils/theme';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { PlanSelectionScreen } from '../screens/PlanSelectionScreen';
import { CarSetupScreen } from '../screens/CarSetupScreen';
import { MapScreen } from '../screens/MapScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OfferDetailScreen } from '../screens/OfferDetailScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
// New Aligned Screens
import { SettingsScreen } from '../screens/SettingsScreen';
import { FuelDashboardScreen } from '../screens/FuelDashboardScreen';
import { TripLogsScreen } from '../screens/TripLogsScreen';
import { FamilyScreen } from '../screens/FamilyScreen';
// Analytics & AI Screens
import { TripAnalyticsScreen } from '../screens/TripAnalyticsScreen';
import { RouteHistory3DScreen } from '../screens/RouteHistory3DScreen';
import { OrionCoachScreen } from '../screens/OrionCoachScreen';
import { MyOffersScreen } from '../screens/MyOffersScreen';
// New Figma UI Screens
import { DriverAnalyticsScreen } from '../screens/DriverAnalyticsScreen';
import { GemsScreen } from '../screens/GemsScreen';
import { PhotoCaptureScreen } from '../screens/PhotoCaptureScreen';
import { PrivacyCenterScreen } from '../screens/PrivacyCenterScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
// Navigation & Safety Screens
import { ActiveNavigationScreen } from '../screens/ActiveNavigationScreen';
import { SearchDestinationScreen } from '../screens/SearchDestinationScreen';
import { RoutePreviewScreen } from '../screens/RoutePreviewScreen';
import { HazardFeedScreen } from '../screens/HazardFeedScreen';
import { CommuteSchedulerScreen } from '../screens/CommuteSchedulerScreen';
import { InsuranceReportScreen } from '../screens/InsuranceReportScreen';
import { HelpScreen } from '../screens/HelpScreen';
// New feature-parity screens
import { RoutesScreen } from '../screens/RoutesScreen';
import { FriendsHubScreen } from '../screens/FriendsHubScreen';
import { BadgesScreen } from '../screens/BadgesScreen';
import { GemHistoryScreen } from '../screens/GemHistoryScreen';
// Premium feature-parity screens
import { CarStudioScreen } from '../screens/CarStudioScreen';
import { ChallengesScreen } from '../screens/ChallengesScreen';
import { LevelProgressScreen } from '../screens/LevelProgressScreen';
import { WeeklyRecapScreen } from '../screens/WeeklyRecapScreen';
// Admin & Partner Dashboards
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { PartnerDashboardScreen } from '../screens/PartnerDashboardScreen';
// Account & Legal Screens
import { AccountInfoScreen } from '../screens/AccountInfoScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/TermsOfServiceScreen';
import { PricingScreen } from '../screens/PricingScreen';

import { useUserStore } from '../store';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom theme
const CustomTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.surfaceLight,
    primary: Colors.primary,
  },
};

// Custom Tab Bar — Premium neon blue
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const iconMap: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
            Map: { active: 'map', inactive: 'map-outline' },
            Routes: { active: 'git-branch', inactive: 'git-branch-outline' },
            Rewards: { active: 'gift', inactive: 'gift-outline' },
            Profile: { active: 'person', inactive: 'person-outline' },
          };

          const icons = iconMap[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={tabStyles.tab} activeOpacity={0.7}>
              {isFocused ? (
                <LinearGradient colors={Colors.gradientPrimary} style={tabStyles.activeTab}>
                  <Ionicons name={icons.active} size={20} color="#fff" />
                  <Text style={tabStyles.activeLabel}>{route.name}</Text>
                </LinearGradient>
              ) : (
                <View style={tabStyles.inactiveTab}>
                  <Ionicons name={icons.inactive} size={20} color={Colors.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Main Tabs Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Routes" component={RoutesScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main Navigation
export const Navigation = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user } = useUserStore();

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <NavigationContainer theme={CustomTheme} navigationInChildEnabled>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: Platform.OS !== 'web' ? 'slide_from_right' : 'none',
        }}
        initialRouteName={user.onboardingComplete ? 'MainTabs' : 'Welcome'}
      >
        {/* Onboarding Flow */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="PlanSelection" component={PlanSelectionScreen} />
        <Stack.Screen name="CarSetup" component={CarSetupScreen} />
        
        {/* Main App */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        
        {/* Detail Screens */}
        <Stack.Screen 
          name="OfferDetail" 
          component={OfferDetailScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen 
          name="Leaderboard" 
          component={LeaderboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        
        {/* New Aligned Screens */}
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="FuelDashboard" 
          component={FuelDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="TripLogs" 
          component={TripLogsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="Family" 
          component={FamilyScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="TripAnalytics" 
          component={TripAnalyticsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="RouteHistory3D" 
          component={RouteHistory3DScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="OrionCoach" 
          component={OrionCoachScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen 
          name="MyOffers" 
          component={MyOffersScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Figma UI Screens */}
        <Stack.Screen 
          name="DriverAnalytics" 
          component={DriverAnalyticsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="Gems" 
          component={GemsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="PhotoCapture" 
          component={PhotoCaptureScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen 
          name="PrivacyCenter" 
          component={PrivacyCenterScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="NotificationSettings" 
          component={NotificationSettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Navigation & Safety Screens */}
        <Stack.Screen 
          name="SearchDestination" 
          component={SearchDestinationScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen 
          name="RoutePreview" 
          component={RoutePreviewScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="ActiveNavigation" 
          component={ActiveNavigationScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen 
          name="HazardFeed" 
          component={HazardFeedScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="CommuteScheduler" 
          component={CommuteSchedulerScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="InsuranceReport" 
          component={InsuranceReportScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="Help" 
          component={HelpScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* New feature-parity screens */}
        <Stack.Screen 
          name="FriendsHub" 
          component={FriendsHubScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="Badges" 
          component={BadgesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="GemHistory" 
          component={GemHistoryScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="TripHistory" 
          component={TripLogsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Premium feature-parity screens */}
        <Stack.Screen 
          name="CarStudio" 
          component={CarStudioScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="Challenges" 
          component={ChallengesScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="LevelProgress" 
          component={LevelProgressScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="WeeklyRecap" 
          component={WeeklyRecapScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        {/* Admin & Partner Dashboards */}
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="PartnerDashboard" 
          component={PartnerDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Account & Legal Screens */}
        <Stack.Screen 
          name="AccountInfo" 
          component={AccountInfoScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="PrivacyPolicy" 
          component={PrivacyPolicyScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="TermsOfService" 
          component={TermsOfServiceScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen 
          name="Pricing" 
          component={PricingScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xxl,
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  activeLabel: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.3,
  },
  inactiveTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});

export default Navigation;
