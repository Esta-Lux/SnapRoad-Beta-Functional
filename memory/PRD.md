# SnapRoad - Product Requirements Document

## Product Overview
SnapRoad is a privacy-first, gamified navigation app with three parts:
1. **Driver App** - Mobile/web navigation app with safety scoring, gem rewards, and local offers
2. **Partner Portal** - Business dashboard for managing offers and viewing analytics
3. **Admin Dashboard** - System management, third-party offer imports, and bulk CSV uploads

## Tech Stack
- **Frontend**: React (Vite) web app at `/app/frontend`
- **Backend**: FastAPI at `/app/backend`
- **Mobile App**: React Native (Expo SDK 54) at `/app/snaproad-mobile`
- **Database**: MongoDB (currently using mocked in-memory data)

## Web Frontend Routes
| Route | Component | Description |
|---|---|---|
| `/` | `WelcomePage.tsx` | Landing page |
| `/driver` | `pages/DriverApp/index.tsx` | **Main driver app preview** (phone frame) |
| `/app/*` | `figma-ui/SnapRoadApp.tsx` | Figma design system version |
| `/portal/partner` | `PartnerDashboard.tsx` | Partner portal |
| `/portal/admin*` | `AdminDashboard.tsx` | Admin dashboard |

**IMPORTANT**: The `/driver` route is what users see in Emergent preview. The mobile React Native app has been rewritten to match this UI exactly.

## Mobile App ↔ Web Parity (Completed Feb 22, 2026)
The mobile React Native screens now match the `/driver` web preview:

| Mobile Screen | Web Component | Matching Elements |
|---|---|---|
| `MapScreen.tsx` | `DriverApp/index.tsx` | Search bar, Favorites/Nearby/Report filters, Home/Work locations, green diamond offer markers, Nearby Offers panel |
| `RewardsScreen.tsx` | Rewards tab | Gem balance, Offers/Challenges/Badges/Car Studio sub-tabs, Redeem buttons |
| `ProfileScreen.tsx` | Profile tab | User card, Safety Score/Miles/Badges stats, menu items, Settings section |
| Navigation tabs | Bottom tab bar | Map, Routes, Rewards, Profile |

## Implemented Features

### Offer System
- Business offers with address → pinned on map at location
- Admin third-party offers (Groupon-style) with `offer_url`
- Bulk CSV upload for admin
- In-app browser for third-party links
- Offer redemption with gems + discount
- Auto-push offers on driver's route

### Gems on Route System
- Generate gems along route at navigation start
- Collect by driving over (proximity)
- Summary modal at trip end only (simple, not distracting)

### Key API Endpoints
- `POST /api/auth/login` - Authentication
- `GET /api/offers` - All offers (with address, offer_url)
- `POST /api/offers/{id}/redeem` - Redeem offer
- `GET /api/offers/on-route` - Auto-push offers along route
- `POST /api/admin/offers/bulk` - Admin bulk upload
- `POST /api/gems/generate-route` - Generate gems on route
- `POST /api/gems/collect` - Collect a gem
- `GET /api/gems/trip-summary/{id}` - Trip end gem summary

## Test Credentials
- Driver: `driver@snaproad.com` / `password123`
- Partner Portal: `/portal/partner` (no auth)
- Admin: `/portal/admin` (no auth)

## What's MOCKED
- ALL data is in-memory (resets on restart)
- No real database persistence

## Backlog
- P1: Real MongoDB persistence
- P2: Apple Maps MapKit, fuel price API, push notifications

---
Last Updated: February 22, 2026
