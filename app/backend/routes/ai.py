import logging
import re

from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Depends
from starlette.requests import Request
from fastapi.responses import StreamingResponse
from models.schemas import OrionMessageRequest, OrionCompletionRequest, PhotoAnalysisRequest, ImageGenerateRequest
from middleware.auth import get_current_user, get_current_user_optional

from limiter import limiter
import uuid
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["AI"])

CurrentUser = Annotated[dict, Depends(get_current_user)]
OptionalUser = Annotated[Optional[dict], Depends(get_current_user_optional)]

ORION_DISABLED_DETAIL = "Orion coach is temporarily disabled."

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


def _app_control_actions_from_message(last_raw: str) -> List[dict]:
    """Small, safe app-control intents Orion can execute through the mobile action bridge."""
    text = _strip_orion_wake_phrase(last_raw).lower().strip()
    actions: List[dict] = []

    if re.search(r"\b(switch|change|set|use)\b.*\b(calm|adaptive|sport)\b.*\b(mode|driving mode)\b", text):
        for mode in ("calm", "adaptive", "sport"):
            if re.search(rf"\b{mode}\b", text):
                actions.append({"type": "mode", "name": mode})
                break
    elif re.search(r"\b(calm|adaptive|sport)\b\s+(mode|driving mode)\b", text):
        for mode in ("calm", "adaptive", "sport"):
            if re.search(rf"\b{mode}\b", text):
                actions.append({"type": "mode", "name": mode})
                break

    if re.search(r"\b(unmute|turn voice on|voice on|enable voice)\b", text):
        actions.append({"type": "unmute_voice"})
    elif re.search(r"\b(mute|turn voice off|voice off|disable voice)\b", text):
        actions.append({"type": "mute_voice"})

    return actions


_SUGGEST_INTENT_RE = re.compile(
    r"\b(suggest|recommend|recommendation|options|ideas|what should|where should|where can i|"
    r"good place|best place|somewhere to|any good|show me places|places to eat|place to eat|"
    r"where to eat|hungry|coffee|gas station|fuel up)\b",
    re.I,
)


def _nearby_type_from_message(low: str) -> str:
    if any(x in low for x in ("coffee", "cafe", "café", "espresso", "latte")):
        return "cafe"
    if any(x in low for x in ("gas", "fuel", "shell", "chevron", "exxon")) and "police" not in low:
        return "gas_station"
    if any(x in low for x in ("grocery", "supermarket", "kroger", "safeway", "trader")):
        return "supermarket"
    if "pharmacy" in low or "drugstore" in low or "cvs" in low or "walgreens" in low:
        return "pharmacy"
    if "parking" in low:
        return "parking"
    if any(x in low for x in ("restaurant", "food", "eat", "dinner", "lunch", "burger", "pizza", "sushi", "taco")):
        return "restaurant"
    return "restaurant"


async def _orion_place_suggestions(ctx: dict, user_text: str) -> List[dict]:
    """Real nearby POIs when the driver asks for ideas (used for chips + 'take me')."""
    low = user_text.lower().strip()
    if not _SUGGEST_INTENT_RE.search(low):
        return []
    olat, olng = ctx.get("lat"), ctx.get("lng")
    try:
        lat_f = float(olat) if olat is not None else None
        lng_f = float(olng) if olng is not None else None
    except (TypeError, ValueError):
        return []
    if lat_f is None or lng_f is None or (abs(lat_f) < 1e-5 and abs(lng_f) < 1e-5):
        return []

    try:
        from routes.places import fetch_nearby_places_list

        place_type = _nearby_type_from_message(low)
        radius = 12000 if place_type == "gas_station" else 8500
        raw = await fetch_nearby_places_list(
            lat_f, lng_f, radius=radius, place_type=place_type, limit=6,
        )
        out: List[dict] = []
        for row in raw:
            pid = row.get("place_id")
            la = row.get("lat")
            ln = row.get("lng")
            if la is None or ln is None:
                continue
            out.append({
                "name": row.get("name") or "Place",
                "address": row.get("address") or "",
                "lat": float(la),
                "lng": float(ln),
                **({"place_id": pid} if pid else {}),
            })
        return out
    except Exception as e:
        logger.warning("orion suggestions: %s", e)
        return []


_TAKE_ME_QUICK_RE = re.compile(
    r"^\s*(take me(\s+there)?|"
    r"start(\s+the)?\s+navigation|navigate(\s+there)?|"
    r"let\'?s go|drive there|go there)\s*[\.\!\?]*\s*$",
    re.I,
)


async def _take_me_from_pending(ctx: dict, last_raw: str) -> List[dict]:
    pending = ctx.get("pendingOrionSuggestions") or []
    if not isinstance(pending, list) or not pending:
        return []
    if not _TAKE_ME_QUICK_RE.match(last_raw.strip()):
        return []
    first = pending[0]
    if not isinstance(first, dict):
        return []
    la = first.get("lat")
    ln = first.get("lng")
    if la is None or ln is None:
        return []
    try:
        return [{
            "type": "navigate",
            "name": first.get("name") or "Destination",
            "lat": float(la),
            "lng": float(ln),
        }]
    except (TypeError, ValueError):
        return []


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
    user: OptionalUser,
):
    """Orion chat completions via backend NVIDIA_API_KEY or OPENAI_API_KEY (never in the frontend)."""
    from services.runtime_config import require_enabled

    require_enabled("orion_enabled", ORION_DISABLED_DETAIL)
    from services.orion_coach import orion_service
    messages = [{"role": m.role, "content": m.content} for m in body.messages]
    content = await orion_service.completion(messages, body.context)

    ctx = body.context or {}
    last_raw = body.messages[-1].content if body.messages else ""
    actions = await _navigation_actions_from_message(ctx, last_raw)
    actions.extend(_app_control_actions_from_message(last_raw))
    take_me = await _take_me_from_pending(ctx, last_raw)
    if take_me:
        actions = take_me + actions

    suggestions: List[Dict[str, Any]] = await _orion_place_suggestions(ctx, last_raw)
    # Avoid huge payloads
    suggestions = suggestions[:6]

    return {"content": content, "actions": actions, "suggestions": suggestions}


@router.post("/orion/completions/stream")
@limiter.limit("20/minute")
async def orion_completions_stream(
    request: Request,
    body: OrionCompletionRequest,
    user: OptionalUser,
):
    """Orion streaming completions; returns SSE in OpenAI-compatible format."""
    from services.runtime_config import require_enabled

    require_enabled("orion_enabled", ORION_DISABLED_DETAIL)
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
    from services.runtime_config import require_enabled

    require_enabled("orion_enabled", ORION_DISABLED_DETAIL)
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
