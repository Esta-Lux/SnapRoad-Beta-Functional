"""
SLO thresholds + helpers for the admin dashboard health surface.

Pure module: no Supabase imports, no FastAPI dependencies, no I/O. The metrics
route does the data gathering and passes counts/snapshots in here. This keeps
the SLO math unit-testable and lets us re-use it from the public /api/health
endpoint without dragging admin auth or DB calls into the request path.

Thresholds are intentionally conservative so the dashboard "decision system"
agrees with on-call expectations:

    api_success_rate     >= 98 % (warning  90-98 %, critical < 90 %)
    reward_success_rate  >= 99 % (critical  < 99 %)
    route_completion     >= 90 % (warning   < 90 %)
    crash_free_sessions  >= 97 % (placeholder; client crash pipeline TBD)

Any signal with no traffic in the window returns status="ok" (treat "no
samples" as healthy rather than alarming on cold starts).
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, Literal, Optional


SLOStatus = Literal["ok", "warning", "critical"]


SLO_THRESHOLDS: Dict[str, Dict[str, float]] = {
    "api_success_rate": {"ok": 0.98, "warning": 0.90},
    "reward_success_rate": {"ok": 0.99},
    "route_completion_rate": {"ok": 0.90},
    "crash_free_sessions": {"ok": 0.97},
}


def safe_ratio(numerator: float, denominator: float) -> Optional[float]:
    """Return numerator/denominator clamped to [0, 1], or None when no samples.
    Callers render None as a neutral '—' rather than 0%, which would falsely
    look like an outage on an idle service."""
    try:
        if denominator <= 0:
            return None
        r = float(numerator) / float(denominator)
        if r < 0:
            return 0.0
        if r > 1:
            return 1.0
        return r
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def evaluate_status(rate: Optional[float], thresholds: Dict[str, float]) -> SLOStatus:
    """Map a rate (0..1) to ok/warning/critical using the threshold dict.

    Two-tier signals (e.g. api_success_rate) provide both 'ok' and 'warning'
    keys. Single-tier signals (e.g. reward_success_rate) only set 'ok'; below
    the bar is critical (no soft warning band, since a single missed reward
    payout is a real customer issue).
    """
    if rate is None:
        return "ok"

    ok = thresholds.get("ok")
    warn = thresholds.get("warning")

    if ok is None:
        return "ok"

    if rate >= ok:
        return "ok"
    if warn is not None and rate >= warn:
        return "warning"
    return "critical"


def compute_api_rates_from_telemetry(events: Iterable[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    """Aggregate the in-memory telemetry buffer into success / error rates.

    Counts every event with a numeric status_code. 5xx counts as a failure;
    4xx is treated as success at the *infrastructure* level (those are client
    errors, not API outages). Adjusting this rule is one place to change.

    Returns:
        {"total": int, "errors": int, "success_rate": float|None, "error_rate": float|None}
    """
    total = 0
    errors = 0
    for e in events or ():
        sc = e.get("status_code")
        try:
            code = int(sc) if sc is not None else None
        except (TypeError, ValueError):
            code = None
        if code is None:
            continue
        total += 1
        if code >= 500:
            errors += 1

    success_rate = safe_ratio(total - errors, total)
    error_rate = safe_ratio(errors, total)
    return {
        "total": total,
        "errors": errors,
        "success_rate": success_rate,
        "error_rate": error_rate,
    }


def overall_status(statuses: Iterable[SLOStatus]) -> SLOStatus:
    """Roll up per-signal statuses into a single dashboard verdict.
    Critical wins over warning wins over ok. Empty input → ok."""
    worst: SLOStatus = "ok"
    for s in statuses:
        if s == "critical":
            return "critical"
        if s == "warning":
            worst = "warning"
    return worst


def health_status(api_success_rate: Optional[float]) -> Literal["ok", "degraded", "down"]:
    """Public /api/health verdict based on API success rate only.

    Mirrors the spec from the runbook:
        ok        success_rate >= 98%
        degraded  90% <= success_rate < 98%
        down      success_rate < 90%

    No samples yet → "ok" (don't alarm on cold start; uptime probes will fail
    independently if the process is actually down)."""
    if api_success_rate is None:
        return "ok"
    if api_success_rate >= 0.98:
        return "ok"
    if api_success_rate >= 0.90:
        return "degraded"
    return "down"
