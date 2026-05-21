"""
Product-page scraper for admin Online offers and FMTC fallbacks.

Collects real product/deal imagery (JSON-LD galleries, og:image variants,
Amazon hi-res blocks) and filters out merchant logos, favicons, site screenshots,
and other non-product art so mobile cards show what is actually on sale.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Callable, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 SnapRoadOfferImage/1.1"
)
DEFAULT_TIMEOUT_SECONDS = 12.0
MAX_BYTES_TO_READ = 1_500_000
SCRAPE_CACHE_TTL_S = max(3600, int(os.environ.get("ONLINE_OFFERS_SCRAPE_TTL_S") or "86400"))
SCRAPE_PAGE_BUDGET_S = max(2.0, float(os.environ.get("ONLINE_OFFERS_SCRAPE_BUDGET_S") or "8"))

# url → (expires_at, payload | None)
_scrape_cache: dict[str, tuple[float, Optional[dict[str, Any]]]] = {}

_NON_PRODUCT_HINTS = (
    "logo",
    "favicon",
    "sprite",
    "placeholder",
    "default-image",
    "no-image",
    "noimage",
    "site-logo",
    "brand-logo",
    "merchant-logo",
    "/brand/",
    "/brands/",
    "opengraph-default",
    "social-share",
    "share-image",
    "og-default",
    "screenshot",
    "site-shot",
    "site_shot",
    "banner-ad",
    "apple-touch-icon",
    "avatar",
    "profile-pic",
    "1x1",
    "pixel.gif",
    "spacer",
    "blank.gif",
    "loading.gif",
    "spinner",
    "watermark",
    "badge-only",
    "storefront",
    "homepage-hero",
)

_PRODUCT_HINTS = (
    "product",
    "gallery",
    "hero",
    "main",
    "large",
    "zoom",
    "item",
    "primary",
    "catalog",
    "merchandise",
    "sku",
    "listing",
)

_AMAZON_HOST_RE = re.compile(r"(?:^|\.)amazon\.[a-z.]{2,8}$", re.IGNORECASE)
_AMAZON_IMG_RE = re.compile(
    r'"(?:hiRes|large|mainUrl|thumb|variant)"\s*:\s*"(https://[^"]+)"',
    re.IGNORECASE,
)
_AMAZON_DYNAMIC_RE = re.compile(r'data-a-dynamic-image="\{([^"]+)\}"', re.IGNORECASE)
_IMG_SRC_RE = re.compile(
    r'<img[^>]+(?:data-old-hires|data-src|data-lazy|src)=["\'](https?://[^"\']+)["\']',
    re.IGNORECASE,
)


def scrape_enabled() -> bool:
    return (os.environ.get("ONLINE_OFFERS_SCRAPE_IMAGES") or "1").strip().lower() not in {
        "0",
        "false",
        "no",
    }


def _hostname(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _is_amazon_url(url: str) -> bool:
    host = _hostname(url)
    if not host:
        return False
    if host in {"amzn.to", "a.co", "amzn.com"}:
        return True
    return bool(_AMAZON_HOST_RE.search(host))


def _valid_http_url(value: Any) -> Optional[str]:
    url = str(value or "").strip()
    if not url.startswith(("http://", "https://")):
        return None
    if url.startswith("data:"):
        return None
    return url


def _append_unique(bucket: list[str], raw: Any) -> None:
    if isinstance(raw, str):
        u = _valid_http_url(raw)
        if u and u not in bucket:
            bucket.append(u)
        return
    if isinstance(raw, list):
        for x in raw:
            _append_unique(bucket, x)
        return
    if isinstance(raw, dict):
        for key in ("url", "contentUrl", "image", "src", "href", "@id"):
            _append_unique(bucket, raw.get(key))


def looks_like_non_product_image(url: str, *, merchant_domain: Optional[str] = None) -> bool:
    lu = url.lower()
    path = lu.split("?", 1)[0]
    if any(h in path for h in _NON_PRODUCT_HINTS):
        return True
    if re.search(r"/(?:logos?|icons?|favicons?)/", path):
        return True
    if re.search(r"[_-](?:logo|icon|favicon|badge)[_-]", path):
        return True
    if re.search(r"(?:^|[/_-])(?:16|24|32|48|64)x(?:16|24|32|48|64)(?:[/_-]|$)", path):
        return True
    if merchant_domain and merchant_domain.lower() in path and "product" not in path and "item" not in path:
        if any(x in path for x in ("logo", "brand", "header", "footer", "homepage")):
            return True
    return False


def image_quality_score(url: str, *, merchant_domain: Optional[str] = None) -> float:
    if looks_like_non_product_image(url, merchant_domain=merchant_domain):
        return -100.0
    lu = url.lower()
    score = 0.0
    for hint in _PRODUCT_HINTS:
        if hint in lu:
            score += 8.0
    if _is_amazon_url(url) or "media-amazon" in lu or "images-amazon" in lu:
        score += 12.0
        if "sl1500" in lu or "sl1000" in lu:
            score += 20.0
        elif "sl500" in lu:
            score += 10.0
        if "_ac_ul" in lu or "_ac_sl" in lu:
            score += 6.0
    m = re.search(r"(\d{3,4})x(\d{3,4})", lu)
    if m:
        w, h = int(m.group(1)), int(m.group(2))
        score += min(30.0, (w * h) / 25000.0)
    if "thumb" in lu or "thumbnail" in lu or "_small" in lu or "_xs" in lu:
        score -= 12.0
    if "large" in lu or "xlarge" in lu or "original" in lu or "zoom" in lu:
        score += 10.0
    if lu.endswith((".jpg", ".jpeg", ".webp", ".png")):
        score += 2.0
    return score


def rank_product_images(
    urls: list[str],
    *,
    merchant_domain: Optional[str] = None,
    title: Optional[str] = None,
    limit: int = 12,
) -> list[str]:
    del title  # reserved for future title-token matching
    seen: set[str] = set()
    scored: list[tuple[float, str]] = []
    for raw in urls:
        u = _valid_http_url(raw)
        if not u or u in seen:
            continue
        seen.add(u)
        s = image_quality_score(u, merchant_domain=merchant_domain)
        if s > -50:
            scored.append((s, u))
    scored.sort(key=lambda row: row[0], reverse=True)
    return [u for _, u in scored[:limit]]


def collect_jsonld_product_images(html_text: str) -> list[str]:
    from services.url_unfurl import extract_jsonld_product

    out: list[str] = []
    product = extract_jsonld_product(html_text)
    if product and product.get("image_url"):
        _append_unique(out, product["image_url"])

    try:
        from services.url_unfurl import _parse_html, _walk_jsonld, _is_product_node

        parsed = _parse_html(html_text)
        for blob in parsed.jsonld_blocks:
            try:
                data = json.loads(blob)
            except json.JSONDecodeError:
                continue
            for node in _walk_jsonld(data):
                if not _is_product_node(node):
                    continue
                _append_unique(out, node.get("image"))
    except Exception:
        pass
    return out


def collect_open_graph_images(html_text: str) -> list[str]:
    from services.url_unfurl import _parse_html

    parsed = _parse_html(html_text)
    og = parsed.meta_props
    out: list[str] = []
    for key in (
        "og:image",
        "og:image:url",
        "og:image:secure_url",
        "twitter:image",
        "twitter:image:src",
        "product:image",
    ):
        _append_unique(out, og.get(key))
    return out


def collect_amazon_images(html_text: str) -> list[str]:
    out: list[str] = []
    for m in _AMAZON_IMG_RE.finditer(html_text):
        _append_unique(out, m.group(1))
    for m in _AMAZON_DYNAMIC_RE.finditer(html_text):
        blob = "{" + m.group(1).replace("&quot;", '"') + "}"
        try:
            data = json.loads(blob)
            if isinstance(data, dict):
                for key in data:
                    _append_unique(out, key)
        except json.JSONDecodeError:
            for u in re.findall(r'(https://[^"\\]+)', m.group(1)):
                _append_unique(out, u)
    for m in _IMG_SRC_RE.finditer(html_text):
        _append_unique(out, m.group(1))
    return out


def collect_product_images_from_html(html_text: str, *, page_url: str) -> list[str]:
    domain = _hostname(page_url)
    merchant_domain = domain[4:] if domain.startswith("www.") else domain
    raw: list[str] = []
    raw.extend(collect_jsonld_product_images(html_text))
    raw.extend(collect_open_graph_images(html_text))
    if _is_amazon_url(page_url):
        raw.extend(collect_amazon_images(html_text))
    return rank_product_images(raw, merchant_domain=merchant_domain, limit=12)


def extract_product_metadata_from_html(html_text: str, *, page_url: str) -> dict[str, Any]:
    """Merge text/price extractors with a ranked product-image gallery."""
    from services.url_unfurl import extract_html_title, extract_jsonld_product, extract_open_graph

    parsed: dict[str, Any] = {}
    jsonld = extract_jsonld_product(html_text)
    if jsonld:
        parsed.update({k: v for k, v in jsonld.items() if v is not None})
        extractor = "jsonld_product"
    else:
        og = extract_open_graph(html_text)
        if og and (og.get("title") or og.get("image_url")):
            parsed.update({k: v for k, v in og.items() if v is not None})
            extractor = "open_graph"
        else:
            fb = extract_html_title(html_text)
            if fb:
                parsed.update({k: v for k, v in fb.items() if v is not None})
                extractor = "html_fallback"
            else:
                extractor = "none"

    gallery = collect_product_images_from_html(html_text, page_url=page_url)
    hero = parsed.get("image_url")
    if hero and looks_like_non_product_image(str(hero), merchant_domain=_hostname(page_url)):
        hero = None
    if gallery:
        if not hero or hero not in gallery:
            hero = gallery[0]
        parsed["image_url"] = hero
        parsed["image_urls"] = gallery
    elif hero:
        parsed["image_urls"] = [hero]

    parsed["extractor"] = extractor
    return parsed


def _fetch_html(url: str, *, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> tuple[str, str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }
    with httpx.Client(follow_redirects=True, timeout=timeout, headers=headers, http2=False) as client:
        with client.stream("GET", url) as r:
            if r.status_code >= 400:
                raise ValueError(f"HTTP {r.status_code}")
            chunks: list[bytes] = []
            read = 0
            for chunk in r.iter_bytes(chunk_size=65_536):
                if not chunk:
                    continue
                chunks.append(chunk)
                read += len(chunk)
                if read >= MAX_BYTES_TO_READ:
                    break
            final_url = str(r.url)
            encoding = (r.encoding or "utf-8").lower()
            body = b"".join(chunks)
            try:
                html_text = body.decode(encoding, errors="replace")
            except (LookupError, TypeError):
                html_text = body.decode("utf-8", errors="replace")
            return final_url, html_text


def scrape_product_page(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    _fetcher: Optional[Callable[[str, float], tuple[str, str]]] = None,
    use_cache: bool = True,
) -> Optional[dict[str, Any]]:
    """
    Fetch a product URL and return ranked images + basic metadata.
    Returns None when the page cannot be fetched or yields no usable product art.
    """
    src = (url or "").strip()
    if not src.startswith(("http://", "https://")):
        return None

    now = time.time()
    if use_cache:
        cached = _scrape_cache.get(src)
        if cached and cached[0] > now:
            return cached[1]

    fetch = _fetcher or _fetch_html
    try:
        final_url, html_text = fetch(src, timeout)
    except Exception as exc:
        logger.debug("product scrape fetch failed for %s: %s", src, exc)
        if use_cache:
            _scrape_cache[src] = (now + min(900, SCRAPE_CACHE_TTL_S), None)
        return None

    meta = extract_product_metadata_from_html(html_text, page_url=final_url)
    gallery = meta.get("image_urls") if isinstance(meta.get("image_urls"), list) else []
    if not gallery and not meta.get("image_url"):
        if use_cache:
            _scrape_cache[src] = (now + SCRAPE_CACHE_TTL_S, None)
        return None

    payload = {
        "source_url": src,
        "final_url": final_url,
        "title": meta.get("title"),
        "description": meta.get("description"),
        "image_url": meta.get("image_url"),
        "image_urls": gallery or ([meta["image_url"]] if meta.get("image_url") else []),
        "regular_price": meta.get("regular_price"),
        "sale_price": meta.get("sale_price"),
        "currency": meta.get("currency"),
        "extractor": meta.get("extractor"),
    }
    if use_cache:
        _scrape_cache[src] = (now + SCRAPE_CACHE_TTL_S, payload)
    return payload


def item_needs_image_rescrape(item: dict[str, Any]) -> bool:
    """True when the catalog row has no product art or only weak/logo-like imagery."""
    hero = str(item.get("image_url") or "").strip()
    gallery = item.get("image_urls") if isinstance(item.get("image_urls"), list) else []
    domain = str(item.get("merchant_domain") or "").strip() or None
    if not hero and not gallery:
        return True
    candidates = [hero] if hero else []
    candidates.extend(str(u).strip() for u in gallery if u)
    productish = [
        u
        for u in candidates
        if u.startswith(("http://", "https://")) and not looks_like_non_product_image(u, merchant_domain=domain)
    ]
    return len(productish) == 0


def augment_items_with_scraped_images(
    items: list[dict[str, Any]],
    *,
    budget_seconds: float = SCRAPE_PAGE_BUDGET_S,
) -> None:
    """In-place: scrape missing/weak images for admin online offers (bounded time budget)."""
    if not scrape_enabled() or not items:
        return
    deadline = time.time() + budget_seconds
    for item in items:
        if time.time() > deadline:
            return
        if not item_needs_image_rescrape(item):
            continue
        url = (item.get("source_url") or item.get("affiliate_url") or "").strip()
        if not url:
            continue
        scraped = scrape_product_page(url, timeout=min(8.0, budget_seconds))
        if not scraped:
            continue
        hero = scraped.get("image_url")
        gallery = scraped.get("image_urls") if isinstance(scraped.get("image_urls"), list) else []
        if hero:
            item["image_url"] = hero
        if gallery:
            item["image_urls"] = gallery[:12]
        for key in ("title", "description", "regular_price", "sale_price", "currency"):
            if not item.get(key) and scraped.get(key) is not None:
                item[key] = scraped[key]


__all__ = [
    "augment_items_with_scraped_images",
    "collect_product_images_from_html",
    "extract_product_metadata_from_html",
    "image_quality_score",
    "item_needs_image_rescrape",
    "looks_like_non_product_image",
    "rank_product_images",
    "scrape_enabled",
    "scrape_product_page",
]
