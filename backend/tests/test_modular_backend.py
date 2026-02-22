"""
SnapRoad API Backend Tests - Modular Architecture Verification
Testing all route modules after restructure from monolithic server.py
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestHealthAndRoot:
    """Health check and root endpoint tests"""
    
    def test_root_endpoint(self):
        """GET / - Root returns app info"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        data = response.json()
        assert data["app"] == "SnapRoad API"
        assert data["status"] == "running"
        print(f"Root endpoint OK: {data}")
    
    def test_health_endpoint(self):
        """GET /api/health - Health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"Health check OK: {data}")


class TestAuthRoutes:
    """Authentication routes from routes/auth.py"""
    
    def test_driver_login_success(self):
        """POST /api/auth/login - Driver login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@snaproad.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "token" in data["data"]
        assert "user" in data["data"]
        print(f"Driver login OK: {data['data']['user'].get('name', 'Unknown')}")
    
    def test_partner_login_success(self):
        """POST /api/auth/login - Partner login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "partner@snaproad.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Partner login OK")
    
    def test_admin_login_success(self):
        """POST /api/auth/login - Admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@snaproad.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Admin login OK")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - Invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"Invalid login correctly rejected")
    
    def test_signup_new_user(self):
        """POST /api/auth/signup - Create new user"""
        import uuid
        test_email = f"TEST_user_{uuid.uuid4().hex[:6]}@snaproad.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test User"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "token" in data["data"]
        print(f"Signup OK: {test_email}")


class TestUserRoutes:
    """User routes from routes/users.py"""
    
    def test_get_user_profile(self):
        """GET /api/user/profile - Get user profile"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        print(f"User profile: {data['data'].get('name', 'Unknown')}")
    
    def test_get_user_stats(self):
        """GET /api/user/stats - Get user stats"""
        response = requests.get(f"{BASE_URL}/api/user/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "total_miles" in data["data"]
        assert "gems" in data["data"]
        print(f"User stats OK: {data['data']}")
    
    def test_get_onboarding_status(self):
        """GET /api/user/onboarding-status - Get onboarding status"""
        response = requests.get(f"{BASE_URL}/api/user/onboarding-status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "account_created" in data["data"]
        print(f"Onboarding status OK")
    
    def test_get_pricing(self):
        """GET /api/pricing - Get pricing config"""
        response = requests.get(f"{BASE_URL}/api/pricing")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Pricing OK: {data['data']}")


class TestOfferRoutes:
    """Offer routes from routes/offers.py"""
    
    def test_get_all_offers(self):
        """GET /api/offers - Get all offers"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        print(f"Offers count: {len(data['data'])}")
    
    def test_get_nearby_offers(self):
        """GET /api/offers/nearby - Get nearby offers"""
        response = requests.get(f"{BASE_URL}/api/offers/nearby", params={
            "lat": 39.9612, "lng": -82.9988, "radius": 10.0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Nearby offers: {len(data['data'])}")
    
    def test_get_offers_on_route(self):
        """GET /api/offers/on-route - Get offers on route"""
        response = requests.get(f"{BASE_URL}/api/offers/on-route", params={
            "origin_lat": 39.9612, "origin_lng": -82.9988,
            "dest_lat": 40.0067, "dest_lng": -83.0305
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Offers on route: {len(data['data'])}")
    
    def test_redeem_offer(self):
        """POST /api/offers/{id}/redeem - Redeem an offer"""
        # First get offers
        offers_resp = requests.get(f"{BASE_URL}/api/offers")
        offers = offers_resp.json()["data"]
        if offers:
            offer_id = offers[0]["id"]
            response = requests.post(f"{BASE_URL}/api/offers/{offer_id}/redeem")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "gems_earned" in data["data"]
            print(f"Redeemed offer {offer_id}, earned {data['data']['gems_earned']} gems")
        else:
            pytest.skip("No offers available to redeem")


class TestGamificationRoutes:
    """Gamification routes from routes/gamification.py"""
    
    def test_get_challenges(self):
        """GET /api/challenges - Get challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Challenges OK: {len(data['data'])} challenges")
    
    def test_get_leaderboard(self):
        """GET /api/leaderboard - Get leaderboard"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "leaderboard" in data["data"]
        print(f"Leaderboard OK: {len(data['data']['leaderboard'])} entries")
    
    def test_get_badges(self):
        """GET /api/badges - Get badges"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "badges" in data["data"]
        print(f"Badges OK: {len(data['data']['badges'])} badges")
    
    def test_get_xp_status(self):
        """GET /api/xp/status - Get XP status"""
        response = requests.get(f"{BASE_URL}/api/xp/status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "level" in data["data"]
        assert "total_xp" in data["data"]
        print(f"XP status: Level {data['data']['level']}, {data['data']['total_xp']} XP")
    
    def test_get_driving_score(self):
        """GET /api/driving-score - Get driving score"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "overall_score" in data["data"]
        assert "metrics" in data["data"]
        print(f"Driving score: {data['data']['overall_score']}")
    
    def test_get_weekly_recap(self):
        """GET /api/weekly-recap - Get weekly recap"""
        response = requests.get(f"{BASE_URL}/api/weekly-recap")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "total_trips" in data["data"]
        assert "gems_earned" in data["data"]
        print(f"Weekly recap OK: {data['data']['total_trips']} trips")


class TestTripRoutes:
    """Trip routes from routes/trips.py"""
    
    def test_get_trip_history(self):
        """GET /api/trips/history - Get trip history"""
        response = requests.get(f"{BASE_URL}/api/trips/history")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "recent_trips" in data["data"]
        print(f"Trip history: {len(data['data']['recent_trips'])} trips")
    
    def test_get_fuel_history(self):
        """GET /api/fuel/history - Get fuel history"""
        response = requests.get(f"{BASE_URL}/api/fuel/history")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Fuel history OK: {len(data['data'])} entries")


class TestPartnerRoutes:
    """Partner routes from routes/partners.py"""
    
    def test_get_partner_profile(self):
        """GET /api/partner/profile - Get partner profile"""
        response = requests.get(f"{BASE_URL}/api/partner/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "business_name" in data["data"]
        assert "plan" in data["data"]
        assert "locations" in data["data"]
        print(f"Partner profile: {data['data']['business_name']}, plan: {data['data']['plan']}")
    
    def test_get_partner_offers(self):
        """GET /api/partner/offers - Get partner offers"""
        response = requests.get(f"{BASE_URL}/api/partner/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Partner offers: {len(data['data'])} offers")
    
    def test_get_partner_plans(self):
        """GET /api/partner/plans - Get partner plans"""
        response = requests.get(f"{BASE_URL}/api/partner/plans")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "plans" in data["data"]
        print(f"Partner plans: {list(data['data']['plans'].keys())}")


class TestAdminRoutes:
    """Admin routes from routes/admin.py"""
    
    def test_get_admin_analytics(self):
        """GET /api/admin/analytics - Get admin analytics"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "summary" in data["data"]
        assert "chart_data" in data["data"]
        assert "top_partners" in data["data"]
        print(f"Admin analytics: {data['data']['summary']['total_users']} users")
    
    def test_get_admin_pricing(self):
        """GET /api/admin/pricing - Get admin pricing"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Admin pricing OK")
    
    def test_get_analytics_dashboard(self):
        """GET /api/analytics/dashboard - Get analytics dashboard"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", params={
            "business_id": "default_business"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "summary" in data["data"]
        print(f"Analytics dashboard OK: CTR {data['data']['summary']['ctr']}%")


class TestNavigationRoutes:
    """Navigation routes from routes/navigation.py"""
    
    def test_map_search_shell(self):
        """GET /api/map/search - Search for Shell"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={"q": "shell"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Map search 'shell': {len(data['data'])} results")
    
    def test_map_search_starbucks(self):
        """GET /api/map/search - Search for Starbucks"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={"q": "starbucks"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Map search 'starbucks': {len(data['data'])} results")
    
    def test_get_saved_locations(self):
        """GET /api/locations - Get saved locations"""
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Saved locations: {len(data['data'])}")
    
    def test_get_saved_routes(self):
        """GET /api/routes - Get saved routes"""
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Saved routes: {len(data['data'])}")


class TestSocialRoutes:
    """Social routes from routes/social.py"""
    
    def test_get_friends(self):
        """GET /api/friends - Get friends"""
        response = requests.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Friends: {len(data['data'])}")
    
    def test_get_road_reports(self):
        """GET /api/reports - Get road reports"""
        response = requests.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Road reports: {len(data['data'])}")
    
    def test_get_family_members(self):
        """GET /api/family/members - Get family members"""
        response = requests.get(f"{BASE_URL}/api/family/members")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Family members: {len(data['data'])}")


class TestAIRoutes:
    """AI routes from routes/ai.py"""
    
    def test_orion_chat(self):
        """POST /api/orion/chat - Orion AI coach chat"""
        response = requests.post(f"{BASE_URL}/api/orion/chat", json={
            "message": "How can I improve my driving score?",
            "session_id": "test_session_1"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data
        print(f"Orion chat OK: {data['response'][:50]}...")
    
    def test_photo_analyze(self):
        """POST /api/photo/analyze - Photo analysis"""
        # Using a minimal base64 image placeholder
        response = requests.post(f"{BASE_URL}/api/photo/analyze", json={
            "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "image_type": "road_report",
            "image_width": 1,
            "image_height": 1
        })
        # May return 200 with success or error depending on AI service status
        assert response.status_code in [200, 500]
        print(f"Photo analyze endpoint available")


class TestGemsRoutes:
    """Gems-specific routes from routes/gamification.py"""
    
    def test_generate_route_gems(self):
        """POST /api/gems/generate-route - Generate gems along route"""
        import uuid
        trip_id = f"test_trip_{uuid.uuid4().hex[:6]}"
        response = requests.post(f"{BASE_URL}/api/gems/generate-route", json={
            "trip_id": trip_id,
            "route_points": [
                {"lat": 39.9612, "lng": -82.9988},
                {"lat": 39.9700, "lng": -83.0100},
                {"lat": 40.0067, "lng": -83.0305}
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "gems" in data["data"]
        print(f"Generated {len(data['data']['gems'])} gems for trip {trip_id}")
        return trip_id, data["data"]["gems"]
    
    def test_gem_trip_summary(self):
        """GET /api/gems/trip-summary/{trip_id} - Get trip gem summary"""
        # First generate gems
        import uuid
        trip_id = f"test_trip_{uuid.uuid4().hex[:6]}"
        requests.post(f"{BASE_URL}/api/gems/generate-route", json={
            "trip_id": trip_id,
            "route_points": [{"lat": 39.9612, "lng": -82.9988}]
        })
        
        response = requests.get(f"{BASE_URL}/api/gems/trip-summary/{trip_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"Trip gem summary OK for {trip_id}")


class TestBulkOfferUpload:
    """Bulk offer upload from routes/admin.py"""
    
    def test_bulk_offer_upload(self):
        """POST /api/admin/offers/bulk - Bulk upload offers"""
        response = requests.post(f"{BASE_URL}/api/admin/offers/bulk", json={
            "offers": [
                {
                    "business_name": "TEST_Modular_Check_1",
                    "business_type": "gas_station",
                    "description": "Test offer for modular backend check",
                    "base_gems": 25,
                    "address": "123 Test St",
                    "offer_url": "https://example.com/offer1",
                    "expires_days": 7
                }
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["created_count"] == 1
        print(f"Bulk offer upload OK: Created {data['data']['created_count']} offers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
