# SnapRoad - Orion AI Coach & Partner Portal V2 API Tests
# Tests for: Orion chat, quick tips, Partner authentication, team, referrals, analytics

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "http://localhost:8001"

# Test partner credentials
PARTNER_EMAIL = "partner@snaproad.com"
PARTNER_PASSWORD = "password"
SAMPLE_PARTNER_ID = "partner_001"


class TestOrionAICoach:
    """Tests for Orion AI Coach endpoints"""
    
    def test_orion_quick_tips(self):
        """Test GET /api/orion/tips - Quick tip suggestions"""
        response = requests.get(f"{BASE_URL}/api/orion/tips")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "tips" in data
        assert len(data["tips"]) > 0
        
        # Verify tip structure
        tip = data["tips"][0]
        assert "id" in tip
        assert "text" in tip
        assert "icon" in tip
        print(f"Quick tips working: {len(data['tips'])} tips available")
    
    def test_orion_chat_message(self):
        """Test POST /api/orion/chat - AI chat response"""
        payload = {
            "message": "How can I improve my safety score?",
            "session_id": f"pytest_session_{int(time.time())}",
            "context": {
                "safety_score": 85,
                "gems": 500
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orion/chat",
            json=payload,
            timeout=60  # AI may take longer to respond
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "response" in data
        assert len(data["response"]) > 0
        assert "session_id" in data
        print(f"Orion chat working - Response length: {len(data['response'])} chars")
    
    def test_orion_chat_without_session_id(self):
        """Test POST /api/orion/chat - Auto-generates session ID"""
        payload = {
            "message": "What are fuel saving tips?"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orion/chat",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "session_id" in data
        assert data["session_id"].startswith("session_")
        print(f"Auto session ID generated: {data['session_id']}")
    
    def test_orion_get_history(self):
        """Test GET /api/orion/history/{session_id} - Get conversation history"""
        session_id = f"pytest_history_{int(time.time())}"
        
        # First send a message
        requests.post(
            f"{BASE_URL}/api/orion/chat",
            json={"message": "Hello", "session_id": session_id},
            timeout=60
        )
        
        # Get history
        response = requests.get(f"{BASE_URL}/api/orion/history/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "history" in data
        assert "count" in data
        print(f"History endpoint working - {data['count']} messages")
    
    def test_orion_clear_session(self):
        """Test DELETE /api/orion/session/{session_id} - Clear chat session"""
        session_id = f"pytest_clear_{int(time.time())}"
        
        # First create a session
        requests.post(
            f"{BASE_URL}/api/orion/chat",
            json={"message": "Test", "session_id": session_id},
            timeout=60
        )
        
        # Clear session
        response = requests.delete(f"{BASE_URL}/api/orion/session/{session_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        print("Session clear working")


class TestPartnerLoginV2:
    """Tests for Partner Portal V2 authentication"""
    
    def test_partner_login_success(self):
        """Test POST /api/partner/v2/login - Valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/login",
            json={"email": PARTNER_EMAIL, "password": PARTNER_PASSWORD}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["partner_id"] == SAMPLE_PARTNER_ID
        assert "business_name" in data
        assert "token" in data
        print(f"Partner login success: {data['business_name']}")
    
    def test_partner_login_invalid_credentials(self):
        """Test POST /api/partner/v2/login - Invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        
        assert response.status_code == 401
        print("Invalid credentials correctly rejected with 401")
    
    def test_partner_profile(self):
        """Test GET /api/partner/v2/profile/{partner_id} - Get partner profile"""
        response = requests.get(f"{BASE_URL}/api/partner/v2/profile/{SAMPLE_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["id"] == SAMPLE_PARTNER_ID
        assert "business_name" in data["data"]
        assert "credits" in data["data"]
        print(f"Partner profile: {data['data']['business_name']}")


class TestPartnerTeamV2:
    """Tests for Partner Team Management V2"""
    
    def test_get_team_members(self):
        """Test GET /api/partner/v2/team/{partner_id} - List team members"""
        response = requests.get(f"{BASE_URL}/api/partner/v2/team/{SAMPLE_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "count" in data
        assert data["count"] >= 1
        
        # Verify team member structure
        member = data["data"][0]
        assert "id" in member
        assert "name" in member
        assert "email" in member
        assert "role" in member
        assert member["role"] in ["owner", "manager", "staff"]
        assert "status" in member
        print(f"Team members: {data['count']} found")
    
    def test_invite_team_member_email(self):
        """Test POST /api/partner/v2/team/{partner_id}/invite - Email invite"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/team/{SAMPLE_PARTNER_ID}/invite",
            json={
                "email": f"test_invite_{int(time.time())}@example.com",
                "role": "staff",
                "method": "email"
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "member_id" in data
        assert data["method"] == "email"
        print(f"Team member invited: {data['member_id']}")
    
    def test_invite_team_member_code(self):
        """Test POST /api/partner/v2/team/{partner_id}/invite - Invite code"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/team/{SAMPLE_PARTNER_ID}/invite",
            json={
                "role": "manager",
                "method": "code"
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "invite_code" in data
        assert data["invite_code"].startswith("SNAP-STAFF-")
        print(f"Invite code generated: {data['invite_code']}")


class TestPartnerReferralsV2:
    """Tests for Partner Referrals V2 - $5 credit system"""
    
    def test_get_referrals(self):
        """Test GET /api/partner/v2/referrals/{partner_id} - List referrals with stats"""
        response = requests.get(f"{BASE_URL}/api/partner/v2/referrals/{SAMPLE_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "active" in stats
        assert "pending" in stats
        assert "total_earned" in stats
        assert "available_credits" in stats
        print(f"Referrals: {stats['total']} total, ${stats['total_earned']} earned")
    
    def test_send_referral(self):
        """Test POST /api/partner/v2/referrals/{partner_id} - Send referral invitation"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/referrals/{SAMPLE_PARTNER_ID}",
            json={
                "email": f"test_referral_{int(time.time())}@business.com",
                "message": "Join SnapRoad partner network!"
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "referral_id" in data
        print(f"Referral sent: {data['referral_id']}")
    
    def test_use_credits_subscription(self):
        """Test POST /api/partner/v2/credits/{partner_id}/use - Use credits for subscription"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/credits/{SAMPLE_PARTNER_ID}/use",
            json={
                "amount": 5.00,
                "purpose": "subscription"
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "amount_used" in data
        assert "remaining_credits" in data
        print(f"Credits used: ${data['amount_used']}, remaining: ${data['remaining_credits']}")


class TestPartnerAnalyticsV2:
    """Tests for Partner Analytics V2"""
    
    def test_get_analytics(self):
        """Test GET /api/partner/v2/analytics/{partner_id} - Partner analytics data"""
        response = requests.get(f"{BASE_URL}/api/partner/v2/analytics/{SAMPLE_PARTNER_ID}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        
        analytics = data["data"]
        assert "total_views" in analytics
        assert "total_clicks" in analytics
        assert "total_redemptions" in analytics
        assert "today_redemptions" in analytics
        assert "revenue" in analytics
        assert "active_offers" in analytics
        assert "team_members" in analytics
        assert "conversion_rate" in analytics
        print(f"Analytics: {analytics['total_views']} views, {analytics['total_redemptions']} redemptions")


class TestQRRedemptionV2:
    """Tests for QR Code Redemption V2"""
    
    def test_redeem_offer_success(self):
        """Test POST /api/partner/v2/redeem - Valid QR redemption"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/redeem",
            json={
                "qr_data": {
                    "offerId": "offer_001",
                    "customerId": f"customer_{int(time.time())}",
                    "token": f"token_{int(time.time())}"
                },
                "staff_id": "tm_002"
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "redemption_id" in data
        assert "offer" in data
        print(f"Redemption success: {data['redemption_id']}")
    
    def test_redeem_offer_invalid_qr(self):
        """Test POST /api/partner/v2/redeem - Invalid QR data"""
        response = requests.post(
            f"{BASE_URL}/api/partner/v2/redeem",
            json={
                "qr_data": {
                    "offerId": "invalid_offer"
                },
                "staff_id": "tm_002"
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        print(f"Invalid QR correctly rejected: {data['error']}")
    
    def test_get_recent_redemptions(self):
        """Test GET /api/partner/v2/redemptions/{partner_id} - Recent redemptions"""
        response = requests.get(
            f"{BASE_URL}/api/partner/v2/redemptions/{SAMPLE_PARTNER_ID}?limit=5"
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "count" in data
        print(f"Recent redemptions: {data['count']} found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
