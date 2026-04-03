# SnapRoad - Stripe Payments Integration (Portable)
# Handles subscription plans: Basic (free), Premium ($10.99/mo), Family ($14.99/mo)
# Uses standard Stripe SDK - no platform-specific dependencies

import logging
import os
import anyio
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Annotated, List, Optional, Dict
from datetime import datetime, timezone
from dotenv import load_dotenv
from middleware.auth import get_current_user, require_admin
from limiter import limiter
from database import get_supabase
from services.supabase_service import sb_get_profile, sb_update_profile
from config import ENVIRONMENT

logger = logging.getLogger(__name__)

load_dotenv()

MSG_AUTH_REQUIRED = "Authentication required"

CurrentUser = Annotated[dict, Depends(get_current_user)]
CurrentAdmin = Annotated[dict, Depends(require_admin)]

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
        # `price` is charged (founders / beta). `public_price` is list price shown for savings UX only.
        "price": 4.99,
        "public_price": 16.99,
        "period": "month",
        "features": ["All Basic features", "2x gem multiplier", "Premium offers", "Advanced analytics", "Fuel tracking", "Ad-free", "Priority support"],
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


def _list_txs(limit: int = 100) -> List[dict]:
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
    user_email: Optional[str] = None
    return_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    url: str
    session_id: str


def _resolve_allowed_origin(request_origin: Optional[str]) -> str:
    configured = (os.environ.get("CHECKOUT_ALLOWED_ORIGINS") or "").strip()
    allowed = [o.strip().rstrip("/") for o in configured.split(",") if o.strip()]
    if not allowed:
        if ENVIRONMENT == "production":
            raise HTTPException(status_code=503, detail="Checkout origins not configured")
        # Dev-only when CHECKOUT_ALLOWED_ORIGINS unset; production raises above.
        fallback = (os.environ.get("FRONTEND_URL") or "http://localhost:5173").strip().rstrip("/")  # NOSONAR
        allowed = [fallback]
    requested = (request_origin or "").strip().rstrip("/")
    if requested and requested in allowed:
        return requested
    return allowed[0]


def _checkout_return_urls(origin_hint: Optional[str], return_url: Optional[str]) -> tuple[str, str]:
    raw = (return_url or "").strip().rstrip("/")
    if raw.startswith("snaproad://") or raw.startswith("exp://"):
        return (
            f"{raw}/success?session_id={{CHECKOUT_SESSION_ID}}",
            f"{raw}/cancel",
        )
    origin = _resolve_allowed_origin(origin_hint)
    return (
        f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        f"{origin}/payment/cancel",
    )


@router.get("/plans")
async def get_subscription_plans():
    """Get all available subscription plans (display fields for mobile; amounts are not taken from client for checkout)."""
    data = dict(SUBSCRIPTION_PLANS)
    prem = dict(data.get("premium") or {})
    pub = prem.get("public_price")
    founders = prem.get("price")
    if isinstance(pub, (int, float)) and isinstance(founders, (int, float)) and pub > 0:
        prem["savings_percent_vs_public"] = int(round(max(0.0, min(100.0, (1.0 - float(founders) / float(pub)) * 100.0))))
    data["premium"] = prem
    return {"success": True, "data": data}


def _get_stripe_module():
    """Load and configure the Stripe module with API key. Raises HTTPException if unconfigured."""
    api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured. Set STRIPE_SECRET_KEY in environment.")
    import stripe
    stripe.api_key = api_key
    return stripe


def _configure_stripe_http(stripe_mod) -> None:
    """Apply timeout and retry settings to the Stripe SDK."""
    timeout_sec = float(os.environ.get("STRIPE_HTTP_TIMEOUT_SEC", "8"))
    max_retries = int(os.environ.get("STRIPE_MAX_NETWORK_RETRIES", "0"))
    try:
        stripe_mod.max_network_retries = max_retries
    except Exception as e:
        logger.warning("failed to set stripe max_network_retries: %s", e)
    for mod_path in ("stripe.http_client", "stripe._http_client"):
        try:
            http_client_mod = __import__(mod_path, fromlist=["RequestsClient"])
            requests_client_cls = getattr(http_client_mod, "RequestsClient", None)
            if requests_client_cls:
                stripe_mod.default_http_client = requests_client_cls(timeout=timeout_sec)
                return
        except Exception as e:
            logger.warning("failed to set stripe http client from %s: %s", mod_path, e)


def _resolve_price_id(plan_id: str) -> Optional[str]:
    """Look up a Stripe Catalog price ID from env vars for the given plan."""
    env_keys: Dict[str, tuple] = {
        "premium": ("STRIPE_PREMIUM_BETA_PRICE_ID", "STRIPE_PREMIUM_PRICE_ID"),
        "family": ("STRIPE_FAMILY_FOUNDERS_PRICE_ID", "STRIPE_FAMILY_PRICE_ID"),
    }
    for key in env_keys.get(plan_id, ()):
        val = (os.environ.get(key) or "").strip()
        if val:
            return val
    return None


def _build_line_items(plan: dict, plan_id: str) -> list:
    """Build Stripe line_items using a catalog price ID or inline price_data."""
    price_id = _resolve_price_id(plan_id)
    if price_id:
        return [{"price": price_id, "quantity": 1}]
    return [{
        "price_data": {
            "currency": "usd",
            "product_data": {
                "name": f"SnapRoad {plan['name']} Plan",
                "description": ", ".join(plan["features"][:3]),
            },
            "unit_amount": int(plan["price"] * 100),
            "recurring": {"interval": "month"} if plan["period"] == "month" else None,
        },
        "quantity": 1,
    }]


def _build_pending_tx(session_id: str, checkout_data: CreateCheckoutRequest, plan: dict, current_user: dict) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "session_id": session_id,
        "plan_id": checkout_data.plan_id,
        "plan_name": plan["name"],
        "amount": plan["price"],
        "currency": "usd",
        "user_id": str(current_user.get("user_id") or current_user.get("id") or ""),
        "user_email": checkout_data.user_email or current_user.get("email"),
        "payment_status": "pending",
        "created_at": now_iso,
        "updated_at": now_iso,
    }


@router.post(
    "/checkout/session",
    response_model=CheckoutResponse,
    responses={
        400: {"description": "Invalid or free plan"},
        401: {"description": MSG_AUTH_REQUIRED},
        500: {"description": "Failed to create checkout session"},
        502: {"description": "Payment provider error"},
        503: {"description": "Payment transaction storage unavailable"},
    },
)
@limiter.limit("10/minute")
async def create_checkout_session(
    request: Request,
    checkout_data: CreateCheckoutRequest,
    current_user: CurrentUser,
):
    """Create a Stripe checkout session for subscription upgrade"""
    from services.runtime_config import require_enabled

    require_enabled(
        "premium_purchases_enabled",
        "Premium purchases are temporarily disabled.",
    )
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)

    if checkout_data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan ID")

    plan = SUBSCRIPTION_PLANS[checkout_data.plan_id]
    if plan["price"] == 0:
        raise HTTPException(status_code=400, detail="Basic plan is free, no payment required")

    stripe = _get_stripe_module()
    _configure_stripe_http(stripe)

    success_url, cancel_url = _checkout_return_urls(
        checkout_data.origin_url,
        checkout_data.return_url,
    )
    line_items = _build_line_items(plan, checkout_data.plan_id)

    try:
        def _create_session_sync() -> object:
            return stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="subscription" if plan["period"] == "month" else "payment",
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=checkout_data.user_email or None,
                metadata={
                    "plan_id": checkout_data.plan_id,
                    "plan_name": plan["name"],
                    "user_id": str(
                        current_user.get("user_id") or current_user.get("id") or "anonymous"
                    ),
                    "source": "snaproad_mobile",
                },
            )

        session = await anyio.to_thread.run_sync(_create_session_sync)

        tx = _build_pending_tx(session.id, checkout_data, plan, current_user)
        try:
            _persist_tx(tx)
        except RuntimeError:
            raise HTTPException(status_code=503, detail="Payment transaction storage unavailable")

        return CheckoutResponse(url=session.url, session_id=session.id)

    except stripe.error.StripeError:
        raise HTTPException(status_code=502, detail="Payment provider error")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


def _map_stripe_payment_status(session) -> str:
    if session.payment_status == "paid":
        return "paid"
    if session.status in ("expired",):
        return "expired"
    if session.status == "complete":
        return "paid"
    return "pending"


def _verify_session_access(session, current_user: dict) -> str:
    """Check caller is allowed to view this session. Returns session_user_id."""
    is_admin = current_user.get("role") in ("admin", "super_admin")
    session_user_id = str((session.metadata or {}).get("user_id") or "")
    caller_user_id = str(current_user.get("id") or current_user.get("user_id") or "")
    if not is_admin and session_user_id and session_user_id != caller_user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return session_user_id


def _finalize_paid_tx(session_id: str, payment_status: str, session_user_id: str) -> None:
    """If the transaction just became paid, persist and upgrade the user profile."""
    tx = _get_tx(session_id)
    if not tx or tx.get("payment_status") == "paid" or payment_status != "paid":
        return
    tx["payment_status"] = "paid"
    tx["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        _persist_tx(tx)
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Payment transaction storage unavailable")
    _maybe_upgrade_profile(tx, session_user_id)


def _maybe_upgrade_profile(tx: dict, session_user_id: str) -> None:
    uid = tx.get("user_id") or session_user_id
    plan_id = tx.get("plan_id") or "premium"
    if not uid or uid == "anonymous" or plan_id not in ("premium", "family"):
        return
    try:
        sb = get_supabase()
        existing = sb.table("profiles").select("is_premium").eq("id", uid).limit(1).execute()
        if not (existing.data and existing.data[0].get("is_premium")):
            sb_update_profile(uid, {"plan": plan_id, "is_premium": True})
    except Exception as e:
        logger.warning("failed to upgrade user profile to premium: %s", e)


@router.get(
    "/checkout/status/{session_id}",
    responses={
        401: {"description": MSG_AUTH_REQUIRED},
        403: {"description": "Access denied"},
        500: {"description": "Failed to get checkout status"},
        502: {"description": "Payment provider error"},
        503: {"description": "Payment transaction storage unavailable"},
    },
)
@limiter.limit("30/minute")
async def get_checkout_status(
    request: Request,
    session_id: str,
    current_user: CurrentUser,
):
    """Get the status of a checkout session"""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)

    stripe = _get_stripe_module()

    try:
        session = await anyio.to_thread.run_sync(lambda: stripe.checkout.Session.retrieve(session_id))
        session_user_id = _verify_session_access(session, current_user)
        payment_status = _map_stripe_payment_status(session)
        _finalize_paid_tx(session_id, payment_status, session_user_id)

        return {
            "success": True,
            "data": {
                "session_id": session_id,
                "status": session.status,
                "payment_status": payment_status,
                "amount_total": session.amount_total,
                "currency": session.currency,
                "metadata": dict(session.metadata) if session.metadata else {},
            },
        }

    except stripe.error.StripeError:
        raise HTTPException(status_code=502, detail="Payment provider error")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to get checkout status")


@router.get("/transactions")
async def get_payment_transactions(
    _admin: CurrentAdmin,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    """Get all payment transactions (admin use)"""
    return {
        "success": True,
        "data": _list_txs(limit)
    }


@router.get("/transaction/{session_id}", responses={404: {"description": "Transaction not found"}})
async def get_payment_transaction(session_id: str, _admin: CurrentAdmin):
    """Get a specific payment transaction"""
    tx = _get_tx(session_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "success": True,
        "data": tx
    }


class BillingPortalRequest(BaseModel):
    return_url: Optional[str] = None


def _is_dev_loopback_http(url: str) -> bool:
    """True only for http://localhost / 127.0.0.1 / ::1 in non-production (Stripe return URL dev)."""
    if ENVIRONMENT == "production":
        return False
    try:
        from urllib.parse import urlparse

        u = urlparse(url)
        if u.scheme != "http":
            return False
        host = (u.hostname or "").lower()
        return host in ("localhost", "127.0.0.1", "::1")
    except ValueError:
        return False


def _resolve_http_return_url(raw: str, requested: Optional[str]) -> Optional[str]:
    """Validate an http(s) return URL against the allowlist. Returns URL or None."""
    from urllib.parse import urlparse

    try:
        u = urlparse(raw)
        origin = f"{u.scheme}://{u.netloc}".rstrip("/")
    except ValueError:
        origin = ""
    configured = (os.environ.get("CHECKOUT_ALLOWED_ORIGINS") or "").strip()
    allowed = [o.strip().rstrip("/") for o in configured.split(",") if o.strip()]
    if ENVIRONMENT != "production" and origin:
        return raw.split("#", 1)[0]
    if origin and allowed and origin in allowed:
        return raw.split("#", 1)[0]
    if ENVIRONMENT != "production":
        return _resolve_allowed_origin(requested).rstrip("/") + "/driver"
    return None


def _billing_portal_return_url(requested: Optional[str]) -> str:
    """Mobile sends snaproad://…; web sends an allowed https origin (no path required)."""
    raw = (requested or "").strip()
    if raw.startswith("snaproad://") or raw.startswith("exp://"):
        return raw
    if raw.startswith("https://"):
        result = _resolve_http_return_url(raw, requested)
        if result is not None:
            return result
    if _is_dev_loopback_http(raw):
        result = _resolve_http_return_url(raw, requested)
        if result is not None:
            return result
    return _resolve_allowed_origin(requested).rstrip("/") + "/driver"


def _stripe_customer_id_for_user(user_id: str, user_email: Optional[str]) -> Optional[str]:
    import stripe

    prof = sb_get_profile(user_id)
    if prof:
        cid = str(prof.get("stripe_customer_id") or "").strip()
        if cid.startswith("cus_"):
            return cid
    if user_email:
        customers = stripe.Customer.list(email=str(user_email).strip(), limit=5)
        if customers.data:
            return customers.data[0].id
    try:
        sb = get_supabase()
        r = (
            sb.table("payment_transactions")
            .select("session_id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        for row in r.data or []:
            sid = row.get("session_id")
            if not sid:
                continue
            sess = stripe.checkout.Session.retrieve(sid)
            cust = sess.get("customer")
            if cust and str(cust).startswith("cus_"):
                return str(cust)
    except Exception as e:
        logger.warning("failed to look up stripe customer from transactions: %s", e)
    return None


def _ensure_stripe_customer_id(user_id: str, user_email: str) -> Optional[str]:
    """
    If no customer exists yet (no checkout, empty profile column), create a Stripe Customer
    so Billing Portal can open. Portal still shows subscriptions/invoices only after real checkout.
    """
    import stripe

    existing = _stripe_customer_id_for_user(user_id, user_email)
    if existing:
        return existing
    try:
        cust = stripe.Customer.create(
            email=str(user_email).strip(),
            metadata={"user_id": str(user_id), "source": "snaproad_billing_portal"},
        )
        cid = str(cust.get("id") or "")
        if cid.startswith("cus_"):
            sb_update_profile(user_id, {"stripe_customer_id": cid})
            return cid
    except Exception as e:
        logger.warning("failed to create stripe customer: %s", e)
    return None


@router.post(
    "/billing-portal",
    responses={
        400: {"description": "User email not found"},
        401: {"description": MSG_AUTH_REQUIRED},
        422: {"description": "Could not open billing portal"},
        500: {"description": "Stripe not configured or failed to create billing portal session"},
        503: {"description": "Checkout origins not configured"},
    },
)
@limiter.limit("10/minute")
async def create_billing_portal_session(
    request: Request,
    body: BillingPortalRequest,
    current_user: CurrentUser,
):
    """Create a Stripe Customer Portal session for managing subscriptions."""
    if not current_user:
        raise HTTPException(status_code=401, detail=MSG_AUTH_REQUIRED)

    api_key = os.environ.get("STRIPE_API_KEY") or os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    import stripe
    stripe.api_key = api_key

    uid = str(current_user.get("user_id") or current_user.get("id") or "")
    user_email = current_user.get("email")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found")

    return_url = _billing_portal_return_url(body.return_url)

    def _portal_sync():
        cust_id = _ensure_stripe_customer_id(uid, str(user_email))
        if not cust_id:
            return None
        return stripe.billing_portal.Session.create(customer=cust_id, return_url=return_url)

    try:
        session = await anyio.to_thread.run_sync(_portal_sync)
        if session is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not open billing portal. Check STRIPE_SECRET_KEY, Stripe Dashboard "
                    "Billing Portal settings, and that your account email is valid."
                ),
            )
        return {"success": True, "data": {"url": session.url}}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create billing portal session")
