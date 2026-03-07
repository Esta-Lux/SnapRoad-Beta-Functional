from fastapi import APIRouter
from models.schemas import PlanUpdate, CarCustomization
from services.mock_data import (
    users_db, current_user_id, pricing_config,
    calculate_xp_for_level, calculate_xp_to_next_level,
    CAR_MODELS, CAR_SKINS, PREMIUM_COLORS,
    notification_settings, faq_data,
)

router = APIRouter(prefix="/api", tags=["Users"])


@router.get("/user/profile")
def get_user_profile():
    user = users_db.get(current_user_id, {})
    return {"success": True, "data": user}


@router.get("/user/stats")
def get_user_stats():
    user = users_db.get(current_user_id, {})
    return {
        "success": True,
        "data": {
            "total_miles": user.get("total_miles", 0),
            "total_trips": user.get("total_trips", 0),
            "safety_score": user.get("safety_score", 85),
            "gems": user.get("gems", 0),
            "level": user.get("level", 1),
            "xp": user.get("xp", 0),
        },
    }


@router.post("/user/plan")
def update_user_plan(plan: PlanUpdate):
    if current_user_id not in users_db:
        return {"success": False, "message": "User not found"}
    user = users_db[current_user_id]
    if plan.plan == "premium":
        user["is_premium"] = True
        user["plan"] = "premium"
        user["gem_multiplier"] = 2
        user["plan_selected"] = True
    else:
        user["is_premium"] = False
        user["plan"] = "basic"
        user["gem_multiplier"] = 1
        user["plan_selected"] = True
    return {"success": True, "message": f"Plan updated to {plan.plan}", "data": user}


@router.post("/user/car")
def update_user_car(car: CarCustomization):
    if current_user_id in users_db:
        users_db[current_user_id]["car_category"] = car.category
        users_db[current_user_id]["car_variant"] = car.variant
        users_db[current_user_id]["car_color"] = car.color
        users_db[current_user_id]["car_selected"] = True
    return {"success": True, "message": "Car customization saved"}


@router.get("/user/car")
def get_user_car():
    user = users_db.get(current_user_id, {})
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
def get_car_colors():
    user = users_db.get(current_user_id, {})
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
def purchase_car_color(color_key: str):
    user = users_db.get(current_user_id, {})
    cost = PREMIUM_COLORS.get(color_key, 0)
    if cost > 0:
        if user.get("gems", 0) < cost:
            return {"success": False, "message": "Not enough gems"}
        users_db[current_user_id]["gems"] = user["gems"] - cost
    users_db[current_user_id]["car_color"] = color_key
    return {"success": True, "message": f"Color {color_key} applied!"}


@router.get("/user/onboarding-status")
def get_onboarding_status():
    user = users_db.get(current_user_id, {})
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
def reset_session():
    if current_user_id in users_db:
        users_db[current_user_id]["onboarding_complete"] = False
        users_db[current_user_id]["plan_selected"] = False
        users_db[current_user_id]["car_selected"] = False
    return {"success": True, "message": "Session reset"}


@router.get("/cars")
def get_cars():
    user = users_db.get(current_user_id, {})
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
def purchase_car(car_id: int):
    car = next((c for c in CAR_MODELS if c["id"] == car_id), None)
    if not car:
        return {"success": False, "message": "Car not found"}
    user = users_db.get(current_user_id, {})
    if user.get("gems", 0) < car["price"]:
        return {"success": False, "message": "Not enough gems"}
    users_db[current_user_id]["gems"] -= car["price"]
    users_db[current_user_id].setdefault("owned_cars", [1]).append(car_id)
    return {"success": True, "message": f"Purchased {car['name']}!"}


@router.post("/cars/{car_id}/equip")
def equip_car(car_id: int):
    users_db.setdefault(current_user_id, {})["equipped_car"] = car_id
    return {"success": True, "message": "Car equipped!"}


@router.get("/skins")
def get_skins():
    user = users_db.get(current_user_id, {})
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
def purchase_skin(skin_id: int):
    skin = next((s for s in CAR_SKINS if s["id"] == skin_id), None)
    if not skin:
        return {"success": False, "message": "Skin not found"}
    user = users_db.get(current_user_id, {})
    if user.get("gems", 0) < skin["price"]:
        return {"success": False, "message": "Not enough gems"}
    users_db[current_user_id]["gems"] -= skin["price"]
    users_db[current_user_id].setdefault("owned_skins", [1]).append(skin_id)
    return {"success": True, "message": f"Purchased {skin['name']}!"}


@router.post("/skins/{skin_id}/equip")
def equip_skin(skin_id: int):
    users_db.setdefault(current_user_id, {})["equipped_skin"] = skin_id
    return {"success": True, "message": "Skin equipped!"}


@router.get("/pricing")
def get_pricing():
    return {"success": True, "data": pricing_config}


@router.get("/settings/notifications")
def get_notification_settings():
    return {"success": True, "data": notification_settings}


@router.post("/settings/notifications")
def update_notification_settings(settings: dict):
    notification_settings.update(settings)
    return {"success": True, "message": "Settings updated"}


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
def get_notifications():
    return {"success": True, "data": _notifications}


@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int):
    for n in _notifications:
        if n["id"] == notification_id:
            n["read"] = True
            return {"success": True, "data": n}
    return {"success": False, "message": "Notification not found"}


@router.put("/notifications/read-all")
def mark_all_read():
    for n in _notifications:
        n["read"] = True
    return {"success": True, "message": "All notifications marked as read"}


# ==================== VEHICLES ====================
@router.get("/user/vehicles")
def get_vehicles():
    user = users_db.get(current_user_id, {})
    car = user.get("car", {})
    return {"success": True, "data": [car] if car else []}


@router.post("/user/vehicles")
def add_vehicle(vehicle: dict):
    user = users_db.get(current_user_id, {})
    user["car"] = vehicle
    return {"success": True, "data": vehicle}


# ==================== FAMILY GROUP ====================
@router.get("/family/group")
def get_family_group():
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
def update_notification_settings_put(category: str = "", setting: str = "", enabled: bool = True):
    if category and setting:
        if category not in notification_settings:
            notification_settings[category] = {}
        notification_settings[category][setting] = enabled
    return {"success": True, "message": "Settings updated", "data": notification_settings}


@router.put("/user/profile")
def update_profile(body: dict):
    user = users_db.get(current_user_id, {})
    user.update({k: v for k, v in body.items() if k not in ("id", "email")})
    return {"success": True, "data": user}
