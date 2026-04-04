"""Orion LLM provider ordering: OpenAI before NVIDIA when both keys are set."""

import pytest


@pytest.fixture(autouse=True)
def clear_llm_cache():
    from services.llm_client import clear_llm_client_cache

    clear_llm_client_cache()
    yield
    clear_llm_client_cache()


def test_orion_llm_attempts_openai_first_then_nvidia(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-openai")
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-test-nvidia")
    from services.llm_client import clear_llm_client_cache, orion_llm_attempts

    clear_llm_client_cache()
    att = orion_llm_attempts()
    assert len(att) == 2
    assert att[0][0] == "openai"
    assert att[1][0] == "nvidia"


def test_orion_llm_attempts_nvidia_only(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_KEY", raising=False)
    monkeypatch.setenv("NVIDIA_API_KEY", "nvapi-only")
    from services.llm_client import clear_llm_client_cache, orion_llm_attempts

    clear_llm_client_cache()
    att = orion_llm_attempts()
    assert len(att) == 1
    assert att[0][0] == "nvidia"


def test_llm_provider_label(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-x")
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    from services.llm_client import clear_llm_client_cache, llm_provider

    clear_llm_client_cache()
    assert llm_provider() == "openai"
