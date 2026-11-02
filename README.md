# A Little Place for Amelia

A cozy, responsive birthday experience with a Next.js frontend and a FastAPI/PostgreSQL backend. The public chat room, **The Cozy Corner**, supports nicknames without registration.

## Project layout

```text
frontend/                 Next.js App Router application
  app/                    Home, birthday, guestbook, and chat routes
  components/             Shared navigation, page, and feature UI
  hooks/                  useChat, useWebSocket, and useGuestbook
  lib/                    Typed API client and chat protocol contracts
  tests/                  Vitest and Playwright coverage
backend/                  FastAPI application
  app/                    API, settings, models, services, WebSockets
  migrations/             Alembic database migrations
  tests/                  Pytest coverage
render.yaml               Render FastAPI Web Service blueprint
docker-compose.yml        Local PostgreSQL + API + frontend
```

## Run locally with Docker

Create a root `.env` with a unique `POSTGRES_PASSWORD` (the Compose stack refuses to start without it). Optionally set a strong `ADMIN_API_KEY`; leave it blank to keep admin moderation disabled:

```powershell
Copy-Item .env.example .env
# Edit .env and set POSTGRES_PASSWORD to a strong, unique value.
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API health check is at [http://localhost:8000/api/health](http://localhost:8000/api/health).

Before exposing this stack to a network, set `POSTGRES_PASSWORD` and `ADMIN_API_KEY` through the deployment secret manager. If the admin key is unset, moderation endpoints are deliberately disabled. Never put the admin key in frontend variables.

## Run applications separately

### Backend

Requires Python 3.12+ and PostgreSQL. In PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL` in `backend/.env` to your PostgreSQL URL. Set `ADMIN_API_KEY` only when admin moderation is configured; leave it blank to disable admin endpoints. Then:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --ws-max-size 8192
```

The versioned HTTP API uses `/api/v1`; `/api` remains a compatibility alias. The WebSocket endpoint is `/ws/chat`.

### Frontend

Requires Node.js 20+. In a separate terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_URL` must be the API origin reachable from the visitor's browser. The frontend renders chat and guestbook user content as plain text; it does not interpret message content as HTML.

The frontend API client in `frontend/lib/api-client.ts` appends `/api/v1` to this origin for HTTP calls and derives `ws:` or `wss:` for `/ws/chat`. Configure it before starting or building Next.js; the value is public browser configuration and must never contain secrets. `useGuestbook` owns wish loading/submission state, while `useChat` composes `useWebSocket` for protocol validation, reconnects, and duplicate-safe message delivery. Browser tests may stub these endpoints, but production UI always uses the configured FastAPI service.

## Chat and moderation

- Participants choose a nickname and join without registration. The server assigns a pseudonymous ID from a signed, HTTP-only WebSocket session cookie; nicknames remain unverified display labels. Clearing browser cookies creates a new anonymous session, so this is not proof of a visitor's real-world identity.
- Chat history is limited to the latest 60 messages. Guestbook listing is limited to 100 wishes.
- Messages are capped at 500 characters; nicknames at 24 characters. The server applies an in-memory per-client message rate limit and caps concurrent connections at 100 per API process.
- The browser offers a report action per message. Reports are available only via the admin API. Admin routes require `X-Admin-Key` and return `503` if no key is configured; deletion and timed mutes are server-enforced.
- The current in-memory connection manager and limiter are intended for a single API instance. Multiple instances need shared pub/sub, presence, and distributed rate limiting (for example Redis) before horizontal scaling.
- Public content is retained in PostgreSQL. Configure a retention/backup policy appropriate to the deployment and publish a privacy notice before making the site public.
- Set `CHAT_SESSION_SECRET` to a unique random value of at least 32 bytes. Keep it stable across backend restarts so existing session mutes remain bound to the same browser cookie.

## Tests

Backend, from `backend/`:

```powershell
pytest
```

Frontend, from `frontend/`:

```powershell
npm test
npm run build
npm run test:e2e
```

Playwright may require browser installation on a fresh machine (`npx playwright install chromium`).

## Production deployment

### Recommended topology

- **Frontend:** Vercel, using the `frontend/` directory as the project root and the Next.js framework preset.
- **Backend:** Render paid Python Web Service running FastAPI/Uvicorn. Render documents inbound public WebSocket support, no maximum WebSocket duration, and expected interruptions during deploys, maintenance, and network failures. The frontend reconnects with backoff; deployments can disconnect participants.
- **Database:** Managed PostgreSQL. Render Postgres in the same region as the backend is the straightforward option. A compatible managed PostgreSQL service can also be used.
- **Domains:** Assign the frontend and API HTTPS domains under the same registered domain, for example `amelia.example.com` and `api.amelia.example.com`. The chat session uses an HTTP-only cookie; a same-site custom-domain setup avoids relying on cross-site cookies that browsers may block. Do not expose the database publicly unless your provider requires it.

Render's WebSocket support is documented at [render.com/docs/websocket](https://render.com/docs/websocket). A Render Web Service is used, not a serverless function. Keep one backend instance: chat presence and rate limiting are process-local, so multiple instances do not share room state.

### 1. Provision PostgreSQL and backend on Render

1. Push this repository to a Git provider.
2. Create a managed PostgreSQL database in Render, preferably in the same region as the API. Enable automated backups and retain the provider's internal database URL.
3. Use **New > Blueprint** in Render and point it at this repository's `render.yaml`. The blueprint configures the FastAPI Python Web Service, health check, build, migration command, and runtime settings. Choose a paid always-on instance; a sleeping/free service is not suitable for a public persistent chat.
4. In the Render service's Environment settings, set the values listed below. `DATABASE_URL` must be the managed database's **internal** URL, not a local or development URL. The settings loader accepts standard `postgres://` and `postgresql://` schemes and converts them for async SQLAlchemy.
5. Add the custom API domain to the Render service and enable its managed TLS certificate.
6. Confirm the deploy logs show `alembic upgrade head` succeeding and the service becomes healthy at `/health`.

The `render.yaml` blueprint asks for manually supplied secrets and origins; it does not contain real credentials or database URLs.

### 2. Configure Vercel

1. Import the same Git repository in Vercel and set **Root Directory** to `frontend`. Keep the detected Next.js framework, install command `npm ci`, and build command `npm run build`.
2. Add the environment variable below for **Production** before deploying. It is intentionally public because Next.js embeds `NEXT_PUBLIC_*` values in browser code. It must contain only the HTTPS API origin (no `/api/v1` or `/ws/chat` suffix).
3. Add a custom frontend domain under the same registered domain as the API. Configure both production DNS records and wait for TLS to become active before testing chat.
4. Deploy. Changes to `NEXT_PUBLIC_API_URL` require a new Vercel build/deployment.

In production the frontend fails fast if this variable is missing, uses HTTP, or points to a local hostname. Guestbook requests use `https://.../api/v1`; the chat hook derives `wss://.../ws/chat` from that same origin. Vercel only serves the Next.js frontend here; the persistent FastAPI WebSocket server runs on Render.

### Required production environment variables

| Platform | Variable | Required value / handling |
| --- | --- | --- |
| Render API | `DATABASE_URL` | Managed PostgreSQL internal URL. Secret; never copy into Vercel. |
| Render API | `CHAT_SESSION_SECRET` | Unique random secret, at least 32 bytes of entropy. Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Keep stable across restarts. |
| Render API | `ADMIN_API_KEY` | Strong, unique secret for private moderation endpoints. If unset, admin endpoints remain disabled. Store as a secret. |
| Render API | `ALLOWED_ORIGINS` | Comma-separated exact frontend origins, e.g. `https://amelia.example.com,https://www.amelia.example.com`. No paths, wildcards, or API origin. |
| Render API | `LOG_LEVEL` | `INFO` recommended; use `WARNING` if normal operational logs are too verbose. |
| Render API | `PORT` | Supplied by Render at runtime; do not hard-code. |
| Vercel frontend | `NEXT_PUBLIC_API_URL` | Public HTTPS API origin, e.g. `https://api.amelia.example.com`. Set in Production and rebuild after changes. Never put credentials here. |

`POSTGRES_PASSWORD` is only used by the local Docker Compose database; it is not required by Render when `DATABASE_URL` points to managed PostgreSQL. Do not define `ADMIN_API_KEY`, `CHAT_SESSION_SECRET`, or `DATABASE_URL` in Vercel. Render's dashboard encrypts saved environment values; restrict dashboard access to trusted operators.

### CORS, cookies, health, and logs

- CORS and WebSocket origin checks use the same exact origins from `ALLOWED_ORIGINS`. Update the Render variable whenever the production frontend origin changes. Keep preview deployment origins out of production unless explicitly required.
- Use HTTPS for the Vercel site and TLS for the Render API. The frontend automatically selects WSS when the API URL is HTTPS. The server session cookie is HTTP-only, signed, and Secure over WSS.
- The Render health probe is `GET /health`; it performs a database query, so it checks both API and PostgreSQL connectivity. The versioned check is `GET /api/v1/health`.
- The backend writes timestamped standard Python logs to stdout/stderr. Render collects these in the service logs; set `LOG_LEVEL` through the Render environment. Do not log request credentials, session cookies, or message content unnecessarily.

### Build, migration, and release process

1. Locally run backend tests (`cd backend; pytest -q`) and frontend checks (`cd frontend; npm ci; npm test; npm run lint; npm run build`). For a production frontend build, set `NEXT_PUBLIC_API_URL` to the intended HTTPS API origin.
2. Review migration changes. Use Alembic revisions in `backend/migrations/`; do not create or alter production tables manually.
3. Merge to the production deployment branch. Render builds the Python service and runs `alembic upgrade head` as its pre-deploy command before starting the new service. Vercel builds and deploys the frontend independently.
4. Prefer backward-compatible, expand/contract schema changes because the old application may briefly serve requests while a replacement deploys. Take/verify a database backup before destructive schema or data changes.
5. After deploy, check Render health and logs; visit the Vercel site and exercise guestbook loading/submission and chat join, message, disconnect/reconnect. Confirm browser Network tools show HTTPS and WSS URLs and no CORS, cookie, or mixed-content errors.
6. If a release fails, roll back the application deployment from the relevant provider. Database schema downgrades are not automatic; restore a backup only under the documented recovery procedure.

### Operations and maintenance

- Keep Render backend at one instance while `ConnectionManager` and throttles are in-memory. Scaling horizontally requires shared pub/sub/presence and distributed rate limiting (e.g. Redis); without this, visitors on different instances will not share live events or online counts.
- Keep the chat secret unchanged during normal deploys. Rotating it invalidates existing browser sessions; session mute identities will no longer match after rotation. Rotate `ADMIN_API_KEY` through the Render dashboard and update the trusted operator's secret store.
- Regularly patch Python and Node dependencies; review `npm audit`, Python dependency advisories, and release notes before upgrades. Run the tests and production build before deploying dependency changes.
- Monitor `/health`, Render deployment/log alerts, database storage and connection limits, failed deploys, chat abuse reports, and provider backup status. Periodically test a restore in a non-production environment.
- Publish a privacy/retention notice for guestbook and chat content. Define a moderation response process and retention/deletion schedule before inviting public visitors.
- Keep at least one tested recovery contact and document who can access Vercel, Render, DNS, and the database. Do not share deployment secrets in source control, issues, or client bundles.

## Local production-like build

The backend Docker image runs Alembic migrations and binds Uvicorn to the platform-provided `PORT` (falling back to `8000` for local Compose). For Vercel-equivalent frontend build validation, from `frontend/`:

```powershell
$env:NEXT_PUBLIC_API_URL = "https://api.amelia.example.com"
npm ci
npm run build
```

Replace the example domain with the actual public API origin before deployment.
