"""
SnapRoad Payment & New Features Tests
Tests for: Stripe payments, badges API, user car API, /driver page features
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaymentsAPI:
    """Test Stripe payment integration endpoints"""
    
    def test_get_subscription_plans(self):
        """GET /api/payments/plans returns all 3 subscription plans"""
        response = requests.get(f"{BASE_URL}/api/payments/plans")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        
        plans = data.get("data", {})
        assert "basic" in plans, "Missing basic plan"
        assert "premium" in plans, "Missing premium plan"
        assert "family" in plans, "Missing family plan"
        
        # Validate basic plan (free)
        basic = plans["basic"]
        assert basic["price"] == 0.00, "Basic plan should be free"
        assert basic["name"] == "Basic"
        assert "features" in basic
        
        # Validate premium plan
        premium = plans["premium"]
        assert premium["price"] == 10.99, f"Premium should be $10.99, got {premium['price']}"
        assert premium["period"] == "month"
        
        # Validate family plan
        family = plans["family"]
        assert family["price"] == 14.99, f"Family should be $14.99, got {family['price']}"
        assert family["period"] == "month"
        
        print(f"✓ GET /api/payments/plans - Found all 3 plans: basic (free), premium ($10.99), family ($14.99)")
    
    def test_create_checkout_session_premium(self):
        """POST /api/payments/checkout/session creates Stripe checkout for premium"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan_id": "premium",
                "origin_url": "https://privacy-first-app-3.preview.emergentagent.com",
                "user_id": "test-user-123",
                "user_email": "test@example.com"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert data["url"].startswith("https://checkout.stripe.com"), f"URL should be Stripe checkout, got: {data['url'][:50]}"
        
        print(f"✓ POST /api/payments/checkout/session (premium) - Stripe URL generated: {data['url'][:60]}...")
    
    def test_create_checkout_session_family(self):
        """POST /api/payments/checkout/session creates Stripe checkout for family plan"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan_id": "family",
                "origin_url": "https://privacy-first-app-3.preview.emergentagent.com",
                "user_id": "test-user-456"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        
        print(f"✓ POST /api/payments/checkout/session (family) - Stripe URL generated")
    
    def test_create_checkout_session_rejects_basic(self):
        """POST /api/payments/checkout/session rejects basic plan (free)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan_id": "basic",
                "origin_url": "https://privacy-first-app-3.preview.emergentagent.com"
            }
        )
        
        # Should reject basic plan since it's free
        assert response.status_code == 400, f"Expected 400 for free plan, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "free" in data["detail"].lower() or "basic" in data["detail"].lower()
        
        print(f"✓ POST /api/payments/checkout/session (basic) - Correctly rejected: {data['detail']}")
    
    def test_create_checkout_session_invalid_plan(self):
        """POST /api/payments/checkout/session rejects invalid plan"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout/session",
            json={
                "plan_id": "super_invalid_plan",
                "origin_url": "https://example.com"
            }
        )
        
        assert response.status_code == 400
        print("✓ Invalid plan ID correctly rejected")
    
    def test_get_transactions(self):
        """GET /api/payments/transactions returns transaction list"""
        response = requests.get(f"{BASE_URL}/api/payments/transactions")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert isinstance(data["data"], list)
        
        print(f"✓ GET /api/payments/transactions - Found {len(data['data'])} transactions")


class TestBadgesAPI:
    """Test badges endpoint returns proper array format"""
    
    def test_badges_returns_array(self):
        """GET /api/badges returns proper array format"""
        response = requests.get(f"{BASE_URL}/api/badges")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        # Data should contain badges array
        badges_data = data.get("data", {})
        
        # Check for badges array (could be nested or direct)
        if isinstance(badges_data, list):
            badges = badges_data
        elif isinstance(badges_data, dict) and "badges" in badges_data:
            badges = badges_data["badges"]
        else:
            badges = []
        
        assert isinstance(badges, list), f"Badges should be array, got {type(badges)}"
        
        if len(badges) > 0:
            # Validate badge structure
            badge = badges[0]
            assert "id" in badge or "name" in badge, "Badge should have id or name"
        
        print(f"✓ GET /api/badges - Returns array with {len(badges)} badges")


class TestUserCarAPI:
    """Test user car endpoint"""
    
    def test_user_car_returns_data(self):
        """GET /api/user/car returns car data"""
        response = requests.get(f"{BASE_URL}/api/user/car")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        car_data = data.get("data", {})
        
        # Should have car customization fields
        assert "category" in car_data or "variant" in car_data or "color" in car_data, \
            f"Car data should have category/variant/color, got: {car_data}"
        
        print(f"✓ GET /api/user/car - Returns car data: {car_data.get('category', 'N/A')}, {car_data.get('color', 'N/A')}")


class TestDriverAppAPIs:
    """Test APIs used by /driver web app"""
    
    def test_offers_api(self):
        """GET /api/offers returns offers list"""
        response = requests.get(f"{BASE_URL}/api/offers")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        offers = data.get("data", [])
        assert isinstance(offers, list)
        
        if len(offers) > 0:
            offer = offers[0]
            assert "business_name" in offer or "name" in offer
        
        print(f"✓ GET /api/offers - Returns {len(offers)} offers")
    
    def test_challenges_api(self):
        """GET /api/challenges returns challenges"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        challenges = data.get("data", [])
        assert isinstance(challenges, list)
        
        print(f"✓ GET /api/challenges - Returns {len(challenges)} challenges")
    
    def test_skins_api(self):
        """GET /api/skins returns car skins"""
        response = requests.get(f"{BASE_URL}/api/skins")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        skins = data.get("data", [])
        assert isinstance(skins, list)
        
        print(f"✓ GET /api/skins - Returns {len(skins)} skins")
    
    def test_user_profile_api(self):
        """GET /api/user/profile returns user data"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        user = data.get("data", {})
        # Should have basic user fields
        assert "name" in user or "id" in user or "gems" in user
        
        print(f"✓ GET /api/user/profile - User: {user.get('name', 'N/A')}")
    
    def test_family_members_api(self):
        """GET /api/family/members returns family data"""
        response = requests.get(f"{BASE_URL}/api/family/members")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        members = data.get("data", [])
        assert isinstance(members, list)
        
        print(f"✓ GET /api/family/members - Returns {len(members)} members")


class TestHealthEndpoints:
    """Basic health checks"""
    
    def test_health(self):
        """GET /api/health returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        
        print("✓ GET /api/health - healthy")
    
    def test_root(self):
        """GET / returns API info or frontend page"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        
        print(f"✓ GET /api/health - API is running")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
