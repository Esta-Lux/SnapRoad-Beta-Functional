"""Test Supabase connection and DNS resolution"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import config
import socket

print("=" * 60)
print("TESTING SUPABASE CONNECTION")
print("=" * 60)

print(f"\n1. Environment variables:")
print(f"   SUPABASE_URL: {config.SUPABASE_URL}")
print(f"   SUPABASE_SERVICE_ROLE_KEY: {config.SUPABASE_SERVICE_ROLE_KEY[:50]}...")

print(f"\n2. DNS resolution test:")
try:
    url = config.SUPABASE_URL.replace("https://", "").replace("http://", "")
    ip = socket.gethostbyname(url)
    print(f"   [OK] {url} resolves to {ip}")
except Exception as e:
    print(f"   [ERROR] DNS resolution failed: {e}")

print(f"\n3. Supabase client initialization:")
try:
    from database import get_supabase
    sb = get_supabase()
    print(f"   [OK] Supabase client created")
except Exception as e:
    print(f"   [ERROR] Failed to create client: {e}")

print(f"\n4. Test database query:")
try:
    from database import get_supabase
    sb = get_supabase()
    result = sb.table("profiles").select("id,email").limit(1).execute()
    if result.data:
        print(f"   [OK] Query successful, found {len(result.data)} records")
    else:
        print(f"   [WARNING] Query returned no data")
except Exception as e:
    print(f"   [ERROR] Query failed: {e}")

print(f"\n5. Test authentication (admin):")
try:
    from services.supabase_service import sb_login_user
    user, err = sb_login_user("Riyan@snaproad.co", os.getenv("SNAPROAD_TEST_PASSWORD", ""))
    if user:
        print(f"   [OK] Admin login successful, role: {user.get('role')}")
    else:
        print(f"   [ERROR] Admin login failed: {err}")
except Exception as e:
    print(f"   [ERROR] Exception: {e}")

print(f"\n6. Test authentication (partner):")
try:
    from services.supabase_service import sb_login_user
    user, err = sb_login_user("john.don@estaluxtest.com", os.getenv("SNAPROAD_TEST_PASSWORD", ""))
    if user:
        print(f"   [OK] Partner login successful, role: {user.get('role')}")
    else:
        print(f"   [ERROR] Partner login failed: {err}")
except Exception as e:
    print(f"   [ERROR] Exception: {e}")
