"""
Shared blur + normalization for photo reports (upload + admin approve).
"""
import base64
import logging
import os
from typing import Any, Optional

from services.photo_analysis import PhotoAnalysisService

logger = logging.getLogger(__name__)

PUBLIC_PHOTO_BUCKET = (os.environ.get("INCIDENT_PHOTOS_BUCKET") or "incident_photos").strip()
PRIVATE_ORIGINALS_BUCKET = (os.environ.get("INCIDENT_PHOTO_ORIGINALS_BUCKET") or "incident_photo_originals").strip()

ALLOWED_IMAGE_TYPES = {"jpeg", "png", "webp"}


def detect_image_type(contents: bytes) -> Optional[str]:
    if contents.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(contents) >= 12 and contents[:4] == b"RIFF" and contents[8:12] == b"WEBP":
        return "webp"
    return None


def category_from_description(desc: str) -> tuple[str, str]:
    lower = (desc or "").lower()
    mapping = [
        ("pothole", "pothole"),
        ("construction", "construction"),
        ("crash", "crash"),
        ("accident", "crash"),
        ("flood", "flooding"),
        ("police", "police"),
        ("debris", "debris"),
        ("weather", "weather"),
        ("snow", "weather"),
        ("ice", "weather"),
        ("closure", "closure"),
        ("closed", "closure"),
    ]
    cat = "hazard"
    for k, v in mapping:
        if k in lower:
            cat = v
            break
    short = " ".join((desc or "").split())[:120]
    return cat, short


def pil_blur_regions(contents: bytes, faces: list, plates: list) -> tuple[bytes, int]:
    """Return (jpeg bytes, number of regions successfully blurred)."""
    try:
        from io import BytesIO

        from PIL import Image as PILImage
        from PIL import ImageFilter  # type: ignore[import-untyped]

        img = PILImage.open(BytesIO(contents))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        regions = list(faces or []) + list(plates or [])
        applied = 0
        for region in regions:
            x, y = int(region.get("x", 0)), int(region.get("y", 0))
            w, h = int(region.get("width", 0)), int(region.get("height", 0))
            if w <= 0 or h <= 0:
                continue
            x2, y2 = min(img.width, x + w), min(img.height, y + h)
            x, y = max(0, x), max(0, y)
            if x2 <= x or y2 <= y:
                continue
            box = (x, y, x2, y2)
            cropped = img.crop(box)
            blur_radius = max(w, h) // 3
            blurred = cropped.filter(ImageFilter.GaussianBlur(radius=max(blur_radius, 15)))
            img.paste(blurred, box)
            applied += 1
        out = BytesIO()
        img.save(out, format="JPEG", quality=85)
        return out.getvalue(), applied
    except ImportError:
        return contents, 0
    except Exception as exc:
        logger.warning("pil blur failed: %s", exc)
        return contents, 0


def heavy_blur_full_jpeg(contents: bytes) -> bytes:
    """Last-resort privacy publish (e.g. admin approved when bbox blur failed)."""
    try:
        from io import BytesIO

        from PIL import Image as PILImage  # type: ignore[import-untyped]
        from PIL import ImageFilter  # type: ignore[import-untyped]

        img = PILImage.open(BytesIO(contents)).convert("RGB")
        blurred = img.filter(ImageFilter.GaussianBlur(radius=28))
        out = BytesIO()
        blurred.save(out, format="JPEG", quality=82)
        return out.getvalue()
    except Exception:
        return to_jpeg_bytes(contents)


def to_jpeg_bytes(contents: bytes) -> bytes:
    try:
        from io import BytesIO

        from PIL import Image as PILImage  # type: ignore[import-untyped]

        img = PILImage.open(BytesIO(contents))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception:
        return contents


async def analyze_and_prepare_public_bytes(original: bytes) -> dict[str, Any]:
    """
    Run vision analysis + blur pipeline. Returns dict with keys:
    analysis_ok, needs_pii, blurred_jpeg, base_jpeg, regions_blurred,
    ai_category, ai_description, mime
    """
    inferred = detect_image_type(original[:512])
    if inferred not in ALLOWED_IMAGE_TYPES:
        inferred = None
    mime = f"image/{inferred}" if inferred and inferred != "jpeg" else "image/jpeg"
    b64 = base64.b64encode(original).decode("utf-8")
    svc = PhotoAnalysisService()
    analysis = await svc.analyze_image(b64, mime)

    analysis_ok = bool(analysis.get("success"))
    det = analysis.get("detections") or {}
    if not isinstance(det, dict):
        det = {}
    faces = det.get("faces") or []
    plates = det.get("license_plates") or []
    desc = det.get("description") or ""
    ai_category, ai_description = category_from_description(desc)

    needs_pii = len(faces) + len(plates) > 0
    blurred_jpeg, regions_blurred = pil_blur_regions(original, faces, plates)
    base_jpeg = to_jpeg_bytes(original)

    return {
        "analysis_ok": analysis_ok,
        "needs_pii": needs_pii,
        "blurred_jpeg": blurred_jpeg,
        "base_jpeg": base_jpeg,
        "regions_blurred": regions_blurred,
        "ai_category": ai_category,
        "ai_description": ai_description,
        "mime": mime,
        "inferred_type": inferred,
    }
