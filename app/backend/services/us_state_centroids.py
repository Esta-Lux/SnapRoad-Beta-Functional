"""
Approximate geographic center (WGS84) for each US state and D.C.
Used to place statewide average fuel price badges on the map.
Names must match CollectAPI `name` strings (Title Case).
"""
from __future__ import annotations

# (lat, lng) — approximate centers, good enough for map markers.
US_STATE_CENTROIDS: dict[str, tuple[float, float]] = {
    "Alabama": (32.7391, -86.8284),
    "Alaska": (64.0685, -152.2782),
    "Arizona": (34.2744, -111.6602),
    "Arkansas": (34.8938, -92.4426),
    "California": (36.7783, -119.4179),
    "Colorado": (39.0598, -105.3111),
    "Connecticut": (41.5978, -72.7554),
    "Delaware": (38.9897, -75.5050),
    "District of Columbia": (38.9072, -77.0369),
    "Florida": (27.7663, -82.6404),
    "Georgia": (33.0406, -83.6431),
    "Hawaii": (21.0943, -157.4983),
    "Idaho": (44.2405, -114.4788),
    "Illinois": (40.3495, -88.9861),
    "Indiana": (39.8494, -86.2583),
    "Iowa": (41.8780, -93.0977),
    "Kansas": (38.5266, -96.7265),
    "Kentucky": (37.6681, -84.6701),
    "Louisiana": (31.1695, -91.8678),
    "Maine": (45.2538, -69.4455),
    "Maryland": (39.0639, -76.8021),
    "Massachusetts": (42.4072, -71.3824),
    "Michigan": (43.9897, -84.8796),
    "Minnesota": (45.6945, -93.9022),
    "Mississippi": (32.7416, -89.6675),
    "Missouri": (38.3566, -92.4580),
    "Montana": (47.0527, -109.6333),
    "Nebraska": (41.4925, -99.9018),
    "Nevada": (38.3135, -117.0554),
    "New Hampshire": (43.4525, -71.5639),
    "New Jersey": (40.2989, -74.5210),
    "New Mexico": (34.5199, -105.8701),
    "New York": (42.9654, -75.5262),
    "North Carolina": (35.5580, -79.3877),
    "North Dakota": (47.5289, -99.7840),
    "Ohio": (40.3888, -82.7649),
    "Oklahoma": (35.5653, -96.9289),
    "Oregon": (43.8041, -120.5542),
    "Pennsylvania": (40.5908, -77.2098),
    "Rhode Island": (41.6809, -71.5118),
    "South Carolina": (33.8569, -80.9450),
    "South Dakota": (44.2998, -99.4388),
    "Tennessee": (35.7478, -86.6923),
    "Texas": (31.9686, -99.9018),
    "Utah": (39.3210, -111.0937),
    "Vermont": (44.0459, -72.7107),
    "Virginia": (37.7693, -78.1699),
    "Washington": (47.4009, -121.4905),
    "West Virginia": (38.4912, -80.9545),
    "Wisconsin": (44.2682, -89.6165),
    "Wyoming": (42.7555, -107.3025),
}

_NAME_ALIASES: dict[str, str] = {
    "dc": "District of Columbia",
    "d.c.": "District of Columbia",
    "washington dc": "District of Columbia",
    "washington d.c.": "District of Columbia",
}


def centroid_for_state_name(name: str) -> tuple[float, float] | None:
    """Resolve CollectAPI-style state name to (lat, lng)."""
    key = " ".join((name or "").split()).strip()
    if not key:
        return None
    hit = US_STATE_CENTROIDS.get(key)
    if hit:
        return hit
    alias = _NAME_ALIASES.get(key.lower())
    if alias:
        return US_STATE_CENTROIDS.get(alias)
    return None
