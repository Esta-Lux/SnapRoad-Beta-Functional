"""Navigation data ports to isolate route modules from mock_data globals."""

from __future__ import annotations

from typing import Any

from services.mock_data import (
    MAP_LOCATIONS,
    road_reports_db,
    saved_locations,
    saved_routes,
    users_db,
    widget_settings,
)


def resolve_user_scoped_data(auth_user: dict, *, is_production: bool) -> tuple[str, list, list]:
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise ValueError("Invalid auth context")

    user = users_db.get(user_id)
    if not user:
        if is_production:
            # Keep production behavior read-only and avoid mutating process-local stores.
            return user_id, list(saved_locations), list(saved_routes)
        user = users_db.setdefault(user_id, {"id": user_id})

    if "saved_locations" not in user:
        if is_production:
            return user_id, list(saved_locations), list(user.get("saved_routes", saved_routes))
        user["saved_locations"] = list(saved_locations)
    if "saved_routes" not in user:
        if is_production:
            return user_id, list(user.get("saved_locations", saved_locations)), list(saved_routes)
        user["saved_routes"] = list(saved_routes)
    return user_id, user["saved_locations"], user["saved_routes"]


def get_user_snapshot(user_id: str) -> dict[str, Any]:
    return dict(users_db.get(user_id, {}))


def get_map_locations_seed() -> list[dict[str, Any]]:
    return list(MAP_LOCATIONS)


def get_widget_settings() -> dict[str, dict[str, Any]]:
    return widget_settings


def get_road_reports_seed() -> list[dict[str, Any]]:
    return list(road_reports_db)
