# Driving Intelligence Platform — Implementation Assessment for SnapRoad Mobile

**Last updated:** February 27, 2026

---

## Stack reality

The blueprint you have is written for **native iOS (Swift) + React Native**:

- **CLLocationManager**, **CMMotionManager**, **MapKit**, **SceneKit**, **Metal**, **RCTBridgeModule**

The current SnapRoad “mobile” app in this repo is **web**:

- **React + Vite + TypeScript**
- **Leaflet + OpenStreetMap** (not MapKit)
- **SVG/CSS** for car and UI (no SceneKit/Metal)
- **Geolocation API** only (no device motion/IMU on most browsers)

So:

- **Full blueprint as-is** → requires a **separate React Native + native iOS** app (or similar native stack).
- **Same concepts on web** → implementable in the **existing** app with a **web-equivalent** architecture.

Below is what can be done **in the current web app**, what’s partially there, and what needs a native app or external services.

---

## 1. Sensor fusion engine

| Aspect | Blueprint (native) | Current app | Feasibility on web |
|--------|--------------------|------------|---------------------|
| GPS | CLLocationManager | Mock lat/lng; optional `navigator.geolocation` | ✅ Use `watchPosition` with `enableHighAccuracy` |
| IMU / motion | CMMotionManager | None | ⚠️ Limited: `DeviceOrientationEvent` / `DeviceMotionEvent` (mobile browsers; not on desktop) |
| Kalman filter | Swift, 4× 1D (lat, lon, speed, heading) | None | ✅ Pure math; implement in TypeScript |

**Implementation (web):**

- **VehicleState** model in TypeScript (same fields: coordinate, velocity, acceleration, heading, turnRate, confidence, timestamp).
- **Kalman1D** class in TS; run one instance each for lat, lon, speed, heading (speed/heading from GPS or derived).
- **Fusion loop:** On each `navigator.geolocation.watchPosition` (and optionally `DeviceMotionEvent` when available), update Kalman filters and emit a single `VehicleState`.
- **Limitation:** No CMMotionManager. On web you get GPS + optional device orientation/motion; fusion is “GPS-first” with optional orientation for heading where supported.

**Verdict:** **High.** Logic is portable; only sensor set is weaker on web.

---

## 2. Map matching

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| Route as polyline | RouteSegment with polyline | Route from API / directions; polyline possible | ✅ |
| Snap to segment | Nearest segment, 30 m, heading penalty | None | ✅ Pure logic |

**Implementation (web):**

- **RouteSegment**: `{ id, polyline: [lat, lng][], heading }`.
- **Snap:** For each GPS update, project to each segment (point-to-segment distance), filter e.g. &lt; 30 m, penalize heading mismatch &gt; 45°, choose minimum weighted score (`distance * 0.7 + headingDiff * 0.3`). No MapKit dependency.
- Use route polyline from existing directions API; run snap in a small **mapMatching** module (TS).

**Verdict:** **High.** No native deps; fits current Leaflet/route flow.

---

## 3. Prediction engine

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| 1–3 s forward position | Physics from VehicleState | None | ✅ Same math |

**Implementation (web):**

- **predictPosition(state, seconds)** in TS: `distance = velocity * seconds`, then offset lat/lng by (distance, bearing: heading). Use standard lat/lng offset (e.g. Haversine or small local projection).
- Call every frame or at fixed dt; smooth with cubic easing in the **Experience** layer.

**Verdict:** **High.** Logic only; no platform dependency.

---

## 4. Driving behavior engine

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| Metrics | Acceleration, brake, steering jerk, speed fluctuation, turn aggressiveness | Simulated speed/heading in DriverApp | ✅ From VehicleState history |
| DrivingStyle (aggression, smoothness, hesitation) | Derived from metrics | None | ✅ |

**Implementation (web):**

- Keep a short **history buffer** of VehicleState (e.g. last 30–60 s at 1–2 Hz).
- Compute: acceleration variance, turn rate variance, “brake intensity” (negative acceleration spikes), speed fluctuation.
- **aggression** = normalized(accelVariance)*0.4 + normalized(turnRateVariance)*0.3 + normalized(brakeIntensity)*0.3, clamped 0–1.
- **smoothness** / **hesitation** from same buffer (e.g. variance of acceleration sign, reaction delays). No native APIs needed.

**Verdict:** **High.** Works with GPS-derived (and optionally device-motion) state.

---

## 5. Modes system (Calm / Sport / Adaptive)

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| Three modes | enum | None | ✅ |
| Mode rules (zoom, glow, camera, instructions, UI) | Per-mode params | Map zoom/UI exist | ✅ |
| Adaptive = f(aggression, smoothness) | Interpolate | None | ✅ |

**Implementation (web):**

- **DrivingMode**: `'adaptive' | 'sport' | 'calm'`.
- **Calm:** e.g. closer zoom, lower route glow, longer camera smoothing, earlier instructions, minimal UI.
- **Sport:** lower zoom, stronger “neon” route, faster camera, late turn alerts, optional sound.
- **Adaptive:** target params = interpolate(calmParams, sportParams, aggression/smoothness); no hard switch; interpolate over time (e.g. `current += (target - current) * 0.08` per frame).

**Verdict:** **High.** Pure app logic; no native deps.

---

## 6. Cognitive load engine

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| Factors | Speed, intersection density, lane complexity, traffic, aggression | None | ⚠️ Partially |
| Formula | Weighted sum → 0–1 | — | ✅ |

**Implementation (web):**

- **speedFactor** from VehicleState.
- **intersectionDensity** / **laneComplexity**: from route geometry (e.g. segment length, turn angles, number of lanes if you have data); otherwise approximate or omit.
- **trafficDensity**: needs a **traffic API** (e.g. TomTom, Google Roads) or omit / mock.
- **load** = speedFactor*0.3 + intersectionDensity*0.2 + laneComplexity*0.2 + trafficDensity*0.2 + aggression*0.1, normalized.

**Verdict:** **Medium.** Logic is easy; traffic and lane data need external APIs or placeholders.

---

## 7. Experience engine

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| Inputs | VehicleState, prediction, DrivingStyle, CognitiveLoad, Mode | — | ✅ From above |
| Output | zoom, pitch, routeGlow, laneHighlight, instructionLeadTime | Zoom/UI exist | ✅ |
| Smoothing | Interpolate 0.08 per frame | — | ✅ requestAnimationFrame or React state |

**Implementation (web):**

- **ExperienceState** type; **computeExperience(...)** returns target zoom, pitch, glow, etc. from mode + aggression + cognitive load (as in your formula).
- Single place that consumes VehicleState, prediction, style, load, mode and outputs **ExperienceState**.
- Render loop or React: `current = current + (target - current) * 0.08` (or similar) so Map/camera/UI read from `current`.

**Verdict:** **High.** Fits current React + Leaflet architecture.

---

## 8. Rendering layer

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| Map | MapKit | Leaflet / OSM | ✅ Already; MapKit only as “renderer” → Leaflet is the renderer |
| 3D car | SceneKit, .usdz | SVG Car3DMarker | ✅ Improve with CSS 3D or Three.js |
| Route ribbon | Metal shader (neon pulse) | Polyline (solid/gradient) | ✅ Canvas/SVG or WebGL |
| Camera | MKMapCamera | Leaflet view (center, zoom, bearing) | ✅ setView / flyTo with smoothed values |

**Implementation (web):**

- **Map:** Keep Leaflet; never put core logic in map code. All logic in NavigationCore/Experience; map only displays.
- **3D car:** Option A: Keep SVG, add rotation from heading and subtle pitch from acceleration. Option B: Three.js + simple .glb car; same transform from VehicleState.
- **Route ribbon:** Option A: Thick polyline with CSS gradient + animation (pulse). Option B: Canvas or small WebGL overlay (triangle strip + fragment “glow” in shader or 2D sim).
- **Camera:** One “camera director” that sets map center, zoom, bearing from ExperienceState each frame with smoothing.

**Verdict:** **High** for map and camera; **medium** for “Metal-grade” neon (achievable but more work on web).

---

## 9. Ghost prediction car

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| Second car at predicted position, opacity = confidence | SceneKit | None | ✅ Same marker, position + opacity |

**Implementation (web):**

- Second marker (or 3D object) at **predictedCoordinate** (from Prediction engine).
- Opacity = **predictionConfidence** (e.g. decay by time); fade in/out with CSS or alpha in render.

**Verdict:** **High.** Simple addition to current map layer.

---

## 10. Camera director

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| altitude = experience.zoom, pitch, heading | MKMapCamera | Leaflet center/zoom/bearing | ✅ |
| Cubic easing, no snap | — | — | ✅ |

**Implementation (web):**

- One module/hook that:
  - Takes **ExperienceState** + **VehicleState** (and maybe predicted position).
  - Targets: center (e.g. vehicle or between vehicle and prediction), zoom = experience.zoom, bearing = heading (smoothed).
  - Leaflet: `map.setView(center, zoom, { bearing })` or equivalent; no “pitch” in standard Leaflet, but you can fake with CSS or use a library that supports tilt.
  - **Easing:** `value += (target - value) * clamp(deltaTime * 3, 0, 1)` (or cubic); update on requestAnimationFrame.

**Verdict:** **High.** Fits Leaflet and React.

---

## 11. React Native bridge (blueprint)

| Aspect | Blueprint | Current app | Feasibility on web |
|--------|-----------|------------|---------------------|
| startNavigation(route), setMode(mode), getDrivingMetrics(), etc. | RCTBridgeModule, native | N/A | N/A for web |

**Implementation (web):**

- No bridge. Expose the same **capabilities** as a **TS API**:
  - `startNavigation(route)`, `setMode(mode)`, `toggleGrayMap(enabled)`, `getDrivingMetrics()` (return DrivingStyle + VehicleState).
  - Implemented by a **NavigationCore** (or similar) TS module + React context/hooks so the map and UI call into one place.

**Verdict:** **High** as “API surface”; no native bridge on web.

---

## 12. Optional enhancements (blueprint)

- **Weather / traffic / HD lane / haptics / spatial audio:** Same as blueprint: external APIs or native features. On web: weather/traffic APIs are feasible; haptics (Vibration API) and spatial audio (Web Audio) are limited but possible. HD lane would be HERE/TomTom/Mapbox.

---

## What cannot be built “purely” on web (summary)

| Item | Reason |
|------|--------|
| CMMotionManager-grade IMU | Browser has no direct access; DeviceMotion is limited and not on desktop. |
| MapKit / SceneKit / Metal | iOS-only; web uses Leaflet + SVG/Canvas/WebGL. |
| Native RCTBridgeModule | App is web, not React Native. |
| HD lane data | Requires HERE/TomTom/Mapbox-style SDK or API. |
| Best-in-class 3D car | SceneKit/.usdz → use Three.js + .glb or keep SVG. |

---

## Recommended architecture (web)

Keep the **same logical layers**, different tech:

```
App (React)
    ↓
NavigationCore (TypeScript)
    ├── SensorFusion       ← GPS + optional DeviceMotion, Kalman, VehicleState
    ├── MapMatching        ← Snap to route polyline
    ├── PredictionEngine  ← predictPosition(state, dt)
    ├── DrivingBehaviorEngine ← aggression, smoothness, hesitation
    ├── CognitiveLoadEngine   ← load from speed, route, (traffic if API)
    ├── ExperienceEngine  ← zoom, pitch, glow, instructionLeadTime from mode + load
    ↓
RenderingLayer
    ├── Leaflet (map only; no logic)
    ├── CameraDirector    ← setView(center, zoom, bearing) from ExperienceState
    ├── Route ribbon      ← Polyline or Canvas/WebGL
    ├── Car marker        ← SVG or Three.js from VehicleState + heading
    └── Ghost car          ← Prediction position + opacity
```

- **Map is only a renderer.** All mode, behavior, cognitive load, and experience logic live in NavigationCore/Experience.
- **Modes:** Implement Calm / Sport / Adaptive and feed their params into ExperienceEngine; no dependency on Leaflet.

---

## Phased implementation plan (in this repo)

### Phase 1 — Foundation (no new deps)

1. **VehicleState + Kalman (TS)**  
   - Add `VehicleState` type and `Kalman1D` in e.g. `app/frontend/src/lib/navigation/` or `app/frontend/src/core/`.
2. **GPS → VehicleState**  
   - Use `navigator.geolocation.watchPosition` (when available); optionally `DeviceMotionEvent` for heading on mobile; update Kalman and emit VehicleState.
3. **Prediction**  
   - `predictPosition(state, seconds)` and optional confidence decay.
4. **Wire DriverApp**  
   - Replace mock `userLocation` with fused VehicleState (with fallback to mock when no geolocation).

### Phase 2 — Behavior and mode

5. **Driving behavior**  
   - State history buffer; compute aggression, smoothness, hesitation; expose as DrivingStyle.
6. **Modes**  
   - `DrivingMode` and mode rules (zoom, glow, instruction timing, UI); **Adaptive** = f(aggression/smoothness), interpolated.
7. **Cognitive load**  
   - Simple version: speed + aggression + (optional) route complexity; add traffic later if you have an API.

### Phase 3 — Experience and camera

8. **ExperienceEngine**  
   - `computeExperience(...)` → ExperienceState; single place that drives all map/UI “feel”.
9. **Camera director**  
   - Reads ExperienceState + VehicleState; updates Leaflet view with smoothing (e.g. 0.08 or cubic); no snap.
10. **Route ribbon**  
    - Thicker polyline, gradient, optional pulse (CSS or Canvas).

### Phase 4 — Polish

11. **Ghost car**  
    - Second marker at predicted position; opacity = confidence.
12. **3D car**  
    - Improve current SVG with heading/acceleration, or add Three.js + .glb.
13. **APIs**  
    - `startNavigation(route)`, `setMode(mode)`, `getDrivingMetrics()` as TS/React API (context or service).

---

## Possibility summary

| Question | Answer |
|----------|--------|
| Can the **full** blueprint (Swift/MapKit/SceneKit/Metal/RN) run in this repo as-is? | **No.** That stack is native iOS + React Native. |
| Can we implement the **same concepts** (sensor fusion, map matching, prediction, behavior, modes, cognitive load, experience, camera, ghost car) in the **current web app**? | **Yes.** With TypeScript, Geolocation API, optional DeviceMotion, Leaflet, and SVG/Canvas/optional Three.js. |
| What’s the main gap? | **IMU quality** (web has no CMMotionManager) and **native 3D/shaders** (replace with web equivalents). |
| What’s the effort? | Phases 1–2: core logic, ~1–2 weeks. Phases 3–4: experience + polish, ~1–2 weeks. Depends on traffic/lane data and 3D choice. |

So: **the possibility of implementing the blueprint’s behavior and architecture in the SnapRoad mobile (web) app is high**, as long as “implementing” means **web-equivalent** (same layers, same logic, different sensors and renderers). The only parts that are not feasible are those that are **inherently native** (MapKit, SceneKit, Metal, RCT native modules); everything else is portable or replaceable on web.

If you want to proceed, the next concrete step is **Phase 1**: add `VehicleState`, `Kalman1D`, and a small fusion loop that feeds the existing DriverApp map from real or mock GPS.
