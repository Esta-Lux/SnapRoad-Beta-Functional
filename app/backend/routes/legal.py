"""
Public legal documents API.
Serves published legal docs (Terms of Service, Privacy Policy, etc.) to mobile and web clients.
Admin creates/updates docs via /api/admin/legal-documents; this route is read-only, no auth required.
"""
import logging

from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from services.legal_text import html_to_plain_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legal", tags=["Legal"])

PUBLIC_STATUSES = ("published", "active")


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
def list_legal_documents(required_only: bool = Query(default=False)):
    """Return all published legal documents (summary, no full content)."""
    try:
        sb = get_supabase()
        q = (
            sb.table("legal_documents")
            .select("id,slug,name,type,version,description,status,is_required,created_at,last_updated")
            .in_("status", PUBLIC_STATUSES)
        )
        if required_only:
            q = q.eq("is_required", True)
        result = q.order("name").execute()
        return {"success": True, "data": result.data or []}
    except Exception as e:
        logger.warning("list_legal_documents: %s", e)
        return {"success": True, "data": []}


@router.get("/documents/by-slug/{slug}")
def get_legal_document_by_slug(slug: str):
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
            .in_("status", PUBLIC_STATUSES)
            .order("last_updated", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"success": True, "data": _augment_with_plain_text(result.data[0])}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("get_legal_document_by_slug(%s): %s", slug, e)
        raise HTTPException(status_code=500, detail="Could not retrieve document")


@router.get("/documents/{doc_id}")
def get_legal_document(doc_id: str):
    """Return full content of a single published legal document."""
    try:
        sb = get_supabase()
        result = (
            sb.table("legal_documents")
            .select("*")
            .eq("id", doc_id)
            .in_("status", PUBLIC_STATUSES)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"success": True, "data": _augment_with_plain_text(result.data[0])}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("get_legal_document: %s", e)
        raise HTTPException(status_code=500, detail="Could not retrieve document")
