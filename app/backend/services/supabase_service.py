"""
Supabase database service layer.
All database operations go through here.
Falls back to mock data when Supabase tables are not yet created.
"""
import logging
from typing import Optional, Any
from database import get_supabase

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _sb():
    return get_supabase()

def _table_missing(error) -> bool:
    """Check if error indicates a missing table."""
    err = str(error)
    return "PGRST205" in err or "schema cache" in err or "does not exist" in err


# ─────────────────────────────────────────────
# AUTH / USER MANAGEMENT (uses Supabase Auth)
# ─────────────────────────────────────────────

def sb_create_user(email: str, password: str, name: str, role: str = "driver") -> dict:
    """Create user in Supabase Auth. Returns user dict or raises exception."""
    sb = _sb()
    result = sb.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "name": name,
            "role": role,
            "gems": 150,
            "level": 1,
            "xp": 0,
            "xp_to_next_level": 2500,
            "safety_score": 100,
            "streak": 0,
            "total_miles": 0,
            "total_trips": 0,
            "is_premium": False,
            "plan": "basic",
            "onboarding_complete": False,
        }
    })
    user = result.user
    if not user:
        raise Exception("User creation failed")
    meta = user.user_metadata or {}
    return {
        "id": str(user.id),
        "email": str(user.email) if user.email else "",
        "name": name,
        "role": role,
        **{k: v for k, v in meta.items() if not callable(v)},
    }


def sb_login_user(email: str, password: str) -> Optional[dict]:
    """Authenticate user via Supabase Auth. Returns user dict or None."""
    try:
        sb = _sb()
        result = sb.auth.sign_in_with_password({"email": email, "password": password})
        user = result.user
        if not user:
            return None
        meta = user.user_metadata or {}
        return {
            "id": user.id,
            "email": user.email,
            "name": meta.get("name", ""),
            "role": meta.get("role", "driver"),
            **meta,
        }
    except Exception as e:
        logger.warning(f"Supabase login failed: {e}")
        return None


def sb_get_user_by_email(email: str) -> Optional[dict]:
    """Fetch a user by email from Supabase Auth admin."""
    try:
        sb = _sb()
        users = sb.auth.admin.list_users()
        for u in users:
            if getattr(u, "email", None) == email:
                meta = getattr(u, "user_metadata", None) or {}
                return {
                    "id": str(u.id),
                    "email": str(u.email) if getattr(u, "email", None) else "",
                    "name": meta.get("name", ""),
                    "role": meta.get("role", "driver"),
                    **{k: v for k, v in meta.items() if not callable(v)},
                }
        return None
    except Exception as e:
        logger.warning(f"sb_get_user_by_email failed: {e}")
        return None


def sb_update_user_metadata(user_id: str, updates: dict) -> bool:
    """Update user metadata in Supabase Auth."""
    try:
        sb = _sb()
        sb.auth.admin.update_user_by_id(user_id, {"user_metadata": updates})
        return True
    except Exception as e:
        logger.warning(f"sb_update_user_metadata failed: {e}")
        return False


def sb_list_auth_users(limit: int = 100) -> list:
    """List all users from Supabase Auth admin."""
    try:
        sb = _sb()
        users = sb.auth.admin.list_users()
        result = []
        for u in users[:limit]:
            meta = u.user_metadata or {}
            result.append({
                "id": u.id,
                "email": u.email or "",
                "name": meta.get("name", "Unknown"),
                "role": meta.get("role", "driver"),
                "plan": meta.get("plan", "basic"),
                "gems": meta.get("gems", 0),
                "safety_score": meta.get("safety_score", 85),
                "is_premium": meta.get("is_premium", False),
                "created_at": str(u.created_at) if u.created_at else "",
                "status": "active",
            })
        return result
    except Exception as e:
        logger.warning(f"sb_list_auth_users failed: {e}")
        return []


def sb_delete_user(user_id: str) -> bool:
    """Delete user from Supabase Auth."""
    try:
        _sb().auth.admin.delete_user(user_id)
        return True
    except Exception as e:
        logger.warning(f"sb_delete_user failed: {e}")
        return False


# ─────────────────────────────────────────────
# PARTNERS TABLE
# ─────────────────────────────────────────────

def sb_create_partner(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("partners").insert(data).execute()
        if result.data:
            row = result.data[0]
            row.pop("_id", None)
            return row
        return None
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_create_partner: {e}")
        return None


def sb_get_partners(limit: int = 50) -> list:
    try:
        result = _sb().table("partners").select(
            "id,business_name,business_type,email,plan,status,is_approved,created_at,total_redemptions"
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_partners: {e}")
        return []


def sb_update_partner(partner_id: str, updates: dict) -> bool:
    try:
        _sb().table("partners").update(updates).eq("id", partner_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_partner: {e}")
        return False


# ─────────────────────────────────────────────
# OFFERS TABLE
# ─────────────────────────────────────────────

def sb_get_offers(status: str = "active", limit: int = 50) -> list:
    try:
        query = _sb().table("offers").select(
            "id,business_name,business_type,description,base_gems,discount_percent,address,lat,lng,redemption_count,status,created_at,expires_at,image_url"
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


def sb_update_offer(offer_id: int, updates: dict) -> bool:
    try:
        _sb().table("offers").update(updates).eq("id", offer_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_update_offer: {e}")
        return False


def sb_delete_offer(offer_id: int) -> bool:
    try:
        _sb().table("offers").delete().eq("id", offer_id).execute()
        return True
    except Exception as e:
        logger.warning(f"sb_delete_offer: {e}")
        return False


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


def sb_get_trips(user_id: str, limit: int = 20) -> list:
    try:
        result = _sb().table("trips").select("*").eq("user_id", user_id).order(
            "started_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_trips: {e}")
        return []


# ─────────────────────────────────────────────
# ROAD REPORTS TABLE
# ─────────────────────────────────────────────

def sb_get_road_reports(lat: float = None, lng: float = None, limit: int = 50) -> list:
    try:
        result = _sb().table("road_reports").select(
            "id,type,description,lat,lng,address,upvotes,status,created_at"
        ).eq("status", "active").limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_road_reports: {e}")
        return []


def sb_create_road_report(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("road_reports").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_create_road_report: {e}")
        return None


# ─────────────────────────────────────────────
# EVENTS TABLE
# ─────────────────────────────────────────────

def sb_get_events(limit: int = 20) -> list:
    try:
        result = _sb().table("events").select("*").order(
            "start_date", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        if not _table_missing(e):
            logger.error(f"sb_get_events: {e}")
        return []


def sb_create_event(data: dict) -> Optional[dict]:
    try:
        result = _sb().table("events").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"sb_create_event: {e}")
        return None


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

def sb_create_notification(user_id: str, n_type: str, title: str, message: str) -> bool:
    try:
        _sb().table("notifications").insert({
            "user_id": user_id,
            "type": n_type,
            "title": title,
            "message": message,
        }).execute()
        return True
    except Exception as e:
        if not _table_missing(e):
            logger.warning(f"sb_create_notification: {e}")
        return False


def sb_get_notifications(user_id: str, limit: int = 20) -> list:
    try:
        result = _sb().table("notifications").select("*").eq("user_id", user_id).order(
            "created_at", desc=True
        ).limit(limit).execute()
        return result.data or []
    except Exception as e:
        return []


# ─────────────────────────────────────────────
# PLATFORM STATS (derived from auth)
# ─────────────────────────────────────────────

def sb_get_platform_stats() -> dict:
    """Get aggregate platform stats from Supabase."""
    try:
        sb = _sb()
        users = sb.auth.admin.list_users()
        total_users = len(users)
        premium_users = sum(1 for u in users if (u.user_metadata or {}).get("is_premium"))

        # Try to get partners count
        total_partners = 0
        try:
            p_result = sb.table("partners").select("id", count="exact").execute()
            total_partners = p_result.count or 0
        except Exception:
            pass

        # Try to get offers count
        total_offers = 0
        try:
            o_result = sb.table("offers").select("id", count="exact").eq("status", "active").execute()
            total_offers = o_result.count or 0
        except Exception:
            pass

        return {
            "total_users": total_users,
            "premium_users": premium_users,
            "total_partners": total_partners,
            "total_offers": total_offers,
            "total_trips": 0,
            "total_gems_earned": premium_users * 1200 + (total_users - premium_users) * 400,
        }
    except Exception as e:
        logger.warning(f"sb_get_platform_stats: {e}")
        return {}


# ─────────────────────────────────────────────
# CONNECTION TEST
# ─────────────────────────────────────────────

def test_connection() -> dict:
    """Quick connection test."""
    try:
        sb = _sb()
        users = sb.auth.admin.list_users()
        tables = []
        for tbl in ["partners", "offers", "trips", "events"]:
            try:
                sb.table(tbl).select("id").limit(1).execute()
                tables.append(tbl)
            except Exception:
                pass
        return {
            "connected": True,
            "auth_users": len(users),
            "available_tables": tables,
            "migration_needed": len(tables) < 4,
        }
    except Exception as e:
        return {"connected": False, "error": str(e)[:100]}
