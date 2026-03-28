from fastapi import APIRouter, HTTPException
from starlette.requests import Request
from fastapi.responses import StreamingResponse
from models.schemas import OrionMessageRequest, OrionCompletionRequest, PhotoAnalysisRequest

from limiter import limiter
import uuid
import json

router = APIRouter(prefix="/api", tags=["AI"])


@router.post("/orion/completions")
async def orion_completions(request: OrionCompletionRequest):
    """Orion chat completions using backend OPENAI_API_KEY (no key in frontend)."""
    from services.orion_coach import orion_service
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    content = await orion_service.completion(messages, request.context)
    return {"content": content}


@router.post("/orion/completions/stream")
async def orion_completions_stream(request: OrionCompletionRequest):
    """Orion streaming completions; returns SSE in OpenAI-compatible format."""
    from services.orion_coach import orion_service

    async def generate():
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        async for chunk in orion_service.completion_stream(messages, request.context):
            # SSE line in same shape as OpenAI so frontend can reuse parsing
            payload = json.dumps({"choices": [{"delta": {"content": chunk}}]})
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/orion/chat")
@limiter.limit("20/minute")
async def orion_chat(request: Request, body: OrionMessageRequest):
    from services.orion_coach import orion_service
    session_id = body.session_id or f"session_{uuid.uuid4().hex[:8]}"
    result = await orion_service.send_message(
        session_id=session_id,
        user_text=body.message,
        context=body.context,
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "AI service error"))
    return result


@router.get("/orion/history/{session_id}")
async def get_orion_history(session_id: str):
    from services.orion_coach import orion_service
    history = orion_service.get_history(session_id)
    return {"success": True, "history": history, "count": len(history)}


@router.delete("/orion/session/{session_id}")
async def clear_orion_session(session_id: str):
    from services.orion_coach import orion_service
    success = orion_service.clear_session(session_id)
    return {"success": success}


@router.get("/orion/tips")
async def get_quick_tips():
    from services.orion_coach import orion_service
    return {"success": True, "tips": orion_service.get_quick_tips()}


@router.post("/photo/analyze")
async def analyze_photo(request: PhotoAnalysisRequest):
    from services.runtime_config import require_enabled

    require_enabled(
        "ai_photo_moderation_enabled",
        "AI photo moderation is temporarily disabled.",
    )
    from services.photo_analysis import photo_service
    result = await photo_service.analyze_image(
        image_base64=request.image_base64,
        image_type=request.image_type,
    )
    if result["success"] and result.get("needs_blur"):
        blur_regions = photo_service.generate_blur_mask(
            result["detections"], request.image_width, request.image_height
        )
        result["blur_regions"] = blur_regions
    return result
