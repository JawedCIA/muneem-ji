# syntax=docker/dockerfile:1.6
# Muneem Ji — production image
# Multi-stage: build client, install server deps, then ship a slim runtime.

# ---------- Stage 1: build the React client ----------
FROM node:20-alpine AS client-builder
WORKDIR /build
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# ---------- Stage 2: install server production deps ----------
FROM node:20-alpine AS server-deps
WORKDIR /build
# better-sqlite3 needs build tools on Alpine
RUN apk add --no-cache python3 make g++
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/app/data/muneemji.sqlite \
    UPLOADS_DIR=/app/data/uploads \
    BACKUP_DIR=/app/data/backups \
    JWT_SECRET_FILE=/app/data/.jwt-secret \
    CLIENT_DIST=/app/client/dist

WORKDIR /app
RUN apk add --no-cache tini wget && \
    addgroup -S muneem && adduser -S muneem -G muneem

COPY --from=server-deps /build/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-builder /build/client/dist ./client/dist
COPY logo.png ./client/dist/logo.png
COPY package.json ./

RUN mkdir -p /app/data/uploads /app/data/backups && \
    chown -R muneem:muneem /app

USER muneem
EXPOSE 3001
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.js"]
