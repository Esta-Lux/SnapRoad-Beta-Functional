"""
Supabase database service layer.
All database operations go through here.
Targets the actual Supabase schema: profiles, partners, offers, boosts,
challenges, badges, redemptions, incidents, notifications, campaigns,
rewards, audit_log, platform_settings, legal_documents, trips, referrals.
"""
import logging
from typing import Optional
from database import get_supabase

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _sb():
    return get_supabase()


def _table_missing(error) -> bool:
    err = str(error)
    return "PGRST205" in err or "schema cache" in err or "does not exist" in err


def _safe_count(table: str, filters: Optional[dict] = None) -> int:
    try:
        q = _sb().table(table).select("id", count="exact")
        if filters:
            for k, v in filters.items():
                q = q.eq(k, v)
        result = q.execute()
        return result.count or 0
    except Exception:
        return 0


# ─────────────────────────────────────────────
# AUTH (Supabase Auth + profiles)
# ─────────────────────────────────────────────

def sb_get_user_by_email(email: str) -> Optional[dict]:
    try:
        result = _sb().table("profiles").select("*").eq("email", email).limit(1).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.warning(f"sb_get_user_by_email error: {e}")
        return None


def sb_create_user(email: str, password: str, name: str, role: str = "driver") -> dict:
    import hashlib
    sb = _sb()
    auth_resp = sb.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
    })
    uid = auth_resp.user.id

    profile = {
        "id": uid,
        "email": email,
        "name": name,
        "password_hash": hashlib.sha256(password.encode()).hexdigest(),
        "role": role,
        "status": "active",
        "xp": 0,
        "level": 1,
        "gems": 0,
    }
    sb.table("profiles").upsert(profile).execute()
    return {**profile, "id": str(uid)}


def sb_login_user(email: str, password: str) -> tuple[Optional[dict], Optional[str]]:
    """Returns (profile_dict, None) on success or (None, error_message) on failure."""
    import hashlib
    import time
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            sb = _sb()
            
            # Fetch profile using service role client (bypasses RLS)
            profile_result = sb.table("profiles").select("*").eq("email", email).limit(1).execute()
            if not profile_result or not profile_result.data or len(profile_result.data) == 0:
                logger.warning(f"Profile not found for {email}")
                return None, "Invalid email or password"
            
            profile_data = profile_result.data[0]
            logger.info(f"Profile fetch SUCCESS for {email}, role={profile_data.get('role')}")
            
            # Verify password using stored hash
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            stored_hash = profile_data.get("password_hash", "")
            
            if password_hash != stored_hash:
                logger.warning(f"Password mismatch for {email}")
                return None, "Invalid email or password"
            
            logger.info(f"Password verified for {email}")
            return profile_data, None
            
        except Exception as e:
            error_str = str(e)
            # Check if it's a network/connection error
            if any(err in error_str.lower() for err in ["timeout", "connection", "getaddrinfo", "disconnected"]):
                if attempt < max_retries - 1:
                    logger.warning(f"Network error for {email} (attempt {attempt + 1}/{max_retries}): {e}. Retrying...")
                    # Reset client and retry
                    from database import reset_supabase_client
                    reset_supabase_client()
                    time.sleep(0.5)  # Brief delay before retry
                    continue
                else:
                    logger.error(f"Network error for {email} after {max_retries} attempts: {e}")
                    return None, "Service temporarily unavailable. Please try again."
            else:
                # Non-network error, don't retry
                logger.warning(f"sb_login_user error for {email}: {e}")
                return None, str(e)
    
    return None, "Invalid email or password"


# ─────────────────────────────────────────────
# PROFILES (users table — linked to Supabase Auth)
# ─────────────────────────────────────────────

def sb_list_profiles(limit: int = 100) -> list:
    try:
        result = _sb().table("profiles").select(
            "id,email,name,plan,xp,level,gems,safety_score,"
            "total_miles,total_trips,total_savings,is_premium,"
            "state,city,status,role,created_at,updated_at"
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_list_profiles: {e}")
        return []


def sb_get_profile(profile_id: str) -> Optional[dict]:
    try:
        result = _sb().table("profiles").select("*").eq("id", profile_id).single().execute()
        return result.data
    except Exception as e:
        logger.warning(f"sb_get_profile: {e}")
        return None


def sb_get_profile_by_email(email: str) -> Optional[dict]:
    try:
        result = _sb().table("profiles").select("*").eq("email", email).single().execute()
        return result.data
    except Exception as e:
        logger.warning(f"sb_get_profile_by_email: {e}")
        return None


def sb_update_profile(profile_id: str, updates: dict) -> bool:
    try:
        _sb().table("profiles").update(updates).eq("id", profile_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_profile: {e}")
        return False


def sb_suspend_profile(profile_id: str) -> bool:
    return sb_update_profile(profile_id, {"status": "suspended"})


def sb_activate_profile(profile_id: str) -> bool:
    return sb_update_profile(profile_id, {"status": "active"})


def sb_delete_profile(profile_id: str) -> bool:
    try:
        _sb().table("profiles").delete().eq("id", profile_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_profile: {e}")
        return False


# Legacy aliases for backward compatibility
sb_list_auth_users = sb_list_profiles
sb_delete_user = sb_delete_profile


# ─────────────────────────────────────────────
# PARTNERS TABLE
# ─────────────────────────────────────────────

def sb_create_partner(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("partners").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_create_partner: {e}")
        return None


def sb_get_partners(limit: int = 50) -> list:
    try:
        result = _sb().table("partners").select(
            "id,business_name,business_type,email,plan,status,"
            "is_approved,is_founders,subscription_status,"
            "created_at,updated_at,total_redemptions,phone,address"
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_partners: {e}")
        return []


def sb_get_partner(partner_id: str) -> Optional[dict]:
    try:
        result = _sb().table("partners").select("*").eq("id", partner_id).single().execute()
        return result.data
    except Exception as e:
        logger.warning(f"sb_get_partner: {e}")
        return None


def sb_update_partner(partner_id: str, updates: dict) -> bool:
    try:
        _sb().table("partners").update(updates).eq("id", partner_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_partner: {e}")
        return False


def sb_delete_partner(partner_id: str) -> bool:
    try:
        _sb().table("partners").delete().eq("id", partner_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_partner: {e}")
        return False


# ─────────────────────────────────────────────
# PARTNER LOCATIONS TABLE
# ─────────────────────────────────────────────

def sb_get_partner_locations(partner_id: Optional[str] = None, limit: int = 100) -> list:
    try:
        q = _sb().table("partner_locations").select("*").limit(limit)
        if partner_id:
            q = q.eq("partner_id", partner_id)
        result = q.execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_partner_locations: {e}")
        return []


def sb_create_partner_location(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("partner_locations").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_partner_location: {e}")
        return None


def sb_update_partner_location(location_id: str, updates: dict) -> bool:
    try:
        _sb().table("partner_locations").update(updates).eq("id", location_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_partner_location: {e}")
        return False


def sb_delete_partner_location(location_id: str) -> bool:
    try:
        _sb().table("partner_locations").delete().eq("id", location_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_partner_location: {e}")
        return False


def sb_set_primary_location(partner_id: str, location_id: str) -> bool:
    """Clear is_primary on all partner locations, then set the chosen one."""
    try:
        _sb().table("partner_locations").update({"is_primary": False}).eq("partner_id", partner_id).execute()
        _sb().table("partner_locations").update({"is_primary": True}).eq("id", location_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_set_primary_location: {e}")
        return False


def sb_get_offers_by_partner(partner_id: str, limit: int = 50) -> list:
    try:
        result = _sb().table("offers").select("*").eq("partner_id", partner_id).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_offers_by_partner: {e}")
        return []


def sb_get_redemptions_by_partner(partner_id: str, limit: int = 20) -> list:
    """Get redemptions for offers belonging to a partner."""
    try:
        offers = sb_get_offers_by_partner(partner_id, limit=200)
        offer_ids = [o["id"] for o in offers]
        if not offer_ids:
            return []
        result = _sb().table("redemptions").select("*").in_("offer_id", offer_ids).order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        logger.warning(f"sb_get_redemptions_by_partner: {e}")
        return []


def sb_get_partner_referrals(partner_id: str) -> list:
    try:
        result = _sb().table("partner_referrals").select("*").eq(
            "referrer_partner_id", partner_id
        ).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.warning(f"sb_get_partner_referrals: {e}")
        return []


def sb_create_partner_referral(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("partner_referrals").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_partner_referral: {e}")
        return None


# ─────────────────────────────────────────────
# OFFERS TABLE (id is UUID)
# ─────────────────────────────────────────────

def sb_get_offers(status: str = "active", limit: int = 50) -> list:
    try:
        query = _sb().table("offers").select(
            "id,partner_id,location_id,title,description,business_name,"
            "business_type,discount_percent,base_gems,lat,lng,status,"
            "redemption_count,views,image_url,created_at,expires_at,"
            "created_by,address,offer_url,is_admin_offer"
        ).limit(limit)
        if status != "all":
            query = query.eq("status", status)
        result = query.execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_offers: {e}")
        return []


def sb_create_offer(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("offers").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_offer: {e}")
        return None


def sb_update_offer(offer_id: str, updates: dict) -> bool:
    try:
        _sb().table("offers").update(updates).eq("id", offer_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_offer: {e}")
        return False


def sb_delete_offer(offer_id: str) -> bool:
    try:
        _sb().table("offers").delete().eq("id", offer_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_offer: {e}")
        return False


# ─────────────────────────────────────────────
# BOOSTS TABLE
# ─────────────────────────────────────────────

def sb_get_boosts(partner_id: Optional[str] = None, limit: int = 50) -> list:
    try:
        q = _sb().table("boosts").select("*").limit(limit)
        if partner_id:
            q = q.eq("partner_id", partner_id)
        result = q.execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_boosts: {e}")
        return []


def sb_create_boost(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("boosts").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_boost: {e}")
        return None


def sb_cancel_boost(boost_id: str) -> bool:
    try:
        _sb().table("boosts").update({"status": "cancelled"}).eq("id", boost_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_cancel_boost: {e}")
        return False


# ─────────────────────────────────────────────
# REDEMPTIONS TABLE
# ─────────────────────────────────────────────

def sb_get_redemptions(limit: int = 50) -> list:
    try:
        result = _sb().table("redemptions").select("*").order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_redemptions: {e}")
        return []


def sb_get_redemption_stats() -> dict:
    try:
        total = _safe_count("redemptions")
        verified = _safe_count("redemptions", {"status": "verified"})
        pending = _safe_count("redemptions", {"status": "pending"})
        return {"total": total, "verified": verified, "pending": pending}
    except Exception as e:
        logger.warning(f"sb_get_redemption_stats: {e}")
        return {"total": 0, "verified": 0, "pending": 0}


# ─────────────────────────────────────────────
# CHALLENGES TABLE
# ─────────────────────────────────────────────

def sb_get_challenges(limit: int = 50) -> list:
    try:
        result = _sb().table("challenges").select("*").order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_challenges: {e}")
        return []


def sb_create_challenge(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("challenges").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_challenge: {e}")
        return None


# ─────────────────────────────────────────────
# BADGES TABLE
# ─────────────────────────────────────────────

def sb_get_badges(limit: int = 50) -> list:
    try:
        result = _sb().table("badges").select("*").limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_badges: {e}")
        return []


# ─────────────────────────────────────────────
# TRIPS TABLE
# ─────────────────────────────────────────────

def sb_create_trip(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("trips").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_create_trip: {e}")
        return None


def sb_get_trips(profile_id: str, limit: int = 20) -> list:
    try:
        result = _sb().table("trips").select("*").eq(
            "profile_id", profile_id
        ).order("started_at", desc=True).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_trips: {e}")
        return []


def sb_get_trips_stats() -> dict:
    try:
        total = _safe_count("trips")
        completed = _safe_count("trips", {"status": "completed"})
        return {"total_trips": total, "completed_trips": completed}
    except Exception as e:
        logger.warning(f"sb_get_trips_stats: {e}")
        return {"total_trips": 0, "completed_trips": 0}


# ─────────────────────────────────────────────
# INCIDENTS TABLE
# ─────────────────────────────────────────────

def sb_get_incidents(status: Optional[str] = None, limit: int = 50) -> list:
    try:
        q = _sb().table("incidents").select("*").order(
            "created_at", desc=True
        ).limit(limit)
        if status:
            q = q.eq("status", status)
        result = q.execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_incidents: {e}")
        return []


def sb_create_incident(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("incidents").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_incident: {e}")
        return None


def sb_update_incident(incident_id: str, updates: dict) -> bool:
    try:
        _sb().table("incidents").update(updates).eq("id", incident_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_incident: {e}")
        return False


# ─────────────────────────────────────────────
# NOTIFICATIONS TABLE
# ─────────────────────────────────────────────

def sb_get_admin_notifications(limit: int = 50) -> list:
    try:
        result = _sb().table("notifications").select("*").order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_admin_notifications: {e}")
        return []


def sb_create_notification(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("notifications").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        if not _table_missing(e):
            logger.warning(f"sb_create_notification: {e}")
        return None


def sb_mark_notification_read(notification_id: str) -> bool:
    try:
        _sb().table("notifications").update(
            {"is_read": True, "status": "read"}
        ).eq("id", notification_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_mark_notification_read: {e}")
        return False


def sb_get_notifications(profile_id: str, limit: int = 20) -> list:
    try:
        result = _sb().table("notifications").select("*").eq(
            "profile_id", profile_id
        ).order("created_at", desc=True).limit(limit).execute()
        return result.data or []
    except Exception as e:
        return []


# ─────────────────────────────────────────────
# CAMPAIGNS TABLE
# ─────────────────────────────────────────────

def sb_get_campaigns(limit: int = 50) -> list:
    try:
        result = _sb().table("campaigns").select("*").order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_campaigns: {e}")
        return []


def sb_create_campaign(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("campaigns").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_campaign: {e}")
        return None


def sb_update_campaign(campaign_id: str, updates: dict) -> bool:
    try:
        _sb().table("campaigns").update(updates).eq("id", campaign_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_campaign: {e}")
        return False


def sb_delete_campaign(campaign_id: str) -> bool:
    try:
        _sb().table("campaigns").delete().eq("id", campaign_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_campaign: {e}")
        return False


# ─────────────────────────────────────────────
# REWARDS TABLE
# ─────────────────────────────────────────────

def sb_get_rewards(limit: int = 50) -> list:
    try:
        result = _sb().table("rewards").select("*").order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_rewards: {e}")
        return []


def sb_create_reward(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("rewards").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_reward: {e}")
        return None


def sb_update_reward(reward_id: str, updates: dict) -> bool:
    try:
        _sb().table("rewards").update(updates).eq("id", reward_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_reward: {e}")
        return False


def sb_delete_reward(reward_id: str) -> bool:
    try:
        _sb().table("rewards").delete().eq("id", reward_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_reward: {e}")
        return False


# ─────────────────────────────────────────────
# AUDIT LOG TABLE
# ─────────────────────────────────────────────

def sb_get_audit_logs(limit: int = 50) -> list:
    try:
        result = _sb().table("audit_log").select("*").order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_audit_logs: {e}")
        return []


def sb_create_audit_log(action: str, actor: str, target: str = "",
                        details: str = "", ip_address: str = "",
                        status: str = "success") -> Optional[dict]:
    try:
        result = _sb().table("audit_log").insert({
            "action": action,
            "actor": actor,
            "target": target,
            "details": details,
            "ip_address": ip_address,
            "status": status,
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        if not _table_missing(e):
            logger.warning(f"sb_create_audit_log: {e}")
        return None


# ─────────────────────────────────────────────
# PLATFORM SETTINGS TABLE (key-value)
# ─────────────────────────────────────────────

def sb_get_settings() -> dict:
    try:
        result = _sb().table("platform_settings").select("key,value").execute()
        settings = {}
        for row in (result.data or []):
            settings[row["key"]] = row["value"]
        return settings
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_settings: {e}")
        return {}


def sb_update_setting(key: str, value: dict) -> bool:
    try:
        _sb().table("platform_settings").upsert({
            "key": key,
            "value": value,
        }).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_setting: {e}")
        return False


# ─────────────────────────────────────────────
# LEGAL DOCUMENTS TABLE
# ─────────────────────────────────────────────

def sb_get_legal_documents() -> list:
    try:
        result = _sb().table("legal_documents").select("*").order(
            "last_updated", desc=True
        ).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_legal_documents: {e}")
        return []


def sb_update_legal_document(doc_id: str, updates: dict) -> bool:
    try:
        _sb().table("legal_documents").update(updates).eq("id", doc_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_legal_document: {e}")
        return False


# ─────────────────────────────────────────────
# REFERRALS + PARTNER REFERRALS
# ─────────────────────────────────────────────

def sb_get_referral_analytics() -> dict:
    try:
        sb = _sb()
        referrals = sb.table("referrals").select("*").execute().data or []
        total_signups = len(referrals)
        verified = [r for r in referrals if r.get("verified_at")]
        total_credits = sum(float(r.get("credits_awarded", 0)) for r in referrals)

        top_referrers = {}
        for r in referrals:
            email = r.get("referrer_email", "unknown")
            if email not in top_referrers:
                top_referrers[email] = {"email": email, "signups": 0, "credits": 0}
            top_referrers[email]["signups"] += 1
            top_referrers[email]["credits"] += float(r.get("credits_awarded", 0))

        sorted_referrers = sorted(
            top_referrers.values(), key=lambda x: x["signups"], reverse=True
        )
        for i, ref in enumerate(sorted_referrers):
            if i < 3:
                ref["tier"] = "Gold"
            elif i < 10:
                ref["tier"] = "Silver"
            else:
                ref["tier"] = "Bronze"

        cost_per_signup = (total_credits / total_signups) if total_signups > 0 else 0

        return {
            "summary": {
                "total_signups": total_signups,
                "verified_30d": len(verified),
                "cost_per_signup": round(cost_per_signup, 2),
                "credits_issued": round(total_credits, 2),
            },
            "top_referrers": sorted_referrers[:20],
        }
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_referral_analytics: {e}")
        return {
            "summary": {"total_signups": 0, "verified_30d": 0, "cost_per_signup": 0, "credits_issued": 0},
            "top_referrers": [],
        }


# ─────────────────────────────────────────────
# FINANCE AGGREGATION
# ─────────────────────────────────────────────

def sb_get_finance_summary() -> dict:
    try:
        sb = _sb()
        profiles = sb.table("profiles").select("plan,is_premium").execute().data or []
        premium_count = sum(1 for p in profiles if p.get("is_premium"))
        basic_count = len(profiles) - premium_count

        user_mrr = premium_count * 9.99
        partner_mrr_est = _safe_count("partners", {"status": "active"}) * 49.0

        redemptions = sb.table("redemptions").select("gems_earned,discount_applied").execute().data or []
        redemption_fees = sum(float(r.get("gems_earned", 0)) * 0.01 for r in redemptions)

        total_mrr = user_mrr + partner_mrr_est + redemption_fees

        return {
            "mrr_user_plans": round(user_mrr, 2),
            "mrr_partners": round(partner_mrr_est, 2),
            "redemption_fees": round(redemption_fees, 2),
            "total_mrr": round(total_mrr, 2),
        }
    except Exception as e:
        logger.warning(f"sb_get_finance_summary: {e}")
        return {
            "mrr_user_plans": 0,
            "mrr_partners": 0,
            "redemption_fees": 0,
            "total_mrr": 0,
        }


# ─────────────────────────────────────────────
# PLATFORM STATS (aggregated from real tables)
# ─────────────────────────────────────────────

def sb_get_platform_stats() -> dict:
    try:
        sb = _sb()

        profiles = sb.table("profiles").select("id,is_premium,gems").execute().data or []
        total_users = len(profiles)
        premium_users = sum(1 for p in profiles if p.get("is_premium"))

        total_partners = _safe_count("partners")
        active_partners = _safe_count("partners", {"status": "active"})
        total_offers = _safe_count("offers", {"status": "active"})
        total_redemptions = _safe_count("redemptions")

        trip_stats = sb_get_trips_stats()
        total_gems = sum(int(p.get("gems", 0)) for p in profiles)

        return {
            "total_users": total_users,
            "premium_users": premium_users,
            "total_partners": total_partners,
            "active_partners": active_partners,
            "total_offers": total_offers,
            "total_redemptions": total_redemptions,
            "total_trips": trip_stats.get("total_trips", 0),
            "total_gems": total_gems,
        }
    except Exception as e:
        logger.warning(f"sb_get_platform_stats: {e}")
        return {}


# ─────────────────────────────────────────────
# CONNECTION TEST
# ─────────────────────────────────────────────

def test_connection() -> dict:
    try:
        sb = _sb()
        tables = []
        for tbl in ["profiles", "partners", "offers", "boosts",
                     "challenges", "badges", "redemptions",
                     "trips", "incidents", "notifications",
                     "campaigns", "rewards", "audit_log",
                     "platform_settings", "legal_documents"]:
            try:
                sb.table(tbl).select("*").limit(1).execute()
                tables.append(tbl)
            except Exception:
                pass

        profile_count = _safe_count("profiles")
        return {
            "connected": True,
            "profile_count": profile_count,
            "available_tables": tables,
            "missing_tables": [t for t in [
                "profiles", "partners", "offers", "boosts", "challenges",
                "badges", "redemptions", "trips", "incidents", "notifications",
                "campaigns", "rewards", "audit_log", "platform_settings", "legal_documents"
            ] if t not in tables],
        }
    except Exception as e:
        return {"connected": False, "error": str(e)[:200]}
