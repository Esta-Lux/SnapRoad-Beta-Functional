from services.us_state_centroids import canonical_state_name_for_centroid, centroid_for_state_name


def test_centroid_oh_abbreviation():
    c = centroid_for_state_name("OH")
    assert c is not None
    assert len(c) == 2


def test_centroid_title_case():
    assert centroid_for_state_name("ohio") is not None
    assert centroid_for_state_name("NEW YORK") is not None


def test_canonical_roundtrip_for_ohio():
    lat, lng = centroid_for_state_name("Ohio")
    assert canonical_state_name_for_centroid(lat, lng) == "Ohio"
