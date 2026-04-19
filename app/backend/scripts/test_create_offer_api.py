"""Test offer creation via API"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)
from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)
import requests, json

partner_id = "781ce093-6aab-43bd-b642-69f29756822c"
location_id = "e6d4bdfb-4478-49eb-a7df-388bd010b47a"
url = f"http://localhost:8001/api/partner/offers?partner_id={partner_id}"

offer_data = {
    "title": "Test Offer",
    "description": "10% off everything",
    "discount_percent": 10,
    "expires_hours": 24,
    "location_id": location_id,
    "is_free_item": False,
    "image_url": "",
}

print("Testing offer creation via API...")
print(f"URL: {url}")
response = requests.post(url, json=offer_data)
print(f"Status: {response.status_code}")
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}")
