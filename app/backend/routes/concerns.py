"""
User-facing concern submission (bugs, feedback, support).
Requires authenticated user; user_id is taken from token.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

from middleware.auth import get_current_user
from services.supabase_service import sb_create_concern

router = APIRouter(prefix="/api", tags=["Concerns"])


class SubmitConcernBody(BaseModel):
    user_id: Optional[str] = None
    category: Optional[str] = None
    # Legacy mobile / older clients
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    message: Optional[str] = None
    severity: str = "medium"
    context: Optional[dict[str, Any]] = None
    status: str = "open"


@router.post("/concerns/submit")
def submit_concern(body: SubmitConcernBody, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = str(user.get("user_id") or user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    category = (body.category or body.type or "").strip()
    description = (body.description or body.message or "").strip()
    if not category or not description:
        raise HTTPException(
            status_code=422,
            detail="category and description are required (use category + description, or legacy type + message)",
        )
    payload = {
        "user_id": user_id,
        "category": category,
        "title": (body.title or "").strip() or category.replace("_", " ").title(),
        "description": description,
        "severity": body.severity,
        "context": body.context,
        "status": body.status,
    }
    row = sb_create_concern(payload)
    if not row:
        raise HTTPException(
            status_code=503,
            detail="We could not submit your feedback right now. Please try again later.",
        )
    return {"success": True, "data": {"id": str(row.get("id", ""))}}
