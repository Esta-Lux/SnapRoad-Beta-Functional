# SnapRoad Mobile - Complete Flutter/Web UI in React Native

## Overview
Complete React Native (Expo) implementation matching the Flutter/Web Driver App UI exactly.

## Screens Implemented

### Onboarding
1. **Plan Selection** - Basic ($0) vs Premium ($10.99/mo with 35% discount)
2. **Car Onboarding** - Vehicle type + color selection

### Main App (4 Tabs)
1. **Map** - Filters, quick locations, gem markers, Orion voice, camera
2. **Routes** - Saved routes list
3. **Rewards** - Offers, Challenges, Badges, Car Studio sub-tabs
4. **Profile** - Overview, Score, Fuel, Settings sub-tabs

## Design System

### Colors (Exact Flutter/Web Match)
```
Tab Bar Background:  #F8FAFC (WHITE)
Primary Blue:        #3B82F6
Orange (Report):     #F97316
Purple (Orion):      #8B5CF6
Amber (Premium):     #F59E0B
Green (Success):     #22C55E
Background Dark:     #0F172A
Surface:             #1E293B
```

### UI Elements
- White bottom tab bar with outline icons
- Blue Favorites button (pill shape)
- Dark Nearby button (outlined)
- Orange Report button
- Blue/green gem markers with glow effect
- Purple Orion voice button
- Car emoji icon on map

## Project Structure
```
/app/snaproad-mobile/
├── App.tsx                         # Entry point
├── src/screens/
│   └── DriverApp.tsx               # Complete app (1,285 lines)
└── package.json
```

## Run the App
```bash
cd /app/snaproad-mobile
yarn install
yarn start
# Scan QR with Expo Go
```

## Changelog
- **Feb 16, 2026:** Complete Flutter/Web UI recreation (1,285 lines)
  - Plan Selection screen
  - Car Onboarding screen  
  - All 4 main tabs with sub-tabs
  - Exact color matching
  - White tab bar
  - All interactive elements
