import asyncio

import services.orion_elevenlabs as orion_elevenlabs


class _FakeVoiceResponse:
    def __init__(self, body):
        self._body = body

    def raise_for_status(self):
        return None

    def json(self):
        return self._body


class _FakeVoiceClient:
    async def get(self, *args, **kwargs):
        return _FakeVoiceResponse(
            {
                "voices": [
                    {"name": "Roger", "voice_id": "roger-id"},
                    {"name": "Orion", "voice_id": "orion-created-id"},
                ]
            }
        )


def test_synthesize_orion_voice_requires_text():
    result = asyncio.run(orion_elevenlabs.synthesize_orion_voice("   "))
    assert result == {"success": False, "error": "Missing text"}


def test_synthesize_orion_voice_reports_unconfigured(monkeypatch):
    monkeypatch.setattr(orion_elevenlabs, "ELEVENLABS_API_KEY", "")
    monkeypatch.setattr(orion_elevenlabs, "ORION_ELEVENLABS_VOICE_ID", "")
    monkeypatch.setattr(orion_elevenlabs, "ORION_ELEVENLABS_VOICE_NAME", "Orion")

    result = asyncio.run(orion_elevenlabs.synthesize_orion_voice("Hello from Orion."))

    assert result == {"success": False, "error": "ElevenLabs is not configured"}


def test_resolve_orion_voice_prefers_explicit_id(monkeypatch):
    monkeypatch.setattr(orion_elevenlabs, "ORION_ELEVENLABS_VOICE_ID", "explicit-id")
    monkeypatch.setattr(orion_elevenlabs, "_resolved_voice_id_cache", None)

    voice_id = asyncio.run(orion_elevenlabs._resolve_orion_voice_id(_FakeVoiceClient()))

    assert voice_id == "explicit-id"


def test_resolve_orion_voice_finds_created_orion_by_name(monkeypatch):
    monkeypatch.setattr(orion_elevenlabs, "ELEVENLABS_API_KEY", "test-key")
    monkeypatch.setattr(orion_elevenlabs, "ORION_ELEVENLABS_VOICE_ID", "")
    monkeypatch.setattr(orion_elevenlabs, "ORION_ELEVENLABS_VOICE_NAME", "Orion")
    monkeypatch.setattr(orion_elevenlabs, "_resolved_voice_id_cache", None)

    voice_id = asyncio.run(orion_elevenlabs._resolve_orion_voice_id(_FakeVoiceClient()))

    assert voice_id == "orion-created-id"


def test_sanitize_elevenlabs_error_redacts_api_key():
    err = Exception("bad key sk_123456789012345678901234567890 failed")

    assert "sk_***REDACTED***" in orion_elevenlabs._sanitize_elevenlabs_error(err)
