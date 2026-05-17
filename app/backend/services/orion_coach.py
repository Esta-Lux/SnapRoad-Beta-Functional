# SnapRoad - Orion AI Coach Service (Portable)
# AI-powered driving assistant via OpenAI SDK (OpenAI primary, NVIDIA fallback).

import re
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

from dotenv import load_dotenv

from services.llm_client import (
    chat_completions_create_with_fallback,
    chat_completion_stream_chunks_with_fallback,
    is_llm_configured,
    nvidia_api_key,
    openai_api_key,
)

load_dotenv()


def _sanitize_openai_error(err: Exception) -> str:
    """Redact API keys and return a safe user-facing message."""
    msg = str(err).strip()
    msg = re.sub(r"sk-[A-Za-z0-9_-]{20,}", "sk-***REDACTED***", msg)
    msg = re.sub(r"nvapi-[A-Za-z0-9_-]{20,}", "nvapi-***REDACTED***", msg)
    if not msg or len(msg) > 120:
        msg = msg[:120] + "..." if len(msg) > 120 else msg or "Unknown error"
    return msg


def _fmt_num(v: Any) -> str:
    if v is None:
        return "—"
    if isinstance(v, (int, float)):
        if isinstance(v, float) and v.is_integer():
            return str(int(v))
        return str(int(v)) if isinstance(v, float) and v == int(v) else str(v)
    return str(v)


def build_orion_system_prompt(ctx: Optional[Dict[str, Any]] = None) -> str:
    """Rich system prompt from mobile `context` + SnapRoad product knowledge."""
    c = ctx or {}
    hour = datetime.now().hour
    greeting = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"
    current_route = c.get("currentRoute") or {}

    route_block = ""
    if current_route:
        dest = current_route.get("destination", "")
        dist = current_route.get("distanceMiles")
        dist_str = f"{dist:.1f}" if isinstance(dist, (int, float)) else "0"
        mins = current_route.get("remainingMinutes", 0)
        route_block = f"""
- Destination: {dest}
- Distance remaining: {dist_str} miles
- Time remaining: {mins} minutes
- Current instruction: {current_route.get('currentStep', '')}
- Next instruction: {current_route.get('nextStep', '')}
"""

    nearby_offers = c.get("nearbyOffers") or []
    offers_block = ""
    if nearby_offers:
        parts = [f"{o.get('title', '')} ({o.get('distance', '')})" for o in nearby_offers]
        offers_block = f"\n- Nearby offers: {', '.join(parts)}\n"

    # Profile / gamification (passed from app)
    trips = c.get("totalTrips")
    miles = c.get("totalMiles")
    gems = c.get("gems")
    level = c.get("level")
    safety = c.get("safetyScore")
    snap_score = c.get("snapRoadScore")
    snap_tier = c.get("snapRoadTier")
    premium = c.get("isPremium")
    weekly_trips = c.get("weeklyTripCount")
    weekly_miles = c.get("weeklyMiles")
    weekly_summary = c.get("weeklySummary")  # optional free-text from Insights
    favorite_hint = c.get("favoritePlacesSummary")  # short string
    quick_routes_hint = c.get("quickRoutesSummary")

    profile_lines = [
        f"- Total trips (lifetime): {_fmt_num(trips)}",
        f"- Total miles (lifetime): {_fmt_num(miles)}",
        f"- Gems balance: {_fmt_num(gems)}",
        f"- Driver level: {_fmt_num(level)}",
        f"- Safety score (app): {_fmt_num(safety)}",
    ]
    if snap_score is not None:
        profile_lines.append(f"- SnapRoad score: {_fmt_num(snap_score)} ({snap_tier or 'tier n/a'})")
    if weekly_trips is not None or weekly_miles is not None:
        profile_lines.append(
            f"- This week (if provided): {_fmt_num(weekly_trips)} trips, {_fmt_num(weekly_miles)} mi"
        )
    if weekly_summary:
        profile_lines.append(f"- Weekly recap note: {weekly_summary}")
    if favorite_hint:
        profile_lines.append(f"- Saved favorites (summary): {favorite_hint}")
    if quick_routes_hint:
        profile_lines.append(f"- Quick routes (home/work shortcuts): {quick_routes_hint}")
    profile_lines.append(f"- Premium subscriber: {'yes' if premium else 'no'}")
    profile_block = "\n".join(profile_lines)

    return f"""You are Orion, the AI navigator and personal assistant for SnapRoad — a privacy-first navigation app that rewards drivers for safe driving.

## Your personality:
- Warm, confident, helpful — like a knowledgeable friend in the passenger seat
- Premium SnapRoad energy: polished, a little sassy, never rude, never unsafe
- Use light dad jokes and playful one-liners sparingly. Keep them clean, family-safe, and never about protected traits, body image, politics, crashes, police, tragedy, violence, or risky driving.
- Think of yourself as the face and voice of SnapRoad: useful first, memorable second.
- Brief during active navigation; richer detail when the driver is parked or chatting
- Safety first — never encourage distracted driving
- All answers about SnapRoad, this driver, trips, scores, gems, and routes must be grounded in the **Driver profile** and **Current context** below. If a stat is missing, say you do not see it in this session and suggest opening **Profile → Insights & Recap** or the relevant tab.

## SnapRoad product facts (for general questions):
- Gems reward safe miles, hazard reports, challenges, and partner offers
- Premium: 2× gem multiplier, deeper analytics, traffic cameras layer, more place alerts, and richer Orion context when available
- Features: turn-by-turn nav, offers, road reports, live friend locations (Premium), fuel tracker, driving score, weekly recap, badges, place alerts, quick routes, favorites
- Privacy: encrypted location; data is not sold

## What Orion can do inside the app:
- Answer premium-level SnapRoad questions using the live context below.
- Find nearby places for food, coffee, gas, groceries, pharmacy, and parking.
- Start a route when the driver says “take me to …” or “take me” after suggestions.
- Add a suggested stop when the user asks for a stop and the app has a nearby offer/place.
- Switch driving mode between Calm, Adaptive, and Sport.
- Mute or unmute SnapRoad voice guidance.
- If a requested action is not supported by the action bridge yet, say what you can do instead.

## Driver profile (from the app — treat as source of truth for this user):
{profile_block}

## Current driver context:
- Driver name: {c.get('userName') or 'there'}
- Good {greeting}!
- Current location label: {c.get('currentAddress') or 'unknown'}
- Coarse position: lat/lng omitted for brevity (navigation uses live GPS)
- Navigating now: {'YES' if c.get('isNavigating') else 'No'}
- Driving mode: {c.get('drivingMode') or 'adaptive'}
- Active destination name: {c.get('destination') or 'none'}
{route_block}
- Speed (if provided): {c.get('speedMph') or c.get('speed') or 0} mph
{offers_block}

## Improvement & coaching requests:
- When the driver asks how to improve, give 3–5 **specific** tips tied to SnapRoad: smooth braking/accel, consistent speed, streaks, completing trips cleanly, hazard reports, checking Insights & Recap, optional Premium perks. Mention gems and safety score when relevant.

## Navigation voice rules:
- Turn guidance and HUD replies should sound calm, short, and easy to understand.
- During active navigation, the maneuver comes first. If adding personality, add one short safe tag after the instruction only when it will not distract.
- Good examples: “Nice and easy.” “Clean turn, captain.” “We love a responsible lane choice.” “Tiny road win.”
- Bad examples: insults, panic, guilt, profanity, edgy jokes, anything that could make the driver rush.
- If the user asks to navigate somewhere in chat, the app may parse intents separately — still confirm briefly what you understood.

## Local place suggestions:
- When the driver asks for ideas (food, coffee, gas, etc.), the app may attach real nearby options. Summarize them in a friendly numbered list with **names only** (one short line each), tied to their area (`currentAddress` when you know it) and favorite hints when relevant.
- Say they can **tap a suggestion chip** to preview the route, or say **“take me”** to start navigation to the first option.

## Conversation rules:
- During navigation: keep casual replies under ~20 words unless they asked a real question
- When not navigating, you may be more expressive: one useful answer, one playful line max.
- Off-topic: one short helpful line then gently steer back to driving or SnapRoad if appropriate

Respond naturally as Orion."""


ORION_SYSTEM_PROMPT = """You are Orion, SnapRoad's AI driving coach. Friendly, concise, safety-first."""


class OrionCoachService:
    """Orion coach — OpenAI first, NVIDIA fallback when both are configured."""

    def __init__(self):
        self.sessions: dict = {}

    def _get_or_create_session(self, session_id: str) -> dict:
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "messages": [{"role": "system", "content": ORION_SYSTEM_PROMPT}],
                "history": [],
                "created_at": datetime.now(),
            }
        return self.sessions[session_id]

    async def send_message(self, session_id: str, user_text: str, context: Optional[dict] = None) -> dict:
        """Session-based Orion chat (legacy) — uses same LLM fallback as completions."""
        try:
            session = self._get_or_create_session(session_id)
            session["messages"][0] = {"role": "system", "content": build_orion_system_prompt(context)}
            enhanced_text = user_text
            if context:
                context_parts = []
                if context.get("safety_score"):
                    context_parts.append(f"User's current safety score: {context['safety_score']}")
                if context.get("gems"):
                    context_parts.append(f"User's gem balance: {context['gems']}")
                if context.get("current_speed"):
                    context_parts.append(f"Current speed: {context['current_speed']} mph")
                if context.get("weather"):
                    context_parts.append(f"Weather: {context['weather']}")
                if context_parts:
                    enhanced_text = f"{user_text}\n\n[Context: {', '.join(context_parts)}]"

            session["messages"].append({"role": "user", "content": enhanced_text})

            response = await chat_completions_create_with_fallback(
                messages=session["messages"],
                max_tokens=300,
                temperature=0.7,
                stream=False,
            )
            assistant_message = response.choices[0].message.content or ""

            session["messages"].append({"role": "assistant", "content": assistant_message})
            session["history"].append({"role": "user", "content": user_text, "timestamp": datetime.now().isoformat()})
            session["history"].append(
                {"role": "assistant", "content": assistant_message, "timestamp": datetime.now().isoformat()}
            )

            return {"success": True, "response": assistant_message, "session_id": session_id}
        except Exception as e:
            return {"success": False, "error": str(e), "session_id": session_id}

    def get_history(self, session_id: str) -> List[dict]:
        if session_id in self.sessions:
            return self.sessions[session_id]["history"]
        return []

    def clear_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def get_quick_tips(self) -> List[dict]:
        return [
            {"id": "fuel", "text": "How do I save fuel?", "icon": "fuel"},
            {"id": "safety", "text": "Improve my safety score", "icon": "shield"},
            {"id": "weather", "text": "Driving in rain tips", "icon": "cloud"},
            {"id": "gems", "text": "How to earn more gems?", "icon": "gem"},
            {"id": "night", "text": "Night driving tips", "icon": "moon"},
            {"id": "highway", "text": "Highway safety tips", "icon": "road"},
        ]

    def _config_message(self) -> str:
        if not is_llm_configured():
            return "I'm not configured yet — add OPENAI_API_KEY and/or NVIDIA_API_KEY to the backend .env to enable Orion."
        return ""

    async def completion(self, messages: List[Dict[str, str]], context: Optional[Dict[str, Any]] = None) -> str:
        if not is_llm_configured():
            return self._config_message()
        try:
            system_content = build_orion_system_prompt(context)
            full_messages: List[Dict[str, str]] = [{"role": "system", "content": system_content}]
            for m in messages:
                full_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
            max_tokens = 60 if (context or {}).get("isNavigating") else 500
            response = await chat_completions_create_with_fallback(
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=0.7,
                stream=False,
            )
            text = (response.choices[0].message.content or "").strip()
            return text or "Sorry, I had trouble with that."
        except Exception as e:
            err_lower = str(e).lower()
            if "401" in err_lower or "incorrect api key" in err_lower or "invalid_api_key" in err_lower or "authentication" in err_lower:
                parts = []
                if openai_api_key():
                    parts.append("OpenAI key")
                if nvidia_api_key():
                    parts.append("NVIDIA key")
                return "Orion couldn't authenticate with the AI provider. Check " + " and ".join(parts) + " in the backend .env."
            return f"Sorry, I had a hiccup. Try again! ({_sanitize_openai_error(e)})"

    async def completion_stream(
        self, messages: List[Dict[str, str]], context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        if not is_llm_configured():
            yield self._config_message()
            return
        try:
            system_content = build_orion_system_prompt(context)
            full_messages: List[Dict[str, str]] = [{"role": "system", "content": system_content}]
            for m in messages:
                full_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
            async for chunk in chat_completion_stream_chunks_with_fallback(
                messages=full_messages,
                max_tokens=500,
                temperature=0.7,
            ):
                if chunk:
                    yield chunk
        except Exception as e:
            err_lower = str(e).lower()
            if "401" in err_lower or "incorrect api key" in err_lower:
                yield "Orion couldn't connect. Check OPENAI_API_KEY and NVIDIA_API_KEY in the backend .env."
            else:
                yield f"Sorry, I had a hiccup. ({_sanitize_openai_error(e)})"


orion_service = OrionCoachService()
