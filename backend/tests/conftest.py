import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")
os.environ.setdefault("CHAT_SESSION_SECRET", "test-chat-session-secret-with-sufficient-length")

import pytest
from httpx import ASGITransport, AsyncClient

from app.database.base import Base
from app.database.session import engine
from app.main import app


@pytest.fixture(autouse=True)
async def database():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as test_client:
        yield test_client
