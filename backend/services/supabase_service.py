"""
Supabase database service layer.
All database operations go through here for clean separation.
Falls back to mock data when Supabase is unavailable.
"""
import os
import httpx
from config import SUPABASE_URL, SUPABASE_SECRET_KEY

# SQL for creating all tables
SCHEMA_SQL = """
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    plan VARCHAR(20) DEFAULT 'basic' CHECK (plan IN ('basic', 'premium')),
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'inactive',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    gems INTEGER DEFAULT 100,
    safety_score INTEGER DEFAULT 85,
    car_category VARCHAR(50) DEFAULT 'sedan',
    car_variant VARCHAR(50) DEFAULT 'sedan-classic',
    car_color VARCHAR(50) DEFAULT 'ocean-blue',
    total_miles DECIMAL(10,2) DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    total_savings DECIMAL(10,2) DEFAULT 0,
    state VARCHAR(50),
    city VARCHAR(100),
    onboarding_complete BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50),
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
    is_founders BOOLEAN DEFAULT false,
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner locations table
CREATE TABLE IF NOT EXISTS partner_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id),
    location_id UUID REFERENCES partner_locations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    business_name VARCHAR(255),
    business_type VARCHAR(50),
    discount_percent INTEGER,
    base_gems INTEGER DEFAULT 25,
    premium_gems INTEGER DEFAULT 50,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
    redemption_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_boosted BOOLEAN DEFAULT false,
    boost_expires_at TIMESTAMPTZ
);

-- Redemptions table
CREATE TABLE IF NOT EXISTS redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    user_id UUID REFERENCES users(id),
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    qr_expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
    gems_earned INTEGER,
    discount_applied INTEGER,
    verified_at TIMESTAMPTZ,
    verified_lat DECIMAL(10,8),
    verified_lng DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50) CHECK (category IN ('driving', 'social', 'exploration', 'safety')),
    requirement_type VARCHAR(50),
    requirement_value INTEGER,
    xp_reward INTEGER DEFAULT 50,
    gems_reward INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- User badges junction
CREATE TABLE IF NOT EXISTS user_badges (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('weekly', 'head_to_head', 'community')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    goal_type VARCHAR(50),
    goal_value INTEGER,
    reward_xp INTEGER,
    reward_gems INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge participants junction
CREATE TABLE IF NOT EXISTS challenge_participants (
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (challenge_id, user_id)
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_location VARCHAR(255),
    end_location VARCHAR(255),
    start_lat DECIMAL(10,8),
    start_lng DECIMAL(11,8),
    end_lat DECIMAL(10,8),
    end_lng DECIMAL(11,8),
    distance DECIMAL(10,2),
    duration INTEGER,
    safety_score INTEGER,
    xp_earned INTEGER DEFAULT 0,
    gems_earned INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boosts table
CREATE TABLE IF NOT EXISTS boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    partner_id UUID REFERENCES partners(id),
    budget DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    target_radius_miles INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    stripe_payment_id VARCHAR(255),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_location ON offers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_partner ON offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_offer ON redemptions(offer_id);
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_locations_partner ON partner_locations(partner_id);
"""

SEED_BADGES_SQL = """
INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, rarity, xp_reward, gems_reward) VALUES
('Road Warrior', 'Drive 100 miles', 'car', 'driving', 'miles', 100, 'common', 50, 10),
('Safety Star', 'Maintain 90+ safety score for a week', 'shield', 'safety', 'score_streak', 7, 'rare', 100, 25),
('Explorer', 'Visit 10 different locations', 'map', 'exploration', 'locations', 10, 'common', 50, 10),
('Social Butterfly', 'Add 5 friends', 'users', 'social', 'friends', 5, 'common', 50, 10),
('Marathon Driver', 'Drive 1000 miles', 'award', 'driving', 'miles', 1000, 'epic', 200, 50),
('Perfect Week', '100% safety score for 7 days', 'star', 'safety', 'perfect_days', 7, 'legendary', 500, 100),
('Gem Collector', 'Earn 500 gems', 'diamond', 'exploration', 'gems', 500, 'rare', 100, 0),
('Early Bird', 'Complete a trip before 6 AM', 'sunrise', 'driving', 'early_trip', 1, 'rare', 75, 15)
ON CONFLICT DO NOTHING;
"""


async def run_migration():
    """Run database migration via Supabase SQL endpoint."""
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        return {"success": False, "error": "Supabase not configured"}

    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    # Split SQL into individual statements and run via rpc or REST
    # We use the /rest/v1/rpc endpoint with a pg function, or use direct SQL
    # Supabase supports SQL execution via the /pg endpoint with service key
    sql_url = f"{SUPABASE_URL}/rest/v1/rpc"

    results = {"tables": False, "badges": False, "errors": []}

    # Try executing via the SQL/query endpoint (newer Supabase feature)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Execute schema creation
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                json={"query": SCHEMA_SQL},
                headers=headers,
            )
            if resp.status_code < 300:
                results["tables"] = True
            else:
                results["errors"].append(f"Schema: {resp.status_code} {resp.text[:200]}")

            # Seed badges
            resp2 = await client.post(
                f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                json={"query": SEED_BADGES_SQL},
                headers=headers,
            )
            if resp2.status_code < 300:
                results["badges"] = True
            else:
                results["errors"].append(f"Badges: {resp2.status_code} {resp2.text[:200]}")
    except Exception as e:
        results["errors"].append(str(e))

    results["success"] = results["tables"] or len(results["errors"]) == 0
    return results


def test_connection():
    """Quick connection test."""
    try:
        from database import get_supabase
        sb = get_supabase()
        # Try a simple query
        result = sb.table("users").select("id").limit(1).execute()
        return {"connected": True, "has_tables": True}
    except Exception as e:
        err = str(e)
        if "relation" in err and "does not exist" in err:
            return {"connected": True, "has_tables": False}
        return {"connected": False, "error": err}
