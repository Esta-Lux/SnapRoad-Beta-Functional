"""Offers data ports isolating route handlers from mock_data imports."""

from __future__ import annotations

from typing import Any

from services.mock_data import OFFER_CONFIG, driver_location_history


def get_offer_config() -> dict[str, Any]:
    return OFFER_CONFIG


def get_driver_location_history(user_id: str) -> list[dict[str, Any]]:
    return list(driver_location_history.get(user_id, []))


def append_driver_location_visit(user_id: str, visit: dict[str, Any], *, max_items: int = 100) -> None:
    if user_id not in driver_location_history:
        driver_location_history[user_id] = []
    driver_location_history[user_id].append(visit)
    driver_location_history[user_id] = driver_location_history[user_id][-max_items:]
