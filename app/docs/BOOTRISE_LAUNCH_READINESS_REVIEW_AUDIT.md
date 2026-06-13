# BootRise Launch Readiness Review Audit

Last updated: June 13, 2026

This document checks the BootRise dashboard report against the actual `main` branch of `Esta-Lux/SnapRoad-Beta-Functional` and rewrites the findings in plain English.

## Plain-English Summary

BootRise was right about the big picture: SnapRoad is a multi-app monorepo with a React Native / Expo mobile app, a Vite React web/admin frontend, and a FastAPI backend. It also correctly noticed that launch readiness depends on security, route protection, Supabase policies, mobile/frontend/backend checks, and production configuration.

The report was not clear enough, and a few findings need better labels:

- The repo is Expo / React Native, not Flutter. The `pubspec.yaml` and `lib/main.dart` items are not real launch blockers for this codebase unless SnapRoad intentionally adds a Flutter app later.
- `app/mobile/src/lib/supabase.ts` contains a placeholder anon JWT used to prevent import-time crashes when env is missing. That is not the same as a confirmed leaked production secret. It should still be cleaned up or documented because scanners will keep flagging it.
- `app/backend/database.py` currently loads Supabase values from environment variables and rejects anon keys. The dashboard's "hardcoded credential pattern" finding looks stale or too broad for this file as of this audit.
- The RLS finding in `app/backend/sql/014_align_schemas.sql` is real. Policies such as `USING (true) WITH CHECK (true)` should not be used without restricting the policy role, because they can make rows broadly accessible under RLS.
- The session/auth warning is partly valid but vague. There is auth middleware and admin routes use `Depends(require_admin)`, but SnapRoad needs a route-by-route proof that protected API surfaces are not accidentally public.

## What BootRise Got Right

### Repo shape

Confirmed. The repository is a monorepo:

- `app/mobile`: Expo / React Native driver app.
- `app/frontend`: Vite / React partner and admin web app.
- `app/backend`: FastAPI backend and integration layer.
- Root package also contains Expo scripts and shared repo-level commands.

The report's broad "full-stack web" label is directionally useful, but the plain label should be: full-stack product monorepo with mobile, web/admin, and FastAPI backend surfaces.

### Tests and CI exist

Confirmed. The repo has backend tests, frontend test scripts, mobile smoke/unit scripts, and GitHub workflow files. The report is fair to say there is test evidence.

Plain English: SnapRoad has test infrastructure, but launch confidence still depends on running the exact mobile, frontend, and backend commands before release.

### RLS risk

Confirmed. `app/backend/sql/014_align_schemas.sql` creates policies like:

- `Service role can manage profiles` with `USING (true) WITH CHECK (true)`.
- `Service role full access trips` with `USING (true) WITH CHECK (true)`.
- `Service role can manage redemptions` with `USING (true) WITH CHECK (true)`.

Plain English: these policies may give every database role permission, not only the backend service role. If the goal is backend-only access, policies should either be scoped to a role explicitly or replaced with user/tenant-specific predicates.

### Route/API protection needs proof

Mostly confirmed. `app/backend/middleware/auth.py` contains JWT/Supabase auth helpers, `require_admin`, and `require_partner`. `app/backend/routes/admin.py` uses `APIRouter(..., dependencies=[Depends(require_admin)])`, so admin routes are protected.

Plain English: auth exists, but launch readiness should prove every sensitive route uses the right dependency. Public routes, guest routes, partner routes, admin routes, and webhook routes should each be listed as intentionally public or protected.

### Runtime checks were not actually run

Confirmed. The pasted report lists build/test checks as pending or skipped. It should not imply that SnapRoad passed launch verification yet.

Plain English: the report is an inspection, not a green release gate.

## What BootRise Overstated or Misread

### Flutter blockers are false positives

The report says `pubspec.yaml exists` and `lib/main.dart exists` are missing. GitHub search found neither file, but the repository's own README and `app/mobile/package.json` identify the mobile app as Expo / React Native.

Plain English: do not add Flutter files to fix this report. Fix the scanner classification or document that SnapRoad mobile is Expo / React Native.

Correct replacement finding:

- Verify `app/mobile/package.json`, `app/mobile/app.json` or Expo config, native iOS/Android config, and EAS build settings.

### Mobile Supabase "exposed secret" needs a better label

`app/mobile/src/lib/supabase.ts` reads Supabase URL and anon key from Expo config. It uses placeholder values when config is missing, including a placeholder anon JWT.

Plain English: this is not confirmed evidence of a real leaked production secret. It is a scanner match on a JWT-like placeholder. It should still be cleaned up because it creates noise and could confuse reviewers.

Recommended fix:

- Replace the placeholder JWT with a non-JWT sentinel string if Supabase client construction allows it, or clearly comment that the value is a dummy placeholder.
- Keep real Supabase anon/publishable keys in Expo/EAS public config only.
- Never place service-role keys in mobile or frontend bundles.

### Backend database hardcoded credential finding looks stale

`app/backend/database.py` imports `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` from `config.py`, checks that the service key is not an anon/publishable key, and creates the Supabase client from environment-backed values.

Plain English: this file does not currently contain a hardcoded secret in the reviewed lines. The report should say "verify backend secrets are environment-only" instead of presenting this as a confirmed hardcoded credential.

## What The Report Is Missing

### Known product-specific launch gaps already exist in repo docs

`app/docs/LAUNCH_READINESS_RUNBOOK.md` already lists practical launch blockers, including legal content, App Store privacy answers, Sentry credentials, production Supabase migrations, Apple subscription flow checks, and mobile/frontend/backend command checks.

`app/docs/SNAPROAD_ARCHITECTURE_AND_DEPLOYMENT_AUDIT.md` also documents product-specific gaps, such as friends/social mock data, config flags not fully applied in the driver app, partial Stripe/webhook behavior, and admin health placeholders.

Plain English: BootRise should pull these docs into the launch readiness summary instead of only relying on generic static signals.

### App Store and mobile release readiness

The dashboard report focuses on code shape and security signals. It should also call out mobile release requirements:

- EAS production build path.
- App Store privacy nutrition answers.
- Background location, camera, microphone/speech, and notification review notes.
- iOS subscription compliance.
- Production Expo public env values.

### Product data boundaries

The architecture audit says friends are still mock-backed while live locations use Supabase. That matters more for beta readiness than the generic Flutter false positives.

Plain English: the app may look wired, but some user-social features may not persist production data correctly yet.

## Corrected Launch Blockers

### P0 - Must fix before public beta

1. Scope permissive RLS policies.

   Evidence: `app/backend/sql/014_align_schemas.sql`.

   Plain English: database rows should not be readable or writable by the wrong user or role. Replace broad `true` policies with explicit user, partner, admin, or service-role rules.

2. Prove protected API coverage.

   Evidence: auth helpers exist in `app/backend/middleware/auth.py`; admin router uses `Depends(require_admin)`, but every sensitive route still needs review.

   Plain English: make a route table showing which endpoints are public, user-only, partner-only, admin-only, webhook-only, or internal-only.

3. Run real release checks.

   Evidence: dashboard checks were pending/skipped.

   Plain English: no one should treat the score as final until backend tests, frontend lint/test/build, mobile test/typecheck, and production build/export checks run.

### P1 - Important before design-partner beta

1. Clean up placeholder secret-looking values.

   Evidence: `app/mobile/src/lib/supabase.ts`.

   Plain English: even if placeholder values are not real secrets, remove scanner noise so future reports focus on real risk.

2. Align frontend/mobile API calls with backend routes.

   Evidence: BootRise found unmatched/dynamic frontend calls; existing docs describe split frontend/backend behavior.

   Plain English: verify method, path, auth, request body, and response shape for core flows.

3. Apply documented launch runbook items.

   Evidence: `app/docs/LAUNCH_READINESS_RUNBOOK.md`.

   Plain English: legal content, App Store review notes, Sentry, Supabase migrations, and payment compliance are release blockers even when static code looks fine.

### P2 - Improve confidence after beta starts

1. Add route-contract tests for the most important frontend-to-backend calls.
2. Add product-specific tests for friends/location, auth, payments, legal pages, and admin controls.
3. Feed known architecture docs into BootRise's report context so future reports are less generic.

## Better Dashboard Language

Use this wording in BootRise or in release notes when summarizing SnapRoad:

"SnapRoad is not blocked because it is missing Flutter files. It is an Expo / React Native, Vite React, and FastAPI monorepo. The real beta risks are database policy scope, proof that protected routes are actually protected, unresolved product-specific launch items in the runbook, and the fact that build/test checks were not executed in this read-only review. Some scanner findings are useful but need human labels: the mobile Supabase value appears to be a placeholder anon token, not confirmed leaked production secret; the backend database client appears environment-backed, not hardcoded. Treat the report as a starting audit, not a pass/fail release certificate."

## Recommended Next BootRise Improvements

1. Framework classification should prefer explicit package evidence over keyword matches. If `app/mobile/package.json` has Expo and React Native, do not require Flutter files.
2. Secret findings should distinguish confirmed real secrets, placeholder/test tokens, public anon keys, and environment-backed config.
3. RLS findings should show why the policy is risky in plain English and name the affected table/policy.
4. Session middleware findings should list sampled protected and public routes instead of saying only "protects route/API surfaces."
5. Launch reports should include a "What this means" paragraph after each risk, plus "How to prove fixed" commands or checks.
