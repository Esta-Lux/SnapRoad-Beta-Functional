# SnapRoad Phase 1 Lean Beta - PRD

## Original Problem Statement
Build the structure and essentials for SnapRoad Phase 1 Lean Beta - a privacy-first navigation app with gamified safety rewards for Ohio pilot launch. 

**Key Requirements:**
- Create Flutter project structure with placeholder files
- Create React Admin Panel with clean dashboard matching website design
- Create PostgreSQL schema files for Supabase setup
- No API connections implemented yet - structure only

## Architecture

### Tech Stack
- **Mobile**: Flutter 3.16+ with Riverpod, GoRouter
- **Admin**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- **API**: Node.js 20 + Express + TypeScript
- **Database**: PostgreSQL 15 with PostGIS (via Supabase)
- **Maps**: Mapbox Navigation SDK
- **Image Processing**: AWS Rekognition + Sharp.js
- **Payments**: Stripe
- **Auth**: Supabase Auth

### Repository Structure
```
snaproad-beta/
├── api/                  # Node.js backend (structure complete)
├── mobile/               # Flutter app (structure complete)
├── admin/                # React admin panel (functional)
├── database/             # PostgreSQL schema
├── shared/               # Shared TypeScript types
├── infrastructure/       # IaC and deployment
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## User Personas

1. **Driver (Primary)**: Daily commuter wanting fuel savings, privacy protection, and rewards
2. **Business Partner**: Local business wanting verified customer redemptions
3. **Admin/Moderator**: SnapRoad team managing incidents, rewards, and partners

## Core Requirements (Static)

### Must Have (P0)
- [x] Real-time navigation with fuel-efficient routing (structure ready)
- [x] Driving behavior tracking and scoring (algorithm implemented)
- [x] Incident reporting with auto-blur privacy protection (pipeline designed)
- [x] Gems reward system with local business redemptions
- [x] Admin panel for moderation and partner management

### Should Have (P1)
- [ ] Mapbox Navigation SDK integration
- [ ] AWS Rekognition auto-blur implementation
- [ ] Stripe subscription flow
- [ ] Push notifications via FCM

### Nice to Have (P2)
- [ ] Family tracking mode (Phase 2)
- [ ] Advanced AI coaching (Phase 2)
- [ ] Multi-region support (Phase 3)

## What's Been Implemented

### January 2026 - Initial Setup
- ✅ Complete monorepo structure created
- ✅ API boilerplate with all routes, controllers, services, validators
- ✅ Admin panel with full UI (Login, Dashboard, Users, Trips, Incidents, Rewards, Partners, Settings)
- ✅ Flutter project structure with feature-based architecture
- ✅ PostgreSQL schema with 15+ tables and PostGIS
- ✅ CI/CD workflows for GitHub Actions
- ✅ Docker Compose for local development
- ✅ Documentation (SETUP.md, API.md, DEPLOYMENT.md)

## Prioritized Backlog

### P0 - Critical Path
1. Configure Supabase and run database migrations
2. Implement Supabase Auth integration
3. Implement Mapbox Navigation SDK in Flutter
4. Implement trip tracking and scoring API
5. Implement incident photo upload with S3

### P1 - High Priority
6. Implement AWS Rekognition auto-blur pipeline
7. Implement Gems earning/spending logic
8. Implement Stripe subscriptions
9. Implement offers redemption flow
10. Add push notifications

### P2 - Medium Priority
11. Implement leaderboard with Redis caching
12. Add real-time trip monitoring in admin
13. Implement partner analytics dashboard
14. Add incident map view with clustering

## Next Tasks List

1. **Supabase Setup**: Create project, run schema.sql
2. **Auth Implementation**: Integrate Supabase Auth in API and mobile
3. **Mapbox Integration**: Add navigation SDK to Flutter app
4. **Trip Tracking**: Implement start/end trip with GPS
5. **Testing**: End-to-end testing of auth and trip flows

## Success Metrics (Phase 1)
- 500+ registered users in Ohio within 4 weeks
- 60%+ users complete at least 5 trips
- 10,000+ total Gems earned
- 200+ incident reports
- 5+ local business partners
- 99%+ uptime, <200ms API response times

## Contact
PM: Riyan Ahmed - teams@snaproad.co
