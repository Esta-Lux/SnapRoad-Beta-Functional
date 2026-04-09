"""
Test suite for Driving Score & Orion Tips (Premium feature) and Challenge Friend feature.
Tests P2 features: Driving Score modal, Orion voice tips, and head-to-head challenges.
"""
import pytest
import requests

from tests.http_integration import INTEGRATION_BASE_URL as BASE_URL

class TestDrivingScore:
    """Tests for /api/driving-score endpoint - Premium feature"""
    
    def test_driving_score_returns_success(self):
        """Test that driving score endpoint returns success"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Driving score endpoint returns success")
    
    def test_driving_score_has_overall_score(self):
        """Test that response includes overall_score"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        data = response.json()
        assert "data" in data
        assert "overall_score" in data["data"]
        assert isinstance(data["data"]["overall_score"], int)
        assert 0 <= data["data"]["overall_score"] <= 100
        print(f"✓ Overall score: {data['data']['overall_score']}")
    
    def test_driving_score_has_six_metrics(self):
        """Test that response includes 6 driving metrics"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        data = response.json()
        metrics = data["data"]["metrics"]
        assert len(metrics) == 6
        
        expected_metrics = ["speed", "braking", "acceleration", "following", "turns", "focus"]
        metric_ids = [m["id"] for m in metrics]
        for expected in expected_metrics:
            assert expected in metric_ids, f"Missing metric: {expected}"
        print(f"✓ All 6 metrics present: {metric_ids}")
    
    def test_driving_score_metrics_have_required_fields(self):
        """Test that each metric has required fields"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        data = response.json()
        metrics = data["data"]["metrics"]
        
        for metric in metrics:
            assert "id" in metric
            assert "name" in metric
            assert "score" in metric
            assert "trend" in metric
            assert "description" in metric
            assert metric["trend"] in ["up", "down", "stable"]
            assert 0 <= metric["score"] <= 100
        print("✓ All metrics have required fields with valid values")
    
    def test_driving_score_has_orion_tips(self):
        """Orion tips are premium-gated; list exists and is length 0–3."""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        data = response.json()
        assert "orion_tips" in data["data"]
        tips = data["data"]["orion_tips"]
        premium = data["data"].get("premium_insights", False)
        assert isinstance(tips, list)
        assert len(tips) <= 3
        if premium and not data["data"].get("no_data"):
            assert len(tips) >= 1
        print(f"✓ Orion tips count: {len(tips)} (premium_insights={premium})")
    
    def test_orion_tips_have_required_fields(self):
        """Test that each Orion tip has required fields"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        data = response.json()
        tips = data["data"]["orion_tips"]
        if not tips:
            print("✓ No Orion tips (non-premium or no trip data)")
            return
        for tip in tips:
            assert "id" in tip
            assert "metric" in tip
            assert "tip" in tip
            assert "priority" in tip
            assert tip["priority"] in ["high", "medium", "low"]
            assert len(tip["tip"]) > 10  # Tips should be meaningful
        print("✓ All Orion tips have required fields")
    
    def test_orion_tips_priority_order(self):
        """Test that tips are ordered by priority (high, medium, low)"""
        response = requests.get(f"{BASE_URL}/api/driving-score")
        data = response.json()
        tips = data["data"]["orion_tips"]
        
        if len(tips) >= 1:
            assert tips[0]["priority"] == "high"
        if len(tips) >= 2:
            assert tips[1]["priority"] == "medium"
        if len(tips) >= 3:
            assert tips[2]["priority"] in ("low", "medium")
        print("✓ Orion tips are in correct priority order")


class TestChallengeCreation:
    """Tests for /api/challenges POST endpoint - Challenge Friend feature"""
    
    def test_challenge_requires_gems(self):
        """Test that challenge creation fails without enough gems"""
        # User starts with 0 gems
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 50,
                "duration_hours": 24
            }
        )
        # Should fail with 400 because user has 0 gems
        assert response.status_code == 400
        data = response.json()
        assert "Not enough gems" in data.get("detail", "")
        print("✓ Challenge creation correctly requires gems")
    
    def test_challenge_invalid_opponent(self):
        """Test that challenge fails with invalid opponent"""
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "invalid_user_999999",
                "stake": 50,
                "duration_hours": 24
            }
        )
        # Should fail with 404 for invalid opponent
        assert response.status_code in [400, 404]
        print("✓ Challenge creation fails with invalid opponent")
    
    def test_get_challenges_returns_list(self):
        """Test that GET /api/challenges returns a list"""
        response = requests.get(f"{BASE_URL}/api/challenges")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert isinstance(data["data"], list)
        print(f"✓ Challenges endpoint returns list with {len(data['data'])} items")


class TestLeaderboardRemoved:
    def test_leaderboard_not_found(self):
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=10")
        assert response.status_code == 404


class TestUserProfile:
    """Tests for user profile related to driving score and challenges"""
    
    def test_user_profile_has_gems(self):
        """Test that user profile includes gems count"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert "gems" in data["data"]
        print(f"✓ User gems: {data['data']['gems']}")
    
    def test_user_profile_has_premium_status(self):
        """Test that user profile includes premium status"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        data = response.json()
        assert "is_premium" in data["data"]
        assert "plan" in data["data"]
        print(f"✓ User premium status: {data['data']['is_premium']}, plan: {data['data']['plan']}")
    
    def test_user_profile_has_safety_score(self):
        """Test that user profile includes safety score"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        data = response.json()
        assert "safety_score" in data["data"]
        assert 0 <= data["data"]["safety_score"] <= 100
        print(f"✓ User safety score: {data['data']['safety_score']}")


class TestChallengeStakeValidation:
    """Tests for challenge stake validation"""
    
    def test_stake_50_requires_50_gems(self):
        """Test that 50 gem stake requires at least 50 gems"""
        # First check user has 0 gems
        profile = requests.get(f"{BASE_URL}/api/user/profile").json()
        user_gems = profile["data"]["gems"]
        
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 50,
                "duration_hours": 24
            }
        )
        
        if user_gems < 50:
            assert response.status_code == 400
            print(f"✓ 50 gem stake correctly rejected (user has {user_gems} gems)")
        else:
            assert response.status_code == 200
            print(f"✓ 50 gem stake accepted (user has {user_gems} gems)")
    
    def test_stake_100_requires_100_gems(self):
        """Test that 100 gem stake requires at least 100 gems"""
        profile = requests.get(f"{BASE_URL}/api/user/profile").json()
        user_gems = profile["data"]["gems"]
        
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 100,
                "duration_hours": 72
            }
        )
        
        if user_gems < 100:
            assert response.status_code == 400
            print(f"✓ 100 gem stake correctly rejected (user has {user_gems} gems)")
        else:
            assert response.status_code == 200
            print(f"✓ 100 gem stake accepted (user has {user_gems} gems)")
    
    def test_stake_250_requires_250_gems(self):
        """Test that 250 gem stake requires at least 250 gems"""
        profile = requests.get(f"{BASE_URL}/api/user/profile").json()
        user_gems = profile["data"]["gems"]
        
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 250,
                "duration_hours": 168
            }
        )
        
        if user_gems < 250:
            assert response.status_code == 400
            print(f"✓ 250 gem stake correctly rejected (user has {user_gems} gems)")
        else:
            assert response.status_code == 200
            print(f"✓ 250 gem stake accepted (user has {user_gems} gems)")
    
    def test_stake_500_requires_500_gems(self):
        """Test that 500 gem stake requires at least 500 gems"""
        profile = requests.get(f"{BASE_URL}/api/user/profile").json()
        user_gems = profile["data"]["gems"]
        
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 500,
                "duration_hours": 168
            }
        )
        
        if user_gems < 500:
            assert response.status_code == 400
            print(f"✓ 500 gem stake correctly rejected (user has {user_gems} gems)")
        else:
            assert response.status_code == 200
            print(f"✓ 500 gem stake accepted (user has {user_gems} gems)")


class TestChallengeDurations:
    """Tests for challenge duration options"""
    
    def test_24h_duration_valid(self):
        """Test that 24 hour duration is valid"""
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 50,
                "duration_hours": 24
            }
        )
        # Will fail due to gems, but should not fail due to duration
        data = response.json()
        assert "duration" not in data.get("detail", "").lower()
        print("✓ 24 hour duration is valid")
    
    def test_72h_duration_valid(self):
        """Test that 72 hour (3 day) duration is valid"""
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 50,
                "duration_hours": 72
            }
        )
        data = response.json()
        assert "duration" not in data.get("detail", "").lower()
        print("✓ 72 hour (3 day) duration is valid")
    
    def test_168h_duration_valid(self):
        """Test that 168 hour (1 week) duration is valid"""
        response = requests.post(
            f"{BASE_URL}/api/challenges",
            json={
                "opponent_id": "123483",
                "stake": 50,
                "duration_hours": 168
            }
        )
        data = response.json()
        assert "duration" not in data.get("detail", "").lower()
        print("✓ 168 hour (1 week) duration is valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
