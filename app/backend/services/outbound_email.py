"""Optional transactional email via Resend (https://resend.com)."""
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = (os.environ.get("RESEND_API_KEY") or "").strip()
RESEND_FROM = (os.environ.get("RESEND_FROM_EMAIL") or os.environ.get("EMAIL_FROM") or "").strip()


def send_html_email(to_email: str, subject: str, html: str) -> tuple[bool, Optional[str]]:
    """
    Send one HTML email. Returns (ok, error_message).
    If RESEND_API_KEY or RESEND_FROM_EMAIL is unset, skips send and returns (False, reason).
    """
    if not RESEND_API_KEY or not RESEND_FROM:
        return False, "Email not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL on the API)"
    to_email = (to_email or "").strip()
    if not to_email:
        return False, "Missing recipient email"
    try:
        with httpx.Client(timeout=12.0) as client:
            r = client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"from": RESEND_FROM, "to": [to_email], "subject": subject, "html": html},
            )
        if r.status_code >= 400:
            logger.warning("Resend error %s: %s", r.status_code, r.text[:500])
            return False, f"Email provider returned {r.status_code}"
        return True, None
    except Exception as e:
        logger.warning("Resend send failed: %s", e)
        return False, str(e)


def promotion_email_html(
    recipient_name: str,
    *,
    is_partner: bool,
    plan_label: str,
    until_display: str,
    reference: str,
) -> str:
    who = "your business dashboard" if is_partner else "SnapRoad"
    return f"""
    <div style="font-family:system-ui,Segoe UI,sans-serif;max-width:560px;line-height:1.5;color:#111">
      <p>Hi {recipient_name or "there"},</p>
      <p>We&apos;ve activated a complimentary <strong>{plan_label}</strong> access on {who}
      through <strong>{until_display}</strong>.</p>
      <p>Just open the app and sign in with this email — no promo code needed.</p>
      <p style="font-size:13px;color:#555">Reference: <code>{reference}</code> (for support)</p>
      <p style="font-size:13px;color:#555">— SnapRoad Team</p>
    </div>
    """
