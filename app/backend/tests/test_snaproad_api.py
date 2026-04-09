"""
SnapRoad API Backend Tests
Tests all API endpoints for the SnapRoad navigation app
- Locations CRUD
- Routes CRUD
- Offers
- Navigation
- Widgets
- Incidents
- Family
- Badges/Skins
- Settings
"""
import pytest
import requests
import os

from tests.http_integration import INTEGRATION_BASE_URL as BASE_URL

class TestHealthEndpoints:
    """Health check endpoints"""
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        print("✅ Health check passed")
    
    def test_root_endpoint(self):
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✅ Root endpoint passed")


class TestUserEndpoints:
    """User profile and stats endpoints"""
    
    def test_get_user_profile(self):
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        user = data["data"]
        assert "name" in user
        assert "gems" in user
        assert "safety_score" in user
        print(f"✅ User profile: {user['name']}, Gems: {user['gems']}")
    
    def test_get_user_stats(self):
        response = requests.get(f"{BASE_URL}/api/user/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        stats = data["data"]
        assert "gems" in stats
        assert "safety_score" in stats
        assert "level" in stats
        print(f"✅ User stats: Level {stats['level']}, Score {stats['safety_score']}")


class TestLocationsEndpoints:
    """Locations CRUD endpoints"""
    
    def test_get_all_locations(self):
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert isinstance(data["data"], list)
        print(f"✅ Got {len(data['data'])} locations")
    
    def test_get_locations_by_category(self):
        response = requests.get(f"{BASE_URL}/api/locations?category=home")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        for loc in data["data"]:
            assert loc["category"] == "home"
        print(f"✅ Got {len(data['data'])} home locations")
    
    def test_add_location(self):
        new_loc = {
            "name": "TEST_Coffee Shop",
            "address": "456 Test Street",
            "category": "favorite"
        }
        response = requests.post(f"{BASE_URL}/api/locations", json=new_loc)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert data["data"]["name"] == new_loc["name"]
        print(f"✅ Added location: {data['data']['name']}")
        return data["data"]["id"]
    
    def test_delete_location(self):
        # First add a location
        new_loc = {"name": "TEST_ToDelete", "address": "Delete St", "category": "favorite"}
        add_response = requests.post(f"{BASE_URL}/api/locations", json=new_loc)
        loc_id = add_response.json()["data"]["id"]
        
        # Then delete it
        response = requests.delete(f"{BASE_URL}/api/locations/{loc_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Deleted location ID: {loc_id}")


class TestRoutesEndpoints:
    """Routes CRUD endpoints"""
    
    def test_get_all_routes(self):
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert isinstance(data["data"], list)
        assert "total" in data
        assert "max" in data
        print(f"✅ Got {data['total']}/{data['max']} routes")
    
    def test_add_route(self):
        new_route = {
            "name": "TEST_Route",
            "origin": "Home",
            "destination": "Office",
            "departure_time": "09:00",
            "days_active": ["Mon", "Wed", "Fri"],
            "notifications": True
        }
        response = requests.post(f"{BASE_URL}/api/routes", json=new_route)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["name"] == new_route["name"]
        print(f"✅ Added route: {data['data']['name']}")
        return data["data"]["id"]
    
    def test_toggle_route(self):
        # Get existing routes
        routes_response = requests.get(f"{BASE_URL}/api/routes")
        routes = routes_response.json()["data"]
        if routes:
            route_id = routes[0]["id"]
            response = requests.put(f"{BASE_URL}/api/routes/{route_id}/toggle")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            print(f"✅ Toggled route ID: {route_id}")
    
    def test_toggle_route_notifications(self):
        routes_response = requests.get(f"{BASE_URL}/api/routes")
        routes = routes_response.json()["data"]
        if routes:
            route_id = routes[0]["id"]
            response = requests.put(f"{BASE_URL}/api/routes/{route_id}/notifications")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            print(f"✅ Toggled notifications for route ID: {route_id}")
    
    def test_delete_route(self):
        # First add a route
        new_route = {
            "name": "TEST_ToDeleteRoute",
            "origin": "A",
            "destination": "B",
            "departure_time": "10:00",
            "days_active": ["Mon"],
            "notifications": False
        }
        add_response = requests.post(f"{BASE_URL}/api/routes", json=new_route)
        route_id = add_response.json()["data"]["id"]
        
        # Then delete it
        response = requests.delete(f"{BASE_URL}/api/routes/{route_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✅ Deleted route ID: {route_id}")


class TestNavigationEndpoints:
    """Navigation control endpoints"""
    
    def test_start_navigation(self):
        nav_data = {"destination": "Work", "origin": "Home"}
        response = requests.post(f"{BASE_URL}/api/navigation/start", json=nav_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "eta" in data["data"]
        assert "distance" in data["data"]
        print(f"✅ Navigation started: ETA {data['data']['eta']}")
    
    def test_stop_navigation(self):
        response = requests.post(f"{BASE_URL}/api/navigation/stop")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Navigation stopped")
    
    def test_voice_command(self):
        response = requests.post(f"{BASE_URL}/api/navigation/voice-command")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "command" in data["data"]
        print(f"✅ Voice command: {data['data']['command']}")


class TestWidgetsEndpoints:
    """Widget settings endpoints"""
    
    def test_get_widgets(self):
        response = requests.get(f"{BASE_URL}/api/widgets")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "score" in data["data"]
        assert "gems" in data["data"]
        print(f"✅ Got widget settings: {list(data['data'].keys())}")
    
    def test_toggle_widget_visibility(self):
        response = requests.put(f"{BASE_URL}/api/widgets/score/toggle")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Toggled score widget visibility")
    
    def test_toggle_widget_collapse(self):
        response = requests.put(f"{BASE_URL}/api/widgets/gems/collapse")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Toggled gems widget collapse")
    
    def test_update_widget_position(self):
        response = requests.put(f"{BASE_URL}/api/widgets/score/position?x=100&y=200")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["position"]["x"] == 100
        assert data["data"]["position"]["y"] == 200
        print("✅ Updated widget position")


class TestOffersEndpoints:
    """Offers endpoints"""
    
    def test_get_all_offers(self):
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert isinstance(data["data"], list)
        assert "total_savings" in data
        print(f"✅ Got {len(data['data'])} offers, savings: {data['total_savings']}")
    
    def test_get_offers_by_type(self):
        response = requests.get(f"{BASE_URL}/api/offers?offer_type=gas")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        for offer in data["data"]:
            assert offer["type"] == "gas"
        print(f"✅ Got {len(data['data'])} gas offers")
    
    def test_redeem_offer(self):
        response = requests.post(f"{BASE_URL}/api/offers/1/redeem")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "redemption_code" in data["data"]
        print(f"✅ Redeemed offer, code: {data['data']['redemption_code']}")
    
    def test_favorite_offer(self):
        """Favorites require auth and a live offers row; unauthenticated calls are rejected."""
        response = requests.post(f"{BASE_URL}/api/offers/1/favorite")
        assert response.status_code == 401
        token = os.environ.get("TEST_DRIVER_BEARER", "").strip()
        if not token:
            print("⚠️ Skipping authenticated favorite check (set TEST_DRIVER_BEARER)")
            return
        r2 = requests.post(
            f"{BASE_URL}/api/offers/1/favorite",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code in (200, 404, 503)
        print("✅ Favorite endpoint auth behavior checked")


class TestIncidentsEndpoints:
    """Incident reporting endpoints"""
    
    def test_report_incident(self):
        incident = {
            "incident_type": "pothole",
            "location": "Main St & 5th Ave",
            "description": "Large pothole"
        }
        response = requests.post(f"{BASE_URL}/api/incidents/report", json=incident)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "gems_earned" in data["data"]
        print(f"✅ Reported incident, earned {data['data']['gems_earned']} gems")
    
    def test_get_my_reports(self):
        response = requests.get(f"{BASE_URL}/api/incidents/my-reports")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert isinstance(data["data"], list)
        print(f"✅ Got {len(data['data'])} incident reports")


class TestFamilyEndpoints:
    """Family tracking endpoints"""
    
    def test_get_family_members(self):
        response = requests.get(f"{BASE_URL}/api/family/members")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert isinstance(data["data"], list)
        assert "online_count" in data
        print(f"✅ Got {len(data['data'])} family members, {data['online_count']} online")
    
    def test_call_family_member(self):
        response = requests.post(f"{BASE_URL}/api/family/1/call")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Initiated call to family member")
    
    def test_message_family_member(self):
        response = requests.post(f"{BASE_URL}/api/family/1/message")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Opened chat with family member")
    
    def test_share_location(self):
        response = requests.post(f"{BASE_URL}/api/family/share-location")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Shared location with family")


class TestBadgesAndSkinsEndpoints:
    """Badges and skins endpoints"""
    
    def test_get_all_badges(self):
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert isinstance(data["data"], list)
        assert "total_earned" in data
        print(f"✅ Got {len(data['data'])} badges, {data['total_earned']} earned")
    
    def test_get_earned_badges(self):
        response = requests.get(f"{BASE_URL}/api/badges?filter_type=earned")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        for badge in data["data"]:
            assert badge["earned"] == True
        print(f"✅ Got {len(data['data'])} earned badges")
    
    def test_get_skins(self):
        response = requests.get(f"{BASE_URL}/api/skins")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert isinstance(data["data"], list)
        print(f"✅ Got {len(data['data'])} skins")
    
    def test_equip_skin(self):
        response = requests.post(f"{BASE_URL}/api/skins/1/equip")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Equipped skin")
    
    def test_purchase_skin(self):
        response = requests.post(f"{BASE_URL}/api/skins/3/purchase")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Purchased skin")


class TestSettingsEndpoints:
    """Settings endpoints"""
    
    def test_toggle_voice(self):
        response = requests.put(f"{BASE_URL}/api/settings/voice?muted=true")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Toggled voice mute")
    
    def test_update_notifications(self):
        response = requests.put(f"{BASE_URL}/api/settings/notifications?enabled=true")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✅ Updated notification settings")
    
    def test_get_all_settings(self):
        response = requests.get(f"{BASE_URL}/api/settings/all")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "voice_muted" in data["data"]
        assert "notifications_enabled" in data["data"]
        print(f"✅ Got all settings: {list(data['data'].keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
