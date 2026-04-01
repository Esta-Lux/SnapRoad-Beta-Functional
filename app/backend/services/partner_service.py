# SnapRoad - Partner Portal Service
# Backend service for partner operations: team management, referrals, redemptions

import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from dotenv import load_dotenv

load_dotenv()

_logger = logging.getLogger(__name__)

# In-memory storage (replace with MongoDB in production)
partner_db = {
    "partners": {},
    "team_members": {},
    "referrals": {},
    "redemptions": {},
    "offers": {},
    "invite_codes": {}
}

# Initialize with sample partner (plaintext password is dev fixture only; prod must use hashes).
SAMPLE_PARTNER_ID = "partner_001"
_SAMPLE_PARTNER_PASS = "password"  # nosec B105
partner_db["partners"][SAMPLE_PARTNER_ID] = {
    "id": SAMPLE_PARTNER_ID,
    "business_name": "FuelStation Pro",
    "email": "partner@snaproad.com",
    "password": _SAMPLE_PARTNER_PASS,
    "credits": 15.00,
    "subscription_plan": "pro",
    "created_at": "2024-12-01",
    "location": {
        "lat": 41.4993,
        "lng": -81.6944,
        "address": "123 Main St, Cleveland, OH 44114"
    },
    "settings": {
        "notifications": True,
        "auto_approve_staff": False
    }
}

# Initialize team members
partner_db["team_members"] = {
    "tm_001": {
        "id": "tm_001",
        "partner_id": SAMPLE_PARTNER_ID,
        "name": "John Smith",
        "email": "john@fuelstation.com",
        "role": "owner",
        "status": "active",
        "invited_at": "2024-12-01",
        "last_active": datetime.now().isoformat(),
        "redemptions_today": 0
    },
    "tm_002": {
        "id": "tm_002",
        "partner_id": SAMPLE_PARTNER_ID,
        "name": "Sarah Johnson",
        "email": "sarah@fuelstation.com",
        "role": "manager",
        "status": "active",
        "invited_at": "2025-01-15",
        "last_active": datetime.now().isoformat(),
        "redemptions_today": 12
    },
    "tm_003": {
        "id": "tm_003",
        "partner_id": SAMPLE_PARTNER_ID,
        "name": "Mike Davis",
        "email": "mike@fuelstation.com",
        "role": "staff",
        "status": "active",
        "invited_at": "2025-02-01",
        "last_active": datetime.now().isoformat(),
        "redemptions_today": 8
    },
    "tm_004": {
        "id": "tm_004",
        "partner_id": SAMPLE_PARTNER_ID,
        "name": "Emily Brown",
        "email": "emily@fuelstation.com",
        "role": "staff",
        "status": "pending",
        "invited_at": "2025-02-16",
        "last_active": None,
        "redemptions_today": 0
    }
}

# Initialize referrals
partner_db["referrals"] = {
    "ref_001": {"id": "ref_001", "referrer_id": SAMPLE_PARTNER_ID, "business_name": "Quick Lube Express", "email": "owner@quicklube.com", "status": "active", "credit_earned": 5.00, "referred_at": "2025-02-10", "activated_at": "2025-02-12"},
    "ref_002": {"id": "ref_002", "referrer_id": SAMPLE_PARTNER_ID, "business_name": "City Car Wash", "email": "manager@citywash.com", "status": "signed_up", "credit_earned": 0, "referred_at": "2025-02-14", "activated_at": None},
    "ref_003": {"id": "ref_003", "referrer_id": SAMPLE_PARTNER_ID, "business_name": "Prime Auto Repair", "email": "info@primeauto.com", "status": "pending", "credit_earned": 0, "referred_at": "2025-02-16", "activated_at": None},
    "ref_004": {"id": "ref_004", "referrer_id": SAMPLE_PARTNER_ID, "business_name": "Gas & Go Station", "email": "partner@gasgo.com", "status": "active", "credit_earned": 5.00, "referred_at": "2025-01-28", "activated_at": "2025-02-01"},
    "ref_005": {"id": "ref_005", "referrer_id": SAMPLE_PARTNER_ID, "business_name": "TireMax Center", "email": "sales@tiremax.com", "status": "active", "credit_earned": 5.00, "referred_at": "2025-01-20", "activated_at": "2025-01-25"},
}

# Initialize offers
partner_db["offers"] = {
    "offer_001": {
        "id": "offer_001",
        "partner_id": SAMPLE_PARTNER_ID,
        "title": "$0.15 off per gallon",
        "description": "Save on fuel with this exclusive offer",
        "gems_free": 50,
        "gems_premium": 40,
        "status": "active",
        "category": "fuel",
        "total_redemptions": 245,
        "created_at": "2025-01-15"
    },
    "offer_002": {
        "id": "offer_002",
        "partner_id": SAMPLE_PARTNER_ID,
        "title": "Free Car Wash",
        "description": "Get a free basic car wash with any fuel purchase",
        "gems_free": 100,
        "gems_premium": 80,
        "status": "active",
        "category": "service",
        "total_redemptions": 89,
        "created_at": "2025-01-20"
    }
}

def _is_prod():
    return os.getenv("ENVIRONMENT", "development").lower() == "production"


def _sb():
    from database import get_supabase
    return get_supabase()


class PartnerService:
    """Service for Partner Portal operations"""

    def authenticate(self, email: str, password: str) -> Optional[dict]:
        """Authenticate a partner user"""
        if _is_prod():
            sb = _sb()
            res = sb.table("partners").select("*").eq("email", email).limit(1).execute()
            if res.data:
                partner = res.data[0]
                return {"success": True, "partner_id": partner["id"], "business_name": partner.get("business_name", "")}
            return None
        for partner in partner_db["partners"].values():
            if partner["email"] == email and partner["password"] == password:
                return {
                    "success": True,
                    "partner_id": partner["id"],
                    "business_name": partner["business_name"],
                    "token": f"partner_token_{partner['id']}"
                }
        return None

    def get_partner(self, partner_id: str) -> Optional[dict]:
        """Get partner details"""
        if _is_prod():
            res = _sb().table("partners").select("*").eq("id", partner_id).limit(1).execute()
            return res.data[0] if res.data else None
        return partner_db["partners"].get(partner_id)
    
    # ==================== TEAM MANAGEMENT ====================
    
    def get_team_members(self, partner_id: str) -> List[dict]:
        """Get all team members for a partner"""
        return [
            tm for tm in partner_db["team_members"].values()
            if tm["partner_id"] == partner_id
        ]

    def get_team_member(self, member_id: str) -> Optional[dict]:
        """Get a single team member by ID."""
        return partner_db["team_members"].get(member_id)
    
    def invite_team_member(self, partner_id: str, email: str, role: str, method: str = "email") -> dict:
        """Invite a new team member"""
        member_id = f"tm_{uuid.uuid4().hex[:6]}"
        
        if method == "code":
            # Generate invite code
            code = f"SNAP-STAFF-{uuid.uuid4().hex[:6].upper()}"
            partner_db["invite_codes"][code] = {
                "partner_id": partner_id,
                "role": role,
                "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
                "used": False
            }
            return {"success": True, "invite_code": code, "method": "code"}
        
        # Email invite
        partner_db["team_members"][member_id] = {
            "id": member_id,
            "partner_id": partner_id,
            "name": email.split("@")[0].title(),
            "email": email,
            "role": role,
            "status": "pending",
            "invited_at": datetime.now().isoformat(),
            "last_active": None,
            "redemptions_today": 0
        }
        
        return {"success": True, "member_id": member_id, "method": "email"}
    
    def update_team_member_role(self, member_id: str, new_role: str) -> bool:
        """Update a team member's role"""
        if member_id in partner_db["team_members"]:
            partner_db["team_members"][member_id]["role"] = new_role
            return True
        return False
    
    def revoke_team_access(self, member_id: str) -> bool:
        """Revoke a team member's access"""
        if member_id in partner_db["team_members"]:
            partner_db["team_members"][member_id]["status"] = "revoked"
            return True
        return False
    
    # ==================== REFERRALS ====================
    
    def get_referrals(self, partner_id: str) -> List[dict]:
        """Get all referrals for a partner"""
        return [
            ref for ref in partner_db["referrals"].values()
            if ref["referrer_id"] == partner_id
        ]
    
    def get_referral_stats(self, partner_id: str) -> dict:
        """Get referral statistics"""
        referrals = self.get_referrals(partner_id)
        return {
            "total": len(referrals),
            "active": len([r for r in referrals if r["status"] == "active"]),
            "pending": len([r for r in referrals if r["status"] in ["pending", "signed_up"]]),
            "total_earned": sum(r["credit_earned"] for r in referrals),
            "available_credits": partner_db["partners"].get(partner_id, {}).get("credits", 0)
        }
    
    def send_referral(self, partner_id: str, email: str, message: str = "") -> dict:
        """Send a referral invitation"""
        ref_id = f"ref_{uuid.uuid4().hex[:6]}"
        partner_db["referrals"][ref_id] = {
            "id": ref_id,
            "referrer_id": partner_id,
            "business_name": "Pending",
            "email": email,
            "status": "pending",
            "credit_earned": 0,
            "referred_at": datetime.now().isoformat(),
            "activated_at": None,
            "message": message
        }
        return {"success": True, "referral_id": ref_id}
    
    def use_credits(self, partner_id: str, amount: float, purpose: str) -> dict:
        """Use referral credits for subscription or boosting"""
        partner = partner_db["partners"].get(partner_id)
        if not partner:
            return {"success": False, "error": "Partner not found"}
        
        if partner["credits"] < amount:
            return {"success": False, "error": "Insufficient credits"}
        
        partner["credits"] -= amount
        
        return {
            "success": True,
            "amount_used": amount,
            "purpose": purpose,
            "remaining_credits": partner["credits"]
        }
    
    # ==================== QR REDEMPTION ====================
    
    def validate_redemption(self, qr_data: dict, staff_id: str) -> dict:
        """Validate and process a QR code redemption"""
        try:
            offer_id = qr_data.get("offerId")
            customer_id = qr_data.get("customerId")
            token = qr_data.get("token")
            
            if not all([offer_id, customer_id, token]):
                return {"success": False, "error": "Invalid QR code data"}
            
            # Check if offer exists
            offer = partner_db["offers"].get(offer_id)
            if not offer:
                return {"success": False, "error": "Offer not found"}
            
            # Check if already redeemed (using token as unique identifier)
            redemption_key = f"{customer_id}_{token}"
            if redemption_key in partner_db["redemptions"]:
                return {"success": False, "error": "Offer already redeemed"}
            
            # Record redemption
            redemption_id = f"red_{uuid.uuid4().hex[:8]}"
            partner_db["redemptions"][redemption_key] = {
                "id": redemption_id,
                "offer_id": offer_id,
                "customer_id": customer_id,
                "staff_id": staff_id,
                "token": token,
                "redeemed_at": datetime.now().isoformat(),
                "is_repeat": qr_data.get("isRepeatPurchase", False)
            }
            
            # Update offer redemption count
            offer["total_redemptions"] += 1
            
            # Update staff redemption count
            if staff_id in partner_db["team_members"]:
                partner_db["team_members"][staff_id]["redemptions_today"] += 1
                partner_db["team_members"][staff_id]["last_active"] = datetime.now().isoformat()
            
            return {
                "success": True,
                "redemption_id": redemption_id,
                "offer": {
                    "id": offer_id,
                    "title": offer["title"],
                    "category": offer["category"]
                },
                "customer_id": customer_id,
                "is_repeat": qr_data.get("isRepeatPurchase", False)
            }
            
        except (TypeError, ValueError, KeyError) as e:
            return {"success": False, "error": str(e)}
        except Exception:
            _logger.exception("validate_redemption failed")
            return {"success": False, "error": "Redemption processing failed"}
    
    def get_recent_redemptions(self, partner_id: str, limit: int = 10) -> List[dict]:
        """Get recent redemptions for a partner"""
        if _is_prod():
            sb = _sb()
            offers_res = sb.table("offers").select("id").eq("partner_id", partner_id).execute()
            offer_ids = [o["id"] for o in (offers_res.data or [])]
            if not offer_ids:
                return []
            red_res = sb.table("redemptions").select("*").in_("offer_id", offer_ids).order("created_at", desc=True).limit(limit).execute()
            return red_res.data or []

        partner_offers = [o["id"] for o in partner_db["offers"].values() if o["partner_id"] == partner_id]
        redemptions = [r for r in partner_db["redemptions"].values() if r["offer_id"] in partner_offers]
        redemptions.sort(key=lambda x: x.get("redeemed_at", ""), reverse=True)
        result = []
        for r in redemptions[:limit]:
            staff = partner_db["team_members"].get(r["staff_id"], {})
            offer = partner_db["offers"].get(r["offer_id"], {})
            result.append({**r, "staff_name": staff.get("name", "Unknown"), "offer_title": offer.get("title", "Unknown")})
        return result
    
    # ==================== ANALYTICS ====================
    
    def get_analytics(self, partner_id: str) -> dict:
        """Get partner analytics data"""
        if _is_prod():
            sb = _sb()
            offers_res = sb.table("offers").select("id, status, redemption_count").eq("partner_id", partner_id).execute()
            partner_offers = offers_res.data or []
            total_redemptions = sum(int(o.get("redemption_count", 0)) for o in partner_offers)
            active = len([o for o in partner_offers if o.get("status") == "active"])
            return {
                "total_redemptions": total_redemptions,
                "active_offers": active,
                "revenue": round(total_redemptions * 8.50, 2),
            }

        partner_offers = [o for o in partner_db["offers"].values() if o["partner_id"] == partner_id]
        total_redemptions = sum(o["total_redemptions"] for o in partner_offers)
        team = self.get_team_members(partner_id)
        today_redemptions = sum(tm["redemptions_today"] for tm in team)
        return {
            "total_redemptions": total_redemptions,
            "today_redemptions": today_redemptions,
            "revenue": total_redemptions * 8.50,
            "active_offers": len([o for o in partner_offers if o["status"] == "active"]),
            "team_members": len([tm for tm in team if tm["status"] != "revoked"]),
        }

# Create singleton instance
partner_service = PartnerService()
