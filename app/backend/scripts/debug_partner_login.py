"""Debug partner login specifically"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import importlib
import config
importlib.reload(config)

from services.supabase_service import sb_login_user, sb_get_partners, sb_get_user_by_email

email = "john.don@estaluxtest.com"
password = os.getenv("SNAPROAD_TEST_PASSWORD", "")

print("=" * 60)
print("DEBUGGING PARTNER LOGIN")
print("=" * 60)

# Step 1: Check if user exists in profiles
print(f"\n1. Checking if user exists in profiles...")
user = sb_get_user_by_email(email)
if user:
    print(f"   [OK] User found: {user.get('id')}")
    print(f"   Role: {user.get('role')}")
else:
    print(f"   [ERROR] User NOT found in profiles")

# Step 2: Check if partner record exists
print(f"\n2. Checking if partner record exists...")
partners = sb_get_partners(limit=200)
print(f"   Total partners in DB: {len(partners)}")
match = next((p for p in partners if p.get("email") == email), None)
if match:
    print(f"   [OK] Partner found: {match.get('id')}")
    print(f"   Business: {match.get('business_name')}")
else:
    print(f"   [ERROR] Partner record NOT found")

# Step 3: Test authentication
print(f"\n3. Testing authentication with sb_login_user...")
profile, err = sb_login_user(email, password)
if err:
    print(f"   [ERROR] Authentication FAILED: {err}")
else:
    print(f"   [OK] Authentication SUCCESS")
    print(f"   Role: {profile.get('role')}")
    print(f"   ID: {profile.get('id')}")

# Step 4: Simulate partner_login_v2 logic
print(f"\n4. Simulating partner_login_v2 endpoint logic...")
user_profile, login_err = sb_login_user(email, password)
if not user_profile:
    print(f"   [ERROR] Would return 401: Invalid email or password")
else:
    print(f"   [OK] sb_login_user succeeded")
    
    partners = sb_get_partners(limit=200)
    match = next((p for p in partners if p.get("email") == email), None)
    
    role = user_profile.get("role", "driver")
    print(f"   User role: {role}")
    print(f"   Partner match: {'YES' if match else 'NO'}")
    
    if role not in ("partner", "admin") and not match:
        print(f"   [ERROR] Would return 403: No partner account linked to this email")
    else:
        print(f"   [OK] Would return 200: Success")
        partner_id = match["id"] if match else str(user_profile.get("id", ""))
        business_name = match.get("business_name", "") if match else ""
        print(f"   Partner ID: {partner_id}")
        print(f"   Business: {business_name}")
