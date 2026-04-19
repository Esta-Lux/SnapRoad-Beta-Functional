/**
 * Sentry for SnapRoad mobile (Expo / dev client / EAS).
 * Single `Sentry.init` for the process — imported first from `index.ts`.
 * DSN: `extra.sentryDsn` (native manifest) or `EXPO_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` in the JS bundle.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = (
  (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ||
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  process.env.SENTRY_DSN ||
  ''
).trim();

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

const sentryReplayEnabled =
  String(process.env.EXPO_PUBLIC_SENTRY_REPLAY || '').trim() === '1';

if (dsn) {
  try {
    const integrations: NonNullable<Parameters<typeof Sentry.init>[0]>['integrations'] = [
      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    ];
    if (sentryReplayEnabled) {
      integrations.push(Sentry.mobileReplayIntegration());
      integrations.push(Sentry.feedbackIntegration());
    }
    Sentry.init({
      dsn,
      debug: __DEV__,
      environment: sentryEnv,
      tracesSampleRate: isProduction ? 0.2 : 1,
      enableAutoSessionTracking: true,
      sendDefaultPii: !isProduction,
      enableLogs: true,
      replaysSessionSampleRate: sentryReplayEnabled && isProduction ? 0.1 : 0,
      replaysOnErrorSampleRate: sentryReplayEnabled ? 1 : 0,
      integrations,
    });
    if (String(process.env.EXPO_PUBLIC_SENTRY_LOG_TEST || '').trim() === '1') {
      Sentry.logger.info('Sentry logs test', { log_source: 'sentry_test' });
    }
  } catch (e) {
    console.warn('[Sentry] init failed — continuing without error reporting', e);
  }
}
