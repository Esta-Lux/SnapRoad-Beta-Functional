import base64
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request, Query

from database import get_supabase
from middleware.auth import get_current_user
from services.photo_analysis import PhotoAnalysisService
from limiter import limiter

router = APIRouter(prefix="/api/photo-reports", tags=["photo_reports"])


_CATEGORY_PROMPT = (
    "What road hazard or incident is in this photo? Reply with ONLY one word from: "
    "crash, construction, pothole, flooding, police, debris, weather, closure, hazard. "
    "Then on a new line write a brief description under 20 words."
)

ALLOWED_IMAGE_TYPES = {"jpeg", "png", "webp"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _detect_image_type(contents: bytes) -> str | None:
    """Lightweight image signature detection for Python 3.13+ (imghdr removed)."""
    if contents.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return "webp"
    return None


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
@limiter.limit("20/minute")
async def upload_photo_report(
    request: Request,
    file: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    description: str = Form(""),
    user: dict = Depends(get_current_user),
):
    uid = user["id"]
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large")
    inferred = _detect_image_type(contents[:512])
    if inferred not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image format")

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
    except Exception:
        raise HTTPException(status_code=500, detail="Storage upload failed")

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
    except Exception:
        raise HTTPException(status_code=500, detail="DB insert failed")


@router.get("/nearby")
def get_nearby_photos(
    lat: float,
    lng: float,
    radius: float = Query(default=5, ge=0.1, le=50),
    limit: int = Query(default=50, ge=1, le=100),
):
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
        .limit(limit)
        .execute()
    )
    return {"photos": res.data or []}


@router.post("/{report_id}/upvote")
@limiter.limit("60/minute")
def upvote_report(request: Request, report_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    report_res = supabase.table("incident_photos").select("id,user_id").eq("id", report_id).limit(1).execute()
    report = report_res.data[0] if report_res.data else None
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if str(report.get("user_id")) == str(user.get("id")):
        raise HTTPException(status_code=400, detail="Cannot upvote your own report")
    try:
        supabase.table("incident_photo_upvotes").insert(
            {"report_id": report_id, "user_id": user.get("id")}
        ).execute()
    except Exception:
        raise HTTPException(status_code=409, detail="Already upvoted")
    supabase.rpc("increment_upvotes", {"report_id": report_id}).execute()
    return {"success": True}

