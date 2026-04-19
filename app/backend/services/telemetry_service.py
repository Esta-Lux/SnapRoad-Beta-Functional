from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime
from time import perf_counter
from typing import Any, Deque, Dict


class TelemetryService:
    """In-memory telemetry stream for live admin monitoring."""

    def __init__(self, max_events: int = 500):
        self._events: Deque[Dict[str, Any]] = deque(maxlen=max_events)

    def now_iso(self) -> str:
        return datetime.now().isoformat()

    def start_timer(self) -> float:
        return perf_counter()

    def record_event(self, event: Dict[str, Any]) -> None:
        self._events.appendleft(event)

    def snapshot(self, limit: int = 100) -> list[Dict[str, Any]]:
        limit = max(1, min(limit, 500))
        return list(self._events)[:limit]

    def elapsed_ms(self, start: float) -> int:
        return int((perf_counter() - start) * 1000)

    async def publish(self, event: Dict[str, Any]) -> None:
        """Fan out to websocket manager without blocking request completion."""
        self.record_event(event)
        try:
            from services.websocket_manager import ws_manager
            await ws_manager.broadcast_telemetry(event)
        except Exception:
            # Telemetry must never break user requests.
            return

    def publish_fire_and_forget(self, event: Dict[str, Any]) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.publish(event))
        except RuntimeError:
            self.record_event(event)


telemetry_service = TelemetryService()
