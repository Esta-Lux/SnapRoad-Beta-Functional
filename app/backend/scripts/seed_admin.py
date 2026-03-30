"""
Seed the admin user in Supabase Auth + profiles table.
Run from the backend directory:
    py scripts/seed_admin.py          # normal seed
    py scripts/seed_admin.py --force  # reset password & upsert profile
"""
import sys, os, argparse

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

import importlib
import config
importlib.reload(config)

from services.supabase_service import sb_create_user, sb_get_user_by_email, sb_login_user

ADMIN_EMAIL = "Riyan@snaproad.co"
ADMIN_PASSWORD = "Riyanm909@"

ADMIN_PROFILE = {
    "email": ADMIN_EMAIL,
    "name": "Riyan Admin",
    "role": "admin",
    "status": "active",
    "xp": 0,
    "level": 1,
    "gems": 0,
}


def _verify_login(sb, uid: str):
    """Try signing in; if it fails, attempt to reset the password via Admin API."""
    profile, err = sb_login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if profile:
        print("  -> sign-in verified OK")
        return
    print(f"  -> sign-in failed ({err})")
    try:
        print("  -> attempting password reset via Admin API...")
        sb.auth.admin.update_user_by_id(uid, {"password": ADMIN_PASSWORD})
        print("  -> password reset done")
    except Exception as admin_err:
        print(f"  -> Admin API password reset failed: {admin_err}")
        print("  -> NOTE: Use the service_role secret in SUPABASE_SERVICE_ROLE_KEY (not the anon key)")
        print("  -> The profile has been created/updated. Try logging in with the password.")


def _upsert_profile(sb, uid: str):
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    profile_data = {
        "id": uid,
        "password_hash": pwd_context.hash(ADMIN_PASSWORD),
        **ADMIN_PROFILE
    }
    sb.table("profiles").upsert(profile_data).execute()
    print(f"  -> profile upserted (id={uid})")


def main(force: bool = False):
    from database import get_supabase
    sb = get_supabase()

    if force:
        print("--force: ensuring admin Auth user + profile are correct...")
        existing = sb_get_user_by_email(ADMIN_EMAIL)
        if existing:
            uid = existing["id"]
            print(f"Profile found (id={uid}), resetting password & role...")
            sb.auth.admin.update_user_by_id(uid, {"password": ADMIN_PASSWORD})
            _upsert_profile(sb, uid)
            _verify_login(sb, uid)
            print("Done (forced).")
            return

        try:
            auth_users = sb.auth.admin.list_users()
            auth_match = next((u for u in auth_users if u.email and u.email.lower() == ADMIN_EMAIL.lower()), None)
        except Exception:
            auth_match = None

        if auth_match:
            uid = str(auth_match.id)
            print(f"Auth user found (id={uid}), resetting password & creating profile...")
            sb.auth.admin.update_user_by_id(uid, {"password": ADMIN_PASSWORD})
            _upsert_profile(sb, uid)
            print("Done (forced).")
            return

        print("No Auth user found. Creating from scratch...")
        user = sb_create_user(ADMIN_EMAIL, ADMIN_PASSWORD, "Riyan Admin", "admin")
        print(f"Admin user created: {user['id']}")
        return

    existing = sb_get_user_by_email(ADMIN_EMAIL)
    if existing:
        uid = existing["id"]
        print(f"Admin profile already exists: {uid}")
        if existing.get("role") != "admin":
            sb.table("profiles").update({"role": "admin"}).eq("id", uid).execute()
            print("  -> role updated to admin")
        else:
            print("  -> already admin")
        _verify_login(sb, uid)
        return

    try:
        user = sb_create_user(ADMIN_EMAIL, ADMIN_PASSWORD, "Riyan Admin", "admin")
        print(f"Admin user created: {user['id']}")
        print(f"  email: {ADMIN_EMAIL}")
    except Exception as e:
        if "already been registered" in str(e):
            print("User exists in Auth but not in profiles. Attempting sign-in to get ID...")
            profile, err = sb_login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
            if profile:
                uid = profile.get("id")
                _upsert_profile(sb, uid)
            else:
                print(f"Could not sign in ({err}). Trying Admin API to list users...")
                try:
                    auth_users = sb.auth.admin.list_users()
                    auth_match = next((u for u in auth_users if u.email and u.email.lower() == ADMIN_EMAIL.lower()), None)
                    if auth_match:
                        uid = str(auth_match.id)
                        sb.auth.admin.update_user_by_id(uid, {"password": ADMIN_PASSWORD})
                        _upsert_profile(sb, uid)
                        print("Password reset & profile created.")
                    else:
                        print("ERROR: Could not find Auth user. Try --force.")
                except Exception as admin_err:
                    print(f"Admin API error: {admin_err}")
        else:
            raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed SnapRoad admin user")
    parser.add_argument("--force", action="store_true", help="Reset password & upsert profile regardless of current state")
    args = parser.parse_args()
    main(force=args.force)
