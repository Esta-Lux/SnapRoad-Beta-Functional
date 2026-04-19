"""
WebSocket Admin Moderation & New Features Tests - Iteration 31
Tests: WS moderation endpoints, simulate, status, Partner Dashboard APIs
"""
import pytest
import requests
import json

from tests.http_integration import INTEGRATION_BASE_URL as BASE_URL


class TestModerationHTTPEndpoints:
    """Test HTTP endpoints related to admin moderation"""

    def test_moderation_status_200(self):
        """GET /api/admin/moderation/status returns 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/moderation/status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_moderation_status_has_queue_size(self):
        """Moderation status response has queue_size field"""
        resp = requests.get(f"{BASE_URL}/api/admin/moderation/status")
        data = resp.json()
        assert "data" in data, f"Missing 'data' key: {data}"
        assert "queue_size" in data["data"], f"Missing 'queue_size': {data}"

    def test_moderation_status_has_live_admin_connections(self):
        """Moderation status response has live_admin_connections field"""
        resp = requests.get(f"{BASE_URL}/api/admin/moderation/status")
        data = resp.json()
        assert "live_admin_connections" in data["data"], f"Missing 'live_admin_connections': {data}"

    def test_moderation_status_live_true(self):
        """Moderation status data.live is True"""
        resp = requests.get(f"{BASE_URL}/api/admin/moderation/status")
        data = resp.json()
        assert data["data"].get("live") is True, f"Expected live=True: {data}"

    def test_simulate_incident_201_or_200(self):
        """POST /api/admin/moderation/simulate creates a new incident"""
        resp = requests.post(f"{BASE_URL}/api/admin/moderation/simulate")
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"

    def test_simulate_incident_returns_incident(self):
        """Simulate response contains incident object with required fields"""
        resp = requests.post(f"{BASE_URL}/api/admin/moderation/simulate")
        data = resp.json()
        assert data.get("success") is True, f"Expected success=True: {data}"
        incident = data.get("incident", {})
        assert "id" in incident, f"Missing 'id' in incident: {incident}"
        assert "type" in incident, f"Missing 'type' in incident: {incident}"
        assert "confidence" in incident, f"Missing 'confidence' in incident: {incident}"
        assert "status" in incident, f"Missing 'status' in incident: {incident}"
        assert incident["status"] == "new", f"Expected status='new': {incident}"

    def test_simulate_incident_updates_queue_size(self):
        """After simulate, queue_size should increase"""
        # Get initial queue size
        status_before = requests.get(f"{BASE_URL}/api/admin/moderation/status").json()
        before = status_before["data"]["queue_size"]

        # Simulate an incident
        requests.post(f"{BASE_URL}/api/admin/moderation/simulate")

        # Get updated queue size
        status_after = requests.get(f"{BASE_URL}/api/admin/moderation/status").json()
        after = status_after["data"]["queue_size"]

        assert after > before, f"Queue size should increase: before={before}, after={after}"

    def test_simulate_incident_has_admin_connections_field(self):
        """Simulate response includes admin_connections field"""
        resp = requests.post(f"{BASE_URL}/api/admin/moderation/simulate")
        data = resp.json()
        assert "admin_connections" in data, f"Missing 'admin_connections': {data}"


class TestSupabaseStatus:
    """Test Supabase status endpoint"""

    def test_supabase_status_200(self):
        """GET /api/admin/supabase/status returns 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/supabase/status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_supabase_status_has_migration_needed(self):
        """Supabase status has migration_needed field"""
        resp = requests.get(f"{BASE_URL}/api/admin/supabase/status")
        data = resp.json()
        assert "data" in data
        assert "migration_needed" in data["data"], f"Missing migration_needed: {data}"


class TestWebSocketAdminModeration:
    """Test WebSocket endpoint for admin moderation using websocket-client"""

    def test_ws_endpoint_accepts_connection(self):
        """WebSocket /api/ws/admin/moderation accepts connection and sends backlog"""
        try:
            import websocket as ws_lib
            ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
            ws_url = f"{ws_url}/api/ws/admin/moderation"

            messages = []
            connected = [False]

            def on_open(ws):
                connected[0] = True

            def on_message(ws, message):
                messages.append(json.loads(message))
                if len(messages) >= 2:
                    ws.close()

            def on_error(ws, error):
                pass

            wsc = ws_lib.WebSocketApp(ws_url, on_open=on_open, on_message=on_message, on_error=on_error)
            import threading
            t = threading.Thread(target=lambda: wsc.run_forever(ping_timeout=5))
            t.daemon = True
            t.start()
            t.join(timeout=8)

            assert connected[0] is True, "WebSocket did not connect"
            msg_types = [m.get("type") for m in messages]
            assert "connection" in msg_types or "backlog" in msg_types, \
                f"Expected 'connection' or 'backlog' message, got: {msg_types}"
        except ImportError:
            pytest.skip("websocket-client not installed")

    def test_ws_receives_backlog_on_connect(self):
        """WebSocket sends a 'backlog' message upon connection"""
        try:
            import websocket as ws_lib
            ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
            ws_url = f"{ws_url}/api/ws/admin/moderation"

            messages = []

            def on_message(ws, message):
                messages.append(json.loads(message))
                if len(messages) >= 2:
                    ws.close()

            wsc = ws_lib.WebSocketApp(ws_url, on_message=on_message)
            import threading
            t = threading.Thread(target=lambda: wsc.run_forever(ping_timeout=5))
            t.daemon = True
            t.start()
            t.join(timeout=8)

            msg_types = [m.get("type") for m in messages]
            assert "backlog" in msg_types, f"Expected 'backlog' message, got: {msg_types}"
        except ImportError:
            pytest.skip("websocket-client not installed")

    def test_ws_receives_new_incident_on_simulate(self):
        """WebSocket broadcasts new_incident when simulate is called"""
        try:
            import websocket as ws_lib
            ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
            ws_url = f"{ws_url}/api/ws/admin/moderation"

            messages = []
            opened = [False]

            def on_open(ws):
                opened[0] = True

            def on_message(ws, message):
                msg = json.loads(message)
                messages.append(msg)

            wsc = ws_lib.WebSocketApp(ws_url, on_open=on_open, on_message=on_message)
            import threading
            t = threading.Thread(target=lambda: wsc.run_forever(ping_timeout=5))
            t.daemon = True
            t.start()

            # Wait for connection and backlog
            import time
            time.sleep(2)

            if opened[0]:
                # Trigger simulate
                requests.post(f"{BASE_URL}/api/admin/moderation/simulate")
                time.sleep(2)

            wsc.close()
            t.join(timeout=3)

            msg_types = [m.get("type") for m in messages]
            assert "new_incident" in msg_types, \
                f"Expected 'new_incident' after simulate, got: {msg_types}"
        except ImportError:
            pytest.skip("websocket-client not installed")


class TestPartnerEndpoints:
    """Test partner-related endpoints used in Partner Dashboard"""

    def test_partner_login_200(self):
        """Partner auth login works"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "partner@snaproad.com",
            "password": "password123"
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert "token" in data or data.get("success"), f"Expected token: {data}"

    def test_partner_credits_endpoint(self):
        """Partner credits/finance endpoint returns data"""
        # Login first to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "partner@snaproad.com", "password": "password123"
        })
        if login_resp.status_code != 200:
            pytest.skip("Partner login failed")

        token = login_resp.json().get("token", "")
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/api/partner/credits", headers=headers)
        assert resp.status_code in [200, 404], f"Expected 200/404, got {resp.status_code}: {resp.text}"

    def test_admin_analytics_200(self):
        """GET /api/admin/analytics returns 200 with summary"""
        resp = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True, f"Expected success=True: {data}"

    def test_health_check(self):
        """GET /api/health returns healthy"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy", f"Unexpected health status: {data}"
