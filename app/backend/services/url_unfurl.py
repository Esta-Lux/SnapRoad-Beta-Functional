"""
URL unfurler — admin "paste a product link" → preview metadata.

Strategy (first match wins):
    1. Amazon PA-API 5.0 — only registered when `AMAZON_PAAPI_ACCESS_KEY`,
       `AMAZON_PAAPI_SECRET_KEY`, and `AMAZON_PAAPI_PARTNER_TAG` are set in env.
       Currently a stub that returns `None` so the request falls through to
       OG / JSON-LD parsing of the resolved Amazon URL. This keeps the wiring
       in place; the actual PA-API GetItems call is intentionally out of scope
       for this feature (the user is still working toward Associates approval).
    2. JSON-LD `Product` schema embedded in `<script type="application/ld+json">`.
       Reliable on Walmart, Target, Etsy, Best Buy, Shopify stores, etc.
    3. Open Graph + product meta tags (`og:title`, `og:image`,
       `product:price:amount`, `product:price:currency`).
    4. Plain HTML fallback (`<title>`, `<meta name="twitter:image">`).

Pure parsing logic is pulled out so it can be unit-tested against fixture HTML
without making any network calls — see `tests/test_url_unfurl.py`.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)


__all__ = [
    "UnfurlResult",
    "UnfurlError",
    "unfurl_product_url",
    "extract_jsonld_product",
    "extract_open_graph",
    "extract_html_title",
    "parse_price_string",
    "extract_amazon_asin",
    "amazon_paapi_configured",
]


# ─── Tunables ────────────────────────────────────────────────────────────────

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 SnapRoadAdminUnfurler/1.0"
)
DEFAULT_TIMEOUT_SECONDS = 12.0
MAX_BYTES_TO_READ = 1_500_000  # 1.5 MB cap so a hostile or huge page can't OOM the worker.


# ─── Result type ─────────────────────────────────────────────────────────────


@dataclass
class UnfurlResult:
    """
    Normalised preview a frontend can show before the admin clicks Publish.

    All fields except `source_url` are optional because not every page exposes
    everything; the admin form treats them as pre-fills, not source-of-truth.
    """

    source_url: str
    final_url: str = ""
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    merchant_name: Optional[str] = None
    merchant_domain: Optional[str] = None
    regular_price: Optional[float] = None
    sale_price: Optional[float] = None
    currency: Optional[str] = "USD"
    asin: Optional[str] = None
    extractor: str = "none"
    raw_metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_url": self.source_url,
            "final_url": self.final_url or self.source_url,
            "title": self.title,
            "description": self.description,
            "image_url": self.image_url,
            "merchant_name": self.merchant_name,
            "merchant_domain": self.merchant_domain,
            "regular_price": self.regular_price,
            "sale_price": self.sale_price,
            "currency": self.currency,
            "asin": self.asin,
            "extractor": self.extractor,
            "raw_metadata": self.raw_metadata,
        }


class UnfurlError(Exception):
    """Raised when the URL is unreachable or visibly invalid."""


# ─── URL helpers ─────────────────────────────────────────────────────────────


_AMAZON_HOST_RE = re.compile(r"(?:^|\.)amazon\.[a-z.]{2,8}$", re.IGNORECASE)
_AMAZON_SHORT_HOSTS = {"amzn.to", "a.co", "amzn.com", "amzn.eu", "amzn.asia"}
_ASIN_PATH_RE = re.compile(r"/(?:dp|gp/product|gp/aw/d|product)/([A-Z0-9]{10})(?:[/?]|$)", re.IGNORECASE)


def _hostname(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _is_amazon_url(url: str) -> bool:
    host = _hostname(url)
    if not host:
        return False
    if host in _AMAZON_SHORT_HOSTS:
        return True
    return bool(_AMAZON_HOST_RE.search(host))


def extract_amazon_asin(url: str) -> Optional[str]:
    """Return the 10-character ASIN parsed from an Amazon product URL, or None."""
    try:
        path = urlparse(url).path or ""
    except Exception:
        return None
    m = _ASIN_PATH_RE.search(path)
    return m.group(1).upper() if m else None


def _merchant_domain_from_url(url: str) -> Optional[str]:
    host = _hostname(url)
    if not host:
        return None
    return host[4:] if host.startswith("www.") else host


def _merchant_name_default(domain: Optional[str]) -> Optional[str]:
    if not domain:
        return None
    base = domain.split(".")[0]
    return base.replace("-", " ").replace("_", " ").title() if base else None


# ─── Price parser ────────────────────────────────────────────────────────────


_PRICE_NUMERIC_RE = re.compile(r"(?P<num>[0-9][0-9.,]{0,12})")


def parse_price_string(value: Any) -> Optional[float]:
    """
    Parse a price-ish input into a float USD/native-amount.

    Accepts:
      - numbers (`19.99`, `19`, `1999`)
      - strings (`"$19.99"`, `"19,99 €"`, `"USD 1,299.00"`, `"1.299,99"`)

    European-style decimals (`1.299,99`) are normalised by treating the comma
    as the decimal separator when there are exactly two digits after it.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value) if value >= 0 else None

    s = str(value).strip()
    if not s:
        return None
    m = _PRICE_NUMERIC_RE.search(s.replace(" ", ""))
    if not m:
        return None
    raw = m.group("num")

    if "," in raw and "." in raw:
        # Whichever separator appears LAST is the decimal one (US: `1,299.99`; EU: `1.299,99`).
        if raw.rfind(",") > raw.rfind("."):
            raw = raw.replace(".", "").replace(",", ".")
        else:
            raw = raw.replace(",", "")
    elif "," in raw:
        # Only commas: treat as decimal if exactly 2 trailing digits, else thousands.
        tail = raw.split(",")[-1]
        if len(tail) == 2 and tail.isdigit():
            raw = raw.replace(",", ".")
        else:
            raw = raw.replace(",", "")

    try:
        f = float(raw)
    except ValueError:
        return None
    return f if f >= 0 else None


# ─── HTML helpers ────────────────────────────────────────────────────────────


class _MetaAndJsonLdParser(HTMLParser):
    """
    Pulls just the bits we need from an HTML document:
      - `<meta>` tags (Open Graph, Twitter, product:*)
      - `<title>` text
      - `<script type="application/ld+json">` body strings

    Tolerates malformed HTML — `html.parser` is lenient and does not blow up on
    unclosed tags / stray attributes the way `lxml` strict mode would.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta_props: dict[str, str] = {}  # property/name → content
        self.jsonld_blocks: list[str] = []
        self.title: Optional[str] = None
        self._in_title = False
        self._in_jsonld = False
        self._jsonld_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        t = tag.lower()
        a = {k.lower(): (v or "") for k, v in attrs}
        if t == "meta":
            key = a.get("property") or a.get("name")
            content = a.get("content")
            if key and content:
                self.meta_props.setdefault(key.lower(), content)
        elif t == "title":
            self._in_title = True
        elif t == "script" and a.get("type", "").lower() == "application/ld+json":
            self._in_jsonld = True
            self._jsonld_buf = []

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t == "title":
            self._in_title = False
        elif t == "script" and self._in_jsonld:
            self._in_jsonld = False
            blob = "".join(self._jsonld_buf).strip()
            if blob:
                self.jsonld_blocks.append(blob)
            self._jsonld_buf = []

    def handle_data(self, data: str) -> None:
        if self._in_title and self.title is None:
            stripped = data.strip()
            if stripped:
                self.title = stripped
        elif self._in_jsonld:
            self._jsonld_buf.append(data)


def _parse_html(html_text: str) -> _MetaAndJsonLdParser:
    p = _MetaAndJsonLdParser()
    try:
        p.feed(html_text)
    except Exception as exc:  # malformed HTML is common; degrade gracefully
        logger.debug("unfurl: HTML parse partial failure: %s", exc)
    return p


# ─── Extractors ──────────────────────────────────────────────────────────────


def _walk_jsonld(node: Any) -> list[dict[str, Any]]:
    """Flatten arbitrarily nested JSON-LD into a list of dict nodes."""
    out: list[dict[str, Any]] = []
    if isinstance(node, dict):
        out.append(node)
        graph = node.get("@graph")
        if isinstance(graph, list):
            for g in graph:
                out.extend(_walk_jsonld(g))
    elif isinstance(node, list):
        for n in node:
            out.extend(_walk_jsonld(n))
    return out


def _is_product_node(d: dict[str, Any]) -> bool:
    t = d.get("@type")
    if isinstance(t, str):
        return t.lower() == "product"
    if isinstance(t, list):
        return any(isinstance(x, str) and x.lower() == "product" for x in t)
    return False


def _first_image(image_field: Any) -> Optional[str]:
    if not image_field:
        return None
    if isinstance(image_field, str):
        return image_field
    if isinstance(image_field, list):
        for item in image_field:
            if isinstance(item, str) and item:
                return item
            if isinstance(item, dict):
                u = item.get("url") or item.get("contentUrl")
                if isinstance(u, str) and u:
                    return u
    if isinstance(image_field, dict):
        u = image_field.get("url") or image_field.get("contentUrl")
        if isinstance(u, str):
            return u
    return None


def _brand_name(brand_field: Any) -> Optional[str]:
    if not brand_field:
        return None
    if isinstance(brand_field, str):
        return brand_field.strip() or None
    if isinstance(brand_field, dict):
        v = brand_field.get("name")
        if isinstance(v, str):
            return v.strip() or None
    if isinstance(brand_field, list):
        for b in brand_field:
            v = _brand_name(b)
            if v:
                return v
    return None


def _offers_prices(offers_field: Any) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """
    Pull `price` / `priceCurrency` (and optional `priceSpecification.price` +
    `highPrice` / `lowPrice` when the schema is an `AggregateOffer`).
    Returns (regular_price, sale_price, currency).
    """
    if not offers_field:
        return (None, None, None)
    if isinstance(offers_field, list):
        for o in offers_field:
            r, s, c = _offers_prices(o)
            if r or s:
                return (r, s, c)
        return (None, None, None)
    if not isinstance(offers_field, dict):
        return (None, None, None)

    currency = offers_field.get("priceCurrency")
    sale = parse_price_string(offers_field.get("price"))
    high = parse_price_string(offers_field.get("highPrice"))
    low = parse_price_string(offers_field.get("lowPrice"))
    regular: Optional[float] = None

    spec = offers_field.get("priceSpecification")
    if isinstance(spec, dict):
        spec_price = parse_price_string(spec.get("price"))
        if spec_price is not None and sale is None:
            sale = spec_price
        ref = spec.get("referencePrice") or spec.get("eligibleQuantity")
        if isinstance(ref, dict):
            ref_p = parse_price_string(ref.get("price"))
            if ref_p is not None:
                regular = ref_p

    if regular is None:
        if high is not None and sale is not None and high > sale:
            regular = high
        elif low is not None and sale is not None and low < sale:
            # Edge case: aggregate range with no explicit "regular" — keep sale only.
            regular = None

    if isinstance(currency, str):
        currency = currency.strip().upper() or None
    else:
        currency = None
    return (regular, sale, currency)


def extract_jsonld_product(html_text: str) -> Optional[dict[str, Any]]:
    """Pull title / image / brand / price from a JSON-LD `Product` block, or None."""
    parsed = _parse_html(html_text)
    for blob in parsed.jsonld_blocks:
        try:
            data = json.loads(blob)
        except json.JSONDecodeError:
            continue
        for node in _walk_jsonld(data):
            if not _is_product_node(node):
                continue
            regular, sale, currency = _offers_prices(node.get("offers"))
            return {
                "title": (node.get("name") or "").strip() or None,
                "description": (node.get("description") or "").strip() or None,
                "image_url": _first_image(node.get("image")),
                "merchant_name": _brand_name(node.get("brand")),
                "regular_price": regular,
                "sale_price": sale,
                "currency": currency,
            }
    return None


def extract_open_graph(html_text: str) -> Optional[dict[str, Any]]:
    """Pull title / image / price from Open Graph + product:* meta tags, or None."""
    parsed = _parse_html(html_text)
    if not parsed.meta_props:
        return None
    og = parsed.meta_props
    title = og.get("og:title") or og.get("twitter:title")
    image = og.get("og:image") or og.get("og:image:secure_url") or og.get("twitter:image")
    description = og.get("og:description") or og.get("twitter:description")
    site_name = og.get("og:site_name")

    sale_price = parse_price_string(og.get("product:price:amount") or og.get("og:price:amount"))
    currency = og.get("product:price:currency") or og.get("og:price:currency")
    regular_price = parse_price_string(og.get("product:original_price:amount"))

    if not any([title, image, sale_price, regular_price]):
        return None
    return {
        "title": (title or "").strip() or None,
        "description": (description or "").strip() or None,
        "image_url": (image or "").strip() or None,
        "merchant_name": (site_name or "").strip() or None,
        "regular_price": regular_price,
        "sale_price": sale_price,
        "currency": (currency or "").strip().upper() or None,
    }


def extract_html_title(html_text: str) -> Optional[dict[str, Any]]:
    """Last-ditch: grab `<title>` and a twitter:image — at least the admin gets a starting point."""
    parsed = _parse_html(html_text)
    title = parsed.title
    image = parsed.meta_props.get("twitter:image") or parsed.meta_props.get("og:image")
    if not title and not image:
        return None
    return {
        "title": title,
        "description": None,
        "image_url": image,
        "merchant_name": None,
        "regular_price": None,
        "sale_price": None,
        "currency": None,
    }


# ─── Amazon PA-API gating (stub for now) ─────────────────────────────────────


def amazon_paapi_configured() -> bool:
    return all(
        (os.environ.get(k) or "").strip()
        for k in ("AMAZON_PAAPI_ACCESS_KEY", "AMAZON_PAAPI_SECRET_KEY", "AMAZON_PAAPI_PARTNER_TAG")
    )


def _amazon_paapi_lookup(asin: str) -> Optional[dict[str, Any]]:  # pragma: no cover (real call wired later)
    """
    Placeholder for the future PA-API 5.0 GetItems integration.

    When `amazon_paapi_configured()` is True we'll sign an HMAC-SHA256 request
    to `https://webservices.amazon.<tld>/paapi5/getitems` and translate the
    response into the same dict shape `extract_jsonld_product` returns.
    Until then this returns None and the caller falls back to OG/JSON-LD on
    the resolved Amazon HTML page.
    """
    _ = asin
    return None


# ─── HTTP fetch + orchestrator ───────────────────────────────────────────────


def _fetch_html(url: str, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> tuple[str, str]:
    """
    GET the URL with browser-ish headers, follow redirects, return (final_url, html).
    Caps body size at MAX_BYTES_TO_READ to bound memory.
    """
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }
    try:
        with httpx.Client(
            follow_redirects=True,
            timeout=timeout,
            headers=headers,
            http2=False,
        ) as client:
            with client.stream("GET", url) as r:
                if r.status_code >= 400:
                    raise UnfurlError(f"Source returned HTTP {r.status_code}")
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
                # Decode using the response's declared encoding when possible.
                encoding = (r.encoding or "utf-8").lower()
                body = b"".join(chunks)
                try:
                    html_text = body.decode(encoding, errors="replace")
                except (LookupError, TypeError):
                    html_text = body.decode("utf-8", errors="replace")
                return final_url, html_text
    except UnfurlError:
        raise
    except httpx.HTTPError as exc:
        raise UnfurlError(f"Could not fetch URL: {exc}") from exc


def _normalize_url(url: str) -> str:
    s = (url or "").strip()
    if not s:
        raise UnfurlError("URL is required")
    if not re.match(r"^https?://", s, re.IGNORECASE):
        s = "https://" + s
    return s


def unfurl_product_url(url: str, *, _fetcher=_fetch_html) -> UnfurlResult:
    """
    Resolve `url` and return an `UnfurlResult` populated with whatever metadata
    the page exposes. The optional `_fetcher` keyword exists so tests can inject
    a fake (final_url, html) without making real HTTP calls.
    """
    source = _normalize_url(url)
    final_url, html_text = _fetcher(source)

    is_amazon = _is_amazon_url(final_url) or _is_amazon_url(source)
    asin = extract_amazon_asin(final_url) or extract_amazon_asin(source)

    # 1. Amazon PA-API path (currently a stub returning None — falls through).
    if is_amazon and asin and amazon_paapi_configured():
        paapi = _amazon_paapi_lookup(asin)
        if paapi:
            return _build_result(source, final_url, paapi, extractor="amazon_paapi", asin=asin)

    # 2. JSON-LD Product schema.
    jsonld = extract_jsonld_product(html_text)
    if jsonld and jsonld.get("title"):
        return _build_result(source, final_url, jsonld, extractor="jsonld_product", asin=asin)

    # 3. Open Graph + product meta tags.
    og = extract_open_graph(html_text)
    if og and (og.get("title") or og.get("image_url")):
        return _build_result(source, final_url, og, extractor="open_graph", asin=asin)

    # 4. Plain HTML fallback.
    fallback = extract_html_title(html_text)
    if fallback:
        return _build_result(source, final_url, fallback, extractor="html_fallback", asin=asin)

    # Nothing usable — still return an empty preview so the admin can fill it in manually.
    return _build_result(source, final_url, {}, extractor="none", asin=asin)


def _build_result(
    source: str,
    final_url: str,
    parsed: dict[str, Any],
    *,
    extractor: str,
    asin: Optional[str],
) -> UnfurlResult:
    domain = _merchant_domain_from_url(final_url) or _merchant_domain_from_url(source)
    merchant_name = parsed.get("merchant_name") or _merchant_name_default(domain)
    currency = parsed.get("currency") or "USD"
    return UnfurlResult(
        source_url=source,
        final_url=final_url,
        title=(parsed.get("title") or None),
        description=(parsed.get("description") or None),
        image_url=(parsed.get("image_url") or None),
        merchant_name=merchant_name,
        merchant_domain=domain,
        regular_price=parsed.get("regular_price"),
        sale_price=parsed.get("sale_price"),
        currency=currency,
        asin=asin,
        extractor=extractor,
        raw_metadata={
            "extractor": extractor,
            "parsed": {k: v for k, v in parsed.items() if v is not None},
            "is_amazon": _is_amazon_url(final_url) or _is_amazon_url(source),
        },
    )
