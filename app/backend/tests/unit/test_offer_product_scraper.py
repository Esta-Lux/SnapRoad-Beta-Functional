"""Unit tests for product-image scraping helpers."""

from __future__ import annotations

from services.offer_product_scraper import (
    collect_product_images_from_html,
    extract_product_metadata_from_html,
    image_quality_score,
    item_needs_image_rescrape,
    looks_like_non_product_image,
    rank_product_images,
    scrape_product_page,
)


_JSONLD_GALLERY = """
<html><head>
<script type="application/ld+json">
{
  "@type": "Product",
  "name": "Trail Running Shoes",
  "image": [
    "https://cdn.example.com/logo-small.png",
    "https://cdn.example.com/products/shoe-main-1200.jpg",
    "https://cdn.example.com/products/shoe-side-1200.jpg"
  ],
  "offers": {"price": "89.99", "priceCurrency": "USD"}
}
</script>
<meta property="og:image" content="https://cdn.example.com/site-hero-banner.jpg" />
</head></html>
"""


def test_looks_like_non_product_image_rejects_logos_and_screenshots() -> None:
    assert looks_like_non_product_image("https://cdn.example.com/brands/acme-logo.png")
    assert looks_like_non_product_image("https://cdn.example.com/screenshots/homepage.png")
    assert not looks_like_non_product_image("https://cdn.example.com/products/shoe-main-1200.jpg")


def test_image_quality_score_prefers_large_product_urls() -> None:
    product = "https://images-amazon.com/images/I/81ABC._AC_SL1500_.jpg"
    logo = "https://cdn.example.com/logo-small.png"
    assert image_quality_score(product) > image_quality_score(logo)


def test_rank_product_images_filters_logos_and_sorts_product_shots() -> None:
    ranked = rank_product_images(
        [
            "https://cdn.example.com/logo.png",
            "https://cdn.example.com/products/widget-large.jpg",
            "https://cdn.example.com/products/widget-alt.jpg",
        ],
        merchant_domain="example.com",
    )
    assert ranked[0] == "https://cdn.example.com/products/widget-large.jpg"
    assert all("logo" not in u for u in ranked)


def test_collect_product_images_from_html_returns_gallery_without_logos() -> None:
    imgs = collect_product_images_from_html(_JSONLD_GALLERY, page_url="https://shop.example.com/p/1")
    assert "https://cdn.example.com/products/shoe-main-1200.jpg" in imgs
    assert "https://cdn.example.com/logo-small.png" not in imgs


def test_extract_product_metadata_from_html_sets_hero_and_gallery() -> None:
    meta = extract_product_metadata_from_html(_JSONLD_GALLERY, page_url="https://shop.example.com/p/1")
    assert meta["title"] == "Trail Running Shoes"
    assert meta["image_url"] == meta["image_urls"][0]
    assert len(meta["image_urls"]) >= 2


def test_item_needs_image_rescrape_when_only_logo_present() -> None:
    item = {
        "image_url": "https://cdn.example.com/merchant-logo.png",
        "image_urls": ["https://cdn.example.com/merchant-logo.png"],
        "merchant_domain": "example.com",
    }
    assert item_needs_image_rescrape(item) is True


def test_scrape_product_page_uses_injected_fetcher() -> None:
    def fake_fetch(_url: str, _timeout: float) -> tuple[str, str]:
        return "https://shop.example.com/p/99", _JSONLD_GALLERY

    out = scrape_product_page("https://shop.example.com/p/99", _fetcher=fake_fetch, use_cache=False)
    assert out is not None
    assert out["image_url"] == out["image_urls"][0]
    assert "shoe-main" in out["image_url"]
