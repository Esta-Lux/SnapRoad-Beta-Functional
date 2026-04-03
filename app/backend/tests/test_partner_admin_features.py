"""
Test Partner/Admin Portal Features - Boost System, AI Image Generation, Analytics, Export/Import
Tests for SnapRoad Partner and Admin dashboard features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBoostSystem:
    """Test boost calculation and creation APIs"""
    
    def test_boost_calculate_basic(self):
        """Test boost cost calculation for 1 day, 100 reach"""
        response = requests.post(f"{BASE_URL}/api/boosts/calculate", json={
            "duration_days": 1,
            "reach_target": 100
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        # Verify pricing: $25 base + $5 for 100 reach = $30
        assert data["data"]["duration_cost"] == 25
        assert data["data"]["reach_cost"] == 5
        assert data["data"]["total_cost"] == 30
    
    def test_boost_calculate_extended_duration(self):
        """Test boost cost for 5 days, 100 reach"""
        response = requests.post(f"{BASE_URL}/api/boosts/calculate", json={
            "duration_days": 5,
            "reach_target": 100
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Duration: $25 base + 4 extra days * $20 = $105
        # Reach: $5 for 100
        # Total: $110
        assert data["data"]["duration_cost"] == 105
        assert data["data"]["reach_cost"] == 5
        assert data["data"]["total_cost"] == 110
    
    def test_boost_calculate_extended_reach(self):
        """Test boost cost for 1 day, 500 reach"""
        response = requests.post(f"{BASE_URL}/api/boosts/calculate", json={
            "duration_days": 1,
            "reach_target": 500
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Duration: $25 base
        # Reach: $5 for 100 + 4 increments * $10 = $45
        # Total: $70
        assert data["data"]["duration_cost"] == 25
        assert data["data"]["reach_cost"] == 45
        assert data["data"]["total_cost"] == 70
    
    def test_boost_calculate_max_values(self):
        """Test boost cost for 30 days, 2000 reach"""
        response = requests.post(f"{BASE_URL}/api/boosts/calculate", json={
            "duration_days": 30,
            "reach_target": 2000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Duration: $25 base + 29 extra days * $20 = $605
        # Reach: $5 for 100 + 19 increments * $10 = $195
        # Total: $800
        assert data["data"]["duration_cost"] == 605
        assert data["data"]["reach_cost"] == 195
        assert data["data"]["total_cost"] == 800
    
    def test_boost_create(self):
        """Test creating a boost for an offer"""
        response = requests.post(f"{BASE_URL}/api/boosts/create", json={
            "offer_id": 1,
            "duration_days": 3,
            "reach_target": 200,
            "business_id": "test_business"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert data["data"]["offer_id"] == 1
        assert data["data"]["duration_days"] == 3
        assert data["data"]["reach_target"] == 200
        assert data["data"]["status"] == "active"
        assert "id" in data["data"]
    
    def test_boost_list(self):
        """Test getting list of boosts"""
        response = requests.get(f"{BASE_URL}/api/boosts")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert isinstance(data["data"], list)


class TestAnalyticsDashboard:
    """Test analytics dashboard API"""
    
    def test_analytics_dashboard_default(self):
        """Test analytics dashboard with default parameters"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        # Check summary fields
        summary = data["data"]["summary"]
        assert "total_views" in summary
        assert "total_clicks" in summary
        assert "total_redemptions" in summary
        assert "total_revenue" in summary
        assert "ctr" in summary
        assert "conversion_rate" in summary
    
    def test_analytics_dashboard_chart_data(self):
        """Test analytics dashboard returns chart data"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard?days=7")
        assert response.status_code == 200
        data = response.json()
        
        # Check chart data
        assert "chart_data" in data["data"]
        chart_data = data["data"]["chart_data"]
        assert len(chart_data) == 7
        
        for entry in chart_data:
            assert "date" in entry
            assert "views" in entry
            assert "clicks" in entry
            assert "redemptions" in entry
            assert "revenue" in entry
    
    def test_analytics_dashboard_geo_data(self):
        """Test analytics dashboard returns geographic data"""
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Check geo data
        assert "geo_data" in data["data"]
        geo_data = data["data"]["geo_data"]
        assert len(geo_data) > 0
        
        for entry in geo_data:
            assert "city" in entry
            assert "redemptions" in entry


class TestAdminFeatures:
    """Test admin-specific features"""
    
    def test_admin_analytics(self):
        """Test admin analytics endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        # Check summary
        summary = data["data"]["summary"]
        assert "total_users" in summary
        assert "premium_users" in summary
        assert "total_offers" in summary
        assert "total_redemptions" in summary
        assert "avg_safety_score" in summary
        
        # Check chart data
        assert "chart_data" in data["data"]
        assert len(data["data"]["chart_data"]) == 30
    
    def test_admin_create_offer(self):
        """Test admin creating offer on behalf of business"""
        response = requests.post(f"{BASE_URL}/api/admin/offers/create", json={
            "business_name": "TEST_Admin Created Business",
            "business_type": "cafe",
            "description": "Test offer created by admin",
            "discount_percent": 20,
            "base_gems": 75,
            "lat": 39.9612,
            "lng": -82.9988,
            "expires_hours": 48
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert data["data"]["business_name"] == "TEST_Admin Created Business"
        assert data["data"]["is_admin_offer"] == True
        assert data["data"]["created_by"] == "admin"
    
    def test_admin_export_offers_json(self):
        """Test exporting offers as JSON"""
        response = requests.get(f"{BASE_URL}/api/admin/export/offers?format=json")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["format"] == "json"
        assert "data" in data
        assert isinstance(data["data"], list)
        assert "count" in data
    
    def test_admin_export_offers_csv(self):
        """Test exporting offers as CSV"""
        response = requests.get(f"{BASE_URL}/api/admin/export/offers?format=csv")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["format"] == "csv"
        assert "data" in data
        assert isinstance(data["data"], str)
        # CSV should have headers
        if data["data"]:
            assert "business_name" in data["data"]
    
    def test_admin_export_users_json(self):
        """Test exporting users as JSON"""
        response = requests.get(f"{BASE_URL}/api/admin/export/users?format=json")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["format"] == "json"
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0
        
        # Check user fields
        user = data["data"][0]
        assert "id" in user
        assert "name" in user
        assert "gems" in user
        assert "level" in user
    
    def test_admin_import_offers(self):
        """Test importing offers via JSON"""
        response = requests.post(f"{BASE_URL}/api/admin/import/offers", json={
            "offers": [
                {
                    "business_name": "TEST_Imported Business 1",
                    "business_type": "restaurant",
                    "description": "Imported offer 1",
                    "base_gems": 30
                },
                {
                    "business_name": "TEST_Imported Business 2",
                    "business_type": "gas",
                    "description": "Imported offer 2",
                    "base_gems": 25
                }
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["imported"] == 2
        assert data["data"]["errors"] == []


class TestAIImageGeneration:
    """Test AI image generation endpoint (may fail if API key not configured)"""
    
    def test_image_generate_endpoint_exists(self):
        """Image generation requires a valid Bearer token (partner portal sends one)."""
        response = requests.post(f"{BASE_URL}/api/images/generate", json={
            "prompt": "Test promotional image",
            "offer_type": "cafe"
        })
        assert response.status_code == 401
        assert "detail" in response.json()


class TestPortalRouting:
    """Test that portal routes are accessible"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
