import pytest

import services.orion_elevenlabs as orion_elevenlabs


@pytest.mark.asyncio
async def test_synthesize_orion_voice_requires_text():
    result = await orion_elevenlabs.synthesize_orion_voice("   ")
    assert result == {"success": False, "error": "Missing text"}


@pytest.mark.asyncio
async def test_synthesize_orion_voice_reports_unconfigured(monkeypatch):
    monkeypatch.setattr(orion_elevenlabs, "ELEVENLABS_API_KEY", "")
    monkeypatch.setattr(orion_elevenlabs, "ORION_ELEVENLABS_VOICE_ID", "CwhRBWXzGAHq8TQ4Fs17")

    result = await orion_elevenlabs.synthesize_orion_voice("Hello from Orion.")

    assert result == {"success": False, "error": "ElevenLabs is not configured"}


def test_sanitize_elevenlabs_error_redacts_api_key():
    err = Exception("bad key sk_123456789012345678901234567890 failed")

    assert "sk_***REDACTED***" in orion_elevenlabs._sanitize_elevenlabs_error(err)
