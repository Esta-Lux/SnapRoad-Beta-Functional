# SnapRoad - Privacy-First Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards. The app features an iPhone 16-optimized driver interface inspired by Google Maps' clean design.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) with in-memory mock data
- **Database Schema:** PostgreSQL (documented, not connected)

## Completed Features (Feb 2, 2025)

### Map UI - Google Maps Style
- ✅ **Clean search bar** - rounded pill with hamburger menu and voice icon
- ✅ **Two simple tabs**: Favorites and Nearby
- ✅ **Favorites tab**: Shows Home, Work, and saved places as pill buttons
- ✅ **Nearby tab**: Shows category pills (Gas, Coffee, Shopping, Gym)
- ✅ **Set location prompts**: "Set location" appears if Home/Work not set
- ✅ **+ More button**: Opens add location modal
- ✅ Moveable and collapsible widgets (Score, Gems)
- ✅ Minimal action buttons (Camera, Navigate)

### Backend API (All Working)
- 25+ endpoints for locations, routes, offers, navigation, widgets, etc.

### Other Tabs
- ✅ Offers - Filter by type, redeem for gems
- ✅ Routes - CRUD operations, detailed cards
- ✅ Engagement - Badges, Skins, Challenges, Reports
- ✅ Profile - Overview, Score, Fuel, Settings

## MOCKED DATA
⚠️ All data is currently MOCKED using in-memory storage.

## Upcoming Tasks
1. Connect PostgreSQL database
2. Integrate real map provider (Mapbox)
3. Add authentication (Supabase)
