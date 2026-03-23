# SnapRoad - Orion AI Coach Service (Portable)
# AI-powered driving assistant using OpenAI SDK directly
# No platform-specific dependencies - works anywhere

import os
import re
from datetime import datetime
from typing import Optional, List, Dict, Any, AsyncGenerator
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()


def _sanitize_openai_error(err: Exception) -> str:
    """Redact API keys and return a safe user-facing message."""
    msg = str(err).strip()
    # Redact any sk-... key material
    msg = re.sub(r"sk-[A-Za-z0-9_-]{20,}", "sk-***REDACTED***", msg)
    if not msg or len(msg) > 120:
        msg = msg[:120] + "..." if len(msg) > 120 else msg or "Unknown error"
    return msg


def build_orion_system_prompt(ctx: Optional[Dict[str, Any]] = None) -> str:
    """Build the same system prompt as frontend orion.ts from OrionContext."""
    c = ctx or {}
    hour = datetime.now().hour
    greeting = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"
    current_route = c.get("currentRoute") or {}
    nearby_offers = c.get("nearbyOffers") or []

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
    offers_block = ""
    if nearby_offers:
        parts = [f"{o.get('title', '')} ({o.get('distance', '')})" for o in nearby_offers]
        offers_block = f"\n- Nearby offers: {', '.join(parts)}\n"

    return f"""You are Orion, the AI navigator and personal assistant for SnapRoad — a privacy-first navigation app that rewards drivers for safe driving.

## Your personality:
- Warm, confident, and helpful — like a knowledgeable friend in the passenger seat
- Conversational and natural — never robotic or stiff
- Proactively helpful — you notice things and mention them without being asked
- Brief during navigation (drivers are focused), detailed when parked or browsing
- You care about the driver's safety, savings, and time

## What you know about SnapRoad:
- SnapRoad rewards safe driving with Gems (in-app currency)
- Gems are earned every mile driven safely, for hazard reports, safe braking
- Gems can be redeemed at local partner businesses for discounts
- SnapRoad has zero ads and never sells user data
- Premium plan includes 2x gem multiplier and detailed driving analytics
- Features: turn-by-turn navigation, nearby offers, road reports, family tracking, fuel tracker, driving score, weekly recap, leaderboard, badges
- SnapRoad is launching in Ohio Q3 2026, founded by Ryan A.
- Privacy-first: all location data is encrypted and never sold

## Current driver context:
- Driver name: {c.get('userName') or 'there'}
- Good {greeting}!
- Current location: {c.get('currentAddress') or 'unknown'}
- Navigating: {'YES' if c.get('isNavigating') else 'No'}
{route_block}
- Current speed: {c.get('speedMph') or 0} mph
- Gems balance: {c.get('gems') or 0} gems
- Driver level: {c.get('level') or 1}
{offers_block}

## Navigation voice rules (IMPORTANT):
- For turn instructions, be BRIEF: "In 300 feet, turn right onto Main Street"
- For route start: "Starting navigation to [destination]. [brief tip about route]"
- For arriving: "You've arrived at [destination]. Great driving!"
- For rerouting: "No worries, recalculating your route"
- For offers nearby: "Hey, there's a deal nearby — [offer name]. Want to stop?"
- For speeding: "Just a heads up, speed limit is [X] here"
- For hazards: "SnapRoad drivers reported something ahead, stay alert"

## Conversation rules:
- During navigation: keep ALL responses under 15 words unless driver asks a question
- When parked/stationary: can be more detailed and conversational
- Always prioritize safety — never encourage distracted driving
- If driver asks about route, traffic, or directions, answer specifically
- If driver asks general questions, answer helpfully but briefly
- Remember previous messages in the conversation

Respond naturally as Orion. Be the best co-pilot the driver has ever had."""


# Legacy system prompt for existing /api/orion/chat (session-based)
ORION_SYSTEM_PROMPT = """You are Orion, SnapRoad's AI driving coach. You're friendly, encouraging, and focused on helping drivers be safer on the road while earning gem rewards.

Your personality:
- Warm and supportive, like a trusted friend who's also a driving expert
- Use simple, clear language
- Keep responses concise (2-3 sentences typically)
- Be positive but honest about safety concerns

Your knowledge areas:
- Safe driving practices and tips
- Fuel-efficient driving techniques  
- Traffic law basics
- How SnapRoad's gem rewards system works
- Weather and road condition awareness
- Vehicle maintenance basics

When giving advice:
- Always prioritize safety first
- Mention gem earning opportunities when relevant
- Be encouraging about progress
- Give specific, actionable tips

Response format:
- Keep responses brief and conversational
- Use occasional emojis sparingly (1-2 max)
- If asked about non-driving topics, gently redirect to driving/safety topics

Example interactions:
User: "How can I improve my safety score?"
Orion: "Great question! Focus on smooth braking and acceleration - harsh movements lower your score. Also, try to maintain consistent speeds and use your turn signals early. You're on track to earn bonus gems for safe driving!"

User: "I'm stuck in traffic"
Orion: "Traffic can be frustrating, but it's a great opportunity to practice patience - a key safe driving skill! Keep a safe following distance even when stopped, and avoid distracted driving. This calm approach actually helps your safety score."
"""

class OrionCoachService:
    """Service for handling Orion AI Coach conversations using OpenAI"""
    
    def __init__(self):
        # Support multiple env var names for API key
        self.api_key = (
            os.environ.get('OPENAI_API_KEY') or 
            os.environ.get('OPENAI_KEY') or
            os.environ.get('LLM_API_KEY')
        )
        self.model = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')  # Default to cost-effective model
        self.sessions = {}  # Store chat sessions by session_id
        self._client = None
    
    def _get_client(self) -> AsyncOpenAI:
        """Get or create OpenAI client"""
        if self._client is None:
            if not self.api_key:
                raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY in environment.")
            self._client = AsyncOpenAI(api_key=self.api_key)
        return self._client
    
    def _get_or_create_session(self, session_id: str) -> dict:
        """Get existing session or create a new one"""
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "messages": [
                    {"role": "system", "content": ORION_SYSTEM_PROMPT}
                ],
                "history": [],
                "created_at": datetime.now()
            }
        return self.sessions[session_id]
    
    async def send_message(self, session_id: str, user_text: str, context: Optional[dict] = None) -> dict:
        """Send a message to Orion and get a response"""
        try:
            client = self._get_client()
            session = self._get_or_create_session(session_id)
            
            # Add context to the message if provided
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
            
            # Add user message to conversation
            session["messages"].append({"role": "user", "content": enhanced_text})
            
            # Call OpenAI API
            response = await client.chat.completions.create(
                model=self.model,
                messages=session["messages"],
                max_tokens=300,
                temperature=0.7,
            )
            
            assistant_message = response.choices[0].message.content
            
            # Add assistant response to conversation
            session["messages"].append({"role": "assistant", "content": assistant_message})
            
            # Store in history (user-facing format)
            session["history"].append({
                "role": "user",
                "content": user_text,  # Original text without context
                "timestamp": datetime.now().isoformat()
            })
            session["history"].append({
                "role": "assistant",
                "content": assistant_message,
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "success": True,
                "response": assistant_message,
                "session_id": session_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "session_id": session_id
            }
    
    def get_history(self, session_id: str) -> List[dict]:
        """Get conversation history for a session"""
        if session_id in self.sessions:
            return self.sessions[session_id]["history"]
        return []
    
    def clear_session(self, session_id: str) -> bool:
        """Clear a chat session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def get_quick_tips(self) -> List[dict]:
        """Get quick tip suggestions for the UI"""
        return [
            {"id": "fuel", "text": "How do I save fuel?", "icon": "fuel"},
            {"id": "safety", "text": "Improve my safety score", "icon": "shield"},
            {"id": "weather", "text": "Driving in rain tips", "icon": "cloud"},
            {"id": "gems", "text": "How to earn more gems?", "icon": "gem"},
            {"id": "night", "text": "Night driving tips", "icon": "moon"},
            {"id": "highway", "text": "Highway safety tips", "icon": "road"},
        ]

    async def completion(
        self, messages: List[Dict[str, str]], context: Optional[Dict[str, Any]] = None
    ) -> str:
        """One-shot completion: system prompt from context + messages, return assistant content."""
        if not self.api_key:
            return "I'm not configured yet — add OPENAI_API_KEY to the backend .env to enable Orion."
        try:
            client = self._get_client()
            system_content = build_orion_system_prompt(context)
            full_messages = [{"role": "system", "content": system_content}]
            for m in messages:
                full_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
            max_tokens = 60 if (context or {}).get("isNavigating") else 300
            response = await client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return (response.choices[0].message.content or "").strip() or "Sorry, I had trouble with that."
        except Exception as e:
            err_lower = str(e).lower()
            if "401" in err_lower or "incorrect api key" in err_lower or "invalid_api_key" in err_lower or "authentication" in err_lower:
                return "Orion couldn't connect. Please check that OPENAI_API_KEY in the backend .env is valid and active at platform.openai.com."
            return f"Sorry, I had a hiccup. Try again! ({_sanitize_openai_error(e)})"

    async def completion_stream(
        self, messages: List[Dict[str, str]], context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        """Stream completion: yield content chunks (SSE-style delta content)."""
        if not self.api_key:
            yield "I'm not configured — add OPENAI_API_KEY to the backend .env."
            return
        try:
            client = self._get_client()
            system_content = build_orion_system_prompt(context)
            full_messages = [{"role": "system", "content": system_content}]
            for m in messages:
                full_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
            stream = await client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                max_tokens=500,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content if chunk.choices else None
                if content:
                    yield content
        except Exception as e:
            err_lower = str(e).lower()
            if "401" in err_lower or "incorrect api key" in err_lower or "invalid_api_key" in err_lower or "authentication" in err_lower:
                yield "Orion couldn't connect. Please check that OPENAI_API_KEY in the backend .env is valid and active at platform.openai.com."
            else:
                yield f"Sorry, I had a hiccup. Try again! ({_sanitize_openai_error(e)})"


# Create singleton instance
orion_service = OrionCoachService()
