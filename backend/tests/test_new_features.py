"""
Test suite for SnapRoad new features:
- Friends Hub (search by 6-digit ID, add friends)
- Leaderboard (state filter, safety score ranking)
- Badges Grid (160 badges, 6 categories)
- Car Studio (8 cars, 16 skins, purchase with gems)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://car-studio-mvp.preview.emergentagent.com')

class TestFriendsHub:
    """Friends Hub - search and add friends by 6-digit ID"""
    
    def test_get_friends_list(self):
        """Get current user's friends list"""
        response = requests.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "count" in data
        # Verify friend structure
        if len(data["data"]) > 0:
            friend = data["data"][0]
            assert "id" in friend
            assert "name" in friend
            assert "safety_score" in friend
            assert "level" in friend
            assert "state" in friend
    
    def test_search_user_by_valid_id(self):
        """Search for user by valid 6-digit ID"""
        # Search for user 123457 (should exist in mock data)
        response = requests.get(f"{BASE_URL}/api/friends/search?user_id=123457")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        user = data["data"]
        assert user["id"] == "123457"
        assert "name" in user
        assert "safety_score" in user
        assert "level" in user
        assert "state" in user
        assert "is_friend" in user
    
    def test_search_user_by_invalid_id(self):
        """Search for non-existent user ID"""
        response = requests.get(f"{BASE_URL}/api/friends/search?user_id=999999")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "message" in data
    
    def test_add_friend(self):
        """Add a new friend by ID"""
        # Add user 123500 as friend
        response = requests.post(
            f"{BASE_URL}/api/friends/add",
            json={"user_id": "123500"}
        )
        assert response.status_code == 200
        data = response.json()
        # Either success or already friends
        assert "success" in data
        assert "message" in data
    
    def test_remove_friend(self):
        """Remove a friend"""
        response = requests.delete(f"{BASE_URL}/api/friends/123500")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data


class TestLeaderboard:
    """Leaderboard - ranked by safety score, filterable by state"""
    
    def test_get_leaderboard_all_states(self):
        """Get leaderboard for all states"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "my_rank" in data
        assert "states" in data
        
        # Verify leaderboard structure
        leaderboard = data["data"]
        assert len(leaderboard) > 0
        
        # Check first entry structure
        entry = leaderboard[0]
        assert "rank" in entry
        assert "id" in entry
        assert "name" in entry
        assert "safety_score" in entry
        assert "level" in entry
        assert "state" in entry
        assert "badges_count" in entry
        
        # Verify sorted by safety score (descending)
        for i in range(len(leaderboard) - 1):
            assert leaderboard[i]["safety_score"] >= leaderboard[i+1]["safety_score"]
    
    def test_get_leaderboard_by_state(self):
        """Get leaderboard filtered by state"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?state=TX")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # All entries should be from TX
        for entry in data["data"]:
            assert entry["state"] == "TX"
    
    def test_leaderboard_has_states_list(self):
        """Verify states list is returned"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert "states" in data
        assert len(data["states"]) > 0
        # Check some expected states
        assert "TX" in data["states"]
        assert "CA" in data["states"]


class TestBadgesGrid:
    """Badges Grid - 160 badges with 6 categories"""
    
    def test_get_all_badges(self):
        """Get all 160 badges"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "total" in data
        assert "earned" in data
        assert "categories" in data
        
        # Verify 160 badges
        assert data["total"] == 160
        assert len(data["data"]) == 160
        
        # Verify badge structure
        badge = data["data"][0]
        assert "id" in badge
        assert "name" in badge
        assert "desc" in badge
        assert "icon" in badge
        assert "category" in badge
        assert "requirement" in badge
        assert "gems" in badge
        assert "earned" in badge
        assert "progress" in badge
    
    def test_badges_have_six_categories(self):
        """Verify 6 badge categories exist"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        data = response.json()
        
        expected_categories = ["distance", "safety", "community", "streak", "achievement", "special"]
        assert data["categories"] == expected_categories
        
        # Verify badges are distributed across categories
        categories_found = set()
        for badge in data["data"]:
            categories_found.add(badge["category"])
        
        for cat in expected_categories:
            assert cat in categories_found
    
    def test_get_badges_by_category(self):
        """Get badges filtered by category"""
        response = requests.get(f"{BASE_URL}/api/badges?category=distance")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # All badges should be distance category
        for badge in data["data"]:
            assert badge["category"] == "distance"
    
    def test_get_badge_categories_stats(self):
        """Get badge category statistics"""
        response = requests.get(f"{BASE_URL}/api/badges/categories")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        # Verify category stats structure
        categories = data["data"]
        for cat_name, stats in categories.items():
            assert "count" in stats
            assert "earned" in stats


class TestCarStudio:
    """Car Studio - 8 cars and 16 skins"""
    
    def test_get_all_cars(self):
        """Get all 8 cars"""
        response = requests.get(f"{BASE_URL}/api/cars")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "equipped_id" in data
        
        # Verify 8 cars
        assert len(data["data"]) == 8
        
        # Verify car structure
        car = data["data"][0]
        assert "id" in car
        assert "name" in car
        assert "type" in car
        assert "price" in car
        assert "owned" in car
        assert "color" in car
    
    def test_get_all_skins(self):
        """Get all 16 skins"""
        response = requests.get(f"{BASE_URL}/api/skins")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "equipped_id" in data
        
        # Verify 16 skins
        assert len(data["data"]) == 16
        
        # Verify skin structure
        skin = data["data"][0]
        assert "id" in skin
        assert "name" in skin
        assert "price" in skin
        assert "owned" in skin
        assert "rarity" in skin
    
    def test_car_has_locked_with_gem_price(self):
        """Verify locked cars show gem price"""
        response = requests.get(f"{BASE_URL}/api/cars")
        assert response.status_code == 200
        data = response.json()
        
        # Find a locked car
        locked_cars = [c for c in data["data"] if not c["owned"]]
        assert len(locked_cars) > 0
        
        # Locked cars should have price > 0
        for car in locked_cars:
            assert car["price"] > 0
    
    def test_skin_has_rarity(self):
        """Verify skins have rarity levels"""
        response = requests.get(f"{BASE_URL}/api/skins")
        assert response.status_code == 200
        data = response.json()
        
        rarities_found = set()
        for skin in data["data"]:
            rarities_found.add(skin["rarity"])
        
        # Should have multiple rarity levels
        expected_rarities = {"common", "uncommon", "rare", "epic", "legendary"}
        assert rarities_found == expected_rarities
    
    def test_equip_owned_car(self):
        """Equip an owned car"""
        response = requests.post(f"{BASE_URL}/api/cars/1/equip")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_equip_owned_skin(self):
        """Equip an owned skin"""
        response = requests.post(f"{BASE_URL}/api/skins/1/equip")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_purchase_car_insufficient_gems(self):
        """Try to purchase car without enough gems"""
        # Try to purchase the most expensive car (Luxury Elite - 15000 gems)
        response = requests.post(f"{BASE_URL}/api/cars/4/purchase")
        assert response.status_code == 200
        data = response.json()
        # Should fail or succeed based on user's gems
        assert "success" in data
        assert "message" in data


class TestUserProfile:
    """User profile with 6-digit ID"""
    
    def test_user_has_6_digit_id(self):
        """Verify user has 6-digit ID starting from 123456"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        user = data["data"]
        assert "id" in user
        # ID should be 6 digits
        assert len(user["id"]) == 6
        # ID should be numeric
        assert user["id"].isdigit()
        # ID should start from 123456
        assert int(user["id"]) >= 123456
    
    def test_user_has_friends_count(self):
        """Verify user profile includes friends count"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        
        user = data["data"]
        assert "friends_count" in user
        assert isinstance(user["friends_count"], int)
    
    def test_user_has_badges_earned_count(self):
        """Verify user profile includes badges earned count"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        
        user = data["data"]
        assert "badges_earned_count" in user
        assert isinstance(user["badges_earned_count"], int)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
