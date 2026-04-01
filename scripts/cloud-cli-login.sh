#!/usr/bin/env bash
# Run this in your own terminal (Cursor: Terminal → New Terminal), not via CI/non-interactive.
# Signs in: Railway → Stripe → Supabase → Vercel (one after another).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1 — install first (e.g. brew install railway stripe supabase)"; exit 1; }
}

need railway
need stripe
need supabase

echo ""
echo "========== 1/4 Railway =========="
echo "Complete login in the browser when prompted."
railway login

echo ""
echo "========== 2/4 Stripe =========="
echo "Complete login in the browser when prompted."
stripe login

echo ""
echo "========== 3/4 Supabase =========="
echo "Complete login in the browser when prompted."
supabase login

echo ""
echo "========== 4/4 Vercel =========="
echo "Using npx (no global install required). Complete login in the browser when prompted."
npx --yes vercel@latest login

echo ""
echo "Done. Quick checks:"
railway whoami 2>/dev/null || true
stripe --version
supabase projects list 2>/dev/null | head -5 || true
npx --yes vercel@latest whoami 2>/dev/null || true
