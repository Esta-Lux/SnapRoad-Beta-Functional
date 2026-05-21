from routes import mapbox_directions as m


def test_normalize_tomtom_route_shapes_candidate():
    route = {
        "summary": {
            "lengthInMeters": 3218,
            "travelTimeInSeconds": 420,
            "noTrafficTravelTimeInSeconds": 360,
            "trafficDelayInSeconds": 60,
        },
        "legs": [
            {
                "points": [
                    {"latitude": 40.0, "longitude": -83.0},
                    {"latitude": 40.01, "longitude": -83.01},
                ]
            }
        ],
        "guidance": {
            "instructions": [
                {
                    "message": "Turn right onto Main St",
                    "maneuver": "TURN_RIGHT",
                    "routeOffsetInMeters": 200,
                    "travelTimeInSeconds": 30,
                    "point": {"latitude": 40.001, "longitude": -83.001},
                }
            ]
        },
    }

    out = m._normalize_tomtom_route(route, 0)

    assert out is not None
    assert out["provider"] == "tomtom"
    assert out["distance"] == 3218
    assert out["duration"] == 420
    assert out["trafficDelaySeconds"] == 60
    assert out["congestionScore"] > 0
    assert out["polyline"][0] == {"lat": 40.0, "lng": -83.0}
    assert out["steps"][0]["maneuver"] == "turn-right"
    assert out["steps"][0]["distanceMeters"] == 3018
