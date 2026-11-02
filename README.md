# A Little Place for Amelia

A cozy, responsive birthday experience built with Next.js. The Cozy Corner chat and guestbook store their data only in the visitor's browser.

The project is frontend-only and does not require a backend or service credentials. Chat messages are local to the browser profile and are not shared with other visitors. Anyone using that browser can delete any saved chat message. Clearing browser storage removes its chat history and guestbook entries.

## Run locally

Requires Node.js 20+. From `frontend/`:

```powershell
npm ci
npm run dev
```

## Deploy to Vercel

Import the repository in Vercel, set **Root Directory** to `frontend`, and deploy. No environment variables or backend setup are needed.

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
