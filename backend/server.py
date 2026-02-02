from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import random

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
users_db = {
    "123456": {
        "id": "123456",
        "name": "Sarah Johnson",
        "email": "sarah@example.com",
        "gems": 12400,
        "level": 42,
        "safety_score": 87,
        "streak": 14,
        "total_miles": 2847,
        "total_trips": 156,
        "badges_earned": [1, 2, 3, 4, 5, 21, 22, 51, 81, 82, 101],
        "rank": 42,
        "state": "TX",
        "is_premium": True,
        "member_since": "Jan 2025",
        "friends": ["123457", "123458"],
        "friend_requests": [],
        "owned_cars": [1],
        "equipped_car": 1,
        "owned_skins": [1, 2],
        "equipped_skin": 1,
    }
}

# Generate sample users for leaderboard
STATES = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MO", "MD", "WI"]
FIRST_NAMES = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Isabella", "Elijah", "Sophia", "Lucas", "Mia", "Mason", "Charlotte", "Ethan", "Amelia", "Aiden", "Harper", "Jacob", "Evelyn"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris"]

for i in range(100):
    uid = str(123457 + i)
    users_db[uid] = {
        "id": uid,
        "name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        "gems": random.randint(500, 50000),
        "level": random.randint(5, 100),
        "safety_score": random.randint(60, 100),
        "streak": random.randint(0, 100),
        "total_miles": random.randint(100, 10000),
        "total_trips": random.randint(10, 500),
        "badges_earned": random.sample(range(1, 161), random.randint(3, 30)),
        "rank": i + 1,
        "state": random.choice(STATES),
        "is_premium": random.choice([True, False]),
        "member_since": "2025",
        "friends": [],
        "friend_requests": [],
        "owned_cars": [1],
        "equipped_car": 1,
        "owned_skins": [1, 2],
        "equipped_skin": 1,
    }

# Current user reference
current_user_id = "123456"

# ==================== SAVED DATA ====================
saved_locations = [
    {"id": 1, "name": "Home", "address": "123 Oak Street", "category": "home"},
    {"id": 2, "name": "Work", "address": "Downtown Office", "category": "work"},
    {"id": 3, "name": "Gym", "address": "FitLife Center", "category": "gym"},
]

saved_routes = [
    {"id": 1, "name": "Morning Commute", "origin": "Home", "destination": "Work", "departure_time": "07:30", "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"], "estimated_time": 25, "distance": 12.5, "is_active": True, "notifications": True},
    {"id": 2, "name": "School Pickup", "origin": "Work", "destination": "School", "departure_time": "15:00", "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"], "estimated_time": 18, "distance": 8.2, "is_active": True, "notifications": True},
]

widget_settings = {
    "score": {"visible": True, "collapsed": False, "position": {"x": 12, "y": 290}},
    "gems": {"visible": True, "collapsed": False, "position": {"x": 260, "y": 290}},
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
def get_leaderboard(state: Optional[str] = None, limit: int = 50):
    users_list = list(users_db.values())
    
    if state:
        users_list = [u for u in users_list if u.get("state") == state]
    
    # Sort by safety score
    users_list.sort(key=lambda x: x.get("safety_score", 0), reverse=True)
    
    leaderboard = []
    for i, u in enumerate(users_list[:limit]):
        leaderboard.append({
            "rank": i + 1,
            "id": u["id"],
            "name": u["name"],
            "safety_score": u["safety_score"],
            "level": u["level"],
            "state": u["state"],
            "badges_count": len(u.get("badges_earned", []))
        })
    
    # Get current user rank
    current_user = users_db.get(current_user_id, {})
    my_rank = None
    for i, u in enumerate(sorted(list(users_db.values()), key=lambda x: x.get("safety_score", 0), reverse=True)):
        if u["id"] == current_user_id:
            my_rank = i + 1
            break
    
    return {
        "success": True,
        "data": leaderboard,
        "my_rank": my_rank,
        "total_users": len(users_list),
        "states": STATES
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

# ==================== OFFERS ====================
@app.get("/api/offers")
def get_offers(offer_type: Optional[str] = None):
    offers = [
        {"id": 1, "name": "Shell Gas", "type": "gas", "gems": 50, "discount": "10¢/gal off", "distance": "0.5 mi", "trending": True, "expires": "2h", "rating": 4.5},
        {"id": 2, "name": "Starbucks", "type": "cafe", "gems": 30, "discount": "20% off", "distance": "0.8 mi", "trending": False, "expires": "1d", "rating": 4.8},
        {"id": 3, "name": "QuickMart", "type": "gas", "gems": 45, "discount": "15¢/gal off", "distance": "1.2 mi", "trending": True, "expires": "5h", "rating": 4.2},
        {"id": 4, "name": "Dunkin", "type": "cafe", "gems": 25, "discount": "Free donut", "distance": "1.5 mi", "trending": False, "expires": "3d", "rating": 4.3},
    ]
    if offer_type:
        offers = [o for o in offers if o["type"] == offer_type]
    return {"success": True, "data": offers, "total_savings": "$127.50"}

@app.post("/api/offers/{offer_id}/redeem")
def redeem_offer(offer_id: int):
    return {"success": True, "message": "Offer redeemed!", "data": {"redemption_code": f"SNAP{offer_id}2025"}}

# ==================== INCIDENTS ====================
@app.post("/api/incidents/report")
def report_incident(report: ReportIncident):
    gems = {"pothole": 15, "accident": 50, "construction": 10, "hazard": 25}.get(report.incident_type, 10)
    return {"success": True, "message": f"Incident reported! +{gems} gems earned", "data": {"gems_earned": gems}}

@app.get("/api/family/members")
def get_family_members():
    return {"success": True, "data": [
        {"id": 1, "name": "Mom", "status": "driving", "location": "Highway 71 N", "battery": 78, "distance": "12 mi"},
        {"id": 2, "name": "Dad", "status": "parked", "location": "Work", "battery": 45, "distance": "8 mi"},
    ]}
