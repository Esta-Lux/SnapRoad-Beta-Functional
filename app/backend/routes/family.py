"""
Family features — Coming Soon.
All endpoints return 503 with a coming-soon message so existing clients
get a clean response instead of 404s.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/family", tags=["family"])

_COMING_SOON = JSONResponse(
    status_code=503,
    content={"success": False, "detail": "Family features are coming soon!", "coming_soon": True},
)


@router.get("/members")
async def get_members():
    return _COMING_SOON


@router.post("/create")
async def create_family():
    return _COMING_SOON


@router.post("/join")
async def join_family():
    return _COMING_SOON


@router.get("/leaderboard")
async def get_leaderboard():
    return _COMING_SOON
