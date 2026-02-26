"""
Test Trip Analytics, Route History 3D, Fuel Prices, and Personalized Offers APIs
Tests for SnapRoad new features: TripAnalytics, RouteHistory3D, CollapsibleOffersPanel, OrionVoice
"""
import pytest
import requests
import os

# Use environment variable for BASE_URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

class TestTripHistoryDetailed:
    """Test /api/trips/history/detailed endpoint"""
    
    def test_get_trip_history_default(self):
        """Test getting trip history with default parameters (30 days)"""
        response = requests.get(f"{BASE_URL}/api/trips/history/detailed")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "trips" in data["data"]
        assert "analytics" in data["data"]
        
        # Verify trip structure
        if len(data["data"]["trips"]) > 0:
            trip = data["data"]["trips"][0]
            assert "id" in trip
            assert "date" in trip
            assert "origin" in trip
            assert "destination" in trip
            assert "distance_miles" in trip
            assert "safety_score" in trip
            assert "gems_earned" in trip
            assert "fuel_used_gallons" in trip
    
    def test_trip_analytics_structure(self):
        """Test analytics data structure in trip history"""
        response = requests.get(f"{BASE_URL}/api/trips/history/detailed?days=30")
        
        assert response.status_code == 200
        data = response.json()
        analytics = data["data"]["analytics"]
        
        # Required analytics fields
        assert "total_trips" in analytics
        assert "total_distance_miles" in analytics
        assert "total_fuel_gallons" in analytics
        assert "total_duration_hours" in analytics
        assert "avg_safety_score" in analytics
        assert "total_gems_earned" in analytics
        assert "avg_mpg" in analytics
        assert "fuel_saved_gallons" in analytics
        assert "money_saved_dollars" in analytics
        assert "co2_saved_lbs" in analytics
        
        # Values should be numeric
        assert isinstance(analytics["total_trips"], int)
        assert isinstance(analytics["avg_mpg"], (int, float))
    
    def test_trip_history_with_date_filter(self):
        """Test trip history with different date ranges"""
        for days in [7, 30, 90]:
            response = requests.get(f"{BASE_URL}/api/trips/history/detailed?days={days}")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True


class TestFuelPrices:
    """Test /api/fuel/prices endpoint"""
    
    def test_get_fuel_prices(self):
        """Test getting current fuel prices"""
        response = requests.get(f"{BASE_URL}/api/fuel/prices")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "prices" in data["data"]
        
        prices = data["data"]["prices"]
        assert "regular" in prices
        assert "midgrade" in prices
        assert "premium" in prices
        assert "diesel" in prices
    
    def test_fuel_prices_location(self):
        """Test fuel prices with location coordinates"""
        response = requests.get(f"{BASE_URL}/api/fuel/prices?lat=39.9612&lng=-82.9988")
        
        assert response.status_code == 200
        data = response.json()
        assert "location" in data["data"]
        assert data["data"]["location"]["lat"] == 39.9612
    
    def test_nearby_fuel_stations(self):
        """Test that nearby stations are returned"""
        response = requests.get(f"{BASE_URL}/api/fuel/prices")
        
        assert response.status_code == 200
        data = response.json()
        assert "nearby_stations" in data["data"]
        
        stations = data["data"]["nearby_stations"]
        assert len(stations) > 0
        
        # Verify station structure
        station = stations[0]
        assert "name" in station
        assert "address" in station
        assert "regular" in station
        assert "distance_miles" in station


class TestRouteHistory3D:
    """Test /api/routes/history-3d endpoint"""
    
    def test_get_route_history_3d(self):
        """Test getting route history for 3D visualization"""
        response = requests.get(f"{BASE_URL}/api/routes/history-3d")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "routes" in data["data"]
        assert "center" in data["data"]
        assert "total_unique_routes" in data["data"]
    
    def test_route_3d_structure(self):
        """Test route data structure for 3D map"""
        response = requests.get(f"{BASE_URL}/api/routes/history-3d?days=90")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["data"]["routes"]) > 0:
            route = data["data"]["routes"][0]
            # Verify route structure
            assert "id" in route
            assert "route_name" in route
            assert "origin" in route
            assert "destination" in route
            assert "total_trips" in route
            assert "total_distance_miles" in route
            assert "avg_safety_score" in route
            assert "color_intensity" in route
            assert "coordinates" in route
    
    def test_route_3d_date_filter(self):
        """Test route history with different date ranges"""
        for days in [30, 90, 365]:
            response = requests.get(f"{BASE_URL}/api/routes/history-3d?days={days}")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True


class TestPersonalizedOffers:
    """Test /api/offers/personalized endpoint"""
    
    def test_get_personalized_offers(self):
        """Test getting personalized offers"""
        response = requests.get(f"{BASE_URL}/api/offers/personalized?lat=39.9612&lng=-82.9988")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "voice_prompt" in data
    
    def test_personalized_offers_structure(self):
        """Test personalized offer data structure"""
        response = requests.get(f"{BASE_URL}/api/offers/personalized?lat=39.9612&lng=-82.9988&limit=2")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["data"]) > 0:
            offer = data["data"][0]
            # Verify offer structure for voice/personalized display
            assert "id" in offer
            assert "business_name" in offer
            assert "business_type" in offer
            assert "description" in offer
            assert "distance_km" in offer
            assert "discount_percent" in offer
            assert "personalization_reason" in offer
    
    def test_personalized_offers_limit(self):
        """Test personalized offers respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/offers/personalized?lat=39.9612&lng=-82.9988&limit=1")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 1


class TestOfferAcceptVoice:
    """Test /api/offers/{offer_id}/accept-voice endpoint"""
    
    def test_accept_offer_voice(self):
        """Test accepting an offer via voice command (Orion)"""
        # First get an offer ID
        offers_response = requests.get(f"{BASE_URL}/api/offers")
        offers_data = offers_response.json()
        
        if len(offers_data.get("data", [])) > 0:
            offer_id = offers_data["data"][0]["id"]
            
            response = requests.post(
                f"{BASE_URL}/api/offers/{offer_id}/accept-voice",
                json={"add_as_stop": True}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "data" in data
            assert "waypoint" in data["data"]
            assert "navigation_action" in data["data"]
    
    def test_accept_offer_voice_invalid_id(self):
        """Test accepting non-existent offer"""
        response = requests.post(
            f"{BASE_URL}/api/offers/99999/accept-voice",
            json={"add_as_stop": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False


class TestPartnerLocations:
    """Test partner location management APIs"""
    
    def test_get_partner_profile_with_locations(self):
        """Test getting partner profile with location limits"""
        response = requests.get(f"{BASE_URL}/api/partner/profile?partner_id=default_partner")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        profile = data["data"]
        # Verify plan-based location fields
        assert "plan" in profile
        assert "plan_info" in profile
        assert "locations" in profile
        assert "location_count" in profile
        assert "max_locations" in profile
        assert "can_add_location" in profile
        
        # Verify plan_info structure
        plan_info = profile["plan_info"]
        assert "name" in plan_info
        assert "max_locations" in plan_info
        assert "features" in plan_info


class TestStandardOffers:
    """Test standard offers endpoint works correctly"""
    
    def test_get_offers(self):
        """Test getting all offers"""
        response = requests.get(f"{BASE_URL}/api/offers")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "discount_info" in data
        
    def test_offer_discount_tiers(self):
        """Test that discount info is present"""
        response = requests.get(f"{BASE_URL}/api/offers")
        
        assert response.status_code == 200
        data = response.json()
        
        discount_info = data["discount_info"]
        assert "free_discount" in discount_info
        assert "premium_discount" in discount_info
        assert discount_info["free_discount"] == 6
        assert discount_info["premium_discount"] == 18


# Additional integration tests
class TestHealthAndBasics:
    """Test basic API health"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_user_profile(self):
        """Test user profile endpoint"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
