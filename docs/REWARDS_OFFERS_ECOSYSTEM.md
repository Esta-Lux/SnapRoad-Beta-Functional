# Rewards & offers — single backend, three surfaces

This document maps **shared data**, **APIs by role**, **UI surfaces**, and **end-to-end flows** for the driver app, partner dashboard (Vite web), and admin dashboard (Vite web). All business writes go through the FastAPI backend and Supabase (service role / RPC), not duplicated per client.

---

## 1. Backend entity map (source of truth)

| Concept | Primary storage | Notes |
|--------|------------------|--------|
| **Driver gem balance** | `profiles.gems` | Denormalized current balance; updated with debits/credits. |
| **Gem ledger (every movement)** | `wallet_transactions` | Append-only rows: `tx_type`, `direction` (`credit`/`debit`), `amount`, `balance_before`/`balance_after`, `reference_type`, `reference_id`, `metadata`. Trip and offer flows call `record_wallet_transaction` or the atomic RPC inserts here. |
| **Offers** | `offers` | Partner/admin-created rows; `status`, `base_gems`, category fields, `partner_id`, imagery URLs, etc. |
| **Redemptions** | `redemptions` | One row per user+offer redemption; `gems_earned` (negative magnitude for cost), fees, `scanned_by_user_id` when staff scans QR in store, `qr_nonce`. Legacy migrations may reference `offer_redemptions`; runtime code uses `redemptions`. |
| **Atomic redeem** | `redeem_offer_atomic` (SQL function) | Single transaction: validate offer/profile, insert redemption, debit gems, insert `wallet_transactions`, bump offer/partner counters. See `app/backend/sql/038_redeem_offer_atomic.sql`. |
| **Partners** | `partners` | Business accounts; fee aggregates, credits, etc. |
| **Trips** | `trips` | Trip records; `gems_earned` (or equivalent) tied to profile; trip completion triggers wallet credit + ledger row in `routes/trips.py`. |
| **Trip rewards (persisted)** | `trips` + `wallet_transactions` | Trip gem credit is reflected in profile, trip row, and ledger metadata (see `trip_drive` / trip-related `tx_type` in gamification). |

---

## 2. Endpoint map by role

### Driver (authenticated user JWT)

| Area | Method | Path | Purpose |
|------|--------|------|---------|
| Offers | GET | `/api/offers`, `/api/offers/nearby`, `/api/offers/on-route`, `/api/offers/personalized` | Browse/filter (query params + client filters). |
| Offers | GET | `/api/offers/categories` | Category list. |
| Offers | GET | `/api/offers/{offer_id}` | Detail; includes redemption flags when logged in. |
| Redeem | POST | `/api/offers/{offer_id}/redeem` | Debit gems, create redemption + ledger (atomic RPC when available). |
| Redemptions | GET | `/api/offers/my-redemptions` | Status, `used_in_store` from `scanned_by_user_id`. |
| QR / claim | POST | `/api/offers/{offer_id}/generate-qr` | Pre-redeem QR where applicable. |
| Post-redeem QR | *(issued in redeem response)* | JWT + nonce for partner scan | See `complete_offer_redemption` → `_issue_post_redeem_qr`. |
| Gems | GET | `/api/gems/history` | Balance + recent activity (prefers `wallet_transactions`). |
| Gems | GET | `/api/gems/activity/{wallet_tx_id}` | Detail for one ledger row. |
| Summary | GET | `/api/rewards/summary` | Header stats (gems, trips, badges, multiplier label). |
| Badges | GET | `/api/badges` | Badges for Rewards UI. |

### Partner (partner auth)

| Area | Method | Path | Purpose |
|------|--------|------|---------|
| Offers CRUD | POST/GET/PUT/DELETE | `/api/partner/offers`, `/api/partner/offers/{offer_id}` | Create/edit/pause (via status), image upload helper: `/api/partner/offers/upload-image`. |
| Redemptions | GET | `/api/partner/v2/redemptions/{partner_id}` | List with `offer_snapshot`, `used_in_store`. |
| Confirm scan | POST | `/api/partner/v2/redeem` | Validates QR JWT; records `scanned_by_user_id` on existing redemption when driver already redeemed (see shared flow below). |
| Validate QR | POST | `/api/partner/v2/scan/validate` | Team-link token + QR validation preview. |
| Analytics | GET | `/api/partner/v2/analytics/{partner_id}` | Offer analytics. |

### Admin (admin JWT)

| Area | Method | Path | Purpose |
|------|--------|------|---------|
| Stats | GET | `/api/admin/stats` | Includes redemption totals. |
| **Wallet ledger** | GET | `/api/admin/wallet-ledger?user_id=&limit=` | Cross-user `wallet_transactions` (ops / fraud review). |
| Offers | GET/POST/PUT… | `/api/admin/offers`, `/api/admin/offers/create`, bulk/excel | Monitor/create offers. |
| Partners | CRUD | `/api/admin/partners` | Partner management. |
| Rewards (legacy vouchers) | CRUD | `/api/admin/rewards` | Separate from map offers; still admin surface. |
| Audit | GET | `/api/admin/audit` | Audit log entries. |

---

## 3. Driver app UI map

| Location | Role |
|----------|------|
| `app/mobile/src/screens/RewardsScreen.tsx` | Main Rewards hub: loads `/api/offers/nearby`, `/api/gems/history`, `/api/offers/my-redemptions`, `/api/rewards/summary`, `/api/badges`. |
| `app/mobile/src/components/rewards/*` | Header, tabs, offer cards, modals, `GemActivityDetailModal`, filters. |

Drivers: browse/filter offers, redeem, see balance and gem activity, open activity detail, view redemptions (including in-store used flag when staff scans).

---

## 4. Partner dashboard UI map

| Location | Role |
|----------|------|
| `app/frontend/src/pages/PartnerDashboard.tsx` | Shell: tabs (overview, offers, locations, analytics, boosts, finance, **redemptions**, referrals, team links, pricing). |
| `app/frontend/src/components/partner/OffersTab.tsx` | Create/edit offers (uses partner API). |
| `app/frontend/src/components/partner/RedemptionsTab.tsx` | Partner redemption list / scan flows (partner v2 API). |
| `app/frontend/src/components/partner/AnalyticsTab.tsx` | Analytics. |
| `app/frontend/src/services/partnerApi.ts` | Typed client for partner endpoints. |

Partners do **not** use driver mobile routes; they use `/api/partner/*` with partner credentials.

---

## 5. Admin dashboard UI map

| Location | Role |
|----------|------|
| `app/frontend/src/pages/AdminDashboard.tsx` | Nav: dashboard, users, incidents, moderation, rewards & vouchers, partners, **offer management**, referrals, notifications, analytics, finance, legal, settings, audit. |
| `app/frontend/src/components/admin/AdminOfferManagement.tsx` | Admin offer tooling. |
| `app/frontend/src/components/admin/RewardsTab.tsx` | Legacy rewards/vouchers. |
| `app/frontend/src/components/admin/PartnersTab.tsx` | Partners & campaigns. |
| `app/frontend/src/services/adminApi.ts` | Includes `getWalletLedger()` → `GET /api/admin/wallet-ledger`. |

Admins use **admin** JWT and `/api/admin/*` only.

---

## 6. Shared flows

### A. Trip reward

1. Trip completes (`routes/trips.py`): gems computed, profile updated, `record_wallet_transaction` with appropriate `tx_type` (e.g. trip credit).
2. Driver sees credit in `/api/gems/history` and optional detail via `/api/gems/activity/{id}` when `wallet_transactions.id` is known.
3. Admin can inspect the same rows via `GET /api/admin/wallet-ledger?user_id=<driver_uuid>`.

### B. Offer redemption (driver)

1. `POST /api/offers/{id}/redeem` → `complete_offer_redemption` → `redeem_offer_atomic` when RPC present: single DB transaction for debit + redemption + ledger + counters.
2. Response may include `qr_token` / `claim_code` for in-store proof (`_issue_post_redeem_qr`).
3. Partner and admin analytics/redemption counts reflect the same `redemptions` and `wallet_transactions` rows.

### C. Partner redemption confirmation (in-store scan)

1. Driver redeems in app → redemption row exists (`scanned_by_user_id` null), QR issued.
2. Partner staff calls `POST /api/partner/v2/redeem` with JWT from QR; `validate_qr_token` ensures nonce.
3. `complete_offer_redemption(..., scanned_by_user_id=..., redemption_id_from_qr=...)` **updates** the existing redemption: sets `scanned_by_user_id` / `qr_nonce` — **no second debit**.
4. Driver `GET /api/offers/my-redemptions` shows `used_in_store: true`; partner `GET /api/partner/v2/redemptions/{partner_id}` shows `used_in_store` via the same column.

### D. Wallet activity display

1. **Authoritative** list: `wallet_transactions` per user (`fetch_recent_ledger` / `GET /api/gems/history`).
2. **Fallback** if ledger empty: history derived from `trips` + `redemptions` (legacy compatibility).
3. **Detail**: `GET /api/gems/activity/{wallet_tx_id}` joins metadata to offers/trips/challenges as implemented in `gamification.py`.
4. **Admin**: `GET /api/admin/wallet-ledger` for cross-user review.

---

## Design rules (non-duplication)

- **One write path** for redeem: `complete_offer_redemption` + `redeem_offer_atomic` / legacy path in `offers.py`.
- **One ledger writer** helper: `services/wallet_ledger.py` (plus RPC inserts inside `redeem_offer_atomic`).
- **Partner scan** does not create a second redemption; it **confirms** the existing row after driver redeem.

---

## Related files

- SQL: `app/backend/sql/037_wallet_transactions.sql`, `038_redeem_offer_atomic.sql`
- Backend: `app/backend/routes/offers.py`, `partners.py`, `gamification.py`, `trips.py`, `admin.py`
- Mobile: `app/mobile/src/screens/RewardsScreen.tsx`
- Web: `app/frontend/src/pages/PartnerDashboard.tsx`, `AdminDashboard.tsx`, `services/adminApi.ts`
