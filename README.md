# A Little Place for Amelia

A cozy, responsive birthday experience built with Next.js. The Cozy Corner chat shares live messages and presence through Supabase Realtime; the guestbook remains local to the visitor's browser.

There is no backend application to build or maintain. Supabase provides the managed Postgres database and realtime service used by shared chat.

## Run locally

Requires Node.js 20+. From `frontend/`:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local`, then start the app:

```powershell
npm run dev
```

## Configure shared chat

1. Create a Supabase project on its free plan.
2. In the Supabase SQL Editor, run [`frontend/supabase/chat_messages.sql`](./frontend/supabase/chat_messages.sql). It creates the chat table, enables public read/insert policies with nickname/message length constraints, and enables Postgres Changes realtime.
3. In Supabase project settings, copy the Project URL and the publishable key (or legacy anon key). These are intended for browser use; **never use a `service_role` key in the frontend**.
4. Configure these environment variables for the local frontend and for Vercel Production:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key |

5. In Vercel, import the repository, set **Root Directory** to `frontend`, and deploy. Redeploy after changing environment variables.

Supabase's current Free Realtime limits list 200 concurrent connections and 100 messages per second, which covers a 10-person chat. Limits and free-plan terms can change. Free Supabase projects may pause after inactivity.

Chat messages and nicknames are public and persisted in the Supabase database. This simple anonymous chat has no user authentication, moderation tools, or server-enforced rate limiting; do not use it for sensitive information or an untrusted public audience. The guestbook, unlike chat, remains stored only in each browser.

## Checks

From `frontend/`:

```powershell
npm test
npm run lint
npm run build
npm run test:e2e
```

Playwright may require browser installation on a fresh machine:

```powershell
npx playwright install chromium
```
