-- SnapRoad PostgreSQL Database Schema
-- Version: 1.0.0
-- Database: PostgreSQL 15 (Supabase)

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS ====================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  subscription_tier VARCHAR(20) DEFAULT 'free', -- free, premium, family
  subscription_status VARCHAR(20) DEFAULT 'active', -- active, cancelled, past_due
  stripe_customer_id VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_status);

-- ==================== VEHICLES ====================

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  fuel_type VARCHAR(20) NOT NULL, -- gas, diesel, electric, hybrid
  license_plate VARCHAR(20),
  color VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_primary ON vehicles(user_id, is_primary) WHERE is_primary = true;

-- ==================== TRIPS ====================

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  start_location GEOGRAPHY(POINT, 4326),
  end_location GEOGRAPHY(POINT, 4326),
  start_address VARCHAR(500),
  end_address VARCHAR(500),
  distance_km DECIMAL(10, 2),
  duration_minutes INTEGER,
  route_geometry JSONB, -- GeoJSON of actual route taken
  planned_route_geometry JSONB, -- GeoJSON of planned route
  fuel_saved_percent DECIMAL(5, 2),
  fuel_saved_liters DECIMAL(10, 2),
  driving_score INTEGER CHECK (driving_score >= 0 AND driving_score <= 100),
  gems_earned INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_start_time ON trips(start_time);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_user_status ON trips(user_id, status);

-- ==================== TRIP EVENTS ====================

CREATE TABLE trip_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- speeding, hard_brake, rapid_acceleration, phone_usage
  severity VARCHAR(20) NOT NULL, -- low, medium, high
  location GEOGRAPHY(POINT, 4326),
  speed_kmh DECIMAL(5, 2),
  speed_limit_kmh DECIMAL(5, 2),
  acceleration_g DECIMAL(5, 3),
  timestamp TIMESTAMP NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trip_events_trip_id ON trip_events(trip_id);
CREATE INDEX idx_trip_events_type ON trip_events(event_type);
CREATE INDEX idx_trip_events_timestamp ON trip_events(timestamp);

-- ==================== INCIDENTS ====================

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  incident_type VARCHAR(50) NOT NULL, -- accident, hazard, violation, construction, weather, other
  description TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, flagged, expired
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  moderation_notes TEXT,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMP,
  expires_at TIMESTAMP, -- When the incident should be auto-hidden
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incidents_location ON incidents USING GIST(location);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_user_id ON incidents(user_id);

-- ==================== INCIDENT PHOTOS ====================

CREATE TABLE incident_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  original_url VARCHAR(500),
  blurred_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  blur_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  detected_faces INTEGER DEFAULT 0,
  detected_plates INTEGER DEFAULT 0,
  processing_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incident_photos_incident_id ON incident_photos(incident_id);
CREATE INDEX idx_incident_photos_blur_status ON incident_photos(blur_status);

-- ==================== REWARDS ====================

CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  gems_earned INTEGER DEFAULT 0,
  gems_spent INTEGER DEFAULT 0,
  gems_balance INTEGER DEFAULT 0,
  lifetime_gems_earned INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_trip_date DATE,
  average_driving_score DECIMAL(5, 2),
  total_trips INTEGER DEFAULT 0,
  total_distance_km DECIMAL(12, 2) DEFAULT 0,
  season VARCHAR(50), -- 2026_q1, 2026_q2, etc.
  season_gems INTEGER DEFAULT 0,
  season_rank INTEGER,
  last_calculation_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_season ON rewards(season);
CREATE INDEX idx_rewards_balance ON rewards(gems_balance);

-- ==================== REWARD TRANSACTIONS ====================

CREATE TABLE reward_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  transaction_type VARCHAR(20) NOT NULL, -- earned, redeemed, adjusted, expired
  gems_amount INTEGER NOT NULL,
  balance_after INTEGER,
  source VARCHAR(100) NOT NULL, -- trip_score, streak_bonus, offer_redemption, admin_adjustment, referral
  reference_id UUID, -- trip_id, offer_id, etc.
  reference_type VARCHAR(50), -- trip, offer, referral
  notes TEXT,
  created_by UUID REFERENCES users(id), -- For admin adjustments
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reward_transactions_user_id ON reward_transactions(user_id);
CREATE INDEX idx_reward_transactions_type ON reward_transactions(transaction_type);
CREATE INDEX idx_reward_transactions_created_at ON reward_transactions(created_at);

-- ==================== BUSINESS PARTNERS ====================

CREATE TABLE business_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id), -- Account owner
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100), -- restaurant, retail, service, entertainment
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  address VARCHAR(500),
  location GEOGRAPHY(POINT, 4326),
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  subscription_plan VARCHAR(50) DEFAULT 'local', -- local, growth, enterprise
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, cancelled
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  total_redemptions INTEGER DEFAULT 0,
  total_fees_collected DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_business_partners_status ON business_partners(status);
CREATE INDEX idx_business_partners_location ON business_partners USING GIST(location);
CREATE INDEX idx_business_partners_user_id ON business_partners(user_id);

-- ==================== OFFERS ====================

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES business_partners(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  terms_conditions TEXT,
  discount_percent INTEGER,
  discount_amount DECIMAL(10, 2),
  gems_required INTEGER NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  radius_km INTEGER DEFAULT 25, -- Target radius for display
  banner_url VARCHAR(500),
  category VARCHAR(100), -- food, retail, entertainment, services, fuel
  status VARCHAR(20) DEFAULT 'active', -- active, paused, expired, deleted
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  max_redemptions INTEGER, -- NULL = unlimited
  current_redemptions INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_offers_partner_id ON offers(partner_id);
CREATE INDEX idx_offers_location ON offers USING GIST(location);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_category ON offers(category);
CREATE INDEX idx_offers_dates ON offers(start_date, end_date);

-- ==================== OFFER REDEMPTIONS ====================

CREATE TABLE offer_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID REFERENCES offers(id),
  user_id UUID REFERENCES users(id),
  partner_id UUID REFERENCES business_partners(id),
  gems_spent INTEGER NOT NULL,
  platform_fee DECIMAL(10, 2), -- $0.20 per redemption
  redemption_code VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, used, expired, cancelled
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_offer_redemptions_offer_id ON offer_redemptions(offer_id);
CREATE INDEX idx_offer_redemptions_user_id ON offer_redemptions(user_id);
CREATE INDEX idx_offer_redemptions_partner_id ON offer_redemptions(partner_id);
CREATE INDEX idx_offer_redemptions_code ON offer_redemptions(redemption_code);
CREATE INDEX idx_offer_redemptions_status ON offer_redemptions(status);

-- ==================== ADMIN USERS ====================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  role VARCHAR(20) DEFAULT 'moderator', -- moderator, admin, super_admin
  permissions JSONB DEFAULT '{}',
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- ==================== AUDIT LOG ====================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- user, incident, partner, offer, reward
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ==================== PUSH NOTIFICATION TOKENS ====================

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL, -- ios, android, web
  device_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- ==================== FUNCTIONS & TRIGGERS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_partners_updated_at
  BEFORE UPDATE ON business_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update rewards balance
CREATE OR REPLACE FUNCTION update_rewards_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'earned' OR NEW.transaction_type = 'adjusted' THEN
    UPDATE rewards
    SET 
      gems_earned = gems_earned + GREATEST(NEW.gems_amount, 0),
      gems_balance = gems_balance + NEW.gems_amount,
      lifetime_gems_earned = CASE 
        WHEN NEW.gems_amount > 0 THEN lifetime_gems_earned + NEW.gems_amount
        ELSE lifetime_gems_earned
      END
    WHERE user_id = NEW.user_id;
  ELSIF NEW.transaction_type = 'redeemed' THEN
    UPDATE rewards
    SET 
      gems_spent = gems_spent + ABS(NEW.gems_amount),
      gems_balance = gems_balance - ABS(NEW.gems_amount)
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_rewards_balance
  AFTER INSERT ON reward_transactions
  FOR EACH ROW EXECUTE FUNCTION update_rewards_balance();

-- ==================== VIEWS ====================

-- Active offers view
CREATE VIEW active_offers AS
SELECT 
  o.*,
  bp.business_name,
  bp.logo_url as partner_logo
FROM offers o
JOIN business_partners bp ON o.partner_id = bp.id
WHERE o.status = 'active'
  AND bp.status = 'active'
  AND (o.start_date IS NULL OR o.start_date <= NOW())
  AND (o.end_date IS NULL OR o.end_date > NOW())
  AND (o.max_redemptions IS NULL OR o.current_redemptions < o.max_redemptions);

-- User leaderboard view
CREATE VIEW user_leaderboard AS
SELECT 
  u.id,
  u.full_name,
  u.avatar_url,
  r.gems_balance,
  r.season_gems,
  r.average_driving_score,
  r.total_trips,
  r.total_distance_km,
  r.current_streak_days,
  RANK() OVER (ORDER BY r.season_gems DESC) as season_rank
FROM users u
JOIN rewards r ON u.id = r.user_id
WHERE u.subscription_status = 'active'
ORDER BY r.season_gems DESC;
