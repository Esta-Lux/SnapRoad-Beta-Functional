"""
Legal-document HTML → plain-text helper.

Why: legal docs are stored as full HTML (so the website / admin editor can
render them faithfully), but the mobile app currently shows the body inside a
React Native `<Text>` block — raw HTML there is unreadable. The legal route
returns a stripped-text mirror of `content` so the mobile clients render
readable paragraphs and bullet lists without changing the storage format or
adding a heavyweight HTML renderer dependency to the bundle.

The stripper is intentionally simple and never executes scripts; it only walks
the parse tree and emits text + structural separators. We don't try to
reproduce table layout, only to keep the doc readable.
"""

from __future__ import annotations

import logging
import re
from html.parser import HTMLParser

logger = logging.getLogger(__name__)


__all__ = ["html_to_plain_text"]


_BLOCK_TAGS = {
    "p", "div", "section", "article", "header", "footer", "main",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "tr", "table",
}
_LINEBREAK_TAGS = {"br"}
_LIST_TAGS = {"ul", "ol"}
_LIST_ITEM_TAG = "li"
# Container tags whose entire subtree should be skipped. These all have proper
# `</tag>` end events from `html.parser`, so the depth counter balances out.
# Void elements (`<meta>`, `<link>`, `<base>`, `<img>`, etc.) intentionally are
# NOT in this set: they never emit a matching `endtag`, so adding them here
# would leave `_drop_depth` permanently above zero and silently drop the whole
# `<body>`. Once we're already inside a drop region the early-return below
# skips them anyway.
_DROP_TAGS = {"style", "script", "noscript", "head", "title"}


class _PlainTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._buf: list[str] = []
        self._drop_depth = 0
        self._list_depth = 0

    # ── helpers ──
    def _emit(self, text: str) -> None:
        if not text:
            return
        # Collapse runs of whitespace inside text so we don't print 50 spaces
        # from indented HTML; paragraph breaks come from the structural
        # separators we emit on tag transitions.
        cleaned = re.sub(r"[\t ]+", " ", text)
        self._buf.append(cleaned)

    def _emit_break(self) -> None:
        self._buf.append("\n")

    def _emit_para(self) -> None:
        self._buf.append("\n\n")

    # ── HTMLParser hooks ──
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        t = tag.lower()
        if t in _DROP_TAGS:
            self._drop_depth += 1
            return
        if self._drop_depth:
            return
        if t in _LIST_TAGS:
            self._list_depth += 1
            self._emit_para()
        elif t == _LIST_ITEM_TAG:
            self._emit_break()
            self._emit("• ")
        elif t in _LINEBREAK_TAGS:
            self._emit_break()
        elif t in _BLOCK_TAGS:
            self._emit_para()

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t in _DROP_TAGS and self._drop_depth > 0:
            self._drop_depth -= 1
            return
        if self._drop_depth:
            return
        if t in _LIST_TAGS and self._list_depth > 0:
            self._list_depth -= 1
            self._emit_para()
        elif t in _BLOCK_TAGS:
            self._emit_para()

    def handle_data(self, data: str) -> None:
        if self._drop_depth:
            return
        # Preserve relative line breaks the author put in (e.g. inside the
        # NAVIGATION SAFETY NOTICE warning block) by translating them into
        # newlines we'll normalise at the end.
        if data:
            self._emit(data)

    # ── output ──
    def text(self) -> str:
        raw = "".join(self._buf)
        # Normalise excessive blank lines.
        normalised = re.sub(r"[\t ]*\n[\t ]*", "\n", raw)
        normalised = re.sub(r"\n{3,}", "\n\n", normalised)
        return normalised.strip()


def html_to_plain_text(html: str | None) -> str:
    """
    Best-effort conversion from HTML to a readable plain-text mirror.

    - Returns the input unchanged when it doesn't look like HTML (no `<`),
      so admins who paste markdown / plain text still see what they wrote.
    - Never raises: malformed HTML degrades to whatever was parsed.
    """
    if not html:
        return ""
    s = html
    if "<" not in s:
        # Already plain text — keep as-is.
        return s.strip()
    parser = _PlainTextParser()
    try:
        parser.feed(s)
        parser.close()
    except Exception as exc:  # pragma: no cover (HTMLParser is lenient)
        logger.debug("html_to_plain_text: partial parse failure: %s", exc)
    out = parser.text()
    return out or s.strip()
