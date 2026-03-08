"""Test the actual endpoint logic directly without HTTP"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import importlib
import config
importlib.reload(config)

from services.supabase_service import sb_login_user, sb_get_user_by_email
from models.schemas import LoginRequest
import json

# Test admin login flow
print("=" * 60)
print("ADMIN LOGIN FLOW TEST")
print("=" * 60)

email = "Riyan@snaproad.co"
password = "Riyanm909@"

print(f"\n1. Calling sb_login_user...")
sb_user, sb_error = sb_login_user(email, password)
if sb_user:
    print(f"   SUCCESS - Role: {sb_user.get('role')}")
    print(f"   Full user: {json.dumps(sb_user, indent=2, default=str)[:500]}")
else:
    print(f"   FAILED - Error: {sb_error}")

print(f"\n2. Calling sb_get_user_by_email...")
profile = sb_get_user_by_email(email)
if profile:
    print(f"   SUCCESS - Role: {profile.get('role')}")
    print(f"   ID: {profile.get('id')}")
else:
    print(f"   FAILED - No profile found")

# Test partner login flow
print("\n" + "=" * 60)
print("PARTNER LOGIN FLOW TEST")
print("=" * 60)

email = "john.don@estaluxtest.com"
password = "Riyanm909@"

print(f"\n1. Calling sb_login_user...")
sb_user, sb_error = sb_login_user(email, password)
if sb_user:
    print(f"   SUCCESS - Role: {sb_user.get('role')}")
    print(f"   Full user: {json.dumps(sb_user, indent=2, default=str)[:500]}")
else:
    print(f"   FAILED - Error: {sb_error}")

print(f"\n2. Calling sb_get_user_by_email...")
profile = sb_get_user_by_email(email)
if profile:
    print(f"   SUCCESS - Role: {profile.get('role')}")
    print(f"   ID: {profile.get('id')}")
else:
    print(f"   FAILED - No profile found")

# Test partner endpoint logic
print("\n" + "=" * 60)
print("PARTNER ENDPOINT LOGIC TEST")
print("=" * 60)

from services.supabase_service import sb_get_partners

user, err = sb_login_user("john.don@estaluxtest.com", "Riyanm909@")
if user:
    role = user.get("role", "driver")
    print(f"User role: {role}")
    
    partners = sb_get_partners(limit=200)
    print(f"Total partners in DB: {len(partners)}")
    
    match = next((p for p in partners if p.get("email") == "john.don@estaluxtest.com"), None)
    if match:
        print(f"Partner match found: {match.get('business_name')}")
    else:
        print("NO PARTNER MATCH FOUND")
    
    if role not in ("partner", "admin") and not match:
        print("WOULD RETURN 403: No partner account linked to this email")
    else:
        print("WOULD SUCCEED")
