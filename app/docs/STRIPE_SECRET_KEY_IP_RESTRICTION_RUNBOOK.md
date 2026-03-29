# Stripe Secret-Key IP Restriction Runbook

This runbook hardens Stripe usage by restricting backend secret-key access to fixed backend egress IPs.

## Scope

- Backend Stripe secret key (`STRIPE_SECRET_KEY`)
- Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`)
- Environment split: `development`, `preview`, `production`
- EAS Cloud + backend runtime secret manager

## 1) Ensure backend egress is static

You must have fixed outbound IP(s) from the backend network path.

- If hosting supports NAT/egress gateway, enable fixed egress.
- Record the final outbound IPv4 list (1-N addresses).

Validate from runtime (not local laptop):

```bash
python app/backend/scripts/check_egress_ip.py
```

Expected: stable IP(s) across repeated runs and across deploy instances.

## 2) Create dedicated Stripe secret key per environment

Create one key for each env:

- `STRIPE_SECRET_KEY` (development)
- `STRIPE_SECRET_KEY` (preview)
- `STRIPE_SECRET_KEY` (production)

Do not reuse the same secret key across environments.

## 3) Restrict key in Stripe Dashboard

In Stripe Dashboard:

1. Go to Developers -> API keys.
2. Create/select restricted secret key for each environment.
3. Apply allowed IP list to backend static egress IP(s).
4. Grant minimum required permissions (checkout/session/webhook related only).

## 4) Update runtime secrets

### Backend runtime (required)

Set these in backend host secret manager:

- `STRIPE_SECRET_KEY` (env-specific key)
- `STRIPE_WEBHOOK_SECRET` (env-specific webhook signing secret)

### EAS Cloud (only if backend-like jobs run there)

If needed, update EAS envs:

```bash
# from app/mobile
npx eas-cli env:create --environment development --name STRIPE_SECRET_KEY --value "<dev_key>" --visibility secret --force --non-interactive
npx eas-cli env:create --environment preview --name STRIPE_SECRET_KEY --value "<preview_key>" --visibility secret --force --non-interactive
npx eas-cli env:create --environment production --name STRIPE_SECRET_KEY --value "<prod_key>" --visibility secret --force --non-interactive
```

Note: mobile/web clients should only use publishable keys.

## 5) Rotate old keys after cutover

Order:

1. Deploy new secrets.
2. Run smoke validation (next section).
3. Disable old keys in Stripe Dashboard.
4. Monitor errors for 30-60 minutes.

## 6) Validate end-to-end

### A) Backend checkout smoke test

Use an authenticated test flow and create checkout sessions in each env.

Minimum checks:

- Session creation succeeds (2xx)
- Stripe payment intent/session appears in correct Stripe env
- Webhook delivery succeeds and signature validates

### B) Negative test (IP restriction)

Attempt with a key from an unauthorized IP/network and verify Stripe denies access.

### C) Monitoring

- Stripe Dashboard -> Developers -> Logs
- Backend logs for Stripe API failures
- Alert on any spike in 4xx/5xx from `/api/payments/*`

## 7) Rollback plan

If checkout fails after restriction:

1. Re-enable previous key temporarily.
2. Restore prior secret in runtime.
3. Remove incorrect IP restriction.
4. Re-run egress IP verification and retry.

## Required data before execution

- Final static backend egress IP list
- New env-specific Stripe secret keys
- New env-specific webhook secrets
- Confirmed backend deploy target(s) where secrets live
