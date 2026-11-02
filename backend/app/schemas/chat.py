from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings

settings = get_settings()


class ChatJoin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["join"]
    nickname: str = Field(min_length=1, max_length=settings.max_nickname_length)

    @field_validator("nickname")
    @classmethod
    def nickname_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Nickname cannot be blank")
        if any(ord(character) < 32 or ord(character) == 127 for character in value):
            raise ValueError("Nickname cannot contain control characters")
        if value.casefold() in {"admin", "administrator", "moderator", "mod", "system"}:
            raise ValueError("This nickname is reserved")
        return value


class ChatMessageIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["message"]
    client_message_id: str = Field(min_length=16, max_length=36, pattern=r"^[a-zA-Z0-9_-]+$")
    content: str = Field(min_length=1, max_length=settings.max_message_length)

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank")
        if any(ord(character) < 32 and character not in "\n\t" or ord(character) == 127 for character in value):
            raise ValueError("Message contains unsupported control characters")
        return value


class MessageOut(BaseModel):
    id: int
    nickname: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WishCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nickname: str = Field(min_length=1, max_length=40)
    message: str = Field(min_length=1, max_length=500)

    @field_validator("nickname", "message")
    @classmethod
    def trim_nonblank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        if any(ord(character) < 32 and character not in "\n\t" or ord(character) == 127 for character in value):
            raise ValueError("This field contains unsupported control characters")
        return value


class WishOut(BaseModel):
    id: int
    nickname: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=3, max_length=280)

    @field_validator("reason")
    @classmethod
    def reason_not_blank(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Please provide a little more detail")
        return value


class MuteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: str = Field(min_length=16, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    minutes: int = Field(ge=1, le=10080)
    reason: str = Field(default="", max_length=280)
