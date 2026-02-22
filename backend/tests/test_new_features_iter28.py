"""
SnapRoad API Tests - Iteration 28
Testing: Bulk offer upload, Gems on route, Offer redemption, On-route offers, Offers with address/offer_url
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://snaproad-driver-1.preview.emergentagent.com').rstrip('/')


class TestHealthAndBasicAPIs:
    """Test health endpoint and basic API access"""
    
    def test_health_endpoint(self):
        """GET /api/health returns ok"""
        res = requests.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        print(f"✓ Health check passed: {data}")
    
    def test_driver_login(self):
        """POST /api/auth/login with driver credentials"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@snaproad.com",
            "password": "password123"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Driver login successful: user_id={data['data'].get('user_id')}")


class TestBulkOfferUpload:
    """Test POST /api/admin/offers/bulk - bulk upload multiple offers"""
    
    def test_bulk_upload_single_offer(self):
        """Upload a single offer via bulk endpoint"""
        unique_id = str(uuid.uuid4())[:8]
        offers = [{
            "business_name": f"TEST_Groupon_Pizza_{unique_id}",
            "address": "123 Test St, Columbus, OH 43201",
            "offer_url": "https://www.groupon.com/deals/test-pizza",
            "description": "50% off large pizza - Test offer",
            "business_type": "restaurant",
            "base_gems": 50,
            "expires_days": 14
        }]
        res = requests.post(f"{BASE_URL}/api/admin/offers/bulk", json={"offers": offers})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        assert "data" in data
        assert len(data["data"]) == 1
        assert data["data"][0]["business_name"] == offers[0]["business_name"]
        print(f"✓ Single bulk upload successful: {data['data']}")
    
    def test_bulk_upload_multiple_offers(self):
        """Upload multiple offers at once"""
        unique_id = str(uuid.uuid4())[:8]
        offers = [
            {
                "business_name": f"TEST_Groupon_Spa_{unique_id}",
                "address": "456 Spa Blvd, Columbus, OH 43215",
                "offer_url": "https://www.groupon.com/deals/spa-retreat",
                "description": "60-min massage $39 - Groupon",
                "business_type": "service",
                "base_gems": 40,
                "expires_days": 21
            },
            {
                "business_name": f"TEST_Local_Auto_{unique_id}",
                "address": "789 Auto Lane, Columbus, OH 43201",
                "offer_url": None,  # Local offer without URL
                "description": "Free oil change with purchase",
                "business_type": "auto",
                "base_gems": 30,
                "expires_days": 7
            }
        ]
        res = requests.post(f"{BASE_URL}/api/admin/offers/bulk", json={"offers": offers})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        assert len(data["data"]) == 2
        print(f"✓ Multiple bulk upload successful: {len(data['data'])} offers created")
    
    def test_bulk_upload_with_all_fields(self):
        """Verify bulk upload includes business_name, address, offer_url"""
        unique_id = str(uuid.uuid4())[:8]
        test_offer = {
            "business_name": f"TEST_Full_Fields_{unique_id}",
            "address": "999 Full St, Columbus, OH 43201",
            "offer_url": "https://example.com/full-deal",
            "description": "Test offer with all fields",
            "business_type": "cafe",
            "base_gems": 25,
            "lat": 39.965,
            "lng": -82.990,
            "expires_days": 30
        }
        res = requests.post(f"{BASE_URL}/api/admin/offers/bulk", json={"offers": [test_offer]})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        
        # Verify by fetching offers and checking the new one
        get_res = requests.get(f"{BASE_URL}/api/offers")
        offers = get_res.json().get("data", [])
        created = next((o for o in offers if test_offer["business_name"] in o.get("business_name", "")), None)
        assert created is not None, f"Created offer not found in /api/offers"
        assert "address" in created
        print(f"✓ Bulk uploaded offer has address field: {created.get('address')}")


class TestGemsOnRoute:
    """Test gem generation, collection, and trip summary"""
    
    def test_generate_route_gems(self):
        """POST /api/gems/generate-route - generate gems along a route"""
        trip_id = f"test_trip_{uuid.uuid4().hex[:8]}"
        route_points = [
            {"lat": 39.960, "lng": -82.998},
            {"lat": 39.961, "lng": -82.997},
            {"lat": 39.962, "lng": -82.996},
            {"lat": 39.963, "lng": -82.995},
            {"lat": 39.964, "lng": -82.994},
            {"lat": 39.965, "lng": -82.993},
            {"lat": 39.966, "lng": -82.992},
            {"lat": 39.967, "lng": -82.991},
            {"lat": 39.968, "lng": -82.990},
            {"lat": 39.969, "lng": -82.989}
        ]
        res = requests.post(f"{BASE_URL}/api/gems/generate-route", json={
            "trip_id": trip_id,
            "route_points": route_points
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        assert "data" in data
        assert data["data"]["trip_id"] == trip_id
        assert data["data"]["gems_count"] > 0
        assert "gems" in data["data"]
        gems = data["data"]["gems"]
        assert len(gems) > 0
        # Verify gem structure
        for gem in gems:
            assert "id" in gem
            assert "lat" in gem
            assert "lng" in gem
            assert "value" in gem
            assert "collected" in gem
            assert gem["collected"] == False
        print(f"✓ Generated {len(gems)} gems for trip {trip_id}")
        return trip_id, gems
    
    def test_collect_gem(self):
        """POST /api/gems/collect - collect a gem during driving"""
        # First generate gems
        trip_id = f"collect_trip_{uuid.uuid4().hex[:8]}"
        route_points = [{"lat": 39.960 + i*0.001, "lng": -82.998 - i*0.001} for i in range(10)]
        gen_res = requests.post(f"{BASE_URL}/api/gems/generate-route", json={
            "trip_id": trip_id,
            "route_points": route_points
        })
        assert gen_res.status_code == 200
        gems = gen_res.json()["data"]["gems"]
        assert len(gems) > 0
        
        # Collect first gem
        first_gem = gems[0]
        collect_res = requests.post(f"{BASE_URL}/api/gems/collect", json={
            "trip_id": trip_id,
            "gem_id": first_gem["id"]
        })
        assert collect_res.status_code == 200
        collect_data = collect_res.json()
        assert collect_data["success"] == True
        assert collect_data["data"]["gem_id"] == first_gem["id"]
        assert collect_data["data"]["value"] == first_gem["value"]
        print(f"✓ Collected gem {first_gem['id']} worth {first_gem['value']} gems")
        return trip_id, first_gem
    
    def test_trip_summary(self):
        """GET /api/gems/trip-summary/{trip_id} - gem summary at trip end"""
        # Generate and collect gems
        trip_id = f"summary_trip_{uuid.uuid4().hex[:8]}"
        route_points = [{"lat": 39.960 + i*0.001, "lng": -82.998 - i*0.001} for i in range(12)]
        gen_res = requests.post(f"{BASE_URL}/api/gems/generate-route", json={
            "trip_id": trip_id,
            "route_points": route_points
        })
        gems = gen_res.json()["data"]["gems"]
        
        # Collect some gems
        collected_value = 0
        for gem in gems[:3]:  # Collect first 3
            requests.post(f"{BASE_URL}/api/gems/collect", json={
                "trip_id": trip_id,
                "gem_id": gem["id"]
            })
            collected_value += gem["value"]
        
        # Get trip summary
        summary_res = requests.get(f"{BASE_URL}/api/gems/trip-summary/{trip_id}")
        assert summary_res.status_code == 200
        data = summary_res.json()
        assert data["success"] == True
        assert data["data"]["trip_id"] == trip_id
        assert data["data"]["gems_collected"] == 3
        assert data["data"]["gems_total"] == len(gems)
        assert data["data"]["gems_value"] == collected_value
        print(f"✓ Trip summary: {data['data']['gems_collected']}/{data['data']['gems_total']} gems collected, +{data['data']['gems_value']} value")


class TestOffersOnRoute:
    """Test GET /api/offers/on-route - auto-push offers to drivers"""
    
    def test_offers_on_route_basic(self):
        """Get offers along a simple route"""
        # Use coordinates near the seeded offers (Columbus OH area)
        route_lat = "39.96,39.958,39.955"
        route_lng = "-82.993,-83.002,-83.010"
        
        res = requests.get(f"{BASE_URL}/api/offers/on-route", params={
            "route_lat": route_lat,
            "route_lng": route_lng,
            "radius_km": 2.0
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        assert "data" in data
        # Should find some offers from seeded data
        offers = data["data"]
        print(f"✓ Found {len(offers)} offers on route")
        if len(offers) > 0:
            offer = offers[0]
            assert "business_name" in offer
            assert "address" in offer or offer.get("address") == ""  # May be empty but key should exist
            assert "distance_km" in offer
            print(f"  First offer: {offer.get('business_name')} at {offer.get('distance_km')}km")
    
    def test_offers_on_route_empty_params(self):
        """Handle empty route params gracefully"""
        res = requests.get(f"{BASE_URL}/api/offers/on-route")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        assert data["data"] == []
        print("✓ Empty params returns empty list gracefully")


class TestOffersWithAddressAndUrl:
    """Test that offers include address and offer_url fields"""
    
    def test_offers_have_address(self):
        """GET /api/offers returns offers with address field"""
        res = requests.get(f"{BASE_URL}/api/offers")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        offers = data["data"]
        assert len(offers) > 0, "No offers found"
        
        # Check that offers have address field
        for offer in offers[:5]:  # Check first 5
            assert "address" in offer, f"Offer {offer.get('id')} missing address field"
        
        # Find an offer with a non-empty address
        offer_with_address = next((o for o in offers if o.get("address")), None)
        assert offer_with_address is not None, "No offers with non-empty address found"
        print(f"✓ Offers have address field. Example: '{offer_with_address.get('address')}'")
    
    def test_offers_have_offer_url(self):
        """GET /api/offers returns offers with offer_url field"""
        res = requests.get(f"{BASE_URL}/api/offers")
        assert res.status_code == 200
        offers = res.json()["data"]
        
        # Check that offer_url field exists (can be null)
        for offer in offers[:5]:
            assert "offer_url" in offer, f"Offer {offer.get('id')} missing offer_url field"
        
        # Find a third-party offer (has offer_url)
        third_party = next((o for o in offers if o.get("offer_url")), None)
        if third_party:
            print(f"✓ Found third-party offer with URL: {third_party.get('offer_url')}")
        else:
            print("✓ offer_url field exists (no third-party offers in current data)")


class TestOfferRedemption:
    """Test POST /api/offers/{offer_id}/redeem"""
    
    def test_redeem_offer(self):
        """Redeem an available offer"""
        # Login first
        requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@snaproad.com",
            "password": "password123"
        })
        
        # Get offers
        offers_res = requests.get(f"{BASE_URL}/api/offers")
        offers = offers_res.json()["data"]
        
        # Find an unredeemed offer
        unredeemed = next((o for o in offers if not o.get("redeemed")), None)
        if not unredeemed:
            pytest.skip("No unredeemed offers available")
        
        offer_id = unredeemed["id"]
        
        # Redeem
        redeem_res = requests.post(f"{BASE_URL}/api/offers/{offer_id}/redeem")
        assert redeem_res.status_code == 200
        data = redeem_res.json()
        assert data["success"] == True
        assert "data" in data
        print(f"✓ Redeemed offer {offer_id}: {data.get('message')}")
        print(f"  Gems earned: {data['data'].get('gems_earned')}, XP: {data['data'].get('xp_earned')}")


class TestAdminDashboardOfferManagement:
    """Tests for admin features related to offers"""
    
    def test_get_all_offers_as_admin(self):
        """Admin can view all offers"""
        # Login as admin
        requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@snaproad.com",
            "password": "password123"
        })
        
        res = requests.get(f"{BASE_URL}/api/offers")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] == True
        offers = data["data"]
        
        # Check for admin offers
        admin_offers = [o for o in offers if o.get("is_admin_offer")]
        print(f"✓ Total offers: {len(offers)}, Admin offers: {len(admin_offers)}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
