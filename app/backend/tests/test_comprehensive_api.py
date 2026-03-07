"""
Comprehensive API Tests for SnapRoad
Tests all major endpoints: offers, users, challenges, events, badges, leaderboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Health check tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "snaproad-api"
        print("✓ Health check passed")


class TestUserEndpoints:
    """User profile and stats tests"""
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        user = data["data"]
        assert "id" in user
        assert "name" in user
        assert "gems" in user
        assert "level" in user
        assert "safety_score" in user
        print(f"✓ User profile: {user['name']}, Level {user['level']}, Score {user['safety_score']}")
    
    def test_get_user_stats(self):
        """Test getting user stats"""
        response = requests.get(f"{BASE_URL}/api/user/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ User stats retrieved")
    
    def test_get_user_car(self):
        """Test getting user car configuration"""
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
    
    def test_get_onboarding_status(self):
        """Test getting onboarding status"""
        response = requests.get(f"{BASE_URL}/api/user/onboarding-status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Onboarding status: complete={data['data'].get('onboarding_complete', False)}")


class TestOffersEndpoints:
    """Offers CRUD tests"""
    
    def test_get_offers(self):
        """Test getting all offers"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "user_plan" in data
        assert "discount_info" in data
        print(f"✓ Offers retrieved: {len(data['data'])} offers")
        
        # Verify offer structure
        if len(data["data"]) > 0:
            offer = data["data"][0]
            assert "id" in offer
            assert "business_name" in offer
            assert "discount_percent" in offer
            assert "gems_reward" in offer
            print(f"  First offer: {offer['business_name']} - {offer['discount_percent']}% off")
    
    def test_get_nearby_offers(self):
        """Test getting nearby offers"""
        response = requests.get(f"{BASE_URL}/api/offers/nearby?lat=39.9612&lng=-82.9988&radius=10")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Nearby offers: {len(data['data'])} offers within 10km")
    
    def test_create_offer(self):
        """Test creating a new offer"""
        new_offer = {
            "business_name": "Test Business",
            "business_type": "restaurant",
            "description": "Test offer description",
            "base_gems": 25,
            "lat": 39.9612,
            "lng": -82.9988,
            "expires_hours": 24,
            "is_admin_offer": False
        }
        response = requests.post(f"{BASE_URL}/api/offers", json=new_offer)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Offer created: {data['data']['business_name']}")


class TestChallengesEndpoints:
    """Challenges tests"""
    
    def test_get_challenges(self):
        """Test getting challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ Challenges retrieved: {len(data['data'])} challenges")
        
        # Verify challenge structure
        if len(data["data"]) > 0:
            challenge = data["data"][0]
            assert "id" in challenge
            assert "title" in challenge
            assert "gems" in challenge
            assert "progress" in challenge
            assert "target" in challenge
            print(f"  First challenge: {challenge['title']} - {challenge['progress']}/{challenge['target']}")


class TestBadgesEndpoints:
    """Badges tests"""
    
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
        print(f"✓ Badges retrieved: {data['earned']}/{data['total']} earned")
    
    def test_get_badge_categories(self):
        """Test getting badge categories"""
        response = requests.get(f"{BASE_URL}/api/badges/categories")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Badge categories: {list(data['data'].keys())}")


class TestLeaderboardEndpoints:
    """Leaderboard tests"""
    
    def test_get_leaderboard(self):
        """Test getting leaderboard"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "my_rank" in data
        assert "states" in data
        print(f"✓ Leaderboard: {len(data['data'])} users, my rank: #{data['my_rank']}")
    
    def test_get_leaderboard_by_state(self):
        """Test getting leaderboard filtered by state"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?state=OH")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Ohio leaderboard: {len(data['data'])} users")


class TestFriendsEndpoints:
    """Friends tests"""
    
    def test_get_friends(self):
        """Test getting friends list"""
        response = requests.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "count" in data
        print(f"✓ Friends: {data['count']} friends")
    
    def test_search_user(self):
        """Test searching for a user"""
        response = requests.get(f"{BASE_URL}/api/friends/search?user_id=123457")
        assert response.status_code == 200
        data = response.json()
        # May or may not find user
        print(f"✓ User search: success={data['success']}")


class TestLocationsEndpoints:
    """Locations tests"""
    
    def test_get_locations(self):
        """Test getting saved locations"""
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Locations: {len(data['data'])} saved")
    
    def test_add_location(self):
        """Test adding a new location"""
        new_location = {
            "name": "Test Location",
            "address": "123 Test St",
            "category": "favorite"
        }
        response = requests.post(f"{BASE_URL}/api/locations", json=new_location)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Location added: {data['data']['name']}")


class TestRoutesEndpoints:
    """Routes tests"""
    
    def test_get_routes(self):
        """Test getting saved routes"""
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "total" in data
        assert "max" in data
        print(f"✓ Routes: {data['total']}/{data['max']} saved")
    
    def test_add_route(self):
        """Test adding a new route"""
        new_route = {
            "name": "Test Route",
            "origin": "Home",
            "destination": "Work",
            "departure_time": "08:00",
            "days_active": ["Mon", "Tue", "Wed"],
            "notifications": True
        }
        response = requests.post(f"{BASE_URL}/api/routes", json=new_route)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Route added: {data['data']['name']}")


class TestCarsAndSkinsEndpoints:
    """Cars and skins tests"""
    
    def test_get_cars(self):
        """Test getting available cars"""
        response = requests.get(f"{BASE_URL}/api/cars")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Cars: {len(data['data'])} available")
    
    def test_get_skins(self):
        """Test getting available skins"""
        response = requests.get(f"{BASE_URL}/api/skins")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Skins: {len(data['data'])} available")


class TestWeeklyRecapEndpoint:
    """Weekly recap tests"""
    
    def test_get_weekly_recap(self):
        """Test getting weekly recap"""
        response = requests.get(f"{BASE_URL}/api/weekly-recap")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        recap = data["data"]
        assert "total_trips" in recap
        assert "total_miles" in recap
        assert "gems_earned" in recap
        assert "xp_earned" in recap
        print(f"✓ Weekly recap: {recap['total_trips']} trips, {recap['gems_earned']} gems")


class TestNavigationEndpoints:
    """Navigation tests"""
    
    def test_start_navigation(self):
        """Test starting navigation"""
        nav_request = {
            "destination": "Work",
            "origin": "current_location"
        }
        response = requests.post(f"{BASE_URL}/api/navigation/start", json=nav_request)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Navigation started: {data['message']}")
    
    def test_stop_navigation(self):
        """Test stopping navigation"""
        response = requests.post(f"{BASE_URL}/api/navigation/stop")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Navigation stopped")


class TestReportsEndpoints:
    """Road reports tests"""
    
    def test_get_reports(self):
        """Test getting road reports"""
        response = requests.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Reports: {len(data['data'])} reports")
    
    def test_create_report(self):
        """Test creating a road report"""
        new_report = {
            "type": "hazard",
            "title": "Test Hazard",
            "description": "Test hazard description",
            "lat": 39.9612,
            "lng": -82.9988
        }
        response = requests.post(f"{BASE_URL}/api/reports", json=new_report)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Report created: {data['message']}")


class TestPlanEndpoints:
    """Plan selection tests"""
    
    def test_select_plan(self):
        """Test selecting a plan"""
        plan_request = {"plan": "basic"}
        response = requests.post(f"{BASE_URL}/api/user/plan", json=plan_request)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Plan selected: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
