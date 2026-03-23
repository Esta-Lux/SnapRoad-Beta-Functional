"""
Yelp Fusion API Integration
Enriches existing offers with ratings, review counts, and photos.
"""
import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

YELP_API_BASE = "https://api.yelp.com/v3"
YELP_API_KEY = os.getenv("YELP_API_KEY", "")


async def search_business(
    name: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    location: Optional[str] = None,
) -> Optional[dict]:
    """
    Find the best-matching Yelp business for a given name + coordinates.
    Returns a normalised dict with rating, review_count, image_url, and yelp_url,
    or None if not found.
    """
    if not YELP_API_KEY:
        logger.warning("YELP_API_KEY not configured – skipping enrichment")
        return None

    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    params: dict = {"term": name, "limit": 1}
    if lat and lng:
        params["latitude"] = lat
        params["longitude"] = lng
    elif location:
        params["location"] = location
    else:
        params["location"] = "Columbus, OH"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{YELP_API_BASE}/businesses/search",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"Yelp API search failed: {e}")
        return None

    businesses = data.get("businesses", [])
    if not businesses:
        return None

    biz = businesses[0]
    return {
        "yelp_id": biz.get("id", ""),
        "yelp_rating": biz.get("rating"),
        "yelp_review_count": biz.get("review_count"),
        "yelp_image_url": biz.get("image_url", ""),
        "yelp_url": biz.get("url", ""),
        "yelp_name": biz.get("name", ""),
        "yelp_phone": biz.get("display_phone", ""),
        "yelp_categories": [c.get("title", "") for c in biz.get("categories", [])],
    }


async def enrich_offer(
    business_name: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict:
    """
    Return the columns that should be updated on the offer row.
    If Yelp returns nothing, an empty dict is returned.
    """
    result = await search_business(business_name, lat=lat, lng=lng)
    if not result:
        return {}
    return {
        "yelp_rating": result["yelp_rating"],
        "yelp_review_count": result["yelp_review_count"],
        "yelp_image_url": result["yelp_image_url"],
    }
