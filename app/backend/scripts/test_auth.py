"""Test authentication directly"""
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

sb = get_supabase()

# Test authentication for partner account
print("Testing partner account authentication...")
email = "john.don@estaluxtest.com"
password = "Riyanm909@"

try:
    auth_resp = sb.auth.sign_in_with_password({"email": email, "password": password})
    print(f"SUCCESS: Authenticated")
    print(f"User ID: {auth_resp.user.id}")
    print(f"Email: {auth_resp.user.email}")
except Exception as e:
    print(f"FAILED: {e}")
    print("\nThis means the password in Supabase Auth doesn't match")
    print("Need to reset the password using admin API")
