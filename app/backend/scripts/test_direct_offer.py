import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)
from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

from services.supabase_service import sb_create_offer

partner_id = "781ce093-6aab-43bd-b642-69f29756822c"
location_id = "e6d4bdfb-4478-49eb-a7df-388bd010b47a"

# Test with only confirmed-working columns plus optional ones one at a time
test_data = {
    "partner_id": partner_id,
    "location_id": location_id,
    "title": "Test Offer v2",
    "description": "10% off everything",
    "discount_percent": 10,
    "lat": 39.9612,
    "lng": -82.9988,
    "status": "active",
    "image_url": "",
    "created_by": partner_id,
    "expires_at": "2026-03-07T18:00:00",
}

print(f"Testing with {len(test_data)} fields...")
result = sb_create_offer(test_data)
if result:
    print(f"SUCCESS: offer id = {result.get('id')}")
else:
    print("FAILED - check logs above for error")
