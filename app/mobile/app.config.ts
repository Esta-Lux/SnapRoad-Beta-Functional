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

const envAny = (names: string[], fallback = ""): string => {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
  }
  return fallback;
};


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

const _prod = isProductionBuild();
const _profile = String(process.env.EAS_BUILD_PROFILE || "").toLowerCase();
const _includeDevClient =
  ["development", "development-simulator", "preview"].includes(_profile) ||
  (!_prod && _profile.length === 0);

/** Mapbox pk. token: canonical EXPO_PUBLIC_MAPBOX_TOKEN only (embedded into extra.mapboxPublicToken at build time). */
function resolveMapboxPublicTokenForConfig(): string {
  return envAny(["EXPO_PUBLIC_MAPBOX_TOKEN"], "").trim();
}

function resolveSentryExpoPlugin(): string | [string, Record<string, string>] {
  if (envAny(["SENTRY_ORG"], "").trim() && envAny(["SENTRY_PROJECT"], "").trim()) {
    return [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        organization: envAny(["SENTRY_ORG"]).trim(),
        project: envAny(["SENTRY_PROJECT"]).trim(),
      },
    ];
  }
  return "@sentry/react-native/expo";
}

export default function expoConfig({ config }: { config: Record<string, unknown> }) {
  return {
    ...config,
    name: "SnapRoad",
    /** Expo org that owns this project (dashboard: expo.dev/accounts/snaproad/projects/snaproad). */
    owner: "snaproad",
    slug: "snaproad",
    scheme: "snaproad",
    version: "1.0.1",
    // Bare workflow: `policy` runtime versions are invalid; keep in sync with `version` for OTA.
    runtimeVersion: "1.0.1",
    updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0a0a0f",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.snaproad.app",
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
          "Turn-by-turn navigation requires background location to update route guidance when your phone is locked.",
        NSCameraUsageDescription:
          "SnapRoad uses your camera to take photos of road hazards and incidents for community safety reports.",
        NSMicrophoneUsageDescription:
          "SnapRoad uses your microphone for voice commands with the Orion driving assistant.",
        NSSpeechRecognitionUsageDescription:
          "SnapRoad uses speech recognition to turn your voice into text for destination search and hands-free Orion commands while driving.",
        UIBackgroundModes: ["audio", "location", "fetch"],
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
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        backgroundColor: "#0a0a0f",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO",
      ],
      ...(_prod ? {} : { usesCleartextTraffic: true }),
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      ...(_includeDevClient ? ["expo-dev-client"] : []),
      "expo-updates",
      // Native + EAS source map wiring; set SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN on EAS for uploads.
      resolveSentryExpoPlugin(),
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
        },
      ],
      [
        "@badatgil/expo-mapbox-navigation",
        {
          accessToken: resolveMapboxPublicTokenForConfig(),
          mapboxMapsVersion: "11.18.2",
        },
      ],
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.snaproad",
          enableGooglePay: true,
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
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
      "expo-location",
      "expo-font",
      "expo-sensors",
      "expo-secure-store",
      "expo-web-browser",
    ],
    extra: {
      /** Set by EAS during `eas build` -- used at runtime to treat preview/internal builds as non-store. */
      easBuildProfile: process.env.EAS_BUILD_PROFILE || "",
      apiUrl: resolveApiUrl(),
      // Restrict this token in the Mapbox dashboard: iOS/Android bundle com.snaproad.app; web https://app.snaproad.app
      mapboxPublicToken: (() => {
        const t = resolveMapboxPublicTokenForConfig();
        const easProfile = String(process.env.EAS_BUILD_PROFILE || "").toLowerCase();
        const escape = Boolean(envAny(["ALLOW_MISSING_MAPBOX_TOKEN"], "").trim());
        const prodish = easProfile === "production" || _prod;
        const isCiLikePublish = String(process.env.CI || "").trim().length > 0 || process.env.EAS_BUILD;
        if (isCiLikePublish && !t.trim() && prodish && !escape) {
          throw new Error(
            "[app.config] Mapbox public token is empty for a production build/update publish. " +
              "Set EXPO_PUBLIC_MAPBOX_TOKEN in Expo → Environment variables for `production` " +
              "(Plain text or Sensitive; not Secret), and publish OTA with `--environment production`. " +
              "For GitHub Actions OTA, ensure Expo production env has this key, or add repo secret EXPO_PUBLIC_MAPBOX_TOKEN. " +
              "Temporary bypass: ALLOW_MISSING_MAPBOX_TOKEN=1 — not for store.",
          );
        }
        if (isCiLikePublish && !t.trim() && (!prodish || escape)) {
          console.warn(
            "[app.config] Mapbox token empty for CI build/update publish — process continues; set EXPO_PUBLIC_MAPBOX_TOKEN for a working map. " +
              `Profile: ${easProfile || "(unset)"} APP_ENV=${process.env.APP_ENV || "(unset)"}.`,
          );
        }
        return t;
      })(),
      supabaseUrl: envAny(["EXPO_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]),
      supabaseAnonKey: envAny(["EXPO_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]),
      stripePublishableKey: envAny([
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_PUBLISHABLE_KEY",
      ]),
      sentryDsn: envAny(["EXPO_PUBLIC_SENTRY_DSN", "SENTRY_DSN"]),
      /** Expo dashboard / project page (overridable via EXPO_PUBLIC_EXPO_PROJECT_URL in eas.json). */
      expoProjectUrl: envAny(
        ["EXPO_PUBLIC_EXPO_PROJECT_URL"],
        "https://expo.dev/accounts/snaproad/projects/snaproad",
      ),
      supportEmail: "support@snaproad.co",
      iosAppStoreId: "",
      androidPackage: "com.snaproad.app",
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
  };
}
