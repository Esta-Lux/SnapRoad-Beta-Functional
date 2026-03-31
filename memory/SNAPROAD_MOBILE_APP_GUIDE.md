# SnapRoad Mobile — What It Is and How It Operates

**Last updated:** February 27, 2026

---

## There is no single “snaproad-mobile file”

“Snaproad-mobile” in this repo is **not** one file or one folder. It is the **driver-facing mobile experience** implemented in two different UIs that share the same frontend app:

| What people mean by “snaproad-mobile” | Where it actually lives |
|----------------------------------------|--------------------------|
| Driver app with map, offers, profile, navigation | **DriverApp** at `/driver` |
| Figma-style mobile UI (Welcome, Map, Gems, Profile, etc.) | **SnapRoadApp** at `/app/*` |

Both are **web** (React + Vite + TypeScript). There is no separate React Native or native “snaproad-mobile” codebase in this repo.

---

## 1. Entry points and routes

Defined in **`app/frontend/src/App.tsx`**:

```
/                 → WelcomePage (landing)
/login            → Login
/app/*            → SnapRoadApp   ← “Figma” mobile UI
/driver           → DriverApp     ← Full driver app (map, offers, nav)
/driver/auth      → AuthFlow
/preview          → PhonePreview (iframe of /driver)
/portal/partner   → PartnerDashboard
/portal/admin-*   → AdminDashboard
/dashboard/*      → Legacy admin (Layout + Dashboard, Users, Trips, etc.)
```

So:

- **SnapRoadApp** = everything under **`/app`** (e.g. `/app`, `/app` with internal “screens” via state).
- **DriverApp** = **`/driver`** (and auth at `/driver/auth`).

---

## 2. SnapRoadApp (`/app/*`) — how it operates

### 2.1 What it is

- **File:** `app/frontend/src/components/figma-ui/SnapRoadApp.tsx`
- **Role:** Single React component that acts as a **shell** for three modes: **mobile**, **admin**, **partner**. For “snaproad-mobile” we care about **mobile** mode.
- **Routing:** No URL sub-routes. The “route” is internal React state: `mobileScreen`, `adminPage`, `partnerPage`, and `mode` (`'mobile' | 'admin' | 'partner'`).

### 2.2 How mobile mode works

1. **Mode:** `mode === 'mobile'` shows the mobile app.
2. **Screen state:** `mobileScreen` can be e.g. `'welcome' | 'map' | 'profile' | 'gems' | 'family' | ...`.
3. **Rendering:** `renderMobileContent()` does a `switch (mobileScreen)` and returns one of:
   - Welcome, Login, SignUp
   - **MapScreen** (when `mobileScreen === 'map'`)
   - Profile, Gems, Family, FuelDashboard, TripLogs, Leaderboard, Settings, LiveLocations, DriverAnalytics, etc.
4. **Navigation:** Child screens call `onNavigate(screenName)` to change `mobileScreen` (e.g. from Welcome to Map, or Map to Gems).
5. **Overlays:** Orion Coach and Photo Capture are global overlays; `showOrionCoach` / `showPhotoCapture` control visibility.

So “snaproad-mobile” in the Figma sense = **SnapRoadApp in mobile mode**, with **MapScreen** as the main map screen.

### 2.3 Data and map in SnapRoadApp

- **No backend API** is used inside the `figma-ui` components. Data is **hardcoded or local state** (e.g. `QUICK_LOCATIONS`, `NEARBY_OFFERS` in MapScreen).
- **MapScreen** (`figma-ui/mobile/MapScreen.tsx`): the “map” is a **simulated** UI: grid background + SVG route path + static user marker. It is **not** a real map (no Leaflet, no tiles, no GPS).
- **DriverMapScreen** (`figma-ui/mobile/DriverMapScreen.tsx`): **real** Leaflet/OSM map with markers and polyline, but it is **not** used in SnapRoadApp’s `renderMobileContent()`; only **MapScreen** is used for the map tab.

So today:

- **SnapRoadApp mobile** = design prototype with a **fake** map.
- **DriverApp** = the place that has the **real** map, API, and navigation logic.

---

## 3. DriverApp (`/driver`) — how it operates

### 3.1 What it is

- **File:** `app/frontend/src/pages/DriverApp/index.tsx` (large single component, 3000+ lines).
- **Role:** Full driver experience: map, offers, profile, routes, navigation, car, gems, challenges, etc.

### 3.2 Data flow

1. **On mount:** `loadData()` runs and calls the **backend API** for:
   - locations, routes, offers, badges, skins, family, user profile, challenges, user car, onboarding status
2. **State:** Results are stored in React state (`locations`, `routes`, `offers`, `userData`, `userCar`, `challenges`, etc.).
3. **Location and navigation:**
   - **userLocation:** Currently **mock** (`useState({ lat: 39.9612, lng: -82.9988 })`). No `navigator.geolocation` in DriverApp yet.
   - **isNavigating, navigationData, currentStepIndex:** Drive the turn-by-turn flow.
   - **currentSpeed:** **Simulated** when `isNavigating` (random 55–75 mph every 3s).
   - **carHeading:** **Simulated** when navigating (random delta every 3s).
4. **Map:** The main map is **InteractiveMap** (`app/frontend/src/pages/DriverApp/components/InteractiveMap.tsx`):
   - Uses **Leaflet** with a custom tile layer (no MapKit).
   - Converts lat/lng to pixel for a fixed viewport; draws **car marker** (SVG Car3DMarker or NavArrow3D), **offers**, **route** (if any).
   - Receives `userLocation`, `offers`, `isNavigating`, `userCar`, etc. as props from DriverApp state.

### 3.3 Summary

- **DriverApp** = API-backed, real map, real navigation UI, but **location/speed/heading are mock or simulated**.
- This is the **right place** to plug in real GPS, sensor fusion, and the rest of the driving-intelligence stack.

---

## 4. Where “snaproad-mobile” code lives (reference)

```
app/frontend/src/
├── App.tsx                          # Routes: /app → SnapRoadApp, /driver → DriverApp
├── components/figma-ui/
│   ├── SnapRoadApp.tsx              # Shell for mobile / admin / partner; mobile = “snaproad-mobile” Figma UI
│   ├── index.ts                     # Exports SnapRoadApp + mobile/admin/partner components
│   └── mobile/
│       ├── MapScreen.tsx            # Simulated map (grid + SVG) — used when /app is on “map”
│       ├── DriverMapScreen.tsx      # Real Leaflet map — NOT used in SnapRoadApp currently
│       ├── auth/Welcome.tsx, Login.tsx, SignUp.tsx
│       ├── Profile.tsx, Gems.tsx, Family.tsx, TripLogs.tsx, Leaderboard.tsx, Settings.tsx, ...
│       ├── OrionCoach.tsx, PhotoCapture.tsx
│       └── BottomNav.tsx
└── pages/DriverApp/
    ├── index.tsx                    # Main driver app at /driver (state, API, layout)
    └── components/
        ├── InteractiveMap.tsx       # Real map (Leaflet) + car marker + offers
        ├── Car3D.tsx                # Car color/skin definitions (used elsewhere)
        ├── CollapsibleOffersPanel.tsx, RedemptionPopup.tsx, OrionVoice.tsx, ...
        └── ... (many more)
```

The **memory** doc `SNAPROAD_MOBILE_REFERENCE.md` describes a *target* architecture (e.g. `/app/snaproad-mobile/` with App.tsx, screens, etc.). In this codebase that architecture is **split** between:

- **SnapRoadApp** + **figma-ui/mobile/** ≈ the “mobile” shell and screens.
- **DriverApp** + **DriverApp/components/** ≈ the “driver” app with real map and API.

---

## 5. Implementation advice: driving intelligence in this app

You want to add the driving-intelligence stack (sensor fusion, map matching, prediction, behavior, modes, cognitive load, experience engine, camera, route ribbon, ghost car). Below is concrete advice for doing that **in this repo**.

### 5.1 Put core logic in one place (shared)

- **Do not** duplicate fusion/behavior/experience logic in both SnapRoadApp and DriverApp.
- Add a **shared core** under e.g. `app/frontend/src/core/` (or `lib/navigation/`):
  - **VehicleState** type
  - **Kalman1D** (or small filter module)
  - **SensorFusion** (GPS → VehicleState, optional DeviceMotion)
  - **MapMatching** (snap to route polyline)
  - **PredictionEngine** (predictPosition)
  - **DrivingBehaviorEngine** (aggression, smoothness, hesitation)
  - **CognitiveLoadEngine** (simple or with placeholders)
  - **ExperienceEngine** (zoom, glow, instruction lead time, etc.)
  - **DrivingMode** ('calm' | 'sport' | 'adaptive') and mode rules

- Expose this core via:
  - A **React context** (e.g. `NavigationCoreProvider`) that holds VehicleState, DrivingStyle, CognitiveLoad, ExperienceState, mode, and actions (`setMode`, `startNavigation`), **or**
  - A **Zustand store** (you already use Zustand for auth) that the map and UI read from.

- **Map and UI stay dumb:** They only consume core state (position, zoom, glow, mode) and never implement fusion or behavior logic themselves.

### 5.2 Integrate with DriverApp first

- DriverApp already has the **real** map, navigation state, and API. So:
  1. **Replace mock location/speed/heading** with the shared core:
     - Start `navigator.geolocation.watchPosition` (and optional DeviceMotion) when the user is on the map or starts navigation.
     - Feed positions into the fusion layer; DriverApp (and InteractiveMap) read **VehicleState** from context/store instead of `userLocation` + `currentSpeed` + `carHeading`.
  2. **Use ExperienceEngine output** in one place:
     - A small **CameraDirector** (hook or component) that takes ExperienceState + VehicleState and updates the Leaflet view (center, zoom, bearing) with smoothing. InteractiveMap already receives center/zoom; either it gets them from the core or a parent that reads from the core.
  3. **Mode selector:** Add a way to set Calm / Sport / Adaptive (e.g. in the driver UI or settings). Adaptive can be the default and drive parameters from behavior + cognitive load.

- Keep **SnapRoadApp** unchanged at first, or later:
  - Either switch its map screen from **MapScreen** to **DriverMapScreen** and feed DriverMapScreen from the same core (so both UIs share one navigation core), or
  - Keep SnapRoadApp as a design-only flow and only evolve DriverApp for the full driving-intelligence experience.

### 5.3 Where to put new files (suggested)

```
app/frontend/src/
├── core/                           # NEW: shared driving intelligence
│   ├── types.ts                    # VehicleState, DrivingStyle, ExperienceState, DrivingMode
│   ├── kalman.ts                   # Kalman1D
│   ├── sensorFusion.ts             # GPS (+ optional DeviceMotion) → VehicleState
│   ├── mapMatching.ts              # Snap to route polyline
│   ├── prediction.ts               # predictPosition
│   ├── drivingBehavior.ts          # Aggression, smoothness, hesitation from state history
│   ├── cognitiveLoad.ts            # Load from speed, route, (traffic placeholder)
│   ├── experienceEngine.ts         # computeExperience(mode, load, style, ...)
│   └── index.ts
├── contexts/
│   └── NavigationCoreContext.tsx   # Provider + hook that runs fusion/behavior/experience and exposes state + setMode, startNavigation
└── pages/DriverApp/
    ├── index.tsx                   # Wrap with NavigationCoreProvider; read VehicleState, mode, ExperienceState
    └── components/
        ├── InteractiveMap.tsx       # Take center, zoom, bearing, routeGlow from context; optional ghost car
        └── CameraDirector.tsx      # Optional: component that only updates map view from ExperienceState
```

- **Backend:** No strict need to change backend for Phase 1. Routes and directions already come from the existing API; map matching and prediction run client-side on that polyline.

### 5.4 Order of work (practical)

1. **Phase 1 — Core + DriverApp**
   - Add `core/` with types, Kalman, fusion, prediction.
   - Add NavigationCore context that:
     - Starts GPS (and optionally DeviceMotion) when appropriate.
     - Updates VehicleState and prediction every frame or at a fixed interval.
   - In DriverApp: replace mock `userLocation` and simulated speed/heading with context state. Ensure the map still centers and shows the car.
2. **Phase 2 — Behavior and mode**
   - Add behavior engine (history buffer + aggression/smoothness) and cognitive load (simplified).
   - Add DrivingMode and ExperienceEngine; connect mode to experience parameters (zoom, glow, instruction timing).
   - Add UI for mode (Calm / Sport / Adaptive) and wire `setMode` into the context.
3. **Phase 3 — Experience and camera**
   - Camera director: from ExperienceState + VehicleState, update Leaflet view with smoothing.
   - Route ribbon: thicker line, gradient, optional pulse (CSS or canvas).
4. **Phase 4 — Polish**
   - Ghost car at predicted position; optional 3D car improvements; any traffic/lane APIs if you add them later.

### 5.5 SnapRoadApp (Figma) and “snaproad-mobile”

- **Today:** SnapRoadApp’s “map” is a **mock** (MapScreen). DriverApp is the **real** driver experience.
- **Recommendation:** Treat **DriverApp** as the primary target for driving intelligence. When you want the same behavior in the Figma-style flow:
  - Either use **DriverMapScreen** instead of MapScreen for the `/app` map tab and feed it from the same NavigationCore (one implementation for both UIs), or
  - Keep SnapRoadApp as a design/prototype and only invest in DriverApp for the full stack.

---

## 6. Short answers

| Question | Answer |
|----------|--------|
| What is the “snaproad-mobile file”? | There isn’t one. “Snaproad-mobile” is the driver mobile experience: **SnapRoadApp** at `/app` (Figma UI) and **DriverApp** at `/driver` (full map + API). |
| How does SnapRoadApp operate? | Single component (`SnapRoadApp.tsx`) with internal state for mode (mobile/admin/partner) and screen name. Mobile mode renders one screen at a time (Welcome, Map, Profile, …); Map is currently a **simulated** map (MapScreen), not a real one. No API calls in figma-ui. |
| How does DriverApp operate? | Large page that loads data from the API, keeps everything in React state, and renders InteractiveMap (Leaflet) with mock location and simulated speed/heading. Best place to add real GPS, fusion, and driving intelligence. |
| Where should we implement the driving-intelligence blueprint? | In a **shared core** (e.g. `core/` + NavigationCore context) and integrate **first** into **DriverApp**; optionally reuse the same core in SnapRoadApp later by switching to DriverMapScreen or keeping it design-only. |

For the detailed feasibility and phased plan of each blueprint component (sensor fusion, map matching, prediction, behavior, modes, cognitive load, experience, rendering, ghost car, camera), see **`memory/DRIVING_INTELLIGENCE_IMPLEMENTATION.md`**.
