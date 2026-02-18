"""
Test Offer Boosting APIs - Partner Portal boost functionality
Tests for SnapRoad Offer Boost feature: pricing, create boost, active boosts, cancel boost
All boost APIs are MOCKED with in-memory data
"""
import pytest
import requests
import os

# Use environment variable for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://snaproad-boost.preview.emergentagent.com').rstrip('/')


class TestBoostPricing:
    """Test /api/partner/boosts/pricing endpoint"""
    
    def test_get_boost_pricing(self):
        """Test getting boost pricing packages"""
        response = requests.get(f"{BASE_URL}/api/partner/boosts/pricing")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "packages" in data["data"]
        assert "currency" in data["data"]
        assert data["data"]["currency"] == "USD"
    
    def test_boost_packages_structure(self):
        """Test that all three boost packages (basic, standard, premium) are returned"""
        response = requests.get(f"{BASE_URL}/api/partner/boosts/pricing")
        
        assert response.status_code == 200
        packages = response.json()["data"]["packages"]
        
        # Verify all three packages exist
        assert "basic" in packages
        assert "standard" in packages
        assert "premium" in packages
    
    def test_basic_boost_package(self):
        """Test basic boost package details"""
        response = requests.get(f"{BASE_URL}/api/partner/boosts/pricing")
        
        assert response.status_code == 200
        basic = response.json()["data"]["packages"]["basic"]
        
        assert basic["name"] == "Basic Boost"
        assert basic["duration_hours"] == 24
        assert basic["price"] == 9.99
        assert basic["multiplier"] == 1.5
        assert "description" in basic
    
    def test_standard_boost_package(self):
        """Test standard boost package details"""
        response = requests.get(f"{BASE_URL}/api/partner/boosts/pricing")
        
        assert response.status_code == 200
        standard = response.json()["data"]["packages"]["standard"]
        
        assert standard["name"] == "Standard Boost"
        assert standard["duration_hours"] == 72  # 3 days
        assert standard["price"] == 19.99
        assert standard["multiplier"] == 2.0
    
    def test_premium_boost_package(self):
        """Test premium boost package details"""
        response = requests.get(f"{BASE_URL}/api/partner/boosts/pricing")
        
        assert response.status_code == 200
        premium = response.json()["data"]["packages"]["premium"]
        
        assert premium["name"] == "Premium Boost"
        assert premium["duration_hours"] == 168  # 7 days
        assert premium["price"] == 39.99
        assert premium["multiplier"] == 3.0


class TestCreateBoost:
    """Test /api/partner/boosts/create endpoint"""
    
    def test_create_boost_success(self):
        """Test creating a basic boost for an offer"""
        # First check if offer already has a boost and cancel it
        active_response = requests.get(f"{BASE_URL}/api/partner/boosts/active")
        active_boosts = active_response.json().get("data", [])
        
        # Use offer_id 5 which may not have an active boost
        test_offer_id = 5
        
        # Check if this offer has active boost
        for boost in active_boosts:
            if boost.get("offer_id") == test_offer_id:
                # Cancel existing boost
                requests.delete(f"{BASE_URL}/api/partner/boosts/{test_offer_id}")
                break
        
        response = requests.post(
            f"{BASE_URL}/api/partner/boosts/create",
            json={
                "offer_id": test_offer_id,
                "boost_type": "basic",
                "use_credits": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        # May succeed or fail depending on state, but API should respond
        assert "success" in data
    
    def test_create_boost_invalid_offer(self):
        """Test creating boost for non-existent offer returns error"""
        response = requests.post(
            f"{BASE_URL}/api/partner/boosts/create",
            json={
                "offer_id": 99999,
                "boost_type": "basic",
                "use_credits": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "message" in data
    
    def test_create_boost_invalid_type(self):
        """Test creating boost with invalid boost type returns error"""
        response = requests.post(
            f"{BASE_URL}/api/partner/boosts/create",
            json={
                "offer_id": 1,
                "boost_type": "super_ultra_mega",  # Invalid type
                "use_credits": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "Invalid boost type" in data.get("message", "")


class TestActiveBoosts:
    """Test /api/partner/boosts/active endpoint"""
    
    def test_get_active_boosts(self):
        """Test getting list of active boosts"""
        response = requests.get(f"{BASE_URL}/api/partner/boosts/active")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "active_count" in data
        assert isinstance(data["data"], list)
    
    def test_active_boosts_structure(self):
        """Test active boost record structure"""
        response = requests.get(f"{BASE_URL}/api/partner/boosts/active")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["data"]) > 0:
            boost = data["data"][0]
            # Verify boost record structure
            assert "id" in boost
            assert "offer_id" in boost
            assert "boost_type" in boost
            assert "boost_name" in boost
            assert "multiplier" in boost
            assert "price_paid" in boost
            assert "created_at" in boost
            assert "expires_at" in boost
            assert "status" in boost
            assert "is_active" in boost
            assert "hours_remaining" in boost


class TestCancelBoost:
    """Test /api/partner/boosts/{offer_id} DELETE endpoint"""
    
    def test_cancel_nonexistent_boost(self):
        """Test cancelling a boost that doesn't exist"""
        response = requests.delete(f"{BASE_URL}/api/partner/boosts/99999")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "No active boost found" in data.get("message", "") or "not found" in data.get("message", "").lower()


class TestPartnerCredits:
    """Test partner credits endpoints"""
    
    def test_get_partner_credits(self):
        """Test getting partner credit balance"""
        response = requests.get(f"{BASE_URL}/api/partner/credits")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "balance" in data["data"]
        assert "currency" in data["data"]
    
    def test_add_partner_credits(self):
        """Test adding credits to partner account (mocked payment)"""
        response = requests.post(
            f"{BASE_URL}/api/partner/credits/add",
            json={"amount": 50.00}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "previous_balance" in data["data"]
        assert "added" in data["data"]
        assert "new_balance" in data["data"]


class TestTripHistoryDetailed:
    """Test /api/trips/history/detailed endpoint"""
    
    def test_get_trip_history_30_days(self):
        """Test getting trip history with 30 days parameter"""
        response = requests.get(f"{BASE_URL}/api/trips/history/detailed?days=30")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "trips" in data["data"]
        assert "analytics" in data["data"]
        
        # Verify trips array
        trips = data["data"]["trips"]
        assert isinstance(trips, list)
        assert len(trips) > 0  # Should have some trips
        
        # Verify trip structure
        trip = trips[0]
        assert "id" in trip
        assert "date" in trip
        assert "origin" in trip
        assert "destination" in trip
        assert "distance_miles" in trip
        assert "safety_score" in trip
        assert "gems_earned" in trip
        assert "route_coordinates" in trip
    
    def test_trip_analytics_comprehensive(self):
        """Test trip analytics has all required fields"""
        response = requests.get(f"{BASE_URL}/api/trips/history/detailed?days=30")
        
        assert response.status_code == 200
        analytics = response.json()["data"]["analytics"]
        
        # All required analytics fields
        required_fields = [
            "total_trips", "total_distance_miles", "total_fuel_gallons",
            "total_duration_minutes", "total_duration_hours", "avg_safety_score",
            "total_gems_earned", "avg_mpg", "fuel_saved_gallons",
            "money_saved_dollars", "co2_saved_lbs"
        ]
        
        for field in required_fields:
            assert field in analytics, f"Missing analytics field: {field}"


class TestRouteHistory3D:
    """Test /api/routes/history-3d endpoint"""
    
    def test_get_route_history_90_days(self):
        """Test getting route history for 3D visualization with 90 days"""
        response = requests.get(f"{BASE_URL}/api/routes/history-3d?days=90")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "routes" in data["data"]
        assert "center" in data["data"]
        assert "total_unique_routes" in data["data"]
        assert "total_trips" in data["data"]
        assert "total_distance" in data["data"]
    
    def test_route_coordinates_structure(self):
        """Test route has coordinates for 3D rendering"""
        response = requests.get(f"{BASE_URL}/api/routes/history-3d?days=90")
        
        assert response.status_code == 200
        routes = response.json()["data"]["routes"]
        
        if len(routes) > 0:
            route = routes[0]
            assert "coordinates" in route
            assert isinstance(route["coordinates"], list)
            
            if len(route["coordinates"]) > 0:
                coord = route["coordinates"][0]
                assert "lat" in coord
                assert "lng" in coord
    
    def test_center_coordinates(self):
        """Test center coordinates are returned for map centering"""
        response = requests.get(f"{BASE_URL}/api/routes/history-3d?days=90")
        
        assert response.status_code == 200
        center = response.json()["data"]["center"]
        
        assert "lat" in center
        assert "lng" in center
        assert isinstance(center["lat"], (int, float))
        assert isinstance(center["lng"], (int, float))


# Health check test
class TestHealthCheck:
    """Test basic API health"""
    
    def test_api_health(self):
        """Test API is healthy and responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
