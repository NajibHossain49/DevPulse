# Deploy DevPulse API on Render

Public URL after deploy (default service name):  
`https://devpulse-api.onrender.com`

## Option A — Blueprint (recommended)

1. Push latest `main` to GitHub.
2. Open [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect `NajibHossain49/DevPulse` (or your monorepo remote).
4. Render reads root `render.yaml` → create **devpulse-api**.
5. Fill secret env vars when prompted (`DATABASE_URL`, `DIRECT_URL`, `GITHUB_PAT`, etc.).
6. Deploy. Health check: `GET /health` · Swagger: `/api/docs`.

## Option B — Manual Web Service

| Field | Value |
|-------|--------|
| Runtime | Node |
| Region | Oregon (or closest) |
| Branch | `main` |
| Root Directory | *(leave empty — repo root)* |
| Build Command | `npm install -g pnpm@9.0.0 && pnpm install --frozen-lockfile --prod=false && pnpm --filter @devpulse/database build && pnpm --filter @devpulse/api build` |
| Start Command | `pnpm --filter @devpulse/api start:prod` |
| Health Check Path | `/health` |

### Required env vars

| Key | Notes |
|-----|--------|
| `WEB_URL` | `https://dev-pulse-seven-livid.vercel.app` |
| `CORS_ORIGINS` | `http://localhost:3000,https://dev-pulse-seven-livid.vercel.app` |
| `DATABASE_URL` | Supabase pooler URL |
| `DIRECT_URL` | Supabase direct URL |
| `GITHUB_PAT` | For sync |
| `GROQ_API_KEY` | AI features |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Cache |
| Stripe / Resend / Telegram | Optional |

Render sets `PORT` automatically — do not hardcode it.

## After API is live

1. **Vercel** → set `NEXT_PUBLIC_API_URL=https://devpulse-api.onrender.com` (redeploy web).
2. **GitHub OAuth app** → callback still points at the Vercel domain.
3. Free tier spins down after idle — first request may take ~30–60s.
