# Google Maps setup (SnapRoad Driver App)

The Driver App uses Google Maps JavaScript API for the map, directions, and Places search. Custom map styling is optional.

## Required: API key

1. Create or use a Google Cloud project with **Maps JavaScript API**, **Places API**, and **Directions API** enabled.
2. Create an API key (or use an existing one). Restrict it by:
   - **HTTP referrer** (e.g. `https://yourdomain.com/*`, `http://localhost:*`) for the frontend key.
   - **API restrictions**: enable only Maps JavaScript API, Places API, Directions API (and any others you use).
3. **Frontend** (map + Places in browser): set in `.env`:
   - `VITE_GOOGLE_MAPS_API_KEY=<your-key>`  
   - Or reuse: `VITE_GOOGLE_PLACES_API_KEY=<your-key>` (one key for Maps + Places if allowed by quota).
4. **Backend** (Directions proxy and Places proxy): set in backend `.env`:
   - `GOOGLE_PLACES_API_KEY=<your-key>` or `GOOGLE_MAPS_API_KEY=<your-key>`  
   - The Directions route (`GET /api/directions`) and Places routes use this server-side key.

## Optional: Custom map style (Map ID)

To use a custom Cloud-based map style (e.g. SnapRoad branding):

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **Google Maps Platform** → **Map Management** (or **Map Styles**).
2. Click **Create new map** / **Create style**.
3. **Import JSON**: use the style file from the repo:
   - `app/frontend/public/snaproad-map-style.json`  
   - Or paste your own style JSON (array of `featureType` / `elementType` / `stylers` rules).
4. Publish the style and copy the **Map ID** (e.g. `6bbf6b84600029b09c78e318`).
5. In the frontend `.env` set:
   - `VITE_GOOGLE_MAP_ID=<your-map-id>`

If `VITE_GOOGLE_MAP_ID` is not set, the map still works with the default Google map style; the app uses a fallback Map ID or standard styling.

## Env summary

| Variable | Where | Required | Description |
|----------|--------|----------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_PLACES_API_KEY` | Frontend | Yes | Key for Maps JS + Places in the browser |
| `VITE_GOOGLE_MAP_ID` | Frontend | No | Custom map style Map ID from Cloud Console |
| `GOOGLE_PLACES_API_KEY` or `GOOGLE_MAPS_API_KEY` | Backend | Yes (for directions/search) | Key for Directions and Places proxy endpoints |

## Directions quota

Google Directions API is billable. Set quotas and budget alerts in Cloud Console for the project that owns the key used by the backend proxy.

## Sync to another copy (e.g. Desktop deploy)

When copying or merging this app to another folder (e.g. `~/Desktop/SnapRoad-Beta-Functional-RyanPM 2/`), ensure these Google Maps–related files are included:

- **Frontend**: `app/frontend/src/contexts/GoogleMapsContext.tsx`, `app/frontend/src/lib/googleMaps.ts`, `app/frontend/src/pages/DriverApp/components/GoogleMapSnapRoad.tsx`, `app/frontend/src/pages/DriverApp/components/MapSearchBar.tsx`, `app/frontend/src/pages/DriverApp/index.tsx`, `app/frontend/.env.example`, `app/frontend/public/snaproad-map-style.json`
- **Backend**: `app/backend/routes/directions.py`, `app/backend/routes/places.py`, `app/backend/main.py`, `app/backend/.env.example`
- **Docs**: `app/docs/GOOGLE_MAPS_SETUP.md`

Set the env vars (API key, optional Map ID) in the target copy’s `.env` files so the Driver App runs with Google Maps.
