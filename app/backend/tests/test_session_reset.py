"""
Test Session Reset and Auth Endpoints for SnapRoad
Tests the P0 fix: User state reset for clean testing
"""
import pytest
import requests

from tests.http_integration import INTEGRATION_BASE_URL as BASE_URL

class TestSessionReset:
    """Test session reset functionality for clean user state"""
    
    def test_session_reset_endpoint(self):
        """Test POST /api/session/reset resets user to fresh state"""
        response = requests.post(f"{BASE_URL}/api/session/reset")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["message"] == "User state reset to fresh"
        assert data["data"]["gems"] == 0
        assert data["data"]["level"] == 1
        assert data["data"]["xp"] == 0
        assert data["data"]["redeemed_offers"] == []
        assert data["data"]["onboarding_complete"] == False
        print("✓ Session reset endpoint returns fresh user state")
    
    def test_login_driver_resets_state(self):
        """Test POST /api/auth/login?role=driver resets driver state"""
        response = requests.post(f"{BASE_URL}/api/auth/login?role=driver")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["role"] == "driver"
        assert data["data"]["fresh_state"] == True
        print("✓ Driver login returns fresh_state=True")
    
    def test_login_partner_no_reset(self):
        """Test POST /api/auth/login?role=partner does not reset state"""
        response = requests.post(f"{BASE_URL}/api/auth/login?role=partner")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["role"] == "partner"
        # Partner login should not have fresh_state flag
        assert data["data"].get("fresh_state", False) == False
        print("✓ Partner login does not reset state")
    
    def test_login_admin_no_reset(self):
        """Test POST /api/auth/login?role=admin does not reset state"""
        response = requests.post(f"{BASE_URL}/api/auth/login?role=admin")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["role"] == "admin"
        # Admin login should not have fresh_state flag
        assert data["data"].get("fresh_state", False) == False
        print("✓ Admin login does not reset state")
    
    def test_user_profile_after_reset(self):
        """Test user profile shows fresh state after reset"""
        # First reset the session
        requests.post(f"{BASE_URL}/api/session/reset")
        
        # Then get user profile
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        user = data["data"]
        
        # Verify fresh user state
        assert user["gems"] == 0
        assert user["level"] == 1
        assert user["xp"] == 0
        assert user["total_miles"] == 0
        assert user["total_trips"] == 0
        assert user["badges_earned"] == []
        assert user["redeemed_offers"] == []
        assert user["onboarding_complete"] == False
        assert user["plan_selected"] == False
        print("✓ User profile shows fresh state after reset")


class TestHealthEndpoint:
    """Test health endpoint"""
    
    def test_health_check(self):
        """Test GET /api/health returns ok status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "snaproad-api"
        print("✓ Health endpoint returns ok status")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
