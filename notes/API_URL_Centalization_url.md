# Brian Notes - API URL Centralization
> **Date:** February 2026  
> **Branch:** `brian`  
> **Status:** Completed and pushed

---

## Issue Found

API URLs were hardcoded across 18+ files in `snaproad-mobile` with inconsistent patterns:
- Some screens used `process.env.EXPO_PUBLIC_API_URL` with hardcoded IP fallback
- Others had local `const API_URL = 'http://192.168.x.x:8001'` definitions
- Some included `/api` in the constant, others didn't
- Mixed usage of local IP vs. production URL

This made IP changes error-prone and inconsistent across the app.

---

## Solution Implemented

### 1. Centralized Source of Truth
Created/updated `snaproad-mobile/src/config.ts`:
```typescript
const raw = process.env.EXPO_PUBLIC_API_URL || 'https://feature-stitch.preview.emergentagent.com';
export const API_URL = raw.replace(/\/api\/?$/, '');
```

### 2. Convention Established
- `API_URL` = base domain only (e.g. `http://192.168.x.x:8001`)
- Screens call: `${API_URL}/api/endpoint`
- `api.ts` service: imports as `BASE_URL`, adds `/api` prefix internally
- **Rule:** NEVER define `API_URL` locally — always `import { API_URL } from '../config'`

### 3. Files Refactored (18 total)
All now import from `config.ts`:

**Screens (15):**
- BadgesScreen.tsx
- ChallengesScreen.tsx
- DriverApp.tsx
- EngagementScreen.tsx
- FriendsHubScreen.tsx
- LiveScreen.tsx
- MapScreen.tsx
- OrionCoachScreen.tsx
- PaymentScreen.tsx
- RewardsScreen.tsx
- RoadReportsScreen.tsx
- RouteHistory3DScreen.tsx
- RoutesScreen.tsx
- TripAnalyticsScreen.tsx
- WeeklyRecapScreen.tsx

**Components (2):**
- OrionVoice.tsx
- RedemptionPopup.tsx

**Services (1):**
- api.ts (imports as `BASE_URL`, adds `/api` prefix)

### 4. Environment Variable Updated
`snaproad-mobile/.env` now uses base domain only:
```bash
EXPO_PUBLIC_API_URL=http://192.168.179.237:8001
```

---

## Benefits

1. **Single point of change** for IP updates
2. **Consistent API URL patterns** across all screens
3. **Zero hardcoded IPs** in source code
4. **Clear convention** for future development

---

## Testing

Verified no hardcoded IPs remain:
```bash
grep -r "192.168" snaproad-mobile/src/
# No matches found
```

---

## Impact for Team

- **Future IP changes:** Only edit `.env` file
- **New screens:** Must `import { API_URL } from '../config'`
- **API service:** Already handles `/api` prefix internally

---

*Note created by Brian for PM awareness | February 2026*
