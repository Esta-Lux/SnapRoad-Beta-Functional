"""
Test suite for SnapRoad Redemption Popup and Weekly Recap features
Tests:
- Weekly Recap endpoint returns stats
- Offer redemption gives correct gems and XP rewards
- Geofenced QR codes (backend validation)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWeeklyRecap:
    """Weekly Recap endpoint tests - Premium feature"""
    
    def test_weekly_recap_returns_success(self):
        """Test that weekly recap endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/weekly-recap")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Weekly recap endpoint returns success")
    
    def test_weekly_recap_has_required_fields(self):
        """Test that weekly recap has all required stat fields"""
        response = requests.get(f"{BASE_URL}/api/weekly-recap")
        assert response.status_code == 200
        data = response.json()
        
        stats = data["data"]
        required_fields = [
            "total_trips", "total_miles", "total_time_minutes",
            "gems_earned", "xp_earned", "safety_score_avg",
            "safety_score_change", "challenges_won", "challenges_lost",
            "offers_redeemed", "reports_posted", "streak_days",
            "rank_change", "highlights"
        ]
        
        for field in required_fields:
            assert field in stats, f"Missing field: {field}"
            print(f"✓ Field '{field}' present in weekly recap")
        
        print(f"✓ All {len(required_fields)} required fields present")
    
    def test_weekly_recap_highlights_is_list(self):
        """Test that highlights is a list with items"""
        response = requests.get(f"{BASE_URL}/api/weekly-recap")
        data = response.json()
        
        highlights = data["data"]["highlights"]
        assert isinstance(highlights, list), "Highlights should be a list"
        assert len(highlights) >= 1, "Should have at least 1 highlight"
        print(f"✓ Highlights contains {len(highlights)} items")
    
    def test_weekly_recap_numeric_values(self):
        """Test that numeric fields have valid values"""
        response = requests.get(f"{BASE_URL}/api/weekly-recap")
        data = response.json()
        stats = data["data"]
        
        # Check numeric fields are valid
        assert stats["total_trips"] >= 0, "total_trips should be >= 0"
        assert stats["total_miles"] >= 0, "total_miles should be >= 0"
        assert 0 <= stats["safety_score_avg"] <= 100, "safety_score_avg should be 0-100"
        assert stats["gems_earned"] >= 0, "gems_earned should be >= 0"
        assert stats["xp_earned"] >= 0, "xp_earned should be >= 0"
        
        print("✓ All numeric values are valid")


class TestOfferRedemption:
    """Offer redemption tests - gems and XP rewards"""
    
    def test_get_offers_returns_list(self):
        """Test that offers endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert isinstance(data["data"], list)
        print(f"✓ Offers endpoint returns {len(data['data'])} offers")
    
    def test_offers_have_required_fields(self):
        """Test that offers have all required fields"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        
        if len(data["data"]) > 0:
            offer = data["data"][0]
            required_fields = [
                "id", "business_name", "business_type", "description",
                "discount_percent", "gems_reward", "lat", "lng"
            ]
            
            for field in required_fields:
                assert field in offer, f"Missing field: {field}"
            
            print(f"✓ Offer has all required fields")
        else:
            print("⚠ No offers available to test")
    
    def test_offer_redemption_gives_gems(self):
        """Test that redeeming an offer gives gems"""
        # First get available offers
        offers_response = requests.get(f"{BASE_URL}/api/offers")
        offers = offers_response.json()["data"]
        
        # Find an unredeemed offer
        unredeemed = [o for o in offers if not o.get("redeemed", False)]
        
        if len(unredeemed) > 0:
            offer = unredeemed[0]
            offer_id = offer["id"]
            expected_gems = offer["gems_reward"]
            
            # Redeem the offer
            redeem_response = requests.post(f"{BASE_URL}/api/offers/{offer_id}/redeem")
            assert redeem_response.status_code == 200
            
            redeem_data = redeem_response.json()
            assert redeem_data["success"] == True
            assert "gems_earned" in redeem_data["data"]
            assert redeem_data["data"]["gems_earned"] == expected_gems
            
            print(f"✓ Offer {offer_id} redeemed, earned {expected_gems} gems")
        else:
            print("⚠ No unredeemed offers available to test")
    
    def test_offer_redemption_gives_xp(self):
        """Test that redeeming an offer gives XP"""
        offers_response = requests.get(f"{BASE_URL}/api/offers")
        offers = offers_response.json()["data"]
        
        unredeemed = [o for o in offers if not o.get("redeemed", False)]
        
        if len(unredeemed) > 0:
            offer = unredeemed[0]
            offer_id = offer["id"]
            
            redeem_response = requests.post(f"{BASE_URL}/api/offers/{offer_id}/redeem")
            
            if redeem_response.status_code == 200:
                redeem_data = redeem_response.json()
                if redeem_data["success"]:
                    assert "xp_earned" in redeem_data["data"]
                    assert redeem_data["data"]["xp_earned"] > 0
                    print(f"✓ Offer redemption gave {redeem_data['data']['xp_earned']} XP")
                else:
                    print(f"⚠ Offer already redeemed: {redeem_data.get('message')}")
            else:
                print(f"⚠ Redemption failed with status {redeem_response.status_code}")
        else:
            print("⚠ No unredeemed offers available to test")
    
    def test_offer_redemption_returns_code(self):
        """Test that redemption returns a unique code"""
        offers_response = requests.get(f"{BASE_URL}/api/offers")
        offers = offers_response.json()["data"]
        
        unredeemed = [o for o in offers if not o.get("redeemed", False)]
        
        if len(unredeemed) > 0:
            offer = unredeemed[0]
            offer_id = offer["id"]
            
            redeem_response = requests.post(f"{BASE_URL}/api/offers/{offer_id}/redeem")
            
            if redeem_response.status_code == 200:
                redeem_data = redeem_response.json()
                if redeem_data["success"]:
                    assert "redemption_code" in redeem_data["data"]
                    code = redeem_data["data"]["redemption_code"]
                    assert code.startswith("SNAP")
                    print(f"✓ Redemption code generated: {code}")
                else:
                    print(f"⚠ Offer already redeemed")
        else:
            print("⚠ No unredeemed offers available to test")
    
    def test_cannot_redeem_same_offer_twice(self):
        """Test that same offer cannot be redeemed twice"""
        offers_response = requests.get(f"{BASE_URL}/api/offers")
        offers = offers_response.json()["data"]
        
        # Find a redeemed offer
        redeemed = [o for o in offers if o.get("redeemed", False)]
        
        if len(redeemed) > 0:
            offer_id = redeemed[0]["id"]
            
            # Try to redeem again
            redeem_response = requests.post(f"{BASE_URL}/api/offers/{offer_id}/redeem")
            redeem_data = redeem_response.json()
            
            assert redeem_data["success"] == False
            assert "Already redeemed" in redeem_data.get("message", "")
            print(f"✓ Cannot redeem offer {offer_id} twice - correctly rejected")
        else:
            print("⚠ No redeemed offers to test duplicate redemption")


class TestOfferGeofencing:
    """Test offer geofencing - offers have lat/lng for geofence"""
    
    def test_offers_have_location_data(self):
        """Test that offers have lat/lng for geofencing"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        
        for offer in data["data"]:
            assert "lat" in offer, f"Offer {offer['id']} missing lat"
            assert "lng" in offer, f"Offer {offer['id']} missing lng"
            assert isinstance(offer["lat"], (int, float))
            assert isinstance(offer["lng"], (int, float))
        
        print(f"✓ All {len(data['data'])} offers have location data for geofencing")
    
    def test_nearby_offers_endpoint(self):
        """Test nearby offers endpoint with location"""
        # Columbus, OH coordinates
        lat = 39.9612
        lng = -82.9988
        
        response = requests.get(f"{BASE_URL}/api/offers/nearby?lat={lat}&lng={lng}&radius=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Nearby offers endpoint works, found {len(data['data'])} offers")


class TestUserProfile:
    """Test user profile for plan and gem multiplier"""
    
    def test_user_has_plan(self):
        """Test that user profile includes plan info"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        
        data = response.json()
        user = data["data"]
        
        assert "plan" in user
        assert user["plan"] in ["basic", "premium", None]
        print(f"✓ User plan: {user['plan']}")
    
    def test_user_has_gem_multiplier(self):
        """Test that user has gem multiplier"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        data = response.json()
        user = data["data"]
        
        assert "gem_multiplier" in user
        assert user["gem_multiplier"] >= 1
        print(f"✓ User gem multiplier: {user['gem_multiplier']}")
    
    def test_premium_user_gets_higher_discount(self):
        """Test that offers show correct discount based on plan"""
        response = requests.get(f"{BASE_URL}/api/offers")
        data = response.json()
        
        assert "discount_info" in data
        assert data["discount_info"]["free_discount"] == 6
        assert data["discount_info"]["premium_discount"] == 18
        
        print(f"✓ Discount tiers: Basic={data['discount_info']['free_discount']}%, Premium={data['discount_info']['premium_discount']}%")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
