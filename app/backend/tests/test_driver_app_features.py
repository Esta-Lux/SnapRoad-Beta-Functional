"""
Test suite for SnapRoad Driver App Features
Tests: /api/badges, /api/user/car, /api/offers endpoints
and navigation/tab rendering prerequisites
"""
import pytest
import requests

from tests.http_integration import INTEGRATION_BASE_URL as BASE_URL


class TestHealthEndpoint:
    """Health check tests"""
    
    def test_health_check(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")


class TestBadgesEndpoint:
    """Test /api/badges endpoint"""
    
    def test_badges_returns_success(self):
        """Test badges endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Badges endpoint returns success")
    
    def test_badges_data_structure(self):
        """Test badges response has correct data structure"""
        response = requests.get(f"{BASE_URL}/api/badges")
        data = response.json()
        
        # Check that data contains badges array or badges object
        assert "data" in data
        badges_data = data["data"]
        
        # badges can be a list or dict with badges key
        if isinstance(badges_data, list):
            badges_list = badges_data
        elif isinstance(badges_data, dict):
            assert "badges" in badges_data, "data should have 'badges' key"
            badges_list = badges_data["badges"]
        else:
            pytest.fail(f"Unexpected data type: {type(badges_data)}")
        
        # Verify it's a list
        assert isinstance(badges_list, list), "badges should be a list"
        print(f"✓ Badges is a list with {len(badges_list)} items")
        
        # Check badge structure
        if len(badges_list) > 0:
            badge = badges_list[0]
            assert "id" in badge, "Badge should have 'id'"
            assert "name" in badge, "Badge should have 'name'"
            print(f"✓ Badge structure is correct: {badge.get('name')}")
    
    def test_badges_count(self):
        """Test badges response has badge count info"""
        response = requests.get(f"{BASE_URL}/api/badges")
        data = response.json()
        
        if isinstance(data["data"], dict):
            assert "earned_count" in data["data"], "Should have earned_count"
            assert "total_count" in data["data"], "Should have total_count"
            print(f"✓ Badge counts: earned={data['data']['earned_count']}, total={data['data']['total_count']}")


class TestUserCarEndpoint:
    """Test /api/user/car endpoint"""
    
    def test_user_car_returns_success(self):
        """Test user car endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/user/car")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ User car endpoint returns success")
    
    def test_user_car_data_structure(self):
        """Test user car response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/user/car")
        data = response.json()
        
        assert "data" in data
        car_data = data["data"]
        
        # Check required fields
        assert "category" in car_data, "Should have 'category'"
        assert "variant" in car_data, "Should have 'variant'"
        assert "color" in car_data, "Should have 'color'"
        
        print(f"✓ Car data: category={car_data['category']}, variant={car_data['variant']}, color={car_data['color']}")
    
    def test_user_car_owned_colors(self):
        """Test user car response includes owned colors"""
        response = requests.get(f"{BASE_URL}/api/user/car")
        data = response.json()
        
        car_data = data["data"]
        assert "owned_colors" in car_data, "Should have 'owned_colors'"
        assert isinstance(car_data["owned_colors"], list), "owned_colors should be a list"
        print(f"✓ Owned colors: {car_data['owned_colors']}")


class TestOffersEndpoint:
    """Test /api/offers endpoint"""
    
    def test_offers_returns_success(self):
        """Test offers endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Offers endpoint returns success")
    
    def test_offers_data_is_list(self):
        """Test offers returns a list"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        
        assert "data" in data
        assert isinstance(data["data"], list), "offers data should be a list"
        print(f"✓ Offers is a list with {len(data['data'])} items")
    
    def test_offer_structure(self):
        """Test offer object has required fields"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        
        if len(data["data"]) > 0:
            offer = data["data"][0]
            required_fields = ["id", "business_name", "business_type", "description"]
            for field in required_fields:
                assert field in offer, f"Offer should have '{field}'"
            print(f"✓ Offer structure correct: {offer.get('business_name')}")


class TestUserProfileEndpoint:
    """Test /api/user/profile endpoint"""
    
    def test_user_profile_returns_success(self):
        """Test user profile endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ User profile endpoint returns success")
    
    def test_user_profile_data_structure(self):
        """Test user profile has required fields"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        data = response.json()
        
        profile_data = data["data"]
        # Check some expected user profile fields
        expected_fields = ["id", "name", "gems", "level", "safety_score"]
        for field in expected_fields:
            assert field in profile_data, f"Profile should have '{field}'"
        
        print(f"✓ Profile: name={profile_data.get('name')}, level={profile_data.get('level')}, gems={profile_data.get('gems')}")


class TestChallengesEndpoint:
    """Test /api/challenges endpoint"""
    
    def test_challenges_returns_success(self):
        """Test challenges endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Challenges endpoint returns success")
    
    def test_challenges_data_is_list(self):
        """Test challenges returns a list"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        data = response.json()
        
        assert isinstance(data["data"], list), "challenges data should be a list"
        print(f"✓ Challenges is a list with {len(data['data'])} items")


class TestOnboardingStatusEndpoint:
    """Test /api/user/onboarding-status endpoint"""
    
    def test_onboarding_status_returns_success(self):
        """Test onboarding status endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/user/onboarding-status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Onboarding status endpoint returns success")
    
    def test_onboarding_status_fields(self):
        """Test onboarding status has required fields"""
        response = requests.get(f"{BASE_URL}/api/user/onboarding-status")
        data = response.json()
        
        status = data["data"]
        required_fields = ["account_created", "plan_selected", "car_selected", "onboarding_complete"]
        for field in required_fields:
            assert field in status, f"Onboarding status should have '{field}'"
        
        print(f"✓ Onboarding status: plan_selected={status['plan_selected']}, car_selected={status['car_selected']}")


class TestLocationsRoutesEndpoints:
    """Test /api/locations and /api/routes endpoints"""
    
    def test_locations_returns_success(self):
        """Test locations endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Locations endpoint returns success")
    
    def test_routes_returns_success(self):
        """Test routes endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Routes endpoint returns success")


class TestSkinsEndpoint:
    """Test /api/skins endpoint"""
    
    def test_skins_returns_success(self):
        """Test skins endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/skins")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Skins endpoint returns success")


class TestFamilyEndpoint:
    """Test /api/family/members endpoint"""
    
    def test_family_members_returns_success(self):
        """Test family members endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/family/members")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Family members endpoint returns success")


# Run tests when file is executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
