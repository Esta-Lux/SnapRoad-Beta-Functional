from fastapi import APIRouter, HTTPException
from models.schemas import OrionMessageRequest, PhotoAnalysisRequest
import uuid

router = APIRouter(prefix="/api", tags=["AI"])


@router.post("/orion/chat")
async def orion_chat(request: OrionMessageRequest):
    from services.orion_coach import orion_service
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:8]}"
    result = await orion_service.send_message(
        session_id=session_id,
        user_text=request.message,
        context=request.context,
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
