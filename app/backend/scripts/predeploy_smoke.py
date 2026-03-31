"""
Lightweight pre-deploy smoke checks that run in CI without external credentials.
"""
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]


def assert_contains(path: Path, pattern: str, message: str) -> None:
    text = path.read_text(encoding="utf-8")
    if not re.search(pattern, text, re.MULTILINE):
        raise AssertionError(f"{path}: {message}")


def main() -> int:
    # Auth protection checks
    assert_contains(
        ROOT / "routes" / "payments.py",
        r"Depends\(get_current_user\)",
        "checkout/status endpoints must require authenticated user",
    )
    assert_contains(
        ROOT / "routes" / "webhooks.py",
        r"stripe\.Webhook\.construct_event",
        "Stripe webhook signature verification must exist",
    )
    assert_contains(
        ROOT / "main.py",
        r"validate_production_env\(",
        "production env validation must run on startup",
    )
    assert_contains(
        ROOT / "config.py",
        r"def validate_production_env",
        "config production validator missing",
    )
    print("Pre-deploy smoke checks passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"Smoke check failed: {exc}")
        raise SystemExit(1)
