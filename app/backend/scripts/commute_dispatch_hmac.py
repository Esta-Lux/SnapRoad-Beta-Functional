#!/usr/bin/env python3
"""Print HMAC headers for POST /api/commute-routes/internal/dispatch (or -traffic).

Usage:
  export COMMUTE_DISPATCH_SECRET=your-secret
  python scripts/commute_dispatch_hmac.py --base-url https://api.example.com

Then curl:
  curl -sS -X POST "$BASE/api/commute-routes/internal/dispatch" \\
    -H "X-Internal-Timestamp: $TS" \\
    -H "X-Internal-Signature: $SIG"
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import os
import time
import urllib.parse


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base-url", default=os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8001"))
    p.add_argument(
        "--path",
        default="/api/commute-routes/internal/dispatch",
        help="dispatch | dispatch-traffic path under /api/commute-routes/internal/",
    )
    args = p.parse_args()

    key = (os.getenv("COMMUTE_INTERNAL_HMAC_SECRET") or os.getenv("COMMUTE_DISPATCH_SECRET") or "").strip()
    if not key:
        raise SystemExit("Set COMMUTE_DISPATCH_SECRET or COMMUTE_INTERNAL_HMAC_SECRET")

    body = b""
    ts = str(int(time.time()))
    msg = ts.encode("utf-8") + b"\n" + body
    sig = hmac.new(key.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    base = args.base_url.rstrip("/")
    path = args.path if args.path.startswith("/") else f"/{args.path}"
    url = urllib.parse.urljoin(base + "/", path.lstrip("/"))

    print(f"X-Internal-Timestamp: {ts}")
    print(f"X-Internal-Signature: {sig}")
    print()
    print(f"curl -sS -X POST {url!r} \\")
    print(f"  -H {('X-Internal-Timestamp: ' + ts)!r} \\")
    print(f"  -H {('X-Internal-Signature: ' + sig)!r}")


if __name__ == "__main__":
    main()
