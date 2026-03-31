"""Test RLS and auth context issues"""
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

print("Testing profile queries with different methods...")

# Test 1: Direct query without auth context
print("\n1. Direct query (no auth context):")
try:
    result = sb.table("profiles").select("*").eq("email", "Riyan@snaproad.co").limit(1).execute()
    if result.data:
        print(f"   SUCCESS - Role: {result.data[0].get('role')}")
    else:
        print(f"   FAILED - No data returned")
except Exception as e:
    print(f"   ERROR: {e}")

# Test 2: Query after sign_in (with auth context)
print("\n2. Query after sign_in (with auth context):")
try:
    # Sign in first
    auth_resp = sb.auth.sign_in_with_password({"email": "Riyan@snaproad.co", "password": "Riyanm909@"})
    print(f"   Auth successful, user ID: {auth_resp.user.id}")
    
    # Now try to query
    result = sb.table("profiles").select("*").eq("email", "Riyan@snaproad.co").limit(1).execute()
    if result.data:
        print(f"   SUCCESS - Role: {result.data[0].get('role')}")
    else:
        print(f"   FAILED - No data returned after auth")
        
    # Sign out
    sb.auth.sign_out()
except Exception as e:
    print(f"   ERROR: {e}")

# Test 3: Fresh client
print("\n3. Fresh client (no cached auth):")
from supabase import create_client
fresh_sb = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
try:
    result = fresh_sb.table("profiles").select("*").eq("email", "Riyan@snaproad.co").limit(1).execute()
    if result.data:
        print(f"   SUCCESS - Role: {result.data[0].get('role')}")
    else:
        print(f"   FAILED - No data returned")
except Exception as e:
    print(f"   ERROR: {e}")
