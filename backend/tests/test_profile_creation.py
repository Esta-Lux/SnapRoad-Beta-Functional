from supabase import Client, create_client
from dataclasses import dataclass, asdict
from datetime import datetime

SUPABASE_URL = "https://cuseezsdaqlbwlxnjsyr.supabase.co"
SUPABASE_KEY = "sb_publishable_nzMWmL8pGRDgHciQLVcbHw_8qa65YZl"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@dataclass
class Profile:
    #id: str
    email: str
    password_hash: str
    name: str
    avatar_url: str = "N/A"
    plan: str = "basic"
    xp: int = 0
    level: int = 1
    gems: int = 100
    safety_score: int = 0
    car_category: str = "sedan"
    car_variant: str = "classic"
    car_color: str = "black"
    total_miles: str = "0.00"
    total_trips: int = 0
    total_savings: str = "0.00"
    state: str = "N/A"
    city: str = "N/A"
    onboarding_complete: bool = False
    is_premium: bool = False
    #created_at: str = datetime.now
    #updated_at: str = datetime.now

new_profile = Profile(
    #id="",
    email="andrew@test.com",
    password_hash="hashed_password",
    name="Andrew",
    state="CA",
    city="Sacramento"
)

response = supabase.table("profiles").insert(asdict(new_profile)).execute();

print(response.data);