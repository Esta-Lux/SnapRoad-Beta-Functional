# SnapRoad Database

This directory contains the PostgreSQL database schema and migrations for SnapRoad.

## Structure

```
database/
├── schema.sql           # Complete database schema
├── seed.sql             # Development seed data
├── migrations/          # Database migrations
│   └── 001_initial_schema.sql
└── README.md
```

## Setup with Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor
3. Run `schema.sql` to create all tables
4. (Optional) Run `seed.sql` for development data

## Tables Overview

### Core Tables
- `users` - User accounts and profiles
- `vehicles` - User vehicles
- `trips` - Trip records with routes
- `trip_events` - Driving events (speeding, hard braking, etc.)

### Incident Reporting
- `incidents` - User-reported incidents
- `incident_photos` - Photos with auto-blur status

### Rewards System
- `rewards` - User rewards balances and stats
- `reward_transactions` - Gems transaction history

### Business Partners
- `business_partners` - Partner businesses
- `offers` - Partner offers/deals
- `offer_redemptions` - Redemption tracking

### Admin
- `admin_users` - Admin access control
- `audit_log` - Admin action logging

## Geospatial Queries

The schema uses PostGIS for location-based queries:

```sql
-- Find incidents within 10km of a point
SELECT * FROM incidents
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-82.9988, 39.9612), 4326)::geography,
  10000  -- 10km in meters
);

-- Find nearby offers
SELECT * FROM active_offers
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-82.9988, 39.9612), 4326)::geography,
  radius_km * 1000
);
```

## Indexes

All tables have appropriate indexes for:
- Foreign key relationships
- Common query patterns
- Geospatial lookups (GIST indexes)
- Time-based filtering
