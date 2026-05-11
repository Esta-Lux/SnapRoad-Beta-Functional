## Sign in with Apple (iOS)

This app uses native Apple authentication (`expo-apple-authentication`) and exchanges Apple ID tokens with Supabase using `signInWithIdToken`. It does not use web OAuth for Apple on iOS and does not require a client-secret JWT flow on device.

### Required app config

- `ios.bundleIdentifier`: `com.snaproad.app`
- `ios.usesAppleSignIn`: `true`
- Expo plugin enabled: `expo-apple-authentication`

### Apple Developer / App Store Connect setup

1. In Apple Developer, enable the **Sign In with Apple** capability for `com.snaproad.app`.
2. In App Store Connect, ensure the app record uses the same bundle identifier and has Sign In with Apple capability enabled.
3. Build with EAS after config changes so entitlements are baked into the native iOS binary.

### Supabase setup

1. Supabase Auth provider **Apple** must be enabled.
2. Apple Services ID / key setup is configured in Supabase dashboard for the same project used by mobile env vars.
3. The mobile app exchanges the Apple `identityToken` directly with:
   - `supabase.auth.signInWithIdToken({ provider: 'apple', token })`
