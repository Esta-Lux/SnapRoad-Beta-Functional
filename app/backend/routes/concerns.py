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
    category: str
    title: Optional[str] = None
    description: str
    severity: str = "medium"
    context: Optional[dict[str, Any]] = None
    status: str = "open"


@router.post("/concerns/submit")
def submit_concern(body: SubmitConcernBody, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    payload = {
        "user_id": user_id,
        "category": body.category,
        "title": body.title or "",
        "description": body.description,
        "severity": body.severity,
        "context": body.context,
        "status": body.status,
    }
    row = sb_create_concern(payload)
    if not row:
        raise HTTPException(status_code=500, detail="Failed to save concern")
    return {"success": True, "data": {"id": str(row.get("id", ""))}}
