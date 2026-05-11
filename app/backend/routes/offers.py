from fastapi import APIRouter, HTTPException, Query, Depends, Request
from typing import Annotated, Optional
from datetime import datetime, timedelta, timezone
from models.schemas import OfferCreate

from services.offers_ports import (
    append_driver_location_visit,
    get_driver_location_history,
    get_offer_config,
)
from models.schemas import ImageGenerateRequest, LocationVisit
from services.supabase_service import _sb, sb_get_profile, _table_missing
from services.offer_utils import calculate_free_discount
from services.cache import cache_get, cache_set, cache_delete, invalidate_offers_nearby_cache
from services.fee_calculator import calculate_redemption_fee, record_redemption_fee
from services.offer_categories import attach_offer_category_fields, public_category_list
from services.offer_analytics import record_offer_event
from middleware.auth import get_current_user, get_current_user_optional
from limiter import limiter
import asyncio
import copy
import uuid
import logging
from jose import JWTError, jwt
from config import JWT_ALGORITHM, JWT_SECRET

router = APIRouter(prefix="/api", tags=["Offers"])

CurrentUser = Annotated[dict, Depends(get_current_user)]
OptionalUser = Annotated[Optional[dict], Depends(get_current_user_optional)]
logger = logging.getLogger(__name__)


def _distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math

    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _resolve_offer_by_id(offer_id: str) -> Optional[dict]:
    try:
        result = _sb().table("offers").select("*").eq("id", offer_id).maybe_single().execute()
        if result and result.data:
            return result.data
        return None
    except Exception:
        logger.exception("failed to resolve offer %s", offer_id)
        raise HTTPException(status_code=503, detail="Offer service unavailable")


def _offer_type(offer: dict) -> str:
    return str(offer.get("offer_type") or ("admin" if offer.get("is_admin_offer") else "partner")).lower()


def _get_profile_like(user_id: str) -> dict:
    try:
        row = sb_get_profile(user_id)
        if row:
            return row
    except Exception:
        logger.warning("sb_get_profile failed for %s", user_id, exc_info=True)
    return {}


def _user_offer_affinity(user_id: str, offer: dict) -> tuple[float, bool]:
    score = 0.0
    business_name = str(offer.get("business_name") or "").strip().lower()
    business_type = str(offer.get("business_type") or "").strip().lower()

    history = get_driver_location_history(user_id)
    visits_here = 0
    same_type_visits = 0
    for visit in history:
      visit_name = str(visit.get("business_name") or "").strip().lower()
      visit_type = str(visit.get("business_type") or "").strip().lower()
      if business_name and visit_name and business_name in visit_name:
          visits_here += 1
      if business_type and visit_type and business_type == visit_type:
          same_type_visits += 1

    if visits_here:
        score += 18 + visits_here * 6
    if same_type_visits:
        score += min(14, same_type_visits * 3)

    user = _get_profile_like(user_id)
    routes = user.get("saved_routes", []) or []
    for route in routes:
        destination = str(route.get("destination") or "").strip().lower()
        if business_name and destination and business_name in destination:
            score += 8
            break

    boosted = False
    boost_multiplier = float(offer.get("boost_multiplier") or 1.0)
    boost_expiry = str(offer.get("boost_expiry") or "")
    if boost_multiplier > 1:
        try:
            boosted = not boost_expiry or datetime.fromisoformat(boost_expiry.replace("Z", "+00:00")) > datetime.now(timezone.utc)
        except Exception:
            boosted = True
    if boosted:
        score += (boost_multiplier - 1) * 5

    return score, boosted


def _next_gem_total(user_id: str) -> int:
    try:
        result = _sb().table("profiles").select("gems").eq("id", user_id).limit(1).execute()
        if result.data:
            return int(result.data[0].get("gems") or 0)
    except Exception:
        logger.warning("profiles gems read failed for %s", user_id, exc_info=True)
    row = _get_profile_like(user_id)
    return int(row.get("gems") or 0)


def _try_redeem_offer_atomic(sb, *, user_id: str, offer: dict, fee_preview: dict) -> Optional[dict]:
    """Use the DB atomic redemption RPC when present; fall back to legacy writes otherwise."""
    offer_id = offer.get("id")
    if not offer_id:
        return None
    payload = {
        "p_user_id": user_id,
        "p_offer_id": offer_id,
        "p_fee_amount": float(fee_preview.get("fee_amount") or 0),
        "p_fee_cents": int(fee_preview.get("fee_cents") or 0),
        "p_fee_tier": int(fee_preview.get("fee_tier") or 1),
    }
    try:
        res = sb.rpc("redeem_offer_atomic", payload).execute()
        data = getattr(res, "data", None)
    except Exception as exc:
        logger.debug("redeem_offer_atomic unavailable; using legacy redemption path: %s", exc)
        return None
    if isinstance(data, list):
        first = data[0] if data else None
        return first if isinstance(first, dict) else None
    return data if isinstance(data, dict) else None


def _favorited_offer_ids(user_id: str) -> set[str]:
    if not user_id:
        return set()
    try:
        res = _sb().table("offer_favorites").select("offer_id").eq("user_id", user_id).execute()
        return {str(r["offer_id"]) for r in (res.data or [])}
    except Exception as e:
        if _table_missing(e):
            logger.warning("offer_favorites table missing; run sql/036_offer_favorites.sql")
        else:
            logger.warning("offer_favorites list failed: %s", e)
        return set()


def _apply_favorited_to_offers(user_id: str, offers: list[dict]) -> None:
    fav = _favorited_offer_ids(user_id)
    for o in offers:
        o["favorited"] = str(o.get("id")) in fav


def _redemption_rows_by_offer_ids(user_id: str, offer_ids: list[str]) -> dict[str, dict]:
    """Latest redemption per offer for this user (one row per offer_id)."""
    if not user_id or not offer_ids:
        return {}
    try:
        res = (
            _sb()
            .table("redemptions")
            .select("id, offer_id, status, redeemed_at")
            .eq("user_id", user_id)
            .in_("offer_id", list(dict.fromkeys(offer_ids)))
            .execute()
        )
        out: dict[str, dict] = {}
        for r in res.data or []:
            oid = str(r.get("offer_id") or "")
            if oid and oid not in out:
                out[oid] = dict(r)
        return out
    except Exception as e:
        logger.warning("redemption lookup by offers failed: %s", e)
        return {}


def _apply_redeemed_to_offers(user_id: str, offers: list[dict]) -> None:
    if not offers:
        return
    if not user_id:
        for o in offers:
            o["redeemed"] = False
            o["redemption_id"] = None
            o["redemption"] = None
        return
    ids = [str(o.get("id")) for o in offers if o.get("id") is not None]
    by_offer = _redemption_rows_by_offer_ids(user_id, ids)
    for o in offers:
        oid = str(o.get("id") or "")
        row = by_offer.get(oid)
        if row:
            o["redeemed"] = True
            o["redemption_id"] = str(row.get("id") or "")
            o["redemption"] = {
                "status": row.get("status"),
                "redeemed_at": row.get("redeemed_at"),
            }
        else:
            o["redeemed"] = False
            o["redemption_id"] = None
            o["redemption"] = None


def _finalize_nearby_cached_response(cached: dict, user_id: str) -> dict:
    """Deep-clone cached nearby payload and attach per-user favorited + redeemed flags (cache is not user-scoped)."""
    out = copy.deepcopy(cached)
    data = out.get("data") or []
    if user_id:
        _apply_favorited_to_offers(user_id, data)
        _apply_redeemed_to_offers(user_id, data)
    else:
        for o in data:
            o["favorited"] = False
            o["redeemed"] = False
            o["redemption_id"] = None
            o["redemption"] = None
    return out


def _qr_nonce_key(nonce: str) -> str:
    return f"offer-qr-nonce:{nonce}"


def _sign_qr_token(payload: dict) -> str:
    secret = (JWT_SECRET or "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret is not configured")
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def _decode_qr_token(token: str) -> dict:
    secret = (JWT_SECRET or "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret is not configured")
    try:
        return jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired QR token") from exc


def validate_qr_token(raw_token: str, *, consume_nonce: bool) -> dict:
    token = str(raw_token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing QR token")

    payload = _decode_qr_token(token)
    nonce = str(payload.get("nonce") or "").strip()
    if not nonce:
        raise HTTPException(status_code=401, detail="QR token missing nonce")

    nonce_key = _qr_nonce_key(nonce)
    cached = cache_get(nonce_key)
    if not cached:
        raise HTTPException(status_code=401, detail="QR token is expired or has already been used")
    if consume_nonce:
        cache_delete(nonce_key)

    offer = _resolve_offer_by_id(str(payload.get("offer_id") or ""))
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    return {
        "payload": payload,
        "offer": offer,
        "nonce": nonce,
    }


def _issue_post_redeem_qr(*, offer: dict, user_id: str, redemption_id: str) -> Optional[dict]:
    """JWT + nonce for partner scan after redeem; no geofence (unlike generate-qr)."""
    from services.runtime_config import cfg_enabled, get_runtime_config

    if not cfg_enabled(get_runtime_config(), "partner_qr_redemption_enabled", default=True):
        return None
    try:
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        nonce = str(uuid.uuid4())
        payload = {
            "offer_id": str(offer.get("id")),
            "user_id": user_id,
            "redemption_id": redemption_id,
            "exp": int(expires_at.timestamp()),
            "expires_at": expires_at.isoformat(),
            "nonce": nonce,
            "kind": "post_redeem",
        }
        token = _sign_qr_token(payload)
        cache_set(
            _qr_nonce_key(nonce),
            {
                "offer_id": str(offer.get("id")),
                "user_id": user_id,
                "redemption_id": redemption_id,
                "expires_at": expires_at.isoformat(),
            },
            ttl=7 * 24 * 3600,
        )
        rid_clean = redemption_id.replace("-", "")
        claim_code = rid_clean[-8:].upper() if len(rid_clean) >= 8 else rid_clean.upper()
        return {
            "qr_token": token,
            "expires_at": expires_at.isoformat(),
            "claim_code": claim_code,
        }
    except Exception as e:
        logger.warning("post-redeem QR issue failed: %s", e)
        return None


def _is_unique_violation(exc: BaseException) -> bool:
    code = getattr(exc, "code", None)
    if code in ("23505", 23505):
        return True
    msg = str(exc).lower()
    return "unique" in msg and "violat" in msg


def complete_offer_redemption(
    *,
    offer: dict,
    user_id: str,
    scanned_by_user_id: Optional[str] = None,
    qr_nonce: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    redemption_id_from_qr: Optional[str] = None,
) -> dict:
    from services.runtime_config import require_enabled

    require_enabled(
        "offer_redemptions_enabled",
        "Offer redemptions are temporarily disabled.",
    )
    require_enabled(
        "gems_rewards_enabled",
        "Offer redemptions are temporarily unavailable.",
    )
    sb = _sb()
    existing_res = (
        sb.table("redemptions")
        .select("id,scanned_by_user_id,gems_earned,discount_applied,redeemed_at,status")
        .eq("offer_id", offer.get("id"))
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if existing_res.data:
        row = existing_res.data[0]
        rid = str(row.get("id") or "")
        if scanned_by_user_id:
            exp = str(redemption_id_from_qr or "").strip().replace("-", "").lower()
            got = rid.replace("-", "").lower()
            if exp and got and exp != got:
                return {"success": False, "message": "Invalid redemption QR"}
            new_total = _next_gem_total(user_id)
            try:
                disc = int(row.get("discount_applied") or 0)
            except (TypeError, ValueError):
                disc = 0
            try:
                ge = int(row.get("gems_earned") or 0)
            except (TypeError, ValueError):
                ge = 0
            gc = abs(ge)
            base = {
                "redemption_id": rid,
                "discount_percent": disc,
                "gem_cost": gc,
                "gems_earned": ge,
                "new_gem_total": new_total,
                "redeemed_at": str(row.get("redeemed_at") or ""),
                "used_in_store": True,
            }
            if row.get("scanned_by_user_id"):
                return {"success": True, "data": {**base, "scan_already_recorded": True}}
            try:
                sb.table("redemptions").update(
                    {"scanned_by_user_id": scanned_by_user_id, "qr_nonce": qr_nonce}
                ).eq("id", rid).eq("user_id", user_id).execute()
            except Exception:
                logger.exception("redemption scan update failed")
                return {"success": False, "message": "Could not record scan"}
            return {"success": True, "data": {**base, "scan_confirmed": True}}
        return {"success": False, "message": "Offer already redeemed"}

    user_profile = _get_profile_like(user_id)
    is_premium = bool(user_profile.get("is_premium")) or str(user_profile.get("plan") or "").lower() in {"premium", "family"}
    premium_disc = offer.get("premium_discount_percent") or offer.get("discount_percent", 0)
    free_disc = offer.get("free_discount_percent") or calculate_free_discount(premium_disc)
    discount = premium_disc if is_premium else free_disc
    gem_cost = int(offer.get("base_gems") or offer.get("gem_cost") or offer.get("gems_reward") or 25)
    current_gems = int(user_profile.get("gems") or 0)
    if current_gems < gem_cost:
        return {
            "success": False,
            "message": f"You need {gem_cost} gems to redeem this offer.",
            "data": {
                "gem_cost": gem_cost,
                "current_gems": current_gems,
            },
        }

    if offer.get("partner_id"):
        fee_preview = calculate_redemption_fee(str(offer.get("partner_id")))
    else:
        fee_preview = {
            "fee_amount": 0.0,
            "fee_cents": 0,
            "fee_tier": 1,
        }

    rpc_payload = _try_redeem_offer_atomic(sb, user_id=user_id, offer=offer, fee_preview=fee_preview)
    if rpc_payload is not None:
        if rpc_payload.get("ok") is True:
            try:
                if offer.get("partner_id"):
                    record_redemption_fee(offer.get("partner_id"))
            except Exception:
                logger.warning("record_redemption_fee after atomic redeem failed", exc_info=True)
            redeemed_at = str(rpc_payload.get("redeemed_at") or datetime.now(timezone.utc).isoformat())
            record_offer_event(
                offer=offer,
                event_type="redeem",
                partner_id=offer.get("partner_id"),
                user_id=user_id,
                lat=lat,
                lng=lng,
            )
            rid = str(rpc_payload.get("redemption_id") or "")
            gc = int(rpc_payload.get("gem_cost") or gem_cost)
            disc = int(rpc_payload.get("discount_percent") or discount)
            new_total = int(rpc_payload.get("new_gem_total") or _next_gem_total(user_id))
            rpc_current_gems_raw = rpc_payload.get("current_gems")
            rpc_current_gems: Optional[int] = None
            if rpc_current_gems_raw is not None:
                try:
                    rpc_current_gems = int(rpc_current_gems_raw)
                except (TypeError, ValueError):
                    rpc_current_gems = None

            # Guardrail: a redeem must never increase wallet balance.
            # Only apply write-side correction when we have an authoritative pre-redeem value from RPC.
            if rpc_current_gems is not None:
                expected_total = max(0, rpc_current_gems - int(gc))
                if new_total > expected_total:
                    correction = expected_total - new_total
                    corrected = False
                    try:
                        sb.rpc("increment_gems", {"uid": user_id, "amount": correction}).execute()
                        corrected = True
                    except Exception:
                        try:
                            sb.table("profiles").update({"gems": expected_total}).eq("id", user_id).execute()
                            corrected = True
                        except Exception:
                            logger.warning("Redeem gem correction failed for user %s", user_id, exc_info=True)
                    if corrected:
                        new_total = expected_total
            elif new_total > int(current_gems):
                logger.warning(
                    "Skipping redeem correction without authoritative pre-balance; user=%s current_gems=%s new_gem_total=%s gem_cost=%s",
                    user_id,
                    current_gems,
                    new_total,
                    gc,
                )
                # Keep response aligned with persisted wallet state without mutating balance from stale assumptions.
                new_total = _next_gem_total(user_id)
            data_out = {
                "discount_percent": disc,
                "gem_cost": gc,
                "gems_earned": -gc,
                "new_gem_total": new_total,
                "is_free_item": offer.get("is_free_item", False),
                "fee_cents": int(fee_preview.get("fee_cents") or 0),
                "fee_tier": int(fee_preview.get("fee_tier") or 1),
                "fee_amount": float(fee_preview.get("fee_amount") or 0),
                "redeemed_at": redeemed_at,
                "redemption_id": rid,
            }
            if rid:
                qr_payload = _issue_post_redeem_qr(offer=offer, user_id=user_id, redemption_id=rid)
                if qr_payload:
                    data_out.update(qr_payload)
            return {"success": True, "data": data_out}
        err = str(rpc_payload.get("error") or "redeem_failed")
        if err == "already_redeemed":
            return {"success": False, "message": "Offer already redeemed"}
        if err == "insufficient_gems":
            return {
                "success": False,
                "message": f"You need {int(rpc_payload.get('gem_cost') or gem_cost)} gems to redeem this offer.",
                "data": {
                    "gem_cost": int(rpc_payload.get("gem_cost") or gem_cost),
                    "current_gems": int(rpc_payload.get("current_gems") or current_gems),
                },
            }
        if err == "offer_not_found":
            return {"success": False, "message": "Offer not found"}
        if err in ("offer_inactive", "offer_expired"):
            return {"success": False, "message": "This offer is no longer available"}
        logger.warning("redeem_offer_atomic returned error=%s payload=%s", err, rpc_payload)
        return {"success": False, "message": "Could not complete redemption"}

    fee_record = record_redemption_fee(offer.get("partner_id"))
    redeemed_at = datetime.now(timezone.utc).isoformat()
    redemption_payload = {
        "offer_id": offer.get("id"),
        "user_id": user_id,
        "partner_id": offer.get("partner_id"),
        "gems_earned": -gem_cost,
        "discount_applied": discount,
        "fee_amount": fee_record["fee_amount"],
        "fee_cents": fee_record["fee_cents"],
        "fee_tier": fee_record["fee_tier"],
        "status": "verified",
        "scanned_by_user_id": scanned_by_user_id,
        "qr_nonce": qr_nonce,
        "redeemed_at": redeemed_at,
    }
    redemption_id: Optional[str] = None
    try:
        ins = sb.table("redemptions").insert(redemption_payload).execute()
        rows = ins.data or []
        if rows:
            redemption_id = str(rows[0].get("id")) if rows[0].get("id") is not None else None
    except Exception as exc:
        if _is_unique_violation(exc):
            return {"success": False, "message": "Offer already redeemed"}
        logger.exception("redemption insert failed")
        return {"success": False, "message": "Could not complete redemption"}

    if not redemption_id:
        try:
            r2 = (
                sb.table("redemptions")
                .select("id")
                .eq("user_id", user_id)
                .eq("offer_id", offer.get("id"))
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if r2.data:
                redemption_id = str(r2.data[0].get("id"))
        except Exception:
            redemption_id = None
    if not redemption_id:
        return {"success": False, "message": "Could not complete redemption"}

    debited = False
    try:
        sb.rpc("increment_gems", {"uid": user_id, "amount": -gem_cost}).execute()
        debited = True
    except Exception:
        try:
            sb.table("profiles").update({"gems": max(0, current_gems - gem_cost)}).eq("id", user_id).execute()
            debited = True
        except Exception as exc:
            logger.warning("Gem debit failed for user %s: %s", user_id, exc)

    if not debited:
        try:
            sb.table("redemptions").delete().eq("id", redemption_id).eq("user_id", user_id).execute()
        except Exception:
            logger.warning("rollback redemption delete failed for %s", redemption_id)
        return {"success": False, "message": "Could not deduct gems"}

    if offer.get("partner_id"):
        try:
            partner_res = sb.table("partners").select("total_redemptions,total_fees_owed").eq("id", offer.get("partner_id")).maybe_single().execute()
            partner_row = partner_res.data or {}
            sb.table("partners").update({
                "total_redemptions": int(partner_row.get("total_redemptions") or 0) + 1,
                "total_fees_owed": round(float(partner_row.get("total_fees_owed") or 0) + fee_record["fee_amount"], 2),
            }).eq("id", offer.get("partner_id")).execute()
        except Exception as exc:
            logger.warning("Partner fee aggregate update failed: %s", exc)

    try:
        sb.table("offers").update({"redemption_count": int(offer.get("redemption_count") or 0) + 1}).eq("id", offer.get("id")).execute()
    except Exception as exc:
        logger.warning("Offer redemption counter update failed: %s", exc)

    record_offer_event(
        offer=offer,
        event_type="redeem",
        partner_id=offer.get("partner_id"),
        user_id=user_id,
        lat=lat,
        lng=lng,
    )

    new_total = _next_gem_total(user_id)
    try:
        from services.wallet_ledger import record_wallet_transaction

        record_wallet_transaction(
            sb,
            user_id=user_id,
            tx_type="offer_redeem",
            direction="debit",
            amount=int(gem_cost),
            balance_before=int(current_gems),
            balance_after=int(new_total),
            reference_type="redemption",
            reference_id=redemption_id,
            metadata={"offer_id": str(offer.get("id")), "gem_cost": int(gem_cost)},
        )
    except Exception:
        logger.debug("wallet ledger redeem skipped", exc_info=True)

    data_legacy = {
        "discount_percent": discount,
        "gem_cost": gem_cost,
        "gems_earned": -gem_cost,
        "new_gem_total": new_total,
        "is_free_item": offer.get("is_free_item", False),
        "fee_cents": fee_record["fee_cents"],
        "fee_tier": fee_record["fee_tier"],
        "redeemed_at": redeemed_at,
        "redemption_id": redemption_id,
    }
    if redemption_id:
        qr_payload = _issue_post_redeem_qr(offer=offer, user_id=user_id, redemption_id=str(redemption_id))
        if qr_payload:
            data_legacy.update(qr_payload)
    return {"success": True, "data": data_legacy}


def _coord_ok(lat: object, lng: object) -> bool:
    try:
        la = float(lat)  # type: ignore[arg-type]
        lo = float(lng)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return False
    if abs(la) < 1e-7 and abs(lo) < 1e-7:
        return False
    return abs(la) <= 90 and abs(lo) <= 180


def _hydrate_offer_coordinates_from_locations(offers: list[dict]) -> None:
    """Fill lat/lng and optional google_place_id from partner_locations when missing on the offer row."""
    need: list[str] = []
    for o in offers:
        lid = o.get("location_id")
        if not lid:
            continue
        need_coords = not _coord_ok(o.get("lat"), o.get("lng"))
        need_place = not str(o.get("google_place_id") or "").strip()
        if need_coords or need_place:
            need.append(str(lid))
    if not need:
        return
    uniq = list(dict.fromkeys(need))
    loc_map: dict[str, dict] = {}
    try:
        res = _sb().table("partner_locations").select("id,lat,lng,google_place_id").in_("id", uniq).execute()
        for r in res.data or []:
            rid = str(r.get("id") or "")
            if rid:
                loc_map[rid] = r
    except Exception:
        logger.debug("partner_locations hydrate (wide) failed, retrying narrow", exc_info=True)
        try:
            res = _sb().table("partner_locations").select("id,lat,lng").in_("id", uniq).execute()
            for r in res.data or []:
                rid = str(r.get("id") or "")
                if rid:
                    loc_map[rid] = r
        except Exception as e:
            logger.warning("partner_locations hydrate for nearby offers: %s", e)
            return
    for o in offers:
        lid = o.get("location_id")
        if not lid:
            continue
        row = loc_map.get(str(lid))
        if not row:
            continue
        if not _coord_ok(o.get("lat"), o.get("lng")):
            lat, lng = row.get("lat"), row.get("lng")
            if _coord_ok(lat, lng):
                o["lat"] = lat
                o["lng"] = lng
        gpid = row.get("google_place_id")
        if gpid and not o.get("google_place_id"):
            o["google_place_id"] = str(gpid).strip()


def _active_offers_source(limit: int = 500) -> list[dict]:
    try:
        rows = _sb().table("offers").select("*").eq("status", "active").limit(limit).execute()
        return rows.data or []
    except Exception:
        logger.exception("active offers read failed")
        raise HTTPException(status_code=503, detail="Offer service unavailable")


@router.get("/offers")
@limiter.limit("60/minute")
def get_offers(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    auth_user: OptionalUser = None,
):
    """Get all active offers from the database (no mock fallback)."""
    _ = request
    try:
        sb = _sb()
        result = sb.table("offers").select("*").eq("status", "active").limit(limit).execute()
        rows = result.data or []
        offers = []
        for offer in rows:
            premium_disc = offer.get("premium_discount_percent") or offer.get("discount_percent", 0)
            free_disc = offer.get("free_discount_percent") or calculate_free_discount(premium_disc)
            offers.append({
                "id": offer.get("id"),
                "business_name": offer.get("business_name", ""),
                "title": offer.get("title"),
                "business_type": offer.get("business_type", "retail"),
                "description": offer.get("description", ""),
                "discount_percent": premium_disc,
                "premium_discount_percent": premium_disc,
                "free_discount_percent": free_disc,
                "is_free_item": offer.get("is_free_item", False),
                "gem_cost": offer.get("base_gems", 0),
                "gems_reward": offer.get("base_gems", 0),
                "base_gems": offer.get("base_gems", 0),
                "address": offer.get("address"),
                "image_url": offer.get("image_url"),
                "lat": offer.get("lat", 0),
                "lng": offer.get("lng", 0),
                "offer_url": offer.get("offer_url"),
                "expires_at": offer.get("expires_at", ""),
                "is_admin_offer": offer.get("is_admin_offer", False),
                "created_by": offer.get("created_by", ""),
                "redemption_count": offer.get("redemption_count", 0),
                "views": int(offer.get("view_count") or offer.get("views") or 0),
                "redeemed": False,
                "offer_source": offer.get("offer_source", "direct"),
                "offer_type": offer.get("offer_type", "admin" if offer.get("is_admin_offer") else "partner"),
                "boost_multiplier": offer.get("boost_multiplier", 1.0),
                "boost_expiry": offer.get("boost_expiry"),
                "allocated_locations": offer.get("allocated_locations", []),
                "original_price": offer.get("original_price"),
                "affiliate_tracking_url": offer.get("affiliate_tracking_url"),
                "external_id": offer.get("external_id"),
                "yelp_rating": offer.get("yelp_rating"),
                "yelp_review_count": offer.get("yelp_review_count"),
                "yelp_image_url": offer.get("yelp_image_url"),
            })
            attach_offer_category_fields(offers[-1])
        uid = str(auth_user.get("user_id") or auth_user.get("id") or "") if auth_user else ""
        if uid:
            _apply_favorited_to_offers(uid, offers)
        else:
            for o in offers:
                o["favorited"] = False
        return {
            "success": True,
            "data": offers,
            "discount_info": {
                "free_discount": get_offer_config()["free_discount_percent"],
                "premium_discount": get_offer_config()["premium_discount_percent"],
            },
            "total_savings": sum(o.get("discount_percent", 0) for o in offers),
            "count": len(offers),
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_offers failed")
        raise HTTPException(status_code=503, detail="Offer service unavailable")


@router.post("/offers")
def create_offer(offer: OfferCreate, user: CurrentUser):
    user_role = (user.get("role") or "").lower()
    if user_role not in ("admin", "partner"):
        raise HTTPException(status_code=403, detail="Only admins or partners can create offers")
    sb = _sb()
    payload = {
        "business_name": offer.business_name,
        "business_type": offer.business_type,
        "description": offer.description,
        "base_gems": offer.base_gems,
        "address": offer.address,
        "lat": offer.lat,
        "lng": offer.lng,
        "offer_url": offer.offer_url,
        "is_admin_offer": offer.is_admin_offer,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=offer.expires_hours)).isoformat(),
        "created_by": user.get("id", "admin") if offer.is_admin_offer else user.get("id", "business"),
        "redemption_count": 0,
        "status": "active",
    }
    created = sb.table("offers").insert(payload).execute()
    if not created.data:
        raise HTTPException(status_code=503, detail="Failed to create offer")
    try:
        invalidate_offers_nearby_cache()
    except Exception:
        logger.warning("offers_nearby cache invalidation failed after create_offer", exc_info=True)
    return {"success": True, "data": created.data[0]}


# Static path segments MUST be registered before `/offers/{offer_id}` or Starlette matches
# e.g. `nearby` as an offer id (GET /offers/nearby → 404 "Offer not found").
@router.get("/offers/nearby")
def get_nearby_offers(
    request: Request,
    auth_user: OptionalUser = None,
    lat: float = 39.9612,
    lng: float = -82.9988,
    # `radius` is in kilometers (rough planar distance vs. user lat/lng, not driving miles).
    radius: Annotated[float, Query(ge=0.1, le=200)] = 10.0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
):
    try:
        cache_lat = round(lat, 2)
        cache_lng = round(lng, 2)
        key = f"offers_nearby:{cache_lat}:{cache_lng}:{radius}"
        auth_user = auth_user or {}
        guest_id = str(request.headers.get("x-snaproad-guest-id") or "").strip()
        user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
        affinity_user = user_id or guest_id or "anonymous"
        cached = cache_get(key)
        if cached:
            return _finalize_nearby_cached_response(cached, user_id)
        nearby = []
        source = _active_offers_source(limit=500)
        _hydrate_offer_coordinates_from_locations(source)
        for offer in source:
            if not _coord_ok(offer.get("lat"), offer.get("lng")):
                continue
            o_lat = float(offer["lat"])
            o_lng = float(offer["lng"])
            dlat = abs(o_lat - lat)
            dlng = abs(o_lng - lng)
            dist_km = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
            if dist_km <= radius:
                affinity_score, boosted = _user_offer_affinity(affinity_user, offer)
                row = {
                    **offer,
                    "gem_cost": offer.get("base_gems", 0),
                    "distance_km": round(dist_km, 2),
                    "offer_type": _offer_type(offer),
                    "boost_multiplier": offer.get("boost_multiplier", 1.0),
                    "boost_expiry": offer.get("boost_expiry"),
                    "allocated_locations": offer.get("allocated_locations", []),
                    "relevance_score": round(affinity_score - dist_km * 2.5, 2),
                    "is_boosted_active": boosted,
                }
                attach_offer_category_fields(row)
                nearby.append(row)
        nearby.sort(key=lambda x: (x.get("relevance_score", 0), -(x["distance_km"])), reverse=True)
        trimmed = nearby[:limit]
        try:
            from services.place_offer_enrichment import enrich_offers_with_place_photo_references

            enrich_offers_with_place_photo_references(trimmed)
        except Exception:
            logger.debug("offer place photo enrichment skipped", exc_info=True)
        result = {"success": True, "data": trimmed, "count": len(trimmed)}
        cache_set(key, result, ttl=300)
        return _finalize_nearby_cached_response(result, user_id)
    except Exception:
        logger.warning("offers_nearby failed; returning empty public feed", exc_info=True)
        return {"success": True, "data": [], "count": 0}


@router.get("/offers/online")
@limiter.limit("120/minute")
def get_online_offers_feed(
    request: Request,
    category_slug: Annotated[Optional[str], Query()] = None,
    cursor: Annotated[Optional[str], Query()] = None,
):
    """E-commerce / affiliate-style offers for the Offers tab Online pane."""
    _ = request
    from services.online_offers_provider import fetch_online_catalog

    catalog = fetch_online_catalog(category_slug=category_slug or None, cursor=cursor or None)
    return {"success": True, "data": catalog}


@router.get("/offers/on-route")
def get_offers_on_route(origin_lat: float = 39.9612, origin_lng: float = -82.9988, dest_lat: float = 40.0067, dest_lng: float = -83.0305):
    route_offers = []
    mid_lat = (origin_lat + dest_lat) / 2
    mid_lng = (origin_lng + dest_lng) / 2
    source = _active_offers_source(limit=500)
    _hydrate_offer_coordinates_from_locations(source)
    for offer in source:
        if not _coord_ok(offer.get("lat"), offer.get("lng")):
            continue
        o_lat = float(offer["lat"])
        o_lng = float(offer["lng"])
        dlat = abs(o_lat - mid_lat)
        dlng = abs(o_lng - mid_lng)
        dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        if dist <= 5:
            ro = {**offer, "distance_km": round(dist, 2)}
            attach_offer_category_fields(ro)
            route_offers.append(ro)
    return {"success": True, "data": route_offers}


@router.get("/offers/personalized")
def get_personalized_offers(
    auth_user: CurrentUser,
    lat: float = 39.9612,
    lng: float = -82.9988,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = _get_profile_like(user_id)
    history = get_driver_location_history(user_id)
    visited_types = {}
    for visit in history:
        if visit.get("business_type"):
            visited_types[visit["business_type"]] = visited_types.get(visit["business_type"], 0) + 1
    scored = []
    source = _active_offers_source(limit=500)
    _hydrate_offer_coordinates_from_locations(source)
    for offer in source:
        try:
            exp_raw = str(offer.get("expires_at") or "")
            exp = datetime.fromisoformat(exp_raw.replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc):
                continue
        except Exception:
            continue  # nosec B112
        if not _coord_ok(offer.get("lat"), offer.get("lng")):
            continue
        o_lat = float(offer["lat"])
        o_lng = float(offer["lng"])
        dlat = abs(o_lat - lat)
        dlng = abs(o_lng - lng)
        dist = ((dlat * 111) ** 2 + (dlng * 111) ** 2) ** 0.5
        score = 100 - (dist * 10)
        if offer.get("business_type") in visited_types:
            score += visited_types[offer["business_type"]] * 5
        is_prem = bool(user.get("is_premium")) or str(user.get("plan") or "").lower() in ("premium", "family")
        offer_cfg = get_offer_config()
        discount = offer_cfg["premium_discount_percent"] if is_prem else offer_cfg["free_discount_percent"]
        row = {**offer, "score": score, "distance_km": round(dist, 2), "discount_percent": discount}
        attach_offer_category_fields(row)
        scored.append(row)
    scored.sort(key=lambda x: x["score"], reverse=True)
    out = scored[:limit]
    _apply_favorited_to_offers(user_id, out)
    _apply_redeemed_to_offers(user_id, out)
    return {"success": True, "data": out, "voice_prompt": f"I found {min(limit, len(scored))} great offers for you nearby!"}


@router.post("/offers/{offer_id}/redeem")
@limiter.limit("30/minute")
def redeem_offer(request: Request, offer_id: str, auth_user: CurrentUser):
    from services.runtime_config import require_enabled

    require_enabled(
        "offer_redemptions_enabled",
        "Offer redemptions are temporarily disabled.",
    )
    require_enabled(
        "gems_rewards_enabled",
        "Gem rewards are temporarily paused.",
    )
    try:
        offer = _resolve_offer_by_id(offer_id)
    except HTTPException:
        raise
    if not offer:
        return {"success": False, "message": "Offer not found"}
    if offer.get("expires_at"):
        try:
            expiry = datetime.fromisoformat(str(offer["expires_at"]).replace("Z", "+00:00"))
            if expiry < datetime.now(timezone.utc):
                return {"success": False, "message": "Offer has expired"}
        except Exception as exc:
            logger.warning("failed to parse offer expiry: %s", exc)
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        return {"success": False, "message": "Authentication required"}
    try:
        return complete_offer_redemption(offer=offer, user_id=user_id)
    except Exception as exc:
        logger.exception("offer redemption failed: %s", exc)
        return {"success": False, "message": "Offer redemption unavailable"}


@router.get("/offers/my-redemptions")
@limiter.limit("60/minute")
def get_my_offer_redemptions(
    request: Request,
    auth_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    """Driver: offers redeemed with gems / verified at partner — includes `used_in_store` when staff scanned QR."""
    _ = request
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    sb = _sb()
    try:
        red_res = (
            sb.table("redemptions")
            .select("*")
            .eq("user_id", user_id)
            .order("redeemed_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as exc:
        logger.warning("my-redemptions list failed: %s", exc)
        raise HTTPException(status_code=503, detail="Could not load redemptions") from exc

    rows = list(red_res.data or [])
    if not rows:
        return {"success": True, "data": []}

    offer_ids: list[str] = []
    for r in rows:
        oid = r.get("offer_id")
        if oid is not None:
            offer_ids.append(str(oid))
    offer_ids = list(dict.fromkeys(offer_ids))

    offers_map: dict[str, dict] = {}
    if offer_ids:
        try:
            off_res = sb.table("offers").select("*").in_("id", offer_ids).execute()
            for o in off_res.data or []:
                if o.get("id") is not None:
                    offers_map[str(o["id"])] = dict(o)
        except Exception as exc:
            logger.warning("my-redemptions offers join failed: %s", exc)

    offer_list = list(offers_map.values())
    _hydrate_offer_coordinates_from_locations(offer_list)
    for o in offer_list:
        offers_map[str(o.get("id"))] = o

    out: list[dict] = []
    for r in rows:
        oid_raw = r.get("offer_id")
        oid = str(oid_raw) if oid_raw is not None else ""
        offer = offers_map.get(oid, {})
        gems_raw = r.get("gems_earned")
        try:
            ge = int(gems_raw) if gems_raw is not None else 0
        except (TypeError, ValueError):
            ge = 0
        gem_cost = abs(ge)
        scanned_by = r.get("scanned_by_user_id")
        used_in_store = scanned_by is not None and str(scanned_by).strip() != ""
        try:
            disc = r.get("discount_applied")
            discount_applied = int(disc) if disc is not None else int(offer.get("discount_percent") or 0)
        except (TypeError, ValueError):
            discount_applied = int(offer.get("discount_percent") or 0)

        redeemed_at = r.get("redeemed_at") or r.get("created_at")
        attach_offer_category_fields(offer)
        out.append(
            {
                "redemption_id": str(r.get("id")) if r.get("id") is not None else "",
                "offer_id": oid,
                "redeemed_at": redeemed_at,
                "status": str(r.get("status") or "verified"),
                "used_in_store": used_in_store,
                "gem_cost": gem_cost,
                "discount_applied": discount_applied,
                "business_name": offer.get("business_name") or offer.get("title") or "Partner offer",
                "title": offer.get("title"),
                "description": offer.get("description"),
                "image_url": offer.get("image_url"),
                "address": offer.get("address"),
                "discount_percent": int(offer.get("discount_percent") or discount_applied or 0),
                "lat": offer.get("lat"),
                "lng": offer.get("lng"),
                "is_free_item": bool(offer.get("is_free_item")),
                "business_type": offer.get("business_type"),
                "category_label": offer.get("category_label"),
            }
        )

    return {"success": True, "data": out}


@router.get("/offers/categories")
@limiter.limit("120/minute")
def list_offer_categories(request: Request):
    _ = request
    return {"success": True, "data": public_category_list()}


@router.get("/offers/{offer_id}")
def get_offer_by_id(offer_id: str, auth_user: OptionalUser = None):
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    data = dict(offer)
    attach_offer_category_fields(data)
    uid = str(auth_user.get("user_id") or auth_user.get("id") or "") if auth_user else ""
    if uid:
        data["favorited"] = str(data.get("id")) in _favorited_offer_ids(uid)
        try:
            rres = (
                _sb()
                .table("redemptions")
                .select("id, status, redeemed_at, gems_earned")
                .eq("user_id", uid)
                .eq("offer_id", offer_id)
                .limit(1)
                .execute()
            )
            rrows = rres.data or []
            if rrows:
                rr = rrows[0]
                data["redeemed"] = True
                data["redemption_id"] = str(rr.get("id") or "")
                data["redemption"] = {
                    "status": rr.get("status"),
                    "redeemed_at": rr.get("redeemed_at"),
                    "gems_spent": abs(int(rr.get("gems_earned") or 0)),
                }
            else:
                data["redeemed"] = False
                data["redemption_id"] = None
                data["redemption"] = None
        except Exception as e:
            logger.warning("get_offer redemption lookup failed: %s", e)
            data["redeemed"] = False
            data["redemption_id"] = None
            data["redemption"] = None
    else:
        data["favorited"] = False
        data["redeemed"] = False
        data["redemption_id"] = None
        data["redemption"] = None
    return {"success": True, "data": data}


@router.post("/offers/{offer_id}/generate-qr")
def generate_offer_qr(offer_id: str, body: dict, auth_user: CurrentUser):
    from services.runtime_config import require_enabled

    require_enabled(
        "partner_qr_redemption_enabled",
        "QR redemption is temporarily disabled.",
    )
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    lat = float(body.get("lat"))
    lng = float(body.get("lng"))
    offer_lat = float(offer.get("lat") or 0)
    offer_lng = float(offer.get("lng") or 0)
    distance = _distance_meters(lat, lng, offer_lat, offer_lng)
    if distance > 200:
        raise HTTPException(status_code=403, detail="You must be within 200 meters of the offer to generate a QR code")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    nonce = str(uuid.uuid4())
    payload = {
        "offer_id": str(offer.get("id")),
        "user_id": user_id,
        "location_id": body.get("location_id"),
        "exp": int(expires_at.timestamp()),
        "expires_at": expires_at.isoformat(),
        "nonce": nonce,
    }
    token = _sign_qr_token(payload)
    cache_set(
        _qr_nonce_key(nonce),
        {
            "offer_id": str(offer.get("id")),
            "user_id": user_id,
            "expires_at": expires_at.isoformat(),
        },
        ttl=15 * 60,
    )
    return {
        "success": True,
        "data": {
            "qr_token": token,
            "expires_at": expires_at.isoformat(),
            "offer": {
                "id": offer.get("id"),
                "business_name": offer.get("business_name"),
                "description": offer.get("description"),
                "discount_percent": offer.get("discount_percent"),
            },
        },
    }


@router.post("/offers/validate-qr")
def validate_offer_qr(body: dict):
    validated = validate_qr_token(body.get("qr_token") or body.get("qr_data"), consume_nonce=False)
    payload = validated["payload"]
    offer = validated["offer"]
    user_profile = _get_profile_like(str(payload.get("user_id") or ""))
    name = str(user_profile.get("name") or user_profile.get("full_name") or user_profile.get("email") or "Driver").strip()
    parts = [p for p in name.split(" ") if p]
    user_display_name = parts[0] if parts else "Driver"
    return {
        "success": True,
        "data": {
            "valid": True,
            "offer_details": {
                "id": offer.get("id"),
                "title": offer.get("title") or offer.get("business_name"),
                "business_name": offer.get("business_name"),
                "discount_percent": offer.get("discount_percent"),
                "base_gems": offer.get("base_gems"),
            },
            "user_display_name": user_display_name,
            "nonce": validated["nonce"],
            "payload": payload,
        },
    }


@router.post("/offers/{offer_id}/view")
def track_offer_view(request: Request, offer_id: str, body: dict, auth_user: OptionalUser = None):
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    auth_user = auth_user or {}
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        user_id = str(request.headers.get("x-snaproad-guest-id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    event = record_offer_event(
        offer=offer,
        event_type="view",
        partner_id=offer.get("partner_id"),
        user_id=user_id,
        lat=body.get("lat"),
        lng=body.get("lng"),
        trip_id=body.get("trip_id"),
    )
    return {"success": True, "data": event}


@router.post("/offers/{offer_id}/visit")
def track_offer_visit(offer_id: str, body: dict, auth_user: CurrentUser):
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    lat = float(body.get("lat"))
    lng = float(body.get("lng"))
    offer_lat = float(offer.get("lat") or 0)
    offer_lng = float(offer.get("lng") or 0)
    if _distance_meters(lat, lng, offer_lat, offer_lng) > 500:
        raise HTTPException(status_code=403, detail="Visit tracking only applies within 500 meters")
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    event = record_offer_event(
        offer=offer,
        event_type="visit",
        partner_id=offer.get("partner_id"),
        user_id=user_id,
        lat=lat,
        lng=lng,
        trip_id=body.get("trip_id"),
    )
    return {"success": True, "data": event}


@router.post("/offers/{offer_id}/accept-voice")
def accept_offer_via_voice(offer_id: str, add_as_stop: bool = True):
    source = _active_offers_source(limit=500)
    offer = next((o for o in source if str(o.get("id")) == str(offer_id)), None)
    if not offer:
        return {"success": False, "message": "Offer not found"}
    return {
        "success": True,
        "message": f"Great! I'll add {offer['business_name']} as a stop on your route.",
        "data": {"offer": offer, "navigation_action": "add_waypoint" if add_as_stop else "show_details", "waypoint": {"lat": offer["lat"], "lng": offer["lng"], "name": offer["business_name"]}},
    }


@router.post("/offers/{offer_id}/favorite")
@limiter.limit("120/minute")
def favorite_offer(request: Request, offer_id: str, auth_user: CurrentUser):
    _ = request
    offer = _resolve_offer_by_id(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    oid = offer.get("id")
    sb = _sb()
    try:
        existing = (
            sb.table("offer_favorites")
            .select("user_id")
            .eq("user_id", user_id)
            .eq("offer_id", oid)
            .limit(1)
            .execute()
        )
        has_row = bool(existing.data)
        if has_row:
            sb.table("offer_favorites").delete().eq("user_id", user_id).eq("offer_id", oid).execute()
            favorited = False
        else:
            sb.table("offer_favorites").insert({"user_id": user_id, "offer_id": oid}).execute()
            favorited = True
    except Exception as e:
        if _table_missing(e):
            raise HTTPException(
                status_code=503,
                detail="Offer favorites require DB migration (run sql/036_offer_favorites.sql).",
            ) from e
        logger.exception("offer favorite toggle failed")
        raise HTTPException(status_code=503, detail="Could not update offer favorite") from e
    return {"success": True, "data": {"offer_id": str(oid), "favorited": favorited}}


@router.post("/driver/location-visit")
def record_location_visit(visit: LocationVisit, auth_user: CurrentUser):
    user_id = str(auth_user.get("user_id") or auth_user.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    append_driver_location_visit(
        user_id,
        {
            "lat": visit.lat,
            "lng": visit.lng,
            "business_name": visit.business_name,
            "business_type": visit.business_type,
            "timestamp": visit.timestamp or datetime.now(timezone.utc).isoformat(),
        },
        max_items=100,
    )

    source = _active_offers_source(limit=500)
    tracked = 0
    for offer in source:
        offer_lat = float(offer.get("lat") or 0)
        offer_lng = float(offer.get("lng") or 0)
        if _distance_meters(visit.lat, visit.lng, offer_lat, offer_lng) <= 500:
            record_offer_event(
                offer=offer,
                event_type="visit",
                partner_id=offer.get("partner_id"),
                user_id=user_id,
                lat=visit.lat,
                lng=visit.lng,
            )
            tracked += 1
    return {"success": True, "tracked_visits": tracked}


@router.post("/images/generate")
@limiter.limit("10/minute")
async def generate_offer_image(
    request: Request,
    body: ImageGenerateRequest,
    _user: CurrentUser,
):
    from services.image_generation import generate_promo_image_url

    _ = request
    result = await asyncio.to_thread(generate_promo_image_url, body.prompt, body.offer_type)
    if not result.get("success"):
        return {"success": False, "message": result.get("message", "Image generation failed.")}
    return {"success": True, "image_url": result["image_url"]}
