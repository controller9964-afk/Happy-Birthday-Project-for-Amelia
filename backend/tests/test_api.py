import pytest


@pytest.mark.asyncio
async def test_health(client):
    for path in ("/health", "/api/v1/health", "/api/health"):
        response = await client.get(path)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_guestbook_creation_and_history(client):
    created = await client.post(
        "/api/v1/wishes",
        json={"nickname": "Reader", "message": "Wishing you a lovely birthday!"},
    )
    assert created.status_code == 201
    assert created.json()["nickname"] == "Reader"
    assert (await client.get("/api/v1/wishes")).json()[0]["message"] == "Wishing you a lovely birthday!"
    assert (await client.get("/api/wishes")).json()[0]["message"] == "Wishing you a lovely birthday!"


@pytest.mark.asyncio
async def test_guestbook_rejects_empty_values(client):
    response = await client.post("/api/v1/wishes", json={"nickname": "  ", "message": "A wish"})
    assert response.status_code == 422
    response = await client.post(
        "/api/v1/wishes",
        json={"nickname": "Reader", "message": "Hello", "role": "admin"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_report_and_admin_moderation(client):
    from app.database.session import SessionLocal
    from app.models.chat import Message

    async with SessionLocal() as db:
        message = Message(client_id="a" * 24, nickname="Reader", content="Hello")
        db.add(message)
        await db.commit()
        await db.refresh(message)
        message_id = message.id

    report = await client.post(f"/api/v1/chat/messages/{message_id}/report", json={"reason": "Not kind"})
    assert report.status_code == 201
    denied = await client.get("/api/v1/admin/reports")
    assert denied.status_code == 403
    allowed = await client.get("/api/v1/admin/reports", headers={"X-Admin-Key": "test-admin-key"})
    assert allowed.status_code == 200
    assert allowed.json()[0]["message_id"] == message_id
    assert allowed.json()[0]["client_id"] == "a" * 24
    deleted = await client.delete(
        f"/api/v1/admin/messages/{message_id}",
        headers={"X-Admin-Key": "test-admin-key"},
    )
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_mute_requires_admin_and_persists(client):
    from app.database.session import SessionLocal
    from app.models.chat import ChatMute

    payload = {"client_id": "b" * 24, "minutes": 10, "reason": "Repeated spam"}
    denied = await client.post("/api/v1/admin/mutes", json=payload)
    assert denied.status_code == 403
    response = await client.post(
        "/api/v1/admin/mutes",
        json=payload,
        headers={"X-Admin-Key": "test-admin-key"},
    )
    assert response.status_code == 201
    async with SessionLocal() as db:
        mute = await db.get(ChatMute, payload["client_id"])
    assert mute is not None
