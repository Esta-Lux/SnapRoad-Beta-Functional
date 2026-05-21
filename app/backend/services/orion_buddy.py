"""Orion proactive buddy-line generation (ChatGPT primary, NVIDIA fallback)."""

from __future__ import annotations

import logging
from typing import Any, Optional

from services.llm_client import chat_completions_create_with_fallback, is_llm_configured

logger = logging.getLogger(__name__)

_EVENT_HINTS: dict[str, str] = {
    "drive_started": "Trip just started — one warm opening line.",
    "smooth_drive": "Cruise is smooth — light encouragement or witty aside.",
    "heavy_traffic": "Traffic is heavy — stay calm, no panic.",
    "reroute": "Route changed — brief reassurance.",
    "long_drive": "Long drive check-in — gentle stamina note.",
    "reward_earned": "Driver earned gems — celebrate briefly.",
    "arrival": "Arrived at destination — short wrap-up.",
    "safety_caution": "Safety moment — supportive, zero jokes.",
    "idle_checkin": "Idle check-in — friendly ping.",
}


def _orion_prefs_block(prefs: dict[str, Any]) -> str:
    if not prefs:
        return ""
    mood = prefs.get("mood") or prefs.get("preferred_mood") or "auto"
    chattiness = prefs.get("chattiness") or "balanced"
    return (
        f"User Orion preferences: mood={mood}, chattiness={chattiness}. "
        "Honor mood (witty/sassy = playful but safe; calm/quiet = minimal words; "
        "focused = direct; hype = energetic). "
        "Minimal chattiness = ultra short; chatty = still under max words."
    )


def _context_block(ctx: dict[str, Any]) -> str:
    parts = []
    if ctx.get("destination"):
        parts.append(f"destination={ctx['destination']}")
    if ctx.get("userName"):
        parts.append(f"driver={ctx['userName']}")
    if ctx.get("drivingMode"):
        parts.append(f"driving_mode={ctx['drivingMode']}")
    if ctx.get("trafficLevel"):
        parts.append(f"traffic={ctx['trafficLevel']}")
    if ctx.get("etaMinutes") is not None:
        parts.append(f"eta_min={ctx['etaMinutes']}")
    if ctx.get("gemsEarnedThisTrip") is not None:
        parts.append(f"trip_gems={ctx['gemsEarnedThisTrip']}")
    return ", ".join(parts)


async def generate_buddy_line(
    *,
    event_type: str,
    context: Optional[dict[str, Any]] = None,
    mood: Optional[str] = None,
    orion_prefs: Optional[dict[str, Any]] = None,
    max_words: int = 16,
) -> Optional[str]:
    """Return one short spoken buddy line, or None when LLM unavailable."""
    if not is_llm_configured():
        return None

    ctx = context or {}
    prefs = orion_prefs or {}
    if prefs.get("auto_buddy") is False:
        return None
    if prefs.get("use_llm_buddy") is False:
        return None

    event = (event_type or "smooth_drive").strip().lower()
    hint = _EVENT_HINTS.get(event, "Driving companion moment.")
    mood_s = (mood or prefs.get("mood") or "calm").strip().lower()
    if mood_s == "auto":
        mood_s = "adaptive"

    from services.orion_knowledge import format_knowledge_for_prompt, retrieve_orion_knowledge

    kb_query = f"{event} {ctx.get('destination', '')} gems premium offers safety"
    kb_block = format_knowledge_for_prompt(
        retrieve_orion_knowledge(kb_query, categories=["safety", "product"], limit=2)
    )

    system = (
        "You are Orion, SnapRoad's in-car road buddy. Output ONE spoken sentence only. "
        f"Hard limit: {max(8, min(max_words, 24))} words. No quotes, emojis, or markdown. "
        "Safety first; never encourage risky driving. Maneuver/voice instructions are handled elsewhere."
    )
    user = "\n".join(
        [
            f"Event: {event}. {hint}",
            f"Mood: {mood_s}.",
            _orion_prefs_block(prefs),
            f"Live context: {_context_block(ctx) or 'n/a'}.",
            kb_block,
            "Reply with the single line only.",
        ]
    ).strip()

    try:
        response = await chat_completions_create_with_fallback(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=60,
            temperature=0.85,
            stream=False,
        )
        text = (response.choices[0].message.content or "").strip()
        if not text:
            return None
        words = text.split()
        if len(words) > max_words:
            text = " ".join(words[:max_words])
        return text
    except Exception as exc:
        logger.debug("buddy line generation failed: %s", exc)
        return None


__all__ = ["generate_buddy_line"]
