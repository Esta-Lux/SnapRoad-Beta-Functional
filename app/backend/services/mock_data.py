"""
Mock data store – keeps all in-memory data that was previously in server.py.
This will be progressively replaced by Supabase queries.
"""
from datetime import datetime, timedelta
import os

from services.demo_random import choice, randint, sample

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").strip().lower() == "production"

# ==================== PRICING ====================
pricing_config = {
    "founders_price": 10.99,
    "public_price": 16.99,
    "is_founders_active": True,
}

# ==================== USER HELPERS ====================
next_user_id = 123457
DEFAULT_DRIVER_ID = "00000000-0000-0000-0000-000000000001"
DEFAULT_PARTNER_ID = "00000000-0000-0000-0000-000000000002"
DEFAULT_ADMIN_ID = "00000000-0000-0000-0000-000000000003"

def create_new_user(user_id: str, name: str = "New Driver", email: str = "") -> dict:
    return {
        "id": user_id, "name": name, "email": email,
        "gems": 0, "level": 1, "xp": 0, "xp_to_next_level": 2500,
        "safety_score": 100, "streak": 0, "safe_drive_streak": 0,
        "total_miles": 0, "total_trips": 0, "badges_earned": [],
        "community_badges": [], "rank": 0, "state": "OH",
        "is_premium": False, "plan": None, "gem_multiplier": 1,
        "member_since": datetime.now().strftime("%b %Y"),
        "friends": [], "friend_requests": [],
        "owned_cars": [1], "equipped_car": 1,
        "owned_skins": [1], "equipped_skin": 1,
        "onboarding_complete": False, "plan_selected": False,
        "car_selected": False, "reports_posted": 0,
        "reports_upvotes_received": 0, "redeemed_offers": [],
    }

def calculate_xp_for_level(level: int) -> int:
    if level <= 1:
        return 0
    total = 0
    for lvl in range(2, level + 1):
        total += 2500 + (lvl - 2) * 500
    return total

def calculate_xp_to_next_level(level: int) -> int:
    if level >= 99:
        return 0
    return 2500 + (level - 1) * 500

# ==================== USERS DB ====================
users_db = {DEFAULT_DRIVER_ID: create_new_user(DEFAULT_DRIVER_ID, "Driver", "driver@snaproad.com")}

STATES = ["OH","OH","OH","OH","CA","TX","FL","NY","PA","IL","GA","NC","MI","NJ","VA","WA","AZ","MA","TN","IN"]
FIRST_NAMES = ["James","Emma","Liam","Olivia","Noah","Ava","Oliver","Isabella","Elijah","Sophia","Lucas","Mia","Mason","Charlotte","Ethan","Amelia","Aiden","Harper","Jacob","Evelyn"]
LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Thompson","White","Harris"]

for i in range(100):
    uid = str(123457 + i)
    is_premium = choice([True, False])
    level = randint(5, 99)
    users_db[uid] = {
        "id": uid, "name": f"{choice(FIRST_NAMES)} {choice(LAST_NAMES)}",
        "gems": randint(500, 50000), "level": level,
        "xp": calculate_xp_for_level(level) + randint(0, calculate_xp_to_next_level(level) // 2),
        "xp_to_next_level": calculate_xp_to_next_level(level),
        "safety_score": randint(60, 100), "streak": randint(0, 100),
        "safe_drive_streak": randint(0, 10),
        "total_miles": randint(100, 10000), "total_trips": randint(10, 500),
        "badges_earned": sample(range(1, 161), randint(3, 30)),
        "community_badges": sample(range(1, 21), randint(0, 5)),
        "rank": i + 1, "state": choice(STATES),
        "is_premium": is_premium, "plan": "premium" if is_premium else "basic",
        "gem_multiplier": 2 if is_premium else 1, "member_since": "2025",
        "friends": [], "friend_requests": [],
        "owned_cars": [1], "equipped_car": 1,
        "owned_skins": [1, 2], "equipped_skin": 1,
        "onboarding_complete": True, "reports_posted": randint(0, 50),
        "reports_upvotes_received": randint(0, 200),
    }

current_user_id = "123456"

# ==================== CREDENTIALS ====================
# Dev-only demo logins (module clears these in production).
_DEMO_LOGIN_PASS = "password123"  # nosec B105
user_credentials = {
    "driver@snaproad.com": {"password": _DEMO_LOGIN_PASS, "user_id": DEFAULT_DRIVER_ID},
    "partner@snaproad.com": {"password": _DEMO_LOGIN_PASS, "user_id": DEFAULT_PARTNER_ID},
    "admin@snaproad.com": {"password": _DEMO_LOGIN_PASS, "user_id": DEFAULT_ADMIN_ID},
}

if IS_PRODUCTION:
    users_db.clear()
    user_credentials.clear()
    current_user_id = ""

# Defer clearing mutable collections until after they are defined below.
# _clear_all_mock_in_production() is called at the end of this module.
def _clear_all_mock_in_production() -> None:
    """Wipe every mutable mock structure so production never serves seed data."""
    if not IS_PRODUCTION:
        return
    for name, obj in list(globals().items()):
        if name.startswith("_") or name.isupper():
            continue
        if isinstance(obj, list):
            obj.clear()
        elif isinstance(obj, dict) and name.endswith("_db"):
            obj.clear()

# ==================== ROAD REPORTS ====================
# Seed traffic cameras and road reports (Columbus OH area) so map overlay has data to show
_now = datetime.now()
_expiry = (_now + timedelta(hours=24)).isoformat()
_created = _now.isoformat()
road_reports_db = [
    # Traffic cameras
    {"id": 9001, "type": "camera", "lat": 39.9612, "lng": -83.0040, "title": "Traffic camera I-70 E", "description": "ODOT camera", "upvotes": 0, "created_at": _created, "expires_at": _expiry},
    {"id": 9002, "type": "camera", "lat": 39.9680, "lng": -82.9988, "title": "Traffic camera I-71 N", "description": "ODOT camera", "upvotes": 0, "created_at": _created, "expires_at": _expiry},
    {"id": 9003, "type": "camera", "lat": 39.9550, "lng": -83.0120, "title": "Traffic camera High St", "description": "City camera", "upvotes": 0, "created_at": _created, "expires_at": _expiry},
    {"id": 9004, "type": "camera", "lat": 39.9720, "lng": -82.9880, "title": "Traffic camera 5th Ave", "description": "ODOT camera", "upvotes": 0, "created_at": _created, "expires_at": _expiry},
    {"id": 9005, "type": "camera", "lat": 39.9480, "lng": -82.9950, "title": "Traffic camera I-70 W", "description": "ODOT camera", "upvotes": 0, "created_at": _created, "expires_at": _expiry},
    # Hazards / congestion so road status markers show
    {"id": 9006, "type": "hazard", "lat": 39.9612, "lng": -83.0100, "title": "I-70 Downtown", "description": "Rush hour traffic", "upvotes": 2, "created_at": _created, "expires_at": _expiry},
    {"id": 9007, "type": "construction", "lat": 39.9700, "lng": -82.9988, "title": "I-71 North", "description": "Construction zone", "upvotes": 1, "created_at": _created, "expires_at": _expiry},
    {"id": 9008, "type": "hazard", "lat": 39.9400, "lng": -83.0500, "title": "I-270 West", "description": "Accident reported", "upvotes": 3, "created_at": _created, "expires_at": _expiry},
]

# ==================== OFFERS ====================
offers_db = [
    {"id": 1, "business_name": "Shell Gas Station", "business_type": "gas", "description": "Save on your next fill-up!", "base_gems": 25, "address": "1234 High St, Columbus, OH 43201", "lat": 39.9650, "lng": -82.9930, "offer_url": None, "is_admin_offer": False, "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(days=7)).isoformat(), "created_by": "business", "redemption_count": 0},
    {"id": 2, "business_name": "Starbucks Downtown", "business_type": "cafe", "description": "Get a free size upgrade!", "base_gems": 15, "address": "45 E Broad St, Columbus, OH 43215", "lat": 39.9580, "lng": -83.0020, "offer_url": None, "is_admin_offer": False, "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(days=5)).isoformat(), "created_by": "business", "redemption_count": 0},
    {"id": 3, "business_name": "Quick Shine Car Wash", "business_type": "carwash", "description": "Premium wash at basic price", "base_gems": 30, "address": "890 N 4th St, Columbus, OH 43201", "lat": 39.9700, "lng": -82.9850, "offer_url": None, "is_admin_offer": False, "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(days=10)).isoformat(), "created_by": "business", "redemption_count": 0},
    {"id": 4, "business_name": "Groupon: Pizza Palace", "business_type": "restaurant", "description": "50% off any large pizza - Groupon Deal", "base_gems": 50, "address": "200 S High St, Columbus, OH 43215", "lat": 39.9550, "lng": -83.0100, "offer_url": "https://www.groupon.com/deals/pizza-palace-columbus", "is_admin_offer": True, "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(days=14)).isoformat(), "created_by": "admin", "redemption_count": 0},
    {"id": 5, "business_name": "BP Gas Station", "business_type": "gas", "description": "Save 10c/gallon with SnapRoad", "base_gems": 20, "address": "567 Cleveland Ave, Columbus, OH 43201", "lat": 39.9480, "lng": -82.9900, "offer_url": None, "is_admin_offer": False, "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(days=3)).isoformat(), "created_by": "business", "redemption_count": 0},
    {"id": 6, "business_name": "Groupon: Spa Retreat", "business_type": "service", "description": "60-min massage for $39 - Groupon", "base_gems": 40, "address": "780 Nationwide Blvd, Columbus, OH 43215", "lat": 39.9690, "lng": -83.0050, "offer_url": "https://www.groupon.com/deals/spa-retreat-columbus", "is_admin_offer": True, "created_at": datetime.now().isoformat(), "expires_at": (datetime.now() + timedelta(days=21)).isoformat(), "created_by": "admin", "redemption_count": 0},
]

OFFER_CONFIG = {"free_discount_percent": 6, "premium_discount_percent": 18, "gem_reward_multiplier": 1}

# ==================== GEMS ====================
route_gems_db = {}
collected_gems_db = {}

# ==================== CHALLENGES ====================
challenges_data = [
    {"id": 1, "title": "Weekly Driver", "description": "Complete 10 trips this week", "progress": 7, "target": 10, "gems": 100, "expires": "3 days", "type": "weekly", "completed": False, "claimed": False},
    {"id": 2, "title": "Safety Champion", "description": "Maintain 90+ safety score for 5 days", "progress": 3, "target": 5, "gems": 150, "expires": "4 days", "type": "weekly", "completed": False, "claimed": False},
    {"id": 3, "title": "Report Hero", "description": "Report 3 road hazards", "progress": 3, "target": 3, "gems": 75, "expires": "2 days", "type": "weekly", "completed": True, "claimed": False},
    {"id": 4, "title": "Distance Master", "description": "Drive 50 miles this week", "progress": 32, "target": 50, "gems": 125, "expires": "5 days", "type": "weekly", "completed": False, "claimed": False},
    {"id": 5, "title": "Early Bird", "description": "Start 3 trips before 7 AM", "progress": 1, "target": 3, "gems": 60, "expires": "6 days", "type": "weekly", "completed": False, "claimed": False},
]
challenges_db = []

# ==================== FUEL ====================
fuel_logs = [
    {"id": 1, "date": "2025-02-01", "station": "Shell", "price_per_gallon": 3.29, "gallons": 12.5, "total": 41.13, "odometer": 45230},
    {"id": 2, "date": "2025-01-28", "station": "Chevron", "price_per_gallon": 3.35, "gallons": 11.8, "total": 39.53, "odometer": 44920},
    {"id": 3, "date": "2025-01-24", "station": "Shell", "price_per_gallon": 3.31, "gallons": 13.2, "total": 43.69, "odometer": 44580},
    {"id": 4, "date": "2025-01-20", "station": "Exxon", "price_per_gallon": 3.42, "gallons": 10.9, "total": 37.28, "odometer": 44210},
    {"id": 5, "date": "2025-01-16", "station": "Shell", "price_per_gallon": 3.38, "gallons": 12.1, "total": 40.90, "odometer": 43870},
]

FUEL_PRICES = {"regular": 3.29, "midgrade": 3.59, "premium": 3.89, "diesel": 3.79, "last_updated": datetime.now().isoformat(), "source": "local_average"}

fuel_stats = {
    "totalSpent": 20,
    "totalGallons": 10,
    "averageMpg": 10,
    "fuelSaved": 20,
    "moneySaved": 5,
    "co2Reduced": 30,
    "weeklyData": { "week": "2", "spent": 2, "gallons": 10, "mpg": 15 }

}

# ==================== NOTIFICATIONS ====================
notification_settings = {
    "push_notifications": {"trip_summary": True, "challenges": True, "offers": True, "gems_earned": True, "friend_activity": False, "safety_alerts": True},
    "email_alerts": {"weekly_summary": True, "monthly_report": True, "special_offers": False, "account_updates": True},
    "in_app_sounds": {"navigation_voice": True, "notifications": True, "achievements": True},
}

# ==================== SAVED DATA ====================
saved_locations = []
saved_routes = []
widget_settings = {
    "score": {"visible": True, "collapsed": False, "position": {"x": 12, "y": 290}},
    "gems": {"visible": True, "collapsed": False, "position": {"x": 260, "y": 290}},
}

# ==================== ANALYTICS ====================
analytics_db = {"default_business": {"views": [], "redemptions": [], "clicks": [], "revenue": 0, "total_savings": 0}}
generated_images_db = {}
driver_location_history = {}
active_boosts = {}
admin_offers_db = []

# ==================== XP CONFIG ====================
XP_CONFIG = {
    "photo_report": 500, "offer_redemption": 700, "safe_drive": 1000,
    "consistent_driving": 500, "safety_score_penalty": -500,
    "base_xp_to_level": 2500, "xp_increment": 500, "max_level": 99,
}

# ==================== PARTNER DATA ====================
PARTNER_PLANS = {
    # Assigned at registration until the partner completes Stripe checkout for Starter or Growth.
    "unselected": {
        "name": "Select a plan",
        "price_founders": None,
        "price_public": None,
        "max_locations": 0,
        "features": ["Choose Starter or Growth below to unlock the partner portal"],
    },
    "starter": {"name": "Starter", "price_founders": 20.99, "price_public": 34.99, "max_locations": 5, "features": ["Up to 5 locations", "Gem placement on map", "Offer creation & tracking", "Foot traffic insights", "Business support"]},
    "growth": {"name": "Growth", "price_founders": 49.99, "price_public": 79.99, "max_locations": 25, "features": ["Everything in Starter", "Up to 25 locations", "Advanced analytics", "Featured placement", "Team access"]},
    # Legacy / sales-led only — not offered in self-serve partner portal.
    "enterprise": {"name": "Enterprise", "price_founders": None, "price_public": None, "max_locations": 999999, "features": ["Unlimited locations", "Everything in Growth", "Quarterly reviews", "Full API access", "Dedicated account manager"]},
    # Admin-assigned only; excluded from public GET /partner/plans
    "internal": {"name": "Internal / Complimentary", "price_founders": 0, "price_public": 0, "max_locations": 999999, "features": ["Full portal access (admin-granted)", "Upgrade to paid tier anytime"]},
}

partners_db = {
    "default_partner": {
        "id": "default_partner", "business_name": "Demo Business", "email": "partner@demo.com",
        "plan": "starter", "is_founders": True,
        "locations": [{"id": 1, "name": "Main Store - Downtown", "address": "100 N High St, Columbus, OH 43215", "lat": 39.9612, "lng": -82.9988, "is_primary": True, "created_at": datetime.now().isoformat()}],
        "created_at": datetime.now().isoformat(),
    }
}

BOOST_PRICING = {
    "basic": {"name": "Basic Boost", "duration_hours": 24, "price": 9.99, "multiplier": 1.5, "description": "24-hour visibility boost"},
    "standard": {"name": "Standard Boost", "duration_hours": 72, "price": 19.99, "multiplier": 2.0, "description": "3-day boost with featured placement"},
    "premium": {"name": "Premium Boost", "duration_hours": 168, "price": 39.99, "multiplier": 3.0, "description": "7-day featured boost with priority placement"},
}

PREMIUM_COLORS = {"carbon-fiber": 2500, "neon-cyan": 1500, "neon-pink": 1500, "neon-lime": 1500, "galaxy-purple": 2000, "inferno": 2000}

# ==================== FAQ ====================
faq_data = [
    {"id": 1, "category": "Getting Started", "question": "How do I start using SnapRoad?", "answer": "Simply open the app and allow location access. The app will automatically track your trips and calculate your safety score."},
    {"id": 2, "category": "Getting Started", "question": "What is a safety score?", "answer": "Your safety score (0-100) measures your driving habits including speed, braking, acceleration, and phone usage. Higher scores earn more gems!"},
    {"id": 3, "category": "Gems & Rewards", "question": "How do I earn gems?", "answer": "Earn gems by completing trips safely, finishing challenges, reporting road hazards, and maintaining high safety scores."},
    {"id": 4, "category": "Gems & Rewards", "question": "What can I use gems for?", "answer": "Spend gems on offers at partner locations (gas stations, coffee shops), car skins, and premium features."},
    {"id": 5, "category": "Gems & Rewards", "question": "Do gems expire?", "answer": "No, your gems never expire. Accumulate as many as you want!"},
    {"id": 6, "category": "Privacy", "question": "Is my location data shared?", "answer": "Never. SnapRoad is privacy-first. Your trip data stays on your device and is never sold to third parties."},
    {"id": 7, "category": "Privacy", "question": "Can I delete my trip history?", "answer": "Yes, go to Settings > Privacy > Delete Trip History to remove all your trip data."},
    {"id": 8, "category": "Features", "question": "How do challenges work?", "answer": "Challenges refresh weekly. Complete them before they expire to earn bonus gems. Tap 'Claim' when finished!"},
    {"id": 9, "category": "Features", "question": "How do I add friends?", "answer": "Open Friends Hub from the menu, go to 'Find Friends', and enter their 6-digit SnapRoad ID."},
    {"id": 10, "category": "Features", "question": "What is the leaderboard?", "answer": "The leaderboard ranks drivers by safety score. Filter by state to see how you compare locally!"},
    {"id": 11, "category": "Account", "question": "How do I upgrade to Premium?", "answer": "Go to Profile > Settings > Upgrade to unlock fuel tracking, advanced analytics, and exclusive rewards."},
    {"id": 12, "category": "Account", "question": "How do I change my profile?", "answer": "Go to Profile > tap your name to edit your display name, profile picture, and preferences."},
    {"id": 13, "category": "Troubleshooting", "question": "Why isn't my trip being tracked?", "answer": "Ensure location services are enabled and the app has 'Always' location permission. Check battery optimization settings."},
    {"id": 14, "category": "Troubleshooting", "question": "My safety score seems wrong", "answer": "Scores update after each trip. If you notice issues, try force-closing and reopening the app."},
    {"id": 15, "category": "Troubleshooting", "question": "App is using too much battery", "answer": "SnapRoad uses minimal battery. Go to Settings > Battery Mode to switch to power-saving tracking."},
]

# ==================== MAP LOCATIONS ====================
MAP_LOCATIONS = [
    {"id": 1, "name": "Downtown Columbus", "address": "100 N High St, Columbus, OH 43215", "lat": 39.9612, "lng": -82.9988, "type": "area"},
    {"id": 2, "name": "Ohio State University", "address": "281 W Lane Ave, Columbus, OH 43210", "lat": 40.0067, "lng": -83.0305, "type": "university"},
    {"id": 3, "name": "Easton Town Center", "address": "160 Easton Town Center, Columbus, OH 43219", "lat": 40.0507, "lng": -82.9137, "type": "shopping"},
    {"id": 4, "name": "Columbus Zoo", "address": "4850 W Powell Rd, Powell, OH 43065", "lat": 40.1560, "lng": -83.1186, "type": "attraction"},
    {"id": 5, "name": "Polaris Fashion Place", "address": "1500 Polaris Pkwy, Columbus, OH 43240", "lat": 40.1455, "lng": -82.9801, "type": "shopping"},
    {"id": 6, "name": "Short North Arts District", "address": "N High St, Columbus, OH 43201", "lat": 39.9775, "lng": -83.0037, "type": "entertainment"},
    {"id": 7, "name": "German Village", "address": "S Third St, Columbus, OH 43206", "lat": 39.9437, "lng": -82.9912, "type": "neighborhood"},
    {"id": 8, "name": "John Glenn Columbus Airport", "address": "4600 International Gateway, Columbus, OH 43219", "lat": 39.9980, "lng": -82.8919, "type": "airport"},
    {"id": 9, "name": "Nationwide Arena", "address": "200 W Nationwide Blvd, Columbus, OH 43215", "lat": 39.9692, "lng": -83.0059, "type": "venue"},
    {"id": 10, "name": "Ohio Stadium", "address": "411 Woody Hayes Dr, Columbus, OH 43210", "lat": 40.0017, "lng": -83.0196, "type": "stadium"},
    {"id": 11, "name": "COSI (Center of Science)", "address": "333 W Broad St, Columbus, OH 43215", "lat": 39.9576, "lng": -83.0064, "type": "museum"},
    {"id": 12, "name": "Franklin Park Conservatory", "address": "1777 E Broad St, Columbus, OH 43203", "lat": 39.9657, "lng": -82.9534, "type": "attraction"},
    {"id": 13, "name": "Shell Gas - Polaris", "address": "8799 Sancus Blvd, Columbus, OH 43240", "lat": 40.1430, "lng": -82.9805, "type": "gas"},
    {"id": 14, "name": "BP Gas - Downtown", "address": "150 E Broad St, Columbus, OH 43215", "lat": 39.9605, "lng": -82.9960, "type": "gas"},
    {"id": 15, "name": "Starbucks - Short North", "address": "785 N High St, Columbus, OH 43215", "lat": 39.9770, "lng": -83.0035, "type": "cafe"},
]

# ==================== BADGES ====================
# requirement_type: miles | trips | gems | safety | streak — progress computed server-side from profile.
ALL_BADGES = [
    {"id": 1, "name": "First Mile", "desc": "Drive your first mile", "icon": "car", "category": "distance", "requirement_type": "miles", "requirement": 1, "gems": 10},
    {"id": 2, "name": "Ten Down", "desc": "Drive 10 miles total", "icon": "navigate", "category": "distance", "requirement_type": "miles", "requirement": 10, "gems": 25},
    {"id": 3, "name": "Road Runner", "desc": "Drive 50 miles total", "icon": "footsteps", "category": "distance", "requirement_type": "miles", "requirement": 50, "gems": 50},
    {"id": 4, "name": "Century Club", "desc": "Drive 100 miles total", "icon": "ribbon", "category": "distance", "requirement_type": "miles", "requirement": 100, "gems": 100},
    {"id": 5, "name": "Road Warrior", "desc": "Drive 250 miles total", "icon": "flash", "category": "distance", "requirement_type": "miles", "requirement": 250, "gems": 150},
    {"id": 6, "name": "Highway Hero", "desc": "Drive 500 miles total", "icon": "car-sport", "category": "distance", "requirement_type": "miles", "requirement": 500, "gems": 200},
    {"id": 7, "name": "Cross Country", "desc": "Drive 1,000 miles total", "icon": "earth", "category": "distance", "requirement_type": "miles", "requirement": 1000, "gems": 350},
    {"id": 8, "name": "First Trip", "desc": "Complete your first SnapRoad trip", "icon": "flag", "category": "trips", "requirement_type": "trips", "requirement": 1, "gems": 15},
    {"id": 9, "name": "Regular", "desc": "Complete 10 trips", "icon": "calendar", "category": "trips", "requirement_type": "trips", "requirement": 10, "gems": 40},
    {"id": 10, "name": "Commuter", "desc": "Complete 50 trips", "icon": "repeat", "category": "trips", "requirement_type": "trips", "requirement": 50, "gems": 120},
    {"id": 11, "name": "Road Regular", "desc": "Complete 100 trips", "icon": "analytics", "category": "trips", "requirement_type": "trips", "requirement": 100, "gems": 250},
    {"id": 12, "name": "Gem Collector", "desc": "Hold 500 gems", "icon": "diamond", "category": "gems", "requirement_type": "gems", "requirement": 500, "gems": 50},
    {"id": 13, "name": "Gem Hoarder", "desc": "Hold 2,000 gems", "icon": "diamond-outline", "category": "gems", "requirement_type": "gems", "requirement": 2000, "gems": 150},
    {"id": 14, "name": "Safety Starter", "desc": "Reach 75 safety score", "icon": "shield-checkmark", "category": "safety", "requirement_type": "safety", "requirement": 75, "gems": 30},
    {"id": 15, "name": "Safety Pro", "desc": "Reach 85 safety score", "icon": "shield", "category": "safety", "requirement_type": "safety", "requirement": 85, "gems": 75},
    {"id": 16, "name": "Elite Driver", "desc": "Reach 95 safety score", "icon": "trophy", "category": "safety", "requirement_type": "safety", "requirement": 95, "gems": 200},
    {"id": 17, "name": "On a Roll", "desc": "3-day safe drive streak", "icon": "flame", "category": "streak", "requirement_type": "streak", "requirement": 3, "gems": 35},
    {"id": 18, "name": "Streak Master", "desc": "7-day safe drive streak", "icon": "flame-outline", "category": "streak", "requirement_type": "streak", "requirement": 7, "gems": 100},
]

COMMUNITY_BADGES = [
    {"id": 1, "name": "First Report", "desc": "Post your first road report", "icon": "pin", "requirement": 1},
    {"id": 2, "name": "Helpful Driver", "desc": "Get 10 upvotes on reports", "icon": "thumbs-up", "requirement": 10},
    {"id": 3, "name": "Road Guardian", "desc": "Post 10 road reports", "icon": "shield", "requirement": 10},
    {"id": 4, "name": "Community Hero", "desc": "Get 50 upvotes total", "icon": "hero", "requirement": 50},
    {"id": 5, "name": "Hazard Hunter", "desc": "Report 5 hazards", "icon": "warning", "requirement": 5},
]

CAR_MODELS = [
    {"id": 1, "name": "Compact Cruiser", "type": "sedan", "price": 0, "owned": True, "color": "#3B82F6"},
    {"id": 2, "name": "Sport Racer", "type": "sports", "price": 5000, "owned": False, "color": "#EF4444"},
    {"id": 3, "name": "Family SUV", "type": "suv", "price": 7500, "owned": False, "color": "#10B981"},
    {"id": 4, "name": "Luxury Elite", "type": "luxury", "price": 15000, "owned": False, "color": "#1F2937"},
    {"id": 5, "name": "Electric Future", "type": "electric", "price": 12000, "owned": False, "color": "#8B5CF6"},
    {"id": 6, "name": "Classic Muscle", "type": "muscle", "price": 10000, "owned": False, "color": "#F59E0B"},
    {"id": 7, "name": "Off-Road Beast", "type": "truck", "price": 8500, "owned": False, "color": "#78716C"},
    {"id": 8, "name": "City Mini", "type": "compact", "price": 3000, "owned": False, "color": "#EC4899"},
]

CAR_SKINS = [
    {"id": 1, "name": "Default Blue", "color": "#3B82F6", "gradient": None, "price": 0, "owned": True, "rarity": "common"},
    {"id": 2, "name": "Midnight Black", "color": "#1F2937", "gradient": None, "price": 0, "owned": True, "rarity": "common"},
    {"id": 3, "name": "Snow White", "color": "#F8FAFC", "gradient": None, "price": 500, "owned": False, "rarity": "common"},
    {"id": 4, "name": "Racing Red", "color": "#DC2626", "gradient": None, "price": 750, "owned": False, "rarity": "common"},
    {"id": 5, "name": "Aurora", "color": None, "gradient": "linear-gradient(135deg, #06B6D4 0%, #8B5CF6 50%, #EC4899 100%)", "price": 3500, "owned": False, "rarity": "epic"},
    {"id": 6, "name": "Galaxy", "color": None, "gradient": "linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #7C3AED 100%)", "price": 5000, "owned": False, "rarity": "legendary"},
]

# ==================== TRIPS ====================
# Real-time only: trips added when user completes a trip via app (no mock seed).
trips_db = []

_clear_all_mock_in_production()
