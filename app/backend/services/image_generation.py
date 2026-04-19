"""Partner promo image generation (server-side only)."""
from __future__ import annotations

import logging
import os
from typing import Optional

from config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

_MSG_TRY_AGAIN = "We couldn't generate that image. Please try again or upload your own."
_MSG_UNAVAILABLE = "Image generation is temporarily unavailable."


def generate_promo_image_url(prompt: str, offer_type: Optional[str] = None) -> dict:
    """
    Returns {"success": bool, "image_url": str} or {"success": False, "message": str}.
    User-visible messages only — no stack traces or provider details.
    """
    _ = offer_type
    key = (OPENAI_API_KEY or "").strip()
    if not key:
        return {"success": False, "message": _MSG_UNAVAILABLE}

    p = (prompt or "").strip()
    if not p:
        return {"success": False, "message": "Please enter a description for your image."}
    if len(p) > 4000:
        p = p[:4000]

    model = (os.environ.get("OPENAI_IMAGE_MODEL") or "dall-e-3").strip()
    try:
        from openai import OpenAI

        client = OpenAI(api_key=key)
        resp = client.images.generate(model=model, prompt=p, size="1024x1024", quality="standard", n=1)
        url = (resp.data[0].url or "").strip() if resp.data else ""
        if not url:
            return {"success": False, "message": _MSG_TRY_AGAIN}
        return {"success": True, "image_url": url}
    except Exception:
        logger.exception("OpenAI image generation failed")
        return {"success": False, "message": _MSG_TRY_AGAIN}
