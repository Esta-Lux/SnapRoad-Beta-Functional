"""
Send a Supabase Auth invite with a custom redirect (dashboard "Invite user" cannot).

The Supabase Dashboard invite always sends people to your configured Site URL after they
set a password — e.g. https://app.snaproad.app/ → your app routes them to /driver/auth.
Use this script so the email link lands on admin sign-in instead.

Run from app/backend (service role in .env):

    py scripts/invite_user_with_redirect.py admin@yourcompany.com

Redirect resolution (same as the API):

    ADMIN_INVITE_REDIRECT_URL=<full URL>   # optional override
    FRONTEND_URL=https://app.snaproad.app   # else PARTNER_PORTAL_ORIGIN; path /portal/admin-sr2025secure/sign-in is appended

CLI override:

    INVITE_REDIRECT_TO=https://app.snaproad.app/auth?tab=admin

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env (same as the API).

Prefer the admin UI: Settings → &quot;Invite team (admin redirect)&quot; (POST /api/admin/invite-user).
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv

load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import httpx

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, get_admin_invite_redirect_url


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: py scripts/invite_user_with_redirect.py <email>")
        return 1
    email = (sys.argv[1] or "").strip()
    if not email or "@" not in email:
        print("Invalid email")
        return 1

    url = (SUPABASE_URL or "").strip().rstrip("/")
    key = (SUPABASE_SERVICE_ROLE_KEY or "").strip()
    if not url or not key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        return 1

    redirect_to = (os.getenv("INVITE_REDIRECT_TO", "").strip() or get_admin_invite_redirect_url())

    invite_url = f"{url}/auth/v1/invite"
    payload = {"email": email, "redirect_to": redirect_to}

    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(
                invite_url,
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except Exception as e:
        print(f"Request failed: {e}")
        return 1

    if r.status_code >= 400:
        try:
            detail = r.json()
        except Exception:
            detail = r.text
        print(f"Invite failed ({r.status_code}): {detail}")
        return 1

    try:
        data = r.json()
    except Exception:
        data = {}
    print("Invite sent OK.")
    print(f"  email:         {email}")
    print(f"  redirect_to:   {redirect_to}")
    if data:
        print(f"  response keys: {list(data.keys())}")
    print("\nAfter they accept, ensure profiles.id matches auth user id and role is admin.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
