"""
Verify iOS In-App Purchase transactions via Apple's App Store Server API + JWS signature check.

Requires In-App Purchase key from App Store Connect (Users and Access → Integrations → In-App Purchase).
See: https://developer.apple.com/documentation/appstoreserverapi
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

try:
    from appstoreserverlibrary.api_client import APIException, AppStoreServerAPIClient
    from appstoreserverlibrary.models.Environment import Environment
    from appstoreserverlibrary.models.JWSTransactionDecodedPayload import JWSTransactionDecodedPayload
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
        ):
            return False
        _load_root_certificates()
        return True
    except Exception:
        return False


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
