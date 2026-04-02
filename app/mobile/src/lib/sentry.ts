/**
 * Sentry for SnapRoad mobile (Expo / dev client / EAS).
 * DSN from app.config extra (EXPO_PUBLIC_SENTRY_DSN). No-op when unset.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = (
  (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ||
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  ''
).trim();

// Align with App.tsx: EAS production profile sets APP_ENV=production in eas.json.
const appEnv = String(process.env.APP_ENV || process.env.ENVIRONMENT || process.env.NODE_ENV || '').toLowerCase();
const isProduction = appEnv === 'production';
const easProfile = String((Constants.expoConfig?.extra as { easBuildProfile?: string } | undefined)?.easBuildProfile || '')
  .toLowerCase()
  .trim();
const sentryEnv =
  isProduction && easProfile === 'production'
    ? 'production'
    : easProfile
      ? easProfile
      : __DEV__
        ? 'development'
        : appEnv || 'production';

if (dsn) {
  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: sentryEnv,
    tracesSampleRate: isProduction ? 0.2 : 1,
    enableAutoSessionTracking: true,
  });
}
