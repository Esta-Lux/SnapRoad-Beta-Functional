/**
 * Local dev: load `.env` so Metro / `expo start` see EXPO_PUBLIC_* without exporting them in the shell.
 *
 * EAS Build: do not load `.env`. Variables come from Expo → Project → Environment variables
 * (per environment: development / preview / production) plus `eas.json` → `build.<profile>.env`.
 * Important: for any key defined in BOTH `eas.json` and the dashboard, `eas.json` wins — keep
 * secrets and EXPO_PUBLIC_* you want to manage in the dashboard out of `eas.json` unless intentional.
 *
 * Google OAuth: EXPO_PUBLIC_SUPABASE_* must be set for the same EAS environment as the build profile;
 * changing them requires a new native build (not just OTA) so app.config embeds the correct project URL.
 * Supabase → Auth → Redirect URLs: include `snaproad://auth`, `snaproad://**`, and in dev the exact URL from
 * expo-linking (often `exp://.../--/auth` or `exp+snaproad://...`).
 *
 * `EAS_BUILD` is set (non-empty) on EAS Build workers.
 */
if (!process.env.EAS_BUILD) {
  // Load app/mobile/.env regardless of process.cwd() (repo root vs app/mobile).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config({ path: path.join(__dirname, ".env") });
}

/** Single source for marketing + runtime version (keep in sync with OTA `runtimeVersion`). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appPkg = require("./package.json") as { version: string };

const envAny = (names: string[], fallback = ""): string => {
  for (const name of names) {
    // eslint-disable-next-line expo/no-dynamic-env-var
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
  }
  return fallback;
};

/** Default is empty; set EXPO_PUBLIC_MAPBOX_TOKEN / MAPBOX_PUBLIC_TOKEN via .env or EAS env. */
const MAPBOX_PUBLIC_TOKEN_DEFAULT = "";

/**
 * Single pin for @rnmapbox/maps + @badatgil/expo-mapbox-navigation on iOS and Android.
 * The navigation module ships prebuilt iOS xcframeworks compiled against Mapbox Maps **11.11.0**
 * (see upstream README / bundled Package.swift). Newer Maps (e.g. 11.18.x) can dyld-crash vs NavigationCore.
 * **@rnmapbox/maps 10.3.0** targets newer Maps APIs; `patches/@rnmapbox+maps+10.3.0.patch` stubs a few style
 * setters absent in 11.11.0 so iOS compiles while JS keeps the same API surface.
 */
const MAPBOX_MAPS_SDK_VERSION = "11.11.0";

const EAS_PROJECT_ID = "b800018b-79d3-4b8e-bbad-f5d628ee6a60";

const isProductionBuild = (): boolean => {
  const profile = String(process.env.EAS_BUILD_PROFILE || "").toLowerCase();
  if (profile) return profile === "production";
  const v = (process.env.APP_ENV || process.env.ENVIRONMENT || "").toLowerCase();
  if (v) return v === "production";
  return (process.env.NODE_ENV || "").toLowerCase() === "production";
};

/** Default API when env is unset: https://api.snaproad.app — override in .env for local backend. */
const resolveApiUrl = (): string => {
  const value = envAny(["EXPO_PUBLIC_API_URL", "API_URL"], "https://api.snaproad.app").trim();
  if (isProductionBuild()) {
    if (!/^https:\/\//i.test(value)) {
      throw new Error("Production builds require EXPO_PUBLIC_API_URL to be HTTPS.");
    }
  }
  return value;
};

/**
 * Premium IAP Product ID baked into the native bundle. ASC must expose this exact SKU.
 * If env is unset (or still has the deprecated `*.monthly` ID), we fall back so TestFlight/App Store builds
 * resolve the live subscription regardless of stale Expo dashboard / local `.env`.
 */
const APPLE_IAP_PREMIUM_LEGACY_SKU = "com.snaproad.app.premium.monthly";
const APPLE_IAP_PREMIUM_PRODUCT_ID_CANONICAL = "com.snaproad.app.premium.monthly.plan";

function resolveAppleIapPremiumProductId(): string {
  const raw = envAny(["EXPO_PUBLIC_APPLE_IAP_PREMIUM", "APPLE_IAP_PREMIUM_PRODUCT_ID"], "").trim();
  if (!raw || raw === APPLE_IAP_PREMIUM_LEGACY_SKU) return APPLE_IAP_PREMIUM_PRODUCT_ID_CANONICAL;
  return raw;
}

const _prod = isProductionBuild();
const _profile = String(process.env.EAS_BUILD_PROFILE || "").toLowerCase();
const _includeDevClient =
  ["development", "development-simulator", "preview"].includes(_profile) ||
  (!_prod && _profile.length === 0);

function resolveSentryExpoPlugin(): string | [string, Record<string, string>] | null {
  if (
    envAny(["SENTRY_ORG"], "").trim() &&
    envAny(["SENTRY_PROJECT"], "").trim() &&
    envAny(["SENTRY_AUTH_TOKEN"], "").trim()
  ) {
    return [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        organization: envAny(["SENTRY_ORG"]).trim(),
        project: envAny(["SENTRY_PROJECT"]).trim(),
      },
    ];
  }
  return null;
}

export default function expoConfig({ config }: { config: Record<string, unknown> }) {
  const sentryExpoPlugin = resolveSentryExpoPlugin();

  return {
    ...config,
    name: "SnapRoad",
    /** Expo org that owns this project (dashboard: expo.dev/accounts/snaproad/projects/snaproad). */
    owner: "snaproad",
    slug: "snaproad",
    scheme: "snaproad",
    version: appPkg.version,
    // Bare workflow: `policy` runtime versions are invalid; keep in sync with `version` for OTA.
    runtimeVersion: appPkg.version,
    updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
    orientation: "portrait",
    /** Same mark as in-app auth / welcome (`brand-logo.png`); do not swap for generic Expo placeholders. */
    icon: "./assets/brand-logo.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/brand-logo.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0f",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.snaproad.app",
      usesAppleSignIn: true,
      appStoreUrl: "https://apps.apple.com/app/apple-store/id6761516426",
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
        ],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePreciseLocation",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
        ],
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "SnapRoad needs your location to show your position on the map and provide turn-by-turn navigation.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "SnapRoad only uses background location during active turn-by-turn navigation so route guidance can continue when your phone is locked.",
        NSCameraUsageDescription:
          "SnapRoad uses your camera to take photos of road hazards and incidents for community safety reports.",
        NSMicrophoneUsageDescription:
          "SnapRoad uses your microphone for voice commands with the Orion driving assistant.",
        NSSpeechRecognitionUsageDescription:
          "SnapRoad uses speech recognition to understand your voice commands during navigation.",
        UIBackgroundModes: ["audio", "location"],
        ITSAppUsesNonExemptEncryption: false,
        ...(_prod ? {} : {
          NSLocalNetworkUsageDescription:
            "SnapRoad uses your local network to connect to the development server.",
          NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
        }),
      },
    },
    // `usesCleartextTraffic` is honored by Expo prebuild but omitted from ExpoConfig.android types (SDK 54).
    android: {
      package: "com.snaproad.app",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.snaproad.app",
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        backgroundColor: "#0a0a0f",
        foregroundImage: "./assets/brand-logo.png",
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "POST_NOTIFICATIONS",
        "RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO",
      ],
      ...(_prod ? {} : { usesCleartextTraffic: true }),
    },
    web: {
      favicon: "./assets/brand-logo.png",
    },
    plugins: [
      ...(_includeDevClient ? ["expo-dev-client"] : []),
      "expo-updates",
      // Native + EAS source map wiring; set SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN on EAS for uploads.
      ...(sentryExpoPlugin ? [sentryExpoPlugin] : []),
      [
        "expo-build-properties",
        {
          // Static frameworks: required for this app’s CocoaPods graph. `useFrameworks: "dynamic"` breaks linking
          // for `@react-native-voice/voice` (undefined `_OBJC_CLASS_$_RCTEventEmitter` vs React-Core on EAS/Xcode).
          // Matches `expo-mapbox-navigation` iOS setup guidance; Mapbox Maps pods still use dynamic linkage via @rnmapbox/maps hooks.
          ios: { useFrameworks: "static" },
        },
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
          RNMapboxMapsVersion: MAPBOX_MAPS_SDK_VERSION,
        },
      ],
      [
        "@badatgil/expo-mapbox-navigation",
        {
          accessToken: envAny(["EXPO_PUBLIC_MAPBOX_TOKEN", "MAPBOX_PUBLIC_TOKEN"], MAPBOX_PUBLIC_TOKEN_DEFAULT),
          mapboxMapsVersion: MAPBOX_MAPS_SDK_VERSION,
        },
      ],
      // Android Gradle flavor only; iOS needs no plugin props. Valid values: Play Store | Amazon AppStore | both
      ["react-native-iap", { paymentProvider: "Play Store" }],
      [
        "expo-notifications",
        {
          icon: "./assets/brand-logo.png",
          color: "#FF6B2B",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "SnapRoad needs access to your photos to upload road reports and profile pictures.",
          cameraPermission:
            "SnapRoad needs camera access to capture road conditions and incidents.",
        },
      ],
      [
        "@react-native-voice/voice",
        {
          microphonePermission:
            "SnapRoad uses your microphone for voice commands with the Orion driving assistant.",
          speechRecognitionPermission:
            "SnapRoad uses speech recognition to understand your voice commands during navigation.",
        },
      ],
      "expo-location",
      "expo-font",
      "expo-sensors",
      "expo-secure-store",
      "expo-apple-authentication",
      "expo-web-browser",
    ],
    extra: {
      /** Set by EAS during `eas build` -- used at runtime to treat preview/internal builds as non-store. */
      easBuildProfile: process.env.EAS_BUILD_PROFILE || "",
      easProjectId: EAS_PROJECT_ID,
      apiUrl: resolveApiUrl(),
      // Restrict this token in the Mapbox dashboard: iOS/Android bundle com.snaproad.app; web https://app.snaproad.app
      mapboxPublicToken: envAny(
        ["EXPO_PUBLIC_MAPBOX_TOKEN", "MAPBOX_PUBLIC_TOKEN"],
        MAPBOX_PUBLIC_TOKEN_DEFAULT,
      ),
      supabaseUrl: envAny(["EXPO_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]),
      supabaseAnonKey: envAny(["EXPO_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]),
      /** App Store premium subscription Product ID — must match App Store Connect + backend APPLE_IAP_PREMIUM_PRODUCT_ID. */
      appleIapPremiumProductId: resolveAppleIapPremiumProductId(),
      sentryDsn: envAny(["EXPO_PUBLIC_SENTRY_DSN", "SENTRY_DSN"]),
      /** Public switch only; backend owns the private ElevenLabs API key and voice resolution. */
      orionElevenLabsVoiceEnabled:
        envAny(["EXPO_PUBLIC_ORION_ELEVENLABS_VOICE"], "1").trim().toLowerCase() !== "0" &&
        envAny(["EXPO_PUBLIC_ORION_ELEVENLABS_VOICE"], "1").trim().toLowerCase() !== "false" &&
        envAny(["EXPO_PUBLIC_ORION_ELEVENLABS_VOICE"], "1").trim().toLowerCase() !== "off",
      /** Expo dashboard / project page (overridable via EXPO_PUBLIC_EXPO_PROJECT_URL in eas.json). */
      expoProjectUrl: envAny(
        ["EXPO_PUBLIC_EXPO_PROJECT_URL"],
        "https://expo.dev/accounts/snaproad/projects/snaproad",
      ),
      supportEmail: "teams@snaproad.co",
      /** App Store Connect numeric Apple ID (same as eas.json submit.production.ios.ascAppId). */
      iosAppStoreId: "6761516426",
      androidPackage: "com.snaproad.app",
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
  };
}
