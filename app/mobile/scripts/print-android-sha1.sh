#!/usr/bin/env bash
# Print SHA-1 / SHA-256 for Google Cloud / Firebase Android client config.
set -euo pipefail

DEBUG_KS="${ANDROID_SDK_HOME:-$HOME}/.android/debug.keystore"
if [[ -f "$DEBUG_KS" ]]; then
  echo "=== Debug keystore (local dev builds) ==="
  echo "Keystore: $DEBUG_KS"
  keytool -list -v -keystore "$DEBUG_KS" -alias androiddebugkey -storepass android -keypass android \
    | grep -E '^(Alias name|SHA1:|SHA256:)' || true
  echo ""
else
  echo "No debug keystore yet at: $DEBUG_KS"
  echo "Create it by running once from app/mobile: npx expo run:android (or any local Android build)."
  echo ""
fi

echo "=== Release / EAS ==="
echo "If you build with EAS, fingerprints come from Expo-managed credentials:"
echo "  cd app/mobile && npx eas-cli credentials -p android"
echo ""
echo "If you use your own release .jks:"
echo "  keytool -list -v -keystore /path/to/release.keystore -alias YOUR_ALIAS"
echo ""
echo "Play Store (what users install): Play Console → App → App integrity → App signing"
