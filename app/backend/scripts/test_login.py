"""Test admin and partner login endpoints"""
import sys, os
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import requests
import json

BASE_URL = "http://localhost:8001"

# Test 1: Partner Login
print("=" * 60)
print("TEST 1: Partner Login")
print("=" * 60)
partner_data = {
    "email": "john.don@estaluxtest.com",
    "password": "Riyanm909@"
}
try:
    response = requests.post(f"{BASE_URL}/api/partner/v2/login", json=partner_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n")

# Test 2: Admin Login
print("=" * 60)
print("TEST 2: Admin Login")
print("=" * 60)
admin_data = {
    "email": "Riyan@snaproad.co",
    "password": "Riyanm909@"
}
try:
    response = requests.post(f"{BASE_URL}/api/auth/login", json=admin_data)
    print(f"Status Code: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")
    if result.get("success") and result.get("data"):
        user = result["data"].get("user", {})
        print(f"\nUser Role: {user.get('role')}")
except Exception as e:
    print(f"ERROR: {e}")
