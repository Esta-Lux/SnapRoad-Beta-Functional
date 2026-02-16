# SnapRoad Backend Developer Guide
## For Andrew (Backend Lead)

> **Tech Stack**: FastAPI + Supabase + Stripe + Python 3.10+
> **Current State**: UI complete with mock data - needs real API integration

---

## 📁 Project Structure

```
/app/backend/
├── server.py              # Main API file (currently monolithic)
├── .env                   # Your local environment variables
├── .env.example           # Template (reference)
├── requirements.txt       # Python dependencies
└── tests/                 # Test files

# Recommended new structure to create:
/app/backend/
├── main.py                # FastAPI app entry
├── config.py              # Settings & env loading
├── database.py            # Supabase client
├── routes/
│   ├── __init__.py
│   ├── auth.py            # Authentication endpoints
│   ├── users.py           # User endpoints
│   ├── offers.py          # Offers CRUD
│   ├── partners.py        # Partner endpoints
│   ├── payments.py        # Stripe endpoints
│   ├── gamification.py    # XP, badges, challenges
│   └── webhooks.py        # Stripe webhooks
├── services/
│   ├── __init__.py
│   ├── supabase.py        # Database operations
│   ├── stripe_service.py  # Payment logic
│   ├── gas_prices.py      # Gas price API
│   └── notifications.py   # Push/email
├── models/
│   ├── __init__.py
│   └── schemas.py         # Pydantic models
└── middleware/
    ├── __init__.py
    └── auth.py            # JWT validation
```

---

## 🚀 Phase 1: Environment Setup

### Step 1: Get credentials from PM
You should receive these from the PM:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
MAPBOX_ACCESS_TOKEN=pk.xxx
GAS_PRICE_API_KEY=xxx
SENDGRID_API_KEY=SG.xxx
```

### Step 2: Create your .env file
```bash
cd /app/backend
cp .env.example .env
# Edit .env with credentials from PM
```

### Step 3: Install new dependencies
```bash
pip install supabase stripe httpx python-jose[cryptography] passlib[bcrypt]
pip freeze > requirements.txt
```

---

## 🗄️ Phase 2: Supabase Database Setup

### Step 1: Access Supabase SQL Editor
Go to: Supabase Dashboard → SQL Editor → New Query

### Step 2: Create Tables
Run this SQL in Supabase:

```sql
-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    
    -- Plan
    plan VARCHAR(20) DEFAULT 'basic' CHECK (plan IN ('basic', 'premium')),
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'inactive',
    
    -- Gamification
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    gems INTEGER DEFAULT 100,
    safety_score INTEGER DEFAULT 85,
    
    -- Car
    car_category VARCHAR(50) DEFAULT 'sedan',
    car_variant VARCHAR(50) DEFAULT 'sedan-classic',
    car_color VARCHAR(50) DEFAULT 'ocean-blue',
    
    -- Stats
    total_miles DECIMAL(10,2) DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    total_savings DECIMAL(10,2) DEFAULT 0,
    
    -- Location
    state VARCHAR(50),
    city VARCHAR(100),
    
    -- Flags
    onboarding_complete BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PARTNERS TABLE
-- =============================================
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50),
    
    -- Plan
    plan VARCHAR(20) DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
    is_founders BOOLEAN DEFAULT false,
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'inactive',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PARTNER LOCATIONS TABLE
-- =============================================
CREATE TABLE partner_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    
    is_primary BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- OFFERS TABLE
-- =============================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES partners(id),
    location_id UUID REFERENCES partner_locations(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    business_name VARCHAR(255),
    business_type VARCHAR(50),
    
    discount_percent INTEGER,
    base_gems INTEGER DEFAULT 25,
    premium_gems INTEGER DEFAULT 50,
    
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
    
    redemption_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    
    image_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Boost info
    is_boosted BOOLEAN DEFAULT false,
    boost_expires_at TIMESTAMPTZ
);

-- =============================================
-- REDEMPTIONS TABLE
-- =============================================
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    user_id UUID REFERENCES users(id),
    
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    qr_expires_at TIMESTAMPTZ NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
    gems_earned INTEGER,
    discount_applied INTEGER,
    
    verified_at TIMESTAMPTZ,
    verified_lat DECIMAL(10,8),
    verified_lng DECIMAL(11,8),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BADGES TABLE
-- =============================================
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50) CHECK (category IN ('driving', 'social', 'exploration', 'safety')),
    
    requirement_type VARCHAR(50),
    requirement_value INTEGER,
    
    xp_reward INTEGER DEFAULT 50,
    gems_reward INTEGER DEFAULT 0,
    
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

-- =============================================
-- USER BADGES (Junction Table)
-- =============================================
CREATE TABLE user_badges (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- =============================================
-- CHALLENGES TABLE
-- =============================================
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    type VARCHAR(50) CHECK (type IN ('weekly', 'head_to_head', 'community')),
    
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    goal_type VARCHAR(50),
    goal_value INTEGER,
    
    reward_xp INTEGER,
    reward_gems INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHALLENGE PARTICIPANTS (Junction Table)
-- =============================================
CREATE TABLE challenge_participants (
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (challenge_id, user_id)
);

-- =============================================
-- TRIPS TABLE
-- =============================================
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    start_location VARCHAR(255),
    end_location VARCHAR(255),
    start_lat DECIMAL(10,8),
    start_lng DECIMAL(11,8),
    end_lat DECIMAL(10,8),
    end_lng DECIMAL(11,8),
    
    distance DECIMAL(10,2),
    duration INTEGER, -- minutes
    safety_score INTEGER,
    
    xp_earned INTEGER DEFAULT 0,
    gems_earned INTEGER DEFAULT 0,
    
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BOOSTS TABLE
-- =============================================
CREATE TABLE boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID REFERENCES offers(id),
    partner_id UUID REFERENCES partners(id),
    
    budget DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL,
    target_radius_miles INTEGER,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    
    stripe_payment_id VARCHAR(255),
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_offers_location ON offers(lat, lng);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_partner ON offers(partner_id);
CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_redemptions_offer ON redemptions(offer_id);
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_partner_locations_partner ON partner_locations(partner_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Partners can only see their own data
CREATE POLICY "Partners can view own data" ON partners
    FOR SELECT USING (auth.uid() = id);

-- Everyone can view active offers
CREATE POLICY "Anyone can view active offers" ON offers
    FOR SELECT USING (status = 'active');

-- Partners can manage their own offers
CREATE POLICY "Partners can manage own offers" ON offers
    FOR ALL USING (partner_id = auth.uid());
```

### Step 3: Seed Initial Data (Badges)
```sql
-- Insert default badges
INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, rarity, xp_reward, gems_reward) VALUES
('Road Warrior', 'Drive 100 miles', 'car', 'driving', 'miles', 100, 'common', 50, 10),
('Safety Star', 'Maintain 90+ safety score for a week', 'shield', 'safety', 'score_streak', 7, 'rare', 100, 25),
('Explorer', 'Visit 10 different locations', 'map', 'exploration', 'locations', 10, 'common', 50, 10),
('Social Butterfly', 'Add 5 friends', 'users', 'social', 'friends', 5, 'common', 50, 10),
('Marathon Driver', 'Drive 1000 miles', 'award', 'driving', 'miles', 1000, 'epic', 200, 50),
('Perfect Week', '100% safety score for 7 days', 'star', 'safety', 'perfect_days', 7, 'legendary', 500, 100),
('Gem Collector', 'Earn 500 gems', 'diamond', 'exploration', 'gems', 500, 'rare', 100, 0),
('Early Bird', 'Complete a trip before 6 AM', 'sunrise', 'driving', 'early_trip', 1, 'rare', 75, 15);
```

---

## 🔐 Phase 3: Authentication Implementation

### Create `/app/backend/services/supabase.py`:
```python
import os
from supabase import create_client, Client
from functools import lru_cache

@lru_cache()
def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    return create_client(url, key)

# Singleton instance
supabase = get_supabase_client()
```

### Create `/app/backend/services/auth.py`:
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user_id": user_id, "email": payload.get("email"), "role": payload.get("role", "user")}
```

### Create `/app/backend/routes/auth.py`:
```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from services.supabase import supabase
from services.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
async def register(request: RegisterRequest):
    # Check if user exists
    existing = supabase.table("users").select("id").eq("email", request.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    password_hash = get_password_hash(request.password)
    result = supabase.table("users").insert({
        "email": request.email,
        "password_hash": password_hash,
        "name": request.name
    }).execute()
    
    user = result.data[0]
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": "user"})
    
    return {
        "success": True,
        "data": {
            "user": {k: v for k, v in user.items() if k != "password_hash"},
            "token": token
        }
    }

@router.post("/login")
async def login(request: LoginRequest):
    # Find user
    result = supabase.table("users").select("*").eq("email", request.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = result.data[0]
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": "user"})
    
    return {
        "success": True,
        "data": {
            "user": {k: v for k, v in user.items() if k != "password_hash"},
            "token": token
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    result = supabase.table("users").select("*").eq("id", current_user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = result.data[0]
    return {
        "success": True,
        "data": {k: v for k, v in user.items() if k != "password_hash"}
    }
```

---

## 💳 Phase 4: Stripe Integration

### Create `/app/backend/services/stripe_service.py`:
```python
import stripe
import os
from typing import Optional

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

# Product price IDs (create these in Stripe Dashboard first)
PRICES = {
    "driver_premium": os.environ.get("STRIPE_PRICE_DRIVER_PREMIUM"),
    "partner_starter": os.environ.get("STRIPE_PRICE_PARTNER_STARTER"),
    "partner_growth": os.environ.get("STRIPE_PRICE_PARTNER_GROWTH"),
}

async def create_customer(email: str, name: str, metadata: dict = None) -> str:
    """Create a Stripe customer and return the customer ID."""
    customer = stripe.Customer.create(
        email=email,
        name=name,
        metadata=metadata or {}
    )
    return customer.id

async def create_checkout_session(
    customer_id: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
    mode: str = "subscription"
) -> str:
    """Create a checkout session and return the URL."""
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode=mode,
        success_url=success_url,
        cancel_url=cancel_url,
    )
    return session.url

async def create_portal_session(customer_id: str, return_url: str) -> str:
    """Create a customer portal session for managing subscriptions."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session.url

async def create_one_time_payment(
    customer_id: str,
    amount: int,  # in cents
    description: str,
    metadata: dict = None
) -> stripe.PaymentIntent:
    """Create a one-time payment (for boosts)."""
    return stripe.PaymentIntent.create(
        amount=amount,
        currency="usd",
        customer=customer_id,
        description=description,
        metadata=metadata or {},
    )

def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify and construct a webhook event."""
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
```

### Create `/app/backend/routes/payments.py`:
```python
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from services.stripe_service import (
    create_customer, create_checkout_session, create_portal_session,
    create_one_time_payment, construct_webhook_event, PRICES
)
from services.supabase import supabase
from services.auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["Payments"])

class CheckoutRequest(BaseModel):
    plan: str  # driver_premium, partner_starter, partner_growth
    success_url: str
    cancel_url: str

@router.post("/create-checkout")
async def create_checkout(request: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    # Get user from database
    user_result = supabase.table("users").select("*").eq("id", current_user["user_id"]).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = user_result.data[0]
    
    # Create Stripe customer if not exists
    if not user.get("stripe_customer_id"):
        customer_id = await create_customer(user["email"], user["name"], {"user_id": user["id"]})
        supabase.table("users").update({"stripe_customer_id": customer_id}).eq("id", user["id"]).execute()
    else:
        customer_id = user["stripe_customer_id"]
    
    # Get price ID
    price_id = PRICES.get(request.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # Create checkout session
    checkout_url = await create_checkout_session(
        customer_id=customer_id,
        price_id=price_id,
        success_url=request.success_url,
        cancel_url=request.cancel_url
    )
    
    return {"success": True, "data": {"checkout_url": checkout_url}}

@router.post("/create-portal")
async def create_portal(return_url: str, current_user: dict = Depends(get_current_user)):
    user_result = supabase.table("users").select("stripe_customer_id").eq("id", current_user["user_id"]).execute()
    if not user_result.data or not user_result.data[0].get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No subscription found")
    
    portal_url = await create_portal_session(
        customer_id=user_result.data[0]["stripe_customer_id"],
        return_url=return_url
    )
    
    return {"success": True, "data": {"portal_url": portal_url}}
```

### Create `/app/backend/routes/webhooks.py`:
```python
from fastapi import APIRouter, Request, HTTPException
from services.stripe_service import construct_webhook_event
from services.supabase import supabase
import stripe

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = construct_webhook_event(payload, sig_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session["customer"]
        
        # Update user subscription status
        supabase.table("users").update({
            "subscription_status": "active",
            "plan": "premium"
        }).eq("stripe_customer_id", customer_id).execute()
        
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        
        # Downgrade to basic
        supabase.table("users").update({
            "subscription_status": "inactive",
            "plan": "basic"
        }).eq("stripe_customer_id", customer_id).execute()
        
    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice["customer"]
        
        # Mark as past due
        supabase.table("users").update({
            "subscription_status": "past_due"
        }).eq("stripe_customer_id", customer_id).execute()
    
    return {"success": True}
```

---

## ⛽ Phase 5: Gas Price API

### Create `/app/backend/services/gas_prices.py`:
```python
import httpx
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache

GAS_API_KEY = os.environ.get("GAS_PRICE_API_KEY")
GAS_API_URL = "https://api.collectapi.com/gasPrice/stateUsaPrice"

# Simple in-memory cache
_cache: Dict[str, tuple] = {}
CACHE_TTL = timedelta(hours=1)

async def get_gas_prices(state: str = "OH") -> List[Dict]:
    """Fetch gas prices for a state. Uses CollectAPI."""
    
    # Check cache
    cache_key = f"gas_{state}"
    if cache_key in _cache:
        data, timestamp = _cache[cache_key]
        if datetime.now() - timestamp < CACHE_TTL:
            return data
    
    # Fetch from API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                GAS_API_URL,
                params={"state": state},
                headers={
                    "authorization": f"apikey {GAS_API_KEY}",
                    "content-type": "application/json"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("success"):
                result = data.get("result", {})
                prices = [
                    {
                        "type": "regular",
                        "price": float(result.get("gasoline", 0)),
                    },
                    {
                        "type": "midgrade",
                        "price": float(result.get("midGrade", 0)),
                    },
                    {
                        "type": "premium",
                        "price": float(result.get("premium", 0)),
                    },
                    {
                        "type": "diesel",
                        "price": float(result.get("diesel", 0)),
                    }
                ]
                
                # Cache result
                _cache[cache_key] = (prices, datetime.now())
                return prices
                
        except Exception as e:
            print(f"Gas API error: {e}")
    
    # Fallback mock data
    return [
        {"type": "regular", "price": 3.29},
        {"type": "midgrade", "price": 3.59},
        {"type": "premium", "price": 3.89},
        {"type": "diesel", "price": 3.99},
    ]

def calculate_fuel_savings(miles: float, mpg: float = 25, discount_percent: float = 10) -> float:
    """Calculate fuel savings based on miles driven."""
    gallons_used = miles / mpg
    avg_price = 3.50  # Use actual from API in production
    normal_cost = gallons_used * avg_price
    discounted_cost = normal_cost * (1 - discount_percent / 100)
    return round(normal_cost - discounted_cost, 2)
```

---

## 🔄 Phase 6: Update Main Server

### Update `/app/backend/server.py`:

Add these imports at the top:
```python
# Add new imports
from routes import auth, payments, webhooks
from services.auth import get_current_user
from services.supabase import supabase
```

Register routers (add near the end of the file):
```python
# Register new routers
app.include_router(auth.router)
app.include_router(payments.router)
app.include_router(webhooks.router)
```

### Example: Convert mock endpoint to real database
```python
# BEFORE (mock):
@app.get("/api/offers")
def get_offers():
    return {"success": True, "data": offers_db}  # In-memory list

# AFTER (real database):
@app.get("/api/offers")
async def get_offers(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = 10,  # miles
    type: Optional[str] = None
):
    query = supabase.table("offers").select("*").eq("status", "active")
    
    if type:
        query = query.eq("business_type", type)
    
    result = query.execute()
    
    # Filter by distance if location provided
    offers = result.data
    if lat and lng:
        offers = [o for o in offers if calculate_distance(lat, lng, o["lat"], o["lng"]) <= radius]
    
    return {"success": True, "data": offers}
```

---

## 🧪 Phase 7: Testing

### Test authentication:
```bash
# Register
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get current user (use token from login)
curl http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Stripe webhook locally:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8001/api/webhooks/stripe

# This gives you a webhook signing secret (whsec_...)
# Add it to your .env as STRIPE_WEBHOOK_SECRET
```

---

## 📋 Migration Checklist

- [ ] Set up Supabase project
- [ ] Run database schema SQL
- [ ] Create `.env` with all credentials
- [ ] Install new Python packages
- [ ] Create services directory with `supabase.py`, `auth.py`, `stripe_service.py`, `gas_prices.py`
- [ ] Create routes directory with `auth.py`, `payments.py`, `webhooks.py`
- [ ] Update `server.py` to use real database
- [ ] Set up Stripe products and prices
- [ ] Configure Stripe webhook endpoint
- [ ] Test all auth endpoints
- [ ] Test payment flow
- [ ] Test webhook handling
- [ ] Migrate remaining mock endpoints to use Supabase

---

## 🆘 Troubleshooting

**Supabase connection issues:**
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Ensure RLS policies allow the operations

**Stripe webhook failures:**
- Verify webhook secret is correct
- Check Stripe CLI is forwarding (for local dev)
- Ensure endpoint returns 200 status

**JWT errors:**
- Check `JWT_SECRET` is set
- Ensure token hasn't expired
- Verify Bearer prefix in Authorization header

---

## 📚 Resources

- [Supabase Python Docs](https://supabase.com/docs/reference/python/introduction)
- [Stripe Python Docs](https://stripe.com/docs/api?lang=python)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

**Questions? Contact the PM for credentials or clarification.**
