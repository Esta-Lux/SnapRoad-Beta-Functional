# SnapRoad API (FastAPI)

## Standard dev port: **8001**

This matches:

- `app/frontend` — `VITE_API_URL` / `VITE_BACKEND_URL` and Vite proxy (`vite.config.ts`)
- `app/mobile` — LAN auto-detect (`http://<metro-host>:8001`) and typical localtunnel (`npx localtunnel --port 8001`)
- `run_server.py` and `run.sh`

Always run the API on **8001** unless you have a one-off reason and update every client (frontend `.env`, mobile `extra.apiUrl` / tunnel, etc.).

## Run (Windows, venv)

From `app/backend`:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Or use the repo root script (Unix/macOS venv paths in `package.json`; on Windows you can run `run_server.py` directly if your `python` is the venv):

```powershell
cd C:\dev\SnapRoad-Beta-Functional\app\backend
.\venv\Scripts\python.exe run_server.py
```

## If port 8001 is “in use” (zombie process)

On Windows, find what holds the port:

```powershell
netstat -ano | findstr :8001
```

Note the **PID** in the last column, then end it (Task Manager → Details, or `taskkill /PID <pid> /F`). After that, start uvicorn on 8001 again.

## Health check

Root route should return JSON like:

```json
{"message":"SnapRoad API","docs":"/docs","redoc":"/redoc"}
```

Open `http://localhost:8001/docs` for Swagger.

## Mobile app (Expo) on the same Wi‑Fi

The app resolves the API as `http://<your PC LAN IP>:8001` from Metro (no tunnel required). Run uvicorn with `--host 0.0.0.0` so the phone can reach the PC. Optional tunnel: set `EXPO_PUBLIC_API_URL` in `app/mobile/.env` (see `app/mobile/.env.example`).

## Friend location sharing (Supabase schema checklist)

If Friends shows "Location sharing off" unexpectedly, verify these are present in Supabase:

1. `public.friendships` table (from `sql/004_friend_locations.sql`)
2. `public.live_locations` table (from `sql/004_friend_locations.sql`)
3. Realtime publication includes `public.live_locations`
4. Optional but recommended: `public.live_locations.battery_pct` column (from `sql/021_live_locations_battery.sql`)

Quick checks in Supabase SQL editor:

```sql
select to_regclass('public.friendships') as friendships_table,
       to_regclass('public.live_locations') as live_locations_table;

select exists (
  select 1
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'live_locations'
) as live_locations_in_realtime;

select exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'live_locations'
    and column_name = 'battery_pct'
) as has_battery_pct;
```

Apply missing migrations in order: `004_friend_locations.sql` then `021_live_locations_battery.sql`.
