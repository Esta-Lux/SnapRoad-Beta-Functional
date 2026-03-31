# Rollback Runbook

## When to rollback

- Critical auth, payment, or webhook regressions in production.
- Sustained `5xx` spike or failed health checks after deploy.

## Backend rollback

1. Identify last known good release/tag.
2. Deploy last good artifact/environment revision.
3. Verify `GET /health` and auth/login smoke checks.
4. Verify Stripe webhook signature flow (test event).

## Frontend rollback

1. Revert to previous frontend artifact.
2. Validate login, partner dashboard, and Team Scan.
3. Confirm API base points at expected backend.

## Mobile rollback

1. Stop phased rollout for current build.
2. Promote previous stable build.
3. Verify API connectivity and auth flow in production profile.

## Post-rollback tasks

- Keep incident open until root cause is identified.
- Document rollback timestamp, operator, and impact.
