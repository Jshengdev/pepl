# pepl

Hackathon project. Monorepo with a distinct frontend and backend.

- `frontend/` — Next.js (App Router, TypeScript, Tailwind) skeleton.
- `backend/` — TypeScript API on [Hono](https://hono.dev) (`tsx` dev loop, no build step).

How we build here — MVP-first, demo-path-sacred, no silent fallbacks — is in [CLAUDE.md](./CLAUDE.md). Read it before adding code.

## Run

**Backend**

```bash
cd backend
npm install
npm run dev   # http://localhost:8787   (/health, /api/hello)
```

**Frontend**

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

The frontend reaches the backend via `NEXT_PUBLIC_API_URL` — copy `frontend/.env.local.example` to `frontend/.env.local`.
