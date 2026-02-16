/// App configuration constants
/// Replace with your actual values or load from environment
class AppConfig {
  // Supabase
  static const String supabaseUrl = 'https://your-project.supabase.co';
  static const String supabaseAnonKey = 'your-anon-key';

  // API
  static const String apiBaseUrl = 'https://api.snaproad.co/api/v1';

  // Mapbox
  static const String mapboxAccessToken = 'pk.your-mapbox-token';
  static const String mapboxStyleUrl = 'mapbox://styles/mapbox/dark-v11';

  // Stripe
  static const String stripePublishableKey = 'pk_test_your-stripe-key';

  // App Info
  static const String appName = 'SnapRoad';
  static const String appVersion = '1.0.0';

  // Feature flags
  static const bool enableAnalytics = false;
  static const bool enableCrashlytics = false;
}
