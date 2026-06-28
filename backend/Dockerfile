# pepl backend — Hono + WebSocket, run by tsx (no build step). Deploys to InsForge compute (Fly).
# Secrets (INSFORGE_*, COMPOSIO_*, LLM keys) are injected at deploy via --env-file — NEVER baked in.
FROM node:22-alpine
WORKDIR /app

# Deps first so the layer caches across source-only changes. tsx is a runtime dep (start = tsx src/index.ts).
COPY package.json package-lock.json ./
# @hono/node-ws@1.3 declares a peer on @hono/node-server v1, but the app runs node-server v2 — works at
# runtime (the server boots + serves /ws). --legacy-peer-deps reproduces that working local resolution.
# pepl: the real fix is aligning the two @hono versions in package.json (backend-owner's call).
RUN npm ci --legacy-peer-deps

# App source (the .dockerignore keeps node_modules/.env/.git out of the build context).
COPY . .

# The Hono server reads PORT (defaults 8787); compute routes its --port here.
ENV PORT=8787
EXPOSE 8787
CMD ["npm", "run", "start"]
