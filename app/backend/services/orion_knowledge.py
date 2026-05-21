"""Orion knowledge retrieval — keyword-ranked snippets from admin docs + in-memory seed."""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

_SEED_DOCS: list[dict[str, str]] = [
    {
        "slug": "gems-basics",
        "title": "How gems work",
        "category": "product",
        "body_markdown": (
            "SnapRoad gems reward safe driving miles, completing trips, hazard reports, and partner offers. "
            "Premium members earn a 2× gem multiplier on eligible rewards."
        ),
    },
    {
        "slug": "premium-benefits",
        "title": "Premium member benefits",
        "category": "premium",
        "body_markdown": (
            "Premium includes 2× gems, deeper Insights & Recap analytics, traffic camera layers, "
            "friend live location sharing, and expanded Orion context."
        ),
    },
    {
        "slug": "driving-safety",
        "title": "Orion safety boundaries",
        "category": "safety",
        "body_markdown": (
            "Orion never encourages speeding or distraction. During navigation, keep replies short. "
            "Turn instructions always come first."
        ),
    },
    {
        "slug": "offers-redemption",
        "title": "Offers and online deals",
        "category": "offers",
        "body_markdown": (
            "Local offers appear on the map. Online deals live in the Offers tab and open the retailer in the browser."
        ),
    },
]

_TOKEN_RE = re.compile(r"[a-z0-9]{3,}")


def _tokenize(text: str) -> set[str]:
    return set(_TOKEN_RE.findall((text or "").lower()))


def _score_doc(doc: dict[str, Any], query_tokens: set[str], categories: set[str]) -> float:
    if not query_tokens:
        return 0.0
    body = f"{doc.get('title', '')} {doc.get('body_markdown', '')} {doc.get('category', '')}".lower()
    doc_tokens = _tokenize(body)
    overlap = len(query_tokens & doc_tokens)
    score = float(overlap)
    cat = str(doc.get("category") or "").lower()
    if cat and cat in categories:
        score += 2.0
    return score


def _load_docs_from_db() -> list[dict[str, Any]]:
    try:
        from services.supabase_service import _sb, _table_missing

        res = _sb().table("orion_knowledge_docs").select("slug,title,category,body_markdown").eq("active", True).execute()
        rows = res.data or []
        out: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            body = str(row.get("body_markdown") or "").strip()
            if body:
                out.append(row)
        return out
    except Exception as exc:
        if "orion_knowledge" not in str(exc).lower():
            logger.debug("orion knowledge db load skipped: %s", exc)
        return []


@lru_cache(maxsize=1)
def _all_docs_cached() -> tuple[dict[str, Any], ...]:
    db_docs = _load_docs_from_db()
    if db_docs:
        return tuple(db_docs)
    return tuple(_SEED_DOCS)


def refresh_orion_knowledge_cache() -> None:
    _all_docs_cached.cache_clear()


def retrieve_orion_knowledge(
    query: str,
    *,
    categories: list[str] | None = None,
    limit: int = 4,
) -> list[dict[str, str]]:
    """Return top matching knowledge snippets for prompt injection."""
    docs = list(_all_docs_cached())
    if not docs:
        return []
    query_tokens = _tokenize(query)
    cat_set = {c.lower() for c in (categories or []) if c}
    scored = sorted(
        (( _score_doc(d, query_tokens, cat_set), d) for d in docs),
        key=lambda row: row[0],
        reverse=True,
    )
    out: list[dict[str, str]] = []
    for score, doc in scored:
        if score <= 0 and out:
            break
        if score <= 0 and not query_tokens:
            # No query — return general product + safety seeds.
            if len(out) >= limit:
                break
        snippet = str(doc.get("body_markdown") or "").strip()
        if not snippet:
            continue
        out.append(
            {
                "slug": str(doc.get("slug") or ""),
                "title": str(doc.get("title") or "SnapRoad"),
                "category": str(doc.get("category") or "general"),
                "body": snippet[:1200],
            }
        )
        if len(out) >= limit:
            break
    if not out and docs:
        for doc in docs[:limit]:
            out.append(
                {
                    "slug": str(doc.get("slug") or ""),
                    "title": str(doc.get("title") or "SnapRoad"),
                    "category": str(doc.get("category") or "general"),
                    "body": str(doc.get("body_markdown") or "")[:1200],
                }
            )
    return out


def format_knowledge_for_prompt(snippets: list[dict[str, str]]) -> str:
    if not snippets:
        return ""
    lines = ["## SnapRoad knowledge (authoritative — prefer over general knowledge):"]
    for sn in snippets:
        title = sn.get("title") or "Doc"
        body = sn.get("body") or ""
        lines.append(f"- **{title}**: {body}")
    lines.append(
        "If the answer is not covered above or in live driver context, say you are not sure "
        "instead of inventing gems, prices, or Premium features."
    )
    return "\n".join(lines)


__all__ = [
    "retrieve_orion_knowledge",
    "format_knowledge_for_prompt",
    "refresh_orion_knowledge_cache",
]
