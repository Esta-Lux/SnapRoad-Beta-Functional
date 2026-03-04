"""Test offer creation"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import requests
import json

# Test data from the error
partner_id = "781ce093-6aab-43bd-b642-69f29756822c"
location_id = "e6d4bdfb-4478-49eb-a7df-388bd010b47a"

offer_data = {
    "title": "Test Offer",
    "description": "Test Description",
    "discount_percent": 10,
    "gems_reward": 50,
    "location_id": location_id,
    "expires_hours": 168,
    "image_url": None
}

print(f"Testing offer creation...")
print(f"Partner ID: {partner_id}")
print(f"Location ID: {location_id}")
print(f"Offer data: {json.dumps(offer_data, indent=2)}")

url = f"http://localhost:8001/api/partner/offers?partner_id={partner_id}"
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=offer_data, headers=headers)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'response'):
        print(f"Response text: {e.response.text}")
