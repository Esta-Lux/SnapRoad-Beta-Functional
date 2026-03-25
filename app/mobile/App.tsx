import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, ActivityIndicator, View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { NavigatingProvider, useNavigatingState } from './src/contexts/NavigatingContext';

import MapScreen from './src/screens/MapScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

const Tab = createBottomTabNavigator();
const MapStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const RewardsStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const PublicStack = createStackNavigator();

function MapStackScreen() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false }}>
      <MapStack.Screen name="MapMain" component={MapScreen} />
    </MapStack.Navigator>
  );
}

function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
    </DashboardStack.Navigator>
  );
}

function RewardsStackScreen() {
  return (
    <RewardsStack.Navigator screenOptions={{ headerShown: false }}>
      <RewardsStack.Screen name="RewardsMain" component={RewardsScreen} />
    </RewardsStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  const { colors, isLight } = useTheme();
  const { isNavigating } = useNavigatingState();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: isNavigating
          ? { display: 'none' }
          : {
              backgroundColor: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(30,41,59,0.98)',
              borderTopColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              paddingBottom: 4,
              height: 60,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Dashboards"
        component={DashboardStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="gift-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(t);
  }, []);

  const linking = React.useMemo(() => ({
    prefixes: ['snaproad://'],
    config: {
      screens: {
        Welcome: 'welcome',
        Auth: 'auth',
        ResetPassword: 'reset-password',
      },
    },
  }), []);

  if (isLoading || showSplash) {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Image source={require('./assets/brand-logo.png')} style={{ width: 110, height: 110, marginBottom: 8 }} resizeMode="contain" />
        <Text style={{ color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: 0.2 }}>SnapRoad</Text>
        <Text style={{ color: 'rgba(255,255,255,0.84)', fontSize: 14, marginTop: 6 }}>Drive smarter every mile</Text>
        <View style={{ marginTop: 26 }}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? (
        <MainTabs />
      ) : (
        <PublicStack.Navigator screenOptions={{ headerShown: false }}>
          <PublicStack.Screen name="Welcome" component={WelcomeScreen} />
          <PublicStack.Screen name="Auth" component={AuthScreen} />
          <PublicStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </PublicStack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NavigatingProvider>
              <RootNavigator />
            </NavigatingProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
