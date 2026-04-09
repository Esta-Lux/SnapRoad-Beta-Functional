"""Trips data ports isolating route handlers from mock_data imports."""

from __future__ import annotations

from typing import Any

from services.mock_data import (
    FUEL_PRICES,
    XP_CONFIG,
    create_new_user,
    current_user_id,
    fuel_logs,
    trips_db,
    users_db,
)


def get_current_user_id() -> str:
    return current_user_id


def get_users_store() -> dict[str, dict[str, Any]]:
    return users_db


def ensure_user(user_id: str, name: str = "Driver") -> dict[str, Any]:
    if user_id not in users_db:
        users_db[user_id] = create_new_user(user_id, name)
    return users_db[user_id]


def get_trips_store() -> list[dict[str, Any]]:
    return trips_db


def get_fuel_logs_store() -> list[dict[str, Any]]:
    return fuel_logs


def get_fuel_prices() -> dict[str, float]:
    return FUEL_PRICES


def get_xp_config() -> dict[str, int]:
    return XP_CONFIG
