-- SnapRoad Seed Data
-- For development and testing purposes

-- Insert test users
INSERT INTO users (id, email, full_name, phone, subscription_tier, email_verified) VALUES
('11111111-1111-1111-1111-111111111111', 'test@snaproad.co', 'Test Driver', '+1234567890', 'premium', true),
('22222222-2222-2222-2222-222222222222', 'john@example.com', 'John Smith', '+1234567891', 'free', true),
('33333333-3333-3333-3333-333333333333', 'jane@example.com', 'Jane Doe', '+1234567892', 'family', true),
('44444444-4444-4444-4444-444444444444', 'partner@coffeeshop.com', 'Coffee Shop Owner', '+1234567893', 'free', true),
('55555555-5555-5555-5555-555555555555', 'admin@snaproad.co', 'Admin User', '+1234567894', 'premium', true);

-- Insert test vehicles
INSERT INTO vehicles (id, user_id, make, model, year, fuel_type, is_primary) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Toyota', 'Camry', 2022, 'gas', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Tesla', 'Model 3', 2023, 'electric', false),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Honda', 'Civic', 2021, 'gas', true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Ford', 'Escape', 2023, 'hybrid', true);

-- Insert rewards records
INSERT INTO rewards (user_id, gems_earned, gems_spent, gems_balance, lifetime_gems_earned, current_streak_days, total_trips, total_distance_km, season, season_gems) VALUES
('11111111-1111-1111-1111-111111111111', 1500, 200, 1300, 1500, 15, 45, 1250.5, '2026_q1', 450),
('22222222-2222-2222-2222-222222222222', 500, 50, 450, 500, 5, 20, 450.0, '2026_q1', 150),
('33333333-3333-3333-3333-333333333333', 2000, 500, 1500, 2000, 30, 80, 2100.0, '2026_q1', 600);

-- Insert test business partner
INSERT INTO business_partners (id, user_id, business_name, business_type, contact_email, contact_phone, address, subscription_plan, status) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', 'Downtown Coffee', 'restaurant', 'partner@coffeeshop.com', '+1234567893', '123 Main St, Columbus, OH 43215', 'growth', 'active');

-- Insert test offers
INSERT INTO offers (id, partner_id, title, description, discount_percent, gems_required, category, status) VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '20% Off Any Coffee', 'Get 20% off any coffee drink!', 20, 50, 'food', 'active'),
('00000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Free Pastry with Purchase', 'Free pastry with any drink purchase', NULL, 100, 'food', 'active');

-- Insert admin user
INSERT INTO admin_users (user_id, role, permissions) VALUES
('55555555-5555-5555-5555-555555555555', 'super_admin', '{"all": true}');

-- Insert sample incidents
INSERT INTO incidents (id, user_id, incident_type, description, status, severity) VALUES
('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'hazard', 'Pothole on Main Street', 'approved', 'medium'),
('11111111-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'accident', 'Minor fender bender at intersection', 'approved', 'high'),
('11111111-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'construction', 'Road work ahead, expect delays', 'pending', 'low');
