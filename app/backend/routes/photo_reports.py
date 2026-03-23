from __future__ import annotations

import base64
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from database import get_supabase
from middleware.auth import get_current_user
from services.photo_analysis import PhotoAnalysisService

router = APIRouter(prefix="/api/photo-reports", tags=["photo_reports"])


_CATEGORY_PROMPT = (
    "What road hazard or incident is in this photo? Reply with ONLY one word from: "
    "crash, construction, pothole, flooding, police, debris, weather, closure, hazard. "
    "Then on a new line write a brief description under 20 words."
)


async def _categorize(contents: bytes) -> tuple[str, str]:
    """Use the existing OpenAI vision service to get a short description.

    The repo already has `PhotoAnalysisService` (privacy bounding boxes + description).
    We reuse its description and normalize to a simple category+desc response.
    """
    b64 = base64.b64encode(contents).decode("utf-8")
    svc = PhotoAnalysisService()
    analysis = await svc.analyze_image(b64, "image/jpeg")
    desc = (analysis or {}).get("description", "") or ""
    lower = desc.lower()
    # Very small keyword heuristic to map description → category
    mapping = [
        ("pothole", "pothole"),
        ("construction", "construction"),
        ("crash", "crash"),
        ("accident", "crash"),
        ("flood", "flooding"),
        ("police", "police"),
        ("debris", "debris"),
        ("weather", "weather"),
        ("snow", "weather"),
        ("ice", "weather"),
        ("closure", "closure"),
        ("closed", "closure"),
    ]
    cat = "hazard"
    for k, v in mapping:
        if k in lower:
            cat = v
            break
    # Keep description short-ish
    desc = " ".join(desc.split())[:120]
    return cat, desc


@router.post("/upload")
async def upload_photo_report(
    file: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    description: str = Form(""),
    user: dict = Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = user["id"]
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty upload")

    supabase = get_supabase()

    # Upload to Supabase Storage
    file_path = f"{uid}/{uuid.uuid4().hex}.jpg"
    try:
        supabase.storage.from_("incident_photos").upload(
            file_path,
            contents,
            file_options={"content-type": file.content_type or "image/jpeg"},
        )
        photo_url = supabase.storage.from_("incident_photos").get_public_url(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    # AI categorization (best-effort)
    ai_category = "hazard"
    ai_description = ""
    try:
        ai_category, ai_description = await _categorize(contents)
    except Exception:
        pass

    # Save to DB
    try:
        record = (
            supabase.table("incident_photos")
            .insert(
                {
                    "user_id": uid,
                    "lat": lat,
                    "lng": lng,
                    "photo_url": photo_url,
                    "category": ai_category,
                    "ai_category": ai_category,
                    "description": (description or "").strip() or ai_description,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .execute()
        )
        if not record.data:
            raise HTTPException(status_code=500, detail="Failed to save photo report")
        return {"success": True, "report": record.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")


@router.get("/nearby")
async def get_nearby_photos(lat: float, lng: float, radius: float = 5):
    """Fetch non-expired photos within radius miles (bounding box approximation)."""
    supabase = get_supabase()
    lat_delta = radius / 69.0
    lng_delta = radius / (69.0 * 0.7)
    res = (
        supabase.table("incident_photos")
        .select("*")
        .gte("lat", lat - lat_delta)
        .lte("lat", lat + lat_delta)
        .gte("lng", lng - lng_delta)
        .lte("lng", lng + lng_delta)
        .gt("expires_at", "now()")
        .execute()
    )
    return {"photos": res.data or []}


@router.post("/{report_id}/upvote")
async def upvote_report(report_id: str, user: dict = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    supabase = get_supabase()
    supabase.rpc("increment_upvotes", {"report_id": report_id}).execute()
    return {"success": True}

