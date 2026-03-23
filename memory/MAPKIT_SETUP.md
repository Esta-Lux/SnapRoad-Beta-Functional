# MapKit JS key setup

The app can issue MapKit JS tokens so the map can use Apple MapKit. The **private key never goes in code or Git**.

## 1. Get the key and IDs from Apple

1. Go to [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list).
2. Create a key (or use an existing one) with **MapKit JS** enabled.
3. Download the **.p8 file** once (you can’t download it again).
4. Note your **Key ID** and **Team ID** (in Membership details).

## 2. Add them to the project (choose one)

### Option A — Use a file (recommended)

1. Put the `.p8` file somewhere safe on your machine (e.g. `~/.mapkit/AuthKey_XXXXXXXXXX.p8` or a folder outside the repo).
2. In the **backend** folder, copy the example env and set the path:

   ```bash
   cd app/backend
   cp .env.example .env
   ```

3. Edit `app/backend/.env` and set:

   ```
   MAPKIT_KEY_ID=YourKeyIdFromApple
   MAPKIT_TEAM_ID=YourTeamIdFromApple
   MAPKIT_PRIVATE_KEY_PATH=/full/path/to/AuthKey_XXXXXXXXXX.p8
   ```

### Option B — Put the key in .env

1. Copy `app/backend/.env.example` to `app/backend/.env`.
2. Set `MAPKIT_KEY_ID` and `MAPKIT_TEAM_ID`.
3. For `MAPKIT_PRIVATE_KEY`, paste the **entire** contents of the .p8 file into one line, using `\n` for each newline, inside double quotes:

   ```
   MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAM...\n-----END PRIVATE KEY-----"
   ```

   (Use your real key; the above is only a pattern.)

## 3. Load .env when running the backend

If you use `python-dotenv`, ensure the backend loads `app/backend/.env` on startup (e.g. in `main.py` or your run script). Then restart the backend so the new env vars are picked up.

## 4. Run backend with .env loaded

Start the backend from `app/backend` so it loads `.env` (main.py loads it automatically). The frontend will request the token from `GET /api/mapkit/token?origin=<your-origin>`.

## 5. Frontend

The Driver app is already wired to use MapKit when the token is available:

- **MapKitProvider** (in App.tsx) tries to load MapKit JS and get a token from the backend on mount.
- If the backend returns a token, **MapKitMap** is shown (Apple MapKit). Otherwise **InteractiveMap** (OSM) is used.
- Set **VITE_BACKEND_URL** (or VITE_API_URL) so the frontend can reach the backend, e.g. in `app/frontend/.env.local`:
  ```
  VITE_BACKEND_URL=http://localhost:8000
  ```
  (Use the port your backend runs on.)

## Security

- **Do not** paste the private key in chat, commit it, or put it in the frontend.
- **Do** add `app/backend/.env` to `.gitignore` (it already is).
- If the key was ever exposed, revoke it in Apple Developer and create a new one.
