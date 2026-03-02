# SnapRoad - Deployment Guide (Portable)
> **Last Updated:** December 2025  
> **Status:** Platform-Independent

---

## Overview

This codebase is now **fully portable** and can run on any server. All platform-specific dependencies have been removed.

---

## Quick Start

### Backend Setup

```bash
cd /app/backend

# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Mobile App Setup

```bash
cd /app/snaproad-mobile

# 1. Install dependencies
yarn install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env to point to your backend

# 3. Start Expo
npx expo start
```

---

## Environment Variables

### Backend (`/app/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | For Orion AI Coach & Photo Analysis |
| `SUPABASE_URL` | Yes* | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Yes* | Supabase service role key |
| `JWT_SECRET` | Yes | JWT signing secret |
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |

*For database, use either Supabase OR MongoDB

### Mobile App (`/app/snaproad-mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend URL (e.g., `http://localhost:8001`) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |

---

## Required Third-Party Services

### 1. OpenAI API (for AI features)
- **Purpose:** Orion AI Coach, Photo Analysis
- **Get key:** https://platform.openai.com/api-keys
- **Cost:** ~$0.001-0.01 per request (gpt-4o-mini)

### 2. Stripe (for payments)
- **Purpose:** Premium subscriptions
- **Get keys:** https://dashboard.stripe.com/apikeys
- **Cost:** 2.9% + $0.30 per transaction

### 3. Supabase (for database)
- **Purpose:** User data, offers, trips
- **Get project:** https://supabase.com
- **Cost:** Free tier available (500MB)

---

## Deployment Options

### Option A: Docker (Recommended)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

```bash
docker build -t snaproad-backend .
docker run -p 8001:8001 --env-file .env snaproad-backend
```

### Option B: Railway/Render/Fly.io

1. Connect your Git repository
2. Set environment variables in dashboard
3. Deploy!

### Option C: VPS (DigitalOcean, Linode, etc.)

```bash
# Install dependencies
apt update && apt install python3-pip nginx

# Clone and setup
git clone your-repo /opt/snaproad
cd /opt/snaproad/backend
pip install -r requirements.txt

# Run with gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001

# Setup nginx reverse proxy
# Setup systemd service for auto-restart
```

---

## Mobile App Deployment

### iOS (TestFlight)

```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

### Android (Play Store)

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

---

## Database Migration

After setting up Supabase:

1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `/app/backend/sql/supabase_migration.sql`
3. Click "Run"

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile App                           │
│  (React Native / Expo)                                   │
│  - iOS, Android, Web                                     │
│  - Connects to: EXPO_PUBLIC_API_URL                      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│                     Backend                              │
│  (FastAPI / Python)                                      │
│  - Port 8001                                             │
│  - 60+ API endpoints                                     │
└───────┬─────────────┬─────────────┬─────────────────────┘
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ OpenAI  │   │ Stripe  │   │Supabase │
   │   API   │   │   API   │   │   DB    │
   └─────────┘   └─────────┘   └─────────┘
```

---

## Troubleshooting

### "OpenAI API key not configured"
- Set `OPENAI_API_KEY` in `/app/backend/.env`
- Restart the backend server

### "Stripe not configured"
- Set `STRIPE_SECRET_KEY` in `/app/backend/.env`
- Set `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in mobile `.env`

### "Network error" in mobile app
- Ensure `EXPO_PUBLIC_API_URL` points to your backend
- Check backend is running and accessible
- For local dev: use your computer's IP, not `localhost`

---

## Cost Estimation (100 users)

| Service | Monthly Cost |
|---------|-------------|
| OpenAI API | ~$5-20 |
| Stripe | 2.9% + $0.30/txn |
| Supabase | $0 (free tier) |
| Hosting | $5-20 (VPS) |
| **Total** | **~$10-40/month** |

---

*Last updated: December 2025*
