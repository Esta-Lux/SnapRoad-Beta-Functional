"""Test partner registration"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

from services.supabase_service import sb_create_user, sb_create_partner, sb_get_user_by_email

# Test data
email = "john.dan@estaluxtest.com"
password = os.getenv("SNAPROAD_TEST_PASSWORD", "")
first_name = "John"
last_name = "Dan"
business_name = "EstaLLC"
business_address = "123 Main St"

print("Testing partner registration...")

# Check if user already exists
existing = sb_get_user_by_email(email)
if existing:
    print(f"User already exists: {existing['id']}")
    user_id = existing['id']
else:
    # Create user
    print("Creating user in Auth + profiles...")
    try:
        full_name = f"{first_name} {last_name}"
        user = sb_create_user(email, password, full_name, "partner")
        user_id = user["id"]
        print(f"User created: {user_id}")
    except Exception as e:
        print(f"Error creating user: {e}")
        sys.exit(1)

# Create partner record
print("Creating partner record...")
try:
    from database import get_supabase
    sb = get_supabase()
    partner_data = {
        "id": str(user_id),
        "business_name": business_name,
        "email": email,
        "plan": "starter",
        "is_founders": True,
        "status": "active",
        "is_approved": True,
    }
    print(f"Attempting to insert: {partner_data}")
    result = sb.table("partners").insert(partner_data).execute()
    print(f"Partner created successfully!")
    print(f"Result: {result.data}")
except Exception as e:
    print(f"Error creating partner: {e}")
    import traceback
    traceback.print_exc()
