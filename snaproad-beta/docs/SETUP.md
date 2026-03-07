# SnapRoad Development Setup Guide

This guide will help you set up the SnapRoad development environment.

## Prerequisites

### Required Software
- **Node.js** 20+ (for API and Admin)
- **Flutter** 3.16+ (for Mobile)
- **PostgreSQL** 15 (or Supabase account)
- **Redis** (for caching and leaderboards)
- **Git**

### Accounts & API Keys
- **Supabase** - Database and authentication
- **Mapbox** - Maps and navigation
- **AWS** - S3 and Rekognition for image processing
- **Stripe** - Payment processing
- **Firebase** - Push notifications

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/snaproad-beta.git
cd snaproad-beta
```

### 2. API Setup

```bash
cd api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run database migrations (if using local PostgreSQL)
npm run db:migrate

# Start development server
npm run dev
```

API will be running at `http://localhost:3000`

### 3. Admin Panel Setup

```bash
cd admin

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start development server
npm run dev
```

Admin panel will be running at `http://localhost:5173`

### 4. Mobile App Setup

```bash
cd mobile

# Get Flutter dependencies
flutter pub get

# Update configuration in lib/core/config/app_config.dart

# Run on connected device/simulator
flutter run
```

## Environment Variables

### API (.env)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment (development/staging/production) |
| `PORT` | Server port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret for JWT signing |
| `MAPBOX_TOKEN` | Mapbox access token |
| `AWS_REGION` | AWS region |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `S3_BUCKET_INCIDENTS` | S3 bucket for incident photos |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `REDIS_URL` | Redis connection URL |

### Admin (.env)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_MAPBOX_TOKEN` | Mapbox access token |

## Database Setup

### Using Supabase (Recommended)

1. Create a new project at https://supabase.com
2. Go to SQL Editor
3. Run the schema from `/database/schema.sql`
4. (Optional) Run seed data from `/database/seed.sql`

### Using Local PostgreSQL

```bash
# Create database
createdb snaproad_dev

# Enable PostGIS
psql snaproad_dev -c "CREATE EXTENSION postgis;"

# Run migrations
cd api && npm run db:migrate
```

## Common Issues

### Mapbox Token Invalid
Ensure you have a valid Mapbox access token with the Navigation SDK enabled.

### AWS Rekognition Permission Denied
Your AWS IAM user needs `rekognition:DetectFaces` and `rekognition:DetectText` permissions.

### Flutter Build Errors
Run `flutter clean && flutter pub get` to resolve dependency issues.

## Contact

For questions or issues, contact the development team:
- PM: Riyan Ahmed (teams@snaproad.co)
