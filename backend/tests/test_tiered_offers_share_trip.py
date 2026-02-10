"""
Test Suite for Tiered Offers System and Share Trip Score Features
Tests:
- Plan Selection (Basic vs Premium)
- Tiered Offers with correct discounts (6% Basic, 18% Premium)
- Offer redemption functionality
- Share Trip Score endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://navgame-app.preview.emergentagent.com')


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "snaproad-api"
        print("✓ API health check passed")


class TestPlanSelection:
    """Test Plan Selection onboarding flow"""
    
    def test_get_pricing_config(self):
        """Test pricing configuration endpoint"""
        response = requests.get(f"{BASE_URL}/api/pricing")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        pricing = data["data"]
        assert "founders_price" in pricing
        assert "public_price" in pricing
        assert "is_founders_active" in pricing
        assert pricing["founders_price"] == 10.99
        assert pricing["public_price"] == 16.99
        print(f"✓ Pricing config: Founders ${pricing['founders_price']}, Public ${pricing['public_price']}")
    
    def test_get_onboarding_status(self):
        """Test onboarding status endpoint"""
        response = requests.get(f"{BASE_URL}/api/user/onboarding-status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        status = data["data"]
        assert "onboarding_complete" in status
        assert "plan_selected" in status
        assert "car_selected" in status
        print(f"✓ Onboarding status: complete={status['onboarding_complete']}, plan={status['plan_selected']}, car={status['car_selected']}")
    
    def test_select_basic_plan(self):
        """Test selecting Basic plan"""
        response = requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "basic"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Basic plan selection works")
    
    def test_select_premium_plan(self):
        """Test selecting Premium plan"""
        response = requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "premium"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Premium plan selection works")


class TestTieredOffers:
    """Test Tiered Offers System"""
    
    def test_get_offers_returns_5_seed_offers(self):
        """Test that offers endpoint returns 5 seed offers"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        offers = data["data"]
        assert len(offers) >= 5, f"Expected at least 5 offers, got {len(offers)}"
        print(f"✓ Offers endpoint returns {len(offers)} offers")
    
    def test_offers_have_required_fields(self):
        """Test that offers have all required fields"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        offers = data["data"]
        
        required_fields = ["id", "business_name", "business_type", "description", 
                          "discount_percent", "gems_reward", "lat", "lng", 
                          "expires_at", "is_admin_offer", "redeemed"]
        
        for offer in offers:
            for field in required_fields:
                assert field in offer, f"Missing field '{field}' in offer {offer.get('id')}"
        print("✓ All offers have required fields")
    
    def test_offers_discount_info_returned(self):
        """Test that discount info is returned with offers"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        assert "discount_info" in data
        discount_info = data["discount_info"]
        assert discount_info["free_discount"] == 6
        assert discount_info["premium_discount"] == 18
        print(f"✓ Discount info: Basic={discount_info['free_discount']}%, Premium={discount_info['premium_discount']}%")
    
    def test_basic_user_gets_6_percent_discount(self):
        """Test that Basic users get 6% discount on non-admin offers"""
        # First set user to basic plan
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "basic"})
        
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        offers = data["data"]
        
        # Check non-admin offers have 6% discount
        non_admin_offers = [o for o in offers if not o["is_admin_offer"]]
        for offer in non_admin_offers:
            assert offer["discount_percent"] == 6, f"Expected 6% for basic user, got {offer['discount_percent']}%"
        print(f"✓ Basic user gets 6% discount on {len(non_admin_offers)} non-admin offers")
    
    def test_admin_offers_give_18_percent_to_all(self):
        """Test that admin offers give 18% discount to all users"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        offers = data["data"]
        
        admin_offers = [o for o in offers if o["is_admin_offer"]]
        for offer in admin_offers:
            assert offer["discount_percent"] == 18, f"Expected 18% for admin offer, got {offer['discount_percent']}%"
        print(f"✓ Admin offers ({len(admin_offers)}) give 18% discount to all users")
    
    def test_premium_user_gets_18_percent_discount(self):
        """Test that Premium users get 18% discount on all offers"""
        # Set user to premium plan
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "premium"})
        
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        offers = data["data"]
        
        # All offers should have 18% discount for premium users
        for offer in offers:
            assert offer["discount_percent"] == 18, f"Expected 18% for premium user, got {offer['discount_percent']}%"
        print(f"✓ Premium user gets 18% discount on all {len(offers)} offers")
        
        # Reset to basic for other tests
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "basic"})
    
    def test_offer_business_types(self):
        """Test that offers have correct business types"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        offers = data["data"]
        
        valid_types = ["gas", "cafe", "carwash", "restaurant"]
        for offer in offers:
            assert offer["business_type"] in valid_types, f"Invalid business type: {offer['business_type']}"
        print(f"✓ All offers have valid business types")


class TestOfferRedemption:
    """Test Offer Redemption functionality"""
    
    def test_redeem_offer_success(self):
        """Test successful offer redemption"""
        # First get offers to find one that's not redeemed
        response = requests.get(f"{BASE_URL}/api/offers")
        offers = response.json()["data"]
        
        # Find an unredeemed offer (use offer 2 since 1 was redeemed in earlier test)
        unredeemed = next((o for o in offers if not o["redeemed"] and o["id"] != 1), None)
        
        if unredeemed:
            response = requests.post(f"{BASE_URL}/api/offers/{unredeemed['id']}/redeem")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "data" in data
            result = data["data"]
            assert "redemption_code" in result
            assert "discount_percent" in result
            assert "gems_earned" in result
            assert "xp_earned" in result
            print(f"✓ Offer {unredeemed['id']} redeemed: +{result['gems_earned']} gems, +{result['xp_earned']} XP")
        else:
            print("⚠ No unredeemed offers available for testing")
    
    def test_redeem_already_redeemed_offer_fails(self):
        """Test that redeeming an already redeemed offer fails"""
        # First redeem an offer
        response = requests.post(f"{BASE_URL}/api/offers/3/redeem")
        first_data = response.json()
        
        # Try to redeem the same offer again
        response = requests.post(f"{BASE_URL}/api/offers/3/redeem")
        data = response.json()
        # Should fail because already redeemed
        assert data["success"] == False, f"Expected failure for double redemption, got: {data}"
        assert "Already redeemed" in data.get("message", "")
        print("✓ Cannot redeem already redeemed offer")
    
    def test_redeem_nonexistent_offer_fails(self):
        """Test that redeeming a non-existent offer fails"""
        response = requests.post(f"{BASE_URL}/api/offers/99999/redeem")
        data = response.json()
        assert data["success"] == False
        print("✓ Cannot redeem non-existent offer")


class TestShareTripScore:
    """Test Share Trip Score functionality"""
    
    def test_share_trip_endpoint_exists(self):
        """Test that share trip endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/trips/1/share")
        # Should return 200 even if trip doesn't exist (mock data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Share trip endpoint works")
    
    def test_user_profile_has_trip_stats(self):
        """Test that user profile has trip stats for sharing"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        data = response.json()
        assert data["success"] == True
        user = data["data"]
        
        # Check for stats needed for sharing
        assert "safety_score" in user
        assert "gems" in user
        assert "level" in user
        assert "total_trips" in user
        assert "total_miles" in user
        print(f"✓ User profile has trip stats: score={user['safety_score']}, trips={user['total_trips']}")


class TestGemMultiplier:
    """Test Gem Multiplier based on plan"""
    
    def test_basic_user_has_1x_multiplier(self):
        """Test that Basic users have 1x gem multiplier"""
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "basic"})
        
        response = requests.get(f"{BASE_URL}/api/user/profile")
        data = response.json()
        user = data["data"]
        assert user["gem_multiplier"] == 1
        print("✓ Basic user has 1x gem multiplier")
    
    def test_premium_user_has_2x_multiplier(self):
        """Test that Premium users have 2x gem multiplier"""
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "premium"})
        
        response = requests.get(f"{BASE_URL}/api/user/profile")
        data = response.json()
        user = data["data"]
        assert user["gem_multiplier"] == 2
        print("✓ Premium user has 2x gem multiplier")
        
        # Reset to basic
        requests.post(f"{BASE_URL}/api/user/plan", json={"plan": "basic"})


class TestCarOnboarding:
    """Test Car Selection onboarding"""
    
    def test_get_user_car(self):
        """Test getting user's car configuration"""
        response = requests.get(f"{BASE_URL}/api/user/car")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        car = data["data"]
        assert "category" in car
        assert "variant" in car
        assert "color" in car
        print(f"✓ User car: {car['category']}/{car['variant']} in {car['color']}")
    
    def test_update_user_car(self):
        """Test updating user's car configuration"""
        response = requests.post(f"{BASE_URL}/api/user/car", json={
            "category": "suv",
            "variant": "suv-classic",
            "color": "racing-red"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ User car updated successfully")
        
        # Reset to default
        requests.post(f"{BASE_URL}/api/user/car", json={
            "category": "sedan",
            "variant": "sedan-classic",
            "color": "midnight-black"
        })


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
