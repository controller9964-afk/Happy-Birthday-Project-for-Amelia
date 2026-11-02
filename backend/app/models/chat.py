from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint("client_id", "client_message_id", name="uq_messages_client_message"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), index=True)
    client_message_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    nickname: Mapped[str] = mapped_column(String(24))
    content: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    reports: Mapped[list["ChatReport"]] = relationship(back_populates="message", cascade="all, delete-orphan")


class ChatReport(Base):
    __tablename__ = "chat_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True)
    reason: Mapped[str] = mapped_column(String(280))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    message: Mapped[Message] = relationship(back_populates="reports")


class ChatMute(Base):
    __tablename__ = "chat_mutes"

    client_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    muted_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str] = mapped_column(String(280), default="")
