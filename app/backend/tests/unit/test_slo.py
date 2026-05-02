"""Unit tests for the SLO threshold helpers.

The SLO module is pure (no Supabase / FastAPI), so we exercise the
threshold/status logic directly. This is what the public /api/health and
/api/admin/metrics/slo endpoints rely on for their badges.
"""

import pytest

from services import slo


def test_safe_ratio_handles_zero_and_negatives():
    assert slo.safe_ratio(0, 0) is None
    assert slo.safe_ratio(5, 0) is None
    assert slo.safe_ratio(98, 100) == pytest.approx(0.98)
    assert slo.safe_ratio(-1, 10) == pytest.approx(0.0)
    assert slo.safe_ratio(15, 10) == pytest.approx(1.0)


def test_evaluate_status_two_tier():
    th = slo.SLO_THRESHOLDS["api_success_rate"]
    assert slo.evaluate_status(0.99, th) == "ok"
    assert slo.evaluate_status(0.98, th) == "ok"
    assert slo.evaluate_status(0.95, th) == "warning"
    assert slo.evaluate_status(0.90, th) == "warning"
    assert slo.evaluate_status(0.80, th) == "critical"


def test_evaluate_status_single_tier_treats_below_ok_as_critical():
    th = slo.SLO_THRESHOLDS["reward_success_rate"]
    assert slo.evaluate_status(1.0, th) == "ok"
    assert slo.evaluate_status(0.99, th) == "ok"
    assert slo.evaluate_status(0.985, th) == "critical"
    assert slo.evaluate_status(0.50, th) == "critical"


def test_evaluate_status_no_samples_is_ok():
    assert slo.evaluate_status(None, slo.SLO_THRESHOLDS["api_success_rate"]) == "ok"
    assert slo.evaluate_status(None, slo.SLO_THRESHOLDS["reward_success_rate"]) == "ok"


def test_compute_api_rates_from_telemetry_counts_5xx_as_failure():
    events = [
        {"status_code": 200},
        {"status_code": 201},
        {"status_code": 404},
        {"status_code": 401},
        {"status_code": 500},
        {"status_code": 503},
        {"status_code": "200"},
        {"status_code": None},
        {"status_code": "not-a-number"},
    ]
    out = slo.compute_api_rates_from_telemetry(events)
    assert out["total"] == 7
    assert out["errors"] == 2
    assert out["success_rate"] == pytest.approx(5 / 7)
    assert out["error_rate"] == pytest.approx(2 / 7)


def test_compute_api_rates_from_telemetry_empty_buffer():
    out = slo.compute_api_rates_from_telemetry([])
    assert out["total"] == 0
    assert out["errors"] == 0
    assert out["success_rate"] is None
    assert out["error_rate"] is None


def test_overall_status_picks_worst():
    assert slo.overall_status([]) == "ok"
    assert slo.overall_status(["ok", "ok", "ok"]) == "ok"
    assert slo.overall_status(["ok", "warning", "ok"]) == "warning"
    assert slo.overall_status(["warning", "critical", "ok"]) == "critical"


def test_health_status_thresholds():
    assert slo.health_status(None) == "ok"
    assert slo.health_status(0.99) == "ok"
    assert slo.health_status(0.98) == "ok"
    assert slo.health_status(0.95) == "degraded"
    assert slo.health_status(0.90) == "degraded"
    assert slo.health_status(0.85) == "down"
    assert slo.health_status(0.0) == "down"
