# PM Guide - Supporting Brian (Web/Integration)

> **Brian's Focus**: React Partner Dashboard, Stripe Flow, Offer CRUD, QR Scanning, Leaderboard

---

## 🎯 What Brian Needs From You (PM)

### 1. Stripe Account Setup (CRITICAL)

**You need to create these in Stripe Dashboard:**

#### Step 1: Access Stripe
- Go to [dashboard.stripe.com](https://dashboard.stripe.com)
- Login with your account (or create one)

#### Step 2: Create Products
Go to: **Products** → **Add Product**

| Product Name | Price | Billing | Notes |
|-------------|-------|---------|-------|
| Driver Premium | $4.99 | Monthly recurring | For driver app users |
| Partner Starter (Founders) | $20.99 | Monthly recurring | Early adopter pricing |
| Partner Starter | $34.99 | Monthly recurring | Regular pricing |
| Partner Growth (Founders) | $49.99 | Monthly recurring | Early adopter pricing |
| Partner Growth | $79.99 | Monthly recurring | Regular pricing |

#### Step 3: Get Price IDs
After creating each product, click on it and copy the **Price ID** (starts with `price_`)

**Share these with Brian:**
```
STRIPE_PRICE_DRIVER_PREMIUM=price_xxxxx
STRIPE_PRICE_PARTNER_STARTER_FOUNDERS=price_xxxxx
STRIPE_PRICE_PARTNER_STARTER=price_xxxxx
STRIPE_PRICE_PARTNER_GROWTH_FOUNDERS=price_xxxxx
STRIPE_PRICE_PARTNER_GROWTH=price_xxxxx
```

#### Step 4: Get API Keys
Go to: **Developers** → **API Keys**

**Share these with Brian:**
```
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx (safe for frontend)
STRIPE_SECRET_KEY=sk_test_xxxxx (backend only - share with Andrew)
```

---

### 2. Stripe Webhook Setup (After Backend is Ready)

**Coordinate with Andrew first**, then:

1. Go to: **Developers** → **Webhooks** → **Add Endpoint**
2. Enter endpoint URL: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
4. Click **Add Endpoint**
5. Copy the **Signing Secret** (starts with `whsec_`)

**Share with Andrew:**
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

### 3. Domain & URLs

Brian needs to know the production URLs for Stripe redirects:

**Provide these to Brian:**
```
# Production URLs (update with your actual domain)
PRODUCTION_URL=https://snaproad.com
API_URL=https://api.snaproad.com

# Stripe Success/Cancel URLs
SUCCESS_URL=https://snaproad.com/payment-success
CANCEL_URL=https://snaproad.com/payment-cancelled
PORTAL_RETURN_URL=https://snaproad.com/partner/settings
```

---

### 4. Mapbox Token (For Maps)

If not already done for Andrew:

1. Go to [mapbox.com](https://mapbox.com) → Sign up
2. Go to **Account** → **Access Tokens**
3. Create a new token or use default

**Share with Brian:**
```
VITE_MAPBOX_TOKEN=pk.xxxxx
```

---

## 📋 Credentials Summary for Brian

Create a secure document with:

```env
# =============================================
# BRIAN'S FRONTEND CREDENTIALS
# =============================================

# API URL (coordinate with Andrew)
VITE_API_URL=/api
REACT_APP_BACKEND_URL=https://api.snaproad.com

# Stripe (Frontend - Publishable Key Only)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Stripe Price IDs (for checkout)
VITE_STRIPE_PRICE_DRIVER_PREMIUM=price_xxxxx
VITE_STRIPE_PRICE_PARTNER_STARTER=price_xxxxx
VITE_STRIPE_PRICE_PARTNER_GROWTH=price_xxxxx

# Maps
VITE_MAPBOX_TOKEN=pk.xxxxx

# Feature Flags
VITE_ENABLE_PREMIUM=true
VITE_ENABLE_QR_SCANNER=true
VITE_ENABLE_LEADERBOARD=true
```

---

## 🔄 Coordination Points

### Brian ↔ Andrew Sync Points

| Topic | Brian Needs | Andrew Provides |
|-------|-------------|-----------------|
| Auth | Login/register API working | `/api/auth/*` endpoints |
| Offers | CRUD API for partner offers | `/api/partner/offers/*` endpoints |
| QR Verify | Verification endpoint | `POST /api/offers/verify-qr` |
| Leaderboard | Leaderboard data API | `GET /api/leaderboard` |
| Payments | Checkout session creation | `POST /api/payments/create-checkout` |
| Webhooks | Subscription status updates | Webhook handler updating DB |

### Suggested Sync Meeting Agenda

1. **API Contract Review** (30 min)
   - Agree on request/response formats
   - Define error codes and messages
   - Set up Postman collection

2. **Auth Flow** (15 min)
   - Token format and expiry
   - Refresh token strategy
   - Error handling

3. **Stripe Flow** (20 min)
   - Checkout session creation
   - Webhook events to handle
   - Subscription status sync

4. **Testing Strategy** (15 min)
   - Test accounts to use
   - Stripe test mode
   - QR code testing

---

## 📅 Brian's Task Timeline

### Week 1: Foundation
- [ ] Set up API service layer
- [ ] Implement auth context
- [ ] Connect login/register to real API
- [ ] Test auth flow end-to-end

### Week 2: Stripe Integration
- [ ] Implement Stripe checkout component
- [ ] Add subscription management portal
- [ ] Test payment flows with Stripe test mode
- [ ] Handle payment success/failure states

### Week 3: Partner Dashboard
- [ ] Connect offer CRUD to real API
- [ ] Implement QR scanner component
- [ ] Add real-time offer stats
- [ ] Test partner workflows

### Week 4: Polish & Testing
- [ ] Implement leaderboard with real data
- [ ] Add loading states and error handling
- [ ] Cross-browser testing
- [ ] Mobile responsive testing

---

## ⚠️ Potential Blockers

| Blocker | Solution | Owner |
|---------|----------|-------|
| Backend API not ready | Use mock API responses | Brian (temporary) |
| Stripe products not created | Create in Stripe Dashboard | PM |
| CORS errors | Configure backend CORS | Andrew |
| Camera permissions (QR) | Use HTTPS | DevOps |
| Webhook not receiving | Check Stripe CLI / URL | Andrew + PM |

---

## 🧪 Testing Checklist for PM

Before marking Brian's work complete:

### Auth Flow
- [ ] Can register new partner account
- [ ] Can login with existing account
- [ ] Token persists on refresh
- [ ] Logout clears session

### Stripe Flow
- [ ] Checkout redirects to Stripe
- [ ] Payment success updates UI
- [ ] Can access subscription portal
- [ ] Cancellation works

### Offer Management
- [ ] Can create new offer
- [ ] Can edit existing offer
- [ ] Can pause/activate offer
- [ ] Can delete offer
- [ ] Location dropdown works

### QR Scanner
- [ ] Camera permission prompt appears
- [ ] QR code scans successfully
- [ ] Valid QR shows success
- [ ] Invalid QR shows error
- [ ] Works on mobile

### Leaderboard
- [ ] Shows rankings correctly
- [ ] Filters work (Global/State/Friends)
- [ ] Time filters work
- [ ] Current user highlighted

---

## 📞 Quick Reference

| Resource | URL |
|----------|-----|
| Stripe Dashboard | [dashboard.stripe.com](https://dashboard.stripe.com) |
| Stripe Docs | [stripe.com/docs](https://stripe.com/docs) |
| Stripe Test Cards | [stripe.com/docs/testing](https://stripe.com/docs/testing) |
| html5-qrcode Demo | [scanapp.org](https://scanapp.org) |

### Stripe Test Card Numbers
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Auth Required: 4000 0025 0000 3155

Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

---

**Questions? Brian should coordinate with Andrew on API contracts first.**
