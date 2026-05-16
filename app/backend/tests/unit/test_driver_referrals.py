"""Unit tests for the Driver Referral (beta) service.

These cover the business rules: code resolution, self/duplicate guards,
idempotent verification + ledger writes, dashboard composition, and email masking.

The Supabase client is replaced with an in-memory fake that mimics the
chainable PostgREST builder (`.table(...).select().eq().execute()`).
"""
from __future__ import annotations

import uuid
from typing import Any

import pytest

from services import driver_referrals


# ---------- Fake Supabase ----------
class _FakeBuilder:
    def __init__(self, sb: "_FakeSupabase", table: str):
        self.sb = sb
        self.table_name = table
        self.op: str | None = None
        self.payload: Any = None
        self.filters: list[tuple[str, Any]] = []
        self.order_by: tuple[str, bool] | None = None
        self.limit_n: int | None = None
        self._return_full = True

    def select(self, *_cols):
        self.op = "select"
        return self

    def insert(self, payload):
        self.op = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.op = "update"
        self.payload = payload
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def order(self, column, desc=False):
        self.order_by = (column, desc)
        return self

    def limit(self, n):
        self.limit_n = n
        return self

    def execute(self):
        if self.op == "select":
            rows = self._matching_rows()
            if self.order_by:
                col, desc = self.order_by
                rows = sorted(rows, key=lambda r: (r.get(col) or ""), reverse=desc)
            if self.limit_n is not None:
                rows = rows[: self.limit_n]
            return _FakeResp(rows)
        if self.op == "insert":
            return _FakeResp(self.sb._insert(self.table_name, self.payload))
        if self.op == "update":
            return _FakeResp(self.sb._update(self.table_name, self.payload, self.filters))
        raise AssertionError("unsupported op")

    def _matching_rows(self) -> list[dict]:
        rows = list(self.sb.tables.get(self.table_name, []))
        for col, val in self.filters:
            rows = [r for r in rows if r.get(col) == val]
        return rows


class _FakeResp:
    def __init__(self, data):
        self.data = data


class _FakeSupabase:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict]] = {
            "profiles": [],
            "referrals": [],
            "wallet_transactions": [],
        }
        self.fail_on_insert: set[str] = set()

    def table(self, name: str) -> _FakeBuilder:
        self.tables.setdefault(name, [])
        return _FakeBuilder(self, name)

    def _insert(self, name: str, payload) -> list[dict]:
        if name in self.fail_on_insert:
            raise RuntimeError(f"forced failure inserting {name}")
        if isinstance(payload, dict):
            row = {**payload}
            row.setdefault("id", str(uuid.uuid4()))
            self.tables[name].append(row)
            return [row]
        out = []
        for item in payload or []:
            row = {**item}
            row.setdefault("id", str(uuid.uuid4()))
            self.tables[name].append(row)
            out.append(row)
        return out

    def _update(self, name: str, payload: dict, filters: list[tuple[str, Any]]) -> list[dict]:
        updated = []
        for row in self.tables.get(name, []):
            if all(row.get(col) == val for col, val in filters):
                row.update(payload)
                updated.append(row)
        return updated


def _profile(sb: _FakeSupabase, *, pid: str, email: str, friend_code: str, gems: int = 0) -> dict:
    row = {
        "id": pid,
        "email": email,
        "friend_code": friend_code,
        "gems": gems,
    }
    sb.tables["profiles"].append(row)
    return row


# ---------- normalize_code / mask_email ----------
def test_normalize_code_strips_prefix_and_uppercases():
    assert driver_referrals.normalize_code("snap-abc123") == "ABC123"
    assert driver_referrals.normalize_code("  SNAP-ABC123  ") == "ABC123"
    assert driver_referrals.normalize_code("abc123") == "ABC123"


def test_normalize_code_rejects_malformed():
    assert driver_referrals.normalize_code("") == ""
    assert driver_referrals.normalize_code(None) == ""
    assert driver_referrals.normalize_code("abc 123!") == ""


def test_mask_email_partial():
    assert driver_referrals.mask_email("jordan@example.com") == "jo***@example.com"
    assert driver_referrals.mask_email("a@b.co") == "a*@b.co"
    assert driver_referrals.mask_email("") == ""
    assert driver_referrals.mask_email("noatsign") == ""


# ---------- resolve_code_to_referrer ----------
def test_resolve_code_case_insensitive_and_prefix():
    sb = _FakeSupabase()
    _profile(sb, pid="user-1", email="r@x.com", friend_code="ABC123")
    assert driver_referrals.resolve_code_to_referrer(sb, "abc123") == "user-1"
    assert driver_referrals.resolve_code_to_referrer(sb, "SNAP-abc123") == "user-1"
    assert driver_referrals.resolve_code_to_referrer(sb, "snap-ABC123") == "user-1"


def test_resolve_code_accepts_raw_uuid():
    sb = _FakeSupabase()
    uid = str(uuid.uuid4())
    _profile(sb, pid=uid, email="r@x.com", friend_code="ZZZZZZ")
    assert driver_referrals.resolve_code_to_referrer(sb, uid) == uid


def test_resolve_code_unknown_returns_none():
    sb = _FakeSupabase()
    assert driver_referrals.resolve_code_to_referrer(sb, "NOPE12") is None
    assert driver_referrals.resolve_code_to_referrer(sb, "") is None


# ---------- apply_referral ----------
def test_apply_referral_rejects_self():
    sb = _FakeSupabase()
    _profile(sb, pid="user-1", email="me@x.com", friend_code="ABC123")
    result = driver_referrals.apply_referral(
        sb,
        referred_user_id="user-1",
        referred_email="me@x.com",
        code="ABC123",
    )
    assert result["status"] == "declined"
    assert result["reason"] == "self_referral"
    assert sb.tables["referrals"] == []


def test_apply_referral_rejects_unknown_code():
    sb = _FakeSupabase()
    result = driver_referrals.apply_referral(
        sb,
        referred_user_id="user-2",
        referred_email="friend@x.com",
        code="ZZZZZZ",
    )
    assert result["status"] == "declined"
    assert result["reason"] == "invalid_code"


def test_apply_referral_inserts_pending_row():
    sb = _FakeSupabase()
    _profile(sb, pid="referrer", email="r@x.com", friend_code="ABC123")
    result = driver_referrals.apply_referral(
        sb,
        referred_user_id="referred",
        referred_email="friend@x.com",
        code="abc123",
    )
    assert result["status"] == "pending"
    assert result["referral"]["referrer_id"] == "referrer"
    assert result["referral"]["referred_user_id"] == "referred"
    assert result["referral"]["status"] == "pending"
    assert result["referral"]["referral_code"] == "ABC123"
    assert len(sb.tables["referrals"]) == 1


def test_apply_referral_rejects_duplicate_referred_user():
    sb = _FakeSupabase()
    _profile(sb, pid="referrer", email="r@x.com", friend_code="ABC123")
    _profile(sb, pid="other-referrer", email="o@x.com", friend_code="OTH456")

    first = driver_referrals.apply_referral(
        sb,
        referred_user_id="referred",
        referred_email="friend@x.com",
        code="ABC123",
    )
    assert first["status"] == "pending"

    second = driver_referrals.apply_referral(
        sb,
        referred_user_id="referred",
        referred_email="friend@x.com",
        code="OTH456",
    )
    assert second["status"] == "already_referred"
    assert len(sb.tables["referrals"]) == 1
    assert sb.tables["referrals"][0]["referrer_id"] == "referrer"


# ---------- verify_referral ----------
def test_verify_referral_awards_once_and_is_idempotent(monkeypatch):
    monkeypatch.setattr(driver_referrals, "REFERRAL_SIGNUP_GEMS", 100)
    sb = _FakeSupabase()
    _profile(sb, pid="referrer", email="r@x.com", friend_code="ABC123", gems=10)
    driver_referrals.apply_referral(
        sb,
        referred_user_id="referred",
        referred_email="friend@x.com",
        code="ABC123",
    )

    first = driver_referrals.verify_referral(sb, referred_user_id="referred")
    assert first is not None
    assert first["gems_awarded"] == 100
    assert sb.tables["profiles"][0]["gems"] == 110
    assert len(sb.tables["wallet_transactions"]) == 1

    second = driver_referrals.verify_referral(sb, referred_user_id="referred")
    assert second is None
    assert sb.tables["profiles"][0]["gems"] == 110
    assert len(sb.tables["wallet_transactions"]) == 1


def test_verify_referral_writes_referral_bonus_ledger_row(monkeypatch):
    monkeypatch.setattr(driver_referrals, "REFERRAL_SIGNUP_GEMS", 100)
    sb = _FakeSupabase()
    _profile(sb, pid="referrer", email="r@x.com", friend_code="ABC123", gems=0)
    driver_referrals.apply_referral(
        sb,
        referred_user_id="referred",
        referred_email="friend@x.com",
        code="ABC123",
    )
    driver_referrals.verify_referral(sb, referred_user_id="referred")

    tx = sb.tables["wallet_transactions"][0]
    assert tx["tx_type"] == "referral_bonus"
    assert tx["direction"] == "credit"
    assert tx["amount"] == 100
    assert tx["user_id"] == "referrer"
    assert tx["reference_type"] == "referral"
    assert tx["metadata"]["referred_user_id"] == "referred"
    assert tx["balance_before"] == 0
    assert tx["balance_after"] == 100


def test_verify_referral_noop_when_no_pending_row():
    sb = _FakeSupabase()
    assert driver_referrals.verify_referral(sb, referred_user_id="missing") is None


def test_verify_referral_marks_status_only_when_reward_zero(monkeypatch):
    monkeypatch.setattr(driver_referrals, "REFERRAL_SIGNUP_GEMS", 0)
    sb = _FakeSupabase()
    _profile(sb, pid="referrer", email="r@x.com", friend_code="ABC123", gems=42)
    driver_referrals.apply_referral(
        sb,
        referred_user_id="referred",
        referred_email="friend@x.com",
        code="ABC123",
    )
    result = driver_referrals.verify_referral(sb, referred_user_id="referred")
    assert result is not None
    assert result["gems_awarded"] == 0
    assert sb.tables["profiles"][0]["gems"] == 42
    assert sb.tables["wallet_transactions"] == []
    assert sb.tables["referrals"][0]["status"] == "verified"


# ---------- build_dashboard / list_recent_referrals ----------
def test_build_dashboard_counts_progress_and_achievements(monkeypatch):
    monkeypatch.setattr(driver_referrals, "REFERRAL_SIGNUP_GEMS", 100)
    sb = _FakeSupabase()
    _profile(sb, pid="referrer", email="r@x.com", friend_code="ABC123", gems=600)
    # Two verified, one pending, one declined.
    sb.tables["referrals"].extend([
        {
            "id": "r1",
            "referrer_id": "referrer",
            "referred_user_id": "u1",
            "referred_email": "alice@example.com",
            "status": "verified",
            "gems_awarded": 100,
            "created_at": "2025-01-01T00:00:00Z",
            "verified_at": "2025-01-01T00:00:00Z",
            "joined_at": "2025-01-01T00:00:00Z",
        },
        {
            "id": "r2",
            "referrer_id": "referrer",
            "referred_user_id": "u2",
            "referred_email": "bob@example.com",
            "status": "verified",
            "gems_awarded": 100,
            "created_at": "2025-01-02T00:00:00Z",
            "verified_at": "2025-01-02T00:00:00Z",
            "joined_at": "2025-01-02T00:00:00Z",
        },
        {
            "id": "r3",
            "referrer_id": "referrer",
            "referred_user_id": "u3",
            "referred_email": "carol@example.com",
            "status": "pending",
            "gems_awarded": 0,
            "created_at": "2025-01-03T00:00:00Z",
        },
        {
            "id": "r4",
            "referrer_id": "referrer",
            "referred_email": "spam@example.com",
            "status": "declined",
            "gems_awarded": 0,
            "decline_reason": "invalid_code",
            "created_at": "2025-01-04T00:00:00Z",
        },
    ])

    dash = driver_referrals.build_dashboard(sb, user_id="referrer", recent_limit=10)
    assert dash["code"] == "ABC123"
    assert dash["invite_url"].endswith("/ABC123")
    assert dash["invited_count"] == 4
    assert dash["verified_count"] == 2
    assert dash["pending_count"] == 1
    assert dash["declined_count"] == 1
    assert dash["gems_earned"] == 200
    assert dash["reward_per_signup"] == 100
    assert dash["next_reward_target"] == 5
    assert dash["next_reward_label"] == "5 Drivers"
    # 2/5 -> 40%
    assert dash["progress_percent"] == 40
    assert len(dash["achievements"]) == 4
    assert dash["achievements"][0]["key"] == "first_invite"
    assert dash["achievements"][0]["unlocked"] is True
    assert dash["achievements"][1]["key"] == "five_drivers"
    assert dash["achievements"][1]["unlocked"] is False
    # Recent referrals are masked + ordered newest first.
    statuses = [r["status"] for r in dash["recent_referrals"]]
    assert statuses[0] == "declined"
    masked = dash["recent_referrals"][0]["email"]
    assert masked.endswith("@example.com")
    assert "*" in masked


def test_list_recent_referrals_returns_correct_statuses_and_masking():
    sb = _FakeSupabase()
    sb.tables["referrals"].extend([
        {
            "id": "r1",
            "referrer_id": "referrer",
            "referred_email": "alice@example.com",
            "status": "verified",
            "gems_awarded": 100,
            "verified_at": "2025-01-01T00:00:00Z",
            "created_at": "2025-01-01T00:00:00Z",
        },
        {
            "id": "r2",
            "referrer_id": "referrer",
            "referred_email": "bob@example.com",
            "status": "pending",
            "gems_awarded": 0,
            "created_at": "2025-01-02T00:00:00Z",
        },
    ])
    items = driver_referrals.list_recent_referrals(sb, referrer_id="referrer", limit=5)
    assert len(items) == 2
    assert items[0]["status"] == "pending"
    assert items[0]["email"] == "bo***@example.com"
    assert items[0]["gems_awarded"] == 0
    assert items[1]["status"] == "verified"
    assert items[1]["gems_awarded"] == 100


def test_get_or_create_referral_code_generates_when_missing():
    sb = _FakeSupabase()
    _profile(sb, pid="userX", email="u@x.com", friend_code="")
    sb.tables["profiles"][0]["friend_code"] = None
    code = driver_referrals.get_or_create_referral_code(sb, "userX")
    assert code
    assert sb.tables["profiles"][0]["friend_code"] == code
    # Stable on second call.
    code2 = driver_referrals.get_or_create_referral_code(sb, "userX")
    assert code2 == code


def test_build_invite_url_uses_configured_base():
    url = driver_referrals.build_invite_url("ABC123")
    assert url.endswith("/ABC123")
    assert "://" in url


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-q"]))
