"""Debug login to see what's being returned"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import importlib
import config
importlib.reload(config)

from database import get_supabase
import json

sb = get_supabase()

# Test direct profile fetch
print("=" * 60)
print("DIRECT PROFILE FETCH TEST")
print("=" * 60)

emails = ["Riyan@snaproad.co", "john.don@estaluxtest.com"]

for email in emails:
    print(f"\nEmail: {email}")
    try:
        result = sb.table("profiles").select("*").eq("email", email).limit(1).execute()
        if result.data and len(result.data) > 0:
            profile = result.data[0]
            print(f"  Found: {json.dumps(profile, indent=4, default=str)}")
        else:
            print(f"  NOT FOUND")
    except Exception as e:
        print(f"  ERROR: {e}")

# Test sb_login_user function
print("\n" + "=" * 60)
print("SB_LOGIN_USER FUNCTION TEST")
print("=" * 60)

from services.supabase_service import sb_login_user

for email, password in [("Riyan@snaproad.co", os.getenv("SNAPROAD_TEST_PASSWORD", "")), ("john.don@estaluxtest.com", os.getenv("SNAPROAD_TEST_PASSWORD", ""))]:
    print(f"\nEmail: {email}")
    profile, err = sb_login_user(email, password)
    if err:
        print(f"  ERROR: {err}")
    else:
        print(f"  SUCCESS")
        print(f"  Role: {profile.get('role')}")
        print(f"  Full profile: {json.dumps(profile, indent=4, default=str)}")
