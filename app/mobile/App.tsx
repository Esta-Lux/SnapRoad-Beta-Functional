import 'react-native-gesture-handler';
import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, View, Text, Image, ScrollView, Platform, StyleSheet, Linking, Alert, TouchableOpacity } from 'react-native';

/** Lets in-app OAuth (Safari / Chrome Custom Tabs) hand off to `snaproad://auth` cleanly. */
WebBrowser.maybeCompleteAuthSession();
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { getApiMisconfigurationMessage } from './src/api/client';
import { api } from './src/api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CommonActions, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { NavigatingProvider, useNavigationMode } from './src/contexts/NavigatingContext';

import WelcomeScreen from './src/screens/WelcomeScreen';
import LegalConsentGate from './src/components/legal/LegalConsentGate';
import { storage } from './src/utils/storage';
import {
  decodeOAuthErrorDescription,
  friendlySupabaseAuthErrorMessage,
  getPathFromUrl,
  parseParamsFromUrl,
} from './src/utils/deepLinks';
import * as Sentry from '@sentry/react-native';
import MapboxGL from './src/utils/mapbox';
import {
  getMapboxPublicToken,
  logMapboxAccessDiagnostics,
  logMapboxStartupSourceOnce,
} from './src/config/mapbox';

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
const rootNavigationRef = createNavigationContainerRef();

/** Map stack only — defer requiring MapScreen until the authenticated map tab loads (not at App.tsx parse time). */
let mapScreenComponent: React.ComponentType<any> | null = null;
function loadMapScreenOnce(): React.ComponentType<any> {
  if (!mapScreenComponent) {
    mapScreenComponent = require('./src/screens/MapScreen').default as React.ComponentType<any>;
  }
  return mapScreenComponent as React.ComponentType<any>;
}
function MapScreenLazy(props: Record<string, unknown>) {
  const Screen = loadMapScreenOnce();
  return <Screen {...props} />;
}

let dashboardScreenComponent: React.ComponentType<any> | null = null;
function loadDashboardScreenOnce(): React.ComponentType<any> {
  if (!dashboardScreenComponent) {
    dashboardScreenComponent = require('./src/screens/DashboardScreen').default as React.ComponentType<any>;
  }
  return dashboardScreenComponent as React.ComponentType<any>;
}
function DashboardScreenLazy(props: Record<string, unknown>) {
  const Screen = loadDashboardScreenOnce();
  return <Screen {...props} />;
}

let rewardsScreenComponent: React.ComponentType<any> | null = null;
function loadRewardsScreenOnce(): React.ComponentType<any> {
  if (!rewardsScreenComponent) {
    rewardsScreenComponent = require('./src/screens/RewardsScreen').default as React.ComponentType<any>;
  }
  return rewardsScreenComponent as React.ComponentType<any>;
}
function RewardsScreenLazy(props: Record<string, unknown>) {
  const Screen = loadRewardsScreenOnce();
  return <Screen {...props} />;
}

let profileScreenComponent: React.ComponentType<any> | null = null;
function loadProfileScreenOnce(): React.ComponentType<any> {
  if (!profileScreenComponent) {
    profileScreenComponent = require('./src/screens/ProfileScreen').default as React.ComponentType<any>;
  }
  return profileScreenComponent as React.ComponentType<any>;
}
function ProfileScreenLazy(props: Record<string, unknown>) {
  const Screen = loadProfileScreenOnce();
  return <Screen {...props} />;
}

let appTourComponent: React.ComponentType<any> | null = null;
function loadAppTourOnce(): React.ComponentType<any> {
  if (!appTourComponent) {
    appTourComponent = require('./src/components/gamification/AppTour').default as React.ComponentType<any>;
  }
  return appTourComponent as React.ComponentType<any>;
}

let driverPromoSheetComponent: React.ComponentType<any> | null = null;
function loadDriverPromoSheetOnce(): React.ComponentType<any> {
  if (!driverPromoSheetComponent) {
    driverPromoSheetComponent =
      require('./src/components/gamification/DriverPromotionWelcomeSheet').default as React.ComponentType<any>;
  }
  return driverPromoSheetComponent as React.ComponentType<any>;
}

function NativeNavigationUnavailableScreen({ navigation }: { navigation: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Navigation unavailable</Text>
      <Text style={{ color: '#cbd5e1', textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
        Native navigation could not be loaded on this build. Please return to the map and try again.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 }}
        activeOpacity={0.85}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Back to map</Text>
      </TouchableOpacity>
    </View>
  );
}

function NativeNavigationScreenRoute(props: any) {
  try {
    // Lazy require avoids loading the native navigation module during app startup.
    const NativeNavigationScreen = require('./src/screens/NativeNavigationScreen').default as React.ComponentType<any>;
    return <NativeNavigationScreen {...props} />;
  } catch (error) {
    Sentry.captureMessage('native_navigation_module_load_failed', {
      level: 'error',
      extra: { reason: error instanceof Error ? error.message : String(error) },
    });
    console.error('[NativeNavigation] Failed to load screen', error);
    return <NativeNavigationUnavailableScreen {...props} />;
  }
}

function MapStackScreen() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false }}>
      <MapStack.Screen name="MapMain" component={MapScreenLazy} />
      <MapStack.Screen name="MapRedeem" component={MapScreenLazy} />
      <MapStack.Screen name="NativeNavigation" component={NativeNavigationScreenRoute} />
    </MapStack.Navigator>
  );
}

function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreenLazy} />
    </DashboardStack.Navigator>
  );
}

function RewardsStackScreen() {
  return (
    <RewardsStack.Navigator screenOptions={{ headerShown: false }}>
      <RewardsStack.Screen name="RewardsMain" component={RewardsScreenLazy} />
    </RewardsStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreenLazy} />
      <ProfileStack.Screen name="ProfileBilling" component={ProfileScreenLazy} />
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
  const { isNavigating } = useNavigationMode();

  return (
    <Tab.Navigator
      screenOptions={{
        /** Without this, all four tabs mount at once and pull Map + Profile + Wallet + Dashboard native graphs — common TestFlight crash. */
        lazy: true,
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
        name="Wallet"
        component={RewardsStackScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={24} color={color} />,
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
  const [splashMinElapsed, setSplashMinElapsed] = React.useState(false);
  const [showTour, setShowTour] = React.useState(false);
  const [showDriverPromoWelcome, setShowDriverPromoWelcome] = React.useState(false);
  const lastHandledUrlRef = React.useRef<string | null>(null);
  const lastPushTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setSplashMinElapsed(true), 500);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        await new Promise<void>((r) => setTimeout(r, 2800));
        if (cancelled) return;
        const r = await Updates.checkForUpdateAsync();
        if (!r.isAvailable || cancelled) return;
        await Updates.fetchUpdateAsync();
        if (cancelled) return;
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

  /** Admin promotion welcome — after tour (or if tour already done), once per promo window. */
  React.useEffect(() => {
    if (!isAuthenticated || !user?.promotion_active || !user.promotion_access_until) {
      setShowDriverPromoWelcome(false);
      return;
    }
    if (showTour) {
      setShowDriverPromoWelcome(false);
      return;
    }
    const until = String(user.promotion_access_until);
    const ack = storage.getString('snaproad_promo_ack_until') || '';
    if (ack === until) {
      setShowDriverPromoWelcome(false);
      return;
    }
    const t = setTimeout(() => setShowDriverPromoWelcome(true), 500);
    return () => clearTimeout(t);
  }, [isAuthenticated, user?.promotion_active, user?.promotion_access_until, showTour]);

  const acknowledgeDriverPromo = React.useCallback(() => {
    if (user?.promotion_access_until) {
      storage.set('snaproad_promo_ack_until', String(user.promotion_access_until));
    }
    setShowDriverPromoWelcome(false);
  }, [user?.promotion_access_until]);

  const handleIncomingUrl = React.useCallback(async (url: string) => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl || lastHandledUrlRef.current === normalizedUrl) return;

    const path = getPathFromUrl(normalizedUrl);

    if (path.startsWith('billing/')) {
      lastHandledUrlRef.current = normalizedUrl;
      const params = parseParamsFromUrl(normalizedUrl);
      const sessionId = (params.session_id || '').trim();
      const statusSeg = path.slice('billing/'.length).split('/')[0] || '';

      if (isAuthenticated) {
        if (statusSeg === 'success' && sessionId) {
          try {
            await api.get(`/api/payments/checkout/status/${encodeURIComponent(sessionId)}`);
          } catch (e) {
            console.warn('[Billing] checkout status failed', e);
          }
        }
        const goProfile = () => {
          if (!rootNavigationRef.isReady()) return;
          rootNavigationRef.dispatch(
            CommonActions.navigate({
              name: 'Profile',
              params: {
                screen: 'ProfileMain',
                params: { status: statusSeg, session_id: sessionId },
              },
            }),
          );
        };
        requestAnimationFrame(goProfile);
      }
      return;
    }

    if (path !== 'auth') {
      return;
    }

    lastHandledUrlRef.current = normalizedUrl;
    const params = parseParamsFromUrl(normalizedUrl);

    if (params.error) {
      const rawDesc = params.error_description || params.error || '';
      const decoded = decodeOAuthErrorDescription(rawDesc);
      Alert.alert('Google sign-in', friendlySupabaseAuthErrorMessage(decoded || params.error));
      return;
    }

    // Supabase JS v2 uses PKCE by default → redirect is often snaproad://auth?code=... (not hash tokens).
    if (params.code) {
      try {
        const { supabase } = await import('./src/lib/supabase');
        const { data: exchanged, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeErr) {
          Alert.alert('Google sign-in', friendlySupabaseAuthErrorMessage(exchangeErr.message));
          return;
        }
        const session = exchanged?.session;
        if (session?.access_token && session?.refresh_token) {
          await completeOAuthSignIn(session.access_token, session.refresh_token);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Google sign-in', friendlySupabaseAuthErrorMessage(msg));
      }
      return;
    }

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
  }, [completeOAuthSignIn, isAuthenticated]);

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

  React.useEffect(() => {
    const subReceive = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === 'commute_alert' || data?.type === 'commute_traffic_alert') {
        const title =
          notification.request.content.title ??
          (data?.type === 'commute_traffic_alert' ? 'Traffic update' : 'Time to head out');
        const body = notification.request.content.body ?? '';
        Alert.alert(title, body, [{ text: 'OK' }], { cancelable: true });
      }
    });
    return () => subReceive.remove();
  }, []);

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
        Wallet: {
          screens: {
            RewardsMain: 'wallet',
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

  if (isLoading || !splashMinElapsed) {
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
    <NavigationContainer ref={rootNavigationRef} linking={linking}>
      {isAuthenticated ? (
        <>
          <MainTabs />
          <LegalConsentGate />
          {showTour ? (
            (() => {
              const AppTour = loadAppTourOnce();
              return (
                <AppTour visible onComplete={() => { setShowTour(false); storage.set('snaproad_tour_done', '1'); }} />
              );
            })()
          ) : null}
          {showDriverPromoWelcome ? (
            (() => {
              const DriverPromotionWelcomeSheet = loadDriverPromoSheetOnce();
              return (
                <DriverPromotionWelcomeSheet
                  visible
                  promotionPlan={user?.promotion_plan}
                  promotionAccessUntil={user?.promotion_access_until}
                  onMaybeLater={acknowledgeDriverPromo}
                  onViewPlans={() => {
                    acknowledgeDriverPromo();
                    requestAnimationFrame(() => {
                      if (!rootNavigationRef.isReady()) return;
                      rootNavigationRef.dispatch(CommonActions.navigate({ name: 'Profile' }));
                    });
                  }}
                />
              );
            })()
          ) : null}
        </>
      ) : (
        <PublicStack.Navigator screenOptions={{ headerShown: false }}>
          <PublicStack.Screen name="Welcome" component={WelcomeScreen} />
          <PublicStack.Screen
            name="Auth"
            getComponent={() => require('./src/screens/AuthScreen').default}
          />
          <PublicStack.Screen
            name="ForgotPassword"
            getComponent={() => require('./src/screens/ForgotPasswordScreen').default}
          />
          <PublicStack.Screen
            name="ResetPassword"
            getComponent={() => require('./src/screens/ResetPasswordScreen').default}
          />
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

export default function App() {
  const apiConfigErr = getApiMisconfigurationMessage();

  React.useEffect(() => {
    try {
      logMapboxStartupSourceOnce('App mount');
      logMapboxAccessDiagnostics('App mount setAccessToken');
      const token = getMapboxPublicToken();
      if (MapboxGL && token) {
        MapboxGL.setAccessToken(token);
      }
    } catch {
      /* @rnmapbox optional in Expo Go */
    }
  }, []);

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
}
