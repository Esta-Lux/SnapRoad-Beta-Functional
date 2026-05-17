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
    ORION_ELEVENLABS_VOICE_NAME,
)

logger = logging.getLogger(__name__)

OrionVoiceChannel = Literal["orion", "navigation", "advisory"]

MAX_TTS_CHARS = 900
REQUEST_TIMEOUT_SECONDS = 20.0
DEFAULT_ORION_FALLBACK_VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17"  # Roger - laid-back, casual, resonant male voice.

_resolved_voice_id_cache: str | None = None


def elevenlabs_configured() -> bool:
    return bool(ELEVENLABS_API_KEY and (ORION_ELEVENLABS_VOICE_ID or ORION_ELEVENLABS_VOICE_NAME))


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


async def _resolve_orion_voice_id(client: httpx.AsyncClient) -> str:
    global _resolved_voice_id_cache
    explicit = (ORION_ELEVENLABS_VOICE_ID or "").strip()
    if explicit:
        return explicit
    if _resolved_voice_id_cache:
        return _resolved_voice_id_cache

    target_name = (ORION_ELEVENLABS_VOICE_NAME or "Orion").strip().casefold()
    if target_name:
        try:
            resp = await client.get(
                f"{ELEVENLABS_API_BASE}/voices",
                headers={"xi-api-key": ELEVENLABS_API_KEY, "accept": "application/json"},
            )
            resp.raise_for_status()
            body = resp.json()
            voices = body.get("voices") if isinstance(body, dict) else None
            if isinstance(voices, list):
                for raw in voices:
                    if not isinstance(raw, dict):
                        continue
                    name = str(raw.get("name") or "").strip().casefold()
                    voice_id = str(raw.get("voice_id") or "").strip()
                    if name == target_name and voice_id:
                        _resolved_voice_id_cache = voice_id
                        return voice_id
        except Exception as exc:
            logger.warning("ElevenLabs voice lookup failed: %s", _sanitize_elevenlabs_error(exc))

    _resolved_voice_id_cache = DEFAULT_ORION_FALLBACK_VOICE_ID
    return _resolved_voice_id_cache


async def synthesize_orion_voice(text: str, channel: OrionVoiceChannel = "orion") -> dict:
    clean = _clean_text(text)
    if not clean:
        return {"success": False, "error": "Missing text"}
    if not elevenlabs_configured():
        return {"success": False, "error": "ElevenLabs is not configured"}

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
            voice_id = await _resolve_orion_voice_id(client)
            url = f"{ELEVENLABS_API_BASE}/text-to-speech/{voice_id}"
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
            "voice_id": voice_id,
            "model_id": ELEVENLABS_MODEL_ID,
        }
    except Exception as exc:
        safe = _sanitize_elevenlabs_error(exc)
        logger.warning("ElevenLabs Orion TTS failed: %s", safe)
        return {"success": False, "error": "ElevenLabs voice synthesis failed"}
