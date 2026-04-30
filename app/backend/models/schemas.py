from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ==================== AUTH ====================
class SignupRequest(BaseModel):
    """`full_name` is accepted for clients that use that key instead of `name`."""
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: str
    password: str
    date_of_birth: Optional[str] = None
    referral_code: Optional[str] = Field(
        default=None,
        description="Referrer profile/user UUID; gem milestones when referee pays first subscription.",
    )

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


class FriendCategoryCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=48)
    color: Optional[str] = Field(default=None, min_length=4, max_length=16)


class FriendCategoryUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=48)
    color: Optional[str] = Field(default=None, min_length=4, max_length=16)


class FriendCategoryMemberBody(BaseModel):
    friend_id: str


class LocationUpdateBody(BaseModel):
    lat: float
    lng: float
    heading: Optional[float] = None
    speed_mph: Optional[float] = None
    is_navigating: bool = False
    destination_name: Optional[str] = None
    is_sharing: Optional[bool] = Field(
        default=None,
        description="When set, updates sharing flag; when omitted, existing DB value is kept.",
    )
    battery_pct: Optional[int] = Field(default=None, ge=0, le=100)
    sharing_mode: Optional[str] = Field(
        default=None,
        description="while_using or always_follow; ignored when omitted.",
    )


class LocationSharingBody(BaseModel):
    is_sharing: bool
    lat: Optional[float] = None
    lng: Optional[float] = None
    sharing_mode: Optional[str] = None


class LocationTagBody(BaseModel):
    to_user_id: str
    lat: float
    lng: float
    message: Optional[str] = "Check out where I am!"


class ConvoyStartBody(BaseModel):
    member_ids: List[str] = Field(default_factory=list)
    destination_name: str = Field(min_length=1, max_length=300)
    destination_lat: float = Field(ge=-90, le=90)
    destination_lng: float = Field(ge=-180, le=180)


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
    """Create a head-to-head challenge. Stake 0 = no gem lock for creator (friendly duel)."""

    opponent_id: str = Field(..., min_length=1)
    stake: int = Field(default=0, ge=0, le=10000)
    duration_hours: int = Field(default=72, ge=1, le=720)
    challenge_type: str = Field(default="safest_drive", max_length=48)
    custom_message: Optional[str] = Field(default=None, max_length=220)

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
    mpg: Optional[float] = None
    station: Optional[str] = "Unknown"


class FuelLogCreate(BaseModel):
    """Mobile / web payload to log a fill-up (server fills id, date, mpg from prior entry)."""

    gallons: float
    price_per_gallon: float
    odometer: Optional[float] = None
    station: Optional[str] = "Unknown"
    is_full_tank: bool = True
    use_auto_odometer: bool = False


# ==================== PARTNER ====================
class PartnerLocation(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    is_primary: bool = False

class PartnerPlanUpdate(BaseModel):
    plan: str

class PartnerOfferGooglePhotoImport(BaseModel):
    """Import a Google Places photo into partner-offer storage (server downloads + uploads to our bucket)."""
    photo_reference: str = Field(..., min_length=8, max_length=512)
    maxwidth: int = Field(default=800, ge=100, le=1600)


class PartnerOfferLocationPhotoSuggest(BaseModel):
    """Find nearest Google result with a photo at this saved location and copy it to partner-offer storage."""
    location_id: str | int


class PartnerOfferCreate(BaseModel):
    """Partner portal — fields align with driver app offer cards (business name, headline, description, category, etc.)."""
    title: str
    description: str
    discount_percent: int
    gem_cost: Optional[int] = None
    gems_reward: Optional[int] = None
    is_free_item: bool = False
    # Some clients send numeric IDs; coerce to string in routes.
    location_id: str | int
    expires_hours: int = 168
    image_url: Optional[str] = None
    category: Optional[str] = None  # slug (gas, restaurant, …) → offers.business_type
    business_display_name: Optional[str] = Field(
        default=None,
        description="Store/brand name shown prominently to drivers; defaults to partner or location name.",
    )

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
    qr_data: Any
    staff_id: str = "team_link"

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
    image_url: Optional[str] = Field(default=None, description="Optional hero image URL for driver offer cards.")
    title: Optional[str] = Field(default=None, description="Promo headline; defaults to a short description slice.")
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
