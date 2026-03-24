# Offers roadmap — Tier 2 & 3 (deferred)

This doc captures **deferred** work from the admin/offers product plan. Tier 1 (direct partner offers, auto gems, free vs premium discount, tiered redemption fees) is implemented in code.

## Tier 2 — Groupon + CJ Affiliate

**Scope (future epic):**

- Import pipeline for external deals with `offer_source`, approval queue, and redeem behavior that opens `offer_url` / affiliate links.
- Partial schema support may already exist: `offer_source`, `external_id`, `affiliate_tracking_url`, `original_price` (verify migrations).

**Design notes:**

- Normalize imported rows into the same `offers` table with `offer_source` ∈ `{ direct, groupon, affiliate, ... }`.
- Add admin approval state if not present (e.g. `import_status` or reuse `status`).
- CJ/Groupon-specific tracking and compliance should be reviewed before production.

## Tier 3 — Yelp enrichment

**Scope (future epic):**

- Batch or on-create enrichment using existing admin-style enrichment endpoints (e.g. enrich-yelp on offer id).
- Optional fields: `yelp_rating`, `yelp_review_count`, `yelp_image_url` (already used in driver UI when present).

## Related code pointers

- Backend: `app/backend/routes/admin.py` — `upload_excel_offers`, import/enrich routes.
- Backend: `app/backend/services/offer_utils.py` — pricing and redemption fee helpers.
- Frontend driver: `app/frontend/src/pages/DriverApp/components/OffersModal.tsx` — tiered display (direct vs link-out).
