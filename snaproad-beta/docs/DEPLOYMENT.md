# SnapRoad Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                           CloudFront CDN                         │
└──────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                           │
┌───────┴───────┐                                    ┌────────┴───────┐
│  Admin Panel   │                                    │   Mobile App   │
│   (S3/React)   │                                    │ (iOS/Android)  │
└────────────────┘                                    └────────────────┘
        │                                                     │
        └───────────────────────────┬───────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │  Application LB     │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │   API Service        │
                    │   (ECS/Fargate)      │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┬──┴───┬──────────────────────┐
        │                       │       │                      │
┌───────┴───────┐     ┌───────┴─────┐ ┌───┴───────┐     ┌───────┴───────┐
│   PostgreSQL   │     │    Redis     │ │    S3      │     │  Rekognition  │
│   (Supabase)   │     │ (ElastiCache)│ │  (Photos)  │     │   (Auto-blur) │
└────────────────┘     └──────────────┘ └────────────┘     └────────────────┘
```

## AWS Deployment

### 1. API Deployment (ECS Fargate)

```bash
# Build Docker image
cd api
docker build -t snaproad-api .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag snaproad-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/snaproad-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/snaproad-api:latest
```

### 2. Admin Panel Deployment (S3 + CloudFront)

```bash
cd admin

# Build production bundle
npm run build

# Sync to S3
aws s3 sync dist/ s3://snaproad-admin-prod --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

### 3. Mobile App Deployment

#### iOS (App Store)
```bash
cd mobile

# Build iOS release
flutter build ios --release

# Archive and upload via Xcode
open ios/Runner.xcworkspace
# Product > Archive > Distribute App
```

#### Android (Play Store)
```bash
cd mobile

# Build Android release
flutter build appbundle --release

# Upload to Play Console
# build/app/outputs/bundle/release/app-release.aab
```

## Environment Configuration

### Production Secrets (AWS Secrets Manager)

Store sensitive configuration in AWS Secrets Manager:

```json
{
  "DATABASE_URL": "postgresql://...",
  "SUPABASE_SERVICE_KEY": "...",
  "JWT_SECRET": "...",
  "MAPBOX_SECRET_TOKEN": "...",
  "AWS_ACCESS_KEY_ID": "...",
  "AWS_SECRET_ACCESS_KEY": "...",
  "STRIPE_SECRET_KEY": "...",
  "STRIPE_WEBHOOK_SECRET": "..."
}
```

## CI/CD Pipeline

See `.github/workflows/` for GitHub Actions configurations:

- `api-deploy.yml` - API deployment on push to main
- `admin-deploy.yml` - Admin panel deployment
- `mobile-build.yml` - Mobile app builds

## Monitoring & Alerting

### Sentry (Error Tracking)
Configure Sentry DSN in environment variables for error tracking.

### CloudWatch (Logs & Metrics)
- API logs: `/aws/ecs/snaproad-api`
- Custom metrics: `SnapRoad/API/*`

### Health Checks
- API: `GET /health`
- Expected response: `{"status":"ok"}`

## Scaling

### API Auto-scaling
Configure ECS service auto-scaling based on:
- CPU utilization > 70%
- Memory utilization > 80%
- Request count per target

### Database Scaling
Supabase handles auto-scaling. For high load:
- Enable connection pooling
- Add read replicas if needed

## Backup Strategy

### Database
- Supabase automatic daily backups
- Point-in-time recovery enabled

### S3 (Incident Photos)
- Enable versioning
- Configure lifecycle rules for old photos

## Security Checklist

- [ ] HTTPS/TLS everywhere
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets in AWS Secrets Manager
- [ ] IAM roles with least privilege
- [ ] Security groups properly configured
- [ ] WAF rules for common attacks
- [ ] Regular security audits
