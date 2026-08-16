# syntax=docker/dockerfile:1

# ---------- Etape 1 : installation des dependances de production ----------
# On isole l'installation dans une etape dediee pour profiter du cache Docker :
# tant que package.json / package-lock.json ne changent pas, npm ci n'est pas rejoue.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Etape 2 : image finale ----------
# Image de base Alpine (~50 Mo) conformement aux bonnes pratiques demandees.
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3001

WORKDIR /app

# Les modules sont copies depuis l'etape precedente : l'image finale ne contient
# ni npm cache, ni dependances de developpement.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Execution avec l'utilisateur non privilegie fourni par l'image Node.
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3001/health || exit 1

CMD ["node", "src/index.js"]
