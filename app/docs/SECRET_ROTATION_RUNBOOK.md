# Secret Rotation Runbook

## Scope

- Backend: `JWT_SECRET`, `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY`.
- Frontend/Mobile: publishable keys and API URLs when required.

## Rotation sequence

1. Generate new secret in provider dashboard.
2. Add new secret to environment manager without deleting old one.
3. Deploy configuration-only change.
4. Validate health + auth + payments + webhook checks.
5. Remove old secret from provider and environment manager.

## JWT secret rotation notes

- Rotate during low-traffic windows.
- Expect all active sessions to require re-authentication.

## Stripe webhook secret rotation

1. Add additional webhook signing secret.
2. Deploy backend with new secret.
3. Send Stripe test webhook and verify signature check passes.
4. Remove old webhook secret.
