from pydantic import BaseModel
from typing import Optional, List, Dict, Any


# ==================== AUTH ====================
class SignupRequest(BaseModel):
    """`full_name` is accepted for clients that use that key instead of `name`."""
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResendVerificationRequest(BaseModel):
    email: str


# ==================== USER ====================
class PlanUpdate(BaseModel):
    plan: str

class CarCustomization(BaseModel):
    category: str
    variant: str
    color: str


# ==================== OFFERS ====================
class OfferCreate(BaseModel):
    business_name: str
    business_type: str
    description: str
    base_gems: int
    address: str = ""
    lat: float
    lng: float
    offer_url: Optional[str] = None
    expires_hours: int = 24
    is_admin_offer: bool = False

class BulkOfferItem(BaseModel):
    business_name: str
    address: str
    description: str = ""
    offer_url: Optional[str] = None
    business_type: str = "other"
    discount_percent: int = 0
    is_free_item: bool = False
    base_gems: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    expires_days: int = 30
    offer_source: str = "direct"
    original_price: Optional[float] = None
    affiliate_tracking_url: Optional[str] = None
    external_id: Optional[str] = None

class BulkOfferUpload(BaseModel):
    offers: List[BulkOfferItem]

class OfferImport(BaseModel):
    offers: List[dict]


# ==================== NAVIGATION ====================
class NavigationRequest(BaseModel):
    destination: str
    origin: Optional[str] = "current_location"

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
    estimated_time: Optional[int] = None
    distance: Optional[float] = None

class Widget(BaseModel):
    widget_id: str
    visible: bool
    collapsed: bool
    position: dict


# ==================== SOCIAL ====================
class FriendRequest(BaseModel):
    user_id: str


class LocationUpdateBody(BaseModel):
    lat: float
    lng: float
    heading: Optional[float] = None
    speed_mph: Optional[float] = None
    is_navigating: bool = False
    destination_name: Optional[str] = None


class LocationSharingBody(BaseModel):
    is_sharing: bool


class LocationTagBody(BaseModel):
    to_user_id: str
    lat: float
    lng: float
    message: Optional[str] = "Check out where I am!"

class RoadReport(BaseModel):
    type: str
    title: str
    description: Optional[str] = ""
    lat: float
    lng: float
    photo_url: Optional[str] = None

class ReportIncident(BaseModel):
    incident_type: str
    location: str
    description: Optional[str] = None


# ==================== GAMIFICATION ====================
class XPEvent(BaseModel):
    event_type: str
    amount: Optional[int] = None
    event_id: Optional[str] = None

class ChallengeCreate(BaseModel):
    opponent_id: str
    stake: int
    duration_hours: int

class GemGenerateRequest(BaseModel):
    trip_id: str
    route_points: List[Dict[str, float]]

class GemCollectRequest(BaseModel):
    trip_id: str
    gem_id: str


# ==================== TRIPS ====================
class TripResult(BaseModel):
    distance: float
    duration: int
    safety_metrics: dict
    origin: Optional[str] = None
    destination: Optional[str] = None
    route_coordinates: Optional[List[Dict[str, float]]] = None
    safety_score: Optional[float] = None  # from client if available

class FuelLog(BaseModel):
    id: str
    userId: str
    vehicleId: str
    date: str
    gallons: float
    price_per_gallon: float
    total_cost: Optional[float] = None
    total: Optional[float] = None
    odometer: float
    mpg: Optional[float]
    station: Optional[str] = "Unknown"


# ==================== PARTNER ====================
class PartnerLocation(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    is_primary: bool = False

class PartnerPlanUpdate(BaseModel):
    plan: str

class PartnerOfferCreate(BaseModel):
    title: str
    description: str
    discount_percent: int
    gems_reward: Optional[int] = None
    is_free_item: bool = False
    location_id: str
    expires_hours: int = 168
    image_url: Optional[str] = None

class PartnerLoginRequest(BaseModel):
    email: str
    password: str

class PartnerRegisterRequest(BaseModel):
    first_name: str
    last_name: str
    business_name: str
    business_address: str
    email: str
    password: str
    referral_code: Optional[str] = None

class TeamInviteRequest(BaseModel):
    email: Optional[str] = None
    role: str
    method: str = "email"

class ReferralRequest(BaseModel):
    email: str
    message: Optional[str] = ""

class CreditUseRequest(BaseModel):
    amount: float
    purpose: str

class QRRedemptionRequest(BaseModel):
    qr_data: Dict[str, Any]
    staff_id: str

class BoostRequest(BaseModel):
    offer_id: int
    boost_type: str
    use_credits: bool = False

class BoostCreditsRequest(BaseModel):
    amount: float

class BoostCalculate(BaseModel):
    duration_days: int
    reach_target: int

class BoostCreate(BaseModel):
    offer_id: int
    duration_days: int
    reach_target: int
    business_id: Optional[str] = None


# ==================== ADMIN ====================
class PricingUpdate(BaseModel):
    founders_price: Optional[float] = None
    public_price: Optional[float] = None
    is_founders_active: Optional[bool] = None

class AdminOfferCreate(BaseModel):
    business_name: str
    business_id: Optional[str] = None
    business_type: str
    description: str
    discount_percent: int = 0
    is_free_item: bool = False
    base_gems: Optional[int] = None
    lat: float = 39.9612
    lng: float = -82.9988
    expires_hours: int = 24
    image_id: Optional[str] = None
    offer_source: str = "direct"
    original_price: Optional[float] = None
    offer_url: Optional[str] = None
    affiliate_tracking_url: Optional[str] = None
    external_id: Optional[str] = None


# ==================== AI ====================
class OrionMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class OrionMessageItem(BaseModel):
    role: str  # 'user' | 'assistant' | 'system'
    content: str


class OrionCompletionRequest(BaseModel):
    """Request body for /api/orion/completions (matches frontend OrionContext + messages)."""
    messages: List[OrionMessageItem]
    context: Optional[Dict[str, Any]] = None

class PhotoAnalysisRequest(BaseModel):
    image_base64: str
    image_type: Optional[str] = "image/jpeg"
    image_width: Optional[int] = 1920
    image_height: Optional[int] = 1080

class ImageGenerateRequest(BaseModel):
    prompt: str
    offer_type: Optional[str] = None

class ContactForm(BaseModel):
    subject: str
    message: str
    email: Optional[str] = None

class LocationVisit(BaseModel):
    lat: float
    lng: float
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    timestamp: Optional[str] = None

class AnalyticsEvent(BaseModel):
    event_type: str
    offer_id: int
    business_id: Optional[str] = "default_business"
    user_location: Optional[dict] = None
