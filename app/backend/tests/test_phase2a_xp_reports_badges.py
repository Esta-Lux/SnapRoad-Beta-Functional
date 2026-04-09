"""
Phase 2A Testing: XP/Leveling System, Road Reports, Community Badges
Tests for SnapRoad Phase 2A features:
- XP/Level system (levels 1-99, XP for actions)
- Road Reports with upvotes and gem rewards
- Community Badges (20 total)
- Trip completion with safety metrics
"""
import pytest
import requests

from tests.http_integration import INTEGRATION_BASE_URL as BASE_URL

class TestXPSystem:
    """XP/Leveling System Tests"""
    
    def test_get_xp_status(self):
        """GET /api/xp/status - Returns user's level, XP, progress to next level"""
        response = requests.get(f"{BASE_URL}/api/xp/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        xp_data = data["data"]
        assert "level" in xp_data
        assert "total_xp" in xp_data
        assert "xp_progress" in xp_data
        assert "xp_to_next_level" in xp_data
        assert "progress_percent" in xp_data
        assert "is_max_level" in xp_data
        
        # Validate level is within range
        assert 1 <= xp_data["level"] <= 99
        assert xp_data["total_xp"] >= 0
        assert 0 <= xp_data["progress_percent"] <= 100
        print(f"XP Status: Level {xp_data['level']}, Total XP: {xp_data['total_xp']}")
    
    def test_get_xp_config(self):
        """GET /api/xp/config - Returns XP configuration values"""
        response = requests.get(f"{BASE_URL}/api/xp/config")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        config = data["data"]
        # Verify XP values match requirements
        assert config["photo_report"] == 500
        assert config["offer_redemption"] == 700
        assert config["safe_drive"] == 1000
        assert config["consistent_driving"] == 500
        assert config["safety_score_penalty"] == -500
        assert config["base_xp_to_level"] == 2500  # Level 1→2
        assert config["xp_increment"] == 500  # +500 per level
        assert config["max_level"] == 99
        print(f"XP Config verified: photo_report={config['photo_report']}, safe_drive={config['safe_drive']}")
    
    def test_add_xp_photo_report(self):
        """POST /api/xp/add - Add XP for photo_report event"""
        response = requests.post(f"{BASE_URL}/api/xp/add", json={
            "event_type": "photo_report"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "xp_gained" in data["data"]
        assert data["data"]["xp_gained"] == 500
        print(f"Photo report XP: +{data['data']['xp_gained']}")
    
    def test_add_xp_safe_drive(self):
        """POST /api/xp/add - Add XP for safe_drive event"""
        response = requests.post(f"{BASE_URL}/api/xp/add", json={
            "event_type": "safe_drive"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["xp_gained"] == 1000
        print(f"Safe drive XP: +{data['data']['xp_gained']}")
    
    def test_add_xp_offer_redemption(self):
        """POST /api/xp/add - Add XP for offer_redemption event"""
        response = requests.post(f"{BASE_URL}/api/xp/add", json={
            "event_type": "offer_redemption"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["xp_gained"] == 700
        print(f"Offer redemption XP: +{data['data']['xp_gained']}")
    
    def test_add_xp_consistent_bonus(self):
        """POST /api/xp/add - Add XP for consistent_bonus event (3 safe drives streak)"""
        response = requests.post(f"{BASE_URL}/api/xp/add", json={
            "event_type": "consistent_bonus"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["xp_gained"] == 500
        print(f"Consistent bonus XP: +{data['data']['xp_gained']}")
    
    def test_add_xp_safety_penalty(self):
        """POST /api/xp/add - Add XP penalty for safety_penalty event"""
        response = requests.post(f"{BASE_URL}/api/xp/add", json={
            "event_type": "safety_penalty"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["data"]["xp_gained"] == -500
        print(f"Safety penalty XP: {data['data']['xp_gained']}")


class TestRoadReports:
    """Road Reports Tests"""
    
    def test_get_all_reports(self):
        """GET /api/reports - Get all road reports"""
        response = requests.get(f"{BASE_URL}/api/reports")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        
        if len(data["data"]) > 0:
            report = data["data"][0]
            assert "id" in report
            assert "type" in report
            assert "title" in report
            assert "upvotes" in report
            assert "upvoters" in report
            print(f"Found {data['total']} reports")
        else:
            print("No reports found")
    
    def test_create_road_report(self):
        """POST /api/reports - Create new road report (awards 500 XP)"""
        response = requests.post(f"{BASE_URL}/api/reports", json={
            "type": "hazard",
            "title": "TEST_Pothole on Test Street",
            "description": "Large pothole near test intersection",
            "lat": 39.9612,
            "lng": -82.9988
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "xp_result" in data["data"]
        
        # Verify XP was awarded
        xp_result = data["data"]["xp_result"]
        assert xp_result["xp_gained"] == 500
        print(f"Report created, XP gained: {xp_result['xp_gained']}")
    
    def test_get_my_reports(self):
        """GET /api/reports/my - Get user's own reports with stats"""
        response = requests.get(f"{BASE_URL}/api/reports/my")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_reports" in stats
        assert "total_upvotes" in stats
        assert "gems_from_upvotes" in stats
        
        # Verify gems calculation (10 gems per upvote)
        assert stats["gems_from_upvotes"] == stats["total_upvotes"] * 10
        print(f"My reports: {stats['total_reports']}, upvotes: {stats['total_upvotes']}, gems: {stats['gems_from_upvotes']}")
    
    def test_upvote_report(self):
        """POST /api/reports/{id}/upvote - Upvote a report (awards 10 gems to reporter)"""
        # First get reports to find one to upvote
        reports_response = requests.get(f"{BASE_URL}/api/reports")
        reports = reports_response.json()["data"]
        
        # Find a report not owned by current user (123456)
        other_report = next((r for r in reports if r["user_id"] != "123456"), None)
        
        if other_report:
            response = requests.post(f"{BASE_URL}/api/reports/{other_report['id']}/upvote")
            assert response.status_code == 200
            
            data = response.json()
            # May succeed or fail if already upvoted
            if data["success"]:
                assert "gems_awarded" in data
                assert data["gems_awarded"] == 10
                print(f"Upvoted report {other_report['id']}, gems awarded: {data['gems_awarded']}")
            else:
                print(f"Could not upvote: {data.get('message', 'Unknown reason')}")
        else:
            print("No other user's reports to upvote")
    
    def test_cannot_upvote_own_report(self):
        """POST /api/reports/{id}/upvote - Cannot upvote own report"""
        # Get reports owned by current user
        reports_response = requests.get(f"{BASE_URL}/api/reports")
        reports = reports_response.json()["data"]
        
        own_report = next((r for r in reports if r["user_id"] == "123456"), None)
        
        if own_report:
            response = requests.post(f"{BASE_URL}/api/reports/{own_report['id']}/upvote")
            data = response.json()
            assert data["success"] == False
            assert "own report" in data.get("message", "").lower()
            print(f"Correctly prevented upvoting own report")
        else:
            print("No own reports to test")


class TestCommunityBadges:
    """Community Badges Tests"""
    
    def test_get_community_badges(self):
        """GET /api/badges/community - Get community badges with earned status"""
        response = requests.get(f"{BASE_URL}/api/badges/community")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "earned_count" in data
        assert "total_count" in data
        
        badges = data["data"]
        assert len(badges) == 20  # 20 community badges
        
        # Verify badge structure
        for badge in badges:
            assert "id" in badge
            assert "name" in badge
            assert "desc" in badge
            assert "icon" in badge
            assert "requirement" in badge
            assert "earned" in badge
            assert isinstance(badge["earned"], bool)
        
        print(f"Community badges: {data['earned_count']}/{data['total_count']} earned")
    
    def test_community_badges_no_progress_bars(self):
        """Verify community badges don't have progress bars (per requirements)"""
        response = requests.get(f"{BASE_URL}/api/badges/community")
        data = response.json()
        
        for badge in data["data"]:
            # Community badges should NOT have progress field
            assert "progress" not in badge, f"Badge {badge['name']} should not have progress bar"
        
        print("Verified: Community badges have no progress bars")
    
    def test_locked_badges_structure(self):
        """Verify locked badges have correct structure for grayed display"""
        response = requests.get(f"{BASE_URL}/api/badges/community")
        data = response.json()
        
        locked_badges = [b for b in data["data"] if not b["earned"]]
        earned_badges = [b for b in data["data"] if b["earned"]]
        
        print(f"Earned badges: {len(earned_badges)}, Locked badges: {len(locked_badges)}")
        
        # Verify all badges have required fields for UI display
        for badge in data["data"]:
            assert "icon" in badge  # For display
            assert "name" in badge  # For label
            assert "earned" in badge  # For grayed/lock icon display


class TestTripCompletionWithSafety:
    """Trip Completion with Safety Metrics Tests"""
    
    def test_complete_safe_trip(self):
        """POST /api/trips/complete-with-safety - Complete trip with safe driving"""
        response = requests.post(f"{BASE_URL}/api/trips/complete-with-safety", json={
            "distance": 10.5,
            "duration": 25,
            "safety_metrics": {
                "hard_brakes": 0,
                "speeding_incidents": 0,
                "phone_usage": 0
            }
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        
        result = data["data"]
        assert result["is_safe_drive"] == True
        assert "xp" in result
        assert "gems" in result
        
        # Verify safe drive XP (1000)
        xp_data = result["xp"]
        assert "changes" in xp_data
        xp_changes = xp_data["changes"]
        safe_drive_xp = next((x for x in xp_changes if x["type"] == "safe_drive"), None)
        assert safe_drive_xp is not None
        assert safe_drive_xp["xp"] == 1000
        
        print(f"Safe trip completed: XP changes={xp_changes}, gems={result['gems']['earned']}")
    
    def test_complete_unsafe_trip(self):
        """POST /api/trips/complete-with-safety - Complete trip with unsafe driving"""
        response = requests.post(f"{BASE_URL}/api/trips/complete-with-safety", json={
            "distance": 15.0,
            "duration": 30,
            "safety_metrics": {
                "hard_brakes": 2,
                "speeding_incidents": 1,
                "phone_usage": 0
            }
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        result = data["data"]
        assert result["is_safe_drive"] == False
        
        # Verify XP structure
        assert "xp" in result
        xp_data = result["xp"]
        xp_changes = xp_data.get("changes", [])
        
        if len(xp_changes) > 0:
            penalty = next((x for x in xp_changes if x["type"] == "safety_penalty"), None)
            if penalty:
                assert penalty["xp"] == -500
                print(f"Unsafe trip: penalty XP={penalty['xp']}")
        
        print(f"Unsafe trip completed: is_safe={result['is_safe_drive']}")
    
    def test_consistent_driving_bonus(self):
        """Test consistent driving bonus (every 3 safe drives = +500 XP)"""
        # Complete 3 safe trips to trigger bonus
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/trips/complete-with-safety", json={
                "distance": 5.0,
                "duration": 15,
                "safety_metrics": {
                    "hard_brakes": 0,
                    "speeding_incidents": 0,
                    "phone_usage": 0
                }
            })
            assert response.status_code == 200
            
            data = response.json()
            xp_data = data["data"]["xp"]
            xp_changes = xp_data.get("changes", [])
            
            # Check for consistent bonus on 3rd trip
            consistent_bonus = next((x for x in xp_changes if x["type"] == "consistent_bonus"), None)
            if consistent_bonus:
                assert consistent_bonus["xp"] == 500
                print(f"Trip {i+1}: Consistent driving bonus awarded: +{consistent_bonus['xp']} XP")
            else:
                print(f"Trip {i+1}: Safe drive XP only")


class TestUserProfile:
    """User Profile Tests for Phase 2A features"""
    
    def test_profile_shows_level_and_xp(self):
        """GET /api/user/profile - Profile shows level and XP"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        user = data["data"]
        assert "level" in user
        assert "xp" in user
        assert "xp_to_next_level" in user
        
        print(f"Profile: Level {user['level']}, XP: {user['xp']}")
    
    def test_profile_shows_reports_stats(self):
        """GET /api/user/profile - Profile shows reports stats"""
        response = requests.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 200
        
        data = response.json()
        user = data["data"]
        
        assert "reports_posted" in user
        assert "reports_upvotes_received" in user
        
        print(f"Reports: {user['reports_posted']} posted, {user['reports_upvotes_received']} upvotes received")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """GET /api/health - API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        print("API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
