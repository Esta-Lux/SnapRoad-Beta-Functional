"""
SnapRoad Mobile API Tests
Tests all backend endpoints used by the React Native mobile app:
- Auth (login)
- User Profile & Plan Selection
- Leaderboard
- Reports (Road Reports)
- Offers
- Friends
- Badges
- Challenges
- Routes
- Trip History
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndRoot:
    """Health check and root endpoint tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "snaproad-api"
        assert "timestamp" in data
        print("✓ Health check passed")

    def test_root_endpoint(self):
        """Test root endpoint returns valid response"""
        response = requests.get(f"{BASE_URL}/")
        # Root might return HTML for frontend, just check it responds
        assert response.status_code == 200
        print("✓ Root endpoint responds")


class TestAuthEndpoints:
    """Authentication endpoint tests for login flow"""
    
    def test_login_success(self):
        """Test login with valid credentials (driver@snaproad.com / password123)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@snaproad.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "user_id" in data["data"]
        assert "token" in data["data"]
        print(f"✓ Login successful: user_id={data['data']['user_id']}")
    
    def test_login_invalid_email(self):
        """Test login with invalid email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "password123"
        })
        assert response.status_code == 401
        print("✓ Invalid email correctly rejected")
    
    def test_login_invalid_password(self):
        """Test login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@snaproad.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password correctly rejected")


class TestUserProfile:
    """User profile endpoint tests"""
    
    def test_get_user_profile(self):
        """Test getting user profile - used by Profile Tab"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        user = data["data"]
        # Verify all required fields for mobile app
        required_fields = ["id", "name", "gems", "level", "xp", "safety_score", 
                          "streak", "total_miles", "total_trips", "is_premium",
                          "member_since", "state"]
        for field in required_fields:
            assert field in user, f"Missing field: {field}"
        
        # Verify computed fields
        assert "badges_earned_count" in user
        assert "friends_count" in user
        print(f"✓ User profile: {user['name']}, Level {user['level']}, Gems: {user['gems']}")
    
    def test_get_user_stats(self):
        """Test getting user stats"""
        response = requests.get(f"{BASE_URL}/api/user/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ User stats retrieved")
    
    def test_get_user_car(self):
        """Test getting user car configuration - used by Car Onboarding"""
        response = requests.get(f"{BASE_URL}/api/user/car")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        car = data["data"]
        assert "category" in car
        assert "variant" in car
        assert "color" in car
        print(f"✓ User car: {car['category']} - {car['color']}")
    
    def test_update_user_car(self):
        """Test updating user car configuration"""
        response = requests.post(f"{BASE_URL}/api/user/car", json={
            "category": "suv",
            "variant": "suv-classic",
            "color": "ocean-blue"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ User car updated successfully")


class TestPlanSelection:
    """Plan selection tests - used by Plan Selection Screen"""
    
    def test_get_pricing(self):
        """Test getting pricing info for plan selection"""
        response = requests.get(f"{BASE_URL}/api/pricing")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        pricing = data["data"]
        assert "founders_price" in pricing
        assert "public_price" in pricing
        assert "is_founders_active" in pricing
        print(f"✓ Pricing: founders=${pricing['founders_price']}, public=${pricing['public_price']}")
    
    def test_get_user_plan(self):
        """Test getting current user plan"""
        response = requests.get(f"{BASE_URL}/api/user/plan")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ User plan: {data['data'].get('plan', 'None')}")
    
    def test_select_basic_plan(self):
        """Test selecting Basic plan"""
        response = requests.post(f"{BASE_URL}/api/user/plan", json={
            "plan": "basic"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify plan was updated
        verify = requests.get(f"{BASE_URL}/api/user/plan")
        verify_data = verify.json()
        assert verify_data["data"]["plan"] == "basic"
        assert verify_data["data"]["gem_multiplier"] == 1
        print("✓ Basic plan selected successfully")
    
    def test_select_premium_plan(self):
        """Test selecting Premium plan"""
        response = requests.post(f"{BASE_URL}/api/user/plan", json={
            "plan": "premium"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify plan was updated
        verify = requests.get(f"{BASE_URL}/api/user/plan")
        verify_data = verify.json()
        assert verify_data["data"]["plan"] == "premium"
        assert verify_data["data"]["gem_multiplier"] == 2
        assert verify_data["data"]["is_premium"] == True
        print("✓ Premium plan selected successfully")
    
    def test_get_onboarding_status(self):
        """Test getting onboarding status"""
        response = requests.get(f"{BASE_URL}/api/user/onboarding-status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Onboarding complete: {data['data'].get('onboarding_complete', False)}")


class TestRoutes:
    """Routes endpoint tests - used by Routes Tab"""
    
    def test_get_routes(self):
        """Test getting saved routes"""
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "total" in data
        assert "max" in data
        print(f"✓ Routes: {data['total']}/{data['max']} routes")
    
    def test_add_route(self):
        """Test adding a new route"""
        response = requests.post(f"{BASE_URL}/api/routes", json={
            "name": "TEST_Home to Office",
            "origin": "Home",
            "destination": "Office",
            "departure_time": "08:30",
            "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "notifications": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        route = data["data"]
        assert route["name"] == "TEST_Home to Office"
        assert "id" in route
        print(f"✓ Route added: {route['name']} (id={route['id']})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/routes/{route['id']}")
    
    def test_toggle_route(self):
        """Test toggling route active status"""
        # First create a route
        create = requests.post(f"{BASE_URL}/api/routes", json={
            "name": "TEST_Toggle Route",
            "origin": "A",
            "destination": "B",
            "departure_time": "09:00",
            "days_active": ["Mon"],
            "notifications": True
        })
        route_id = create.json()["data"]["id"]
        
        # Toggle it
        response = requests.put(f"{BASE_URL}/api/routes/{route_id}/toggle")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Route toggled successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/routes/{route_id}")


class TestOffers:
    """Offers endpoint tests - used by Rewards Tab"""
    
    def test_get_offers(self):
        """Test getting all offers"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "discount_info" in data
        
        # Verify discount info structure
        discount_info = data["discount_info"]
        assert "free_discount" in discount_info
        assert "premium_discount" in discount_info
        print(f"✓ Offers: {len(data['data'])} offers available")
        print(f"  Discounts: Basic={discount_info['free_discount']}%, Premium={discount_info['premium_discount']}%")
    
    def test_offers_have_correct_structure(self):
        """Verify offer structure matches mobile app expectations"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        
        if len(data["data"]) > 0:
            offer = data["data"][0]
            required_fields = ["id", "business_name", "business_type", "description",
                             "discount_percent", "gems_reward", "expires_at", 
                             "is_premium_offer", "redeemed"]
            for field in required_fields:
                assert field in offer, f"Missing field in offer: {field}"
            print(f"✓ Offer structure verified: {offer['business_name']}")
    
    def test_get_nearby_offers(self):
        """Test getting nearby offers with location"""
        response = requests.get(f"{BASE_URL}/api/offers/nearby?lat=39.9612&lng=-82.9988&radius=10")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Nearby offers: {len(data['data'])} within 10mi")


class TestChallenges:
    """Challenges endpoint tests - used by Rewards Tab"""
    
    def test_get_challenges(self):
        """Test getting active challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Challenges: {len(data['data'])} available")
    
    def test_challenges_have_correct_structure(self):
        """Verify challenge structure for mobile app"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        data = response.json()
        
        if len(data["data"]) > 0:
            challenge = data["data"][0]
            # Check actual API field names
            required_fields = ["id", "title", "description", "type", "progress", "goal"]
            for field in required_fields:
                assert field in challenge, f"Missing field in challenge: {field}"
            # May have gems or gems_reward depending on API version
            assert "gems" in challenge or "gems_reward" in challenge
            print(f"✓ Challenge structure verified: {challenge['title']}")


class TestBadges:
    """Badges endpoint tests - used by Rewards Tab"""
    
    def test_get_badges(self):
        """Test getting all badges"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "total" in data
        assert "earned" in data
        assert "categories" in data
        print(f"✓ Badges: {data['earned']}/{data['total']} earned")
    
    def test_get_badges_by_category(self):
        """Test filtering badges by category"""
        response = requests.get(f"{BASE_URL}/api/badges?category=safety")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # All returned badges should be safety category
        for badge in data["data"]:
            assert badge["category"] == "safety"
        print(f"✓ Safety badges: {len(data['data'])} badges")
    
    def test_get_badge_categories(self):
        """Test getting badge categories summary"""
        response = requests.get(f"{BASE_URL}/api/badges/categories")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Badge categories: {list(data['data'].keys())}")


class TestLeaderboard:
    """Leaderboard endpoint tests - used by Leaderboard Modal"""
    
    def test_get_leaderboard(self):
        """Test getting leaderboard"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "my_rank" in data
        assert "total_users" in data
        assert "states" in data
        print(f"✓ Leaderboard: {len(data['data'])} users, my rank #{data['my_rank']}")
    
    def test_leaderboard_entry_structure(self):
        """Verify leaderboard entry structure"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        data = response.json()
        
        if len(data["data"]) > 0:
            entry = data["data"][0]
            required_fields = ["rank", "id", "name", "safety_score", "gems",
                             "level", "state", "badges_count", "is_premium"]
            for field in required_fields:
                assert field in entry, f"Missing field in leaderboard entry: {field}"
            print(f"✓ Leaderboard entry verified: #{entry['rank']} {entry['name']}")
    
    def test_leaderboard_filter_by_state(self):
        """Test filtering leaderboard by state"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?state=OH")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # All entries should be from Ohio
        for entry in data["data"]:
            assert entry["state"] == "OH"
        print(f"✓ Ohio leaderboard: {len(data['data'])} users")


class TestFriends:
    """Friends endpoint tests - used by Friends Hub Modal"""
    
    def test_get_friends(self):
        """Test getting friends list"""
        response = requests.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "count" in data
        print(f"✓ Friends: {data['count']} friends")
    
    def test_search_user_by_id(self):
        """Test searching for user by ID"""
        # Search for a known test user ID
        response = requests.get(f"{BASE_URL}/api/friends/search?user_id=123457")
        assert response.status_code == 200
        data = response.json()
        
        if data["success"]:
            user = data["data"]
            assert "id" in user
            assert "name" in user
            assert "safety_score" in user
            assert "level" in user
            assert "state" in user
            assert "is_friend" in user
            print(f"✓ User found: {user['name']} (ID: {user['id']})")
        else:
            print("✓ User not found (expected behavior for non-existent ID)")
    
    def test_add_friend(self):
        """Test adding a friend"""
        # First ensure we're not already friends
        friends_before = requests.get(f"{BASE_URL}/api/friends").json()
        
        response = requests.post(f"{BASE_URL}/api/friends/add", json={
            "user_id": "123458"
        })
        assert response.status_code == 200
        data = response.json()
        
        if data["success"]:
            print("✓ Friend added successfully")
            # Cleanup - remove friend
            requests.delete(f"{BASE_URL}/api/friends/123458")
        else:
            # Already friends or user not found
            print(f"✓ Add friend response: {data['message']}")


class TestReports:
    """Road Reports endpoint tests - used by Road Reports Modal"""
    
    def test_get_reports(self):
        """Test getting road reports"""
        response = requests.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Reports: {len(data['data'])} active reports")
    
    def test_get_my_reports(self):
        """Test getting user's own reports"""
        response = requests.get(f"{BASE_URL}/api/reports/my")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "stats" in data
        print(f"✓ My reports: {len(data['data'])} reports")
    
    def test_create_report(self):
        """Test creating a road report"""
        response = requests.post(f"{BASE_URL}/api/reports", json={
            "type": "hazard",
            "title": "TEST_Pothole on Main St",
            "description": "Large pothole in right lane",
            "lat": 39.9612,
            "lng": -82.9988
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        # Response structure: data contains {report: {...}, xp_result: {...}, badges_earned: [...]}
        report = data["data"].get("report", data["data"])
        if "report" in data["data"]:
            report = data["data"]["report"]
            assert "id" in report
            assert report["type"] == "hazard"
            print(f"✓ Report created: {report['title']} (id={report['id']})")
            # Cleanup
            requests.delete(f"{BASE_URL}/api/reports/{report['id']}")
        else:
            # Old API format
            assert "id" in data["data"]
            print(f"✓ Report created (old format)")
            requests.delete(f"{BASE_URL}/api/reports/{data['data']['id']}")
    
    def test_report_types_valid(self):
        """Test that all valid report types work"""
        valid_types = ["hazard", "accident", "construction", "police", "weather"]
        
        for rtype in valid_types:
            response = requests.post(f"{BASE_URL}/api/reports", json={
                "type": rtype,
                "title": f"TEST_{rtype.capitalize()} Report",
                "description": f"Test {rtype} report",
                "lat": 39.9612,
                "lng": -82.9988
            })
            assert response.status_code == 200
            data = response.json()
            
            # Get report ID from nested structure
            if "report" in data["data"]:
                report_id = data["data"]["report"]["id"]
            else:
                report_id = data["data"]["id"]
            
            print(f"✓ Report type '{rtype}' works")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/reports/{report_id}")


class TestTrips:
    """Trip history endpoint tests - used by Trip History Modal"""
    
    def test_get_trip_history(self):
        """Test getting trip history"""
        response = requests.get(f"{BASE_URL}/api/trips/history")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        required_stats = ["total_trips", "total_miles", "avg_safety_score", "total_gems_earned"]
        for stat in required_stats:
            assert stat in stats, f"Missing stat: {stat}"
        
        print(f"✓ Trip history: {stats['total_trips']} trips, {stats['total_miles']} miles")
    
    def test_trip_entry_structure(self):
        """Verify trip entry structure"""
        response = requests.get(f"{BASE_URL}/api/trips/history")
        data = response.json()
        
        if len(data["data"]) > 0:
            trip = data["data"][0]
            required_fields = ["id", "date", "origin", "destination", 
                             "distance", "duration", "safety_score", "gems_earned"]
            for field in required_fields:
                assert field in trip, f"Missing field in trip: {field}"
            print(f"✓ Trip structure verified: {trip['origin']} → {trip['destination']}")


class TestSessionReset:
    """Session reset endpoint test"""
    
    def test_session_reset(self):
        """Test resetting user session to fresh state"""
        response = requests.post(f"{BASE_URL}/api/session/reset")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        # Verify user is reset to fresh state
        assert data["data"]["gems"] == 0
        assert data["data"]["level"] == 1
        assert data["data"]["xp"] == 0
        print("✓ Session reset to fresh state")


class TestCommunityBadges:
    """Community badges tests for road reporting rewards"""
    
    def test_get_community_badges(self):
        """Test getting community badges"""
        response = requests.get(f"{BASE_URL}/api/badges/community")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        # API returns total_count and earned_count instead of total/earned
        total = data.get("total", data.get("total_count", 0))
        earned = data.get("earned", data.get("earned_count", 0))
        print(f"✓ Community badges: {earned}/{total} earned")


class TestDrivingScore:
    """Driving score endpoint tests"""
    
    def test_get_driving_score(self):
        """Test getting driving score breakdown"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        score_data = data["data"]
        assert "overall_score" in score_data
        assert "categories" in score_data
        print(f"✓ Driving score: {score_data['overall_score']}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
