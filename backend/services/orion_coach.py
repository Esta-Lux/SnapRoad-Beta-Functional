# SnapRoad - Orion AI Coach Service (Portable)
# AI-powered driving assistant using OpenAI SDK directly
# No platform-specific dependencies - works anywhere

import os
from datetime import datetime
from typing import Optional, List
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

# System prompt for Orion AI Coach
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

# Create singleton instance
orion_service = OrionCoachService()
