from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from datetime import datetime
import json

router = APIRouter(tags=["Webhooks & WebSocket"])


# ==================== STRIPE WEBHOOKS ====================
@router.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook handler - ready for Supabase integration."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    # In production, verify signature and update Supabase
    return {"success": True}


# ==================== WEBSOCKET ENDPOINTS ====================
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
