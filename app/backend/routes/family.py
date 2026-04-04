"""
Family features — Coming Soon.
Endpoints return 404 with a structured payload so clients can distinguish an intentional
feature stub from a generic service outage (503).
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/family", tags=["family"])

_FAMILY_SOON = JSONResponse(
    status_code=404,
    content={
        "detail": "Family mode coming soon",
        "feature": "family",
        "status": "planned",
    },
)


@router.get("/members")
async def get_members():
    return _FAMILY_SOON


@router.post("/create")
async def create_family():
    return _FAMILY_SOON


@router.post("/join")
async def join_family():
    return _FAMILY_SOON


@router.get("/leaderboard")
async def get_leaderboard():
    return _FAMILY_SOON


@router.post("/sos")
async def family_sos():
    return _FAMILY_SOON


@router.post("/checkin")
async def family_checkin():
    return _FAMILY_SOON


@router.get("/group/{group_id}/events")
async def get_group_events(group_id: str):
    return _FAMILY_SOON


@router.get("/member/{member_id}/trips")
async def get_member_trips(member_id: str):
    return _FAMILY_SOON


@router.get("/member/{member_id}/stats")
async def get_member_stats(member_id: str):
    return _FAMILY_SOON


@router.put("/member/{member_id}/notifications")
async def update_member_notifications(member_id: str):
    return _FAMILY_SOON


@router.get("/teen-report/{member_id}")
async def get_teen_report(member_id: str):
    return _FAMILY_SOON
