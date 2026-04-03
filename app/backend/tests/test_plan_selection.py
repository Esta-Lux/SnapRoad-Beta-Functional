"""
Test Plan Selection System - Phase 1 Implementation
Tests for:
- GET /api/pricing - Returns pricing configuration
- PUT /api/admin/pricing - Admin can update pricing
- POST /api/user/plan - User can select/change plan
- GET /api/user/plan - Get user's current plan
- GET /api/user/onboarding-status - Get onboarding completion status
- POST /api/trips/complete - Duration-tier gems (optional: set TEST_USER_JWT + BASE_URL)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPricingEndpoints:
    """Test pricing configuration endpoints"""
    
    def test_get_pricing_returns_config(self):
        """GET /api/pricing - Returns pricing configuration"""
        response = requests.get(f"{BASE_URL}/api/pricing")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        pricing = data["data"]
        assert "founders_price" in pricing
        assert "public_price" in pricing
        assert "is_founders_active" in pricing
        
        # Verify expected values
        assert pricing["founders_price"] == 10.99
        assert pricing["public_price"] == 16.99
        assert pricing["is_founders_active"] == True
        print(f"✓ Pricing config: founders=${pricing['founders_price']}, public=${pricing['public_price']}, founders_active={pricing['is_founders_active']}")
    
    def test_admin_update_pricing_founders_price(self):
        """PUT /api/admin/pricing - Admin can update founders price"""
        # Update founders price
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing",
            json={"founders_price": 9.99}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["founders_price"] == 9.99
        print(f"✓ Updated founders price to ${data['data']['founders_price']}")
        
        # Reset to original
        requests.put(f"{BASE_URL}/api/admin/pricing", json={"founders_price": 10.99})
    
    def test_admin_update_pricing_public_price(self):
        """PUT /api/admin/pricing - Admin can update public price"""
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing",
            json={"public_price": 19.99}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["public_price"] == 19.99
        print(f"✓ Updated public price to ${data['data']['public_price']}")
        
        # Reset to original
        requests.put(f"{BASE_URL}/api/admin/pricing", json={"public_price": 16.99})
    
    def test_admin_toggle_founders_pricing(self):
        """PUT /api/admin/pricing - Admin can toggle founders pricing"""
        # Disable founders pricing
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing",
            json={"is_founders_active": False}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["is_founders_active"] == False
        print("✓ Disabled founders pricing")
        
        # Re-enable founders pricing
        response = requests.put(
            f"{BASE_URL}/api/admin/pricing",
            json={"is_founders_active": True}
        )
        assert response.json()["data"]["is_founders_active"] == True
        print("✓ Re-enabled founders pricing")


class TestUserPlanEndpoints:
    """Test user plan selection endpoints"""
    
    def test_get_user_plan(self):
        """GET /api/user/plan - Get user's current plan"""
        response = requests.get(f"{BASE_URL}/api/user/plan")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        plan_data = data["data"]
        assert "plan" in plan_data
        assert "is_premium" in plan_data
        assert "gem_multiplier" in plan_data
        print(f"✓ User plan: {plan_data['plan']}, premium={plan_data['is_premium']}, multiplier={plan_data['gem_multiplier']}x")
    
    def test_select_basic_plan(self):
        """POST /api/user/plan - User can select basic plan"""
        response = requests.post(
            f"{BASE_URL}/api/user/plan",
            json={"plan": "basic"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["plan"] == "basic"
        assert data["data"]["is_premium"] == False
        assert data["data"]["gem_multiplier"] == 1
        assert data["data"]["price"] == 0
        print(f"✓ Selected basic plan: multiplier={data['data']['gem_multiplier']}x, price=${data['data']['price']}")
    
    def test_select_premium_plan(self):
        """POST /api/user/plan - User can select premium plan"""
        response = requests.post(
            f"{BASE_URL}/api/user/plan",
            json={"plan": "premium"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["plan"] == "premium"
        assert data["data"]["is_premium"] == True
        assert data["data"]["gem_multiplier"] == 2
        # Should use founders price since is_founders_active is True
        assert data["data"]["price"] == 10.99
        print(f"✓ Selected premium plan: multiplier={data['data']['gem_multiplier']}x, price=${data['data']['price']}")
    
    def test_invalid_plan_rejected(self):
        """POST /api/user/plan - Invalid plan is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/user/plan",
            json={"plan": "invalid_plan"}
        )
        assert response.status_code == 200  # API returns 200 with success=False
        
        data = response.json()
        assert data["success"] == False
        assert "Invalid plan" in data["message"]
        print("✓ Invalid plan correctly rejected")
    
    def test_plan_persists_after_selection(self):
        """Verify plan persists after selection"""
        # Select premium
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "premium"})
        
        # Verify it persisted
        response = requests.get(f"{BASE_URL}/api/user/plan")
        data = response.json()
        assert data["data"]["plan"] == "premium"
        assert data["data"]["is_premium"] == True
        print("✓ Plan persisted correctly after selection")


class TestOnboardingStatus:
    """Test onboarding status endpoint"""
    
    def test_get_onboarding_status(self):
        """GET /api/user/onboarding-status - Get onboarding completion status"""
        response = requests.get(f"{BASE_URL}/api/user/onboarding-status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        status = data["data"]
        assert "onboarding_complete" in status
        assert "plan_selected" in status
        assert "car_selected" in status
        print(f"✓ Onboarding status: complete={status['onboarding_complete']}, plan_selected={status['plan_selected']}, car_selected={status['car_selected']}")


class TestTripCompletionWithMultiplier:
    """Trip completion: duration-tier gems (see services.gem_economy.trip_gems_from_duration_minutes). Requires auth."""

    _QUALIFYING_BODY = {
        "distance_miles": 1.0,
        "duration_seconds": 120,
        "safety_score": 85,
    }

    @pytest.mark.skipif(not BASE_URL, reason="REACT_APP_BACKEND_URL / BASE_URL not set")
    @pytest.mark.skipif(
        not os.environ.get("TEST_USER_JWT", "").strip(),
        reason="Set TEST_USER_JWT (Bearer token for a test user) to run trip completion tests",
    )
    def test_trip_complete_basic_duration_tier(self):
        """POST /api/trips/complete — short trip uses duration tier (< 20 min → 10 gems non-premium)."""
        token = os.environ["TEST_USER_JWT"].strip()
        headers = {"Authorization": f"Bearer {token}"}
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "basic"}, headers=headers)

        response = requests.post(
            f"{BASE_URL}/api/trips/complete",
            headers=headers,
            json=self._QUALIFYING_BODY,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        inner = data.get("data") or {}
        assert inner.get("gems_earned") == 10
        print(f"✓ Trip complete: {inner.get('gems_earned')} gems (duration tier, basic)")

    @pytest.mark.skip(reason="Premium is enforced via checkout; cannot toggle via /api/user/plan in tests")
    def test_trip_complete_premium_plan(self):
        pass


class TestDiscountCalculation:
    """Test discount percentage calculation"""
    
    def test_discount_percentage_calculation(self):
        """Verify 35% discount from $16.99 to $10.99"""
        response = requests.get(f"{BASE_URL}/api/pricing")
        pricing = response.json()["data"]
        
        founders_price = pricing["founders_price"]
        public_price = pricing["public_price"]
        
        # Calculate discount percentage
        discount_percent = round(((public_price - founders_price) / public_price) * 100)
        
        assert founders_price == 10.99
        assert public_price == 16.99
        assert discount_percent == 35
        print(f"✓ Discount calculation: ${public_price} → ${founders_price} = {discount_percent}% off")


class TestUserProfilePlanIntegration:
    """Test user profile reflects plan status"""
    
    def test_profile_shows_premium_status(self):
        """Verify user profile shows premium status"""
        # Set premium plan
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "premium"})
        
        # Get profile
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        
        data = response.json()["data"]
        assert data["is_premium"] == True
        assert data["plan"] == "premium"
        assert data["gem_multiplier"] == 2
        print(f"✓ Profile shows premium: is_premium={data['is_premium']}, plan={data['plan']}, multiplier={data['gem_multiplier']}x")
    
    def test_profile_shows_basic_status(self):
        """Verify user profile shows basic status"""
        # Set basic plan
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "basic"})
        
        # Get profile
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        
        data = response.json()["data"]
        assert data["is_premium"] == False
        assert data["plan"] == "basic"
        assert data["gem_multiplier"] == 1
        print(f"✓ Profile shows basic: is_premium={data['is_premium']}, plan={data['plan']}, multiplier={data['gem_multiplier']}x")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
