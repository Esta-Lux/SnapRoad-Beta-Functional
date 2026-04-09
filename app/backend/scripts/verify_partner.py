"""
Verify and fix partner account in Supabase.
Run from the backend directory:
    py scripts/verify_partner.py
"""
import sys, os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import importlib
import config
importlib.reload(config)

from services.supabase_service import sb_get_user_by_email, sb_create_partner, sb_get_partners
from database import get_supabase

PARTNER_EMAIL = "john.don@estaluxtest.com"

def main():
    sb = get_supabase()
    
    print(f"Checking partner account: {PARTNER_EMAIL}")
    
    # Check if user exists in profiles
    user = sb_get_user_by_email(PARTNER_EMAIL)
    if not user:
        print(f"[ERROR] User not found in profiles table")
        return
    
    user_id = user["id"]
    print(f"[OK] User found in profiles (id={user_id})")
    print(f"  - Role: {user.get('role', 'N/A')}")
    print(f"  - Name: {user.get('name', 'N/A')}")
    
    # Update role to partner if needed
    if user.get("role") != "partner":
        print(f"  - Updating role to 'partner'...")
        sb.table("profiles").update({"role": "partner"}).eq("id", user_id).execute()
        print(f"  [OK] Role updated to 'partner'")
    
    # Check if partner record exists
    partners = sb_get_partners(limit=200)
    partner_match = next((p for p in partners if p.get("email") == PARTNER_EMAIL), None)
    
    if partner_match:
        print(f"[OK] Partner record found (id={partner_match['id']})")
        print(f"  - Business: {partner_match.get('business_name', 'N/A')}")
        print(f"  - Plan: {partner_match.get('plan', 'N/A')}")
        print(f"  - Status: {partner_match.get('status', 'N/A')}")
    else:
        print(f"[ERROR] Partner record NOT found in partners table")
        print(f"  - Creating partner record...")
        
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        partner_data = {
            "id": user_id,
            "business_name": user.get("name", "Test Business"),
            "email": PARTNER_EMAIL,
            "password_hash": pwd_context.hash(os.getenv("SNAPROAD_TEST_PASSWORD", "")),
            "plan": "starter",
            "is_founders": True,
            "status": "active",
            "is_approved": True,
        }
        
        sb_create_partner(partner_data)
        print(f"  [OK] Partner record created")
    
    print("\n[SUCCESS] Partner account is now ready for login!")

if __name__ == "__main__":
    main()
