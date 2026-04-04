import logging
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request, Query

from database import get_supabase
from middleware.auth import get_current_user
from limiter import limiter
from services.photo_report_processing import (
    ALLOWED_IMAGE_TYPES,
    PUBLIC_PHOTO_BUCKET,
    PRIVATE_ORIGINALS_BUCKET,
    analyze_and_prepare_public_bytes,
    detect_image_type,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/photo-reports", tags=["photo_reports"])

PUBLIC_BUCKET = PUBLIC_PHOTO_BUCKET
PRIVATE_BUCKET = PRIVATE_ORIGINALS_BUCKET

MAX_IMAGE_BYTES = 10 * 1024 * 1024

# Community photo pins: ~3.5h on-map (matches incident report TTL policy).
def _photo_expires_at() -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=3, minutes=30)).isoformat()


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
    original = await file.read()
    if not original:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(original) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large")
    inferred = detect_image_type(original[:512])
    if inferred not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image format")

    supabase = get_supabase()
    prep = await analyze_and_prepare_public_bytes(original)
    analysis_ok = prep["analysis_ok"]
    needs_pii = prep["needs_pii"]
    regions_blurred = prep["regions_blurred"]
    blurred_jpeg = prep["blurred_jpeg"]
    base_jpeg = prep["base_jpeg"]
    ai_category = prep["ai_category"]
    ai_description = prep["ai_description"]

    pending = (not analysis_ok) or (needs_pii and regions_blurred == 0)

    if pending:
        priv_path = f"{uid}/{uuid.uuid4().hex}_orig.jpg"
        try:
            supabase.storage.from_(PRIVATE_BUCKET).upload(
                priv_path,
                original,
                file_options={"content-type": file.content_type or "image/jpeg"},
            )
        except Exception as exc:
            logger.exception("private bucket upload failed: %s", exc)
            raise HTTPException(
                status_code=503,
                detail="Moderation storage unavailable. Configure private bucket incident_photo_originals.",
            ) from exc
        try:
            record = (
                supabase.table("incident_photos")
                .insert(
                    {
                        "user_id": uid,
                        "lat": lat,
                        "lng": lng,
                        "photo_url": None,
                        "thumbnail_url": None,
                        "category": ai_category,
                        "ai_category": ai_category,
                        "description": (description or "").strip() or ai_description,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "moderation_status": "pending_review",
                        "blur_applied": False,
                        "needs_admin_review": True,
                        "original_storage_path": priv_path,
                    }
                )
                .execute()
            )
            if not record.data:
                raise HTTPException(status_code=500, detail="Failed to save photo report")
            return {
                "success": True,
                "pending_review": True,
                "message": "Photo is queued for privacy review. It will appear on the map after moderation.",
                "report": record.data[0],
            }
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="DB insert failed")

    if needs_pii and regions_blurred > 0:
        public_bytes = blurred_jpeg
        blur_applied = True
    else:
        public_bytes = base_jpeg
        blur_applied = False

    file_path = f"{uid}/{uuid.uuid4().hex}.jpg"
    try:
        supabase.storage.from_(PUBLIC_BUCKET).upload(
            file_path,
            public_bytes,
            file_options={"content-type": "image/jpeg"},
        )
        photo_url = supabase.storage.from_(PUBLIC_BUCKET).get_public_url(file_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Storage upload failed")

    try:
        record = (
            supabase.table("incident_photos")
            .insert(
                {
                    "user_id": uid,
                    "lat": lat,
                    "lng": lng,
                    "photo_url": photo_url,
                    "thumbnail_url": photo_url,
                    "category": ai_category,
                    "ai_category": ai_category,
                    "description": (description or "").strip() or ai_description,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": _photo_expires_at(),
                    "moderation_status": "active",
                    "blur_applied": blur_applied,
                    "needs_admin_review": False,
                    "original_storage_path": None,
                }
            )
            .execute()
        )
        if not record.data:
            raise HTTPException(status_code=500, detail="Failed to save photo report")
        return {"success": True, "pending_review": False, "report": record.data[0]}
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
    """Active, non-expired photo reports only (blurred public URLs)."""
    supabase = get_supabase()
    lat_delta = radius / 69.0
    lng_delta = radius / (69.0 * 0.7)
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        q = (
            supabase.table("incident_photos")
            .select("id,lat,lng,category,ai_category,description,photo_url,thumbnail_url,created_at,upvotes")
            .gte("lat", lat - lat_delta)
            .lte("lat", lat + lat_delta)
            .gte("lng", lng - lng_delta)
            .lte("lng", lng + lng_delta)
            .gt("expires_at", now_iso)
            .or_("moderation_status.eq.active,moderation_status.is.null")
            .not_.is_("photo_url", "null")
            .gte("upvotes", 0)
            .limit(limit)
        )
        res = q.execute()
        photos = []
        for row in res.data or []:
            photos.append(
                {
                    "id": row.get("id"),
                    "lat": row.get("lat"),
                    "lng": row.get("lng"),
                    "type": row.get("category") or row.get("ai_category") or "photo",
                    "category": row.get("category"),
                    "description": row.get("description"),
                    "photo_url": row.get("photo_url") or row.get("thumbnail_url"),
                    "thumbnail_url": row.get("thumbnail_url") or row.get("photo_url"),
                    "created_at": row.get("created_at"),
                    "upvotes": row.get("upvotes", 0),
                }
            )
        return {"photos": photos}
    except Exception as e:
        logger.warning("photo-reports nearby query failed: %s", e)
        return {"photos": []}


def _is_photo_vote_dup(e: Exception) -> bool:
    s = str(e).lower()
    return "duplicate" in s or "unique" in s


@router.post("/{report_id}/upvote")
@limiter.limit("60/minute")
def upvote_report(request: Request, report_id: str, user: dict = Depends(get_current_user)):
    from services.reporter_rewards import award_reporter_on_peer_confirmation

    supabase = get_supabase()
    report_res = (
        supabase.table("incident_photos")
        .select("id,user_id,moderation_status,photo_url,upvotes")
        .eq("id", report_id)
        .limit(1)
        .execute()
    )
    report = report_res.data[0] if report_res.data else None
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    st = report.get("moderation_status")
    if st and st not in ("active", None):
        raise HTTPException(status_code=400, detail="Report is not visible")
    if not report.get("photo_url"):
        raise HTTPException(status_code=400, detail="Report is not visible")
    voter = str(user.get("id"))
    if str(report.get("user_id")) == voter:
        raise HTTPException(status_code=400, detail="Cannot upvote your own report")
    try:
        supabase.table("incident_photo_upvotes").insert(
            {"report_id": report_id, "user_id": user.get("id"), "vote": 1}
        ).execute()
    except Exception as e:
        if _is_photo_vote_dup(e):
            raise HTTPException(status_code=409, detail="Already voted") from e
        raise
    supabase.rpc("increment_upvotes", {"report_id": report_id}).execute()
    new_u = int(report.get("upvotes") or 0) + 1
    owner = str(report.get("user_id") or "")
    reward = award_reporter_on_peer_confirmation(owner_id=owner or None, voter_id=voter)
    out: dict = {"success": True, "upvotes": new_u}
    if reward.get("awarded"):
        out["reporter_reward"] = reward
    return out


@router.post("/{report_id}/downvote")
@limiter.limit("60/minute")
def downvote_report(request: Request, report_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    report_res = (
        supabase.table("incident_photos")
        .select("id,user_id,moderation_status,photo_url,upvotes,expires_at")
        .eq("id", report_id)
        .limit(1)
        .execute()
    )
    report = report_res.data[0] if report_res.data else None
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    st = report.get("moderation_status")
    if st and st not in ("active", None):
        raise HTTPException(status_code=400, detail="Report is not visible")
    if not report.get("photo_url"):
        raise HTTPException(status_code=400, detail="Report is not visible")
    voter = str(user.get("id"))
    if str(report.get("user_id")) == voter:
        raise HTTPException(status_code=400, detail="Cannot downvote your own report")
    try:
        supabase.table("incident_photo_upvotes").insert(
            {"report_id": report_id, "user_id": user.get("id"), "vote": -1}
        ).execute()
    except Exception as e:
        if _is_photo_vote_dup(e):
            raise HTTPException(status_code=409, detail="Already voted") from e
        raise
    new_net = int(report.get("upvotes") or 0) - 1
    now_iso = datetime.now(timezone.utc).isoformat()
    upd = {"upvotes": new_net}
    if new_net < 0:
        upd["expires_at"] = now_iso
    supabase.table("incident_photos").update(upd).eq("id", report_id).execute()
    return {"success": True, "upvotes": new_net, "removed": new_net < 0}
