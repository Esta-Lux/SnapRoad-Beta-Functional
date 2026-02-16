# SnapRoad - Privacy-First Gamified Navigation App

## Product Overview
SnapRoad is a privacy-first navigation app with gamified safety rewards.

## Mobile App - EXACT Flutter/Web UI Match

### Design System (Flutter/Web → React Native)
```
Tab Bar Background:  #F8FAFC (WHITE/Light)
Primary Blue:        #3B82F6
Orange (Report):     #F97316  
Purple (Orion):      #8B5CF6
Green (Success):     #22C55E
Background Dark:     #0F172A
Surface:             #1E293B
```

### UI Elements Matched
- ✅ White tab bar with outline icons
- ✅ Blue Favorites button (pill shape)
- ✅ Dark Nearby button (outlined)
- ✅ Orange Report button
- ✅ Home/Work quick location cards
- ✅ Blue gem markers with glow + percentage
- ✅ Green high-value gem marker (18%)
- ✅ Purple Orion voice button
- ✅ Dark camera button
- ✅ Car emoji icon on map

### Screens Implemented
- Map (main navigation)
- Routes (saved routes)
- Rewards (offers, challenges, badges, car studio)
- Profile (stats, settings)

### File Structure
```
/app/snaproad-mobile/
├── App.tsx                    # Entry point
├── src/screens/
│   └── DriverApp.tsx          # Complete app (~800 lines)
└── package.json
```

## Development

### Run Mobile App
```bash
cd /app/snaproad-mobile
yarn install
yarn start
# Scan QR with Expo Go app
```

## Changelog
- **Feb 16, 2026:** Rewrote React Native UI to match Flutter/Web exactly
- **Feb 16, 2026:** Fixed tab bar (white bg), colors, markers, buttons
