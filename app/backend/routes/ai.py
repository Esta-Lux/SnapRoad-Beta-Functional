import logging

from fastapi import APIRouter, HTTPException, Depends
from starlette.requests import Request
from fastapi.responses import StreamingResponse
from models.schemas import OrionMessageRequest, OrionCompletionRequest, PhotoAnalysisRequest
from middleware.auth import get_current_user

from limiter import limiter
import uuid
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["AI"])


@router.post("/orion/completions")
@limiter.limit("20/minute")
async def orion_completions(
    request: Request,
    body: OrionCompletionRequest,
    user: dict = Depends(get_current_user),
):
    """Orion chat completions via backend NVIDIA_API_KEY or OPENAI_API_KEY (never in the frontend)."""
    from services.orion_coach import orion_service
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    content = await orion_service.completion(messages, body.context)

    actions: list = []
    ctx = body.context or {}
    nearby_offers = ctx.get("nearbyOffers") or []
    last_raw = body.messages[-1].content if body.messages else ""
    last_msg = last_raw.lower()

    # "Take me there" → first nearby offer / POI (navigation, not only add_stop)
    if "take me there" in last_msg or last_msg.strip() == "take me there":
        if nearby_offers:
            best = nearby_offers[0]
            la = best.get("lat") or best.get("latitude")
            ln = best.get("lng") or best.get("longitude")
            if la is not None and ln is not None:
                actions.append({
                    "type": "navigate",
                    "name": best.get("title") or best.get("partner_name") or "Destination",
                    "lat": float(la),
                    "lng": float(ln),
                })

    if not actions:
        navigate_prefixes = (
            "take me to ",
            "navigate to ",
            "go to ",
            "drive to ",
            "directions to ",
            "start navigation to ",
        )
        query = None
        for pref in navigate_prefixes:
            if pref in last_msg:
                query = last_raw[last_msg.index(pref) + len(pref) :].strip()
                break
        if query and len(query) >= 2:
            try:
                from routes.places import fetch_autocomplete_predictions, fetch_place_coords_for_orion

                olat = ctx.get("lat")
                olng = ctx.get("lng")
                lat_f = float(olat) if olat is not None else None
                lng_f = float(olng) if olng is not None else None
                preds = await fetch_autocomplete_predictions(query[:120], lat_f, lng_f)
                if preds:
                    pid = preds[0].get("place_id")
                    if pid:
                        det = await fetch_place_coords_for_orion(pid)
                        if det and det.get("lat") is not None and det.get("lng") is not None:
                            actions.append({
                                "type": "navigate",
                                "name": det.get("name") or preds[0].get("name") or query[:80],
                                "lat": float(det["lat"]),
                                "lng": float(det["lng"]),
                            })
            except Exception as e:
                logger.warning("failed to resolve navigation destination: %s", e)

    if not actions:
        if ("add a stop" in last_msg or "stop at" in last_msg) and nearby_offers:
            best = nearby_offers[0]
            la = best.get("lat") or best.get("latitude")
            ln = best.get("lng") or best.get("longitude")
            if la is not None and ln is not None:
                actions.append({
                    "type": "add_stop",
                    "name": best.get("partner_name") or best.get("title", "Offer"),
                    "lat": float(la),
                    "lng": float(ln),
                    "offer_id": best.get("id"),
                })

    return {"content": content, "actions": actions}


@router.post("/orion/completions/stream")
@limiter.limit("20/minute")
async def orion_completions_stream(
    request: Request,
    body: OrionCompletionRequest,
    user: dict = Depends(get_current_user),
):
    """Orion streaming completions; returns SSE in OpenAI-compatible format."""
    from services.orion_coach import orion_service

    async def generate():
        messages = [{"role": m.role, "content": m.content} for m in body.messages]
        async for chunk in orion_service.completion_stream(messages, body.context):
            payload = json.dumps({"choices": [{"delta": {"content": chunk}}]})
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/orion/chat")
@limiter.limit("20/minute")
async def orion_chat(request: Request, body: OrionMessageRequest, user: dict = Depends(get_current_user)):
    from services.orion_coach import orion_service
    session_id = body.session_id or f"session_{user.get('id', 'anon')}_{uuid.uuid4().hex[:8]}"
    result = await orion_service.send_message(
        session_id=session_id,
        user_text=body.message,
        context=body.context,
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "AI service error"))
    return result


@router.get("/orion/history/{session_id}")
async def get_orion_history(session_id: str, user: dict = Depends(get_current_user)):
    from services.orion_coach import orion_service
    history = orion_service.get_history(session_id)
    return {"success": True, "history": history, "count": len(history)}


@router.delete("/orion/session/{session_id}")
async def clear_orion_session(session_id: str, user: dict = Depends(get_current_user)):
    from services.orion_coach import orion_service
    success = orion_service.clear_session(session_id)
    return {"success": success}


@router.get("/orion/tips")
async def get_quick_tips(user: dict = Depends(get_current_user)):
    from services.orion_coach import orion_service
    return {"success": True, "tips": orion_service.get_quick_tips()}


@router.post("/photo/analyze")
@limiter.limit("10/minute")
async def analyze_photo(request: Request, body: PhotoAnalysisRequest, user: dict = Depends(get_current_user)):
    from services.runtime_config import require_enabled

    require_enabled(
        "ai_photo_moderation_enabled",
        "AI photo moderation is temporarily disabled.",
    )
    from services.photo_analysis import photo_service
    result = await photo_service.analyze_image(
        image_base64=body.image_base64,
        image_type=body.image_type,
    )
    if result["success"] and result.get("needs_blur"):
        blur_regions = photo_service.generate_blur_mask(
            result["detections"], body.image_width, body.image_height
        )
        result["blur_regions"] = blur_regions
    return result
