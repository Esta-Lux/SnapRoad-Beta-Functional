# SnapRoad - Stripe Payments Integration
# Handles subscription plans: Basic (free), Premium ($10.99/mo), Family ($14.99/mo)

import os
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Import Stripe checkout from emergentintegrations
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

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
        "price": 10.99,
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

# In-memory payment transactions (would be MongoDB/Supabase in production)
payment_transactions: Dict[str, dict] = {}


class CreateCheckoutRequest(BaseModel):
    plan_id: str  # "premium" or "family"
    origin_url: str  # Frontend origin for success/cancel URLs
    user_id: Optional[str] = None
    user_email: Optional[str] = None


class CheckoutResponse(BaseModel):
    url: str
    session_id: str


@router.get("/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return {
        "success": True,
        "data": SUBSCRIPTION_PLANS
    }


@router.post("/checkout/session", response_model=CheckoutResponse)
async def create_checkout_session(request: Request, checkout_data: CreateCheckoutRequest):
    """Create a Stripe checkout session for subscription upgrade"""
    
    # Validate plan exists and is not free
    if checkout_data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    plan = SUBSCRIPTION_PLANS[checkout_data.plan_id]
    
    if plan["price"] == 0:
        raise HTTPException(status_code=400, detail="Basic plan is free, no payment required")
    
    # Get Stripe API key from environment
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Build webhook URL
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/payments/webhook/stripe"
    
    # Initialize Stripe checkout
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Build success and cancel URLs from frontend origin
    origin = checkout_data.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"
    
    # Create checkout session request
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "plan_id": checkout_data.plan_id,
            "plan_name": plan["name"],
            "user_id": checkout_data.user_id or "anonymous",
            "user_email": checkout_data.user_email or "",
            "source": "snaproad_mobile"
        }
    )
    
    try:
        # Create Stripe checkout session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store transaction record BEFORE redirect
        payment_transactions[session.session_id] = {
            "session_id": session.session_id,
            "plan_id": checkout_data.plan_id,
            "plan_name": plan["name"],
            "amount": plan["price"],
            "currency": "usd",
            "user_id": checkout_data.user_id,
            "user_email": checkout_data.user_email,
            "payment_status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return CheckoutResponse(url=session.url, session_id=session.session_id)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(request: Request, session_id: str):
    """Get the status of a checkout session"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/payments/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction record if exists
        if session_id in payment_transactions:
            tx = payment_transactions[session_id]
            
            # Only update if not already marked as paid (prevent double processing)
            if tx["payment_status"] != "paid" and status.payment_status == "paid":
                tx["payment_status"] = "paid"
                tx["updated_at"] = datetime.utcnow().isoformat()
                # Here you would also update user's subscription in database
        
        return {
            "success": True,
            "data": {
                "session_id": session_id,
                "status": status.status,
                "payment_status": status.payment_status,
                "amount_total": status.amount_total,
                "currency": status.currency,
                "metadata": status.metadata
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get checkout status: {str(e)}")


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/payments/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process webhook event
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            if session_id in payment_transactions:
                tx = payment_transactions[session_id]
                if tx["payment_status"] != "paid":
                    tx["payment_status"] = "paid"
                    tx["updated_at"] = datetime.utcnow().isoformat()
                    # Update user subscription in database here
        
        return {"success": True, "event_type": webhook_response.event_type}
        
    except Exception as e:
        # Log but don't fail - Stripe will retry
        print(f"Webhook error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/transactions")
async def get_payment_transactions():
    """Get all payment transactions (admin use)"""
    return {
        "success": True,
        "data": list(payment_transactions.values())
    }


@router.get("/transaction/{session_id}")
async def get_payment_transaction(session_id: str):
    """Get a specific payment transaction"""
    if session_id not in payment_transactions:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "success": True,
        "data": payment_transactions[session_id]
    }
