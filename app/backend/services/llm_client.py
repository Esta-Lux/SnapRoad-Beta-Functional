"""
Shared LLM client for Orion and photo analysis.

Prefers NVIDIA API (OpenAI-compatible integrate endpoint) when NVIDIA_API_KEY is set;
otherwise falls back to OpenAI.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal, Optional

from openai import AsyncOpenAI, OpenAI

Provider = Literal["nvidia", "openai", "none"]


def _strip(v: Optional[str]) -> str:
    return (v or "").strip()


def llm_provider() -> Provider:
    if _strip(os.environ.get("NVIDIA_API_KEY")):
        return "nvidia"
    if _strip(
        os.environ.get("OPENAI_API_KEY")
        or os.environ.get("OPENAI_KEY")
        or os.environ.get("LLM_API_KEY")
    ):
        return "openai"
    return "none"


def llm_api_key() -> str:
    if llm_provider() == "nvidia":
        return _strip(os.environ.get("NVIDIA_API_KEY"))
    return _strip(
        os.environ.get("OPENAI_API_KEY")
        or os.environ.get("OPENAI_KEY")
        or os.environ.get("LLM_API_KEY")
    )


def _normalize_http_base(raw: str) -> str:
    """Ensure OpenAI-compatible clients get an absolute URL (avoids UnsupportedProtocol)."""
    u = _strip(raw)
    if not u:
        return ""
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return f"https://{u.lstrip('/')}"


def llm_base_url() -> Optional[str]:
    """OpenAI-compatible API root including /v1 (NVIDIA integrate, Azure OpenAI, etc.)."""
    prov = llm_provider()
    if prov == "nvidia":
        raw = _strip(os.environ.get("NVIDIA_API_BASE")) or "https://integrate.api.nvidia.com/v1"
        return _normalize_http_base(raw)
    if prov == "openai":
        raw = _strip(os.environ.get("OPENAI_BASE_URL") or os.environ.get("OPENAI_API_BASE"))
        if not raw:
            return None
        return _normalize_http_base(raw)
    return None


def chat_completion_model() -> str:
    if llm_provider() == "nvidia":
        return _strip(os.environ.get("NVIDIA_CHAT_MODEL")) or "meta/llama-3.1-8b-instruct"
    return _strip(os.environ.get("OPENAI_MODEL")) or "gpt-4o-mini"


def vision_completion_model() -> str:
    if llm_provider() == "nvidia":
        return (
            _strip(os.environ.get("NVIDIA_VISION_MODEL"))
            or _strip(os.environ.get("OPENAI_VISION_MODEL"))
            or "meta/llama-3.2-11b-vision-instruct"
        )
    return _strip(os.environ.get("OPENAI_VISION_MODEL")) or "gpt-4o-mini"


def is_llm_configured() -> bool:
    return bool(llm_api_key())


@lru_cache(maxsize=1)
def get_async_openai_client() -> Optional[AsyncOpenAI]:
    key = llm_api_key()
    if not key:
        return None
    base = llm_base_url()
    if base:
        return AsyncOpenAI(api_key=key, base_url=base)
    return AsyncOpenAI(api_key=key)


@lru_cache(maxsize=1)
def get_sync_openai_client() -> Optional[OpenAI]:
    key = llm_api_key()
    if not key:
        return None
    base = llm_base_url()
    if base:
        return OpenAI(api_key=key, base_url=base)
    return OpenAI(api_key=key)


def clear_llm_client_cache() -> None:
    get_async_openai_client.cache_clear()
    get_sync_openai_client.cache_clear()
