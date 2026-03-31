#!/usr/bin/env python3
"""
Print backend runtime egress IP details.

Run this from the deployed backend environment (or container shell) to confirm
fixed outbound IP behavior before applying Stripe IP restrictions.
"""

import json
from urllib.request import urlopen, Request


def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": "snaproad-egress-check/1.0"})
    with urlopen(req, timeout=10) as resp:
        return resp.read().decode("utf-8").strip()


def main() -> None:
    results = {}
    services = {
        "ipify": "https://api.ipify.org",
        "ifconfig_me": "https://ifconfig.me/ip",
        "ipinfo": "https://ipinfo.io/ip",
    }
    for name, url in services.items():
        try:
            results[name] = fetch(url)
        except Exception as exc:
            results[name] = f"ERROR: {exc}"

    unique_ips = sorted({v for v in results.values() if not v.startswith("ERROR:")})
    output = {
        "results": results,
        "unique_ips": unique_ips,
        "stable": len(unique_ips) == 1,
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
