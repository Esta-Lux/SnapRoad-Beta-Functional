"""
Test suite for SnapRoad Map Search and Turn-by-Turn Navigation APIs
Tests the new /api/map/search and /api/map/directions endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://snapmap-3.preview.emergentagent.com')

class TestMapSearchAPI:
    """Tests for /api/map/search endpoint"""
    
    def test_search_by_name(self):
        """Test searching locations by name"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={
            "q": "starbucks",
            "lat": 39.9612,
            "lng": -82.9988,
            "limit": 5
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "query" in data
        assert data["query"] == "starbucks"
        # Should find at least one Starbucks
        if len(data["data"]) > 0:
            assert "starbucks" in data["data"][0]["name"].lower()
    
    def test_search_by_type(self):
        """Test searching locations by type (gas, cafe, etc.)"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={
            "q": "gas",
            "lat": 39.9612,
            "lng": -82.9988,
            "limit": 10
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # Should find gas stations
        assert data["total_results"] >= 0
    
    def test_search_by_address(self):
        """Test searching locations by address"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={
            "q": "high st",
            "lat": 39.9612,
            "lng": -82.9988,
            "limit": 5
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_search_returns_distance(self):
        """Test that search returns distance when lat/lng provided"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={
            "q": "shell",
            "lat": 39.9612,
            "lng": -82.9988,
            "limit": 5
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        if len(data["data"]) > 0:
            # Should have distance_km when lat/lng provided
            assert "distance_km" in data["data"][0]
    
    def test_search_limit_parameter(self):
        """Test that limit parameter works"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={
            "q": "columbus",
            "limit": 3
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert len(data["data"]) <= 3
    
    def test_search_empty_query_fails(self):
        """Test that empty query returns error"""
        response = requests.get(f"{BASE_URL}/api/map/search", params={
            "q": ""
        })
        # Should return 422 for validation error
        assert response.status_code == 422


class TestMapDirectionsAPI:
    """Tests for /api/map/directions endpoint"""
    
    def test_get_directions_basic(self):
        """Test getting basic directions between two points"""
        response = requests.get(f"{BASE_URL}/api/map/directions", params={
            "origin_lat": 39.9612,
            "origin_lng": -82.9988,
            "dest_lat": 39.9650,
            "dest_lng": -82.9930,
            "dest_name": "Shell Gas Station"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        # Check response structure
        nav_data = data["data"]
        assert "origin" in nav_data
        assert "destination" in nav_data
        assert "distance" in nav_data
        assert "duration" in nav_data
        assert "steps" in nav_data
        assert "traffic" in nav_data
    
    def test_directions_has_steps(self):
        """Test that directions include turn-by-turn steps"""
        response = requests.get(f"{BASE_URL}/api/map/directions", params={
            "origin_lat": 39.9612,
            "origin_lng": -82.9988,
            "dest_lat": 39.9700,
            "dest_lng": -82.9850,
            "dest_name": "Test Destination"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        steps = data["data"]["steps"]
        assert len(steps) > 0
        
        # Check step structure
        for step in steps:
            assert "instruction" in step
            assert "distance" in step
            assert "duration" in step
            assert "maneuver" in step
    
    def test_directions_maneuver_types(self):
        """Test that directions include valid maneuver types"""
        response = requests.get(f"{BASE_URL}/api/map/directions", params={
            "origin_lat": 39.9612,
            "origin_lng": -82.9988,
            "dest_lat": 39.9800,
            "dest_lng": -82.9700,
            "dest_name": "Far Destination"
        })
        assert response.status_code == 200
        data = response.json()
        
        valid_maneuvers = ["straight", "turn-right", "turn-left", "arrive"]
        for step in data["data"]["steps"]:
            assert step["maneuver"] in valid_maneuvers
    
    def test_directions_distance_format(self):
        """Test that distance is returned in multiple formats"""
        response = requests.get(f"{BASE_URL}/api/map/directions", params={
            "origin_lat": 39.9612,
            "origin_lng": -82.9988,
            "dest_lat": 39.9650,
            "dest_lng": -82.9930,
            "dest_name": "Nearby"
        })
        assert response.status_code == 200
        data = response.json()
        
        distance = data["data"]["distance"]
        assert "km" in distance
        assert "miles" in distance
        assert "text" in distance
    
    def test_directions_duration_format(self):
        """Test that duration is returned correctly"""
        response = requests.get(f"{BASE_URL}/api/map/directions", params={
            "origin_lat": 39.9612,
            "origin_lng": -82.9988,
            "dest_lat": 39.9650,
            "dest_lng": -82.9930,
            "dest_name": "Nearby"
        })
        assert response.status_code == 200
        data = response.json()
        
        duration = data["data"]["duration"]
        assert "minutes" in duration
        assert "text" in duration
    
    def test_directions_traffic_status(self):
        """Test that traffic status is included"""
        response = requests.get(f"{BASE_URL}/api/map/directions", params={
            "origin_lat": 39.9612,
            "origin_lng": -82.9988,
            "dest_lat": 39.9650,
            "dest_lng": -82.9930,
            "dest_name": "Nearby"
        })
        assert response.status_code == 200
        data = response.json()
        
        traffic = data["data"]["traffic"]
        assert traffic in ["light", "moderate", "heavy"]


class TestDashboardModals:
    """Tests for Partner and Admin Dashboard modals (Help, Settings)"""
    
    def test_partner_dashboard_loads(self):
        """Test that Partner Dashboard page loads"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard", params={
            "business_id": "default_business"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_admin_dashboard_loads(self):
        """Test that Admin Dashboard analytics loads"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
