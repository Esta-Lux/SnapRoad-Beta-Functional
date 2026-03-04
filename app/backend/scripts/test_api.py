"""Quick API test script"""
import requests

BASE = "http://localhost:8001"

def test_admin_login():
    print("=== Test 1: Admin Login ===")
    r = requests.post(f"{BASE}/api/auth/login", json={"email": "Riyan@snaproad.co", "password": "Riyanm909@"})
    d = r.json()
    print(f"Status: {r.status_code}")
    success = d.get("success")
    print(f"Success: {success}")
    user = d.get("data", {}).get("user", {})
    role = user.get("role")
    print(f"Role: {role}")
    token = d.get("data", {}).get("token", "")
    print(f"Token: {token[:30]}..." if token else "No token")
    return token

def test_admin_stats_with_token(token):
    print("\n=== Test 2: Admin Stats (with token) ===")
    r = requests.get(f"{BASE}/api/admin/stats", headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        s = r.json()
        data = s.get("data", {})
        print(f"Users: {data.get('total_users', '?')}")
        print(f"Partners: {data.get('total_partners', '?')}")
        print(f"Offers: {data.get('total_offers', '?')}")

def test_admin_stats_no_token():
    print("\n=== Test 3: Admin Stats (NO token - expect 401/403) ===")
    r = requests.get(f"{BASE}/api/admin/stats")
    print(f"Status: {r.status_code} {'PASS' if r.status_code in (401, 403) else 'FAIL'}")

def test_partner_plans():
    print("\n=== Test 4: Partner Plans ===")
    r = requests.get(f"{BASE}/api/partner/plans")
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        raw = r.json().get("data", {})
        plans = raw.get("plans", raw) if isinstance(raw, dict) else {}
        for k, v in plans.items():
            if not isinstance(v, dict):
                continue
            founders = v.get("price_founders", "N/A")
            public = v.get("price_public", "N/A")
            print(f"  {k}: ${founders} founders / ${public} public")

def test_partner_register():
    print("\n=== Test 5: Partner Register (expect 400 if exists) ===")
    r = requests.post(f"{BASE}/api/partner/v2/register", json={
        "first_name": "Test",
        "last_name": "Partner",
        "business_name": "Test Biz",
        "business_address": "123 Test St",
        "email": "testpartner@example.com",
        "password": "TestPass123!",
    })
    print(f"Status: {r.status_code}")
    d = r.json()
    print(f"Response: {d.get('success', d.get('detail', 'unknown'))}")
    if d.get("token"):
        print(f"Token: {d['token'][:30]}...")
    return d.get("token"), d.get("partner_id")

def test_boost_pricing():
    print("\n=== Test 6: Boost Pricing ===")
    r = requests.get(f"{BASE}/api/partner/boosts/pricing")
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json().get("data", {})
        for k, v in data.items():
            print(f"  {k}: ${v.get('price', '?')} - {v.get('description', '')}")

if __name__ == "__main__":
    token = test_admin_login()
    if token:
        test_admin_stats_with_token(token)
    test_admin_stats_no_token()
    test_partner_plans()
    test_partner_register()
    test_boost_pricing()
    print("\n=== All tests complete ===")
