"""
Public legal documents API.
Serves published legal docs (Terms of Service, Privacy Policy, etc.) to mobile and web clients.
Admin creates/updates docs via /api/admin/legal-documents; this route is read-only, no auth required.
"""
import logging

from fastapi import APIRouter, HTTPException, Query, Request

from limiter import limiter

from database import get_supabase
from services.legal_text import html_to_plain_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legal", tags=["Legal"])

PUBLIC_STATUSES = ("published", "active")


def _normalized(value: object) -> str:
    return str(value or "").strip().lower().replace("_", "-").replace(" ", "-")


def _is_public(row: dict) -> bool:
    return _normalized(row.get("status")) in PUBLIC_STATUSES


def _matches_public_slug(row: dict, slug: str) -> bool:
    wanted = _normalized(slug)
    slug_value = _normalized(row.get("slug"))
    type_value = _normalized(row.get("type"))
    name_value = _normalized(row.get("name"))
    hay = f"{slug_value} {type_value} {name_value}"
    if "cookie" in hay or "api-terms" in hay or "developer" in hay or "partner" in hay:
        return False
    if wanted == "privacy-policy":
        return slug_value == wanted or type_value == "privacy" or name_value in {"privacy", "privacy-policy"}
    if wanted == "terms-of-service":
        return slug_value in {wanted, "terms"} or type_value == "terms" or name_value in {"terms", wanted}
    return slug_value == wanted


def _augment_with_plain_text(row: dict) -> dict:
    """
    Mobile clients render the doc body in a React Native `<Text>` block, so
    they need a plain-text version of any HTML body. We compute it on read so
    admins can keep editing rich HTML without thinking about a parallel
    plain-text column. The original `content` is preserved for the website.
    """
    content = row.get("content") or ""
    row["content_text"] = html_to_plain_text(content)
    return row


@router.get("/documents")
@limiter.limit("120/minute")
def list_legal_documents(request: Request, required_only: bool = Query(default=False)):
    """Return all published legal documents (summary, no full content)."""
    try:
        sb = get_supabase()
        result = (
            sb.table("legal_documents")
            .select("id,slug,name,type,version,description,status,is_required,created_at,last_updated")
            .order("name")
            .execute()
        )
        rows = [row for row in (result.data or []) if _is_public(row)]
        if required_only:
            rows = [row for row in rows if row.get("is_required") is True]
        return {"success": True, "data": rows}
    except Exception as e:
        logger.warning("list_legal_documents: %s", e)
        return {"success": True, "data": []}


@router.get("/documents/by-slug/{slug}")
@limiter.limit("120/minute")
def get_legal_document_by_slug(request: Request, slug: str):
    """
    Return the published doc whose stable slug matches (e.g. `terms-of-service`,
    `privacy-policy`). Powers the public `/terms` and `/privacy` web pages and
    is safer than UUID lookups across environments.
    """
    if not slug or len(slug) > 120:
        raise HTTPException(status_code=400, detail="Invalid slug")
    try:
        sb = get_supabase()
        result = (
            sb.table("legal_documents")
            .select("*")
            .eq("slug", slug)
            .order("last_updated", desc=True)
            .limit(1)
            .execute()
        )
        rows = [row for row in (result.data or []) if _is_public(row)]
        if not rows:
            all_result = (
                sb.table("legal_documents")
                .select("*")
                .order("last_updated", desc=True)
                .execute()
            )
            rows = [row for row in (all_result.data or []) if _is_public(row) and _matches_public_slug(row, slug)]
        if not rows:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"success": True, "data": _augment_with_plain_text(rows[0])}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("get_legal_document_by_slug(%s): %s", slug, e)
        raise HTTPException(status_code=500, detail="Could not retrieve document")


@router.get("/documents/{doc_id}")
@limiter.limit("120/minute")
def get_legal_document(request: Request, doc_id: str):
    """Return full content of a single published legal document."""
    try:
        sb = get_supabase()
        result = (
            sb.table("legal_documents")
            .select("*")
            .eq("id", doc_id)
            .limit(1)
            .execute()
        )
        rows = [row for row in (result.data or []) if _is_public(row)]
        if not rows:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"success": True, "data": _augment_with_plain_text(rows[0])}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("get_legal_document: %s", e)
        raise HTTPException(status_code=500, detail="Could not retrieve document")
