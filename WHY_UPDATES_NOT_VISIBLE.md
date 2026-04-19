# Why You're Not Seeing the Map/Notifications Updates

## What’s going on

The app is running from your **Desktop** project folder:

- **Terminal cwd:** `~/Desktop/SnapRoad-Beta-Functional-RyanPM 2`
- **Tunnel/dev:** You run `npm run tunnel` (and likely `npm run dev`) from that folder.

All of the recent updates (map integration audit, My Routes notifications, z-index fixes, Route History map, compass, etc.) were made in a **Cursor worktree**, not in that Desktop folder:

- **Where the edits actually are:**  
  `~/.cursor/worktrees/SnapRoad-Beta-Functional-RyanPM_2/iba`

So the code that’s being served (from Desktop) doesn’t include those changes. Same repo, different working copy.

---

## Option A – Run the app from the worktree (fastest way to see the updates)

1. Stop the current dev server and tunnel (if they’re running from Desktop).
2. In a terminal:
   ```bash
   cd ~/.cursor/worktrees/SnapRoad-Beta-Functional-RyanPM_2/iba
   npm run dev
   ```
3. In a second terminal (same machine):
   ```bash
   cd ~/.cursor/worktrees/SnapRoad-Beta-Functional-RyanPM_2/iba
   npm run tunnel
   ```
4. Open the tunnel URL (e.g. from tunnelmole) on your phone. You’ll be running the worktree code, so you should see:
   - Modals above the top/bottom bars (z-index fixes)
   - Route History panel with the 2D map
   - My Routes notifications / leave-early UI when the backend returns them
   - Compass permission banner and custom user heading beam (MapKitMap) when applicable

---

## Option B – Bring the updates into your Desktop project (permanent)

The worktree currently has **uncommitted** changes (e.g. `DriverApp/index.tsx`, `RouteHistory3D.tsx`, `MapKitMap.tsx`, backend `navigation.py`, etc.). To have the same behavior when you run from Desktop:

1. **Commit in the worktree:**
   ```bash
   cd ~/.cursor/worktrees/SnapRoad-Beta-Functional-RyanPM_2/iba
   git checkout -b map-integration-updates   # or use an existing branch
   git add -A
   git commit -m "Map integration: notifications, z-index, Route History map, compass, .env cameras key"
   ```

2. **Merge into your Desktop branch (e.g. RyanPM) and run from Desktop:**
   ```bash
   cd ~/Desktop/SnapRoad-Beta-Functional-RyanPM\ 2
   git fetch
   git merge map-integration-updates   # or the branch you used
   ```
   Resolve any merge conflicts if they appear, then:

   ```bash
   npm run dev
   ```
   In another terminal:
   ```bash
   npm run tunnel
   ```

After that, running from Desktop will show the same updates.

---

## Build note

- **Worktree:** No separate “build” step is required for the Vite dev server; `npm run dev` serves the frontend (port 3000) with hot reload.
- If you use a production build (`npm run build` in `app/frontend`), run it from the **same** directory you use for `npm run dev` / `npm run tunnel` (worktree for Option A, Desktop after merge for Option B) so the build contains the updated code.

---

## Build (why it might fail in the worktree)

- If you run `npm run build` (or `npm run dev`) from the **worktree** without having run `npm install` there first, the build will fail with “Cannot find module 'vite'” because `node_modules` is not present.
- Fix: From the worktree run `cd app/frontend && npm install --legacy-peer-deps` (use `--legacy-peer-deps` if you hit ESLint peer dependency conflicts), then run `npm run build` or `npm run dev` from the **repo root** (`iba`) so both backend and frontend start.
- If you run from **Desktop** after merging (Option B), use your existing `node_modules` and run `npm run dev` / `npm run tunnel` from Desktop as you do now; no extra install needed there.

---

## Quick check that you’re on the right code

- **Worktree:**  
  `grep -n "zIndex: 40" app/frontend/src/pages/DriverApp/index.tsx`  
  should show several matches.
- **Route History map:**  
  `grep -n "routeMapView\|Map" app/frontend/src/pages/DriverApp/components/RouteHistory3D.tsx`  
  should show the 2D map block and `routeMapView`.

If those matches are missing in the folder you’re running from, that folder doesn’t have the updates; use Option A or B above.
