"""
Shared LLM clients for Orion, photo analysis, and gamification.

- **OpenAI** is used first when `OPENAI_API_KEY` (or `OPENAI_KEY` / `LLM_API_KEY`) is set.
- **NVIDIA** integrate API is used when no OpenAI key, or as a **fallback** after OpenAI
  failures in Orion (`orion_coach` implements this).

Single-provider helpers (`get_async_openai_client`, `chat_completion_model`) prefer OpenAI
then NVIDIA so vision/chat stay consistent with the same priority.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, AsyncGenerator, List, Literal, Optional

from openai import AsyncOpenAI, OpenAI

Provider = Literal["nvidia", "openai", "none"]


def _strip(v: Optional[str]) -> str:
    return (v or "").strip()


def openai_api_key() -> str:
    return _strip(
        os.environ.get("OPENAI_API_KEY")
        or os.environ.get("OPENAI_KEY")
        or os.environ.get("LLM_API_KEY")
    )


def nvidia_api_key() -> str:
    return _strip(os.environ.get("NVIDIA_API_KEY"))


def llm_provider() -> Provider:
    """Primary configured provider label (OpenAI wins when both keys exist)."""
    if openai_api_key():
        return "openai"
    if nvidia_api_key():
        return "nvidia"
    return "none"


def llm_api_key() -> str:
    """First available key (OpenAI then NVIDIA) — for logging/health only."""
    return openai_api_key() or nvidia_api_key()


def _normalize_http_base(raw: str) -> str:
    u = _strip(raw)
    if not u:
        return ""
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return f"https://{u.lstrip('/')}"


@lru_cache(maxsize=1)
def openai_async_client() -> Optional[AsyncOpenAI]:
    key = openai_api_key()
    if not key:
        return None
    raw = _strip(os.environ.get("OPENAI_BASE_URL") or os.environ.get("OPENAI_API_BASE"))
    if raw:
        return AsyncOpenAI(api_key=key, base_url=_normalize_http_base(raw))
    return AsyncOpenAI(api_key=key)


@lru_cache(maxsize=1)
def nvidia_async_client() -> Optional[AsyncOpenAI]:
    key = nvidia_api_key()
    if not key:
        return None
    base = _normalize_http_base(_strip(os.environ.get("NVIDIA_API_BASE")) or "https://integrate.api.nvidia.com/v1")
    return AsyncOpenAI(api_key=key, base_url=base)


@lru_cache(maxsize=1)
def openai_sync_client() -> Optional[OpenAI]:
    key = openai_api_key()
    if not key:
        return None
    raw = _strip(os.environ.get("OPENAI_BASE_URL") or os.environ.get("OPENAI_API_BASE"))
    if raw:
        return OpenAI(api_key=key, base_url=_normalize_http_base(raw))
    return OpenAI(api_key=key)


@lru_cache(maxsize=1)
def nvidia_sync_client() -> Optional[OpenAI]:
    key = nvidia_api_key()
    if not key:
        return None
    base = _normalize_http_base(_strip(os.environ.get("NVIDIA_API_BASE")) or "https://integrate.api.nvidia.com/v1")
    return OpenAI(api_key=key, base_url=base)


def get_async_openai_client() -> Optional[AsyncOpenAI]:
    """Preferred async client: OpenAI if configured, else NVIDIA."""
    return openai_async_client() or nvidia_async_client()


def get_sync_openai_client() -> Optional[OpenAI]:
    """Preferred sync client: OpenAI if configured, else NVIDIA."""
    return openai_sync_client() or nvidia_sync_client()


def openai_chat_model() -> str:
    return _strip(os.environ.get("OPENAI_MODEL")) or "gpt-4o-mini"


def nvidia_chat_model() -> str:
    return _strip(os.environ.get("NVIDIA_CHAT_MODEL")) or "meta/llama-3.1-8b-instruct"


def llm_base_url() -> Optional[str]:
    """Base URL for the *primary* single-provider client (OpenAI preferred)."""
    if openai_api_key():
        raw = _strip(os.environ.get("OPENAI_BASE_URL") or os.environ.get("OPENAI_API_BASE"))
        return _normalize_http_base(raw) if raw else None
    if nvidia_api_key():
        return _normalize_http_base(_strip(os.environ.get("NVIDIA_API_BASE")) or "https://integrate.api.nvidia.com/v1")
    return None


def chat_completion_model() -> str:
    """Model string matching `get_async_openai_client()` / `get_sync_openai_client()`."""
    if openai_async_client():
        return openai_chat_model()
    if nvidia_async_client():
        return nvidia_chat_model()
    return "gpt-4o-mini"


def vision_completion_model() -> str:
    if openai_async_client():
        return _strip(os.environ.get("OPENAI_VISION_MODEL")) or "gpt-4o-mini"
    if nvidia_async_client():
        return (
            _strip(os.environ.get("NVIDIA_VISION_MODEL"))
            or _strip(os.environ.get("OPENAI_VISION_MODEL"))
            or "meta/llama-3.2-11b-vision-instruct"
        )
    return _strip(os.environ.get("OPENAI_VISION_MODEL")) or "gpt-4o-mini"


def is_llm_configured() -> bool:
    return bool(openai_api_key() or nvidia_api_key())


def orion_llm_attempts() -> list[tuple[str, AsyncOpenAI, str]]:
    """Ordered (OpenAI then NVIDIA) clients for Orion fallback."""
    attempts: list[tuple[str, AsyncOpenAI, str]] = []
    oa = openai_async_client()
    nv = nvidia_async_client()
    if oa:
        attempts.append(("openai", oa, openai_chat_model()))
    if nv and not any(x[0] == "nvidia" for x in attempts):
        attempts.append(("nvidia", nv, nvidia_chat_model()))
    return attempts


async def chat_completions_create_with_fallback(
    *,
    messages: List[dict[str, Any]],
    max_tokens: int,
    temperature: float,
    stream: bool = False,
):
    """
    Try OpenAI chat.completions first; on failure try NVIDIA if a separate key is configured.
    Returns the same type as `client.chat.completions.create` (response or async stream).
    """
    attempts = orion_llm_attempts()
    if not attempts:
        raise ValueError("LLM API key not configured. Set OPENAI_API_KEY or NVIDIA_API_KEY in environment.")

    last_err: Optional[Exception] = None
    for _name, client, model in attempts:
        try:
            return await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=stream,
            )
        except Exception as e:
            last_err = e
            continue
    raise last_err if last_err else RuntimeError("LLM request failed")


async def chat_completion_stream_chunks_with_fallback(
    *,
    messages: List[dict[str, Any]],
    max_tokens: int,
    temperature: float,
) -> AsyncGenerator[str, None]:
    """Yield streamed text deltas; try NVIDIA after OpenAI fails on stream start."""
    attempts = orion_llm_attempts()
    if not attempts:
        yield ""
        return
    last_err: Optional[Exception] = None
    for _name, client, model in attempts:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content if chunk.choices else None
                if content:
                    yield content
            return
        except Exception as e:
            last_err = e
            continue
    if last_err:
        raise last_err


def clear_llm_client_cache() -> None:
    openai_async_client.cache_clear()
    nvidia_async_client.cache_clear()
    openai_sync_client.cache_clear()
    nvidia_sync_client.cache_clear()
