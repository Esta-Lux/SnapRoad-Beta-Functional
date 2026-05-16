"""
Verify iOS In-App Purchase transactions via Apple's App Store Server API + JWS signature check.

Requires In-App Purchase key from App Store Connect (Users and Access → Integrations → In-App Purchase).
See: https://developer.apple.com/documentation/appstoreserverapi
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any, Iterator

try:
    from appstoreserverlibrary.api_client import APIException, AppStoreServerAPIClient
    from appstoreserverlibrary.models.Environment import Environment
    from appstoreserverlibrary.models.JWSRenewalInfoDecodedPayload import JWSRenewalInfoDecodedPayload
    from appstoreserverlibrary.models.JWSTransactionDecodedPayload import JWSTransactionDecodedPayload
    from appstoreserverlibrary.models.ResponseBodyV2DecodedPayload import ResponseBodyV2DecodedPayload
    from appstoreserverlibrary.signed_data_verifier import SignedDataVerifier, VerificationException
except ModuleNotFoundError:
    class APIException(Exception):  # type: ignore[no-redef]
        http_status_code = None
        raw_api_error = None

    AppStoreServerAPIClient = None  # type: ignore[assignment]
    SignedDataVerifier = None  # type: ignore[assignment]

    class _MissingEnvironment:
        PRODUCTION = "PRODUCTION"
        SANDBOX = "SANDBOX"

    Environment = _MissingEnvironment  # type: ignore[assignment]
    JWSTransactionDecodedPayload = Any  # type: ignore[assignment]
    JWSRenewalInfoDecodedPayload = Any  # type: ignore[assignment]
    ResponseBodyV2DecodedPayload = Any  # type: ignore[assignment]
    VerificationException = Exception  # type: ignore[assignment]

from config import (
    APPLE_APP_APPLE_ID,
    APPLE_IAP_BUNDLE_ID,
    APPLE_IAP_ISSUER_ID,
    APPLE_IAP_KEY_ID,
    APPLE_IAP_PREMIUM_PRODUCT_ID,
    APPLE_IAP_FAMILY_PRODUCT_ID,
    APPLE_IAP_PRIVATE_KEY_PEM,
)

_log = logging.getLogger(__name__)

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_ROOT_PEM = _BACKEND_ROOT / "certs" / "apple_root_ca_g3.pem"


class AppleIapConfigError(RuntimeError):
    """Raised when server-side Apple IAP env is incomplete."""


def _load_root_certificates() -> list[bytes]:
    pem = _DEFAULT_ROOT_PEM
    if not pem.is_file():
        raise AppleIapConfigError(
            f"Missing Apple root CA PEM at {pem} (needed for JWS verification).",
        )
    return [pem.read_bytes()]


def _signing_key_bytes() -> bytes:
    raw = (APPLE_IAP_PRIVATE_KEY_PEM or "").strip()
    if not raw:
        raise AppleIapConfigError("APPLE_IAP_PRIVATE_KEY_PEM is not set.")
    pem = raw.replace("\\n", "\n").encode("utf-8")
    if b"BEGIN PRIVATE KEY" not in pem:
        raise AppleIapConfigError("APPLE_IAP_PRIVATE_KEY_PEM must be a PEM EC private key (.p8 contents).")
    return pem


def _verifier(environment: Environment) -> SignedDataVerifier:
    if SignedDataVerifier is None:
        raise AppleIapConfigError("appstoreserverlibrary is not installed.")
    roots = _load_root_certificates()
    app_id = APPLE_APP_APPLE_ID if environment == Environment.PRODUCTION else None
    if environment == Environment.PRODUCTION and app_id is None:
        raise AppleIapConfigError("APPLE_APP_APPLE_ID (numeric App Store Connect app id) is required for production.")
    return SignedDataVerifier(roots, True, environment, APPLE_IAP_BUNDLE_ID, app_id)


def _client(environment: Environment) -> AppStoreServerAPIClient:
    if AppStoreServerAPIClient is None:
        raise AppleIapConfigError("appstoreserverlibrary is not installed.")
    return AppStoreServerAPIClient(
        _signing_key_bytes(),
        APPLE_IAP_KEY_ID,
        APPLE_IAP_ISSUER_ID,
        APPLE_IAP_BUNDLE_ID,
        environment,
    )


def is_apple_iap_configured() -> bool:
    try:
        if not (
            AppStoreServerAPIClient
            and SignedDataVerifier
            and
            APPLE_IAP_PRIVATE_KEY_PEM
            and APPLE_IAP_KEY_ID
            and APPLE_IAP_ISSUER_ID
            and APPLE_IAP_BUNDLE_ID
            and (APPLE_IAP_PREMIUM_PRODUCT_ID or "").strip()
        ):
            return False
        _load_root_certificates()
        return True
    except Exception:
        return False


def apple_iap_env_diagnostics() -> dict[str, Any]:
    """
    Safe-for-clients diagnostics (names only — no secrets) for fixing 503 “not configured” on /api/payments/apple/sync.
    """
    missing: list[str] = []
    warnings: list[str] = []
    library_ok = bool(AppStoreServerAPIClient and SignedDataVerifier)

    try:
        _load_root_certificates()
    except Exception:
        missing.append("APPLE_IAP_ROOT_CA_FILE")

    if not library_ok:
        missing.append("APP_STORE_SERVER_LIBRARY")

    if not (APPLE_IAP_PRIVATE_KEY_PEM or "").strip():
        missing.append("APPLE_IAP_PRIVATE_KEY_PEM")
    if not (APPLE_IAP_KEY_ID or "").strip():
        missing.append("APPLE_IAP_KEY_ID")
    if not (APPLE_IAP_ISSUER_ID or "").strip():
        missing.append("APPLE_IAP_ISSUER_ID")
    if not (APPLE_IAP_BUNDLE_ID or "").strip():
        missing.append("APPLE_IAP_BUNDLE_ID")

    prem = (APPLE_IAP_PREMIUM_PRODUCT_ID or "").strip()
    fam = (APPLE_IAP_FAMILY_PRODUCT_ID or "").strip()
    if not prem:
        missing.append("APPLE_IAP_PREMIUM_PRODUCT_ID")

    if APPLE_APP_APPLE_ID is None:
        warnings.append("APPLE_APP_APPLE_ID")

    hints: list[str] = []
    if not library_ok:
        hints.append("Deploy must install Python deps from app/backend/requirements.txt including app-store-server-library.")
    if "APPLE_IAP_PRIVATE_KEY_PEM" in missing:
        hints.append(
            "Create an In-App Purchase key (App Store Connect → Users and Access → Integrations → In-App Purchase). "
            "Set APPLE_IAP_PRIVATE_KEY_PEM (.p8 PEM), APPLE_IAP_KEY_ID, and APPLE_IAP_ISSUER_ID on the API host.",
        )
    if warnings:
        hints.append(
            "Set APPLE_APP_APPLE_ID to the numeric App Id from App Store Connect → App → App Information "
            "(needed to verify production-signed JWS payloads).",
        )
    if prem and fam and prem == fam:
        hints.append("APPLE_IAP_PREMIUM_PRODUCT_ID and APPLE_IAP_FAMILY_PRODUCT_ID must differ when both are set.")

    configured = is_apple_iap_configured()

    if not configured:
        hints.append(
            "This backend uses POST /api/payments/apple/sync (StoreKit transaction id → App Store Server API). "
            "Filling the env vars above fixes the common “not configured on the server” error. "
            "App Store Server Notifications (webhook URL in ASC) complement /apple/sync.",
        )

    api_public = (
        os.environ.get("SNAPROAD_PUBLIC_API_BASE", "").strip().rstrip("/")
        or "https://api.snaproad.app"
    )
    webhook_url = f"{api_public}/api/payments/apple/notifications"

    hints.append(
        "App Store Connect → App → General → App Information → "
        "App Store Server Notifications (Version 2) → POST URL: "
        f"{webhook_url} "
        "(optional; entitlement changes still work via authenticated /apple/sync).",
    )

    return {
        "configured": configured,
        "missing_environment_variables": missing,
        "warnings": warnings,
        "hints": hints,
        "has_premium_product_id": bool(prem),
        "has_family_product_id": bool(fam),
        "server_notification_post_url": webhook_url,
        "documentation": "https://developer.apple.com/documentation/appstoreserverapi",
        "notifications_documentation": "https://developer.apple.com/documentation/appstoreservernotifications",
    }


def _plan_for_product(product_id: str | None) -> str | None:
    if not product_id:
        return None
    prem = (APPLE_IAP_PREMIUM_PRODUCT_ID or "").strip()
    fam = (APPLE_IAP_FAMILY_PRODUCT_ID or "").strip()
    if prem and product_id == prem:
        return "premium"
    if fam and product_id == fam:
        return "family"
    return None


def _subscription_active(decoded: JWSTransactionDecodedPayload) -> bool:
    if getattr(decoded, "revocationDate", None) is not None:
        return False
    raw_rr = getattr(decoded, "rawRevocationReason", None)
    if raw_rr is not None:
        return False
    exp = getattr(decoded, "expiresDate", None)
    if exp is None:
        return True
    try:
        return int(exp) > int(time.time() * 1000)
    except (TypeError, ValueError):
        return False


_AS_FORCE_STRIP_NOTIFICATION_TYPES = frozenset({
    "REFUND",
    "REVOKE",
    "EXPIRED",
    "GRACE_PERIOD_EXPIRED",
})

# Apple Server Notification type/subtype tokens (not credentials — module-level
# names avoid Bandit B105 false positives on string literals in comparisons).
_ASN_NT_TEST = "TEST"
_ASN_NT_DID_FAIL_TO_RENEW = "DID_FAIL_TO_RENEW"
_ASN_NT_DID_CHANGE_RENEWAL_STATUS = "DID_CHANGE_RENEWAL_STATUS"
_ASN_SUB_VOLUNTARY = "VOLUNTARY"


def _asn_notification_type_token(outer: ResponseBodyV2DecodedPayload) -> str:
    nt = getattr(outer, "notificationType", None)
    val = getattr(nt, "value", None) if nt is not None else None
    if val is not None:
        return str(val)
    return (getattr(outer, "rawNotificationType", None) or "").strip().upper()


def _asn_subtype_token(outer: ResponseBodyV2DecodedPayload) -> str:
    st = getattr(outer, "subtype", None)
    if st is not None:
        sv = getattr(st, "value", None)
        if sv is not None:
            return str(sv)
    return (getattr(outer, "rawSubtype", None) or "").strip().upper()


def _asn_renewal_suggests_billing_retry_or_grace(r: JWSRenewalInfoDecodedPayload) -> bool:
    """True when Apple indicates the subscriber may retain access during grace or renewal retry."""
    now_ms = int(time.time() * 1000)
    gp = getattr(r, "gracePeriodExpiresDate", None)
    if gp is not None:
        try:
            if int(gp) > now_ms:
                return True
        except (TypeError, ValueError):
            pass
    return getattr(r, "isInBillingRetryPeriod", None) is True


def _asn_iter_installed_verifiers() -> Iterator[tuple[Any, Any]]:
    for env in (Environment.PRODUCTION, Environment.SANDBOX):
        try:
            yield env, _verifier(env)
        except AppleIapConfigError as e:
            if env == Environment.PRODUCTION:
                _log.warning("Apple IAP production JWS verifier unavailable: %s", e)
                continue
            raise


def _asn_decode_notification_root_jws(signed_payload: str) -> ResponseBodyV2DecodedPayload:
    if SignedDataVerifier is None:
        raise AppleIapConfigError("appstoreserverlibrary is not installed.")
    last_exc: VerificationException | None = None
    decoded: ResponseBodyV2DecodedPayload | None = None
    if not (signed_payload or "").strip():
        raise ValueError("signedPayload is empty.")

    for _env, verifier in _asn_iter_installed_verifiers():
        try:
            decoded = verifier.verify_and_decode_notification(signed_payload)
            break
        except VerificationException as e:
            last_exc = e
            continue
    if decoded is None:
        raise ValueError("Invalid or unverifiable App Store notification JWS.") from last_exc
    return decoded


def _asn_preferred_environment_from_data(raw_data: Any | None) -> Environment | None:
    if raw_data is None:
        return None
    pref = getattr(raw_data, "environment", None)
    if pref is Environment.PRODUCTION or pref is Environment.SANDBOX:
        return pref  # type: ignore[comparison-overlap]
    return None


def _asn_decode_signed_transaction_nested(
    signed_jws: str,
    *,
    preferred: Environment | None,
) -> JWSTransactionDecodedPayload:
    ordered: list[Environment] = []
    if preferred is not None:
        ordered.append(preferred)
    for e in (Environment.PRODUCTION, Environment.SANDBOX):
        if e not in ordered:
            ordered.append(e)

    last_exc: VerificationException | None = None
    for env in ordered:
        try:
            verifier = _verifier(env)
        except AppleIapConfigError:
            continue
        try:
            return verifier.verify_and_decode_signed_transaction(signed_jws)
        except VerificationException as e:
            last_exc = e
            continue
    raise ValueError("Could not verify signedTransactionInfo JWS.") from last_exc


def _asn_decode_renewal_nested(
    signed_jws: str,
    *,
    preferred: Environment | None,
) -> JWSRenewalInfoDecodedPayload:
    ordered: list[Environment] = []
    if preferred is not None:
        ordered.append(preferred)
    for e in (Environment.PRODUCTION, Environment.SANDBOX):
        if e not in ordered:
            ordered.append(e)

    last_exc: VerificationException | None = None
    for env in ordered:
        try:
            verifier = _verifier(env)
        except AppleIapConfigError:
            continue
        try:
            return verifier.verify_and_decode_renewal_info(signed_jws)
        except VerificationException as e:
            last_exc = e
            continue
    raise ValueError("Could not verify signedRenewalInfo JWS.") from last_exc


def _asn_transaction_summary_dict(decoded: JWSTransactionDecodedPayload) -> dict[str, Any]:
    plan = _plan_for_product(decoded.productId)
    return {
        "plan": plan,
        "product_id": decoded.productId,
        "original_transaction_id": decoded.originalTransactionId,
        "transaction_id": decoded.transactionId,
        "environment": str(decoded.environment) if decoded.environment is not None else None,
    }


def apply_profile_strip_apple_subscription_fields() -> dict[str, Any]:
    """Revert consumer driver plan when Apple's subscription entitlement ends (see apply_profile_patch_for_apple)."""
    return {
        "plan": "basic",
        "is_premium": False,
        "plan_entitlement_source": None,
        "gem_multiplier": 1,
        "apple_last_transaction_id": None,
    }


def _asn_collect_target_profile_ids(
    decoded_tx: JWSTransactionDecodedPayload | None,
    decoded_renewal: JWSRenewalInfoDecodedPayload | None,
) -> list[str]:
    """Resolve Supabase profiles from app account token(s) plus stored apple_original_transaction_id."""
    from services.supabase_service import sb_find_profile_ids_by_apple_original_transaction

    out: list[str] = []
    seen: set[str] = set()
    for tok in (
        getattr(decoded_tx, "appAccountToken", None),
        getattr(decoded_renewal, "appAccountToken", None),
    ):
        s = "" if tok is None else str(tok).strip()
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    oid = ""
    if decoded_tx is not None:
        oid = (decoded_tx.originalTransactionId or "").strip()
    if not oid and decoded_renewal is not None:
        oid = (decoded_renewal.originalTransactionId or "").strip()
    if oid:
        for uid in sb_find_profile_ids_by_apple_original_transaction(oid):
            if uid not in seen:
                seen.add(uid)
                out.append(uid)
    return out


def _asn_profile_row_looks_apple_linked(row: dict[str, Any]) -> bool:
    if str(row.get("plan_entitlement_source") or "").strip().lower() == "apple":
        return True
    return bool((row.get("apple_original_transaction_id") or "").strip())


def apply_apple_server_notification_v2(signed_payload: str) -> dict[str, Any]:
    """Decode App Store Server Notifications V2 and sync profile entitlements."""
    from services.runtime_config import cfg_enabled, get_runtime_config
    from services.supabase_service import sb_get_profile_raw, sb_update_profile

    outer = _asn_decode_notification_root_jws(signed_payload)
    nt_token = _asn_notification_type_token(outer)
    sub_token = _asn_subtype_token(outer)
    if nt_token == _ASN_NT_TEST:
        return {
            "resolution": "test",
            "notification_type": nt_token,
            "notification_uuid": outer.notificationUUID,
            "profiles_updated": 0,
            "profiles_skipped": 0,
            "db_write_failed": False,
            "referral_user_ids": [],
        }

    blob = getattr(outer, "data", None)
    if blob is None:
        return {
            "resolution": "no_data_block",
            "notification_type": nt_token,
            "notification_uuid": outer.notificationUUID,
            "profiles_updated": 0,
            "profiles_skipped": 0,
            "db_write_failed": False,
            "referral_user_ids": [],
        }

    preferred = _asn_preferred_environment_from_data(blob)

    decoded_tx: JWSTransactionDecodedPayload | None = None
    sti = getattr(blob, "signedTransactionInfo", None)
    if sti:
        decoded_tx = _asn_decode_signed_transaction_nested(sti, preferred=preferred)

    decoded_renewal: JWSRenewalInfoDecodedPayload | None = None
    sri = getattr(blob, "signedRenewalInfo", None)
    if sri:
        decoded_renewal = _asn_decode_renewal_nested(sri, preferred=preferred)

    force_strip = nt_token in _AS_FORCE_STRIP_NOTIFICATION_TYPES

    if not decoded_tx and not decoded_renewal:
        return {
            "resolution": "no_signed_payloads",
            "notification_type": nt_token,
            "notification_uuid": outer.notificationUUID,
            "profiles_updated": 0,
            "profiles_skipped": 0,
            "db_write_failed": False,
            "referral_user_ids": [],
        }

    if not decoded_tx and decoded_renewal and not force_strip:
        if nt_token == _ASN_NT_DID_FAIL_TO_RENEW and _asn_renewal_suggests_billing_retry_or_grace(decoded_renewal):
            return {
                "resolution": "renewal_only_billing_grace_or_retry",
                "notification_type": nt_token,
                "notification_subtype": sub_token or None,
                "notification_uuid": outer.notificationUUID,
                "profiles_updated": 0,
                "profiles_skipped": 0,
                "db_write_failed": False,
                "referral_user_ids": [],
            }
        if nt_token == _ASN_NT_DID_CHANGE_RENEWAL_STATUS and sub_token == _ASN_SUB_VOLUNTARY:
            return {
                "resolution": "renewal_only_voluntary_cancel_scheduled",
                "notification_type": nt_token,
                "notification_subtype": sub_token,
                "notification_uuid": outer.notificationUUID,
                "profiles_updated": 0,
                "profiles_skipped": 0,
                "db_write_failed": False,
                "referral_user_ids": [],
            }
        return {
            "resolution": "renewal_only_unhandled",
            "notification_type": nt_token,
            "notification_subtype": sub_token or None,
            "notification_uuid": outer.notificationUUID,
            "profiles_updated": 0,
            "profiles_skipped": 0,
            "db_write_failed": False,
            "referral_user_ids": [],
        }

    txn_active = _subscription_active(decoded_tx) if decoded_tx is not None else False
    plan: str | None = None
    summary: dict[str, Any] = {}
    if decoded_tx is not None:
        plan = _plan_for_product(decoded_tx.productId)
        summary = _asn_transaction_summary_dict(decoded_tx)

    should_entitle = bool(
        decoded_tx is not None and (not force_strip) and txn_active and plan is not None,
    )
    should_strip = bool(
        force_strip
        or (decoded_tx is not None and not txn_active)
        or (decoded_tx is None and decoded_renewal is not None and force_strip),
    )

    if should_entitle and not summary.get("plan"):
        _log.warning(
            "Apple ASN %s: active transaction but unknown product_id=%r (env=%s)",
            outer.notificationUUID,
            getattr(decoded_tx, "productId", None),
            getattr(decoded_tx, "environment", None),
        )
        should_entitle = False

    target_ids = _asn_collect_target_profile_ids(decoded_tx, decoded_renewal)
    if not target_ids:
        _log.info(
            "Apple ASN %s type=%s: no profile targets (txn=%s renewal=%s)",
            outer.notificationUUID,
            nt_token,
            decoded_tx is not None,
            decoded_renewal is not None,
        )

    payments_gate = cfg_enabled(get_runtime_config(), "premium_purchases_enabled", default=True)
    updated_n = 0
    skipped_n = 0
    db_failed = False
    referral_user_ids: list[str] = []
    referral_seen: set[str] = set()

    strip_patch = apply_profile_strip_apple_subscription_fields()

    for uid in target_ids:
        row = sb_get_profile_raw(uid)
        if not row:
            continue
        src = str(row.get("plan_entitlement_source") or "").strip().lower()

        if should_strip and _asn_profile_row_looks_apple_linked(row):
            if src == "stripe":
                skipped_n += 1
                continue
            ok = sb_update_profile(uid, strip_patch)
            if ok:
                updated_n += 1
            else:
                db_failed = True
            continue

        if should_entitle:
            if src == "stripe":
                skipped_n += 1
                continue
            if not payments_gate:
                skipped_n += 1
                continue
            patch = apply_profile_patch_for_apple(uid, summary)
            ok = sb_update_profile(uid, patch)
            if ok:
                updated_n += 1
                if uid not in referral_seen:
                    referral_seen.add(uid)
                    referral_user_ids.append(uid)
            else:
                db_failed = True

    return {
        "resolution": "processed",
        "notification_type": nt_token,
        "notification_subtype": sub_token or None,
        "notification_uuid": outer.notificationUUID,
        "profiles_updated": updated_n,
        "profiles_skipped": skipped_n,
        "db_write_failed": db_failed,
        "referral_user_ids": referral_user_ids,
        "txn_active_hint": txn_active if decoded_tx is not None else None,
        "force_strip": force_strip,
    }


def verify_transaction(
    transaction_id: str,
    *,
    expected_user_id: str | None = None,
) -> dict[str, Any]:
    """
    Fetch + verify a transaction from Apple. Returns a dict safe to log (no secrets).

    Raises:
        AppleIapConfigError: missing env
        APIException: Apple API error
        VerificationException: JWS verification failed
        ValueError: unknown product, inactive subscription, user mismatch
    """
    tid = (transaction_id or "").strip()
    if not tid:
        raise ValueError("transaction_id is required")

    last_api_exc: APIException | None = None
    decoded: JWSTransactionDecodedPayload | None = None

    for env in (Environment.PRODUCTION, Environment.SANDBOX):
        try:
            client = _client(env)
            info = client.get_transaction_info(tid)
            signed = info.signedTransactionInfo
            if not signed:
                continue
            verifier = _verifier(env)
            decoded = verifier.verify_and_decode_signed_transaction(signed)
            break
        except APIException as e:
            last_api_exc = e
            _log.info(
                "Apple get_transaction_info failed env=%s http=%s code=%s",
                env,
                e.http_status_code,
                e.raw_api_error,
            )
            continue
        except VerificationException as e:
            _log.warning("Apple JWS verification failed env=%s: %s", env, e)
            continue

    if decoded is None:
        if last_api_exc is not None:
            raise last_api_exc
        raise ValueError("Unable to verify transaction with Apple.")

    if expected_user_id and decoded.appAccountToken:
        if str(decoded.appAccountToken).strip().lower() != str(expected_user_id).strip().lower():
            raise ValueError("This Apple transaction is linked to a different SnapRoad account.")

    if not _subscription_active(decoded):
        raise ValueError("Subscription is not active (expired or revoked).")

    plan = _plan_for_product(decoded.productId)
    if plan is None:
        raise ValueError(f"Unknown App Store product id: {decoded.productId!r}")

    return {
        "plan": plan,
        "product_id": decoded.productId,
        "original_transaction_id": decoded.originalTransactionId,
        "transaction_id": decoded.transactionId,
        "environment": str(decoded.environment) if decoded.environment is not None else None,
    }


def apply_profile_patch_for_apple(user_id: str, summary: dict[str, Any]) -> dict[str, Any]:
    """Fields for sb_update_profile after a verified IAP sync."""
    plan = summary["plan"]
    return {
        "plan": plan,
        "is_premium": True,
        "plan_entitlement_source": "apple",
        "apple_original_transaction_id": summary.get("original_transaction_id"),
        "apple_last_transaction_id": summary.get("transaction_id"),
        "gem_multiplier": 2,
    }
