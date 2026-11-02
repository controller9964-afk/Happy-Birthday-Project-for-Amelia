from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.connections: dict[WebSocket, tuple[str, str]] = {}

    def connect(self, websocket: WebSocket, nickname: str, client_id: str) -> bool:
        if len(self.connections) >= 100:
            return False
        self.connections[websocket] = (nickname, client_id)
        return True

    def disconnect(self, websocket: WebSocket) -> tuple[str, str] | None:
        return self.connections.pop(websocket, None)

    @property
    def count(self) -> int:
        return len(self.connections)

    async def broadcast(
        self,
        event: dict,
        exclude: WebSocket | None = None,
        sender_client_id: str | None = None,
    ):
        stale = []
        for connection, identity in tuple(self.connections.items()):
            if connection is exclude:
                continue
            try:
                payload = dict(event)
                if sender_client_id is not None:
                    payload["is_self"] = identity[1] == sender_client_id
                await connection.send_json(payload)
            except (OSError, RuntimeError, WebSocketDisconnect):
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)

    async def send_to_client(self, client_id: str, event: dict):
        stale = []
        for connection, identity in tuple(self.connections.items()):
            if identity[1] != client_id:
                continue
            try:
                await connection.send_json(event)
            except (OSError, RuntimeError, WebSocketDisconnect):
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


manager = ConnectionManager()
