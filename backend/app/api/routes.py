import hmac
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.database.session import get_db
from app.models.chat import ChatMute, ChatReport, Message
from app.models.guestbook import Wish
from app.schemas.chat import MessageOut, MuteCreate, ReportCreate, WishCreate, WishOut
from app.services.rate_limit import SlidingWindowLimiter
from app.websockets.manager import manager

router = APIRouter()
health_router = APIRouter()
logger = logging.getLogger(__name__)
wishes_limiter = SlidingWindowLimiter(3, 60)
reports_limiter = SlidingWindowLimiter(5, 60)


def request_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def require_admin(x_admin_key: str | None = Header(default=None)):
    expected = get_settings().admin_api_key
    if not expected:
        raise HTTPException(status_code=503, detail="Admin moderation is not configured")
    if x_admin_key is None or not hmac.compare_digest(x_admin_key, expected):
        raise HTTPException(status_code=403, detail="Admin access denied")


@health_router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text

    await db.execute(text("SELECT 1"))
    return {"status": "ok"}


router.include_router(health_router)


@router.get("/wishes", response_model=list[WishOut])
async def list_wishes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wish).order_by(desc(Wish.created_at)).limit(100))
    return result.scalars().all()


@router.post("/wishes", response_model=WishOut, status_code=status.HTTP_201_CREATED)
async def create_wish(data: WishCreate, request: Request, db: AsyncSession = Depends(get_db)):
    if not wishes_limiter.allow(request_key(request)):
        raise HTTPException(status_code=429, detail="Please wait before leaving another wish")
    wish = Wish(nickname=data.nickname, message=data.message)
    db.add(wish)
    await db.commit()
    await db.refresh(wish)
    return wish


@router.get("/chat/history", response_model=list[MessageOut])
async def chat_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Message).order_by(desc(Message.created_at), desc(Message.id)).limit(get_settings().chat_history_limit)
    )
    return list(reversed(result.scalars().all()))


@router.post("/chat/messages/{message_id}/report", status_code=status.HTTP_201_CREATED)
async def report_message(
    message_id: int,
    data: ReportCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not reports_limiter.allow(request_key(request)):
        raise HTTPException(status_code=429, detail="Please wait before sending another report")
    message = await db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    db.add(ChatReport(message_id=message_id, reason=data.reason.strip()))
    await db.commit()
    logger.info("Chat message reported: %s", message_id)
    return {"status": "reported"}


@router.get("/admin/reports", dependencies=[Depends(require_admin)])
async def list_reports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatReport, Message).join(Message).order_by(desc(ChatReport.created_at)).limit(200)
    )
    return [
        {
            "id": report.id,
            "message_id": message.id,
            "client_id": message.client_id,
            "nickname": message.nickname,
            "content": message.content,
            "reason": report.reason,
            "created_at": report.created_at,
        }
        for report, message in result.all()
    ]


@router.delete("/admin/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_message(message_id: int, db: AsyncSession = Depends(get_db)):
    message = await db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    await db.delete(message)
    await db.commit()
    await manager.broadcast({"type": "moderation_event", "event": "message_deleted", "message_id": message_id})


@router.post("/admin/mutes", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def mute_participant(data: MuteCreate, db: AsyncSession = Depends(get_db)):
    mute = await db.get(ChatMute, data.client_id)
    muted_until = datetime.now(timezone.utc) + timedelta(minutes=data.minutes)
    if mute is None:
        mute = ChatMute(client_id=data.client_id, muted_until=muted_until, reason=data.reason)
        db.add(mute)
    else:
        mute.muted_until = muted_until
        mute.reason = data.reason
    await db.commit()
    await manager.send_to_client(data.client_id, {
        "type": "moderation_event",
        "event": "muted",
        "muted_until": muted_until.isoformat(),
    })
    return {"status": "muted", "muted_until": muted_until}
