from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from limiter import limiter
from middleware.auth import get_current_user_or_guest
from services.orion_elevenlabs import synthesize_orion_voice

router = APIRouter(prefix="/api/orion", tags=["Orion Voice"])

CurrentUserOrGuest = Annotated[dict, Depends(get_current_user_or_guest)]
VoiceChannel = Literal["orion", "navigation", "advisory"]


class OrionVoiceRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=900)
    channel: VoiceChannel = "orion"


@router.post("/voice/synthesize")
@limiter.limit("45/minute")
async def synthesize_voice(
    request: Request,
    payload: OrionVoiceRequest,
    _user: CurrentUserOrGuest,
) -> dict:
    return await synthesize_orion_voice(payload.text, payload.channel)
