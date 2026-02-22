from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from datetime import datetime
import json
import random

router = APIRouter(tags=["Webhooks & WebSocket"])

# ==================== STRIPE WEBHOOKS ====================
@router.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook handler - ready for Supabase integration."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    return {"success": True}


# ==================== PARTNER WEBSOCKET ====================
@router.websocket("/ws/partner/{partner_id}")
async def partner_websocket(websocket: WebSocket, partner_id: str):
    from services.websocket_manager import ws_manager
    import uuid
    connection_id = f"conn_{uuid.uuid4().hex[:8]}"
    try:
        await ws_manager.connect_partner(websocket, partner_id, connection_id)
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                elif message.get("type") == "customer_nearby":
                    await ws_manager.notify_customer_nearby(partner_id, message.get("customer_id"), message.get("offer"))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect_partner(partner_id, connection_id)
    except Exception:
        await ws_manager.disconnect_partner(partner_id, connection_id)


@router.websocket("/ws/customer/{customer_id}")
async def customer_websocket(websocket: WebSocket, customer_id: str):
    from services.websocket_manager import ws_manager
    try:
        await ws_manager.connect_customer(websocket, customer_id)
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect_customer(customer_id)
    except Exception:
        await ws_manager.disconnect_customer(customer_id)


@router.get("/api/ws/status/{partner_id}")
async def get_ws_status(partner_id: str):
    from services.websocket_manager import ws_manager
    count = ws_manager.get_partner_connection_count(partner_id)
    return {"success": True, "active_connections": count, "partner_id": partner_id}


# ==================== ADMIN MODERATION WEBSOCKET ====================

# In-memory store for live incidents (cleared on restart)
_live_incidents: list = []
_next_incident_id = 100

INCIDENT_TYPES = [
    ("Speeding Event", 88),
    ("Hard Braking Detected", 82),
    ("Sharp Cornering", 79),
    ("Phone Usage Detected", 91),
    ("Reckless Lane Change", 94),
    ("Red Light Violation", 96),
    ("Road Obstruction Report", 85),
    ("Aggressive Tailgating", 90),
    ("Near-Miss Collision", 97),
    ("Wrong Way Driver Report", 99),
]

INCIDENT_LOCATIONS = [
    "I-70 E, Columbus OH",
    "High St & Broad, Columbus",
    "I-270 S Exit 17",
    "5th Ave, Columbus OH",
    "Morse Rd, Columbus",
    "I-71 N, near Dublin",
    "SR-315 N, Columbus",
    "Riverside Dr, Columbus",
    "N High St, Short North",
    "S Hamilton Rd, Gahanna",
]


def _make_incident() -> dict:
    global _next_incident_id
    _next_incident_id += 1
    itype, confidence = random.choice(INCIDENT_TYPES)
    confidence += random.randint(-5, 5)
    return {
        "id": _next_incident_id,
        "type": itype,
        "confidence": min(99, max(70, confidence)),
        "status": "new",
        "blurred": random.choice([True, False]),
        "location": random.choice(INCIDENT_LOCATIONS),
        "reportedAt": "just now",
        "timestamp": datetime.now().isoformat(),
    }


@router.websocket("/ws/admin/moderation")
async def admin_moderation_ws(websocket: WebSocket):
    """WebSocket endpoint for real-time admin incident moderation."""
    from services.websocket_manager import ws_manager
    import uuid
    admin_id = f"admin_{uuid.uuid4().hex[:8]}"
    try:
        await ws_manager.connect_admin(websocket, admin_id)
        # Send current backlog on connect
        await websocket.send_json({
            "type": "backlog",
            "incidents": _live_incidents[-20:],
            "timestamp": datetime.now().isoformat()
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "admin_count": ws_manager.get_admin_count(),
                        "timestamp": datetime.now().isoformat()
                    })
                elif msg.get("type") == "moderate":
                    # Admin moderates an incident — broadcast outcome to all admins
                    await ws_manager.broadcast_moderation_update(
                        msg.get("incident_id"), msg.get("outcome")
                    )
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect_admin(admin_id)
    except Exception:
        await ws_manager.disconnect_admin(admin_id)


@router.post("/api/admin/moderation/simulate")
async def simulate_incident():
    """Simulate a new incident arriving from the field (for demo/testing)."""
    from services.websocket_manager import ws_manager
    incident = _make_incident()
    _live_incidents.append(incident)
    await ws_manager.broadcast_incident(incident)
    return {
        "success": True,
        "incident": incident,
        "admin_connections": ws_manager.get_admin_count(),
    }


@router.get("/api/admin/moderation/status")
def moderation_status():
    from services.websocket_manager import ws_manager
    return {
        "success": True,
        "data": {
            "queue_size": len(_live_incidents),
            "live_admin_connections": ws_manager.get_admin_count(),
            "live": True,
        }
    }
