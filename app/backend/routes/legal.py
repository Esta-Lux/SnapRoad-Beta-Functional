"""
Public legal documents API.
Serves published legal docs (Terms of Service, Privacy Policy, etc.) to mobile and web clients.
Admin creates/updates docs via /api/admin/legal-documents; this route is read-only, no auth required.
"""
import logging

from fastapi import APIRouter, HTTPException, Query
from database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legal", tags=["Legal"])


@router.get("/documents")
def list_legal_documents(required_only: bool = Query(default=False)):
    """Return all published legal documents (summary, no full content)."""
    try:
        sb = get_supabase()
        q = (
            sb.table("legal_documents")
            .select("id,name,type,version,description,status,is_required,created_at,updated_at,last_updated")
            .eq("status", "published")
        )
        if required_only:
            q = q.eq("is_required", True)
        result = q.order("name").execute()
        return {"success": True, "data": result.data or []}
    except Exception as e:
        logger.warning("list_legal_documents: %s", e)
        return {"success": True, "data": []}


@router.get("/documents/{doc_id}")
def get_legal_document(doc_id: str):
    """Return full content of a single published legal document."""
    try:
        sb = get_supabase()
        result = (
            sb.table("legal_documents")
            .select("*")
            .eq("id", doc_id)
            .eq("status", "published")
            .limit(1)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"success": True, "data": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("get_legal_document: %s", e)
        raise HTTPException(status_code=500, detail="Could not retrieve document")
