# SnapRoad

SnapRoad is a monorepo for the driver mobile app, partner web portal, admin console, and FastAPI backend.

## Apps

- `app/mobile` — Expo / React Native driver app
- `app/frontend` — Vite / React partner + admin web surfaces
- `app/backend` — FastAPI API and integration layer

## Core commands

### Backend

```bash
cd /home/runner/work/SnapRoad-Beta-Functional/SnapRoad-Beta-Functional/app/backend
python3 -m pip install -r requirements.txt pytest pytest-asyncio
python3 -m pytest tests/test_ci_smoke.py tests/unit
```

### Frontend

```bash
cd /home/runner/work/SnapRoad-Beta-Functional/SnapRoad-Beta-Functional/app/frontend
npm ci
npm run lint
npm run test
npm run build
```

### Mobile

```bash
cd /home/runner/work/SnapRoad-Beta-Functional/SnapRoad-Beta-Functional/app/mobile
npm ci
npm test
npx tsc --noEmit
```

## Release docs

- Launch hardening runbook: `app/docs/LAUNCH_READINESS_RUNBOOK.md`
- Architecture and deployment audit: `app/docs/SNAPROAD_ARCHITECTURE_AND_DEPLOYMENT_AUDIT.md`

## Notes

- Mobile EAS builds must use the wrapper scripts backed by `scripts/eas-build-mobile.mjs`.
- Backend runs on port `8001`.
- Public legal pages are served from `/privacy`, `/terms`, and `/community-guidelines` and should be backed by published admin legal documents before launch.
