# SnapRoad Launch Readiness Runbook

## What this pass hardens

- iOS app no longer opens external Stripe checkout; App Store-safe iPhone purchases now go through the native Apple subscription path.
- Public legal URLs exist for Privacy Policy, Terms of Service, and Community Guidelines.
- Family launch surfaces are hidden by default until the backend is production-ready.
- Release builds force `EXPO_PUBLIC_NAV_LOGIC_DEBUG=0`.
- Mobile CI now runs unit/smoke tests, typecheck, and a production Expo export smoke.
- Support contact is standardized on `teams@snaproad.co`.

## Still required before App Store submission

1. Publish final reviewed legal content in the admin portal so:
   - `/privacy`
   - `/terms`
   - `/community-guidelines`
   render live content instead of the unpublished placeholder state.
2. Verify App Store Connect privacy nutrition answers against actual data collection and sharing.
3. Confirm App Review notes describe:
   - background location for turn-by-turn navigation
   - camera use for road reports
   - microphone / speech recognition for Orion voice commands
   - notifications for driving and account events
4. Verify production Sentry credentials are present in EAS / GitHub so release source maps upload.
5. Confirm all required Supabase migrations are applied in production, especially:
   - `016_profiles_stripe_customer.sql`
   - `025_partner_credit_controls.sql`
   - `036_plan_entitlement_source.sql`
   - legal-doc and moderation schema used by launch flows

## Submission checklist

### Mobile

- [ ] Run `npm test`
- [ ] Run `npx tsc --noEmit`
- [ ] Run `npx expo export --platform ios --platform android --output-dir dist-export --clear`
- [ ] Verify iOS upgrade flows do not open external subscription checkout
- [ ] Verify legal links open `/privacy`, `/terms`, `/community-guidelines`
- [ ] Verify support contact shows `teams@snaproad.co`

### Frontend

- [ ] Run `npm run lint`
- [ ] Run `npm run test`
- [ ] Run `npm run build`
- [ ] Verify legal routes render from the production backend
- [ ] Verify partner welcome page exposes legal links

### Backend

- [ ] Run `python3 -m pytest tests/test_ci_smoke.py tests/unit`
- [ ] Run `python scripts/predeploy_smoke.py`
- [ ] Verify `/health`, `/api/health`, `/api/env-check`
- [ ] Verify partner credits update succeeds against the live schema

## Release environment expectations

- `EXPO_PUBLIC_NAV_LOGIC_DEBUG=0` for production
- Sentry release uploads enabled when `SENTRY_AUTH_TOKEN` is configured
- Family mode remains disabled unless product explicitly flips the launch flag
- `teams@snaproad.co` is the single public support contact

## Deferred follow-ups

- Move admin and partner auth away from localStorage to httpOnly cookies.
- Add MFA / 2FA for admin access.
- Feed real mobile crash-free session data into the admin SLO dashboard.
- Add stronger end-user safety controls such as block / mute flows for abusive users.
