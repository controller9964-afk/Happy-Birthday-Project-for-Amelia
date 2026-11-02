import asyncio
import json
import socket

import httpx
import pytest
import uvicorn
import websockets
from websockets.exceptions import ConnectionClosedError, InvalidStatus

from app.main import app
from app.websockets.chat import address_limiter, connection_limiter, message_limiter
from app.websockets.manager import manager

ORIGIN = "http://localhost:3000"


async def receive_json(websocket):
    return json.loads(await asyncio.wait_for(websocket.recv(), timeout=2))


def connected_client_id(nickname):
    return next(client_id for name, client_id in manager.connections.values() if name == nickname)


async def start_server():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", 0))
    sock.listen()
    sock.setblocking(False)
    port = sock.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, lifespan="off", log_level="critical"))
    task = asyncio.create_task(server.serve(sockets=[sock]))
    for _ in range(100):
        if server.started:
            return server, task, f"ws://127.0.0.1:{port}/ws/chat"
        await asyncio.sleep(0.02)
    server.should_exit = True
    await task
    raise AssertionError("Test chat server did not start")


@pytest.fixture(autouse=True)
def clear_chat_state():
    manager.connections.clear()
    for limiter in (address_limiter, connection_limiter, message_limiter):
        limiter.events.clear()
    yield
    manager.connections.clear()
    for limiter in (address_limiter, connection_limiter, message_limiter):
        limiter.events.clear()


@pytest.mark.asyncio
async def test_two_visitors_history_reconnect_and_moderation():
    server, server_task, url = await start_server()
    client_one = client_two = reconnected = None
    try:
        client_one = await websockets.connect(url, origin=ORIGIN, proxy=None)
        client_one_cookie = client_one.response.headers["Set-Cookie"].split(";", 1)[0]
        await client_one.send(json.dumps({"type": "join", "nickname": "Reader"}))
        history = await receive_json(client_one)
        assert history["type"] == "message_history"
        assert history["messages"] == []
        assert (await receive_json(client_one)) == {"type": "online_count", "count": 1}

        client_two = await websockets.connect(url, origin=ORIGIN, proxy=None)
        client_two_cookie = client_two.response.headers["Set-Cookie"].split(";", 1)[0]
        await client_two.send(json.dumps({"type": "join", "nickname": "Listener"}))
        assert (await receive_json(client_two))["type"] == "message_history"
        assert (await receive_json(client_two)) == {"type": "online_count", "count": 2}
        assert (await receive_json(client_one))["type"] == "join"
        assert (await receive_json(client_one))["type"] == "online_count"

        outgoing = {
            "type": "message",
            "client_message_id": "message-unique-001",
            "content": "Happy birthday! 🎂",
        }
        await client_one.send(json.dumps(outgoing))
        own_event = await receive_json(client_one)
        other_event = await receive_json(client_two)
        assert own_event["type"] == other_event["type"] == "message"
        assert own_event["message"]["id"] == other_event["message"]["id"]
        assert own_event["is_self"] is True
        assert other_event["is_self"] is False
        assert other_event["message"]["content"] == "Happy birthday! 🎂"

        await client_one.send(json.dumps(outgoing))
        duplicate_ack = await receive_json(client_one)
        assert duplicate_ack["message"]["id"] == own_event["message"]["id"]
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(client_two.recv(), timeout=0.15)

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
            denied = await api.post(
                "/api/v1/admin/mutes",
                json={"client_id": connected_client_id("Reader"), "minutes": 10, "reason": "Repeated spam"},
            )
            assert denied.status_code == 403
            muted = await api.post(
                "/api/v1/admin/mutes",
                json={"client_id": connected_client_id("Reader"), "minutes": 10, "reason": "Repeated spam"},
                headers={"X-Admin-Key": "test-admin-key"},
            )
            assert muted.status_code == 201
        assert (await receive_json(client_one))["type"] == "moderation_event"
        await client_one.send(json.dumps({
            "type": "message",
            "client_message_id": "message-unique-002",
            "content": "This should not be sent",
        }))
        assert (await receive_json(client_one))["event"] == "muted"

        await client_two.close()
        client_two = None
        assert (await receive_json(client_one))["type"] == "leave"
        assert (await receive_json(client_one)) == {"type": "online_count", "count": 1}

        reconnected = await websockets.connect(
            url, origin=ORIGIN, additional_headers={"Cookie": client_two_cookie}, proxy=None
        )
        await reconnected.send(json.dumps({"type": "join", "nickname": "Listener"}))
        restored = await receive_json(reconnected)
        assert restored["type"] == "message_history"
        assert [item["content"] for item in restored["messages"]] == ["Happy birthday! 🎂"]
        assert (await receive_json(reconnected))["count"] == 2
        assert (await receive_json(client_one))["type"] == "join"
        assert (await receive_json(client_one))["type"] == "online_count"

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
            deleted = await api.delete(
                f"/api/v1/admin/messages/{own_event['message']['id']}",
                headers={"X-Admin-Key": "test-admin-key"},
            )
            assert deleted.status_code == 204
        assert (await receive_json(client_one))["event"] == "message_deleted"
        assert (await receive_json(reconnected))["event"] == "message_deleted"
    finally:
        for websocket in (client_one, client_two, reconnected):
            if websocket is not None:
                await websocket.close()
        server.should_exit = True
        await asyncio.wait_for(server_task, timeout=5)


@pytest.mark.asyncio
async def test_invalid_messages_rate_limit_and_origin_validation():
    server, server_task, url = await start_server()
    websocket = None
    try:
        with pytest.raises(InvalidStatus):
            await websockets.connect(url, origin="https://not-allowed.example", proxy=None)

        reserved = await websockets.connect(url, origin=ORIGIN, proxy=None)
        await reserved.send(json.dumps({"type": "join", "nickname": "Admin"}))
        with pytest.raises(ConnectionClosedError) as closed:
            await receive_json(reserved)
        assert closed.value.code == 1008
        await reserved.close()

        websocket = await websockets.connect(url, origin=ORIGIN, proxy=None)
        await websocket.send(json.dumps({"type": "join", "nickname": "Reader"}))
        assert (await receive_json(websocket))["type"] == "message_history"
        await receive_json(websocket)

        await websocket.send(json.dumps({
            "type": "message",
            "client_message_id": "invalid-message-001",
            "content": "x" * 501,
        }))
        invalid = await receive_json(websocket)
        assert invalid["type"] == "error"

        for index in range(6):
            await websocket.send(json.dumps({
                "type": "message",
                "client_message_id": f"valid-message-{index:04d}",
                "content": f"Hello {index}",
            }))
            assert (await receive_json(websocket))["type"] == "message"

        await websocket.send(json.dumps({
            "type": "message",
            "client_message_id": "spam-message-0001",
            "content": "One too many",
        }))
        assert (await receive_json(websocket))["type"] == "error"
    finally:
        if websocket is not None:
            await websocket.close()
        server.should_exit = True
        await asyncio.wait_for(server_task, timeout=5)


@pytest.mark.asyncio
async def test_mute_is_bound_to_signed_server_session():
    server, server_task, url = await start_server()
    websocket = reconnected = None
    try:
        websocket = await websockets.connect(url, origin=ORIGIN, proxy=None)
        cookie = websocket.response.headers["Set-Cookie"].split(";", 1)[0]
        await websocket.send(json.dumps({"type": "join", "nickname": "Reader"}))
        assert (await receive_json(websocket))["type"] == "message_history"
        await receive_json(websocket)
        client_id = connected_client_id("Reader")

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
            muted = await api.post(
                "/api/v1/admin/mutes",
                json={"client_id": client_id, "minutes": 10, "reason": "Repeated spam"},
                headers={"X-Admin-Key": "test-admin-key"},
            )
            assert muted.status_code == 201

        assert (await receive_json(websocket))["event"] == "muted"
        await websocket.close()
        websocket = None

        reconnected = await websockets.connect(
            url, origin=ORIGIN, additional_headers={"Cookie": cookie}, proxy=None
        )
        await reconnected.send(json.dumps({"type": "join", "nickname": "Reader"}))
        with pytest.raises(ConnectionClosedError) as closed:
            await receive_json(reconnected)
        assert closed.value.code == 1008
        await reconnected.close()
        reconnected = None

        spoofed = await websockets.connect(url, origin=ORIGIN, proxy=None)
        try:
            await spoofed.send(json.dumps({
                "type": "join",
                "nickname": "Reader",
                "client_id": "e" * 24,
            }))
            with pytest.raises(ConnectionClosedError) as invalid:
                await receive_json(spoofed)
            assert invalid.value.code == 1008
        finally:
            await spoofed.close()
    finally:
        for connection in (websocket, reconnected):
            if connection is not None:
                await connection.close()
        server.should_exit = True
        await asyncio.wait_for(server_task, timeout=5)
