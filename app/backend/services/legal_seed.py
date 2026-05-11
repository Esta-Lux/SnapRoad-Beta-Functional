"""
Seed default SnapRoad legal documents into the
`legal_documents` table.

Why this lives in code (not a SQL migration):
  - The HTML bodies are large; keeping them as files under
    `app/backend/seeds/legal/` makes them easy to read, diff and update.
  - Seeding is **idempotent** — we only insert rows whose `slug` is not yet
    present so admin edits via the portal are never overwritten.

The function is exposed via the admin endpoint
`POST /api/admin/legal-documents/seed-defaults` so a single click after deploy
provisions the default docs without manual SQL.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from services.supabase_service import _sb, _table_missing

logger = logging.getLogger(__name__)


_SEEDS_DIR = os.path.join(os.path.dirname(__file__), "..", "seeds", "legal")

DEFAULT_LEGAL_DOCS: list[dict[str, Any]] = [
    {
        "slug": "terms-of-service",
        "name": "Terms of Service",
        "type": "terms",
        "filename": "terms-of-service.html",
        "description": "Rules and guidelines for using the SnapRoad app and website.",
        "version": "1.0",
        "is_required": True,
        "status": "published",
    },
    {
        "slug": "privacy-policy",
        "name": "Privacy Policy",
        "type": "privacy",
        "filename": "privacy-policy.html",
        "description": "How SnapRoad collects, uses, and protects your data.",
        "version": "1.0",
        "is_required": True,
        "status": "published",
    },
    {
        "slug": "community-guidelines",
        "name": "Community Guidelines",
        "type": "community",
        "filename": "community-guidelines.html",
        "description": "Standards for safe reporting, respectful conduct, and acceptable use across SnapRoad.",
        "version": "1.0",
        "is_required": False,
        "status": "published",
    },
]


def _read_seed_file(filename: str) -> Optional[str]:
    path = os.path.normpath(os.path.join(_SEEDS_DIR, filename))
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logger.warning("legal_seed: seed file missing: %s", path)
        return None
    except Exception as exc:
        logger.error("legal_seed: could not read %s: %s", path, exc, exc_info=True)
        return None


def _existing_slug_set() -> set[str]:
    try:
        res = _sb().table("legal_documents").select("slug").execute()
        return {row.get("slug") for row in (res.data or []) if row.get("slug")}
    except Exception as exc:
        if not _table_missing(exc):
            logger.warning("legal_seed: could not fetch existing slugs: %s", exc)
        return set()


def seed_default_legal_documents(*, force: bool = False) -> dict[str, Any]:
    """
    Insert default public legal documents if their slugs are not already in the table.

    Args:
      force: when True, overwrite the `content` of an existing row with the
             freshly-loaded seed file (also bumps `last_updated`). The admin
             "Restore defaults" button passes `force=True` so admins can revert
             accidental edits without leaving the UI.

    Returns a summary describing what happened so callers can show a toast.
    """
    inserted: list[str] = []
    updated: list[str] = []
    skipped: list[str] = []
    errors: list[str] = []

    existing = _existing_slug_set()

    for spec in DEFAULT_LEGAL_DOCS:
        slug = spec["slug"]
        content = _read_seed_file(spec["filename"])
        if content is None:
            errors.append(f"{slug}: seed file missing")
            continue
        if slug in existing and not force:
            skipped.append(slug)
            continue

        row = {
            "slug": slug,
            "name": spec["name"],
            "type": spec["type"],
            "status": spec["status"],
            "version": spec["version"],
            "description": spec["description"],
            "content": content,
            "is_required": bool(spec["is_required"]),
        }
        try:
            sb = _sb()
            if slug in existing:
                sb.table("legal_documents").update(row).eq("slug", slug).execute()
                updated.append(slug)
            else:
                sb.table("legal_documents").insert(row).execute()
                inserted.append(slug)
        except Exception as exc:
            if _table_missing(exc):
                errors.append(f"{slug}: legal_documents table missing — run migration 053 first")
            else:
                logger.error("legal_seed: write failed for %s: %s", slug, exc, exc_info=True)
                errors.append(f"{slug}: {exc}")

    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }


__all__ = ["seed_default_legal_documents", "DEFAULT_LEGAL_DOCS"]
