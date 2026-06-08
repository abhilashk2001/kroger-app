# Production image: builds the React app and bundles it into the API image, so the
# whole app runs as ONE container with Express serving the static build same-origin.
# Build from the repo root:  docker build -t kroger-app .

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build the React app into static assets (/web/dist).
# Runs on the BUILDER's native arch ($BUILDPLATFORM), not the target platform:
# the output is arch-independent static files, and building natively avoids the
# npm/rollup optional-native-dependency bug that bites under cross-arch emulation.
# ─────────────────────────────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS web-build
WORKDIR /web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install
COPY apps/web/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — API runtime that also serves the web build.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# Prisma's query engine needs openssl present.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps BEFORE setting NODE_ENV=production — the API runs via tsx, a
# devDependency, which `npm install` would skip under production.
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install

# Generate the Prisma client (needs the schema).
COPY apps/api/prisma ./prisma
RUN npx prisma generate

# API source, then the web build into the directory Express serves.
COPY apps/api/ ./
COPY --from=web-build /web/dist ./public

ENV NODE_ENV=production
ENV STATIC_DIR=/app/public
ENV API_PORT=3000
EXPOSE 3000

# Apply pending migrations on boot, then start the server. DATABASE_URL is supplied
# at runtime (App Service settings, or the local prod compose file).
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
