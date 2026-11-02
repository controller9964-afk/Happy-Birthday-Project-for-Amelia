import asyncio
import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.config import get_settings
from app.database.session import SessionLocal
from app.models.chat import ChatMute, Message
from app.schemas.chat import ChatJoin, ChatMessageIn
from app.services.rate_limit import SlidingWindowLimiter
from app.websockets.manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)
message_limiter = SlidingWindowLimiter(6, 10)
address_limiter = SlidingWindowLimiter(24, 10)
connection_limiter = SlidingWindowLimiter(20, 60)
session_cookie_name = "amelia_chat_session"


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def chat_session(websocket: WebSocket, secret: str) -> tuple[str, str | None] | None:
    cookie = websocket.cookies.get(session_cookie_name)
    if cookie:
        try:
            token, signature = cookie.rsplit(".", 1)
        except ValueError:
            return None
        expected = hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        return hashlib.sha256(token.encode()).hexdigest(), None

    token = secrets.token_urlsafe(32)
    signature = hmac.new(secret.encode(), token.encode(), hashlib.sha256).hexdigest()
    same_site = "None" if websocket.url.scheme == "wss" else "Lax"
    secure = "; Secure" if websocket.url.scheme == "wss" else ""
    set_cookie = (
        f"{session_cookie_name}={token}.{signature}; Path=/ws/chat; Max-Age=31536000; "
        f"HttpOnly; SameSite={same_site}{secure}"
    )
    return hashlib.sha256(token.encode()).hexdigest(), set_cookie


@router.websocket("/ws/chat")
async def chat_socket(websocket: WebSocket):
    settings = get_settings()
    origin = websocket.headers.get("origin")
    if not origin or origin not in settings.cors_origins:
        await websocket.close(code=1008, reason="Origin not allowed")
        return
    if not settings.chat_session_secret:
        logger.error("Chat WebSocket requires CHAT_SESSION_SECRET to be configured")
        await websocket.close(code=1011, reason="Chat service is not configured")
        return
    session = chat_session(websocket, settings.chat_session_secret)
    if session is None:
        await websocket.close(code=1008, reason="Invalid chat session")
        return
    client_id, set_cookie = session

    address = websocket.client.host if websocket.client else "unknown"
    if not connection_limiter.allow(address):
        await websocket.close(code=1008, reason="Too many recent connection attempts")
        return
    if manager.count >= 100:
        await websocket.close(code=1013, reason="The chat is full")
        return

    headers = [(b"set-cookie", set_cookie.encode())] if set_cookie else None
    await websocket.accept(headers=headers)
    registered = False
    identity: tuple[str, str] | None = None
    try:
        raw_join = await asyncio.wait_for(websocket.receive_text(), timeout=10)
        if len(raw_join) > 1024:
            await websocket.close(code=1009, reason="Join message is too large")
            return
        join_data = ChatJoin.model_validate_json(raw_join)
        identity = (join_data.nickname, client_id)

        async with SessionLocal() as db:
            mute = await db.get(ChatMute, client_id)
            if mute and as_utc(mute.muted_until) > datetime.now(timezone.utc):
                await websocket.close(code=1008, reason="This participant is muted")
                return
            if not manager.connect(websocket, *identity):
                await websocket.close(code=1013, reason="The chat is full")
                return
            registered = True

            result = await db.execute(
                select(Message)
                .order_by(desc(Message.created_at), desc(Message.id))
                .limit(get_settings().chat_history_limit)
            )
            history = list(reversed(result.scalars().all()))
            await websocket.send_json({
                "type": "message_history",
                "messages": [
                    {
                        "id": item.id,
                        "nickname": item.nickname,
                        "content": item.content,
                        "created_at": item.created_at.isoformat(),
                        "is_self": item.client_id == client_id,
                        "client_message_id": item.client_message_id,
                    }
                    for item in history
                ],
            })
            await websocket.send_json({"type": "online_count", "count": manager.count})
            await manager.broadcast(
                {"type": "join", "nickname": join_data.nickname, "online": manager.count},
                exclude=websocket,
            )
            await manager.broadcast(
                {"type": "online_count", "count": manager.count},
                exclude=websocket,
            )

            while True:
                raw_message = await websocket.receive_text()
                if not address_limiter.allow(address):
                    await websocket.close(code=1008, reason="Too many messages from this connection")
                    break
                if len(raw_message) > 4096:
                    await websocket.send_json({"type": "error", "error": "That message is too large"})
                    continue
                try:
                    payload = ChatMessageIn.model_validate_json(raw_message)
                except (ValidationError, ValueError):
                    await websocket.send_json({"type": "error", "error": "That message could not be read"})
                    continue
                if not message_limiter.allow(client_id):
                    await websocket.send_json({"type": "error", "error": "You are sending messages too quickly"})
                    continue

                current_mute = await db.get(ChatMute, client_id)
                if current_mute and as_utc(current_mute.muted_until) > datetime.now(timezone.utc):
                    await websocket.send_json({"type": "moderation_event", "event": "muted"})
                    continue

                existing = await db.scalar(
                    select(Message).where(
                        Message.client_id == client_id,
                        Message.client_message_id == payload.client_message_id,
                    )
                )
                if existing is not None:
                    await websocket.send_json({
                        "type": "message",
                        "message": {
                            "id": existing.id,
                            "nickname": existing.nickname,
                            "content": existing.content,
                            "created_at": existing.created_at.isoformat(),
                            "client_message_id": existing.client_message_id,
                        },
                        "is_self": True,
                    })
                    continue

                message = Message(
                    client_id=client_id,
                    client_message_id=payload.client_message_id,
                    nickname=join_data.nickname,
                    content=payload.content,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(message)
                try:
                    await db.commit()
                except IntegrityError:
                    await db.rollback()
                    existing = await db.scalar(
                        select(Message).where(
                            Message.client_id == client_id,
                            Message.client_message_id == payload.client_message_id,
                        )
                    )
                    if existing is None:
                        raise
                    await websocket.send_json({
                        "type": "message",
                        "message": {
                            "id": existing.id,
                            "nickname": existing.nickname,
                            "content": existing.content,
                            "created_at": existing.created_at.isoformat(),
                            "client_message_id": existing.client_message_id,
                        },
                        "is_self": True,
                    })
                    continue
                await db.refresh(message)
                await manager.broadcast(
                    {
                        "type": "message",
                        "message": {
                            "id": message.id,
                            "nickname": message.nickname,
                            "content": message.content,
                            "created_at": message.created_at.isoformat(),
                            "client_message_id": message.client_message_id,
                        },
                    },
                    sender_client_id=client_id,
                )
    except asyncio.TimeoutError:
        await websocket.close(code=1008, reason="Join message timed out")
    except ValidationError:
        await websocket.close(code=1008, reason="A valid nickname is required")
    except WebSocketDisconnect:
        pass
    except SQLAlchemyError:
        logger.exception("Chat database operation failed")
        await websocket.close(code=1011, reason="Chat service temporarily unavailable")
    except (OSError, RuntimeError):
        logger.exception("Chat websocket transport failed")
    finally:
        if registered and identity:
            manager.disconnect(websocket)
            await manager.broadcast({"type": "leave", "nickname": identity[0], "online": manager.count})
            await manager.broadcast({"type": "online_count", "count": manager.count})
