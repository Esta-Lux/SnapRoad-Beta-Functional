// SnapRoad Mobile - Navigation Configuration
// Stack + Tab navigation with Flutter-style flow

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
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

// Custom Tab Bar
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Map: 'map',
            Offers: 'gift',
            Rewards: 'trophy',
            Profile: 'person',
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tabStyles.tab}
              activeOpacity={0.7}
            >
              {isFocused ? (
                <LinearGradient
                  colors={Colors.gradientPrimary}
                  style={tabStyles.activeTab}
                >
                  <Ionicons name={icons[route.name]} size={22} color={Colors.text} />
                  <Text style={tabStyles.activeLabel}>{route.name}</Text>
                </LinearGradient>
              ) : (
                <View style={tabStyles.inactiveTab}>
                  <Ionicons
                    name={icons[route.name]}
                    size={22}
                    color={Colors.textSecondary}
                  />
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
      <Tab.Screen name="Offers" component={OffersScreen} />
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
    <NavigationContainer theme={CustomTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
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
    borderRadius: BorderRadius.xl,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
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
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  activeLabel: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  inactiveTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});

export default Navigation;
