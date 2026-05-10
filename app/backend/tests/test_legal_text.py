"""
Unit tests for `services.legal_text.html_to_plain_text`.

These guarantee that the HTML → text mirror returned by /api/legal/documents
stays readable for the mobile app's React Native `<Text>` renderer:
    - drops scripts/styles entirely,
    - emits paragraph breaks between block tags,
    - prefixes list items with bullets,
    - preserves anchor text (URLs are dropped — phone reading is the goal).
"""

from __future__ import annotations

from services.legal_text import html_to_plain_text


def test_plain_text_passthrough_when_no_html() -> None:
    assert html_to_plain_text("Just a regular paragraph.") == "Just a regular paragraph."
    assert html_to_plain_text("") == ""
    assert html_to_plain_text(None) == ""  # type: ignore[arg-type]


def test_strips_script_and_style_blocks_entirely() -> None:
    html = """
    <html><head><style>body{color:red}</style></head>
    <body>
      <script>alert('xss')</script>
      <p>Real content</p>
    </body></html>
    """
    out = html_to_plain_text(html)
    assert "alert" not in out
    assert "color:red" not in out
    assert "Real content" in out


def test_emits_paragraph_breaks_between_blocks() -> None:
    html = "<p>First paragraph.</p><p>Second paragraph.</p>"
    out = html_to_plain_text(html)
    # Two `\n\n` are collapsed to one paragraph break by the normaliser.
    assert "First paragraph." in out
    assert "Second paragraph." in out
    assert out.index("First paragraph.") < out.index("Second paragraph.")
    assert "\n\n" in out  # paragraph separator preserved


def test_list_items_get_bullet_prefix() -> None:
    html = "<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>"
    out = html_to_plain_text(html)
    assert "• Alpha" in out
    assert "• Beta" in out
    assert "• Gamma" in out


def test_anchor_text_preserved_when_url_dropped() -> None:
    html = '<p>Email <a href="mailto:teams@snaproad.co">our team</a> for details.</p>'
    out = html_to_plain_text(html)
    assert "Email" in out
    assert "our team" in out
    assert "for details." in out


def test_decodes_html_entities() -> None:
    out = html_to_plain_text("<p>SnapRoad &mdash; the road app.</p>")
    assert "SnapRoad — the road app." in out


def test_handles_nested_lists_and_headings() -> None:
    html = """
    <h2>Section title</h2>
    <ul>
      <li>Top one</li>
      <li>Top two
        <ul><li>Nested</li></ul>
      </li>
    </ul>
    <p>Closing paragraph.</p>
    """
    out = html_to_plain_text(html)
    assert "Section title" in out
    assert "• Top one" in out
    assert "• Top two" in out
    assert "• Nested" in out
    assert "Closing paragraph." in out


def test_seed_terms_renders_readably() -> None:
    """Smoke test: feed the actual seed file through and assert key sections survive."""
    import os

    seed = os.path.join(
        os.path.dirname(__file__), "..", "seeds", "legal", "terms-of-service.html",
    )
    seed_path = os.path.normpath(seed)
    with open(seed_path, "r", encoding="utf-8") as f:
        html = f.read()
    out = html_to_plain_text(html)
    # Headings and contact details all need to survive for the mobile reader.
    assert "Terms of Service" in out
    assert "1. Description of Services" in out
    assert "Columbus, OH" in out
    assert "teams@snaproad.co" in out
    # No raw HTML / CSS leaked through.
    assert "<style>" not in out
    assert "<script>" not in out
    assert "}" not in out  # the embedded CSS rules contain `}` — should be gone


def test_seed_privacy_renders_readably() -> None:
    import os

    seed = os.path.join(
        os.path.dirname(__file__), "..", "seeds", "legal", "privacy-policy.html",
    )
    seed_path = os.path.normpath(seed)
    with open(seed_path, "r", encoding="utf-8") as f:
        html = f.read()
    out = html_to_plain_text(html)
    assert "Privacy Policy" in out
    assert "teams@snaproad.co" in out
    assert "Columbus, OH" in out
    assert "California Privacy Rights" in out
    assert "<table>" not in out
