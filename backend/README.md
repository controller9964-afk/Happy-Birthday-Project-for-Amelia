# Amelia Birthday API

FastAPI service for guestbook wishes, persisted chat history, and **The Cozy Corner** public WebSocket room.

## Run locally

Requirements: Python 3.12+ and PostgreSQL. From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL` to a PostgreSQL connection string, then run:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --ws-max-size 8192
```

The root `docker-compose.yml` runs PostgreSQL, applies migrations, and starts the backend and frontend together.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy async PostgreSQL URL (`postgresql+asyncpg://...`). |
| `ADMIN_API_KEY` | Server-side key required by moderation endpoints. Blank disables them. |
| `CHAT_SESSION_SECRET` | Required stable random secret (at least 32 bytes) used to sign anonymous chat session cookies. |
| `ALLOWED_ORIGINS` | Comma-separated exact browser origins allowed by CORS and WebSockets. |
| `LOG_LEVEL` | Python logging level. |
| `MAX_MESSAGE_LENGTH` | Maximum chat message length (default 500). |
| `MAX_NICKNAME_LENGTH` | Maximum nickname length (default 24). |
| `CHAT_HISTORY_LIMIT` | Number of recent messages returned on join (default 60). |

Generate `CHAT_SESSION_SECRET` with `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Keep it stable across restarts; changing it invalidates chat cookies and prevents existing browser sessions from matching their mute records. Never place the admin key or session secret in frontend variables. Use a secret manager and HTTPS/WSS in deployed environments.

## HTTP API

The versioned API is mounted at `/api/v1`. `/api` is retained as a compatibility alias for the existing frontend.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Database-backed service health check. |
| `GET` | `/api/v1/health` | Versioned health check. |
| `GET` | `/api/v1/wishes` | Read the latest 100 birthday wishes. |
| `POST` | `/api/v1/wishes` | Create a wish; three per source address per minute. |
| `GET` | `/api/v1/chat/history` | Read the latest configured message history. |
| `POST` | `/api/v1/chat/messages/{id}/report` | Report a message; five reports per source address per minute. |
| `GET` | `/api/v1/admin/reports` | Admin-only report list (`X-Admin-Key`). |
| `DELETE` | `/api/v1/admin/messages/{id}` | Admin-only message deletion (`X-Admin-Key`). |
| `POST` | `/api/v1/admin/mutes` | Admin-only timed mute (`X-Admin-Key`). |

Admin paths return `503` if moderation has not been configured and `403` for missing or incorrect credentials. There is no public admin UI or role field.

## WebSocket protocol

Connect to `/ws/chat` using an allowed `Origin`. The first client frame must be a `join` event. Frames use JSON:

```json
{"type":"join","nickname":"Reader"}
{"type":"message","client_message_id":"unique-message-id","content":"Happy birthday! 🎂"}
```

Server events:

- `message_history`: recent messages; only the joining visitor sees `is_self` flags.
- `online_count`: current connected participant count.
- `join` / `leave`: nickname and updated count. No network addresses or session IDs are broadcast.
- `message`: persisted message and `is_self`; duplicate client message IDs are acknowledged without creating duplicate rows or rebroadcasting.
- `error`: validation and rate-limit feedback.
- `moderation_event`: message removal notifications or a private mute notification.

The server issues a signed, HTTP-only cookie and derives the visitor's pseudonymous moderation ID from it; clients must not send an ID in the join event. The cookie is scoped to `/ws/chat`, lasts one year, and uses `Secure` with WSS. Clearing cookies creates a new anonymous session, so it is not proof of a visitor's real-world identity. Nicknames are unverified display labels. Unknown message fields are rejected, message content is plain text, and clients must render it as text rather than HTML.

## Limits and scaling

Nickname length defaults to 24 and chat message length to 500. Join frames are capped at 1 KiB, message frames at 4 KiB, and the ASGI WebSocket frame ceiling is 8 KiB. A connection is closed if it does not send its initial join promptly. The process caps active chat connections at 100 and applies per-client, per-address, and connection-attempt sliding-window limits.

Presence, connection management, and throttling are in process. This supports visitors on separate browsers/devices connected to the same API instance. Before running multiple replicas, use shared pub/sub/presence and distributed rate limiting (for example Redis); otherwise different replicas will not share live broadcasts or participant counts.

## Data and migrations

SQLAlchemy models live under `app/models/`; the `Base` and async session factory are under `app/database/`. Alembic migrations live in `migrations/`.

```powershell
alembic upgrade head
alembic revision --autogenerate -m "describe change"
```

Configure PostgreSQL backups and a retention/deletion policy before public deployment. Reports are cascade-deleted with their message.

## Tests

From `backend/`:

```powershell
pytest
```

The suite exercises health and wish APIs, admin permissions, WebSocket origin checks, two simultaneous visitors, join/leave/presence events, duplicate submissions, history after reconnect, signed-session mute enforcement, input validation, and spam limits.
