# SnapRoad API Server
from datetime import datetime, timedelta
import random
import os
import base64
import asyncio
import uuid
import json
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import services
from services.orion_coach import orion_service
from services.photo_analysis import photo_service
from services.partner_service import partner_service
from services.websocket_manager import ws_manager

app = FastAPI(title="SnapRoad API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================
class Location(BaseModel):
    id: Optional[int] = None
    name: str
    address: str
    category: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class Route(BaseModel):
    id: Optional[int] = None
    name: str
    origin: str
    destination: str
    departure_time: str
    days_active: List[str]
    notifications: bool = True

class Widget(BaseModel):
    widget_id: str
    visible: bool
    collapsed: bool
    position: dict

class ReportIncident(BaseModel):
    incident_type: str
    location: str
    description: Optional[str] = None

class NavigationRequest(BaseModel):
    destination: str
    origin: Optional[str] = "current_location"

class FriendRequest(BaseModel):
    user_id: str

class PlanUpdate(BaseModel):
    plan: str  # 'basic' or 'premium'

class PricingUpdate(BaseModel):
    founders_price: Optional[float] = None
    public_price: Optional[float] = None
    is_founders_active: Optional[bool] = None

# ==================== PRICING CONFIGURATION ====================
pricing_config = {
    "founders_price": 10.99,
    "public_price": 16.99,
    "is_founders_active": True,
}

# ==================== USER ID COUNTER ====================
next_user_id = 123457  # First user is 123456

# ==================== 160 BADGES ====================
ALL_BADGES = [
    # Distance Badges (1-20)
    {"id": 1, "name": "First Mile", "desc": "Drive your first mile", "icon": "🚗", "category": "distance", "requirement": 1, "gems": 10},
    {"id": 2, "name": "Ten Down", "desc": "Drive 10 miles total", "icon": "🛣️", "category": "distance", "requirement": 10, "gems": 25},
    {"id": 3, "name": "Road Runner", "desc": "Drive 50 miles total", "icon": "🏃", "category": "distance", "requirement": 50, "gems": 50},
    {"id": 4, "name": "Century Club", "desc": "Drive 100 miles total", "icon": "💯", "category": "distance", "requirement": 100, "gems": 100},
    {"id": 5, "name": "Road Warrior", "desc": "Drive 250 miles total", "icon": "⚔️", "category": "distance", "requirement": 250, "gems": 150},
    {"id": 6, "name": "Highway Hero", "desc": "Drive 500 miles total", "icon": "🦸", "category": "distance", "requirement": 500, "gems": 200},
    {"id": 7, "name": "Mile Master", "desc": "Drive 1,000 miles total", "icon": "🏆", "category": "distance", "requirement": 1000, "gems": 300},
    {"id": 8, "name": "Road Legend", "desc": "Drive 2,500 miles total", "icon": "🌟", "category": "distance", "requirement": 2500, "gems": 500},
    {"id": 9, "name": "Cross Country", "desc": "Drive 5,000 miles total", "icon": "🗺️", "category": "distance", "requirement": 5000, "gems": 750},
    {"id": 10, "name": "Globe Trotter", "desc": "Drive 10,000 miles total", "icon": "🌍", "category": "distance", "requirement": 10000, "gems": 1000},
    {"id": 11, "name": "Speed Demon", "desc": "Drive 25,000 miles", "icon": "👹", "category": "distance", "requirement": 25000, "gems": 1500},
    {"id": 12, "name": "Infinite Road", "desc": "Drive 50,000 miles", "icon": "♾️", "category": "distance", "requirement": 50000, "gems": 2000},
    {"id": 13, "name": "Daily Driver", "desc": "Drive every day for a week", "icon": "📅", "category": "distance", "requirement": 7, "gems": 75},
    {"id": 14, "name": "Weekend Warrior", "desc": "Drive both weekend days", "icon": "🎉", "category": "distance", "requirement": 2, "gems": 30},
    {"id": 15, "name": "Early Bird", "desc": "Start driving before 6 AM", "icon": "🐦", "category": "distance", "requirement": 1, "gems": 40},
    {"id": 16, "name": "Night Owl", "desc": "Drive after midnight", "icon": "🦉", "category": "distance", "requirement": 1, "gems": 40},
    {"id": 17, "name": "Rush Hour Pro", "desc": "Navigate rush hour 10 times", "icon": "⏰", "category": "distance", "requirement": 10, "gems": 60},
    {"id": 18, "name": "Long Hauler", "desc": "Complete a 100+ mile trip", "icon": "🚛", "category": "distance", "requirement": 1, "gems": 150},
    {"id": 19, "name": "City Slicker", "desc": "Drive in 5 different cities", "icon": "🏙️", "category": "distance", "requirement": 5, "gems": 100},
    {"id": 20, "name": "State Hopper", "desc": "Drive in 3 different states", "icon": "🗽", "category": "distance", "requirement": 3, "gems": 200},
    
    # Safety Badges (21-50)
    {"id": 21, "name": "Safety First", "desc": "Maintain 90+ score for a day", "icon": "🛡️", "category": "safety", "requirement": 90, "gems": 50},
    {"id": 22, "name": "Safety Star", "desc": "Maintain 95+ score for a week", "icon": "⭐", "category": "safety", "requirement": 95, "gems": 150},
    {"id": 23, "name": "Perfect Driver", "desc": "Achieve 100 safety score", "icon": "💎", "category": "safety", "requirement": 100, "gems": 500},
    {"id": 24, "name": "Smooth Operator", "desc": "No hard braking for 10 trips", "icon": "🎿", "category": "safety", "requirement": 10, "gems": 75},
    {"id": 25, "name": "Gentle Giant", "desc": "No hard acceleration for 10 trips", "icon": "🐘", "category": "safety", "requirement": 10, "gems": 75},
    {"id": 26, "name": "Zen Master", "desc": "No phone usage while driving", "icon": "🧘", "category": "safety", "requirement": 1, "gems": 100},
    {"id": 27, "name": "Speed Limit Pro", "desc": "Stay under limit for 50 miles", "icon": "🚦", "category": "safety", "requirement": 50, "gems": 80},
    {"id": 28, "name": "Lane Keeper", "desc": "No lane drifting for 20 trips", "icon": "↔️", "category": "safety", "requirement": 20, "gems": 90},
    {"id": 29, "name": "Distance Keeper", "desc": "Maintain safe following distance", "icon": "📏", "category": "safety", "requirement": 30, "gems": 85},
    {"id": 30, "name": "Signal Master", "desc": "Always use turn signals", "icon": "🔄", "category": "safety", "requirement": 50, "gems": 70},
    {"id": 31, "name": "No Rush", "desc": "Never exceed speed limit", "icon": "🐢", "category": "safety", "requirement": 100, "gems": 200},
    {"id": 32, "name": "Defensive Driver", "desc": "Complete defensive driving course", "icon": "🏰", "category": "safety", "requirement": 1, "gems": 300},
    {"id": 33, "name": "Weather Wise", "desc": "Safe driving in rain 10 times", "icon": "🌧️", "category": "safety", "requirement": 10, "gems": 100},
    {"id": 34, "name": "Snow Pro", "desc": "Safe driving in snow 5 times", "icon": "❄️", "category": "safety", "requirement": 5, "gems": 150},
    {"id": 35, "name": "Night Vision", "desc": "Safe night driving 20 times", "icon": "🌙", "category": "safety", "requirement": 20, "gems": 120},
    {"id": 36, "name": "Parking Pro", "desc": "Perfect parking 25 times", "icon": "🅿️", "category": "safety", "requirement": 25, "gems": 60},
    {"id": 37, "name": "Highway Safe", "desc": "Safe highway driving 500 miles", "icon": "🛤️", "category": "safety", "requirement": 500, "gems": 175},
    {"id": 38, "name": "City Safe", "desc": "Safe city driving 200 miles", "icon": "🏘️", "category": "safety", "requirement": 200, "gems": 125},
    {"id": 39, "name": "School Zone Hero", "desc": "Always slow in school zones", "icon": "🏫", "category": "safety", "requirement": 50, "gems": 100},
    {"id": 40, "name": "Seatbelt Champion", "desc": "Always buckled up", "icon": "🪢", "category": "safety", "requirement": 100, "gems": 50},
    {"id": 41, "name": "Mirror Master", "desc": "Check mirrors consistently", "icon": "🪞", "category": "safety", "requirement": 50, "gems": 65},
    {"id": 42, "name": "Blind Spot Aware", "desc": "Check blind spots 100 times", "icon": "👁️", "category": "safety", "requirement": 100, "gems": 80},
    {"id": 43, "name": "Calm Driver", "desc": "Low stress driving score", "icon": "😌", "category": "safety", "requirement": 30, "gems": 95},
    {"id": 44, "name": "Focus Master", "desc": "No distractions for 25 trips", "icon": "🎯", "category": "safety", "requirement": 25, "gems": 110},
    {"id": 45, "name": "Reaction King", "desc": "Fast reaction times recorded", "icon": "⚡", "category": "safety", "requirement": 20, "gems": 130},
    {"id": 46, "name": "Hazard Spotter", "desc": "Identify 50 hazards", "icon": "🔍", "category": "safety", "requirement": 50, "gems": 140},
    {"id": 47, "name": "Eco Safe", "desc": "Eco-friendly safe driving", "icon": "🌱", "category": "safety", "requirement": 40, "gems": 115},
    {"id": 48, "name": "Courtesy King", "desc": "Let others merge 30 times", "icon": "👑", "category": "safety", "requirement": 30, "gems": 70},
    {"id": 49, "name": "Intersection Pro", "desc": "Safe intersection crossing", "icon": "✖️", "category": "safety", "requirement": 100, "gems": 90},
    {"id": 50, "name": "Roundabout Master", "desc": "Navigate 25 roundabouts safely", "icon": "🔵", "category": "safety", "requirement": 25, "gems": 85},
    
    # Community Badges (51-80)
    {"id": 51, "name": "Road Guardian", "desc": "Report 10 incidents", "icon": "🛡️", "category": "community", "requirement": 10, "gems": 100},
    {"id": 52, "name": "Hazard Hunter", "desc": "Report 25 hazards", "icon": "🎯", "category": "community", "requirement": 25, "gems": 150},
    {"id": 53, "name": "Pothole Patrol", "desc": "Report 50 potholes", "icon": "🕳️", "category": "community", "requirement": 50, "gems": 200},
    {"id": 54, "name": "Traffic Helper", "desc": "Help with 20 traffic reports", "icon": "🚧", "category": "community", "requirement": 20, "gems": 125},
    {"id": 55, "name": "Community Hero", "desc": "100 verified reports", "icon": "🦸", "category": "community", "requirement": 100, "gems": 500},
    {"id": 56, "name": "First Responder", "desc": "First to report 10 incidents", "icon": "🚨", "category": "community", "requirement": 10, "gems": 175},
    {"id": 57, "name": "Accuracy King", "desc": "95% report accuracy", "icon": "🎯", "category": "community", "requirement": 95, "gems": 225},
    {"id": 58, "name": "Helper Hand", "desc": "Assist 15 stranded drivers", "icon": "🤝", "category": "community", "requirement": 15, "gems": 200},
    {"id": 59, "name": "Weather Reporter", "desc": "Report 30 weather hazards", "icon": "⛈️", "category": "community", "requirement": 30, "gems": 150},
    {"id": 60, "name": "Construction Crew", "desc": "Report 40 construction zones", "icon": "🏗️", "category": "community", "requirement": 40, "gems": 175},
    {"id": 61, "name": "Social Butterfly", "desc": "Add 10 friends", "icon": "🦋", "category": "community", "requirement": 10, "gems": 75},
    {"id": 62, "name": "Popular Driver", "desc": "Add 25 friends", "icon": "🌟", "category": "community", "requirement": 25, "gems": 125},
    {"id": 63, "name": "Network King", "desc": "Add 50 friends", "icon": "👑", "category": "community", "requirement": 50, "gems": 200},
    {"id": 64, "name": "Influencer", "desc": "Add 100 friends", "icon": "📢", "category": "community", "requirement": 100, "gems": 400},
    {"id": 65, "name": "Referral Pro", "desc": "Refer 5 new users", "icon": "🔗", "category": "community", "requirement": 5, "gems": 250},
    {"id": 66, "name": "Ambassador", "desc": "Refer 20 new users", "icon": "🎖️", "category": "community", "requirement": 20, "gems": 750},
    {"id": 67, "name": "Team Player", "desc": "Join a driving group", "icon": "👥", "category": "community", "requirement": 1, "gems": 50},
    {"id": 68, "name": "Group Leader", "desc": "Lead a driving group", "icon": "🏅", "category": "community", "requirement": 1, "gems": 150},
    {"id": 69, "name": "Event Attendee", "desc": "Attend 5 community events", "icon": "🎪", "category": "community", "requirement": 5, "gems": 100},
    {"id": 70, "name": "Event Host", "desc": "Host a community event", "icon": "🎤", "category": "community", "requirement": 1, "gems": 300},
    {"id": 71, "name": "Feedback Giver", "desc": "Submit 10 app feedbacks", "icon": "💬", "category": "community", "requirement": 10, "gems": 80},
    {"id": 72, "name": "Beta Tester", "desc": "Test 5 beta features", "icon": "🧪", "category": "community", "requirement": 5, "gems": 200},
    {"id": 73, "name": "Bug Hunter", "desc": "Report 10 bugs", "icon": "🐛", "category": "community", "requirement": 10, "gems": 250},
    {"id": 74, "name": "Suggestion Star", "desc": "Have suggestion implemented", "icon": "💡", "category": "community", "requirement": 1, "gems": 500},
    {"id": 75, "name": "Forum Active", "desc": "Post 20 forum messages", "icon": "📝", "category": "community", "requirement": 20, "gems": 90},
    {"id": 76, "name": "Helpful Answer", "desc": "Answer 15 questions", "icon": "❓", "category": "community", "requirement": 15, "gems": 120},
    {"id": 77, "name": "Photo Contributor", "desc": "Share 25 road photos", "icon": "📸", "category": "community", "requirement": 25, "gems": 100},
    {"id": 78, "name": "Review Writer", "desc": "Write 10 location reviews", "icon": "✍️", "category": "community", "requirement": 10, "gems": 85},
    {"id": 79, "name": "Challenge Creator", "desc": "Create a community challenge", "icon": "🎮", "category": "community", "requirement": 1, "gems": 200},
    {"id": 80, "name": "Mentor", "desc": "Help 5 new drivers", "icon": "🧑‍🏫", "category": "community", "requirement": 5, "gems": 175},
    
    # Streak Badges (81-100)
    {"id": 81, "name": "Three Day Streak", "desc": "Drive 3 days in a row", "icon": "3️⃣", "category": "streak", "requirement": 3, "gems": 30},
    {"id": 82, "name": "Week Warrior", "desc": "Drive 7 days in a row", "icon": "7️⃣", "category": "streak", "requirement": 7, "gems": 75},
    {"id": 83, "name": "Two Week Champ", "desc": "Drive 14 days in a row", "icon": "🔥", "category": "streak", "requirement": 14, "gems": 150},
    {"id": 84, "name": "Monthly Master", "desc": "Drive 30 days in a row", "icon": "📆", "category": "streak", "requirement": 30, "gems": 300},
    {"id": 85, "name": "Quarter King", "desc": "Drive 90 days in a row", "icon": "👑", "category": "streak", "requirement": 90, "gems": 750},
    {"id": 86, "name": "Half Year Hero", "desc": "Drive 180 days in a row", "icon": "🏆", "category": "streak", "requirement": 180, "gems": 1500},
    {"id": 87, "name": "Year Legend", "desc": "Drive 365 days in a row", "icon": "🌟", "category": "streak", "requirement": 365, "gems": 5000},
    {"id": 88, "name": "Safety Streak 3", "desc": "90+ score for 3 days", "icon": "🛡️", "category": "streak", "requirement": 3, "gems": 50},
    {"id": 89, "name": "Safety Streak 7", "desc": "90+ score for 7 days", "icon": "🛡️", "category": "streak", "requirement": 7, "gems": 125},
    {"id": 90, "name": "Safety Streak 30", "desc": "90+ score for 30 days", "icon": "🛡️", "category": "streak", "requirement": 30, "gems": 500},
    {"id": 91, "name": "Report Streak 5", "desc": "Report hazards 5 days straight", "icon": "📊", "category": "streak", "requirement": 5, "gems": 75},
    {"id": 92, "name": "Gem Streak", "desc": "Earn gems 7 days straight", "icon": "💎", "category": "streak", "requirement": 7, "gems": 100},
    {"id": 93, "name": "Login Streak 10", "desc": "Login 10 days in a row", "icon": "📱", "category": "streak", "requirement": 10, "gems": 60},
    {"id": 94, "name": "Login Streak 30", "desc": "Login 30 days in a row", "icon": "📱", "category": "streak", "requirement": 30, "gems": 200},
    {"id": 95, "name": "Offer Streak", "desc": "Redeem offers 5 days straight", "icon": "🎁", "category": "streak", "requirement": 5, "gems": 80},
    {"id": 96, "name": "Challenge Streak", "desc": "Complete challenges 7 days", "icon": "🎯", "category": "streak", "requirement": 7, "gems": 150},
    {"id": 97, "name": "Perfect Week", "desc": "100 score for 7 days", "icon": "💯", "category": "streak", "requirement": 7, "gems": 1000},
    {"id": 98, "name": "Perfect Month", "desc": "100 score for 30 days", "icon": "💯", "category": "streak", "requirement": 30, "gems": 5000},
    {"id": 99, "name": "Unstoppable", "desc": "500 day driving streak", "icon": "🚀", "category": "streak", "requirement": 500, "gems": 10000},
    {"id": 100, "name": "Eternal Driver", "desc": "1000 day driving streak", "icon": "♾️", "category": "streak", "requirement": 1000, "gems": 25000},
    
    # Achievement Badges (101-130)
    {"id": 101, "name": "First Trip", "desc": "Complete your first trip", "icon": "🎉", "category": "achievement", "requirement": 1, "gems": 10},
    {"id": 102, "name": "Ten Trips", "desc": "Complete 10 trips", "icon": "🔟", "category": "achievement", "requirement": 10, "gems": 50},
    {"id": 103, "name": "Fifty Trips", "desc": "Complete 50 trips", "icon": "5️⃣", "category": "achievement", "requirement": 50, "gems": 150},
    {"id": 104, "name": "Century Trips", "desc": "Complete 100 trips", "icon": "💯", "category": "achievement", "requirement": 100, "gems": 300},
    {"id": 105, "name": "Trip Master", "desc": "Complete 500 trips", "icon": "🏅", "category": "achievement", "requirement": 500, "gems": 750},
    {"id": 106, "name": "Trip Legend", "desc": "Complete 1000 trips", "icon": "🏆", "category": "achievement", "requirement": 1000, "gems": 1500},
    {"id": 107, "name": "Gem Collector", "desc": "Earn 1,000 gems", "icon": "💎", "category": "achievement", "requirement": 1000, "gems": 100},
    {"id": 108, "name": "Gem Hoarder", "desc": "Earn 10,000 gems", "icon": "💎", "category": "achievement", "requirement": 10000, "gems": 500},
    {"id": 109, "name": "Gem Tycoon", "desc": "Earn 100,000 gems", "icon": "💎", "category": "achievement", "requirement": 100000, "gems": 2500},
    {"id": 110, "name": "Badge Hunter", "desc": "Earn 25 badges", "icon": "🎖️", "category": "achievement", "requirement": 25, "gems": 250},
    {"id": 111, "name": "Badge Collector", "desc": "Earn 50 badges", "icon": "🎖️", "category": "achievement", "requirement": 50, "gems": 500},
    {"id": 112, "name": "Badge Master", "desc": "Earn 100 badges", "icon": "🎖️", "category": "achievement", "requirement": 100, "gems": 1500},
    {"id": 113, "name": "Completionist", "desc": "Earn all 160 badges", "icon": "🌟", "category": "achievement", "requirement": 160, "gems": 10000},
    {"id": 114, "name": "Level 10", "desc": "Reach level 10", "icon": "🔟", "category": "achievement", "requirement": 10, "gems": 100},
    {"id": 115, "name": "Level 25", "desc": "Reach level 25", "icon": "2️⃣", "category": "achievement", "requirement": 25, "gems": 250},
    {"id": 116, "name": "Level 50", "desc": "Reach level 50", "icon": "5️⃣", "category": "achievement", "requirement": 50, "gems": 750},
    {"id": 117, "name": "Level 100", "desc": "Reach level 100", "icon": "💯", "category": "achievement", "requirement": 100, "gems": 2500},
    {"id": 118, "name": "Skin Collector", "desc": "Own 5 car skins", "icon": "🎨", "category": "achievement", "requirement": 5, "gems": 150},
    {"id": 119, "name": "Skin Master", "desc": "Own 15 car skins", "icon": "🎨", "category": "achievement", "requirement": 15, "gems": 500},
    {"id": 120, "name": "Car Collector", "desc": "Own 3 cars", "icon": "🚗", "category": "achievement", "requirement": 3, "gems": 300},
    {"id": 121, "name": "Car Enthusiast", "desc": "Own 5 cars", "icon": "🚗", "category": "achievement", "requirement": 5, "gems": 750},
    {"id": 122, "name": "Route Saver", "desc": "Save 5 routes", "icon": "🗺️", "category": "achievement", "requirement": 5, "gems": 50},
    {"id": 123, "name": "Route Master", "desc": "Save 15 routes", "icon": "🗺️", "category": "achievement", "requirement": 15, "gems": 150},
    {"id": 124, "name": "Offer Redeemer", "desc": "Redeem 10 offers", "icon": "🎁", "category": "achievement", "requirement": 10, "gems": 75},
    {"id": 125, "name": "Offer Pro", "desc": "Redeem 50 offers", "icon": "🎁", "category": "achievement", "requirement": 50, "gems": 300},
    {"id": 126, "name": "Savings King", "desc": "Save $100 with offers", "icon": "💰", "category": "achievement", "requirement": 100, "gems": 200},
    {"id": 127, "name": "Savings Legend", "desc": "Save $500 with offers", "icon": "💰", "category": "achievement", "requirement": 500, "gems": 1000},
    {"id": 128, "name": "Early Adopter", "desc": "Join in first month", "icon": "🥇", "category": "achievement", "requirement": 1, "gems": 500},
    {"id": 129, "name": "Anniversary", "desc": "Be a member for 1 year", "icon": "🎂", "category": "achievement", "requirement": 365, "gems": 1000},
    {"id": 130, "name": "Veteran", "desc": "Be a member for 2 years", "icon": "🏛️", "category": "achievement", "requirement": 730, "gems": 2500},
    
    # Special & Seasonal Badges (131-160)
    {"id": 131, "name": "New Year Driver", "desc": "Drive on New Year's Day", "icon": "🎆", "category": "special", "requirement": 1, "gems": 100},
    {"id": 132, "name": "Valentine Cruiser", "desc": "Drive on Valentine's Day", "icon": "💕", "category": "special", "requirement": 1, "gems": 75},
    {"id": 133, "name": "Lucky Driver", "desc": "Drive on St. Patrick's Day", "icon": "🍀", "category": "special", "requirement": 1, "gems": 75},
    {"id": 134, "name": "Independence Driver", "desc": "Drive on July 4th", "icon": "🎇", "category": "special", "requirement": 1, "gems": 100},
    {"id": 135, "name": "Spooky Driver", "desc": "Drive on Halloween", "icon": "🎃", "category": "special", "requirement": 1, "gems": 100},
    {"id": 136, "name": "Turkey Trot", "desc": "Drive on Thanksgiving", "icon": "🦃", "category": "special", "requirement": 1, "gems": 100},
    {"id": 137, "name": "Holiday Spirit", "desc": "Drive on Christmas", "icon": "🎄", "category": "special", "requirement": 1, "gems": 150},
    {"id": 138, "name": "Summer Driver", "desc": "Drive 500 miles in summer", "icon": "☀️", "category": "special", "requirement": 500, "gems": 200},
    {"id": 139, "name": "Fall Cruiser", "desc": "Drive 500 miles in fall", "icon": "🍂", "category": "special", "requirement": 500, "gems": 200},
    {"id": 140, "name": "Winter Warrior", "desc": "Drive 500 miles in winter", "icon": "⛄", "category": "special", "requirement": 500, "gems": 250},
    {"id": 141, "name": "Spring Sprinter", "desc": "Drive 500 miles in spring", "icon": "🌸", "category": "special", "requirement": 500, "gems": 200},
    {"id": 142, "name": "Birthday Driver", "desc": "Drive on your birthday", "icon": "🎂", "category": "special", "requirement": 1, "gems": 200},
    {"id": 143, "name": "Full Moon", "desc": "Drive during full moon", "icon": "🌕", "category": "special", "requirement": 1, "gems": 50},
    {"id": 144, "name": "Eclipse Driver", "desc": "Drive during an eclipse", "icon": "🌑", "category": "special", "requirement": 1, "gems": 500},
    {"id": 145, "name": "Road Trip Pro", "desc": "Complete a 300+ mile trip", "icon": "🛣️", "category": "special", "requirement": 1, "gems": 300},
    {"id": 146, "name": "Scenic Route", "desc": "Take 10 scenic routes", "icon": "🏔️", "category": "special", "requirement": 10, "gems": 150},
    {"id": 147, "name": "Beach Driver", "desc": "Drive to 5 beaches", "icon": "🏖️", "category": "special", "requirement": 5, "gems": 100},
    {"id": 148, "name": "Mountain Master", "desc": "Drive mountain roads", "icon": "⛰️", "category": "special", "requirement": 10, "gems": 200},
    {"id": 149, "name": "Desert Runner", "desc": "Drive through desert", "icon": "🏜️", "category": "special", "requirement": 5, "gems": 150},
    {"id": 150, "name": "Forest Explorer", "desc": "Drive through 10 forests", "icon": "🌲", "category": "special", "requirement": 10, "gems": 125},
    {"id": 151, "name": "Bridge Crosser", "desc": "Cross 20 major bridges", "icon": "🌉", "category": "special", "requirement": 20, "gems": 100},
    {"id": 152, "name": "Tunnel Runner", "desc": "Drive through 15 tunnels", "icon": "🚇", "category": "special", "requirement": 15, "gems": 100},
    {"id": 153, "name": "Stadium Driver", "desc": "Drive to 5 stadiums", "icon": "🏟️", "category": "special", "requirement": 5, "gems": 75},
    {"id": 154, "name": "Airport Pro", "desc": "Drive to airports 10 times", "icon": "✈️", "category": "special", "requirement": 10, "gems": 100},
    {"id": 155, "name": "Hospital Helper", "desc": "Drive to hospitals safely", "icon": "🏥", "category": "special", "requirement": 5, "gems": 125},
    {"id": 156, "name": "Campus Cruiser", "desc": "Drive to 5 universities", "icon": "🎓", "category": "special", "requirement": 5, "gems": 100},
    {"id": 157, "name": "Theme Park Fan", "desc": "Drive to 3 theme parks", "icon": "🎢", "category": "special", "requirement": 3, "gems": 150},
    {"id": 158, "name": "National Park", "desc": "Drive to 5 national parks", "icon": "🏕️", "category": "special", "requirement": 5, "gems": 250},
    {"id": 159, "name": "Landmark Hunter", "desc": "Visit 20 landmarks", "icon": "🗿", "category": "special", "requirement": 20, "gems": 200},
    {"id": 160, "name": "Ultimate Driver", "desc": "Master all driving categories", "icon": "🏆", "category": "special", "requirement": 1, "gems": 50000},
]

# ==================== CAR MODELS ====================
CAR_MODELS = [
    {"id": 1, "name": "Compact Cruiser", "type": "sedan", "price": 0, "owned": True, "color": "#3B82F6"},
    {"id": 2, "name": "Sport Racer", "type": "sports", "price": 5000, "owned": False, "color": "#EF4444"},
    {"id": 3, "name": "Family SUV", "type": "suv", "price": 7500, "owned": False, "color": "#10B981"},
    {"id": 4, "name": "Luxury Elite", "type": "luxury", "price": 15000, "owned": False, "color": "#1F2937"},
    {"id": 5, "name": "Electric Future", "type": "electric", "price": 12000, "owned": False, "color": "#8B5CF6"},
    {"id": 6, "name": "Classic Muscle", "type": "muscle", "price": 10000, "owned": False, "color": "#F59E0B"},
    {"id": 7, "name": "Off-Road Beast", "type": "truck", "price": 8500, "owned": False, "color": "#78716C"},
    {"id": 8, "name": "City Mini", "type": "compact", "price": 3000, "owned": False, "color": "#EC4899"},
]

# ==================== CAR SKINS ====================
CAR_SKINS = [
    {"id": 1, "name": "Default Blue", "color": "#3B82F6", "gradient": None, "price": 0, "owned": True, "rarity": "common"},
    {"id": 2, "name": "Midnight Black", "color": "#1F2937", "gradient": None, "price": 0, "owned": True, "rarity": "common"},
    {"id": 3, "name": "Snow White", "color": "#F8FAFC", "gradient": None, "price": 500, "owned": False, "rarity": "common"},
    {"id": 4, "name": "Racing Red", "color": "#DC2626", "gradient": None, "price": 750, "owned": False, "rarity": "common"},
    {"id": 5, "name": "Forest Green", "color": "#059669", "gradient": None, "price": 750, "owned": False, "rarity": "common"},
    {"id": 6, "name": "Sunset Orange", "color": "#EA580C", "gradient": None, "price": 1000, "owned": False, "rarity": "uncommon"},
    {"id": 7, "name": "Royal Purple", "color": "#7C3AED", "gradient": None, "price": 1000, "owned": False, "rarity": "uncommon"},
    {"id": 8, "name": "Ocean Teal", "color": "#0891B2", "gradient": None, "price": 1000, "owned": False, "rarity": "uncommon"},
    {"id": 9, "name": "Neon Pink", "color": "#DB2777", "gradient": None, "price": 1500, "owned": False, "rarity": "rare"},
    {"id": 10, "name": "Gold Rush", "color": "#CA8A04", "gradient": None, "price": 2000, "owned": False, "rarity": "rare"},
    {"id": 11, "name": "Chrome Silver", "color": "#94A3B8", "gradient": "linear-gradient(135deg, #94A3B8 0%, #E2E8F0 50%, #94A3B8 100%)", "price": 2500, "owned": False, "rarity": "rare"},
    {"id": 12, "name": "Aurora", "color": None, "gradient": "linear-gradient(135deg, #06B6D4 0%, #8B5CF6 50%, #EC4899 100%)", "price": 3500, "owned": False, "rarity": "epic"},
    {"id": 13, "name": "Fire Storm", "color": None, "gradient": "linear-gradient(135deg, #EF4444 0%, #F97316 50%, #FBBF24 100%)", "price": 3500, "owned": False, "rarity": "epic"},
    {"id": 14, "name": "Ocean Wave", "color": None, "gradient": "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 50%, #14B8A6 100%)", "price": 3500, "owned": False, "rarity": "epic"},
    {"id": 15, "name": "Galaxy", "color": None, "gradient": "linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #7C3AED 100%)", "price": 5000, "owned": False, "rarity": "legendary"},
    {"id": 16, "name": "Rainbow", "color": None, "gradient": "linear-gradient(135deg, #EF4444 0%, #F97316 17%, #FBBF24 33%, #22C55E 50%, #3B82F6 67%, #8B5CF6 83%, #EC4899 100%)", "price": 7500, "owned": False, "rarity": "legendary"},
]

# ==================== USERS DATABASE ====================
# ==================== DEFAULT NEW USER ====================
def create_new_user(user_id: str, name: str = "New Driver", email: str = "") -> dict:
    """Create a fresh user with default values for new signups"""
    return {
        "id": user_id,
        "name": name,
        "email": email,
        "gems": 0,
        "level": 1,
        "xp": 0,
        "xp_to_next_level": 2500,
        "safety_score": 100,  # Start perfect
        "streak": 0,
        "safe_drive_streak": 0,
        "total_miles": 0,
        "total_trips": 0,
        "badges_earned": [],
        "community_badges": [],
        "rank": 0,
        "state": "OH",  # Default to Ohio
        "is_premium": False,
        "plan": None,  # Not selected yet
        "gem_multiplier": 1,
        "member_since": datetime.now().strftime("%b %Y"),
        "friends": [],
        "friend_requests": [],
        "owned_cars": [1],
        "equipped_car": 1,
        "owned_skins": [1],
        "equipped_skin": 1,
        "onboarding_complete": False,
        "plan_selected": False,
        "car_selected": False,
        "reports_posted": 0,
        "reports_upvotes_received": 0,
        "redeemed_offers": [],
    }

# Current user - starts as new user
users_db = {
    "123456": create_new_user("123456", "Driver", "driver@snaproad.com")
}

# Generate sample users for leaderboard - MORE Ohio users for focus
STATES = ["OH", "OH", "OH", "OH", "CA", "TX", "FL", "NY", "PA", "IL", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA", "TN", "IN"]
FIRST_NAMES = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Isabella", "Elijah", "Sophia", "Lucas", "Mia", "Mason", "Charlotte", "Ethan", "Amelia", "Aiden", "Harper", "Jacob", "Evelyn"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris"]


def calculate_xp_for_level(level: int) -> int:
    """Calculate total XP needed to reach a level. Level 1→2 = 2500, +500 per level."""
    if level <= 1:
        return 0
    total = 0
    for lvl in range(2, level + 1):
        total += 2500 + (lvl - 2) * 500
    return total

def calculate_xp_to_next_level(level: int) -> int:
    """XP needed to go from current level to next."""
    if level >= 99:
        return 0  # Max level
    return 2500 + (level - 1) * 500

for i in range(100):
    uid = str(123457 + i)
    is_premium = random.choice([True, False])
    level = random.randint(5, 99)
    users_db[uid] = {
        "id": uid,
        "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        "gems": random.randint(500, 50000),
        "level": level,
        "xp": calculate_xp_for_level(level) + random.randint(0, calculate_xp_to_next_level(level) // 2),
        "xp_to_next_level": calculate_xp_to_next_level(level),
        "safety_score": random.randint(60, 100),
        "streak": random.randint(0, 100),
        "safe_drive_streak": random.randint(0, 10),
        "total_miles": random.randint(100, 10000),
        "total_trips": random.randint(10, 500),
        "badges_earned": random.sample(range(1, 161), random.randint(3, 30)),
        "community_badges": random.sample(range(1, 21), random.randint(0, 5)),
        "rank": i + 1,
        "state": random.choice(STATES),
        "is_premium": is_premium,
        "plan": "premium" if is_premium else "basic",
        "gem_multiplier": 2 if is_premium else 1,
        "member_since": "2025",
        "friends": [],
        "friend_requests": [],
        "owned_cars": [1],
        "equipped_car": 1,
        "owned_skins": [1, 2],
        "equipped_skin": 1,
        "onboarding_complete": True,
        "reports_posted": random.randint(0, 50),
        "reports_upvotes_received": random.randint(0, 200),
    }

# Current user reference
current_user_id = "123456"

# ==================== ROAD REPORTS DATABASE ====================
road_reports_db = []  # Empty for new users - reports are community-submitted

# ==================== COMMUNITY BADGES ====================
COMMUNITY_BADGES = [
    {"id": 1, "name": "First Report", "desc": "Post your first road report", "icon": "📍", "requirement": 1},
    {"id": 2, "name": "Helpful Driver", "desc": "Get 10 upvotes on reports", "icon": "👍", "requirement": 10},
    {"id": 3, "name": "Road Guardian", "desc": "Post 10 road reports", "icon": "🛡️", "requirement": 10},
    {"id": 4, "name": "Community Hero", "desc": "Get 50 upvotes total", "icon": "🦸", "requirement": 50},
    {"id": 5, "name": "Hazard Hunter", "desc": "Report 5 hazards", "icon": "⚠️", "requirement": 5},
    {"id": 6, "name": "Traffic Watcher", "desc": "Report 5 accidents", "icon": "🚗", "requirement": 5},
    {"id": 7, "name": "Construction Crew", "desc": "Report 5 construction zones", "icon": "🚧", "requirement": 5},
    {"id": 8, "name": "Eagle Eye", "desc": "Get 100 upvotes total", "icon": "🦅", "requirement": 100},
    {"id": 9, "name": "Legend", "desc": "Post 50 verified reports", "icon": "⭐", "requirement": 50},
    {"id": 10, "name": "Night Watcher", "desc": "Post 10 reports after 8pm", "icon": "🌙", "requirement": 10},
    {"id": 11, "name": "Early Bird", "desc": "Post 10 reports before 7am", "icon": "🐦", "requirement": 10},
    {"id": 12, "name": "Weekend Warrior", "desc": "Post 20 weekend reports", "icon": "📅", "requirement": 20},
    {"id": 13, "name": "Trusted Reporter", "desc": "Have 25 verified reports", "icon": "✅", "requirement": 25},
    {"id": 14, "name": "Local Expert", "desc": "Report in 10 different areas", "icon": "🗺️", "requirement": 10},
    {"id": 15, "name": "Speed Demon Spotter", "desc": "Report 10 speed traps", "icon": "🚔", "requirement": 10},
    {"id": 16, "name": "Weather Watcher", "desc": "Report 5 weather hazards", "icon": "🌧️", "requirement": 5},
    {"id": 17, "name": "Influencer", "desc": "Get 200 upvotes total", "icon": "📢", "requirement": 200},
    {"id": 18, "name": "Veteran Reporter", "desc": "Post 100 reports", "icon": "🎖️", "requirement": 100},
    {"id": 19, "name": "Community Champion", "desc": "Get 500 upvotes total", "icon": "🏆", "requirement": 500},
    {"id": 20, "name": "Road Master", "desc": "Earn all other community badges", "icon": "👑", "requirement": 19},
]

# ==================== SAVED DATA (Empty for new users) ====================
saved_locations = []  # New users start with no saved locations
saved_routes = []  # New users start with no saved routes

widget_settings = {
    "score": {"visible": True, "collapsed": False, "position": {"x": 12, "y": 290}},
    "gems": {"visible": True, "collapsed": False, "position": {"x": 260, "y": 290}},
}

# ==================== SESSION MANAGEMENT ====================
def reset_default_user():
    """Reset the default user (123456) to fresh state for clean testing"""
    global users_db
    users_db["123456"] = create_new_user("123456", "Driver", "driver@snaproad.com")
    return users_db["123456"]

@app.post("/api/session/reset")
def reset_session():
    """Reset the current user's state to fresh for clean testing"""
    user = reset_default_user()
    return {
        "success": True,
        "message": "User state reset to fresh",
        "data": {
            "id": user["id"],
            "gems": user["gems"],
            "level": user["level"],
            "xp": user["xp"],
            "redeemed_offers": user.get("redeemed_offers", []),
            "onboarding_complete": user.get("onboarding_complete", False),
        }
    }

# ==================== AUTH MODELS ====================
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# Simple user credentials store (mock - replace with real DB)
user_credentials = {
    "driver@snaproad.com": {"password": "password123", "user_id": "123456"}
}

@app.post("/api/auth/signup")
def signup(request: SignupRequest):
    """Register a new user account"""
    global next_user_id
    
    # Check if email already exists
    if request.email.lower() in user_credentials:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate email format (basic check)
    if "@" not in request.email or "." not in request.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate password length
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create new user
    new_id = str(next_user_id)
    next_user_id += 1
    
    # Store credentials
    user_credentials[request.email.lower()] = {
        "password": request.password,
        "user_id": new_id
    }
    
    # Create user profile
    users_db[new_id] = create_new_user(new_id, request.name, request.email)
    
    return {
        "success": True,
        "message": "Account created successfully",
        "data": {
            "user_id": new_id,
            "email": request.email,
            "name": request.name,
            "token": f"mock_token_{new_id}"  # Mock token - replace with JWT in production
        }
    }

@app.post("/api/auth/login")
def login(request: LoginRequest = None, role: str = None):
    """Login with email/password or role-based mock login"""
    global current_user_id
    
    # If request body provided, do actual login
    if request and request.email:
        email_lower = request.email.lower()
        
        if email_lower not in user_credentials:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        stored = user_credentials[email_lower]
        if stored["password"] != request.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_id = stored["user_id"]
        current_user_id = user_id
        user = users_db.get(user_id, {})
        
        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "user_id": user_id,
                "name": user.get("name", "Driver"),
                "email": request.email,
                "token": f"mock_token_{user_id}",
                "is_premium": user.get("is_premium", False)
            }
        }
    
    # Legacy mock login for testing
    if role == "driver":
        reset_default_user()
    
    return {
        "success": True,
        "message": f"Logged in as {role or 'driver'}",
        "data": {
            "role": role or "driver",
            "user_id": current_user_id if (role == "driver" or not role) else f"{role}_user",
            "fresh_state": role == "driver" or not role
        }
    }

# ==================== HEALTH ====================
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "snaproad-api", "timestamp": datetime.now().isoformat()}

@app.get("/")
def root():
    return {"message": "SnapRoad API - All endpoints ready"}

# ==================== USER ====================
@app.get("/api/user/profile")
def get_user_profile():
    user = users_db.get(current_user_id, {})
    return {"success": True, "data": {
        **user,
        "badges_earned_count": len(user.get("badges_earned", [])),
        "friends_count": len(user.get("friends", []))
    }}

@app.put("/api/user/profile")
def update_user_profile(name: Optional[str] = None, email: Optional[str] = None):
    if current_user_id in users_db:
        if name: users_db[current_user_id]["name"] = name
        if email: users_db[current_user_id]["email"] = email
    return {"success": True, "message": "Profile updated"}

@app.get("/api/user/stats")
def get_user_stats():
    user = users_db.get(current_user_id, {})
    return {"success": True, "data": user}

# ==================== FRIENDS ====================
@app.get("/api/friends")
def get_friends():
    user = users_db.get(current_user_id, {})
    friends_list = []
    for fid in user.get("friends", []):
        if fid in users_db:
            f = users_db[fid]
            friends_list.append({
                "id": f["id"],
                "name": f["name"],
                "safety_score": f["safety_score"],
                "level": f["level"],
                "state": f["state"]
            })
    return {"success": True, "data": friends_list, "count": len(friends_list)}

@app.get("/api/friends/search")
def search_users(user_id: str = Query(...)):
    if user_id in users_db and user_id != current_user_id:
        u = users_db[user_id]
        return {"success": True, "data": {
            "id": u["id"],
            "name": u["name"],
            "safety_score": u["safety_score"],
            "level": u["level"],
            "state": u["state"],
            "is_friend": user_id in users_db.get(current_user_id, {}).get("friends", [])
        }}
    return {"success": False, "message": "User not found"}

@app.post("/api/friends/add")
def add_friend(request: FriendRequest):
    if request.user_id in users_db and request.user_id != current_user_id:
        if current_user_id in users_db:
            if request.user_id not in users_db[current_user_id]["friends"]:
                users_db[current_user_id]["friends"].append(request.user_id)
                # Auto-add back for demo
                if current_user_id not in users_db[request.user_id]["friends"]:
                    users_db[request.user_id]["friends"].append(current_user_id)
                return {"success": True, "message": f"Added {users_db[request.user_id]['name']} as friend!"}
            return {"success": False, "message": "Already friends"}
    return {"success": False, "message": "User not found"}

@app.delete("/api/friends/{friend_id}")
def remove_friend(friend_id: str):
    if current_user_id in users_db:
        if friend_id in users_db[current_user_id]["friends"]:
            users_db[current_user_id]["friends"].remove(friend_id)
            return {"success": True, "message": "Friend removed"}
    return {"success": False, "message": "Not found"}

# ==================== BADGES ====================
@app.get("/api/badges")
def get_badges(category: Optional[str] = None):
    user = users_db.get(current_user_id, {})
    earned_ids = set(user.get("badges_earned", []))
    
    badges = []
    for badge in ALL_BADGES:
        if category and badge["category"] != category:
            continue
        badges.append({
            **badge,
            "earned": badge["id"] in earned_ids,
            "progress": 100 if badge["id"] in earned_ids else random.randint(0, 95)
        })
    
    return {
        "success": True,
        "data": badges,
        "total": len(ALL_BADGES),
        "earned": len(earned_ids),
        "categories": ["distance", "safety", "community", "streak", "achievement", "special"]
    }

@app.get("/api/badges/categories")
def get_badge_categories():
    categories = {}
    for badge in ALL_BADGES:
        cat = badge["category"]
        if cat not in categories:
            categories[cat] = {"count": 0, "earned": 0}
        categories[cat]["count"] += 1
    
    user = users_db.get(current_user_id, {})
    earned_ids = set(user.get("badges_earned", []))
    for badge in ALL_BADGES:
        if badge["id"] in earned_ids:
            categories[badge["category"]]["earned"] += 1
    
    return {"success": True, "data": categories}

# ==================== LEADERBOARD ====================
@app.get("/api/leaderboard")
def get_leaderboard(state: Optional[str] = None, limit: int = 50, time_filter: Optional[str] = None):
    """
    Get leaderboard with optional filtering.
    - state: Filter by state (e.g., "OH" for Ohio)
    - time_filter: 'weekly', 'monthly', or None for all-time
    """
    users_list = list(users_db.values())
    
    # Filter by state if specified
    if state:
        users_list = [u for u in users_list if u.get("state") == state]
    
    # Sort by safety score (primary) and gems (secondary)
    users_list.sort(key=lambda x: (x.get("safety_score", 0), x.get("gems", 0)), reverse=True)
    
    leaderboard = []
    for i, u in enumerate(users_list[:limit]):
        leaderboard.append({
            "rank": i + 1,
            "id": u["id"],
            "name": u["name"],
            "safety_score": u["safety_score"],
            "gems": u.get("gems", 0),
            "level": u["level"],
            "state": u["state"],
            "badges_count": len(u.get("badges_earned", [])),
            "total_miles": u.get("total_miles", 0),
            "is_premium": u.get("is_premium", False),
        })
    
    # Get current user rank (considering state filter)
    current_user = users_db.get(current_user_id, {})
    my_rank = None
    my_data = None
    
    # If state filter is applied, calculate rank within that state
    rank_list = users_list if state else list(users_db.values())
    rank_list_sorted = sorted(rank_list, key=lambda x: (x.get("safety_score", 0), x.get("gems", 0)), reverse=True)
    
    for i, u in enumerate(rank_list_sorted):
        if u["id"] == current_user_id:
            my_rank = i + 1
            my_data = {
                "rank": my_rank,
                "safety_score": u.get("safety_score", 0),
                "gems": u.get("gems", 0),
                "level": u.get("level", 1),
                "state": u.get("state", "OH"),
            }
            break
    
    # Get unique states for filter dropdown
    unique_states = sorted(list(set(u.get("state", "OH") for u in users_db.values())))
    
    # Ohio focus - put OH first
    if "OH" in unique_states:
        unique_states.remove("OH")
        unique_states.insert(0, "OH")
    
    return {
        "success": True,
        "data": leaderboard,
        "my_rank": my_rank,
        "my_data": my_data,
        "total_users": len(users_list),
        "states": unique_states,
        "current_filter": {
            "state": state,
            "time_filter": time_filter or "all_time"
        }
    }

# ==================== CARS ====================
@app.get("/api/cars")
def get_cars():
    user = users_db.get(current_user_id, {})
    owned_ids = set(user.get("owned_cars", [1]))
    equipped = user.get("equipped_car", 1)
    
    cars = []
    for car in CAR_MODELS:
        cars.append({
            **car,
            "owned": car["id"] in owned_ids,
            "equipped": car["id"] == equipped
        })
    
    return {"success": True, "data": cars, "equipped_id": equipped}

@app.post("/api/cars/{car_id}/purchase")
def purchase_car(car_id: int):
    user = users_db.get(current_user_id, {})
    car = next((c for c in CAR_MODELS if c["id"] == car_id), None)
    
    if not car:
        return {"success": False, "message": "Car not found"}
    
    if car_id in user.get("owned_cars", []):
        return {"success": False, "message": "Already owned"}
    
    if user.get("gems", 0) < car["price"]:
        return {"success": False, "message": f"Need {car['price'] - user.get('gems', 0)} more gems"}
    
    users_db[current_user_id]["gems"] -= car["price"]
    users_db[current_user_id]["owned_cars"].append(car_id)
    return {"success": True, "message": f"Purchased {car['name']}!", "new_gems": users_db[current_user_id]["gems"]}

@app.post("/api/cars/{car_id}/equip")
def equip_car(car_id: int):
    user = users_db.get(current_user_id, {})
    if car_id in user.get("owned_cars", []):
        users_db[current_user_id]["equipped_car"] = car_id
        return {"success": True, "message": "Car equipped!"}
    return {"success": False, "message": "Car not owned"}

# ==================== SKINS ====================
@app.get("/api/skins")
def get_skins():
    user = users_db.get(current_user_id, {})
    owned_ids = set(user.get("owned_skins", [1, 2]))
    equipped = user.get("equipped_skin", 1)
    
    skins = []
    for skin in CAR_SKINS:
        skins.append({
            **skin,
            "owned": skin["id"] in owned_ids,
            "equipped": skin["id"] == equipped
        })
    
    return {"success": True, "data": skins, "equipped_id": equipped}

@app.post("/api/skins/{skin_id}/purchase")
def purchase_skin(skin_id: int):
    user = users_db.get(current_user_id, {})
    skin = next((s for s in CAR_SKINS if s["id"] == skin_id), None)
    
    if not skin:
        return {"success": False, "message": "Skin not found"}
    
    if skin_id in user.get("owned_skins", []):
        return {"success": False, "message": "Already owned"}
    
    if user.get("gems", 0) < skin["price"]:
        return {"success": False, "message": f"Need {skin['price'] - user.get('gems', 0)} more gems"}
    
    users_db[current_user_id]["gems"] -= skin["price"]
    users_db[current_user_id]["owned_skins"].append(skin_id)
    return {"success": True, "message": f"Purchased {skin['name']}!", "new_gems": users_db[current_user_id]["gems"]}

@app.post("/api/skins/{skin_id}/equip")
def equip_skin(skin_id: int):
    user = users_db.get(current_user_id, {})
    if skin_id in user.get("owned_skins", []):
        users_db[current_user_id]["equipped_skin"] = skin_id
        return {"success": True, "message": "Skin equipped!"}
    return {"success": False, "message": "Skin not owned"}

# ==================== CAR CUSTOMIZATION ====================
# Premium car colors with prices
PREMIUM_COLORS = {
    "carbon-fiber": 2500,
    "neon-cyan": 1500,
    "neon-pink": 1500,
    "neon-lime": 1500,
    "galaxy-purple": 2000,
    "inferno": 2000,
}

class CarCustomization(BaseModel):
    category: str
    variant: str
    color: str

@app.get("/api/user/car")
def get_user_car():
    """Get user's current car configuration"""
    user = users_db.get(current_user_id, {})
    return {
        "success": True,
        "data": {
            "category": user.get("car_category", "sedan"),
            "variant": user.get("car_variant", "sedan-classic"),
            "color": user.get("car_color", "midnight-black"),
            "owned_colors": user.get("owned_colors", []),
            "has_completed_onboarding": user.get("car_onboarding_complete", False),
        }
    }

@app.post("/api/user/car")
def update_user_car(car: CarCustomization):
    """Update user's car configuration"""
    if current_user_id in users_db:
        users_db[current_user_id]["car_category"] = car.category
        users_db[current_user_id]["car_variant"] = car.variant
        users_db[current_user_id]["car_color"] = car.color
        users_db[current_user_id]["car_selected"] = True
        
        # Check if onboarding is now complete
        plan_selected = users_db[current_user_id].get("plan_selected", False)
        if plan_selected:
            users_db[current_user_id]["onboarding_complete"] = True
        
        return {
            "success": True,
            "message": "Car updated!",
            "data": {
                "category": car.category,
                "variant": car.variant,
                "color": car.color,
                "onboarding_complete": users_db[current_user_id].get("onboarding_complete", False),
            }
        }
    return {"success": False, "message": "User not found"}

@app.post("/api/user/car/color/{color_key}/purchase")
def purchase_car_color(color_key: str):
    """Purchase a premium car color"""
    user = users_db.get(current_user_id, {})
    
    if color_key not in PREMIUM_COLORS:
        return {"success": False, "message": "Color not found or not premium"}
    
    owned_colors = user.get("owned_colors", [])
    if color_key in owned_colors:
        return {"success": False, "message": "Already owned"}
    
    price = PREMIUM_COLORS[color_key]
    if user.get("gems", 0) < price:
        return {"success": False, "message": f"Need {price - user.get('gems', 0)} more gems"}
    
    users_db[current_user_id]["gems"] -= price
    if "owned_colors" not in users_db[current_user_id]:
        users_db[current_user_id]["owned_colors"] = []
    users_db[current_user_id]["owned_colors"].append(color_key)
    
    return {
        "success": True,
        "message": f"Purchased color for {price} gems!",
        "new_gems": users_db[current_user_id]["gems"],
        "owned_colors": users_db[current_user_id]["owned_colors"]
    }

@app.get("/api/user/car/colors")
def get_owned_colors():
    """Get list of user's owned premium colors"""
    user = users_db.get(current_user_id, {})
    return {
        "success": True,
        "data": user.get("owned_colors", []),
        "available": list(PREMIUM_COLORS.keys()),
        "prices": PREMIUM_COLORS
    }

# ==================== LOCATIONS ====================
@app.get("/api/locations")
def get_locations(category: Optional[str] = None):
    if category:
        filtered = [loc for loc in saved_locations if loc["category"] == category]
        return {"success": True, "data": filtered}
    return {"success": True, "data": saved_locations}

@app.post("/api/locations")
def add_location(location: Location):
    new_id = max([loc["id"] for loc in saved_locations], default=0) + 1
    new_location = {"id": new_id, "name": location.name, "address": location.address, "category": location.category}
    saved_locations.append(new_location)
    return {"success": True, "message": f"Location '{location.name}' added", "data": new_location}

@app.delete("/api/locations/{location_id}")
def delete_location(location_id: int):
    global saved_locations
    saved_locations = [loc for loc in saved_locations if loc["id"] != location_id]
    return {"success": True, "message": "Location deleted"}

# ==================== ROUTES ====================
@app.get("/api/routes")
def get_routes():
    return {"success": True, "data": saved_routes, "total": len(saved_routes), "max": 20}

@app.post("/api/routes")
def add_route(route: Route):
    if len(saved_routes) >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 routes allowed")
    new_id = max([r["id"] for r in saved_routes], default=0) + 1
    new_route = {"id": new_id, "name": route.name, "origin": route.origin, "destination": route.destination,
                 "departure_time": route.departure_time, "days_active": route.days_active,
                 "estimated_time": 20, "distance": 10.0, "is_active": True, "notifications": route.notifications}
    saved_routes.append(new_route)
    return {"success": True, "message": f"Route '{route.name}' created", "data": new_route}

@app.delete("/api/routes/{route_id}")
def delete_route(route_id: int):
    global saved_routes
    saved_routes = [r for r in saved_routes if r["id"] != route_id]
    return {"success": True, "message": "Route deleted"}

@app.put("/api/routes/{route_id}/toggle")
def toggle_route(route_id: int):
    for route in saved_routes:
        if route["id"] == route_id:
            route["is_active"] = not route["is_active"]
            return {"success": True, "message": f"Route {'activated' if route['is_active'] else 'paused'}"}
    raise HTTPException(status_code=404, detail="Route not found")

@app.put("/api/routes/{route_id}/notifications")
def toggle_route_notifications(route_id: int):
    for route in saved_routes:
        if route["id"] == route_id:
            route["notifications"] = not route["notifications"]
            return {"success": True, "message": f"Notifications {'enabled' if route['notifications'] else 'disabled'}"}
    raise HTTPException(status_code=404, detail="Route not found")

# ==================== NAVIGATION ====================
@app.post("/api/navigation/start")
def start_navigation(nav: NavigationRequest):
    return {"success": True, "message": f"Navigation started to {nav.destination}",
            "data": {"destination": nav.destination, "eta": "25 min", "distance": "12.5 mi"}}

@app.post("/api/navigation/stop")
def stop_navigation():
    return {"success": True, "message": "Navigation stopped"}

@app.post("/api/navigation/voice-command")
def voice_command():
    return {"success": True, "message": "Voice command processed", "data": {"command": "Navigate to Work"}}

# ==================== WIDGETS ====================
@app.get("/api/widgets")
def get_widget_settings():
    return {"success": True, "data": widget_settings}

@app.put("/api/widgets/{widget_id}/toggle")
def toggle_widget_visibility(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["visible"] = not widget_settings[widget_id]["visible"]
        return {"success": True, "message": "Widget toggled"}
    raise HTTPException(status_code=404, detail="Widget not found")

@app.put("/api/widgets/{widget_id}/collapse")
def toggle_widget_collapse(widget_id: str):
    if widget_id in widget_settings:
        widget_settings[widget_id]["collapsed"] = not widget_settings[widget_id]["collapsed"]
        return {"success": True, "message": "Widget collapse toggled"}
    raise HTTPException(status_code=404, detail="Widget not found")

# ==================== OFFERS (TIERED DISCOUNTS) ====================
# Offers database - stores all available offers with seed data
offers_db = [
    {
        "id": 1,
        "business_name": "Shell Gas Station",
        "business_type": "gas",
        "description": "Save on your next fill-up!",
        "base_gems": 25,
        "lat": 39.9650,
        "lng": -82.9930,
        "is_admin_offer": False,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
        "created_by": "business",
        "redemption_count": 0,
    },
    {
        "id": 2,
        "business_name": "Starbucks Downtown",
        "business_type": "cafe",
        "description": "Get a free size upgrade!",
        "base_gems": 15,
        "lat": 39.9580,
        "lng": -83.0020,
        "is_admin_offer": False,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=5)).isoformat(),
        "created_by": "business",
        "redemption_count": 0,
    },
    {
        "id": 3,
        "business_name": "Quick Shine Car Wash",
        "business_type": "carwash",
        "description": "Premium wash at basic price",
        "base_gems": 30,
        "lat": 39.9700,
        "lng": -82.9850,
        "is_admin_offer": False,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=10)).isoformat(),
        "created_by": "business",
        "redemption_count": 0,
    },
    {
        "id": 4,
        "business_name": "SnapRoad Partner Deal",
        "business_type": "restaurant",
        "description": "Exclusive SnapRoad member discount!",
        "base_gems": 50,
        "lat": 39.9550,
        "lng": -83.0100,
        "is_admin_offer": True,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=14)).isoformat(),
        "created_by": "admin",
        "redemption_count": 0,
    },
    {
        "id": 5,
        "business_name": "BP Gas Station",
        "business_type": "gas",
        "description": "Save 10¢/gallon with SnapRoad",
        "base_gems": 20,
        "lat": 39.9480,
        "lng": -82.9900,
        "is_admin_offer": False,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=3)).isoformat(),
        "created_by": "business",
        "redemption_count": 0,
    },
]

# Offer configuration
OFFER_CONFIG = {
    "free_discount_percent": 6,    # Free users get 6% discount
    "premium_discount_percent": 18, # Premium users get 18% discount
    "gem_reward_multiplier": 1,     # Base gems for redeeming (multiplied by plan)
}

class OfferCreate(BaseModel):
    business_name: str
    business_type: str  # gas, cafe, restaurant, carwash, etc.
    description: str
    base_gems: int  # Gems awarded for redemption
    lat: float
    lng: float
    expires_hours: int = 24
    is_admin_offer: bool = False  # True = same discount for all, False = tiered

@app.get("/api/offers")
def get_offers(offer_type: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None):
    """Get available offers. Discounts are calculated based on user's plan."""
    user = users_db.get(current_user_id, {})
    is_premium = user.get("is_premium", False)
    
    result_offers = []
    for offer in offers_db:
        # Skip expired offers
        if datetime.fromisoformat(offer["expires_at"]) < datetime.now():
            continue
            
        # Filter by type if specified
        if offer_type and offer["business_type"] != offer_type:
            continue
        
        # Calculate discount based on plan and offer type
        if offer["is_admin_offer"]:
            # Admin offers: same discount for everyone (use premium rate)
            discount_percent = OFFER_CONFIG["premium_discount_percent"]
        else:
            # Business offers: tiered discount
            discount_percent = OFFER_CONFIG["premium_discount_percent"] if is_premium else OFFER_CONFIG["free_discount_percent"]
        
        # Calculate gem reward
        gem_multiplier = user.get("gem_multiplier", 1)
        gems_reward = offer["base_gems"] * gem_multiplier
        
        result_offers.append({
            "id": offer["id"],
            "business_name": offer["business_name"],
            "business_type": offer["business_type"],
            "description": offer["description"],
            "discount_percent": discount_percent,
            "gems_reward": gems_reward,
            "lat": offer["lat"],
            "lng": offer["lng"],
            "expires_at": offer["expires_at"],
            "is_admin_offer": offer["is_admin_offer"],
            "is_premium_offer": not offer["is_admin_offer"],
            "created_by": offer.get("created_by", "admin"),
            "redeemed": offer["id"] in user.get("redeemed_offers", []),
        })
    
    return {
        "success": True, 
        "data": result_offers, 
        "user_plan": user.get("plan", "basic"),
        "discount_info": {
            "free_discount": OFFER_CONFIG["free_discount_percent"],
            "premium_discount": OFFER_CONFIG["premium_discount_percent"],
        }
    }

@app.post("/api/offers")
def create_offer(offer: OfferCreate):
    """Create a new offer (for business dashboard or admin)"""
    new_id = max([o["id"] for o in offers_db], default=0) + 1
    new_offer = {
        "id": new_id,
        "business_name": offer.business_name,
        "business_type": offer.business_type,
        "description": offer.description,
        "base_gems": offer.base_gems,
        "lat": offer.lat,
        "lng": offer.lng,
        "is_admin_offer": offer.is_admin_offer,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
        "created_by": "admin" if offer.is_admin_offer else "business",
        "redemption_count": 0,
    }
    offers_db.append(new_offer)
    return {"success": True, "message": "Offer created", "data": new_offer}

@app.post("/api/offers/{offer_id}/redeem")
def redeem_offer(offer_id: int):
    """Redeem an offer and award gems + XP"""
    user = users_db.get(current_user_id, {})
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    
    if not offer:
        return {"success": False, "message": "Offer not found"}
    
    if offer_id in user.get("redeemed_offers", []):
        return {"success": False, "message": "Already redeemed"}
    
    # Calculate rewards
    gem_multiplier = user.get("gem_multiplier", 1)
    gems_earned = offer["base_gems"] * gem_multiplier
    is_premium = user.get("is_premium", False)
    
    if offer["is_admin_offer"]:
        discount_percent = OFFER_CONFIG["premium_discount_percent"]
    else:
        discount_percent = OFFER_CONFIG["premium_discount_percent"] if is_premium else OFFER_CONFIG["free_discount_percent"]
    
    # Update user
    if current_user_id in users_db:
        users_db[current_user_id]["gems"] = user.get("gems", 0) + gems_earned
        if "redeemed_offers" not in users_db[current_user_id]:
            users_db[current_user_id]["redeemed_offers"] = []
        users_db[current_user_id]["redeemed_offers"].append(offer_id)
    
    # Award XP for redemption
    xp_result = add_xp_to_user(current_user_id, XP_CONFIG["offer_redemption"])
    
    # Update offer stats
    offer["redemption_count"] = offer.get("redemption_count", 0) + 1
    
    return {
        "success": True, 
        "message": f"Offer redeemed! +{gems_earned} gems, +{XP_CONFIG['offer_redemption']} XP",
        "data": {
            "redemption_code": f"SNAP{offer_id}{datetime.now().strftime('%H%M')}",
            "discount_percent": discount_percent,
            "gems_earned": gems_earned,
            "xp_earned": XP_CONFIG["offer_redemption"],
            "xp_result": xp_result,
        }
    }

@app.get("/api/offers/nearby")
def get_nearby_offers(lat: float, lng: float, radius: float = 5.0):
    """Get offers within radius (km) of location"""
    user = users_db.get(current_user_id, {})
    is_premium = user.get("is_premium", False)
    
    nearby = []
    for offer in offers_db:
        if datetime.fromisoformat(offer["expires_at"]) < datetime.now():
            continue
        
        # Simple distance calc
        dlat = abs(offer["lat"] - lat)
        dlng = abs(offer["lng"] - lng)
        dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        
        if dist <= radius:
            discount_percent = OFFER_CONFIG["premium_discount_percent"] if (is_premium or offer["is_admin_offer"]) else OFFER_CONFIG["free_discount_percent"]
            nearby.append({
                **offer,
                "distance_km": round(dist, 2),
                "discount_percent": discount_percent,
            })
    
    return {"success": True, "data": nearby}

# ==================== INCIDENTS ====================
@app.post("/api/incidents/report")
def report_incident(report: ReportIncident):
    gems = {"pothole": 15, "accident": 50, "construction": 10, "hazard": 25}.get(report.incident_type, 10)
    return {"success": True, "message": f"Incident reported! +{gems} gems earned", "data": {"gems_earned": gems}}

@app.get("/api/family/members")
def get_family_members():
    """Get family members - returns empty for new users"""
    return {"success": True, "data": []}

# ==================== TRIP HISTORY ====================
@app.get("/api/trips/history")
def get_trip_history(month: Optional[str] = None, limit: int = 50):
    """Get trip history - returns empty for new users"""
    user = users_db.get(current_user_id, {})
    
    # New users have no trip history
    if user.get("total_trips", 0) == 0:
        return {
            "success": True,
            "data": [],
            "total": 0,
            "stats": {
                "total_trips": 0,
                "total_miles": 0,
                "avg_safety_score": 100,
                "total_gems_earned": 0
            }
        }
    
    # For users with trips, return their actual stats
    return {
        "success": True,
        "data": [],  # Would be populated from actual trip records
        "total": user.get("total_trips", 0),
        "stats": {
            "total_trips": user.get("total_trips", 0),
            "total_miles": user.get("total_miles", 0),
            "avg_safety_score": user.get("safety_score", 100),
            "total_gems_earned": user.get("gems", 0)
        }
    }


# ==================== GEM HISTORY ====================
@app.get("/api/gems/history")
def get_gem_history(limit: int = 50):
    """Get gem transaction history"""
    transactions = []
    base_date = datetime.now()
    balance = 12400
    
    transaction_types = [
        ("Safe trip bonus", 25, 50, "earn"),
        ("Challenge completed", 50, 150, "earn"),
        ("Hazard reported", 10, 25, "earn"),
        ("Offer redeemed", -30, -100, "spend"),
        ("Daily login bonus", 10, 20, "earn"),
        ("Badge earned", 50, 200, "earn"),
        ("Skin purchased", -500, -2000, "spend"),
        ("Weekly challenge", 75, 150, "earn"),
        ("Friend referral", 100, 250, "earn"),
    ]
    
    for i in range(50):
        tx_date = base_date - timedelta(days=i // 4, hours=random.randint(0, 23))
        tx_type = random.choice(transaction_types)
        amount = random.randint(tx_type[1], tx_type[2]) if tx_type[1] < tx_type[2] else random.randint(tx_type[2], tx_type[1])
        
        transactions.append({
            "id": i + 1,
            "date": tx_date.strftime("%Y-%m-%d"),
            "time": tx_date.strftime("%I:%M %p"),
            "description": tx_type[0],
            "amount": amount,
            "type": tx_type[3],
            "balance": balance
        })
        balance -= amount
    
    return {
        "success": True,
        "data": transactions[:limit],
        "current_balance": 12400,
        "this_month": {
            "earned": 2450,
            "spent": 800,
            "net": 1650
        }
    }

# ==================== CHALLENGES ====================
challenges_data = [
    {"id": 1, "title": "Weekly Driver", "description": "Complete 10 trips this week", "progress": 7, "target": 10, "gems": 100, "expires": "3 days", "type": "weekly", "completed": False, "claimed": False},
    {"id": 2, "title": "Safety Champion", "description": "Maintain 90+ safety score for 5 days", "progress": 3, "target": 5, "gems": 150, "expires": "4 days", "type": "weekly", "completed": False, "claimed": False},
    {"id": 3, "title": "Report Hero", "description": "Report 3 road hazards", "progress": 3, "target": 3, "gems": 75, "expires": "2 days", "type": "weekly", "completed": True, "claimed": False},
    {"id": 4, "title": "Distance Master", "description": "Drive 50 miles this week", "progress": 32, "target": 50, "gems": 125, "expires": "5 days", "type": "weekly", "completed": False, "claimed": False},
    {"id": 5, "title": "Early Bird", "description": "Start 3 trips before 7 AM", "progress": 1, "target": 3, "gems": 60, "expires": "6 days", "type": "weekly", "completed": False, "claimed": False},
]

@app.get("/api/challenges")
def get_challenges():
    """Get active challenges"""
    return {
        "success": True,
        "data": challenges_data,
        "weekly_progress": {
            "completed": sum(1 for c in challenges_data if c["completed"]),
            "total": len(challenges_data)
        }
    }

@app.post("/api/challenges/{challenge_id}/claim")
def claim_challenge(challenge_id: int):
    """Claim reward for completed challenge"""
    for c in challenges_data:
        if c["id"] == challenge_id:
            if not c["completed"]:
                return {"success": False, "message": "Challenge not completed yet"}
            if c["claimed"]:
                return {"success": False, "message": "Reward already claimed"}
            c["claimed"] = True
            return {
                "success": True,
                "message": f"Claimed {c['gems']} gems!",
                "gems_earned": c["gems"],
                "animation": "confetti"
            }
    return {"success": False, "message": "Challenge not found"}

# ==================== FUEL TRACKING ====================
fuel_history = [
    {"id": 1, "date": "2025-02-01", "station": "Shell", "price_per_gallon": 3.29, "gallons": 12.5, "total": 41.13, "odometer": 45230},
    {"id": 2, "date": "2025-01-28", "station": "Chevron", "price_per_gallon": 3.35, "gallons": 11.8, "total": 39.53, "odometer": 44920},
    {"id": 3, "date": "2025-01-24", "station": "Shell", "price_per_gallon": 3.31, "gallons": 13.2, "total": 43.69, "odometer": 44580},
    {"id": 4, "date": "2025-01-20", "station": "Exxon", "price_per_gallon": 3.42, "gallons": 10.9, "total": 37.28, "odometer": 44210},
    {"id": 5, "date": "2025-01-16", "station": "Shell", "price_per_gallon": 3.38, "gallons": 12.1, "total": 40.90, "odometer": 43870},
]

class FuelLog(BaseModel):
    date: str
    station: Optional[str] = "Unknown"
    price_per_gallon: float
    gallons: float
    total: float

@app.get("/api/fuel/history")
def get_fuel_history():
    """Get fuel purchase history"""
    total_spent = sum(f["total"] for f in fuel_history)
    total_gallons = sum(f["gallons"] for f in fuel_history)
    avg_price = total_spent / total_gallons if total_gallons > 0 else 0
    
    return {
        "success": True,
        "data": fuel_history,
        "stats": {
            "total_spent": round(total_spent, 2),
            "total_gallons": round(total_gallons, 1),
            "avg_price": round(avg_price, 2),
            "avg_mpg": 28.4,
            "this_month": {
                "spent": round(fuel_history[0]["total"] + fuel_history[1]["total"], 2) if len(fuel_history) >= 2 else 0,
                "gallons": round(fuel_history[0]["gallons"] + fuel_history[1]["gallons"], 1) if len(fuel_history) >= 2 else 0
            }
        }
    }

@app.post("/api/fuel/log")
def log_fuel_purchase(log: FuelLog):
    """Log a new fuel purchase"""
    new_id = max(f["id"] for f in fuel_history) + 1 if fuel_history else 1
    new_entry = {
        "id": new_id,
        "date": log.date,
        "station": log.station,
        "price_per_gallon": log.price_per_gallon,
        "gallons": log.gallons,
        "total": log.total,
        "odometer": 45500 + new_id * 100
    }
    fuel_history.insert(0, new_entry)
    return {"success": True, "message": "Fuel purchase logged!", "data": new_entry}

@app.get("/api/fuel/trends")
def get_fuel_trends():
    """Get 30-day fuel price trends"""
    trends = []
    base_price = 3.35
    for i in range(30):
        date = (datetime.now() - timedelta(days=29-i)).strftime("%Y-%m-%d")
        price = base_price + random.uniform(-0.15, 0.15)
        trends.append({"date": date, "price": round(price, 2)})
    
    return {
        "success": True,
        "data": trends,
        "avg_price": round(sum(t["price"] for t in trends) / len(trends), 2),
        "lowest": min(t["price"] for t in trends),
        "highest": max(t["price"] for t in trends),
        "trend": "stable"
    }

# ==================== NOTIFICATION SETTINGS ====================
notification_settings = {
    "push_notifications": {
        "trip_summary": True,
        "challenges": True,
        "offers": True,
        "gems_earned": True,
        "friend_activity": False,
        "safety_alerts": True,
    },
    "email_alerts": {
        "weekly_summary": True,
        "monthly_report": True,
        "special_offers": False,
        "account_updates": True,
    },
    "in_app_sounds": {
        "navigation_voice": True,
        "notifications": True,
        "achievements": True,
    }
}

@app.get("/api/settings/notifications")
def get_notification_settings():
    """Get notification settings"""
    return {"success": True, "data": notification_settings}

@app.put("/api/settings/notifications")
def update_notification_settings(category: str, setting: str, enabled: bool):
    """Update a specific notification setting"""
    if category in notification_settings and setting in notification_settings[category]:
        notification_settings[category][setting] = enabled
        return {"success": True, "message": f"{setting} {'enabled' if enabled else 'disabled'}"}
    return {"success": False, "message": "Setting not found"}

# ==================== HELP & FAQ ====================
faq_data = [
    {"id": 1, "category": "Getting Started", "question": "How do I start using SnapRoad?", "answer": "Simply open the app and allow location access. The app will automatically track your trips and calculate your safety score."},
    {"id": 2, "category": "Getting Started", "question": "What is a safety score?", "answer": "Your safety score (0-100) measures your driving habits including speed, braking, acceleration, and phone usage. Higher scores earn more gems!"},
    {"id": 3, "category": "Gems & Rewards", "question": "How do I earn gems?", "answer": "Earn gems by completing trips safely, finishing challenges, reporting road hazards, and maintaining high safety scores."},
    {"id": 4, "category": "Gems & Rewards", "question": "What can I use gems for?", "answer": "Spend gems on offers at partner locations (gas stations, coffee shops), car skins, and premium features."},
    {"id": 5, "category": "Gems & Rewards", "question": "Do gems expire?", "answer": "No, your gems never expire. Accumulate as many as you want!"},
    {"id": 6, "category": "Privacy", "question": "Is my location data shared?", "answer": "Never. SnapRoad is privacy-first. Your trip data stays on your device and is never sold to third parties."},
    {"id": 7, "category": "Privacy", "question": "Can I delete my trip history?", "answer": "Yes, go to Settings > Privacy > Delete Trip History to remove all your trip data."},
    {"id": 8, "category": "Features", "question": "How do challenges work?", "answer": "Challenges refresh weekly. Complete them before they expire to earn bonus gems. Tap 'Claim' when finished!"},
    {"id": 9, "category": "Features", "question": "How do I add friends?", "answer": "Open Friends Hub from the menu, go to 'Find Friends', and enter their 6-digit SnapRoad ID."},
    {"id": 10, "category": "Features", "question": "What is the leaderboard?", "answer": "The leaderboard ranks drivers by safety score. Filter by state to see how you compare locally!"},
    {"id": 11, "category": "Account", "question": "How do I upgrade to Premium?", "answer": "Go to Profile > Settings > Upgrade to unlock fuel tracking, advanced analytics, and exclusive rewards."},
    {"id": 12, "category": "Account", "question": "How do I change my profile?", "answer": "Go to Profile > tap your name to edit your display name, profile picture, and preferences."},
    {"id": 13, "category": "Troubleshooting", "question": "Why isn't my trip being tracked?", "answer": "Ensure location services are enabled and the app has 'Always' location permission. Check battery optimization settings."},
    {"id": 14, "category": "Troubleshooting", "question": "My safety score seems wrong", "answer": "Scores update after each trip. If you notice issues, try force-closing and reopening the app."},
    {"id": 15, "category": "Troubleshooting", "question": "App is using too much battery", "answer": "SnapRoad uses minimal battery. Go to Settings > Battery Mode to switch to power-saving tracking."},
]

class ContactForm(BaseModel):
    subject: str
    message: str
    email: Optional[str] = None

@app.get("/api/help/faq")
def get_faq(search: Optional[str] = None, category: Optional[str] = None):
    """Get FAQ with optional search and category filter"""
    results = faq_data
    
    if category:
        results = [f for f in results if f["category"] == category]
    
    if search:
        search_lower = search.lower()
        results = [f for f in results if search_lower in f["question"].lower() or search_lower in f["answer"].lower()]
    
    categories = list(set(f["category"] for f in faq_data))
    
    return {
        "success": True,
        "data": results,
        "categories": categories,
        "total": len(results)
    }

@app.post("/api/help/contact")
def submit_contact(form: ContactForm):
    """Submit a support request"""
    return {
        "success": True,
        "message": "Your message has been sent! We'll respond within 24 hours.",
        "ticket_id": f"SR-{random.randint(10000, 99999)}"
    }

# ==================== SHARE TRIP ====================
@app.post("/api/trips/{trip_id}/share")
def generate_share_content(trip_id: int):
    """Generate shareable content for a trip"""
    return {
        "success": True,
        "data": {
            "text": f"🚗 Just completed a trip with a 92 safety score on SnapRoad! 🏆 #SafeDriving #SnapRoad",
            "image_url": f"/api/trips/{trip_id}/share-image",
            "share_links": {
                "twitter": f"https://twitter.com/intent/tweet?text=...",
                "facebook": f"https://facebook.com/sharer/...",
                "instagram": "Copy to clipboard for Instagram"
            }
        }
    }

# ==================== PRICING & PLANS ====================
@app.get("/api/pricing")
def get_pricing():
    """Get current pricing configuration"""
    return {
        "success": True,
        "data": pricing_config
    }

@app.put("/api/admin/pricing")
def update_pricing(update: PricingUpdate):
    """Admin: Update pricing configuration"""
    if update.founders_price is not None:
        pricing_config["founders_price"] = update.founders_price
    if update.public_price is not None:
        pricing_config["public_price"] = update.public_price
    if update.is_founders_active is not None:
        pricing_config["is_founders_active"] = update.is_founders_active
    
    return {
        "success": True,
        "message": "Pricing updated",
        "data": pricing_config
    }

@app.post("/api/user/plan")
def update_user_plan(plan_update: PlanUpdate):
    """Update user's subscription plan"""
    if current_user_id not in users_db:
        return {"success": False, "message": "User not found"}
    
    plan = plan_update.plan.lower()
    if plan not in ["basic", "premium"]:
        return {"success": False, "message": "Invalid plan"}
    
    users_db[current_user_id]["plan"] = plan
    users_db[current_user_id]["is_premium"] = plan == "premium"
    users_db[current_user_id]["gem_multiplier"] = 2 if plan == "premium" else 1
    users_db[current_user_id]["plan_selected"] = True
    
    return {
        "success": True,
        "message": f"Plan updated to {plan}",
        "data": {
            "plan": plan,
            "is_premium": plan == "premium",
            "gem_multiplier": 2 if plan == "premium" else 1,
            "price": pricing_config["founders_price"] if pricing_config["is_founders_active"] and plan == "premium" else (pricing_config["public_price"] if plan == "premium" else 0)
        }
    }

@app.get("/api/user/plan")
def get_user_plan():
    """Get user's current subscription plan"""
    user = users_db.get(current_user_id, {})
    return {
        "success": True,
        "data": {
            "plan": user.get("plan"),
            "is_premium": user.get("is_premium", False),
            "gem_multiplier": user.get("gem_multiplier", 1),
            "onboarding_complete": user.get("onboarding_complete", False),
            "plan_selected": user.get("plan_selected", False),
        }
    }

@app.get("/api/user/onboarding-status")
def get_onboarding_status():
    """Get user's onboarding completion status"""
    user = users_db.get(current_user_id, {})
    plan_selected = user.get("plan_selected", False) or user.get("plan") is not None
    car_selected = user.get("car_selected", False)
    onboarding_complete = plan_selected and car_selected
    
    return {
        "success": True,
        "data": {
            "onboarding_complete": onboarding_complete,
            "plan_selected": plan_selected,
            "car_selected": car_selected,
        }
    }

# ==================== TRIP COMPLETION WITH GEM MULTIPLIER ====================
@app.post("/api/trips/complete")
def complete_trip():
    """Complete a trip and award gems based on user's plan"""
    user = users_db.get(current_user_id, {})
    base_gems = 5  # Base gems per drive
    multiplier = user.get("gem_multiplier", 1)
    gems_earned = base_gems * multiplier
    
    # Update user gems
    if current_user_id in users_db:
        users_db[current_user_id]["gems"] = user.get("gems", 0) + gems_earned
        users_db[current_user_id]["total_trips"] = user.get("total_trips", 0) + 1
    
    return {
        "success": True,
        "message": f"Trip completed! +{gems_earned} gems earned",
        "data": {
            "base_gems": base_gems,
            "multiplier": multiplier,
            "gems_earned": gems_earned,
            "total_gems": users_db[current_user_id].get("gems", 0),
            "is_premium": user.get("is_premium", False)
        }
    }

# ==================== XP & LEVELING SYSTEM ====================
# XP Values (configurable - easy to change for your deployment)
XP_CONFIG = {
    "photo_report": 500,       # Posting a photo/hazard report
    "offer_redemption": 700,   # Redeeming an offer
    "safe_drive": 1000,        # Safe drive report
    "consistent_driving": 500, # 3 consecutive safe drives bonus
    "safety_score_penalty": -500,  # Safety score went down
    "base_xp_to_level": 2500,  # XP for level 1→2
    "xp_increment": 500,       # Additional XP needed per level
    "max_level": 99,
}

class XPEvent(BaseModel):
    event_type: str  # photo_report, offer_redemption, safe_drive, safety_penalty, consistent_bonus
    amount: Optional[int] = None  # Override default XP if needed

def add_xp_to_user(user_id: str, xp_amount: int) -> dict:
    """Add XP to user and handle level ups/downs. Returns level change info."""
    if user_id not in users_db:
        return {"error": "User not found"}
    
    user = users_db[user_id]
    old_level = user.get("level", 1)
    old_xp = user.get("xp", 0)
    
    new_xp = max(0, old_xp + xp_amount)  # XP can't go below 0
    users_db[user_id]["xp"] = new_xp
    
    # Calculate new level based on total XP
    new_level = 1
    xp_threshold = 0
    for lvl in range(2, XP_CONFIG["max_level"] + 1):
        xp_needed = XP_CONFIG["base_xp_to_level"] + (lvl - 2) * XP_CONFIG["xp_increment"]
        xp_threshold += xp_needed
        if new_xp >= xp_threshold:
            new_level = lvl
        else:
            break
    
    # Cap at max level
    new_level = min(new_level, XP_CONFIG["max_level"])
    users_db[user_id]["level"] = new_level
    
    # Calculate XP to next level
    if new_level < XP_CONFIG["max_level"]:
        xp_to_next = XP_CONFIG["base_xp_to_level"] + (new_level - 1) * XP_CONFIG["xp_increment"]
        xp_at_current_level = calculate_xp_for_level(new_level)
        xp_progress = new_xp - xp_at_current_level
        users_db[user_id]["xp_to_next_level"] = xp_to_next
        users_db[user_id]["xp_progress"] = xp_progress
    else:
        users_db[user_id]["xp_to_next_level"] = 0
        users_db[user_id]["xp_progress"] = 0
    
    level_change = new_level - old_level
    
    return {
        "old_level": old_level,
        "new_level": new_level,
        "level_change": level_change,
        "leveled_up": level_change > 0,
        "leveled_down": level_change < 0,
        "xp_gained": xp_amount,
        "total_xp": new_xp,
        "xp_to_next_level": users_db[user_id].get("xp_to_next_level", 0),
    }

@app.post("/api/xp/add")
def add_xp(event: XPEvent):
    """Add XP based on event type"""
    event_type = event.event_type.lower()
    
    # Get XP amount from config or use override
    xp_map = {
        "photo_report": XP_CONFIG["photo_report"],
        "offer_redemption": XP_CONFIG["offer_redemption"],
        "safe_drive": XP_CONFIG["safe_drive"],
        "consistent_bonus": XP_CONFIG["consistent_driving"],
        "safety_penalty": XP_CONFIG["safety_score_penalty"],
    }
    
    xp_amount = event.amount if event.amount is not None else xp_map.get(event_type, 0)
    
    if xp_amount == 0:
        return {"success": False, "message": f"Unknown event type: {event_type}"}
    
    result = add_xp_to_user(current_user_id, xp_amount)
    
    message = f"+{xp_amount} XP" if xp_amount > 0 else f"{xp_amount} XP"
    if result.get("leveled_up"):
        message += f" 🎉 Level up! Now level {result['new_level']}"
    elif result.get("leveled_down"):
        message += f" 📉 Level down to {result['new_level']}"
    
    return {
        "success": True,
        "message": message,
        "data": result
    }

@app.get("/api/xp/status")
def get_xp_status():
    """Get user's current XP and level status"""
    user = users_db.get(current_user_id, {})
    level = user.get("level", 1)
    xp = user.get("xp", 0)
    
    # Calculate progress to next level
    xp_at_current = calculate_xp_for_level(level)
    xp_to_next = calculate_xp_to_next_level(level) if level < 99 else 0
    xp_progress = xp - xp_at_current
    progress_percent = (xp_progress / xp_to_next * 100) if xp_to_next > 0 else 100
    
    return {
        "success": True,
        "data": {
            "level": level,
            "total_xp": xp,
            "xp_progress": xp_progress,
            "xp_to_next_level": xp_to_next,
            "progress_percent": round(progress_percent, 1),
            "is_max_level": level >= 99,
        }
    }

@app.get("/api/xp/config")
def get_xp_config():
    """Get XP configuration (for client-side display)"""
    return {"success": True, "data": XP_CONFIG}

# ==================== ROAD REPORTS ====================
class RoadReport(BaseModel):
    type: str  # hazard, accident, construction, police, weather, other
    title: str
    description: Optional[str] = ""
    lat: float
    lng: float
    photo_url: Optional[str] = None

@app.get("/api/reports")
def get_road_reports(lat: Optional[float] = None, lng: Optional[float] = None, radius: float = 10):
    """Get road reports. Optionally filter by location within radius (km)."""
    reports = road_reports_db
    
    # If location provided, filter by proximity (simplified - in production use proper geo queries)
    if lat is not None and lng is not None:
        # Simple distance filter (not accurate for large distances, but works for demo)
        def is_nearby(report):
            dlat = abs(report["lat"] - lat)
            dlng = abs(report["lng"] - lng)
            # Rough km conversion (1 degree ≈ 111km)
            dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
            return dist <= radius
        reports = [r for r in reports if is_nearby(r)]
    
    return {
        "success": True,
        "data": reports,
        "total": len(reports)
    }

@app.post("/api/reports")
def create_road_report(report: RoadReport):
    """Create a new road report. Awards XP and gems."""
    user = users_db.get(current_user_id, {})
    
    new_id = max([r["id"] for r in road_reports_db], default=0) + 1
    new_report = {
        "id": new_id,
        "user_id": current_user_id,
        "type": report.type,
        "title": report.title,
        "description": report.description,
        "lat": report.lat,
        "lng": report.lng,
        "photo_url": report.photo_url,
        "upvotes": 0,
        "upvoters": [],
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=12)).isoformat(),
        "verified": False,
    }
    road_reports_db.append(new_report)
    
    # Award XP for posting report
    xp_result = add_xp_to_user(current_user_id, XP_CONFIG["photo_report"])
    
    # Update user stats
    if current_user_id in users_db:
        users_db[current_user_id]["reports_posted"] = user.get("reports_posted", 0) + 1
    
    # Check for community badge unlocks
    badges_earned = check_community_badges(current_user_id)
    
    return {
        "success": True,
        "message": f"Report posted! +{XP_CONFIG['photo_report']} XP",
        "data": {
            "report": new_report,
            "xp_result": xp_result,
            "badges_earned": badges_earned
        }
    }

@app.post("/api/reports/{report_id}/upvote")
def upvote_report(report_id: int):
    """Upvote a road report. Awards gems to the reporter."""
    report = next((r for r in road_reports_db if r["id"] == report_id), None)
    if not report:
        return {"success": False, "message": "Report not found"}
    
    if current_user_id in report["upvoters"]:
        return {"success": False, "message": "Already upvoted"}
    
    if report["user_id"] == current_user_id:
        return {"success": False, "message": "Cannot upvote your own report"}
    
    # Add upvote
    report["upvotes"] += 1
    report["upvoters"].append(current_user_id)
    
    # Award gems to report creator (10 gems per upvote)
    reporter_id = report["user_id"]
    if reporter_id in users_db:
        users_db[reporter_id]["gems"] = users_db[reporter_id].get("gems", 0) + 10
        users_db[reporter_id]["reports_upvotes_received"] = users_db[reporter_id].get("reports_upvotes_received", 0) + 1
        
        # Check for community badge unlocks for reporter
        check_community_badges(reporter_id)
    
    return {
        "success": True,
        "message": "Upvoted! Reporter earned 10 gems",
        "data": {
            "report_id": report_id,
            "new_upvote_count": report["upvotes"],
            "gems_awarded": 10
        }
    }

@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int):
    """Delete a road report (only owner can delete)"""
    global road_reports_db
    report = next((r for r in road_reports_db if r["id"] == report_id), None)
    
    if not report:
        return {"success": False, "message": "Report not found"}
    
    if report["user_id"] != current_user_id:
        return {"success": False, "message": "Can only delete your own reports"}
    
    road_reports_db = [r for r in road_reports_db if r["id"] != report_id]
    return {"success": True, "message": "Report deleted"}

@app.get("/api/reports/my")
def get_my_reports():
    """Get current user's reports"""
    my_reports = [r for r in road_reports_db if r["user_id"] == current_user_id]
    total_upvotes = sum(r["upvotes"] for r in my_reports)
    
    return {
        "success": True,
        "data": my_reports,
        "stats": {
            "total_reports": len(my_reports),
            "total_upvotes": total_upvotes,
            "gems_from_upvotes": total_upvotes * 10
        }
    }

# ==================== COMMUNITY BADGES ====================
def check_community_badges(user_id: str) -> list:
    """Check and award community badges. Returns list of newly earned badges."""
    if user_id not in users_db:
        return []
    
    user = users_db[user_id]
    earned = user.get("community_badges", [])
    newly_earned = []
    
    reports_count = user.get("reports_posted", 0)
    upvotes_count = user.get("reports_upvotes_received", 0)
    
    badge_checks = {
        1: reports_count >= 1,  # First Report
        2: upvotes_count >= 10,  # Helpful Driver
        3: reports_count >= 10,  # Road Guardian
        4: upvotes_count >= 50,  # Community Hero
        8: upvotes_count >= 100,  # Eagle Eye
        17: upvotes_count >= 200,  # Influencer
        18: reports_count >= 100,  # Veteran Reporter
        19: upvotes_count >= 500,  # Community Champion
    }
    
    for badge_id, condition in badge_checks.items():
        if condition and badge_id not in earned:
            earned.append(badge_id)
            newly_earned.append(badge_id)
    
    users_db[user_id]["community_badges"] = earned
    return newly_earned

@app.get("/api/badges/community")
def get_community_badges():
    """Get all community badges with user's earn status"""
    user = users_db.get(current_user_id, {})
    earned_ids = set(user.get("community_badges", []))
    
    badges = []
    for badge in COMMUNITY_BADGES:
        badges.append({
            **badge,
            "earned": badge["id"] in earned_ids,
        })
    
    return {
        "success": True,
        "data": badges,
        "earned_count": len(earned_ids),
        "total_count": len(COMMUNITY_BADGES)
    }

# ==================== SAFE DRIVING & TRIP COMPLETION ====================
class TripResult(BaseModel):
    distance: float  # miles
    duration: int  # minutes
    safety_metrics: dict  # {hard_brakes: 0, speeding_incidents: 0, phone_usage: 0}

@app.post("/api/trips/complete-with-safety")
def complete_trip_with_safety(trip: TripResult):
    """Complete a trip with safety metrics. Awards XP based on driving behavior."""
    user = users_db.get(current_user_id, {})
    
    # Calculate if it was a safe drive
    metrics = trip.safety_metrics
    is_safe_drive = (
        metrics.get("hard_brakes", 0) == 0 and
        metrics.get("speeding_incidents", 0) == 0 and
        metrics.get("phone_usage", 0) == 0
    )
    
    # Calculate safety score change
    old_safety_score = user.get("safety_score", 85)
    penalties = (
        metrics.get("hard_brakes", 0) * 2 +
        metrics.get("speeding_incidents", 0) * 3 +
        metrics.get("phone_usage", 0) * 5
    )
    
    # Adjust safety score
    if is_safe_drive:
        new_safety_score = min(100, old_safety_score + 1)
    else:
        new_safety_score = max(0, old_safety_score - penalties)
    
    safety_improved = new_safety_score > old_safety_score
    safety_dropped = new_safety_score < old_safety_score
    
    # Update user
    if current_user_id in users_db:
        users_db[current_user_id]["safety_score"] = new_safety_score
        users_db[current_user_id]["total_trips"] = user.get("total_trips", 0) + 1
        users_db[current_user_id]["total_miles"] = user.get("total_miles", 0) + trip.distance
    
    # XP rewards/penalties
    xp_changes = []
    total_xp = 0
    
    if is_safe_drive:
        # Safe drive XP
        total_xp += XP_CONFIG["safe_drive"]
        xp_changes.append({"type": "safe_drive", "xp": XP_CONFIG["safe_drive"]})
        
        # Update safe drive streak
        old_streak = user.get("safe_drive_streak", 0)
        new_streak = old_streak + 1
        users_db[current_user_id]["safe_drive_streak"] = new_streak
        
        # Consistent driving bonus (every 3 safe drives)
        if new_streak % 3 == 0:
            total_xp += XP_CONFIG["consistent_driving"]
            xp_changes.append({"type": "consistent_bonus", "xp": XP_CONFIG["consistent_driving"]})
    else:
        # Reset streak
        users_db[current_user_id]["safe_drive_streak"] = 0
        
        # Safety penalty
        if safety_dropped:
            total_xp += XP_CONFIG["safety_score_penalty"]  # Negative
            xp_changes.append({"type": "safety_penalty", "xp": XP_CONFIG["safety_score_penalty"]})
    
    # Apply XP
    xp_result = add_xp_to_user(current_user_id, total_xp) if total_xp != 0 else {}
    
    # Award gems (base 5, multiplied by plan)
    gem_multiplier = user.get("gem_multiplier", 1)
    gems_earned = 5 * gem_multiplier
    if current_user_id in users_db:
        users_db[current_user_id]["gems"] = user.get("gems", 0) + gems_earned
    
    return {
        "success": True,
        "message": "Trip completed!",
        "data": {
            "is_safe_drive": is_safe_drive,
            "safety_score": {
                "old": old_safety_score,
                "new": new_safety_score,
                "change": new_safety_score - old_safety_score,
            },
            "xp": {
                "changes": xp_changes,
                "total_earned": total_xp,
                "result": xp_result,
            },
            "gems": {
                "earned": gems_earned,
                "multiplier": gem_multiplier,
            },
            "safe_drive_streak": users_db[current_user_id].get("safe_drive_streak", 0),
        }
    }

# ==================== CHALLENGES ====================
challenges_db = []

class ChallengeCreate(BaseModel):
    opponent_id: str
    stake: int
    duration_hours: int

@app.post("/api/challenges")
def create_challenge(challenge: ChallengeCreate):
    """Create a head-to-head safe driving challenge."""
    user = users_db.get(current_user_id, {})
    opponent = users_db.get(challenge.opponent_id, {})
    
    if not opponent:
        raise HTTPException(status_code=404, detail="Opponent not found")
    
    if user.get("gems", 0) < challenge.stake:
        raise HTTPException(status_code=400, detail="Not enough gems")
    
    # Deduct stake from challenger
    users_db[current_user_id]["gems"] = user.get("gems", 0) - challenge.stake
    
    new_challenge = {
        "id": str(len(challenges_db) + 1),
        "challenger_id": current_user_id,
        "opponent_id": challenge.opponent_id,
        "challenger_name": user.get("name", "Unknown"),
        "opponent_name": opponent.get("name", "Unknown"),
        "stake": challenge.stake,
        "duration_hours": challenge.duration_hours,
        "status": "pending",  # pending, active, completed
        "your_score": user.get("safety_score", 85),
        "opponent_score": opponent.get("safety_score", 85),
        "created_at": datetime.now().isoformat(),
        "ends_at": (datetime.now() + timedelta(hours=challenge.duration_hours)).isoformat(),
    }
    
    challenges_db.append(new_challenge)
    
    return {
        "success": True,
        "message": f"Challenge sent to {opponent.get('name')}!",
        "data": new_challenge
    }

@app.get("/api/challenges")
def get_challenges():
    """Get user's active and past challenges."""
    user_challenges = [
        c for c in challenges_db 
        if c["challenger_id"] == current_user_id or c["opponent_id"] == current_user_id
    ]
    
    return {
        "success": True,
        "data": user_challenges
    }

@app.post("/api/challenges/{challenge_id}/accept")
def accept_challenge(challenge_id: str):
    """Accept a pending challenge."""
    for c in challenges_db:
        if c["id"] == challenge_id and c["opponent_id"] == current_user_id:
            user = users_db.get(current_user_id, {})
            if user.get("gems", 0) < c["stake"]:
                raise HTTPException(status_code=400, detail="Not enough gems to accept")
            
            # Deduct stake
            users_db[current_user_id]["gems"] = user.get("gems", 0) - c["stake"]
            c["status"] = "active"
            
            return {"success": True, "message": "Challenge accepted!", "data": c}
    
    raise HTTPException(status_code=404, detail="Challenge not found")

# ==================== DRIVING SCORE ====================
@app.get("/api/driving-score")
def get_driving_score():
    """Get detailed driving score breakdown for premium users."""
    user = users_db.get(current_user_id, {})
    
    # Generate mock driving metrics based on user's safety score
    base_score = user.get("safety_score", 85)
    
    # Vary metrics around the base score
    metrics = [
        {
            "id": "speed",
            "name": "Speed Compliance",
            "score": min(100, base_score + random.randint(-5, 10)),
            "trend": random.choice(["up", "stable", "up"]),
            "description": "Staying within speed limits"
        },
        {
            "id": "braking",
            "name": "Smooth Braking",
            "score": min(100, base_score + random.randint(-15, 5)),
            "trend": random.choice(["down", "stable", "up"]),
            "description": "Gradual, safe braking"
        },
        {
            "id": "acceleration",
            "name": "Smooth Acceleration",
            "score": min(100, base_score + random.randint(-8, 8)),
            "trend": random.choice(["stable", "up"]),
            "description": "Gradual speed increases"
        },
        {
            "id": "following",
            "name": "Following Distance",
            "score": min(100, base_score + random.randint(-3, 10)),
            "trend": random.choice(["up", "stable"]),
            "description": "Safe distance from other cars"
        },
        {
            "id": "turns",
            "name": "Turn Signals",
            "score": min(100, base_score + random.randint(0, 12)),
            "trend": "up",
            "description": "Signaling before turns"
        },
        {
            "id": "focus",
            "name": "Focus Time",
            "score": min(100, base_score + random.randint(-10, 5)),
            "trend": random.choice(["stable", "down", "up"]),
            "description": "Minimal phone distractions"
        },
    ]
    
    # Find lowest scores for tips
    sorted_metrics = sorted(metrics, key=lambda x: x["score"])
    
    orion_tips = []
    tip_templates = {
        "speed": "Try using cruise control on highways to maintain consistent speeds.",
        "braking": "Start braking a bit earlier. This gives you more control and is easier on your passengers!",
        "acceleration": "Ease into the gas pedal when starting from stops. Your car (and wallet) will thank you!",
        "following": "The 3-second rule is your friend! Pick a point and count after the car ahead passes it.",
        "turns": "Great job with turn signals! Keep signaling even when you think no one is around.",
        "focus": "Mount your phone for hands-free navigation. Staying focused is key to safe driving!",
    }
    
    for i, metric in enumerate(sorted_metrics[:3]):
        priority = "high" if i == 0 else ("medium" if i == 1 else "low")
        orion_tips.append({
            "id": str(i + 1),
            "metric": metric["id"],
            "tip": tip_templates.get(metric["id"], "Keep up the great driving!"),
            "priority": priority
        })
    
    # Calculate overall score as weighted average
    overall_score = sum(m["score"] for m in metrics) // len(metrics)
    
    return {
        "success": True,
        "data": {
            "overall_score": overall_score,
            "metrics": metrics,
            "orion_tips": orion_tips,
            "last_updated": datetime.now().isoformat()
        }
    }

@app.get("/api/challenges/history")
def get_challenge_history():
    """Get challenge history with stats and badges."""
    user_challenges = [
        c for c in challenges_db 
        if c["challenger_id"] == current_user_id or c["opponent_id"] == current_user_id
    ]
    
    # Calculate stats
    wins = sum(1 for c in user_challenges if c.get("status") == "won" or 
               (c["challenger_id"] == current_user_id and c.get("winner_id") == current_user_id))
    losses = sum(1 for c in user_challenges if c.get("status") == "lost" or
                 (c["challenger_id"] == current_user_id and c.get("winner_id") != current_user_id and c.get("status") == "completed"))
    draws = sum(1 for c in user_challenges if c.get("status") == "draw")
    
    total = wins + losses + draws
    win_rate = round((wins / total * 100) if total > 0 else 0)
    
    # Mock some additional data for demo
    total_gems_won = wins * 100  # Simplified
    total_gems_lost = losses * 100
    
    stats = {
        "total_challenges": len(user_challenges),
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "win_rate": win_rate,
        "total_gems_won": total_gems_won,
        "total_gems_lost": total_gems_lost,
        "current_streak": min(wins, 3),  # Simplified
        "best_streak": wins,
    }
    
    # Badge progress
    badges = [
        {"id": "first_win", "name": "First Victory", "description": "Win your first challenge", "icon": "trophy", "unlocked": wins >= 1},
        {"id": "win_streak_3", "name": "Hot Streak", "description": "Win 3 challenges in a row", "icon": "flame", "unlocked": stats["best_streak"] >= 3},
        {"id": "win_streak_5", "name": "On Fire", "description": "Win 5 challenges in a row", "icon": "fire", "unlocked": stats["best_streak"] >= 5},
        {"id": "total_wins_10", "name": "Champion", "description": "Win 10 total challenges", "icon": "crown", "unlocked": wins >= 10, "progress": wins, "total": 10},
        {"id": "total_wins_25", "name": "Legend", "description": "Win 25 total challenges", "icon": "star", "unlocked": wins >= 25, "progress": wins, "total": 25},
        {"id": "gems_earned_1k", "name": "Gem Collector", "description": "Earn 1,000 gems from challenges", "icon": "gem", "unlocked": total_gems_won >= 1000, "progress": total_gems_won, "total": 1000},
        {"id": "perfect_score", "name": "Perfect Driver", "description": "Win with 100 safety score", "icon": "shield", "unlocked": False},
        {"id": "comeback_king", "name": "Comeback King", "description": "Win after being behind at halftime", "icon": "trending", "unlocked": False},
    ]
    
    return {
        "success": True,
        "data": {
            "challenges": user_challenges,
            "stats": stats,
            "badges": badges,
        }
    }

# ==================== WEEKLY RECAP (PREMIUM) ====================
@app.get("/api/weekly-recap")
def get_weekly_recap():
    """Get weekly stats summary for premium users."""
    user = users_db.get(current_user_id, {})
    
    # Calculate weekly stats (mock data based on user profile)
    base_trips = random.randint(8, 15)
    base_miles = base_trips * random.uniform(10, 25)
    
    stats = {
        "total_trips": base_trips,
        "total_miles": round(base_miles, 1),
        "total_time_minutes": int(base_miles * 2.5),  # ~2.5 min per mile avg
        "gems_earned": random.randint(1500, 3500),
        "xp_earned": random.randint(10000, 20000),
        "safety_score_avg": user.get("safety_score", 85),
        "safety_score_change": random.randint(-2, 5),
        "challenges_won": random.randint(0, 3),
        "challenges_lost": random.randint(0, 2),
        "offers_redeemed": random.randint(2, 6),
        "reports_posted": user.get("reports_posted", 0),
        "streak_days": user.get("safe_drive_streak", 0),
        "rank_change": random.randint(0, 12),
        "highlights": [
            f"Best safety score: {min(100, user.get('safety_score', 85) + random.randint(2, 8))} on Wednesday",
            f"Longest trip: {random.randint(25, 60)} miles on Saturday",
            f"Helped {random.randint(10, 50)} drivers with your reports",
        ]
    }
    
    return {
        "success": True,
        "data": stats
    }

# ==================== BOOST SYSTEM ====================
# Pricing Configuration
BOOST_PRICING = {
    "base_daily_cost": 25,  # $25 for first day
    "additional_day_cost": 20,  # +$20 for each additional day
    "base_reach": 100,  # Base reach of 100 people
    "base_reach_cost": 5,  # $5 for 100 reach
    "reach_increment": 100,  # Increases by 100
    "reach_increment_cost": 10,  # +$10 per 100 increment
}

# Boosts Database
boosts_db = []

class BoostCreate(BaseModel):
    offer_id: int
    duration_days: int  # 1-30 days
    reach_target: int  # 100, 200, 300, etc.
    business_id: Optional[str] = None

class BoostCalculate(BaseModel):
    duration_days: int
    reach_target: int

@app.post("/api/boosts/calculate")
def calculate_boost_cost(calc: BoostCalculate):
    """Calculate the cost of a boost based on duration and reach."""
    # Duration cost: $25 base + $20 per additional day
    duration_cost = BOOST_PRICING["base_daily_cost"]
    if calc.duration_days > 1:
        duration_cost += (calc.duration_days - 1) * BOOST_PRICING["additional_day_cost"]
    
    # Reach cost: $5 for 100, +$10 per additional 100
    reach_increments = calc.reach_target // BOOST_PRICING["reach_increment"]
    reach_cost = BOOST_PRICING["base_reach_cost"]
    if reach_increments > 1:
        reach_cost += (reach_increments - 1) * BOOST_PRICING["reach_increment_cost"]
    
    total_cost = duration_cost + reach_cost
    
    return {
        "success": True,
        "data": {
            "duration_days": calc.duration_days,
            "reach_target": calc.reach_target,
            "duration_cost": duration_cost,
            "reach_cost": reach_cost,
            "total_cost": total_cost,
            "breakdown": {
                "duration": f"${BOOST_PRICING['base_daily_cost']} base + ${(calc.duration_days - 1) * BOOST_PRICING['additional_day_cost']} for {calc.duration_days - 1} extra days",
                "reach": f"${BOOST_PRICING['base_reach_cost']} for 100 + ${(reach_increments - 1) * BOOST_PRICING['reach_increment_cost']} for {(reach_increments - 1) * 100} extra reach"
            }
        }
    }

@app.post("/api/boosts/create")
def create_boost(boost: BoostCreate):
    """Create a new boost for an offer."""
    # Calculate cost
    calc_result = calculate_boost_cost(BoostCalculate(
        duration_days=boost.duration_days,
        reach_target=boost.reach_target
    ))
    
    new_boost = {
        "id": str(uuid.uuid4())[:8],
        "offer_id": boost.offer_id,
        "business_id": boost.business_id or "default_business",
        "duration_days": boost.duration_days,
        "reach_target": boost.reach_target,
        "total_cost": calc_result["data"]["total_cost"],
        "status": "active",
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=boost.duration_days)).isoformat(),
        "current_reach": 0,
        "impressions": 0,
        "clicks": 0,
    }
    
    boosts_db.append(new_boost)
    
    return {
        "success": True,
        "message": f"Boost created! ${calc_result['data']['total_cost']} charged.",
        "data": new_boost
    }

@app.get("/api/boosts")
def get_boosts(business_id: Optional[str] = None):
    """Get all boosts, optionally filtered by business."""
    if business_id:
        filtered = [b for b in boosts_db if b["business_id"] == business_id]
        return {"success": True, "data": filtered}
    return {"success": True, "data": boosts_db}

@app.get("/api/boosts/{boost_id}")
def get_boost(boost_id: str):
    """Get a specific boost."""
    boost = next((b for b in boosts_db if b["id"] == boost_id), None)
    if not boost:
        raise HTTPException(status_code=404, detail="Boost not found")
    return {"success": True, "data": boost}

@app.delete("/api/boosts/{boost_id}")
def cancel_boost(boost_id: str):
    """Cancel a boost."""
    global boosts_db
    boost = next((b for b in boosts_db if b["id"] == boost_id), None)
    if not boost:
        raise HTTPException(status_code=404, detail="Boost not found")
    boost["status"] = "cancelled"
    return {"success": True, "message": "Boost cancelled"}

# ==================== AI IMAGE GENERATION ====================
class ImageGenerateRequest(BaseModel):
    prompt: str
    offer_type: Optional[str] = None  # gas, cafe, restaurant, carwash, etc.

# Store generated images
generated_images_db = {}

@app.post("/api/images/generate")
async def generate_offer_image(request: ImageGenerateRequest):
    """Generate an AI image for an offer.
    
    DEPLOYMENT NOTE: This endpoint requires an AI image generation service.
    Options to implement:
    1. OpenAI DALL-E 3: pip install openai, use openai.images.generate()
    2. Stability AI: pip install stability-sdk
    3. Replicate: pip install replicate
    4. Self-hosted Stable Diffusion
    
    For now, returns a placeholder response. Replace with your preferred provider.
    """
    try:
        # Get API key from environment (configure for your chosen provider)
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("IMAGE_API_KEY")
        
        if not api_key:
            # Return a mock response for development without API key
            image_id = str(uuid.uuid4())[:8]
            generated_images_db[image_id] = {
                "id": image_id,
                "data": None,
                "placeholder": True,
                "prompt": request.prompt,
                "created_at": datetime.now().isoformat()
            }
            return {
                "success": True,
                "data": {
                    "image_id": image_id,
                    "placeholder": True,
                    "message": "API key not configured. Using placeholder. Set OPENAI_API_KEY or IMAGE_API_KEY in .env"
                }
            }
        
        # TODO: Implement your chosen image generation provider here
        # Example for OpenAI DALL-E 3:
        # 
        # from openai import OpenAI
        # client = OpenAI(api_key=api_key)
        # 
        # enhanced_prompt = f"Professional marketing image: {request.prompt}"
        # response = client.images.generate(
        #     model="dall-e-3",
        #     prompt=enhanced_prompt,
        #     size="1024x1024",
        #     quality="standard",
        #     n=1,
        # )
        # image_url = response.data[0].url
        # 
        # # Download and store
        # import requests
        # img_response = requests.get(image_url)
        # image_data = base64.b64encode(img_response.content).decode()
        
        # Create enhanced prompt for marketing image
        enhanced_prompt = f"""Create a professional, eye-catching promotional marketing image for this offer: {request.prompt}. 
        Make it vibrant, modern, and suitable for a mobile app. Include visual elements that represent the offer type.
        Style: Clean, professional, marketing material with bold colors."""
        
        if request.offer_type:
            type_hints = {
                "gas": "Include gas station, fuel pump, or car elements",
                "cafe": "Include coffee cups, cozy cafe atmosphere",
                "restaurant": "Include delicious food, dining atmosphere",
                "carwash": "Include clean shiny car, water droplets, soap suds",
                "retail": "Include shopping bags, store front",
                "entertainment": "Include fun, vibrant entertainment elements",
            }
            if request.offer_type in type_hints:
                enhanced_prompt += f" {type_hints[request.offer_type]}"
        
        # Placeholder response - implement your provider above
        image_id = str(uuid.uuid4())[:8]
        generated_images_db[image_id] = {
            "id": image_id,
            "data": None,
            "placeholder": True,
            "prompt": request.prompt,
            "enhanced_prompt": enhanced_prompt,
            "created_at": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "data": {
                "image_id": image_id,
                "placeholder": True,
                "message": "Image generation endpoint ready. Implement your preferred AI provider."
            }
        }
            
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/images/{image_id}")
def get_generated_image(image_id: str):
    """Get a generated image by ID."""
    if image_id not in generated_images_db:
        raise HTTPException(status_code=404, detail="Image not found")
    
    img = generated_images_db[image_id]
    return {
        "success": True,
        "data": {
            "image_id": img["id"],
            "image_base64": f"data:{img['mime_type']};base64,{img['data']}",
            "created_at": img["created_at"]
        }
    }

# ==================== BUSINESS ANALYTICS ====================
# Analytics database for real-time tracking
analytics_db = {
    "default_business": {
        "views": [],
        "redemptions": [],
        "clicks": [],
        "revenue": 0,
        "total_savings": 0,
    }
}

class AnalyticsEvent(BaseModel):
    event_type: str  # view, click, redemption
    offer_id: int
    business_id: Optional[str] = "default_business"
    user_location: Optional[dict] = None

@app.post("/api/analytics/track")
def track_analytics_event(event: AnalyticsEvent):
    """Track an analytics event."""
    if event.business_id not in analytics_db:
        analytics_db[event.business_id] = {
            "views": [], "redemptions": [], "clicks": [],
            "revenue": 0, "total_savings": 0
        }
    
    event_data = {
        "offer_id": event.offer_id,
        "timestamp": datetime.now().isoformat(),
        "location": event.user_location
    }
    
    if event.event_type == "view":
        analytics_db[event.business_id]["views"].append(event_data)
    elif event.event_type == "click":
        analytics_db[event.business_id]["clicks"].append(event_data)
    elif event.event_type == "redemption":
        analytics_db[event.business_id]["redemptions"].append(event_data)
        analytics_db[event.business_id]["revenue"] += random.randint(10, 50)
        analytics_db[event.business_id]["total_savings"] += random.randint(5, 20)
    
    return {"success": True, "message": "Event tracked"}

@app.get("/api/analytics/dashboard")
def get_analytics_dashboard(business_id: str = "default_business", days: int = 7):
    """Get comprehensive analytics for business dashboard."""
    if business_id not in analytics_db:
        analytics_db[business_id] = {
            "views": [], "redemptions": [], "clicks": [],
            "revenue": 0, "total_savings": 0
        }
    
    data = analytics_db[business_id]
    
    # Generate mock historical data for charts
    chart_data = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=days-1-i)).strftime("%b %d")
        chart_data.append({
            "date": date,
            "views": random.randint(50, 200),
            "clicks": random.randint(20, 80),
            "redemptions": random.randint(5, 30),
            "revenue": random.randint(100, 500),
        })
    
    # Calculate totals
    total_views = sum(d["views"] for d in chart_data)
    total_clicks = sum(d["clicks"] for d in chart_data)
    total_redemptions = sum(d["redemptions"] for d in chart_data)
    total_revenue = sum(d["revenue"] for d in chart_data)
    
    # CTR calculation
    ctr = round((total_clicks / total_views * 100), 1) if total_views > 0 else 0
    conversion_rate = round((total_redemptions / total_clicks * 100), 1) if total_clicks > 0 else 0
    
    # Geographic data (mock)
    geo_data = [
        {"city": "Columbus", "lat": 39.9612, "lng": -82.9988, "redemptions": random.randint(20, 50)},
        {"city": "Dublin", "lat": 40.0992, "lng": -83.1141, "redemptions": random.randint(10, 30)},
        {"city": "Westerville", "lat": 40.1262, "lng": -82.9291, "redemptions": random.randint(8, 25)},
        {"city": "Grove City", "lat": 39.8812, "lng": -83.0930, "redemptions": random.randint(5, 20)},
        {"city": "Reynoldsburg", "lat": 39.9573, "lng": -82.8121, "redemptions": random.randint(5, 15)},
    ]
    
    # Hourly distribution
    hourly_data = []
    for hour in range(24):
        hourly_data.append({
            "hour": f"{hour:02d}:00",
            "redemptions": random.randint(0, 15) if 6 <= hour <= 22 else random.randint(0, 3)
        })
    
    return {
        "success": True,
        "data": {
            "summary": {
                "total_views": total_views,
                "total_clicks": total_clicks,
                "total_redemptions": total_redemptions,
                "total_revenue": total_revenue,
                "ctr": ctr,
                "conversion_rate": conversion_rate,
                "avg_order_value": round(total_revenue / total_redemptions, 2) if total_redemptions > 0 else 0,
            },
            "chart_data": chart_data,
            "geo_data": geo_data,
            "hourly_data": hourly_data,
            "top_offers": [
                {"name": "15% Off First Visit", "redemptions": random.randint(50, 150), "revenue": random.randint(500, 1500)},
                {"name": "Weekend Special", "redemptions": random.randint(30, 100), "revenue": random.randint(300, 900)},
                {"name": "Loyalty Bonus", "redemptions": random.randint(20, 60), "revenue": random.randint(200, 600)},
            ],
            "recent_activity": [
                {"type": "redemption", "offer": "15% Off First Visit", "time": "2 minutes ago", "location": "Columbus"},
                {"type": "view", "offer": "Weekend Special", "time": "5 minutes ago", "location": "Dublin"},
                {"type": "redemption", "offer": "Loyalty Bonus", "time": "12 minutes ago", "location": "Westerville"},
                {"type": "click", "offer": "15% Off First Visit", "time": "18 minutes ago", "location": "Grove City"},
            ]
        }
    }

# ==================== ADMIN FEATURES ====================
# Admin-created offers on behalf of businesses
admin_offers_db = []

class AdminOfferCreate(BaseModel):
    business_name: str
    business_id: Optional[str] = None
    business_type: str
    description: str
    discount_percent: int
    base_gems: int
    lat: float
    lng: float
    expires_hours: int = 24
    image_id: Optional[str] = None

@app.post("/api/admin/offers/create")
def admin_create_offer(offer: AdminOfferCreate):
    """Admin creates an offer on behalf of a business."""
    new_id = max([o["id"] for o in offers_db], default=0) + 1
    new_offer = {
        "id": new_id,
        "business_name": offer.business_name,
        "business_id": offer.business_id or f"biz_{new_id}",
        "business_type": offer.business_type,
        "description": offer.description,
        "discount_percent": offer.discount_percent,
        "base_gems": offer.base_gems,
        "lat": offer.lat,
        "lng": offer.lng,
        "is_admin_offer": True,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
        "created_by": "admin",
        "redemption_count": 0,
        "image_id": offer.image_id,
    }
    offers_db.append(new_offer)
    admin_offers_db.append(new_offer)
    
    return {"success": True, "message": f"Offer created for {offer.business_name}", "data": new_offer}

@app.get("/api/admin/export/offers")
def export_offers(format: str = "json"):
    """Export all offers as JSON or CSV."""
    export_data = []
    for offer in offers_db:
        export_data.append({
            "id": offer["id"],
            "business_name": offer["business_name"],
            "business_type": offer["business_type"],
            "description": offer["description"],
            "discount_percent": offer.get("discount_percent", 0),
            "base_gems": offer["base_gems"],
            "lat": offer["lat"],
            "lng": offer["lng"],
            "created_at": offer["created_at"],
            "expires_at": offer["expires_at"],
            "redemption_count": offer.get("redemption_count", 0),
        })
    
    if format == "csv":
        # Generate CSV string
        if not export_data:
            return {"success": True, "data": "", "format": "csv"}
        
        headers = list(export_data[0].keys())
        csv_lines = [",".join(headers)]
        for row in export_data:
            csv_lines.append(",".join(str(row.get(h, "")) for h in headers))
        
        return {"success": True, "data": "\n".join(csv_lines), "format": "csv", "count": len(export_data)}
    
    return {"success": True, "data": export_data, "format": "json", "count": len(export_data)}

@app.get("/api/admin/export/users")
def export_users(format: str = "json"):
    """Export all users as JSON or CSV."""
    export_data = []
    for uid, user in users_db.items():
        export_data.append({
            "id": user["id"],
            "name": user["name"],
            "plan": user.get("plan", "basic"),
            "gems": user.get("gems", 0),
            "level": user.get("level", 1),
            "safety_score": user.get("safety_score", 0),
            "total_miles": user.get("total_miles", 0),
            "total_trips": user.get("total_trips", 0),
            "state": user.get("state", ""),
            "member_since": user.get("member_since", ""),
        })
    
    if format == "csv":
        if not export_data:
            return {"success": True, "data": "", "format": "csv"}
        
        headers = list(export_data[0].keys())
        csv_lines = [",".join(headers)]
        for row in export_data:
            csv_lines.append(",".join(str(row.get(h, "")) for h in headers))
        
        return {"success": True, "data": "\n".join(csv_lines), "format": "csv", "count": len(export_data)}
    
    return {"success": True, "data": export_data, "format": "json", "count": len(export_data)}

class OfferImport(BaseModel):
    offers: List[dict]

@app.post("/api/admin/import/offers")
def import_offers(import_data: OfferImport):
    """Import offers from JSON data."""
    imported_count = 0
    errors = []
    
    for offer_data in import_data.offers:
        try:
            new_id = max([o["id"] for o in offers_db], default=0) + 1
            new_offer = {
                "id": new_id,
                "business_name": offer_data.get("business_name", "Imported Business"),
                "business_type": offer_data.get("business_type", "retail"),
                "description": offer_data.get("description", ""),
                "base_gems": offer_data.get("base_gems", 25),
                "lat": offer_data.get("lat", 39.9612),
                "lng": offer_data.get("lng", -82.9988),
                "is_admin_offer": True,
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(hours=offer_data.get("expires_hours", 24))).isoformat(),
                "created_by": "admin_import",
                "redemption_count": 0,
            }
            offers_db.append(new_offer)
            imported_count += 1
        except Exception as e:
            errors.append(str(e))
    
    return {
        "success": True,
        "message": f"Imported {imported_count} offers",
        "data": {"imported": imported_count, "errors": errors}
    }

# ==================== ADMIN ANALYTICS ====================
@app.get("/api/admin/analytics")
def get_admin_analytics():
    """Get platform-wide analytics for admin dashboard."""
    total_users = len(users_db)
    premium_users = sum(1 for u in users_db.values() if u.get("is_premium", False))
    total_offers = len(offers_db)
    total_redemptions = sum(o.get("redemption_count", 0) for o in offers_db)
    
    # Generate chart data
    chart_data = []
    for i in range(30):
        date = (datetime.now() - timedelta(days=29-i)).strftime("%b %d")
        chart_data.append({
            "date": date,
            "new_users": random.randint(50, 200),
            "active_users": random.randint(500, 2000),
            "redemptions": random.randint(100, 500),
            "revenue": random.randint(5000, 20000),
        })
    
    return {
        "success": True,
        "data": {
            "summary": {
                "total_users": total_users,
                "premium_users": premium_users,
                "total_offers": total_offers,
                "total_redemptions": total_redemptions,
                "total_revenue": sum(d["revenue"] for d in chart_data),
                "avg_safety_score": round(sum(u.get("safety_score", 0) for u in users_db.values()) / total_users, 1) if total_users > 0 else 0,
            },
            "chart_data": chart_data,
            "user_growth": {
                "today": random.randint(100, 300),
                "this_week": random.randint(700, 1500),
                "this_month": random.randint(3000, 6000),
            },
            "top_partners": [
                {"name": "Shell Gas Station", "redemptions": random.randint(500, 1500)},
                {"name": "Starbucks Downtown", "redemptions": random.randint(400, 1200)},
                {"name": "Quick Shine Car Wash", "redemptions": random.randint(300, 800)},
            ],
        }
    }


# ==================== MAP SEARCH / AUTOCOMPLETE ====================
# Pre-defined locations for autocomplete (mock data for Columbus, OH area)
MAP_LOCATIONS = [
    {"id": 1, "name": "Downtown Columbus", "address": "100 N High St, Columbus, OH 43215", "lat": 39.9612, "lng": -82.9988, "type": "area"},
    {"id": 2, "name": "Ohio State University", "address": "281 W Lane Ave, Columbus, OH 43210", "lat": 40.0067, "lng": -83.0305, "type": "university"},
    {"id": 3, "name": "Easton Town Center", "address": "160 Easton Town Center, Columbus, OH 43219", "lat": 40.0507, "lng": -82.9137, "type": "shopping"},
    {"id": 4, "name": "Columbus Zoo", "address": "4850 W Powell Rd, Powell, OH 43065", "lat": 40.1560, "lng": -83.1186, "type": "attraction"},
    {"id": 5, "name": "Polaris Fashion Place", "address": "1500 Polaris Pkwy, Columbus, OH 43240", "lat": 40.1455, "lng": -82.9801, "type": "shopping"},
    {"id": 6, "name": "Short North Arts District", "address": "N High St, Columbus, OH 43201", "lat": 39.9775, "lng": -83.0037, "type": "entertainment"},
    {"id": 7, "name": "German Village", "address": "S Third St, Columbus, OH 43206", "lat": 39.9437, "lng": -82.9912, "type": "neighborhood"},
    {"id": 8, "name": "John Glenn Columbus Airport", "address": "4600 International Gateway, Columbus, OH 43219", "lat": 39.9980, "lng": -82.8919, "type": "airport"},
    {"id": 9, "name": "Nationwide Arena", "address": "200 W Nationwide Blvd, Columbus, OH 43215", "lat": 39.9692, "lng": -83.0059, "type": "venue"},
    {"id": 10, "name": "Ohio Stadium", "address": "411 Woody Hayes Dr, Columbus, OH 43210", "lat": 40.0017, "lng": -83.0196, "type": "stadium"},
    {"id": 11, "name": "COSI (Center of Science)", "address": "333 W Broad St, Columbus, OH 43215", "lat": 39.9576, "lng": -83.0064, "type": "museum"},
    {"id": 12, "name": "Franklin Park Conservatory", "address": "1777 E Broad St, Columbus, OH 43203", "lat": 39.9657, "lng": -82.9534, "type": "attraction"},
    {"id": 13, "name": "Columbus City Center", "address": "111 S 3rd St, Columbus, OH 43215", "lat": 39.9595, "lng": -82.9990, "type": "area"},
    {"id": 14, "name": "Scioto Mile Park", "address": "233 Civic Center Dr, Columbus, OH 43215", "lat": 39.9558, "lng": -83.0032, "type": "park"},
    {"id": 15, "name": "Ohio Statehouse", "address": "1 Capitol Square, Columbus, OH 43215", "lat": 39.9612, "lng": -82.9994, "type": "landmark"},
    {"id": 16, "name": "Shell Gas - Polaris", "address": "8799 Sancus Blvd, Columbus, OH 43240", "lat": 40.1430, "lng": -82.9805, "type": "gas"},
    {"id": 17, "name": "BP Gas - Downtown", "address": "150 E Broad St, Columbus, OH 43215", "lat": 39.9605, "lng": -82.9960, "type": "gas"},
    {"id": 18, "name": "Starbucks - Short North", "address": "785 N High St, Columbus, OH 43215", "lat": 39.9770, "lng": -83.0035, "type": "cafe"},
    {"id": 19, "name": "Chipotle - Campus", "address": "1726 N High St, Columbus, OH 43210", "lat": 40.0055, "lng": -83.0077, "type": "restaurant"},
    {"id": 20, "name": "Target - Easton", "address": "3893 Morse Rd, Columbus, OH 43219", "lat": 40.0484, "lng": -82.9183, "type": "shopping"},
]

class LocationSearch(BaseModel):
    query: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    limit: int = 8

@app.get("/api/map/search")
def search_map_locations(q: str = Query(..., min_length=1), lat: Optional[float] = None, lng: Optional[float] = None, limit: int = 8):
    """
    Search for locations by name or address.
    Returns matches sorted by relevance and optionally by distance if lat/lng provided.
    """
    query = q.lower().strip()
    results = []
    
    for loc in MAP_LOCATIONS:
        name_match = query in loc["name"].lower()
        address_match = query in loc["address"].lower()
        type_match = query in loc["type"].lower()
        
        if name_match or address_match or type_match:
            # Calculate relevance score
            relevance = 0
            if name_match:
                relevance += 10
                if loc["name"].lower().startswith(query):
                    relevance += 5
            if address_match:
                relevance += 5
            if type_match:
                relevance += 3
            
            # Calculate distance if user location provided
            distance = None
            if lat is not None and lng is not None:
                dlat = abs(loc["lat"] - lat)
                dlng = abs(loc["lng"] - lng)
                distance = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5  # km
            
            results.append({
                **loc,
                "relevance": relevance,
                "distance_km": round(distance, 2) if distance else None
            })
    
    # Sort by relevance (primary) and distance (secondary if available)
    results.sort(key=lambda x: (-x["relevance"], x["distance_km"] or 999))
    
    return {
        "success": True,
        "data": results[:limit],
        "query": q,
        "total_results": len(results)
    }

@app.get("/api/map/directions")
def get_mock_directions(
    origin_lat: float, 
    origin_lng: float, 
    dest_lat: float, 
    dest_lng: float,
    dest_name: Optional[str] = "Destination"
):
    """
    Get mock turn-by-turn directions between two points.
    In production, this would call Mapbox or Google Maps API.
    """
    # Calculate straight-line distance
    dlat = abs(dest_lat - origin_lat)
    dlng = abs(dest_lng - origin_lng)
    distance_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
    distance_miles = distance_km * 0.621371
    
    # Mock ETA based on average speed of 30 mph in city
    eta_minutes = int((distance_miles / 30) * 60) + random.randint(2, 8)
    
    # Generate mock turn-by-turn instructions
    # Determine general direction
    lat_diff = dest_lat - origin_lat
    lng_diff = dest_lng - origin_lng
    
    if abs(lat_diff) > abs(lng_diff):
        primary_direction = "north" if lat_diff > 0 else "south"
    else:
        primary_direction = "east" if lng_diff > 0 else "west"
    
    # Mock street names
    streets = ["High St", "Broad St", "Main St", "3rd Ave", "Lane Ave", "Spring St", "Neil Ave", "Summit St"]
    
    steps = [
        {
            "instruction": "Head " + primary_direction + " on Current Street",
            "distance": f"{round(distance_miles * 0.15, 1)} mi",
            "duration": f"{int(eta_minutes * 0.15)} min",
            "maneuver": "straight"
        },
        {
            "instruction": f"Turn right onto {random.choice(streets)}",
            "distance": f"{round(distance_miles * 0.25, 1)} mi",
            "duration": f"{int(eta_minutes * 0.25)} min",
            "maneuver": "turn-right"
        },
        {
            "instruction": f"Continue on {random.choice(streets)}",
            "distance": f"{round(distance_miles * 0.3, 1)} mi",
            "duration": f"{int(eta_minutes * 0.3)} min",
            "maneuver": "straight"
        },
        {
            "instruction": f"Turn left onto {random.choice(streets)}",
            "distance": f"{round(distance_miles * 0.2, 1)} mi",
            "duration": f"{int(eta_minutes * 0.2)} min",
            "maneuver": "turn-left"
        },
        {
            "instruction": f"Arrive at {dest_name}",
            "distance": f"{round(distance_miles * 0.1, 1)} mi",
            "duration": f"{int(eta_minutes * 0.1)} min",
            "maneuver": "arrive"
        },
    ]
    
    return {
        "success": True,
        "data": {
            "origin": {"lat": origin_lat, "lng": origin_lng},
            "destination": {"lat": dest_lat, "lng": dest_lng, "name": dest_name},
            "distance": {
                "km": round(distance_km, 2),
                "miles": round(distance_miles, 2),
                "text": f"{round(distance_miles, 1)} mi"
            },
            "duration": {
                "minutes": eta_minutes,
                "text": f"{eta_minutes} min"
            },
            "steps": steps,
            "route_type": "fastest",
            "traffic": random.choice(["light", "moderate", "heavy"]),
        }
    }


# ==================== PARTNER PLANS & LOCATIONS ====================
# Partner plan configuration with location limits
PARTNER_PLANS = {
    "starter": {
        "name": "Starter",
        "price_founders": 20.99,
        "price_public": 34.99,
        "max_locations": 5,
        "features": [
            "Up to 5 locations",
            "Gem placement on map", 
            "Offer creation & tracking",
            "Foot traffic insights",
            "Business support"
        ]
    },
    "growth": {
        "name": "Growth",
        "price_founders": 49.99,
        "price_public": 79.99,
        "max_locations": 25,
        "features": [
            "Everything in Starter",
            "Up to 25 locations",
            "Advanced analytics",
            "Featured placement",
            "Team access"
        ]
    },
    "enterprise": {
        "name": "Enterprise",
        "price_founders": None,  # Custom pricing
        "price_public": None,
        "max_locations": 999999,  # Unlimited
        "features": [
            "Unlimited locations",
            "Everything in Growth",
            "Quarterly reviews",
            "Full API access",
            "Dedicated account manager"
        ]
    }
}

# Partner database - stores partner accounts and their locations
partners_db = {
    "default_partner": {
        "id": "default_partner",
        "business_name": "Demo Business",
        "email": "partner@demo.com",
        "plan": "starter",
        "is_founders": True,
        "locations": [
            {
                "id": 1,
                "name": "Main Store - Downtown",
                "address": "100 N High St, Columbus, OH 43215",
                "lat": 39.9612,
                "lng": -82.9988,
                "is_primary": True,
                "created_at": datetime.now().isoformat()
            }
        ],
        "created_at": datetime.now().isoformat()
    }
}

# Models for partner operations
class PartnerLocation(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    is_primary: bool = False

class PartnerPlanUpdate(BaseModel):
    plan: str  # starter, growth, enterprise

class PartnerOfferCreate(BaseModel):
    title: str
    description: str
    discount_percent: int
    gems_reward: int
    location_id: int  # Which location this offer is for
    expires_hours: int = 168  # 7 days default
    image_url: Optional[str] = None

# Get partner plans info
@app.get("/api/partner/plans")
def get_partner_plans():
    """Get available partner plans with pricing and features."""
    return {
        "success": True,
        "data": {
            "plans": PARTNER_PLANS,
            "is_founders_active": True  # Founders pricing is currently active
        }
    }

# Get partner profile with locations
@app.get("/api/partner/profile")
def get_partner_profile(partner_id: str = "default_partner"):
    """Get partner profile including plan and locations."""
    partner = partners_db.get(partner_id)
    if not partner:
        # Create a default partner if doesn't exist
        partners_db[partner_id] = {
            "id": partner_id,
            "business_name": "New Business",
            "email": "",
            "plan": "starter",
            "is_founders": True,
            "locations": [],
            "created_at": datetime.now().isoformat()
        }
        partner = partners_db[partner_id]
    
    plan_info = PARTNER_PLANS.get(partner["plan"], PARTNER_PLANS["starter"])
    
    return {
        "success": True,
        "data": {
            "id": partner["id"],
            "business_name": partner["business_name"],
            "email": partner.get("email", ""),
            "plan": partner["plan"],
            "plan_info": plan_info,
            "is_founders": partner.get("is_founders", True),
            "locations": partner["locations"],
            "location_count": len(partner["locations"]),
            "max_locations": plan_info["max_locations"],
            "can_add_location": len(partner["locations"]) < plan_info["max_locations"],
            "created_at": partner["created_at"]
        }
    }

# Update partner plan
@app.post("/api/partner/plan")
def update_partner_plan(plan_update: PartnerPlanUpdate, partner_id: str = "default_partner"):
    """Update partner's subscription plan."""
    if plan_update.plan not in PARTNER_PLANS:
        return {"success": False, "message": "Invalid plan"}
    
    if partner_id not in partners_db:
        return {"success": False, "message": "Partner not found"}
    
    partners_db[partner_id]["plan"] = plan_update.plan
    plan_info = PARTNER_PLANS[plan_update.plan]
    
    return {
        "success": True,
        "message": f"Plan updated to {plan_info['name']}",
        "data": {
            "plan": plan_update.plan,
            "max_locations": plan_info["max_locations"],
            "features": plan_info["features"]
        }
    }

# Get partner locations
@app.get("/api/partner/locations")
def get_partner_locations(partner_id: str = "default_partner"):
    """Get all locations for a partner."""
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found", "data": []}
    
    plan_info = PARTNER_PLANS.get(partner["plan"], PARTNER_PLANS["starter"])
    
    return {
        "success": True,
        "data": partner["locations"],
        "count": len(partner["locations"]),
        "max_locations": plan_info["max_locations"],
        "can_add_more": len(partner["locations"]) < plan_info["max_locations"]
    }

# Add a new location
@app.post("/api/partner/locations")
def add_partner_location(location: PartnerLocation, partner_id: str = "default_partner"):
    """Add a new location for a partner."""
    if partner_id not in partners_db:
        partners_db[partner_id] = {
            "id": partner_id,
            "business_name": "New Business",
            "email": "",
            "plan": "starter",
            "is_founders": True,
            "locations": [],
            "created_at": datetime.now().isoformat()
        }
    
    partner = partners_db[partner_id]
    plan_info = PARTNER_PLANS.get(partner["plan"], PARTNER_PLANS["starter"])
    
    # Check location limit
    if len(partner["locations"]) >= plan_info["max_locations"]:
        return {
            "success": False,
            "message": f"Location limit reached ({plan_info['max_locations']}). Upgrade your plan for more locations.",
            "data": {
                "current_count": len(partner["locations"]),
                "max_locations": plan_info["max_locations"],
                "upgrade_needed": True
            }
        }
    
    # Create new location
    new_id = max([loc["id"] for loc in partner["locations"]], default=0) + 1
    
    # If this is the first location or marked as primary, update others
    if location.is_primary or len(partner["locations"]) == 0:
        for loc in partner["locations"]:
            loc["is_primary"] = False
        location.is_primary = True
    
    new_location = {
        "id": new_id,
        "name": location.name,
        "address": location.address,
        "lat": location.lat,
        "lng": location.lng,
        "is_primary": location.is_primary,
        "created_at": datetime.now().isoformat()
    }
    
    partner["locations"].append(new_location)
    
    return {
        "success": True,
        "message": f"Location '{location.name}' added successfully",
        "data": new_location,
        "locations_remaining": plan_info["max_locations"] - len(partner["locations"])
    }

# Update a location
@app.put("/api/partner/locations/{location_id}")
def update_partner_location(location_id: int, location: PartnerLocation, partner_id: str = "default_partner"):
    """Update an existing location."""
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    
    loc_to_update = next((loc for loc in partner["locations"] if loc["id"] == location_id), None)
    if not loc_to_update:
        return {"success": False, "message": "Location not found"}
    
    # Update location details
    loc_to_update["name"] = location.name
    loc_to_update["address"] = location.address
    loc_to_update["lat"] = location.lat
    loc_to_update["lng"] = location.lng
    
    # Handle primary status
    if location.is_primary:
        for loc in partner["locations"]:
            loc["is_primary"] = loc["id"] == location_id
    
    return {
        "success": True,
        "message": "Location updated successfully",
        "data": loc_to_update
    }

# Delete a location
@app.delete("/api/partner/locations/{location_id}")
def delete_partner_location(location_id: int, partner_id: str = "default_partner"):
    """Delete a location."""
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    
    loc_to_delete = next((loc for loc in partner["locations"] if loc["id"] == location_id), None)
    if not loc_to_delete:
        return {"success": False, "message": "Location not found"}
    
    partner["locations"] = [loc for loc in partner["locations"] if loc["id"] != location_id]
    
    # If deleted location was primary, make another one primary
    if loc_to_delete["is_primary"] and partner["locations"]:
        partner["locations"][0]["is_primary"] = True
    
    return {
        "success": True,
        "message": "Location deleted successfully",
        "remaining_locations": len(partner["locations"])
    }

# Set a location as primary
@app.post("/api/partner/locations/{location_id}/set-primary")
def set_primary_location(location_id: int, partner_id: str = "default_partner"):
    """Set a location as the primary/default location."""
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    
    found = False
    for loc in partner["locations"]:
        if loc["id"] == location_id:
            loc["is_primary"] = True
            found = True
        else:
            loc["is_primary"] = False
    
    if not found:
        return {"success": False, "message": "Location not found"}
    
    return {"success": True, "message": "Primary location updated"}

# Create an offer for a specific location
@app.post("/api/partner/offers")
def create_partner_offer(offer: PartnerOfferCreate, partner_id: str = "default_partner"):
    """Create an offer tied to a specific partner location."""
    partner = partners_db.get(partner_id)
    if not partner:
        return {"success": False, "message": "Partner not found"}
    
    # Find the selected location
    location = next((loc for loc in partner["locations"] if loc["id"] == offer.location_id), None)
    if not location:
        return {"success": False, "message": "Location not found. Please select a valid location."}
    
    # Create the offer with location data
    new_id = max([o["id"] for o in offers_db], default=0) + 1
    new_offer = {
        "id": new_id,
        "business_name": partner["business_name"],
        "business_type": "retail",  # Can be expanded
        "title": offer.title,
        "description": offer.description,
        "discount_percent": offer.discount_percent,
        "base_gems": offer.gems_reward,
        "lat": location["lat"],
        "lng": location["lng"],
        "location_id": offer.location_id,
        "location_name": location["name"],
        "location_address": location["address"],
        "is_admin_offer": False,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
        "created_by": partner_id,
        "redemption_count": 0,
        "views": 0,
        "status": "active",
        "image_url": offer.image_url,
    }
    
    offers_db.append(new_offer)
    
    return {
        "success": True,
        "message": f"Offer created at {location['name']}",
        "data": new_offer
    }

# Get partner's offers
@app.get("/api/partner/offers")
def get_partner_offers(partner_id: str = "default_partner"):
    """Get all offers created by a partner."""
    partner_offers = [o for o in offers_db if o.get("created_by") == partner_id]
    
    return {
        "success": True,
        "data": partner_offers,
        "count": len(partner_offers)
    }

# Update partner business info
@app.put("/api/partner/profile")
def update_partner_profile(business_name: Optional[str] = None, email: Optional[str] = None, partner_id: str = "default_partner"):
    """Update partner business information."""
    if partner_id not in partners_db:
        return {"success": False, "message": "Partner not found"}
    
    partner = partners_db[partner_id]
    if business_name:
        partner["business_name"] = business_name
    if email:
        partner["email"] = email
    
    return {"success": True, "message": "Profile updated", "data": partner}



# ==================== TRIP HISTORY & FUEL ANALYTICS ====================

# Trip history database - stores detailed trip records
trips_db = []

# Generate sample trip history for demo
def generate_sample_trips():
    trips = []
    base_date = datetime.now()
    
    routes = [
        {"origin": "Home", "destination": "Work", "distance": 12.5, "duration": 25},
        {"origin": "Work", "destination": "Home", "distance": 12.5, "duration": 28},
        {"origin": "Home", "destination": "Grocery Store", "distance": 3.2, "duration": 8},
        {"origin": "Home", "destination": "Gym", "distance": 5.1, "duration": 12},
        {"origin": "Home", "destination": "Downtown", "distance": 8.7, "duration": 18},
        {"origin": "Work", "destination": "Lunch Spot", "distance": 2.3, "duration": 6},
        {"origin": "Home", "destination": "Mall", "distance": 15.2, "duration": 22},
    ]
    
    for i in range(60):
        trip_date = base_date - timedelta(days=i // 3, hours=random.randint(6, 20))
        route = random.choice(routes)
        safety_score = random.randint(82, 100)
        
        # Calculate fuel usage (avg 30 mpg)
        fuel_used = route["distance"] / random.uniform(28, 35)
        
        trips.append({
            "id": i + 1,
            "date": trip_date.strftime("%Y-%m-%d"),
            "time": trip_date.strftime("%I:%M %p"),
            "origin": route["origin"],
            "destination": route["destination"],
            "distance_miles": route["distance"],
            "duration_minutes": route["duration"] + random.randint(-3, 5),
            "safety_score": safety_score,
            "gems_earned": (route["distance"] * 0.5 + (10 if safety_score >= 90 else 0)),
            "xp_earned": int(route["distance"] * 100 + safety_score * 5),
            "fuel_used_gallons": round(fuel_used, 3),
            "avg_speed_mph": round(route["distance"] / (route["duration"] / 60), 1),
            "route_coordinates": [
                {"lat": 39.9612 + random.uniform(-0.05, 0.05), "lng": -82.9988 + random.uniform(-0.05, 0.05)},
                {"lat": 39.9612 + random.uniform(-0.05, 0.05), "lng": -82.9988 + random.uniform(-0.05, 0.05)},
                {"lat": 39.9612 + random.uniform(-0.05, 0.05), "lng": -82.9988 + random.uniform(-0.05, 0.05)},
            ],
            "events": [],
        })
    
    return trips

# Initialize trip data
trips_db = generate_sample_trips()

# Fuel price data (mock - would integrate with Gas Buddy API)
FUEL_PRICES = {
    "regular": 3.29,
    "midgrade": 3.59,
    "premium": 3.89,
    "diesel": 3.79,
    "last_updated": datetime.now().isoformat(),
    "source": "local_average"
}

@app.get("/api/trips/history/detailed")
def get_detailed_trip_history(
    days: int = 30, 
    limit: int = 50,
    sort_by: str = "date"
):
    """Get detailed trip history with fuel analytics"""
    user = users_db.get(current_user_id, {})
    
    # Filter trips by date range
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    filtered_trips = [t for t in trips_db if t["date"] >= cutoff_date][:limit]
    
    # Calculate analytics
    total_distance = sum(t["distance_miles"] for t in filtered_trips)
    total_fuel = sum(t["fuel_used_gallons"] for t in filtered_trips)
    total_duration = sum(t["duration_minutes"] for t in filtered_trips)
    avg_safety = sum(t["safety_score"] for t in filtered_trips) / max(len(filtered_trips), 1)
    total_gems = sum(t["gems_earned"] for t in filtered_trips)
    
    # Calculate fuel savings (compared to avg 25 mpg vehicle)
    baseline_fuel = total_distance / 25  # Average car
    fuel_saved = baseline_fuel - total_fuel
    money_saved = fuel_saved * FUEL_PRICES["regular"]
    
    return {
        "success": True,
        "data": {
            "trips": filtered_trips,
            "analytics": {
                "total_trips": len(filtered_trips),
                "total_distance_miles": round(total_distance, 1),
                "total_fuel_gallons": round(total_fuel, 2),
                "total_duration_minutes": total_duration,
                "total_duration_hours": round(total_duration / 60, 1),
                "avg_safety_score": round(avg_safety, 1),
                "total_gems_earned": round(total_gems),
                "avg_mpg": round(total_distance / max(total_fuel, 0.1), 1),
                "fuel_saved_gallons": round(max(fuel_saved, 0), 2),
                "money_saved_dollars": round(max(money_saved, 0), 2),
                "co2_saved_lbs": round(max(fuel_saved, 0) * 19.6, 1),  # ~19.6 lbs CO2 per gallon
            }
        }
    }

@app.get("/api/fuel/prices")
def get_fuel_prices(lat: float = 39.9612, lng: float = -82.9988):
    """Get current fuel prices (mock - would integrate with real API)"""
    # In production, would call Gas Buddy API or similar
    return {
        "success": True,
        "data": {
            "prices": FUEL_PRICES,
            "nearby_stations": [
                {"name": "Shell", "address": "123 Main St", "regular": 3.19, "distance_miles": 0.5},
                {"name": "BP", "address": "456 Oak Ave", "regular": 3.29, "distance_miles": 0.8},
                {"name": "Speedway", "address": "789 Elm Rd", "regular": 3.25, "distance_miles": 1.2},
            ],
            "location": {"lat": lat, "lng": lng}
        }
    }

@app.get("/api/fuel/analytics")
def get_fuel_analytics(months: int = 3):
    """Get fuel usage analytics over time"""
    user = users_db.get(current_user_id, {})
    
    # Generate monthly breakdown
    monthly_data = []
    for i in range(months):
        month_date = datetime.now() - timedelta(days=30 * i)
        month_trips = [t for t in trips_db if t["date"].startswith(month_date.strftime("%Y-%m"))]
        
        distance = sum(t["distance_miles"] for t in month_trips)
        fuel = sum(t["fuel_used_gallons"] for t in month_trips)
        
        monthly_data.append({
            "month": month_date.strftime("%B %Y"),
            "trips": len(month_trips),
            "distance_miles": round(distance, 1),
            "fuel_gallons": round(fuel, 2),
            "avg_mpg": round(distance / max(fuel, 0.1), 1),
            "cost_estimate": round(fuel * FUEL_PRICES["regular"], 2)
        })
    
    return {
        "success": True,
        "data": {
            "monthly_breakdown": monthly_data,
            "current_fuel_price": FUEL_PRICES["regular"],
            "vehicle_efficiency": {
                "your_avg_mpg": 31.2,
                "national_avg_mpg": 25.4,
                "efficiency_rating": "Excellent"
            }
        }
    }

# ==================== PERSONALIZED OFFERS (ORION VOICE) ====================

# Track driver location history for personalization
driver_location_history = {}

class LocationVisit(BaseModel):
    lat: float
    lng: float
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    timestamp: Optional[str] = None

@app.post("/api/driver/location-visit")
def record_location_visit(visit: LocationVisit):
    """Record a driver's visit to a location for personalization"""
    if current_user_id not in driver_location_history:
        driver_location_history[current_user_id] = []
    
    driver_location_history[current_user_id].append({
        "lat": visit.lat,
        "lng": visit.lng,
        "business_name": visit.business_name,
        "business_type": visit.business_type,
        "timestamp": visit.timestamp or datetime.now().isoformat()
    })
    
    # Keep only last 100 visits
    driver_location_history[current_user_id] = driver_location_history[current_user_id][-100:]
    
    return {"success": True}

@app.get("/api/offers/personalized")
def get_personalized_offers(lat: float = 39.9612, lng: float = -82.9988, limit: int = 2):
    """Get personalized offers based on driver's location history and preferences"""
    user = users_db.get(current_user_id, {})
    history = driver_location_history.get(current_user_id, [])
    
    # Find frequently visited business types
    visited_types = {}
    for visit in history:
        if visit.get("business_type"):
            visited_types[visit["business_type"]] = visited_types.get(visit["business_type"], 0) + 1
    
    # Sort offers by relevance
    scored_offers = []
    for offer in offers_db:
        if datetime.fromisoformat(offer["expires_at"]) < datetime.now():
            continue
        if offer["id"] in user.get("redeemed_offers", []):
            continue
        
        # Calculate distance
        dlat = abs(offer["lat"] - lat)
        dlng = abs(offer["lng"] - lng)
        dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        
        # Score based on distance and visit history
        score = 100 - (dist * 10)  # Closer is better
        if offer["business_type"] in visited_types:
            score += visited_types[offer["business_type"]] * 5  # Bonus for frequently visited types
        
        # Premium users get higher value offers
        if user.get("is_premium"):
            discount = OFFER_CONFIG["premium_discount_percent"]
        else:
            discount = OFFER_CONFIG["free_discount_percent"]
        
        scored_offers.append({
            **offer,
            "score": score,
            "distance_km": round(dist, 2),
            "discount_percent": discount,
            "personalization_reason": f"Based on your visits to {offer['business_type']} locations" if offer["business_type"] in visited_types else "Popular nearby"
        })
    
    # Sort by score and return top offers
    scored_offers.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "success": True,
        "data": scored_offers[:limit],
        "voice_prompt": f"I found {len(scored_offers[:limit])} great offers for you nearby!"
    }

@app.post("/api/offers/{offer_id}/accept-voice")
def accept_offer_via_voice(offer_id: int, add_as_stop: bool = True):
    """Accept an offer via voice command (Orion)"""
    offer = next((o for o in offers_db if o["id"] == offer_id), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    
    return {
        "success": True,
        "message": f"Great! I'll add {offer['business_name']} as a stop on your route.",
        "data": {
            "offer": offer,
            "navigation_action": "add_waypoint" if add_as_stop else "show_details",
            "waypoint": {
                "lat": offer["lat"],
                "lng": offer["lng"],
                "name": offer["business_name"]
            }
        }
    }

# ==================== 3D ROUTE HISTORY MAP ====================

@app.get("/api/routes/history-3d")
def get_route_history_3d(days: int = 90, limit: int = 100):
    """Get route history data formatted for 3D visualization"""
    user = users_db.get(current_user_id, {})
    
    # Filter trips
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    filtered_trips = [t for t in trips_db if t["date"] >= cutoff_date][:limit]
    
    # Group by route (origin-destination pairs)
    route_groups = {}
    for trip in filtered_trips:
        route_key = f"{trip['origin']}→{trip['destination']}"
        if route_key not in route_groups:
            route_groups[route_key] = {
                "route_name": route_key,
                "origin": trip["origin"],
                "destination": trip["destination"],
                "trips": [],
                "total_distance": 0,
                "total_trips": 0,
                "avg_safety": 0,
                "coordinates": trip.get("route_coordinates", [])
            }
        route_groups[route_key]["trips"].append(trip)
        route_groups[route_key]["total_distance"] += trip["distance_miles"]
        route_groups[route_key]["total_trips"] += 1
    
    # Calculate averages
    routes_3d = []
    for route_key, data in route_groups.items():
        avg_safety = sum(t["safety_score"] for t in data["trips"]) / len(data["trips"])
        data["avg_safety"] = round(avg_safety, 1)
        
        # Color based on frequency (more trips = brighter)
        intensity = min(data["total_trips"] / 10, 1)
        
        routes_3d.append({
            "id": route_key,
            "route_name": data["route_name"],
            "origin": data["origin"],
            "destination": data["destination"],
            "total_trips": data["total_trips"],
            "total_distance_miles": round(data["total_distance"], 1),
            "avg_safety_score": data["avg_safety"],
            "coordinates": data["coordinates"],
            "color_intensity": intensity,
            "last_traveled": data["trips"][0]["date"] if data["trips"] else None
        })
    
    # Sort by frequency
    routes_3d.sort(key=lambda x: x["total_trips"], reverse=True)
    
    return {
        "success": True,
        "data": {
            "routes": routes_3d,
            "center": {"lat": 39.9612, "lng": -82.9988},
            "total_unique_routes": len(routes_3d),
            "total_trips": sum(r["total_trips"] for r in routes_3d),
            "total_distance": round(sum(r["total_distance_miles"] for r in routes_3d), 1)
        }
    }

# ==================== ORION AI COACH ENDPOINTS ====================

class OrionMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

@app.post("/api/orion/chat")
async def orion_chat(request: OrionMessageRequest):
    """Send a message to Orion AI Coach and get a response"""
    session_id = request.session_id or f"session_{uuid.uuid4().hex[:8]}"
    
    result = await orion_service.send_message(
        session_id=session_id,
        user_text=request.message,
        context=request.context
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "AI service error"))
    
    return result

@app.get("/api/orion/history/{session_id}")
async def get_orion_history(session_id: str):
    """Get conversation history for a session"""
    history = orion_service.get_history(session_id)
    return {"success": True, "history": history, "count": len(history)}

@app.delete("/api/orion/session/{session_id}")
async def clear_orion_session(session_id: str):
    """Clear a chat session"""
    success = orion_service.clear_session(session_id)
    return {"success": success}

@app.get("/api/orion/tips")
async def get_quick_tips():
    """Get quick tip suggestions for the UI"""
    return {"success": True, "tips": orion_service.get_quick_tips()}

# ==================== PHOTO ANALYSIS ENDPOINTS ====================

class PhotoAnalysisRequest(BaseModel):
    image_base64: str
    image_type: Optional[str] = "image/jpeg"
    image_width: Optional[int] = 1920
    image_height: Optional[int] = 1080

@app.post("/api/photo/analyze")
async def analyze_photo(request: PhotoAnalysisRequest):
    """Analyze a photo for faces and license plates to blur"""
    result = await photo_service.analyze_image(
        image_base64=request.image_base64,
        image_type=request.image_type
    )
    
    if result["success"] and result["needs_blur"]:
        # Generate blur mask regions
        blur_regions = photo_service.generate_blur_mask(
            result["detections"],
            request.image_width,
            request.image_height
        )
        result["blur_regions"] = blur_regions
    
    return result

# ==================== PARTNER PORTAL V2 ENDPOINTS ====================

class PartnerLoginRequest(BaseModel):
    email: str
    password: str

class TeamInviteRequest(BaseModel):
    email: Optional[str] = None
    role: str
    method: str = "email"  # "email" or "code"

class ReferralRequest(BaseModel):
    email: str
    message: Optional[str] = ""

class CreditUseRequest(BaseModel):
    amount: float
    purpose: str  # "subscription" or "boosting"

class QRRedemptionRequest(BaseModel):
    qr_data: Dict[str, Any]
    staff_id: str

@app.post("/api/partner/v2/login")
async def partner_login_v2(request: PartnerLoginRequest):
    """Partner portal login"""
    result = partner_service.authenticate(request.email, request.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return result

@app.get("/api/partner/v2/profile/{partner_id}")
async def get_partner_profile_v2(partner_id: str):
    """Get partner profile"""
    partner = partner_service.get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Remove sensitive data
    return {
        "success": True,
        "data": {
            "id": partner["id"],
            "business_name": partner["business_name"],
            "email": partner["email"],
            "credits": partner["credits"],
            "subscription_plan": partner["subscription_plan"],
            "location": partner["location"]
        }
    }

# Team Management
@app.get("/api/partner/v2/team/{partner_id}")
async def get_team_members(partner_id: str):
    """Get all team members for a partner"""
    team = partner_service.get_team_members(partner_id)
    return {"success": True, "data": team, "count": len(team)}

@app.post("/api/partner/v2/team/{partner_id}/invite")
async def invite_team_member(partner_id: str, request: TeamInviteRequest):
    """Invite a new team member"""
    result = partner_service.invite_team_member(
        partner_id=partner_id,
        email=request.email or "",
        role=request.role,
        method=request.method
    )
    return result

@app.put("/api/partner/v2/team/{member_id}/role")
async def update_member_role(member_id: str, role: str):
    """Update a team member's role"""
    success = partner_service.update_team_member_role(member_id, role)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}

@app.delete("/api/partner/v2/team/{member_id}")
async def revoke_team_access(member_id: str):
    """Revoke a team member's access"""
    success = partner_service.revoke_team_access(member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}

# Referrals
@app.get("/api/partner/v2/referrals/{partner_id}")
async def get_referrals(partner_id: str):
    """Get all referrals for a partner"""
    referrals = partner_service.get_referrals(partner_id)
    stats = partner_service.get_referral_stats(partner_id)
    return {"success": True, "data": referrals, "stats": stats}

@app.post("/api/partner/v2/referrals/{partner_id}")
async def send_referral(partner_id: str, request: ReferralRequest):
    """Send a referral invitation"""
    result = partner_service.send_referral(partner_id, request.email, request.message)
    return result

@app.post("/api/partner/v2/credits/{partner_id}/use")
async def use_credits(partner_id: str, request: CreditUseRequest):
    """Use referral credits"""
    result = partner_service.use_credits(partner_id, request.amount, request.purpose)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

# QR Redemption
@app.post("/api/partner/v2/redeem")
async def redeem_offer(request: QRRedemptionRequest, background_tasks: BackgroundTasks):
    """Validate and redeem a customer's offer QR code"""
    result = partner_service.validate_redemption(request.qr_data, request.staff_id)
    
    if result["success"]:
        # Get partner ID from offer
        offer_id = request.qr_data.get("offerId")
        # Notify connected partner staff via WebSocket
        background_tasks.add_task(
            ws_manager.notify_partner_redemption,
            "partner_001",  # In production, get from offer
            result
        )
        
        # Notify customer their offer was redeemed
        customer_id = request.qr_data.get("customerId")
        if customer_id:
            background_tasks.add_task(
                ws_manager.notify_customer_redeemed,
                customer_id,
                result
            )
    
    return result

@app.get("/api/partner/v2/redemptions/{partner_id}")
async def get_recent_redemptions(partner_id: str, limit: int = 10):
    """Get recent redemptions for a partner"""
    redemptions = partner_service.get_recent_redemptions(partner_id, limit)
    return {"success": True, "data": redemptions, "count": len(redemptions)}

# Analytics
@app.get("/api/partner/v2/analytics/{partner_id}")
async def get_partner_analytics(partner_id: str):
    """Get partner analytics data"""
    analytics = partner_service.get_analytics(partner_id)
    return {"success": True, "data": analytics}

# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws/partner/{partner_id}")
async def partner_websocket(websocket: WebSocket, partner_id: str):
    """WebSocket endpoint for real-time partner notifications"""
    connection_id = f"conn_{uuid.uuid4().hex[:8]}"
    
    try:
        await ws_manager.connect_partner(websocket, partner_id, connection_id)
        
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Handle ping/pong for keep-alive
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                
                # Handle customer proximity notification
                elif message.get("type") == "customer_nearby":
                    # Broadcast to all partner connections
                    await ws_manager.notify_customer_nearby(
                        partner_id,
                        message.get("customer_id"),
                        message.get("offer")
                    )
                    
            except json.JSONDecodeError:
                pass  # Ignore malformed messages
                
    except WebSocketDisconnect:
        await ws_manager.disconnect_partner(partner_id, connection_id)
    except Exception as e:
        await ws_manager.disconnect_partner(partner_id, connection_id)

@app.websocket("/ws/customer/{customer_id}")
async def customer_websocket(websocket: WebSocket, customer_id: str):
    """WebSocket endpoint for customer notifications (offer redemption alerts)"""
    try:
        await ws_manager.connect_customer(websocket, customer_id)
        
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})
                    
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        await ws_manager.disconnect_customer(customer_id)
    except Exception:
        await ws_manager.disconnect_customer(customer_id)

@app.get("/api/ws/status/{partner_id}")
async def get_ws_status(partner_id: str):
    """Get WebSocket connection status for a partner"""
    count = ws_manager.get_partner_connection_count(partner_id)
    return {"success": True, "active_connections": count, "partner_id": partner_id}

