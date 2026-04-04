import logging

from typing import Annotated, List

from fastapi import APIRouter, HTTPException, Depends
from starlette.requests import Request
from fastapi.responses import StreamingResponse
from models.schemas import OrionMessageRequest, OrionCompletionRequest, PhotoAnalysisRequest, ImageGenerateRequest
from middleware.auth import get_current_user

from limiter import limiter
import uuid
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["AI"])

CurrentUser = Annotated[dict, Depends(get_current_user)]

_NAV_CHAT_PREFIXES = (
    "start navigation to ",
    "navigation to ",
    "start route to ",
    "set navigation to ",
    "directions to ",
    "navigate to ",
    "drive to ",
    "go to ",
    "take me to ",
    "navigate ",
    "take me ",
)


def _strip_orion_wake_phrase(raw: str) -> str:
    s = raw.strip()
    low = s.lower()
    for pref in ("hey orion, ", "hey orion ", "orion, ", "orion "):
        if low.startswith(pref):
            return s[len(pref) :].lstrip()
    return s


async def _navigation_actions_from_message(ctx: dict, last_raw: str) -> List[dict]:
    """Parse user text for navigate / add_stop intents (Orion chat → Map actions)."""
    actions: list = []
    last_raw = _strip_orion_wake_phrase(last_raw)
    last_msg = last_raw.lower()
    nearby_offers = ctx.get("nearbyOffers") or []

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
        return actions

    query = None
    for pref in sorted(_NAV_CHAT_PREFIXES, key=len, reverse=True):
        if pref in last_msg:
            q = last_raw[last_msg.index(pref) + len(pref) :].strip()
            if q.lower() in ("there", ""):
                continue
            if len(q) >= 2:
                query = q
                break

    if query:
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

    if not actions and ("add a stop" in last_msg or "stop at" in last_msg) and nearby_offers:
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

    return actions


@router.post("/ai/generate-image")
@limiter.limit("10/minute")
async def generate_image_compat(request: Request, body: ImageGenerateRequest, _user: CurrentUser):
    """Authenticated alias for `/api/images/generate` (partner tools)."""
    import asyncio
    from services.image_generation import generate_promo_image_url

    _ = request
    result = await asyncio.to_thread(generate_promo_image_url, body.prompt, body.offer_type)
    if not result.get("success"):
        return {"success": False, "message": result.get("message", "Image generation failed.")}
    return {"success": True, "image_url": result["image_url"]}


@router.post("/orion/completions")
@limiter.limit("20/minute")
async def orion_completions(
    request: Request,
    body: OrionCompletionRequest,
    user: CurrentUser,
):
    """Orion chat completions via backend NVIDIA_API_KEY or OPENAI_API_KEY (never in the frontend)."""
    from services.orion_coach import orion_service
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    content = await orion_service.completion(messages, body.context)

    ctx = body.context or {}
    last_raw = body.messages[-1].content if body.messages else ""
    actions = await _navigation_actions_from_message(ctx, last_raw)

    return {"content": content, "actions": actions}


@router.post("/orion/completions/stream")
@limiter.limit("20/minute")
async def orion_completions_stream(
    request: Request,
    body: OrionCompletionRequest,
    user: CurrentUser,
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


@router.post(
    "/orion/chat",
    responses={500: {"description": "AI service error"}},
)
@limiter.limit("20/minute")
async def orion_chat(request: Request, body: OrionMessageRequest, user: CurrentUser):
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
async def get_orion_history(session_id: str, user: CurrentUser):
    from services.orion_coach import orion_service
    history = orion_service.get_history(session_id)
    return {"success": True, "history": history, "count": len(history)}


@router.delete("/orion/session/{session_id}")
async def clear_orion_session(session_id: str, _user: CurrentUser):
    from services.orion_coach import orion_service
    success = orion_service.clear_session(session_id)
    return {"success": success}


@router.get("/orion/tips")
async def get_quick_tips(_user: CurrentUser):
    from services.orion_coach import orion_service
    return {"success": True, "tips": orion_service.get_quick_tips()}


@router.post("/photo/analyze")
@limiter.limit("10/minute")
async def analyze_photo(request: Request, body: PhotoAnalysisRequest, _user: CurrentUser):
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
