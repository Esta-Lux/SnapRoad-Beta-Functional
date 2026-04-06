"""Normalize `offers.business_type` to canonical slugs and friendly labels for clients."""

from __future__ import annotations

from typing import Any, Optional

# Canonical values persisted as `business_type` (and shown as category).
_CATEGORY_OPTIONS: tuple[tuple[str, str], ...] = (
    ("gas", "Gas & fuel"),
    ("restaurant", "Restaurant"),
    ("coffee", "Coffee & cafe"),
    ("grocery", "Grocery"),
    ("retail", "Retail & shopping"),
    ("automotive", "Automotive & service"),
    ("pharmacy", "Pharmacy"),
    ("hotel", "Hotel & travel"),
    ("entertainment", "Entertainment"),
    ("services", "Services"),
    ("other", "Other"),
)

LABEL_BY_SLUG: dict[str, str] = dict(_CATEGORY_OPTIONS)
_VALID = frozenset(LABEL_BY_SLUG.keys())

_ALIAS: dict[str, str] = {
    "fuel": "gas",
    "gas_station": "gas",
    "station": "gas",
    "petrol": "gas",
    "restaurants": "restaurant",
    "food": "restaurant",
    "dining": "restaurant",
    "eat": "restaurant",
    "cafe": "coffee",
    "bakery": "coffee",
    "drinks": "coffee",
    "supermarket": "grocery",
    "shop": "retail",
    "store": "retail",
    "shopping": "retail",
    "car_wash": "automotive",
    "carwash": "automotive",
    "auto": "automotive",
    "car": "automotive",
    "mechanic": "automotive",
    "drugstore": "pharmacy",
    "lodging": "hotel",
    "travel": "hotel",
    "movie": "entertainment",
    "gym": "services",
    "salon": "services",
    "bank": "services",
    "other": "other",
}


def normalize_offer_category(raw: Optional[Any]) -> str:
    if raw is None:
        return "other"
    s = str(raw).strip().lower().replace(" ", "_").replace("-", "_")
    if not s:
        return "other"
    if s in _ALIAS:
        s = _ALIAS[s]
    if s in _VALID:
        return s
    return "other"


def label_for_category(slug: str) -> str:
    return LABEL_BY_SLUG.get(slug, LABEL_BY_SLUG["other"])


def attach_offer_category_fields(offer: dict) -> None:
    """Mutates `offer` with normalized `business_type` and `category_label`."""
    slug = normalize_offer_category(offer.get("business_type"))
    offer["business_type"] = slug
    offer["category_label"] = label_for_category(slug)


def public_category_list() -> list[dict[str, str]]:
    return [{"slug": s, "label": lbl} for s, lbl in _CATEGORY_OPTIONS]
