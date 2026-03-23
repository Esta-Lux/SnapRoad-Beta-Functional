"""Check actual database state for both accounts"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import importlib
import config
importlib.reload(config)

from services.supabase_service import sb_get_user_by_email, sb_get_partners
from database import get_supabase
import json

sb = get_supabase()

print("=" * 60)
print("CHECKING DATABASE STATE")
print("=" * 60)

# Check admin account
print("\n1. ADMIN ACCOUNT (Riyan@snaproad.co)")
print("-" * 60)
admin = sb_get_user_by_email("Riyan@snaproad.co")
if admin:
    print(f"Found in profiles table:")
    print(f"  ID: {admin.get('id')}")
    print(f"  Email: {admin.get('email')}")
    print(f"  Name: {admin.get('name')}")
    print(f"  Role: {admin.get('role')}")
else:
    print("NOT FOUND in profiles table")

# Check partner account
print("\n2. PARTNER ACCOUNT (john.don@estaluxtest.com)")
print("-" * 60)
partner_user = sb_get_user_by_email("john.don@estaluxtest.com")
if partner_user:
    print(f"Found in profiles table:")
    print(f"  ID: {partner_user.get('id')}")
    print(f"  Email: {partner_user.get('email')}")
    print(f"  Name: {partner_user.get('name')}")
    print(f"  Role: {partner_user.get('role')}")
else:
    print("NOT FOUND in profiles table")

# Check partners table
print("\n3. PARTNERS TABLE")
print("-" * 60)
partners = sb_get_partners(limit=200)
print(f"Total partners: {len(partners)}")
for p in partners:
    print(f"  - {p.get('email')} (ID: {p.get('id')}, Business: {p.get('business_name')})")

# Direct query to verify
print("\n4. DIRECT DATABASE QUERY")
print("-" * 60)
try:
    result = sb.table("profiles").select("id,email,role").in_("email", ["Riyan@snaproad.co", "john.don@estaluxtest.com"]).execute()
    print("Profiles found:")
    for row in result.data:
        print(f"  {row.get('email')}: role={row.get('role')}, id={row.get('id')}")
except Exception as e:
    print(f"Error: {e}")
