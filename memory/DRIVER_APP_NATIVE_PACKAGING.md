# Making DriverApp a Native App (Without Huge Changes)

**Last updated:** February 27, 2026

---

## Goal

Ship **DriverApp** as an installable **iOS/Android app** (App Store / Play Store) **without** rewriting it in React Native or another native framework.

---

## Recommended approach: **Capacitor** (minimal change)

**Capacitor** wraps your existing **web app** in a native shell. The same React + Vite + Leaflet code runs inside a native WebView. Users install from the store; the app feels native (splash, icons, fullscreen). You keep one codebase and one UI.

| Aspect | With Capacitor |
|--------|----------------|
| Code changes | **Minimal**: add Capacitor, config, and (optional) base URL for assets |
| DriverApp code | **Unchanged** — same components, same API, same map |
| Build | `npm run build` → `npx cap sync` → open Xcode/Android Studio and run |
| Distribution | Same app in App Store and Play Store (and still works in browser) |

### What stays the same

- All of `DriverApp` (React, Leaflet, state, API calls)
- Backend and API
- Development: you still run `npm run dev` in the browser; no need to run a simulator for day-to-day UI work

### What you add

- A **native project** (iOS + Android) that loads your built web app
- Optional **Capacitor plugins** (e.g. native Geolocation, Status Bar, Splash) for a better app experience
- Config so the built assets load correctly inside the app (e.g. base path)

---

## Alternative (bigger change): React Native

If you want a **fully native** UI (no WebView):

- You’d build a **new** React Native app and reuse only **logic** (API client, state shape, types).
- **UI** would be rewritten with React Native components (`View`, `Text`, `react-native-maps`, etc.).
- That’s a **large** change, not “minimal.”

So for “make DriverApp an app without huge changes,” **Capacitor is the right path.**

---

## Step-by-step: Add Capacitor to the frontend

All commands below are from the **frontend** directory: `app/frontend/`.

### 1. Install Capacitor

```bash
cd app/frontend
npm i @capacitor/core
npm i -D @capacitor/cli
npm i @capacitor/ios @capacitor/android
```

### 2. Initialize Capacitor

```bash
npx cap init "SnapRoad Driver" com.snaproad.driver --web-dir dist
```

- **App name:** e.g. `SnapRoad Driver` (user-facing).
- **App ID:** e.g. `com.snaproad.driver` (must be unique for stores).
- **Web dir:** `dist` (Vite’s default output).

This creates `capacitor.config.ts` (or `.json`) in `app/frontend/`.

### 3. Fix asset loading in the native app (important for Vite)

Vite’s default build uses absolute paths (`/assets/...`). Inside the native app the app is often loaded from `capacitor://localhost` or a file URL, so those paths can break. Use a **relative base** when building for Capacitor:

**Option A — script in `package.json`:**

```json
"scripts": {
  "build": "vite build",
  "build:cap": "vite build --base ./",
  "cap:sync": "npm run build:cap && npx cap sync",
  "cap:ios": "npm run cap:sync && npx cap open ios",
  "cap:android": "npm run cap:sync && npx cap open android"
}
```

Then:

- **Web:** `npm run build` (unchanged).
- **Native:** `npm run build:cap` then `npx cap sync`, or use `npm run cap:sync` (and `cap:ios` / `cap:android` to open the IDE).

**Option B — always relative:** In `vite.config.ts` set `base: './'`. That works for both web and Capacitor if your web app is never deployed to a subpath; if it is, keep base `'/'` for web and use Option A for app builds.

### 4. Add native platforms

```bash
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` inside `app/frontend/`.

### 5. Sync and run

```bash
npm run build:cap
npx cap sync
npx cap open ios
# or
npx cap open android
```

Then run the app from Xcode or Android Studio. The WebView will load your built DriverApp; use your app’s routing (e.g. open `/driver`) or set the start URL in config so it lands on DriverApp.

### 6. (Optional) Start URL for DriverApp

So the app opens directly on the driver experience, set the in-app start URL in Capacitor config. For example in `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snaproad.driver',
  appName: 'SnapRoad Driver',
  webDir: 'dist',
  server: {
    // Optional: open directly on driver app when launched
    url: 'http://localhost:3000/driver',
    cleartext: true
  }
};
```

**Note:** `server.url` is for **live reload** during development (device points to your dev server). For production builds, remove the `server` entry so the app loads from the bundled `dist` files. To make the bundled app start at `/driver`, either:

- Set your web app’s default route to `/driver` when running inside Capacitor (e.g. detect Capacitor and redirect), or  
- Build the app so the default route is `/driver` (e.g. deploy a build that has `/driver` as index).

A simple approach: in your router or `App.tsx`, when the path is `/` and you detect Capacitor (see below), redirect to `/driver`.

### 7. (Optional) Detect “running as app”

So you can change behavior only when the app is running in the native shell (e.g. show fullscreen, use native plugins):

```ts
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();
```

---

## Optional: Capacitor plugins (still minimal change)

- **@capacitor/geolocation** — native GPS (often better than browser in-app).
- **@capacitor/status-bar** — control status bar style.
- **@capacitor/splash-screen** — hide splash when app is ready.

Install only what you need; your existing DriverApp code can keep using the same API (e.g. a small hook that uses Capacitor Geolocation when `isNativeApp` and falls back to `navigator.geolocation` on web).

---

## Summary

| Question | Answer |
|----------|--------|
| How to make DriverApp “an app” without huge changes? | Use **Capacitor**: same web app, wrapped in a native iOS/Android shell. |
| Do we rewrite DriverApp? | **No.** Same React, same Leaflet, same API. |
| What do we add? | Capacitor, config, `dist` → native project, and (for Vite) a build with `base: './'` for the app. |
| What about “real” native (no WebView)? | That’s React Native (or similar): reuse logic only, rewrite UI — **big** change. |

Capacitor is the standard way to turn a web app into a store-ready app with minimal change. The repo can keep one codebase for web and native; only the build and sync steps differ for the app.
