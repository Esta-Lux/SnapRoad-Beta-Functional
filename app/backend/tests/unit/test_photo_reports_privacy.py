"""Privacy pipeline helpers for photo reports."""
from io import BytesIO

import pytest

pytest.importorskip("PIL")

from PIL import Image

from services.photo_report_processing import pil_blur_regions, heavy_blur_full_jpeg, category_from_description


def _jpeg_rgb(w: int = 120, h: int = 120) -> bytes:
    img = Image.new("RGB", (w, h), color=(200, 40, 40))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def test_pil_blur_regions_counts_applied_boxes():
    raw = _jpeg_rgb()
    faces = [{"x": 20, "y": 20, "width": 40, "height": 40}]
    out, n = pil_blur_regions(raw, faces, [])
    assert n == 1
    assert isinstance(out, bytes)
    assert len(out) > 50
    assert out[:2] == b"\xff\xd8"


def test_pil_blur_zero_regions_returns_jpeg():
    raw = _jpeg_rgb()
    out, n = pil_blur_regions(raw, [], [])
    assert n == 0


def test_heavy_blur_produces_jpeg():
    raw = _jpeg_rgb()
    out = heavy_blur_full_jpeg(raw)
    assert out[:2] == b"\xff\xd8"
    assert len(out) > 50


def test_category_from_description_maps_pothole():
    cat, _short = category_from_description("Large pothole in the right lane")
    assert cat == "pothole"
