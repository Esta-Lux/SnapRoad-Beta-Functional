# SnapRoad -- AI Agent Guidelines

Read this file before making ANY changes. These rules prevent known breakage.

## Project Structure

```
app/
  backend/    -- FastAPI (Python 3, port 8001)
  frontend/   -- React + Vite (web, port 3000)
  mobile/     -- Expo / React Native (iOS + Android)
```

## Mobile App -- Critical Rules

### Dependency Versions (do NOT assume newer APIs)

| Package | Version | Notes |
|---------|---------|-------|
| react-native-reanimated | 4.1.1 | v4 removed several v3 APIs |
| react-native-gesture-handler | ~2.28 | Uses Gesture API v2 |
| @rnmapbox/maps | ^10.3 | MarkerView available |
| expo | ~54.0 | SDK 54 |
| react-native | 0.81.5 | |
| react | 19.1.0 | |

### Reanimated v4 -- Removed APIs

These functions DO NOT EXIST in Reanimated v4. Using them crashes the app:

- `useAnimatedGestureHandler` -- REMOVED. Use `Gesture.Pan()` from `react-native-gesture-handler` with `GestureDetector` instead.
- `useAnimatedScrollHandler` -- REMOVED. Use `useAnimatedRef` + `useScrollViewOffset` or Gesture-based scroll.

Correct pattern for pan gestures:

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const translateY = useSharedValue(0);

const pan = Gesture.Pan()
  .onUpdate((e) => { translateY.value = e.translationY; })
  .onEnd((e) => { translateY.value = withSpring(0); });

<GestureDetector gesture={pan}>
  <Animated.View style={animStyle} />
</GestureDetector>
```

### expo-blur -- NOT INSTALLED

`expo-blur` was removed from this project. Do NOT import `BlurView` from `expo-blur`. Use semi-transparent `View` backgrounds instead.

### Mapbox Markers & POI icons

**User-facing POIs** (traffic cameras, speed cameras, offers, destinations, etc.) must read as **real icons**, not anonymous colored dots:
- Prefer `MapboxGL.MarkerView` with **Ionicons / custom `View` stacks** (rounded tile, border, shadow) so the marker is clearly a camera, speedometer, diamond, etc.
- Do **not** ship POIs that are only `CircleLayer` filled disks with no iconography — that fails the product bar for “readable 3D-style” map UI.

`MapboxGL.PointAnnotation` is still avoided for custom views — it rasterizes children and looks soft; use `MarkerView` instead.

### Mapbox SymbolLayer -- VERY LIMITED on native

On native Mapbox, SymbolLayer has severe limitations:
- Emoji in `textField` does NOT render (native text engine doesn't support system emoji)
- `nativeAssetImages` sprite icons (`marker-15`, `circle-15`) render tiny and `iconColor` tinting does NOT work (sprites are not SDF)
- Plain **ASCII** text in `textField` CAN work for small route chevrons / turn hints when MarkerView is too heavy — never rely on emoji

**Line-on-map geometry** (route halo, heatmaps, less important backdrops) may still use `LineLayer` / `CircleLayer` as needed — this rule targets **discrete POI markers**, not the route polyline.

**Incident heatmap (`IncidentHeatmap`)** — Do not replace it with clustered icon `MarkerView`s unless the product explicitly asks for that pass. Heatmaps vs clustered markers trade off density legibility, GPU cost, tap targets, and data/API patterns; treat a switch as its own scoped task.

Do NOT use `iconImage`, `nativeAssetImages`, or emoji `textField` for POI markers.

### Safe Area

All screens must use `useSafeAreaInsets()` or `SafeAreaView` for:
- Top padding (Dynamic Island / notch)
- Bottom padding (home indicator)

Never hardcode `paddingTop: 90` or `paddingBottom: 44`. Always use `insets.top + offset` / `insets.bottom + offset`.

### Modal Component

The common `Modal` at `src/components/common/Modal.tsx` already handles:
- Safe area bottom inset
- Reanimated spring slide-up animation
- Backdrop dismiss

Use it instead of raw RN `Modal` with inline styles.

## Backend -- Critical Rules

### API Port

Backend always runs on port **8001**. Do not change this without updating:
- `app/frontend/vite.config.ts` (proxy)
- `app/mobile/.env` (EXPO_PUBLIC_API_URL)
- `app/mobile/src/api/client.ts` (fallback)

### Places API

`app/backend/routes/places.py` uses:
- Persistent `httpx.AsyncClient` with connection pooling (do not create per-request clients)
- 60-second TTL in-memory cache for autocomplete and details
- Default nearby search radius is 50m

### Family Routes

Family features are **Coming Soon**. The `routes/family.py` returns 503 stubs. Do not re-implement family CRUD without explicit instruction.

## General Rules

- Do NOT install `expo-blur` or any package that requires native modules unless building with EAS
- Do NOT use deprecated APIs from older library versions
- Always check the terminal logs for runtime errors after making changes
- Run `ReadLints` on every file you edit before considering it done
- When editing `MapScreen.tsx`, respect the z-index hierarchy:
  - Turn card / ETA: 25
  - Report / confirm cards: 20
  - Top bar (search): 15
  - FABs (Orion, layers, recenter): 12
  - Mode pills / offers / ambient: 10
  - Sheets / overlays: 50
  - Trip summary: 100
