"""
Backend tests for SnapRoad new features:
- Health endpoint
- Auth (login with Supabase fallback to mock)
- Admin Users list (Supabase-powered with mock fallback)
- Admin Supabase status endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHealthCheck:
    """Health endpoint tests"""

    def test_health_returns_healthy(self):
        """GET /api/health should return healthy"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        # Accept either {"status": "healthy"} or similar
        assert "healthy" in str(data).lower() or data.get("status") == "healthy", \
            f"Expected healthy in response, got: {data}"
        print("PASS: GET /api/health returns healthy")


class TestAuth:
    """Auth endpoint tests with Supabase-first, mock fallback"""

    def test_login_driver_success(self):
        """POST /api/auth/login with driver credentials should succeed"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "driver@snaproad.com",
            "password": "password123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True, f"Expected success=True, got: {data}"
        assert "data" in data, f"Expected 'data' key, got: {data}"
        assert "token" in data["data"], f"Expected 'token' in data, got: {data['data']}"
        assert "user" in data["data"], f"Expected 'user' in data, got: {data['data']}"
        print(f"PASS: Driver login success, token received")

    def test_login_partner_success(self):
        """POST /api/auth/login with partner credentials should succeed"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "partner@snaproad.com",
            "password": "password123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True
        assert "token" in data["data"]
        print("PASS: Partner login success")

    def test_login_admin_success(self):
        """POST /api/auth/login with admin credentials should succeed"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@snaproad.com",
            "password": "password123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True
        assert "token" in data["data"]
        print("PASS: Admin login success")

    def test_login_invalid_credentials(self):
        """POST /api/auth/login with bad credentials should return 401"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "notexist@snaproad.com",
            "password": "wrongpass"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print("PASS: Invalid credentials returns 401")


class TestAdminUsersEndpoint:
    """Tests for the Supabase-powered /api/admin/users endpoint"""

    def test_admin_users_returns_list(self):
        """GET /api/admin/users should return a user list"""
        resp = requests.get(f"{BASE_URL}/api/admin/users")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True, f"Expected success=True, got: {data}"
        assert "data" in data, f"Expected 'data' key, got: {data}"
        assert isinstance(data["data"], list), f"Expected list, got: {type(data['data'])}"
        assert len(data["data"]) > 0, f"Expected non-empty user list, got empty"
        assert "source" in data, f"Expected 'source' (supabase/mock) key, got: {data}"
        assert "total" in data, f"Expected 'total' key, got: {data}"
        print(f"PASS: /api/admin/users returned {data['total']} users from {data['source']}")

    def test_admin_users_data_structure(self):
        """Each user in /api/admin/users should have required fields"""
        resp = requests.get(f"{BASE_URL}/api/admin/users")
        assert resp.status_code == 200
        data = resp.json()
        users = data["data"]
        assert len(users) > 0
        first_user = users[0]
        required_fields = ["id", "email", "name", "plan", "status"]
        for field in required_fields:
            assert field in first_user, f"Missing field '{field}' in user: {first_user}"
        print(f"PASS: User structure valid - fields: {list(first_user.keys())}")


class TestSupabaseStatus:
    """Tests for the Supabase status endpoint"""

    def test_supabase_status_endpoint_exists(self):
        """GET /api/admin/supabase/status should return 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/supabase/status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True, f"Expected success=True, got: {data}"
        assert "data" in data, f"Expected 'data' key, got: {data}"
        print(f"PASS: /api/admin/supabase/status returned 200")

    def test_supabase_status_has_connected_field(self):
        """Supabase status should have 'connected' boolean field"""
        resp = requests.get(f"{BASE_URL}/api/admin/supabase/status")
        assert resp.status_code == 200
        data = resp.json()
        status_data = data["data"]
        assert "connected" in status_data, f"Expected 'connected' field, got: {status_data}"
        # connected can be True or False depending on Supabase availability
        print(f"PASS: Supabase status connected={status_data.get('connected')}")

    def test_supabase_status_connected_true(self):
        """Supabase should be connected (connected=True)"""
        resp = requests.get(f"{BASE_URL}/api/admin/supabase/status")
        assert resp.status_code == 200
        data = resp.json()
        status_data = data["data"]
        assert status_data.get("connected") is True, \
            f"Expected connected=True, got: {status_data}"
        print(f"PASS: Supabase connected=True, auth_users={status_data.get('auth_users')}")


class TestAdminAnalytics:
    """Tests for existing admin analytics endpoint"""

    def test_admin_analytics_returns_data(self):
        """GET /api/admin/analytics should return analytics data"""
        resp = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True
        assert "data" in data
        assert "summary" in data["data"]
        assert "chart_data" in data["data"]
        assert "top_partners" in data["data"]
        print("PASS: /api/admin/analytics returns full analytics data")
