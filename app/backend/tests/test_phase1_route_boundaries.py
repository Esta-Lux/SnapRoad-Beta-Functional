from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def test_routes_no_direct_mock_data_imports_for_phase1_targets():
    for rel in (
        "routes/navigation.py",
        "routes/trips.py",
        "routes/offers.py",
    ):
        text = _read(rel)
        assert "services.mock_data" not in text, f"{rel} still imports services.mock_data"


def test_phase1_ports_own_mock_data_boundary():
    for rel in (
        "services/navigation_ports.py",
        "services/trips_ports.py",
        "services/offers_ports.py",
    ):
        text = _read(rel)
        assert "services.mock_data" in text, f"{rel} should own mock data boundary"
