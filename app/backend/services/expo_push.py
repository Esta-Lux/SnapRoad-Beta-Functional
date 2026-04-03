"""Send notifications via Expo Push API."""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_expo_push(
    expo_token: str,
    title: str,
    body: str,
    data: Optional[dict[str, Any]] = None,
) -> bool:
    if not expo_token or not expo_token.startswith("ExponentPushToken"):
        logger.debug("skip push: invalid or missing token")
        return False
    payload = {
        "to": expo_token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "data": data or {},
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(EXPO_PUSH_URL, json=payload)
            if r.status_code >= 400:
                logger.warning("Expo push HTTP %s: %s", r.status_code, r.text[:500])
                return False
            body_json = r.json()
            errs = body_json.get("data", [])
            if isinstance(errs, list) and errs and errs[0].get("status") == "error":
                logger.warning("Expo push error: %s", errs[0])
                return False
        return True
    except Exception as e:
        logger.warning("Expo push failed: %s", e)
        return False


def send_expo_push_batch(messages: list[dict[str, Any]]) -> None:
    if not messages:
        return
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(EXPO_PUSH_URL, json=messages)
            if r.status_code >=400:
                logger.warning("Expo batch push HTTP %s: %s", r.status_code, r.text[:500])
    except Exception as e:
        logger.warning("Expo batch push failed: %s", e)
