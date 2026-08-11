# syntax=docker/dockerfile:1

# ---------- Etape 1 : dependances de production ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Etape 2 : image finale ----------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3003

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER node

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3003/health || exit 1

CMD ["node", "src/index.js"]
