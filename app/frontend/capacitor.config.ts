import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for packaging the web app (including DriverApp) as iOS/Android.
 * Run: npm run build:cap && npx cap sync && npx cap open ios|android
 *
 * For live reload during dev, uncomment the server block and run the app with
 * Vite dev server (npm run dev) so the device points to your machine's URL.
 */
const config: CapacitorConfig = {
  appId: 'com.snaproad.driver',
  appName: 'SnapRoad Driver',
  webDir: 'dist',
  // Optional: uncomment to open app directly on driver screen when using server.url
  // server: {
  //   url: 'http://YOUR_DEV_MACHINE_IP:3000',
  //   cleartext: true
  // },
};

export default config;
