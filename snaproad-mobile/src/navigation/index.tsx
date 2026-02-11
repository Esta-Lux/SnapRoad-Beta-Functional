// SnapRoad Mobile - Navigation

import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, BorderRadius } from '../utils/theme';
import { useAppStore, useUserStore } from '../store';

// Screens
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MapScreen } from '../screens/MapScreen';
import { OffersScreen } from '../screens/OffersScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom theme
const MyTheme = {
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

// Tab Bar Icon Component
const TabIcon = ({ focused, icon }: { focused: boolean; icon: string }) => {
  if (focused) {
    return (
      <LinearGradient
        colors={Colors.gradientPrimary}
        style={styles.activeTab}
      >
        <Ionicons name={icon as any} size={24} color={Colors.text} />
      </LinearGradient>
    );
  }
  return <Ionicons name={icon as any} size={24} color={Colors.textSecondary} />;
};

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="map" />,
        }}
      />
      <Tab.Screen
        name="Offers"
        component={OffersScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="pricetag" />,
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="trophy" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="person" />,
        }}
      />
    </Tab.Navigator>
  );
};

// Placeholder screens for navigation
const OfferDetailScreen = () => <View style={{ flex: 1, backgroundColor: Colors.background }} />;
const BadgeDetailScreen = () => <View style={{ flex: 1, backgroundColor: Colors.background }} />;
const ChallengeDetailScreen = () => <View style={{ flex: 1, backgroundColor: Colors.background }} />;
const TripDetailScreen = () => <View style={{ flex: 1, backgroundColor: Colors.background }} />;
const SettingsScreen = () => <View style={{ flex: 1, backgroundColor: Colors.background }} />;
const CarStudioScreen = () => <View style={{ flex: 1, backgroundColor: Colors.background }} />;
const LeaderboardScreen = () => <View style={{ flex: 1, backgroundColor: Colors.background }} />;

// Root Navigation
export const Navigation = () => {
  const { showOnboarding } = useAppStore();
  const { user } = useUserStore();

  // Check if user needs onboarding
  const needsOnboarding = showOnboarding && !user.onboardingComplete;

  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        {needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="MainApp" component={MainTabs} />
            <Stack.Screen 
              name="OfferDetail" 
              component={OfferDetailScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen 
              name="BadgeDetail" 
              component={BadgeDetailScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen 
              name="ChallengeDetail" 
              component={ChallengeDetailScreen}
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="TripDetail" 
              component={TripDetailScreen}
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen 
              name="CarStudio" 
              component={CarStudioScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen 
              name="Leaderboard" 
              component={LeaderboardScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    paddingTop: 8,
    paddingBottom: 24,
    height: 80,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  activeTab: {
    width: 48,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
