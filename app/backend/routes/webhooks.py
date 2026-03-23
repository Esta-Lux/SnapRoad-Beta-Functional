from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, Depends
from fastapi.responses import Response, JSONResponse
from datetime import datetime, timedelta
import json
import logging
import random
from middleware.auth import decode_token, require_admin
from services.telemetry_service import telemetry_service

router = APIRouter(tags=["Webhooks & WebSocket"])
logger = logging.getLogger(__name__)

# ==================== STRIPE WEBHOOKS ====================


def _handle_checkout_session_completed(session: dict) -> None:
    """Apply Supabase updates from Stripe Checkout metadata (partner portal + driver app)."""
    from services.supabase_service import (
        sb_get_partner,
        sb_update_partner,
        sb_update_profile,
        sb_create_boost,
        sb_update_offer,
    )
    from services.mock_data import BOOST_PRICING

    meta = session.get("metadata") or {}
    mode = session.get("mode") or ""
    payment_status = session.get("payment_status") or ""

    if payment_status not in ("paid", "no_payment_required"):
        logger.info("checkout.session.completed skipped: payment_status=%s", payment_status)
        return

    partner_id = (meta.get("partner_id") or "").strip()

    # Partner subscription (metadata from /partner/v2/subscribe)
    if partner_id and meta.get("plan") and mode == "subscription":
        plan = meta.get("plan")
        sb_update_partner(partner_id, {"plan": plan, "subscription_status": "active"})
        logger.info("Partner %s subscribed to plan %s", partner_id, plan)

    # Partner one-time credits (metadata from /partner/v2/credits/purchase)
    if partner_id and meta.get("credits_amount") is not None and mode == "payment":
        try:
            amt = float(meta.get("credits_amount", 0))
        except (TypeError, ValueError):
            amt = 0.0
        if amt > 0:
            p = sb_get_partner(partner_id)
            if p:
                cur = float(p.get("credits") or 0)
                sb_update_partner(partner_id, {"credits": cur + amt})
                logger.info("Partner %s credited $%.2f", partner_id, amt)

    # Partner boost purchase (metadata from /partner/v2/boosts/purchase)
    if partner_id and meta.get("boost_type") and mode == "payment":
        offer_id = str(meta.get("offer_id") or "").strip()
        boost_type = meta.get("boost_type")
        if offer_id and boost_type in BOOST_PRICING:
            cfg = BOOST_PRICING[boost_type]
            ends_at = datetime.utcnow() + timedelta(hours=cfg["duration_hours"])
            new_boost = sb_create_boost({
                "offer_id": offer_id,
                "partner_id": partner_id,
                "budget": cfg["price"],
                "duration_days": max(1, cfg["duration_hours"] // 24),
                "target_radius_miles": 10,
                "status": "active",
                "ends_at": ends_at.isoformat(),
            })
            if new_boost:
                sb_update_offer(offer_id, {
                    "boost_multiplier": cfg["multiplier"],
                    "boost_expiry": ends_at.isoformat(),
                })
                logger.info("Partner %s boost %s for offer %s", partner_id, boost_type, offer_id)

    # Driver / mobile subscription (metadata from /api/payments/checkout/session)
    user_id = (meta.get("user_id") or "").strip()
    plan_id = (meta.get("plan_id") or "").strip()
    if user_id and user_id != "anonymous" and plan_id in ("premium", "family") and mode == "subscription":
        sb_update_profile(user_id, {"plan": plan_id, "is_premium": True})
        logger.info("Profile %s upgraded to %s", user_id, plan_id)


@router.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """
    Stripe webhook. Set STRIPE_WEBHOOK_SECRET in .env and point Stripe to:
    POST https://<your-api-host>/api/webhooks/stripe
    Subscribe to at least: checkout.session.completed
    """
    from config import STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET missing — cannot verify Stripe webhooks")
        return JSONResponse(
            status_code=503,
            content={"error": "Webhook secret not configured"},
        )

    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY or ""
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.warning("Stripe webhook invalid payload: %s", e)
        return Response(status_code=400, content="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.warning("Stripe webhook signature verification failed: %s", e)
        return Response(status_code=400, content="Invalid signature")

    etype = event.get("type")
    obj = event.get("data", {}).get("object") or {}

    try:
        if etype == "checkout.session.completed":
            _handle_checkout_session_completed(obj)
        else:
            logger.debug("Stripe webhook unhandled type: %s", etype)
    except Exception as e:
        logger.exception("Stripe webhook handler error for %s: %s", etype, e)
        return JSONResponse(status_code=500, content={"error": "handler_failed"})

    return {"received": True}


# ==================== PARTNER WEBSOCKET ====================
@router.websocket("/api/ws/partner/{partner_id}")
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


@router.websocket("/api/ws/customer/{customer_id}")
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


@router.websocket("/api/ws/admin/moderation")
async def admin_moderation_ws(websocket: WebSocket):
    """WebSocket endpoint for real-time admin incident moderation."""
    from services.websocket_manager import ws_manager
    import uuid
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
    try:
        payload = decode_token(token)
        if payload.get("role") not in ("admin", "super_admin"):
            await websocket.close(code=1008, reason="Admin access required")
            return
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return
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
async def simulate_incident(_admin: dict = Depends(require_admin)):
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


@router.websocket("/api/ws/admin/monitor")
async def admin_monitor_ws(websocket: WebSocket):
    """Admin-only websocket stream for live request/error telemetry."""
    from services.websocket_manager import ws_manager
    import uuid
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return
    try:
        payload = decode_token(token)
        if payload.get("role") not in ("admin", "super_admin"):
            await websocket.close(code=1008, reason="Admin access required")
            return
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return

    admin_id = f"monitor_{uuid.uuid4().hex[:8]}"
    try:
        await ws_manager.connect_admin_monitor(websocket, admin_id)
        # Send warm snapshot on connect
        await websocket.send_json({
            "type": "telemetry_snapshot",
            "events": telemetry_service.snapshot(limit=100),
            "timestamp": datetime.now().isoformat(),
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat(),
                    })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect_admin_monitor(admin_id)
    except Exception:
        await ws_manager.disconnect_admin_monitor(admin_id)


@router.get("/api/admin/monitor/events")
def get_monitor_events(limit: int = 100, _admin: dict = Depends(require_admin)):
    """Pull latest telemetry events (fallback for UI reloads)."""
    return {"success": True, "data": telemetry_service.snapshot(limit=limit)}


@router.get("/api/admin/monitor/events/export")
def export_monitor_events(
    limit: int = 500,
    format: str = "json",
    _admin: dict = Depends(require_admin),
):
    """Export telemetry events as json or csv for debugging handoff."""
    events = telemetry_service.snapshot(limit=limit)
    if format.lower() == "csv":
        headers = [
            "timestamp", "severity", "method", "path",
            "status_code", "duration_ms", "error",
        ]
        lines = [",".join(headers)]
        for e in events:
            row = [
                str(e.get("timestamp", "")),
                str(e.get("severity", "")),
                str(e.get("method", "")),
                str(e.get("path", "")).replace(",", " "),
                str(e.get("status_code", "")),
                str(e.get("duration_ms", "")),
                str(e.get("error", "")).replace(",", " ").replace("\n", " "),
            ]
            lines.append(",".join(row))
        csv_data = "\n".join(lines)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=monitor-events.csv"},
        )
    return {"success": True, "data": events, "total": len(events)}
