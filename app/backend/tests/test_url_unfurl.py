"""
Pure-parser unit tests for `services.url_unfurl`.

No real HTTP — `unfurl_product_url` accepts a `_fetcher` kwarg so we inject
fixture HTML that exercises each extractor (JSON-LD Product, Open Graph, plain
HTML fallback) and the price-string normalisation.
"""

from __future__ import annotations

from services.url_unfurl import (
    extract_amazon_asin,
    extract_html_title,
    extract_jsonld_product,
    extract_open_graph,
    parse_price_string,
    unfurl_product_url,
)


# ─── Price parsing ───────────────────────────────────────────────────────────


def test_parse_price_string_handles_us_decimals() -> None:
    assert parse_price_string("$19.99") == 19.99
    assert parse_price_string("USD 1,299.00") == 1299.0
    assert parse_price_string(19.99) == 19.99
    assert parse_price_string("19") == 19.0


def test_parse_price_string_handles_eu_decimals() -> None:
    assert parse_price_string("19,99 €") == 19.99
    assert parse_price_string("1.299,99") == 1299.99


def test_parse_price_string_rejects_garbage() -> None:
    assert parse_price_string("") is None
    assert parse_price_string(None) is None
    assert parse_price_string("free") is None


# ─── JSON-LD Product extractor ───────────────────────────────────────────────


_JSONLD_FIXTURE = """
<html>
<head>
<title>Should be ignored when JSON-LD wins</title>
<meta property="og:title" content="OG title (lower priority)" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Acme Wireless Earbuds",
  "description": "Great earbuds with multipoint.",
  "image": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
  "brand": {"@type": "Brand", "name": "Acme"},
  "offers": {
    "@type": "Offer",
    "price": "79.99",
    "priceCurrency": "USD",
    "highPrice": "129.99"
  }
}
</script>
</head>
<body>fluff</body>
</html>
"""


def test_extract_jsonld_product_pulls_name_image_brand_and_prices() -> None:
    out = extract_jsonld_product(_JSONLD_FIXTURE)
    assert out is not None
    assert out["title"] == "Acme Wireless Earbuds"
    assert out["image_url"] == "https://example.com/img1.jpg"
    assert out["merchant_name"] == "Acme"
    assert out["sale_price"] == 79.99
    assert out["regular_price"] == 129.99
    assert out["currency"] == "USD"


def test_extract_jsonld_product_walks_graph_node() -> None:
    html = """
    <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"BreadcrumbList","itemListElement":[]},
      {"@type":"Product","name":"Graph Product","offers":{"price":"42","priceCurrency":"USD"}}
    ]}
    </script>
    """
    out = extract_jsonld_product(html)
    assert out is not None
    assert out["title"] == "Graph Product"
    assert out["sale_price"] == 42.0


def test_extract_jsonld_product_returns_none_when_absent() -> None:
    assert extract_jsonld_product("<html><body>no schema</body></html>") is None


# ─── Open Graph extractor ────────────────────────────────────────────────────


_OG_FIXTURE = """
<html>
<head>
<meta property="og:title" content="OG Tagged Item" />
<meta property="og:image" content="https://cdn.example.com/hero.jpg" />
<meta property="og:site_name" content="ExampleStore" />
<meta property="product:price:amount" content="49.95" />
<meta property="product:price:currency" content="USD" />
<meta property="product:original_price:amount" content="69.95" />
</head>
</html>
"""


def test_extract_open_graph_returns_title_image_and_prices() -> None:
    out = extract_open_graph(_OG_FIXTURE)
    assert out is not None
    assert out["title"] == "OG Tagged Item"
    assert out["image_url"] == "https://cdn.example.com/hero.jpg"
    assert out["merchant_name"] == "ExampleStore"
    assert out["sale_price"] == 49.95
    assert out["regular_price"] == 69.95
    assert out["currency"] == "USD"


def test_extract_open_graph_returns_none_when_meta_absent() -> None:
    assert extract_open_graph("<html><body>no meta</body></html>") is None


# ─── HTML title fallback ─────────────────────────────────────────────────────


def test_extract_html_title_uses_title_and_twitter_image() -> None:
    html = """
    <html><head>
    <title>Plain Page Title</title>
    <meta name="twitter:image" content="https://example.com/tw.jpg" />
    </head></html>
    """
    out = extract_html_title(html)
    assert out is not None
    assert out["title"] == "Plain Page Title"
    assert out["image_url"] == "https://example.com/tw.jpg"


def test_extract_html_title_returns_none_for_empty_doc() -> None:
    assert extract_html_title("<html><body></body></html>") is None


# ─── ASIN extraction ─────────────────────────────────────────────────────────


def test_extract_amazon_asin_from_dp_path() -> None:
    assert extract_amazon_asin("https://www.amazon.com/dp/B0CHX1W1XY") == "B0CHX1W1XY"
    assert extract_amazon_asin("https://www.amazon.com/Some-Product-Name/dp/B0ABCDEFGH/ref=sr_1_1") == "B0ABCDEFGH"
    assert extract_amazon_asin("https://www.amazon.com/gp/product/B0XXXXXXXX/?tag=foo") == "B0XXXXXXXX"


def test_extract_amazon_asin_returns_none_for_non_amazon() -> None:
    assert extract_amazon_asin("https://walmart.com/ip/12345") is None
    assert extract_amazon_asin("https://amzn.to/4eDWU1K") is None  # short URL — needs redirect resolution first


# ─── End-to-end orchestration with injected fetcher ─────────────────────────


def _fake_fetcher_factory(html: str, final_url: str = "https://example.com/product/123"):
    def _fake(_url: str, timeout: float = 12.0):  # pragma: no cover - signature parity only
        _ = timeout
        return final_url, html
    return _fake


def test_unfurl_prefers_jsonld_when_both_present() -> None:
    result = unfurl_product_url(
        "example.com/product",
        _fetcher=_fake_fetcher_factory(_JSONLD_FIXTURE, "https://example.com/product/123"),
    )
    assert result.extractor == "jsonld_product"
    assert result.title == "Acme Wireless Earbuds"
    assert result.sale_price == 79.99
    assert result.regular_price == 129.99
    assert result.merchant_domain == "example.com"
    assert result.merchant_name == "Acme"
    assert result.currency == "USD"


def test_unfurl_falls_back_to_open_graph() -> None:
    result = unfurl_product_url(
        "https://store.example.com/sku/9",
        _fetcher=_fake_fetcher_factory(_OG_FIXTURE, "https://store.example.com/sku/9"),
    )
    assert result.extractor == "open_graph"
    assert result.title == "OG Tagged Item"
    assert result.sale_price == 49.95
    assert result.regular_price == 69.95
    assert result.merchant_domain == "store.example.com"


def test_unfurl_falls_back_to_html_title_when_no_meta() -> None:
    html = "<html><head><title>Bare Page</title></head><body>x</body></html>"
    result = unfurl_product_url(
        "https://random.example.com/x",
        _fetcher=_fake_fetcher_factory(html, "https://random.example.com/x"),
    )
    assert result.extractor == "html_fallback"
    assert result.title == "Bare Page"
    # Default merchant name derived from domain when nothing else is available.
    assert result.merchant_name == "Random"


def test_unfurl_returns_none_extractor_for_blank_page() -> None:
    result = unfurl_product_url(
        "https://blank.example.com/",
        _fetcher=_fake_fetcher_factory("<html></html>", "https://blank.example.com/"),
    )
    assert result.extractor == "none"
    assert result.title is None


def test_unfurl_keeps_asin_for_amazon_final_url() -> None:
    result = unfurl_product_url(
        "https://amzn.to/4eDWU1K",
        _fetcher=_fake_fetcher_factory(
            _OG_FIXTURE,
            "https://www.amazon.com/Some-Product/dp/B0CHX1W1XY/ref=sr_1_1",
        ),
    )
    assert result.asin == "B0CHX1W1XY"
    # OG path is fine; PA-API path is gated on env vars and not active in tests.
    assert result.extractor in {"jsonld_product", "open_graph", "html_fallback"}
