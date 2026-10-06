import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class NotificationConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, user_id: int, websocket: WebSocket, subprotocol: str | None = None) -> None:
        await websocket.accept(subprotocol=subprotocol)
        self._loop = asyncio.get_running_loop()
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        connections = self._connections.get(user_id)
        if connections is None:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(user_id, None)

    async def _send_to_user(self, user_id: int, payload: dict[str, Any]) -> None:
        sockets = tuple(self._connections.get(user_id, ()))
        if not sockets:
            return
        message = json.dumps(payload, default=str)
        results = await asyncio.gather(
            *(websocket.send_text(message) for websocket in sockets),
            return_exceptions=True,
        )
        for websocket, result in zip(sockets, results):
            if isinstance(result, Exception):
                self.disconnect(user_id, websocket)

    def publish(self, user_id: int, payload: dict[str, Any]) -> None:
        loop = self._loop
        if loop is None or not loop.is_running():
            return
        try:
            asyncio.run_coroutine_threadsafe(self._send_to_user(user_id, payload), loop)
        except RuntimeError:
            logger.debug("Notification delivery skipped because the event loop is unavailable")


notification_manager = NotificationConnectionManager()
