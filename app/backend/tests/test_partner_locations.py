"""
Test Partner Locations Feature
- Partner profile with plan info and location count
- Add new location with plan limit enforcement
- Location CRUD operations
- Create offer with location selection
"""
import pytest
import requests

from tests.http_integration import INTEGRATION_BASE_URL as BASE_URL

class TestPartnerPlans:
    """Test partner plans API"""
    
    def test_get_partner_plans(self):
        """Test getting available partner plans"""
        response = requests.get(f"{BASE_URL}/api/partner/plans")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "plans" in data["data"]
        
        plans = data["data"]["plans"]
        # Verify all three plans exist
        assert "starter" in plans
        assert "growth" in plans
        assert "enterprise" in plans
        
        # Verify starter plan limits
        assert plans["starter"]["max_locations"] == 5
        assert plans["starter"]["name"] == "Starter"
        
        # Verify growth plan limits
        assert plans["growth"]["max_locations"] == 25
        assert plans["growth"]["name"] == "Growth"
        
        # Verify enterprise plan (unlimited)
        assert plans["enterprise"]["max_locations"] == 999999
        assert plans["enterprise"]["name"] == "Enterprise"
        print("✓ Partner plans API returns correct plan info")


class TestPartnerProfile:
    """Test partner profile API"""
    
    def test_get_partner_profile(self):
        """Test getting partner profile with plan and locations"""
        response = requests.get(f"{BASE_URL}/api/partner/profile?partner_id=default_partner")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        profile = data["data"]
        # Verify profile structure
        assert "id" in profile
        assert "business_name" in profile
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
        
        print(f"✓ Partner profile: {profile['business_name']}, Plan: {profile['plan']}, Locations: {profile['location_count']}/{profile['max_locations']}")


class TestPartnerLocations:
    """Test partner location CRUD operations"""
    
    def test_get_partner_locations(self):
        """Test getting partner locations"""
        response = requests.get(f"{BASE_URL}/api/partner/locations?partner_id=default_partner")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "count" in data
        assert "max_locations" in data
        assert "can_add_more" in data
        
        print(f"✓ Partner has {data['count']} locations, can add more: {data['can_add_more']}")
    
    def test_add_new_location(self):
        """Test adding a new location"""
        location_data = {
            "name": "TEST_New Store Location",
            "address": "500 Polaris Pkwy, Columbus, OH 43240",
            "lat": 40.1465,
            "lng": -82.9859,
            "is_primary": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner/locations?partner_id=default_partner",
            json=location_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        new_location = data["data"]
        assert new_location["name"] == location_data["name"]
        assert new_location["address"] == location_data["address"]
        assert "id" in new_location
        assert "created_at" in new_location
        
        print(f"✓ Added new location: {new_location['name']} (ID: {new_location['id']})")
        return new_location["id"]
    
    def test_update_location(self):
        """Test updating a location"""
        # First add a location to update
        location_data = {
            "name": "TEST_Location To Update",
            "address": "123 Test St, Columbus, OH 43215",
            "lat": 39.9612,
            "lng": -82.9988,
            "is_primary": False
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/partner/locations?partner_id=default_partner",
            json=location_data
        )
        assert add_response.status_code == 200
        location_id = add_response.json()["data"]["id"]
        
        # Now update it
        updated_data = {
            "name": "TEST_Updated Location Name",
            "address": "456 Updated St, Columbus, OH 43215",
            "lat": 39.9700,
            "lng": -83.0000,
            "is_primary": False
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/partner/locations/{location_id}?partner_id=default_partner",
            json=updated_data
        )
        assert update_response.status_code == 200
        
        data = update_response.json()
        assert data["success"] == True
        assert data["data"]["name"] == updated_data["name"]
        assert data["data"]["address"] == updated_data["address"]
        
        print(f"✓ Updated location {location_id}: {updated_data['name']}")
    
    def test_set_primary_location(self):
        """Test setting a location as primary"""
        # Get current locations
        get_response = requests.get(f"{BASE_URL}/api/partner/locations?partner_id=default_partner")
        locations = get_response.json()["data"]
        
        if len(locations) > 0:
            location_id = locations[0]["id"]
            
            response = requests.post(
                f"{BASE_URL}/api/partner/locations/{location_id}/set-primary?partner_id=default_partner"
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] == True
            
            print(f"✓ Set location {location_id} as primary")
    
    def test_delete_location(self):
        """Test deleting a location"""
        # First add a location to delete
        location_data = {
            "name": "TEST_Location To Delete",
            "address": "999 Delete St, Columbus, OH 43215",
            "lat": 39.9500,
            "lng": -82.9800,
            "is_primary": False
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/partner/locations?partner_id=default_partner",
            json=location_data
        )
        assert add_response.status_code == 200
        location_id = add_response.json()["data"]["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/partner/locations/{location_id}?partner_id=default_partner"
        )
        assert delete_response.status_code == 200
        
        data = delete_response.json()
        assert data["success"] == True
        
        # Verify it's deleted by trying to get it
        get_response = requests.get(f"{BASE_URL}/api/partner/locations?partner_id=default_partner")
        locations = get_response.json()["data"]
        location_ids = [loc["id"] for loc in locations]
        assert location_id not in location_ids
        
        print(f"✓ Deleted location {location_id}")


class TestPlanLimitEnforcement:
    """Test that plan limits are enforced"""
    
    def test_starter_plan_limit(self):
        """Test that starter plan enforces 5 location limit"""
        # Create a test partner with starter plan
        test_partner_id = "test_limit_partner"
        
        # First, get the profile to ensure partner exists
        profile_response = requests.get(f"{BASE_URL}/api/partner/profile?partner_id={test_partner_id}")
        assert profile_response.status_code == 200
        
        # Get current location count
        locations_response = requests.get(f"{BASE_URL}/api/partner/locations?partner_id={test_partner_id}")
        current_count = locations_response.json()["count"]
        max_locations = locations_response.json()["max_locations"]
        
        print(f"✓ Test partner has {current_count}/{max_locations} locations")
        
        # Try to add locations up to the limit
        locations_to_add = max_locations - current_count
        
        for i in range(locations_to_add):
            location_data = {
                "name": f"TEST_Limit Test Location {i+1}",
                "address": f"{100+i} Test St, Columbus, OH 43215",
                "lat": 39.9612 + (i * 0.01),
                "lng": -82.9988 + (i * 0.01),
                "is_primary": False
            }
            
            response = requests.post(
                f"{BASE_URL}/api/partner/locations?partner_id={test_partner_id}",
                json=location_data
            )
            assert response.status_code == 200
            assert response.json()["success"] == True
        
        # Now try to add one more - should fail
        over_limit_location = {
            "name": "TEST_Over Limit Location",
            "address": "999 Over Limit St, Columbus, OH 43215",
            "lat": 39.9999,
            "lng": -82.9999,
            "is_primary": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner/locations?partner_id={test_partner_id}",
            json=over_limit_location
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == False
        assert "limit" in data["message"].lower() or "upgrade" in data["message"].lower()
        
        print(f"✓ Plan limit enforced - cannot add more than {max_locations} locations")


class TestPartnerOffers:
    """Test creating offers with location selection"""
    
    def test_create_offer_with_location(self):
        """Test creating an offer tied to a specific location"""
        # First get available locations
        locations_response = requests.get(f"{BASE_URL}/api/partner/locations?partner_id=default_partner")
        locations = locations_response.json()["data"]
        
        if len(locations) == 0:
            # Add a location first
            location_data = {
                "name": "TEST_Offer Location",
                "address": "100 Offer St, Columbus, OH 43215",
                "lat": 39.9612,
                "lng": -82.9988,
                "is_primary": True
            }
            add_response = requests.post(
                f"{BASE_URL}/api/partner/locations?partner_id=default_partner",
                json=location_data
            )
            location_id = add_response.json()["data"]["id"]
        else:
            location_id = locations[0]["id"]
        
        # Create an offer for this location
        offer_data = {
            "title": "TEST_20% Off Weekend Special",
            "description": "Test offer for location testing",
            "discount_percent": 20,
            "gems_reward": 50,
            "location_id": location_id,
            "expires_hours": 168
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner/offers?partner_id=default_partner",
            json=offer_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        new_offer = data["data"]
        assert new_offer["title"] == offer_data["title"]
        assert new_offer["location_id"] == location_id
        assert "location_name" in new_offer
        assert "lat" in new_offer
        assert "lng" in new_offer
        
        print(f"✓ Created offer '{new_offer['title']}' at location: {new_offer['location_name']}")
    
    def test_create_offer_invalid_location(self):
        """Test that creating offer with invalid location fails"""
        offer_data = {
            "title": "TEST_Invalid Location Offer",
            "description": "This should fail",
            "discount_percent": 15,
            "gems_reward": 30,
            "location_id": 99999,  # Invalid location ID
            "expires_hours": 24
        }
        
        response = requests.post(
            f"{BASE_URL}/api/partner/offers?partner_id=default_partner",
            json=offer_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == False
        assert "location" in data["message"].lower()
        
        print("✓ Creating offer with invalid location correctly fails")
    
    def test_get_partner_offers(self):
        """Test getting partner's offers"""
        response = requests.get(f"{BASE_URL}/api/partner/offers?partner_id=default_partner")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "count" in data
        
        print(f"✓ Partner has {data['count']} offers")


class TestLocationDropdownData:
    """Test that location data is suitable for dropdown display"""
    
    def test_locations_have_required_fields_for_dropdown(self):
        """Test that locations have all fields needed for dropdown"""
        response = requests.get(f"{BASE_URL}/api/partner/locations?partner_id=default_partner")
        assert response.status_code == 200
        
        locations = response.json()["data"]
        
        for loc in locations:
            # Required fields for dropdown display
            assert "id" in loc, "Location must have id"
            assert "name" in loc, "Location must have name"
            assert "address" in loc, "Location must have address"
            assert "is_primary" in loc, "Location must have is_primary flag"
            
            # Verify types
            assert isinstance(loc["id"], int), "Location id must be int"
            assert isinstance(loc["name"], str), "Location name must be string"
            assert isinstance(loc["is_primary"], bool), "is_primary must be boolean"
        
        print(f"✓ All {len(locations)} locations have required dropdown fields")
    
    def test_primary_location_indicator(self):
        """Test that primary location is correctly indicated"""
        response = requests.get(f"{BASE_URL}/api/partner/locations?partner_id=default_partner")
        locations = response.json()["data"]
        
        primary_count = sum(1 for loc in locations if loc["is_primary"])
        
        if len(locations) > 0:
            # Should have exactly one primary location
            assert primary_count == 1, f"Expected 1 primary location, found {primary_count}"
            
            primary_loc = next(loc for loc in locations if loc["is_primary"])
            print(f"✓ Primary location: {primary_loc['name']}")
        else:
            print("✓ No locations yet - primary indicator test skipped")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
