# SnapRoad Beta - Monorepo

![SnapRoad Logo](https://customer-assets.emergentagent.com/job_navigate-app-1/artifacts/nn7pu72r_BiggerLogoSR.png)

> **Safe journeys, smart rewards.**

Privacy-first navigation app that rewards drivers. Save $150-200/month through local offers, fuel savings, and insurance discounts.

## Project Structure

```
snaproad-beta/
├── api/                    # Node.js + Express + TypeScript backend
├── mobile/                 # Flutter mobile app (iOS & Android)
├── admin/                  # React + TypeScript admin panel
├── shared/                 # Shared types and configurations
├── infrastructure/         # IaC and deployment configs
├── database/               # PostgreSQL schema and migrations
├── docs/                   # Documentation
└── .github/                # CI/CD workflows
```

## Tech Stack

### Frontend
- **Mobile**: Flutter 3.16+ (iOS & Android)
- **Admin Panel**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Riverpod (Flutter), Zustand (React)

### Backend
- **API**: Node.js 20 + Express + TypeScript
- **Database**: PostgreSQL 15 (Supabase)
- **Real-time**: Supabase Realtime
- **File Storage**: AWS S3
- **Cache**: Redis

### Maps & Navigation
- **Primary**: Mapbox Navigation SDK v2
- **Routing**: Mapbox Directions API
- **Geocoding**: Mapbox Geocoding API

### AI/ML Services
- **Image Processing**: AWS Rekognition
- **Auto-blur**: Custom pipeline (Rekognition + Sharp.js)

### Infrastructure
- **Hosting**: AWS (EC2 + ECS)
- **CDN**: CloudFront
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Push Notifications**: Firebase Cloud Messaging

## Quick Start

See [SETUP.md](docs/SETUP.md) for detailed setup instructions.

### Prerequisites
- Node.js 20+
- Flutter 3.16+
- PostgreSQL 15
- Redis

### Development

```bash
# API
cd api && npm install && npm run dev

# Admin Panel
cd admin && npm install && npm run dev

# Mobile
cd mobile && flutter pub get && flutter run
```

## Phase 1 Features

- ✅ Real-time navigation with fuel-efficient routing
- ✅ Driving behavior tracking and scoring
- ✅ Incident reporting with auto-blur privacy protection
- ✅ Gems reward system with local business redemptions
- ✅ Admin panel for moderation and partner management

## Contact

PM Contact: Riyan Ahmed - teams@snaproad.co

---

**SnapRoad © 2025** - Built by drivers, not advertisers.
