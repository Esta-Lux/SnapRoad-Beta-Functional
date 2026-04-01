import "dotenv/config";
import type { ExpoConfig, ConfigContext } from "expo/config";

const envAny = (names: string[], fallback = ""): string => {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
  }
  return fallback;
};

const isProductionBuild = (): boolean => {
  const v = (process.env.APP_ENV || process.env.ENVIRONMENT || process.env.NODE_ENV || "").toLowerCase();
  return v === "production";
};

const resolveApiUrl = (): string => {
  const value = envAny(["EXPO_PUBLIC_API_URL", "API_URL"], "http://localhost:8001").trim();
  if (isProductionBuild()) {
    if (!/^https:\/\//i.test(value)) {
      throw new Error("Production builds require EXPO_PUBLIC_API_URL to be HTTPS.");
    }
  }
  return value;
};

const _prod = isProductionBuild();

export default function expoConfig({ config }: ConfigContext): ExpoConfig {
  return {
    ...config,
    name: "SnapRoad",
    slug: "snaproad",
    scheme: "snaproad",
    version: "1.0.0",
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
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "SnapRoad needs your location to show your position on the map and provide turn-by-turn navigation.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Turn-by-turn navigation requires background location to update route guidance when your phone is locked.",
        NSCameraUsageDescription:
          "SnapRoad uses your camera to take photos of road hazards and incidents for community safety reports.",
        NSMicrophoneUsageDescription:
          "SnapRoad uses your microphone for voice commands with the Orion driving assistant.",
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
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
      ...(_prod ? {} : { usesCleartextTraffic: true }),
    } as ExpoConfig["android"],
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-dev-client",
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
        },
      ],
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.snaproad",
          enableGooglePay: true,
        },
      ],
      "expo-location",
      "expo-font",
      "expo-sensors",
      "expo-secure-store",
    ],
    extra: {
      /** Set by EAS during `eas build` -- used at runtime to treat preview/internal builds as non-store. */
      easBuildProfile: process.env.EAS_BUILD_PROFILE || "",
      apiUrl: resolveApiUrl(),
      mapboxPublicToken: envAny(["EXPO_PUBLIC_MAPBOX_TOKEN", "MAPBOX_PUBLIC_TOKEN"]),
      supabaseUrl: envAny(["EXPO_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]),
      supabaseAnonKey: envAny(["EXPO_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]),
      stripePublishableKey: envAny([
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_PUBLISHABLE_KEY",
      ]),
      eas: {
        projectId: "b800018b-79d3-4b8e-bbad-f5d628ee6a60",
      },
    },
  };
}
