import base64
import logging
import re
from typing import Literal

import httpx

from config import (
    ELEVENLABS_API_BASE,
    ELEVENLABS_API_KEY,
    ELEVENLABS_MODEL_ID,
    ORION_ELEVENLABS_OUTPUT_FORMAT,
    ORION_ELEVENLABS_VOICE_ID,
)

logger = logging.getLogger(__name__)

OrionVoiceChannel = Literal["orion", "navigation", "advisory"]

MAX_TTS_CHARS = 900
REQUEST_TIMEOUT_SECONDS = 20.0


def elevenlabs_configured() -> bool:
    return bool(ELEVENLABS_API_KEY and ORION_ELEVENLABS_VOICE_ID)


def _sanitize_elevenlabs_error(err: Exception) -> str:
    msg = str(err).strip()
    msg = re.sub(r"sk_[A-Za-z0-9_-]{20,}", "sk_***REDACTED***", msg)
    if len(msg) > 140:
        return f"{msg[:140]}..."
    return msg or "Unknown ElevenLabs error"


def _voice_settings(channel: OrionVoiceChannel) -> dict:
    if channel == "navigation":
        return {
            "stability": 0.78,
            "similarity_boost": 0.76,
            "style": 0.18,
            "use_speaker_boost": True,
        }
    if channel == "advisory":
        return {
            "stability": 0.7,
            "similarity_boost": 0.76,
            "style": 0.25,
            "use_speaker_boost": True,
        }
    return {
        "stability": 0.64,
        "similarity_boost": 0.78,
        "style": 0.38,
        "use_speaker_boost": True,
    }


def _clean_text(text: str) -> str:
    compact = re.sub(r"\s+", " ", (text or "").strip())
    return compact[:MAX_TTS_CHARS]


async def synthesize_orion_voice(text: str, channel: OrionVoiceChannel = "orion") -> dict:
    clean = _clean_text(text)
    if not clean:
        return {"success": False, "error": "Missing text"}
    if not elevenlabs_configured():
        return {"success": False, "error": "ElevenLabs is not configured"}

    url = f"{ELEVENLABS_API_BASE}/text-to-speech/{ORION_ELEVENLABS_VOICE_ID}"
    params = {"output_format": ORION_ELEVENLABS_OUTPUT_FORMAT}
    payload = {
        "text": clean,
        "model_id": ELEVENLABS_MODEL_ID,
        "voice_settings": _voice_settings(channel),
    }
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "accept": "audio/mpeg",
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, params=params, json=payload, headers=headers)
        resp.raise_for_status()
        audio = resp.content
        if not audio:
            return {"success": False, "error": "ElevenLabs returned empty audio"}
        return {
            "success": True,
            "audio_base64": base64.b64encode(audio).decode("ascii"),
            "mime_type": "audio/mpeg",
            "provider": "elevenlabs",
            "voice_id": ORION_ELEVENLABS_VOICE_ID,
            "model_id": ELEVENLABS_MODEL_ID,
        }
    except Exception as exc:
        safe = _sanitize_elevenlabs_error(exc)
        logger.warning("ElevenLabs Orion TTS failed: %s", safe)
        return {"success": False, "error": "ElevenLabs voice synthesis failed"}
