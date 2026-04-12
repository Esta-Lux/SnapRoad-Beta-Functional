#!/usr/bin/env python3
"""Generate assets/navigation-user-arrow.png (white silhouette on transparent) for Mapbox SDF tinting."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path


def point_in_triangle(px: float, py: float, ax: float, ay: float, bx: float, by: float, cx: float, cy: float) -> bool:
    def sign(p1x, p1y, p2x, p2y, p3x, p3y):
        return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y)

    d1 = sign(px, py, ax, ay, bx, by)
    d2 = sign(px, py, bx, by, cx, cy)
    d3 = sign(px, py, cx, cy, ax, ay)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (has_neg and has_pos)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out = root / "assets" / "navigation-user-arrow.png"
    w = h = 128
    # Up-pointing arrow + small stem (white for SDF / iconColor)
    tip = (64.0, 18.0)
    bl = (28.0, 98.0)
    br = (100.0, 98.0)
    stem = [(58.0, 98.0), (70.0, 98.0), (70.0, 108.0), (58.0, 108.0)]

    def in_stem(px: float, py: float) -> bool:
        xs = [p[0] for p in stem]
        ys = [p[1] for p in stem]
        return min(xs) <= px <= max(xs) and min(ys) <= py <= max(ys)

    rows: list[bytes] = []
    for y in range(h):
        row = bytearray()
        row.append(0)  # filter type 0
        for x in range(w):
            px, py = x + 0.5, y + 0.5
            inside = point_in_triangle(px, py, tip[0], tip[1], bl[0], bl[1], br[0], br[1]) or in_stem(px, py)
            if inside:
                row.extend([255, 255, 255, 255])
            else:
                row.extend([0, 0, 0, 0])
        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(png)
    print(f"Wrote {out} ({len(png)} bytes)")


if __name__ == "__main__":
    main()
