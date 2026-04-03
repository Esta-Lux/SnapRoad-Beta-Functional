import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View, Text, Image, ScrollView, Platform, StyleSheet, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { getApiMisconfigurationMessage } from './src/api/client';
import { api } from './src/api/client';
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
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import AppTour from './src/components/gamification/AppTour';
import LegalConsentGate from './src/components/legal/LegalConsentGate';
import { storage } from './src/utils/storage';
import { getPathFromUrl, parseParamsFromUrl } from './src/utils/deepLinks';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://7aa7280b39975e4a9e09904bd0c47a9d@o4511064446271488.ingest.us.sentry.io/4511148963004416',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const APP_IS_PRODUCTION =
  String(process.env.APP_ENV || process.env.ENVIRONMENT || process.env.NODE_ENV || '').toLowerCase() === 'production';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
      <MapStack.Screen name="MapRedeem" component={MapScreen} />
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
      <ProfileStack.Screen name="ProfileBilling" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return token.data ?? null;
}

function MainTabs() {
  const { colors, isLight } = useTheme();
  const { isNavigating } = useNavigatingState();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: isNavigating
          ? {
              display: 'none' as const,
            }
          : {
              backgroundColor: colors.tabBar,
              borderTopColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingBottom: Platform.OS === 'ios' ? 28 : 8,
              paddingTop: 8,
              height: Platform.OS === 'ios' ? 88 : 64,
              ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 } : { elevation: 8 }),
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
        tabBarIconStyle: { marginBottom: -2 },
      }}
      screenListeners={{ tabPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
    >
      <Tab.Screen
        name="Map"
        component={MapStackScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Dashboards"
        component={DashboardStackScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsStackScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="gift-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, user, completeOAuthSignIn } = useAuth();
  const { colors } = useTheme();
  const [showSplash, setShowSplash] = React.useState(true);
  const [showTour, setShowTour] = React.useState(false);
  const lastHandledUrlRef = React.useRef<string | null>(null);
  const lastPushTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await Updates.checkForUpdateAsync();
        if (!r.isAvailable || cancelled) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (e) {
        console.warn('[OTA] Update check failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && !storage.getString('snaproad_tour_done')) {
      setShowTour(true);
    }
  }, [isAuthenticated]);

  const handleIncomingUrl = React.useCallback(async (url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl || lastHandledUrlRef.current === normalizedUrl) return;

    const path = getPathFromUrl(normalizedUrl);
    if (path !== 'auth') {
      lastHandledUrlRef.current = normalizedUrl;
      return;
    }

    lastHandledUrlRef.current = normalizedUrl;
    const params = parseParamsFromUrl(normalizedUrl);
    let accessToken = params.access_token || '';
    let refreshToken = params.refresh_token || '';

    if (!accessToken || !refreshToken) {
      try {
        const { supabase } = await import('./src/lib/supabase');
        const session = (await supabase.auth.getSession()).data.session;
        accessToken = accessToken || session?.access_token || '';
        refreshToken = refreshToken || session?.refresh_token || '';
      } catch {
        // Fall through to the guard below.
      }
    }

    if (accessToken && refreshToken) {
      await completeOAuthSignIn(accessToken, refreshToken);
    }
  }, [completeOAuthSignIn]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (!alive || !initialUrl) return;
      await handleIncomingUrl(initialUrl);
    })();

    const sub = Linking.addEventListener('url', (event: { url: string }) => {
      handleIncomingUrl(event.url).catch((err) => {
        console.warn('[DeepLink] Failed to handle incoming URL', err);
      });
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, [handleIncomingUrl]);

  React.useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (!token || cancelled || lastPushTokenRef.current === token) return;
        const result = await api.post('/api/user/push-token', {
          token,
          platform: Platform.OS,
        });
        if (result.success) {
          lastPushTokenRef.current = token;
        }
      } catch (err) {
        console.warn('[Push] Registration failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const linking = React.useMemo<any>(() => ({
    prefixes: ['snaproad://'],
    config: {
      screens: {
        Welcome: 'welcome',
        Auth: 'auth',
        ForgotPassword: 'forgot-password',
        ResetPassword: 'reset-password',
        Map: {
          screens: {
            MapMain: 'map',
            MapRedeem: 'redeem/:offerId',
          },
        },
        Dashboards: {
          screens: {
            DashboardMain: 'dashboard',
          },
        },
        Rewards: {
          screens: {
            RewardsMain: 'rewards',
          },
        },
        Profile: {
          screens: {
            ProfileMain: 'profile',
            ProfileBilling: 'billing/:status',
          },
        },
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
        <>
          <MainTabs />
          <LegalConsentGate />
          <AppTour visible={showTour} onComplete={() => { setShowTour(false); storage.set('snaproad_tour_done', '1'); }} />
        </>
      ) : (
        <PublicStack.Navigator screenOptions={{ headerShown: false }}>
          <PublicStack.Screen name="Welcome" component={WelcomeScreen} />
          <PublicStack.Screen name="Auth" component={AuthScreen} />
          <PublicStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <PublicStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </PublicStack.Navigator>
      )}
    </NavigationContainer>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { err: Error | null }
> {
  state: { err: Error | null } = { err: null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.err) {
      const userMessage = APP_IS_PRODUCTION
        ? 'Something went wrong. Please restart the app.'
        : this.state.err.message;
      return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
            <Text style={{ color: '#f87171', fontSize: 18, fontWeight: '700' }}>SnapRoad crashed</Text>
            <Text style={{ color: '#e2e8f0', marginTop: 12, lineHeight: 22 }}>
              {userMessage}
            </Text>
            {!APP_IS_PRODUCTION && (
              <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 13, lineHeight: 20 }}>
                If you see Worklets or AsyncStorage errors, reinstall the latest EAS dev build so native code matches JS, then run Metro with cache clear.
              </Text>
            )}
          </ScrollView>
        </GestureHandlerRootView>
      );
    }
    return this.props.children;
  }
}

function ApiConfigScreen({ message }: { message: string }) {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Set API URL for this device</Text>
        <Text style={{ color: '#cbd5e1', marginTop: 14, lineHeight: 22 }}>{message}</Text>
        <Text style={{ color: '#94a3b8', marginTop: 20, fontSize: 13, lineHeight: 20 }}>
          Backend must be running on your Mac (port 8001). Tunnel only that port, paste the https URL into EXPO_PUBLIC_API_URL, then stop and restart Metro.
        </Text>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(function App() {
  const apiConfigErr = getApiMisconfigurationMessage();
  if (apiConfigErr) {
    return <ApiConfigScreen message={apiConfigErr} />;
  }

  return (
    <AppErrorBoundary>
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
    </AppErrorBoundary>
  );
});
