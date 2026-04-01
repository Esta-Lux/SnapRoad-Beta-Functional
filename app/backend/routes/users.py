import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from typing import Annotated

from fastapi import APIRouter, HTTPException, Depends, Query
from models.schemas import PlanUpdate, CarCustomization
from services.mock_data import (
    users_db, pricing_config,
    calculate_xp_for_level, calculate_xp_to_next_level,
    CAR_MODELS, CAR_SKINS, PREMIUM_COLORS,
    notification_settings, faq_data,
)
from middleware.auth import get_current_user
from services.supabase_service import (
    sb_get_profile,
    sb_update_profile,
    sb_soft_delete_profile,
    sb_delete_auth_user,
)
from services.snap_road_score import compute_snap_road_fields

CurrentUser = Annotated[dict, Depends(get_current_user)]

router = APIRouter(prefix="/api", tags=["Users"])
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
logger = logging.getLogger(__name__)


def _get_user_store(user: Optional[Dict[str, Any]]) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = str(user.get("user_id") or user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth context")
    if user_id not in users_db:
        initial = {
            "id": user_id,
            "name": user.get("email", "Driver").split("@")[0].title() if user.get("email") else "Driver",
            "email": user.get("email", ""),
            "plan": "basic",
            "is_premium": False,
            "gem_multiplier": 1,
            "vehicle_height_meters": None,
        }
        # Ensure first-write is not memory-only in production.
        try:
            sb_update_profile(user_id, initial)
        except Exception:
            if ENVIRONMENT == "production":
                raise HTTPException(status_code=503, detail="User profile unavailable")
        users_db[user_id] = initial
    users_db[user_id].setdefault("vehicle_height_meters", None)
    return users_db[user_id]


def _persist_user(user_id: str, updates: dict) -> None:
    users_db.setdefault(user_id, {"id": user_id})
    users_db[user_id].update(updates)
    try:
        sb_update_profile(user_id, updates)
    except Exception:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="User persistence unavailable")


@router.get(
    "/user/profile",
    responses={
        401: {"description": "Authentication required or invalid auth context"},
        503: {"description": "User profile unavailable (production only)"},
    },
)
def get_user_profile(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    uid = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if uid:
        try:
            row = sb_get_profile(uid)
            if row and isinstance(row, dict):
                for k in (
                    "name",
                    "email",
                    "gems",
                    "level",
                    "xp",
                    "safety_score",
                    "total_miles",
                    "total_trips",
                    "is_premium",
                    "plan",
                    "role",
                    "streak",
                    "vehicle_height_meters",
                ):
                    if row.get(k) is not None:
                        user[k] = row[k]
        except Exception as e:
            logger.warning("failed to fetch user profile from Supabase: %s", e)
    payload = {**user, **compute_snap_road_fields(user)}
    return {"success": True, "data": payload}


def _deleted_email(user_id: str) -> str:
    return f"deleted_{user_id}@deleted.snaproad.app"


@router.get("/user/stats")
def get_user_stats(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    base = {
        "total_miles": user.get("total_miles", 0),
        "total_trips": user.get("total_trips", 0),
        "safety_score": user.get("safety_score", 85),
        "gems": user.get("gems", 0),
        "level": user.get("level", 1),
        "xp": user.get("xp", 0),
        "streak": user.get("streak") if user.get("streak") is not None else user.get("safe_drive_streak", 0),
    }
    return {"success": True, "data": {**base, **compute_snap_road_fields(user)}}


@router.post("/user/plan")
def update_user_plan(plan: PlanUpdate, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    user_id = str(user.get("id"))
    requested = str(plan.plan or "").strip().lower()
    if requested in ("basic", "free", ""):
        user["is_premium"] = False
        user["plan"] = "basic"
        user["gem_multiplier"] = 1
        user["plan_selected"] = True
        _persist_user(user_id, {
            "is_premium": user["is_premium"],
            "plan": user["plan"],
            "gem_multiplier": user["gem_multiplier"],
        })
        return {"success": True, "message": "Plan updated to basic", "data": users_db[user_id]}
    raise HTTPException(
        status_code=403,
        detail="Plan upgrades must go through checkout",
    )


@router.post("/user/car")
def update_user_car(car: CarCustomization, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    user_id = str(user.get("id"))
    _persist_user(user_id, {
        "car_category": car.category,
        "car_variant": car.variant,
        "car_color": car.color,
        "car_selected": True,
    })
    return {"success": True, "message": "Car customization saved"}


@router.delete("/user/account")
def delete_account(auth_user: dict = Depends(get_current_user)):
    user = _get_user_store(auth_user)
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth context")

    deleted_at = datetime.now(timezone.utc).isoformat()
    soft_delete_updates = {
        "email": _deleted_email(user_id),
        "name": "Deleted User",
        "full_name": "Deleted User",
        "status": "deleted",
        "password_hash": None,
        "plan": "basic",
        "is_premium": False,
        "gem_multiplier": 1,
        "partner_id": None,
        "stripe_customer_id": None,
        "state": None,
        "city": None,
        "deleted_at": deleted_at,
    }
    if not sb_soft_delete_profile(user_id, soft_delete_updates):
        raise HTTPException(status_code=503, detail="Account deletion failed")

    users_db.pop(user_id, None)

    if not sb_delete_auth_user(user_id):
        logger.warning("Soft-deleted profile %s but failed to delete auth user", user_id)

    return {
        "success": True,
        "message": "Account deleted successfully",
        "data": {"deleted_at": deleted_at},
    }


@router.get("/user/car")
def get_user_car(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    return {
        "success": True,
        "data": {
            "category": user.get("car_category", "sedan"),
            "variant": user.get("car_variant", "sedan-classic"),
            "color": user.get("car_color", "midnight-black"),
            "owned_colors": user.get("owned_colors", ["midnight-black", "ocean-blue", "arctic-white"]),
        }
    }


@router.get("/user/car/colors")
def get_car_colors(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    is_premium = user.get("is_premium", False)
    gems = user.get("gems", 0)
    colors = {
        "ocean-blue": {"name": "Ocean Blue", "hex": "#3B82F6", "premium": False, "cost": 0},
        "slate-gray": {"name": "Slate Gray", "hex": "#64748B", "premium": False, "cost": 0},
        "ruby-red": {"name": "Ruby Red", "hex": "#DC2626", "premium": False, "cost": 0},
        "forest-green": {"name": "Forest Green", "hex": "#16A34A", "premium": False, "cost": 0},
        "sunset-orange": {"name": "Sunset Orange", "hex": "#EA580C", "premium": False, "cost": 0},
        "arctic-white": {"name": "Arctic White", "hex": "#F8FAFC", "premium": False, "cost": 0},
    }
    for key, cost in PREMIUM_COLORS.items():
        colors[key] = {"name": key.replace("-", " ").title(), "hex": "#8B5CF6", "premium": True, "cost": cost, "can_afford": gems >= cost}
    return {"success": True, "data": {"colors": colors, "user_gems": gems, "is_premium": is_premium}}


@router.post("/user/car/color/{color_key}/purchase")
def purchase_car_color(color_key: str, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    user_id = str(user.get("id"))
    cost = PREMIUM_COLORS.get(color_key, 0)
    if cost > 0:
        if user.get("gems", 0) < cost:
            return {"success": False, "message": "Not enough gems"}
        _persist_user(user_id, {"gems": user["gems"] - cost})
    _persist_user(user_id, {"car_color": color_key})
    return {"success": True, "message": f"Color {color_key} applied!"}


@router.get("/user/onboarding-status")
def get_onboarding_status(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    return {
        "success": True,
        "data": {
            "account_created": True,
            "plan_selected": user.get("plan_selected", False),
            "car_selected": user.get("car_selected", False),
            "onboarding_complete": user.get("onboarding_complete", False),
        },
    }


@router.get("/session/reset")
def reset_session(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    user_id = str(user.get("id"))
    _persist_user(user_id, {
        "onboarding_complete": False,
        "plan_selected": False,
        "car_selected": False,
    })
    return {"success": True, "message": "Session reset"}


@router.get("/cars")
def get_cars(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    owned = user.get("owned_cars", [1])
    equipped = user.get("equipped_car", 1)
    return {
        "success": True,
        "data": [
            {**car, "owned": car["id"] in owned, "equipped": car["id"] == equipped}
            for car in CAR_MODELS
        ],
    }


@router.post("/cars/{car_id}/purchase")
def purchase_car(car_id: int, auth_user: CurrentUser):
    car = next((c for c in CAR_MODELS if c["id"] == car_id), None)
    if not car:
        return {"success": False, "message": "Car not found"}
    user = _get_user_store(auth_user)
    user_id = str(user.get("id"))
    if user.get("gems", 0) < car["price"]:
        return {"success": False, "message": "Not enough gems"}
    new_owned = list(users_db[user_id].get("owned_cars", [1]))
    if car_id not in new_owned:
        new_owned.append(car_id)
    _persist_user(user_id, {"gems": users_db[user_id]["gems"] - car["price"], "owned_cars": new_owned})
    return {"success": True, "message": f"Purchased {car['name']}!"}


@router.post("/cars/{car_id}/equip")
def equip_car(car_id: int, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    _persist_user(str(user.get("id")), {"equipped_car": car_id})
    return {"success": True, "message": "Car equipped!"}


@router.get("/skins")
def get_skins(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    owned = user.get("owned_skins", [1])
    equipped = user.get("equipped_skin", 1)
    return {
        "success": True,
        "data": [
            {**skin, "owned": skin["id"] in owned, "equipped": skin["id"] == equipped}
            for skin in CAR_SKINS
        ],
    }


@router.post("/skins/{skin_id}/purchase")
def purchase_skin(skin_id: int, auth_user: CurrentUser):
    skin = next((s for s in CAR_SKINS if s["id"] == skin_id), None)
    if not skin:
        return {"success": False, "message": "Skin not found"}
    user = _get_user_store(auth_user)
    user_id = str(user.get("id"))
    if user.get("gems", 0) < skin["price"]:
        return {"success": False, "message": "Not enough gems"}
    new_owned = list(users_db[user_id].get("owned_skins", [1]))
    if skin_id not in new_owned:
        new_owned.append(skin_id)
    _persist_user(user_id, {"gems": users_db[user_id]["gems"] - skin["price"], "owned_skins": new_owned})
    return {"success": True, "message": f"Purchased {skin['name']}!"}


@router.post("/skins/{skin_id}/equip")
def equip_skin(skin_id: int, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    _persist_user(str(user.get("id")), {"equipped_skin": skin_id})
    return {"success": True, "message": "Skin equipped!"}


@router.get("/pricing")
def get_pricing():
    return {"success": True, "data": pricing_config}


@router.get("/settings/notifications")
def get_notification_settings(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    settings = user.get("notification_settings")
    if not isinstance(settings, dict):
        settings = {**notification_settings}
        user["notification_settings"] = settings
    return {"success": True, "data": settings}


@router.post("/settings/notifications")
def update_notification_settings(settings: dict, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    user_id = str(user.get("id"))
    current = user.get("notification_settings")
    if not isinstance(current, dict):
        current = {**notification_settings}
    current.update(settings)
    _persist_user(user_id, {"notification_settings": current})
    return {"success": True, "message": "Settings updated", "data": users_db[user_id].get("notification_settings", current)}


@router.get("/help/faq")
def get_faq():
    return {"success": True, "data": faq_data}


@router.post("/help/contact")
def submit_contact(form: dict):
    return {"success": True, "message": "Message sent! We'll get back to you within 24 hours."}


@router.put("/settings/voice")
def update_voice_settings(settings: dict):
    return {"success": True, "message": "Voice settings updated", "data": settings}


# ==================== NOTIFICATIONS ====================
_notifications = [
    {"id": 1, "type": "reward", "title": "Gem Bonus!", "message": "You earned 50 bonus gems for safe driving this week", "read": False, "created_at": "2026-02-27T10:00:00Z"},
    {"id": 2, "type": "offer", "title": "New Offer Nearby", "message": "Shell Gas Station: 15% off fuel within 0.5 miles", "read": False, "created_at": "2026-02-27T09:30:00Z"},
    {"id": 3, "type": "challenge", "title": "Challenge Complete!", "message": "You completed the Weekend Warrior challenge", "read": True, "created_at": "2026-02-26T18:00:00Z"},
    {"id": 4, "type": "safety", "title": "Safety Score Update", "message": "Your safety score improved to 92!", "read": True, "created_at": "2026-02-26T12:00:00Z"},
]


@router.get("/notifications")
def get_notifications(
    _auth_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    user = _get_user_store(_auth_user)
    notes = user.get("notifications")
    if not isinstance(notes, list):
        notes = [dict(n) for n in _notifications]
        user["notifications"] = notes
    scoped = notes[:limit]
    return {"success": True, "data": scoped, "count": len(scoped)}


@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, _auth_user: CurrentUser):
    user = _get_user_store(_auth_user)
    notes = user.get("notifications")
    if not isinstance(notes, list):
        notes = [dict(n) for n in _notifications]
    for n in notes:
        if n["id"] == notification_id:
            n["read"] = True
            _persist_user(str(user.get("id")), {"notifications": notes})
            return {"success": True, "data": n}
    return {"success": False, "message": "Notification not found"}


@router.put("/notifications/read-all")
def mark_all_read(_auth_user: CurrentUser):
    user = _get_user_store(_auth_user)
    notes = user.get("notifications")
    if not isinstance(notes, list):
        notes = [dict(n) for n in _notifications]
    for n in notes:
        n["read"] = True
    _persist_user(str(user.get("id")), {"notifications": notes})
    return {"success": True, "message": "All notifications marked as read"}


# ==================== VEHICLES ====================
@router.get("/user/vehicles")
def get_vehicles(auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    car = user.get("car", {})
    return {"success": True, "data": [car] if car else []}


@router.post("/user/vehicles")
def add_vehicle(vehicle: dict, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    _persist_user(str(user.get("id")), {"car": vehicle})
    return {"success": True, "data": vehicle}


# ==================== FAMILY GROUP ====================
@router.get(
    "/family/group",
    responses={
        401: {"description": "Authentication required or invalid auth context"},
        503: {"description": "Family group service unavailable (production)"},
    },
)
def get_family_group(_auth_user: CurrentUser):
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=503, detail="Family group service unavailable")
    return {
        "success": True,
        "data": {
            "id": "fam_001",
            "name": "My Family",
            "created_at": "2026-01-15T10:00:00Z",
            "member_count": 3,
            "plan": "family_premium",
        }
    }


# ==================== SETTINGS (PUT support) ====================
@router.put("/settings/notifications")
def update_notification_settings_put(
    auth_user: CurrentUser,
    category: Annotated[str, Query()] = "",
    setting: Annotated[str, Query()] = "",
    enabled: Annotated[bool, Query()] = True,
):
    user = _get_user_store(auth_user)
    settings = user.get("notification_settings")
    if not isinstance(settings, dict):
        settings = {**notification_settings}
    if category and setting:
        if category not in settings:
            settings[category] = {}
        settings[category][setting] = enabled
    _persist_user(str(user.get("id")), {"notification_settings": settings})
    return {"success": True, "message": "Settings updated", "data": users_db[str(user.get("id"))].get("notification_settings", settings)}


@router.put("/user/profile", responses={400: {"description": "Invalid vehicle_height_meters value"}})
def update_profile(body: dict, auth_user: CurrentUser):
    user = _get_user_store(auth_user)
    updates = {k: v for k, v in body.items() if k not in ("id", "email")}
    if "vehicle_height_meters" in updates:
        raw = updates.get("vehicle_height_meters")
        if raw is None:
            updates["vehicle_height_meters"] = None
        else:
            try:
                height = float(raw)
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="vehicle_height_meters must be a number or null")
            if height < 0 or height > 5.0:
                raise HTTPException(status_code=400, detail="vehicle_height_meters must be between 0 and 5.0")
            updates["vehicle_height_meters"] = height
    # Graceful write behavior: if persistence layer/schema lacks this field,
    # keeping it in-memory remains non-fatal for this endpoint.
    _persist_user(str(user.get("id")), updates)
    users_db[str(user.get("id"))].setdefault("vehicle_height_meters", None)
    return {"success": True, "data": users_db[str(user.get("id"))]}


if ENVIRONMENT == "production":
    _LEGACY_PROD_DISABLED = {
        "/api/family/group",
    }
    router.routes = [r for r in router.routes if getattr(r, "path", "") not in _LEGACY_PROD_DISABLED]
