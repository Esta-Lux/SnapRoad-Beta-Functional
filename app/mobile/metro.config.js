// @sentry/react-native — assigns debug IDs for source maps on EAS builds.
// https://docs.sentry.io/platforms/react-native/manual-setup/expo/
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

module.exports = config;
