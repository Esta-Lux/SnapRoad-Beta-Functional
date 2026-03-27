# SnapRoad - Stripe Payments Integration (Portable)
# Handles subscription plans: Basic (free), Premium ($10.99/mo), Family ($14.99/mo)
# Uses standard Stripe SDK - no platform-specific dependencies

import os
import anyio
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
from dotenv import load_dotenv
from middleware.auth import get_current_user, require_admin
from limiter import limiter
from database import get_supabase
from config import ENVIRONMENT

load_dotenv()

router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Fixed subscription packages - NEVER accept amounts from frontend
SUBSCRIPTION_PLANS = {
    "basic": {
        "name": "Basic",
        "price": 0.00,
        "period": "forever",
        "features": ["Privacy-first navigation", "Basic rewards (1x gems)", "Safety score tracking", "Community reports"]
    },
    "premium": {
        "name": "Premium", 
        # Beta pricing (Founders) — use Stripe price id if configured
        "price": 4.99,
        "period": "month",
        "features": ["All Basic features", "2x gem multiplier", "Premium offers", "Advanced analytics", "Fuel tracking", "Ad-free", "Priority support"]
    },
    "family": {
        "name": "Family",
        "price": 14.99,
        "period": "month", 
        "features": ["All Premium features", "Up to 6 members", "Real-time location sharing", "Teen driver monitoring", "Family leaderboard", "Emergency SOS"]
    }
}

# In-memory fallback only when DB table is unavailable
payment_transactions: Dict[str, dict] = {}


def _persist_tx(tx: dict) -> None:
    """Persist transaction to Supabase when available; fallback to memory."""
    if ENVIRONMENT != "production":
        payment_transactions[tx["session_id"]] = tx
    try:
        sb = get_supabase()
        sb.table("payment_transactions").upsert(tx, on_conflict="session_id").execute()
    except Exception:
        if ENVIRONMENT == "production":
            raise RuntimeError("payment_transactions table unavailable")
        return


def _get_tx(session_id: str) -> Optional[dict]:
    try:
        sb = get_supabase()
        result = sb.table("payment_transactions").select("*").eq("session_id", session_id).limit(1).execute()
        if result.data:
            return result.data[0]
    except Exception:
        if ENVIRONMENT == "production":
            return None
    return payment_transactions.get(session_id)


def _list_txs(limit: int = 100) -> list[dict]:
    try:
        sb = get_supabase()
        result = sb.table("payment_transactions").select("*").order("created_at", desc=True).limit(limit).execute()
        if result.data:
            return result.data
    except Exception:
        if ENVIRONMENT == "production":
            return []
    return list(payment_transactions.values())[:limit]


class CreateCheckoutRequest(BaseModel):
    plan_id: str  # "premium" or "family"
    origin_url: Optional[str] = None  # Optional hint; server allowlist decides final origin
    user_id: Optional[str] = None
    user_email: Optional[str] = None


class CheckoutResponse(BaseModel):
    url: str
    session_id: str


def _resolve_allowed_origin(request_origin: Optional[str]) -> str:
    configured = (os.environ.get("CHECKOUT_ALLOWED_ORIGINS") or "").strip()
    allowed = [o.strip().rstrip("/") for o in configured.split(",") if o.strip()]
    if not allowed:
        fallback = (os.environ.get("FRONTEND_URL") or "http://localhost:5173").strip().rstrip("/")
        allowed = [fallback]
    requested = (request_origin or "").strip().rstrip("/")
    if requested and requested in allowed:
        return requested
    return allowed[0]


@router.get("/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return {
        "success": True,
        "data": SUBSCRIPTION_PLANS
    }


@router.post("/checkout/session", response_model=CheckoutResponse)
@limiter.limit("10/minute")
async def create_checkout_session(
    request: Request,
    checkout_data: CreateCheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a Stripe checkout session for subscription upgrade"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Validate plan exists and is not free
    if checkout_data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    plan = SUBSCRIPTION_PLANS[checkout_data.plan_id]
    
    if plan["price"] == 0:
        raise HTTPException(status_code=400, detail="Basic plan is free, no payment required")
    
    # Get Stripe API key from environment
    api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured. Set STRIPE_SECRET_KEY in environment.")
    import stripe
    stripe.api_key = api_key

    # Prevent long/hanging Stripe network calls from blocking requests past the mobile client's timeout.
    # Note: stripe-python performs blocking HTTP requests under the hood.
    stripe_http_timeout_sec = float(os.environ.get("STRIPE_HTTP_TIMEOUT_SEC", "8"))
    stripe_max_retries = int(os.environ.get("STRIPE_MAX_NETWORK_RETRIES", "0"))
    try:
        stripe.max_network_retries = stripe_max_retries
    except Exception:
        # Not all stripe-python versions expose this.
        pass
    for mod_path in ("stripe.http_client", "stripe._http_client"):
        try:
            http_client_mod = __import__(mod_path, fromlist=["RequestsClient"])
            RequestsClient = getattr(http_client_mod, "RequestsClient", None)
            if RequestsClient:
                stripe.default_http_client = RequestsClient(timeout=stripe_http_timeout_sec)
                break
        except Exception:
            continue
    
    # Build success and cancel URLs from server allowlisted origin only
    origin = _resolve_allowed_origin(checkout_data.origin_url)
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"
    
    try:
        # Prefer Stripe Catalog price IDs (if configured) so pricing is controlled in Stripe.
        price_id = None
        if checkout_data.plan_id == "premium":
            price_id = (os.environ.get("STRIPE_PREMIUM_BETA_PRICE_ID") or os.environ.get("STRIPE_PREMIUM_PRICE_ID") or "").strip() or None
        elif checkout_data.plan_id == "family":
            price_id = (os.environ.get("STRIPE_FAMILY_FOUNDERS_PRICE_ID") or os.environ.get("STRIPE_FAMILY_PRICE_ID") or "").strip() or None

        line_items = None
        if price_id:
            line_items = [{"price": price_id, "quantity": 1}]
        else:
            line_items = [{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"SnapRoad {plan['name']} Plan",
                        "description": ", ".join(plan["features"][:3]),
                    },
                    "unit_amount": int(plan["price"] * 100),  # Stripe uses cents
                    "recurring": {"interval": "month"} if plan["period"] == "month" else None,
                },
                "quantity": 1,
            }]

        # Create Stripe checkout session using standard SDK.
        # Run in a worker thread to avoid blocking the FastAPI event loop.
        def _create_session_sync() -> object:
            return stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="subscription" if plan["period"] == "month" else "payment",
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=checkout_data.user_email if checkout_data.user_email else None,
                metadata={
                    "plan_id": checkout_data.plan_id,
                    "plan_name": plan["name"],
                    "user_id": str(
                        current_user.get("user_id") or current_user.get("id") or checkout_data.user_id or "anonymous"
                    ),
                    "source": "snaproad_mobile",
                },
            )

        session = await anyio.to_thread.run_sync(_create_session_sync)
        
        # Store transaction record BEFORE redirect
        tx = {
            "session_id": session.id,
            "plan_id": checkout_data.plan_id,
            "plan_name": plan["name"],
            "amount": plan["price"],
            "currency": "usd",
            "user_id": str(current_user.get("user_id") or current_user.get("id") or checkout_data.user_id or ""),
            "user_email": checkout_data.user_email or current_user.get("email"),
            "payment_status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        try:
            _persist_tx(tx)
        except RuntimeError:
            raise HTTPException(status_code=503, detail="Payment transaction storage unavailable")
        
        return CheckoutResponse(url=session.url, session_id=session.id)
        
    except stripe.error.StripeError:
        raise HTTPException(status_code=502, detail="Payment provider error")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.get("/checkout/status/{session_id}")
@limiter.limit("30/minute")
async def get_checkout_status(
    request: Request,
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the status of a checkout session"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    import stripe
    stripe.api_key = api_key
    try:
        user_id = str(current_user.get("user_id") or current_user.get("id") or "")
        session = await anyio.to_thread.run_sync(lambda: stripe.checkout.Session.retrieve(session_id))
        tx = _get_tx(session_id)
        # Ownership check: only the owner/admin can inspect this checkout session.
        # Prefer DB tx owner, fallback to Stripe metadata owner.
        owner_id = ""
        if tx:
            owner_id = str(tx.get("user_id") or "")
        if not owner_id:
            owner_id = str((dict(session.metadata) if session.metadata else {}).get("user_id") or "")
        if owner_id and owner_id != user_id and str(current_user.get("role") or "") != "admin":
            raise HTTPException(status_code=403, detail="Checkout session access denied")
        
        # Map Stripe status to our format
        payment_status = "pending"
        if session.payment_status == "paid":
            payment_status = "paid"
        elif session.status == "expired":
            payment_status = "expired"
        elif session.status == "complete":
            payment_status = "paid"
        
        # Update transaction record if exists
        if tx and tx.get("payment_status") != "paid" and payment_status == "paid":
            tx["payment_status"] = "paid"
            tx["updated_at"] = datetime.utcnow().isoformat()
            try:
                _persist_tx(tx)
            except RuntimeError:
                raise HTTPException(status_code=503, detail="Payment transaction storage unavailable")
            # Here you would also update user's subscription in database
        
        return {
            "success": True,
            "data": {
                "session_id": session_id,
                "status": session.status,
                "payment_status": payment_status,
                "amount_total": session.amount_total,
                "currency": session.currency,
                "metadata": dict(session.metadata) if session.metadata else {}
            }
        }
        
    except stripe.error.StripeError:
        raise HTTPException(status_code=502, detail="Payment provider error")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to get checkout status")


@router.get("/transactions")
async def get_payment_transactions(
    limit: int = Query(default=100, ge=1, le=100),
    _admin: dict = Depends(require_admin),
):
    """Get all payment transactions (admin use)"""
    return {
        "success": True,
        "data": _list_txs(limit)
    }


@router.get("/transaction/{session_id}")
async def get_payment_transaction(session_id: str, _admin: dict = Depends(require_admin)):
    """Get a specific payment transaction"""
    tx = _get_tx(session_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "success": True,
        "data": tx
    }
